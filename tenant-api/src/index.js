import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pg from 'pg';
import Redis from 'ioredis';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import { sendPasswordReset, sendWelcomeEmail } from './services/email.js';
import { validate } from './middleware/validation.middleware.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validators/auth.schema.js';
import {
  profileUpdateSchema,
  settingsUpdateSchema,
} from './validators/user.schema.js';
import { chatMessageSchema } from './validators/chat.schema.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET not set or too short (min 32 characters)');
  process.exit(1);
}

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET;
const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Express Setup
const defaultOrigins = [
  'https://app.neuravolt.cloud',
  'https://admin.neuravolt.cloud',
  'https://neuravolt.cloud',
  'http://localhost:3002',
  'http://localhost:3018',
  'http://localhost:3028',
];

let allowedOrigins = defaultOrigins;
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
}

if (process.env.NODE_ENV === 'production') {
  allowedOrigins = allowedOrigins.filter(
    (o) => !o.includes('localhost') && !o.includes('127.0.0.1')
  );
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: {
      action: 'deny',
    },
  })
);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    exposedHeaders: ['x-conversation-id', 'X-Conversation-Id'],
  })
);
app.use(express.json());

// PostgreSQL Pool Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
});

// Extend users table to store profile, settings, keys, billing, devices and logs per user
async function initUserTables() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_info JSONB DEFAULT '{}'::jsonb;
    `);

    // Create refresh_tokens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );
    `);

    // 1. Create archived_users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS archived_users (
          id UUID,
          tenant_id UUID,
          email VARCHAR(255),
          password_hash VARCHAR(255),
          role VARCHAR(50),
          created_at TIMESTAMPTZ,
          archived_at TIMESTAMPTZ DEFAULT NOW(),
          original_data JSONB
      );
    `);

    // 2. Handle existing duplicates: keep the newest based on created_at, archive the older ones
    await pool.query(`
      WITH duplicates AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, email ORDER BY created_at DESC, id DESC) as rn
        FROM users
      )
      INSERT INTO archived_users (id, tenant_id, email, password_hash, role, created_at, original_data)
      SELECT id, tenant_id, email, password_hash, role, created_at, to_jsonb(users.*)
      FROM users
      WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
      ON CONFLICT DO NOTHING;
    `);

    await pool.query(`
      WITH duplicates AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, email ORDER BY created_at DESC, id DESC) as rn
        FROM users
      )
      DELETE FROM users
      WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
    `);

    // 3. Add UNIQUE constraint to users table if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'unique_tenant_email'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email);
        END IF;
      END $$;
    `);

    // 4. Create password_reset_tokens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Create activity_logs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;
    `);

    // Create policy for activity_logs
    await pool
      .query(
        `
      DROP POLICY IF EXISTS tenant_isolation_policy ON activity_logs;
      CREATE POLICY tenant_isolation_policy ON activity_logs
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `
      )
      .catch((err) =>
        console.error('Policy recreation failed on activity_logs:', err)
      );

    // Migrate existing JSONB activity logs if users has rows and activity_logs table is empty
    const checkLogs = await pool.query(
      'SELECT COUNT(*)::int FROM activity_logs'
    );
    if (checkLogs.rows[0].count === 0) {
      const hasColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='activity_logs'
      `);
      if (hasColumn.rows.length > 0) {
        console.log(
          '[MIGRATION] Migrating JSONB activity logs to activity_logs table...'
        );
        await pool
          .query(
            `
          INSERT INTO activity_logs (user_id, tenant_id, action, metadata, ip_address, user_agent, created_at)
          SELECT 
            u.id, 
            u.tenant_id, 
            COALESCE(log->>'action', 'Action'), 
            log, 
            log->>'ip', 
            log->>'device',
            CASE 
              WHEN log->>'id' ~ '^[0-9]+$' THEN to_timestamp((log->>'id')::bigint / 1000)
              ELSE COALESCE(u.created_at, NOW())
            END
          FROM users u,
          jsonb_array_elements(CASE WHEN jsonb_typeof(u.activity_logs) = 'array' THEN u.activity_logs ELSE '[]'::jsonb END) log
          ON CONFLICT DO NOTHING;
        `
          )
          .catch((err) =>
            console.warn(
              '[MIGRATION WARNING] Failed to migrate JSONB activity logs:',
              err.message
            )
          );
      }
    }

    // 6. Create user_sessions table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        device_name VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        last_active_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
    `);

    // Create policy for user_sessions
    await pool
      .query(
        `
      DROP POLICY IF EXISTS tenant_isolation_policy ON user_sessions;
      CREATE POLICY tenant_isolation_policy ON user_sessions
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `
      )
      .catch((err) =>
        console.error('Policy recreation failed on user_sessions:', err)
      );

    // Migrate existing JSONB connected_devices if user_sessions table is empty
    const checkSessions = await pool.query(
      'SELECT COUNT(*)::int FROM user_sessions'
    );
    if (checkSessions.rows[0].count === 0) {
      const hasColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='connected_devices'
      `);
      if (hasColumn.rows.length > 0) {
        console.log(
          '[MIGRATION] Migrating JSONB connected_devices to user_sessions table...'
        );
        await pool
          .query(
            `
          INSERT INTO user_sessions (user_id, tenant_id, device_name, ip_address, user_agent, created_at, expires_at, last_active_at)
          SELECT 
            u.id, 
            u.tenant_id, 
            COALESCE(dev->>'name', dev->>'browser' || ' Device', 'Unknown Device'), 
            dev->>'ip', 
            dev->>'browser' || ' / ' || COALESCE(dev->>'os', 'Unknown OS'), 
            CASE 
              WHEN dev->>'lastActive' IS NOT NULL THEN (dev->>'lastActive')::timestamptz
              ELSE COALESCE(u.created_at, NOW())
            END,
            COALESCE(u.created_at, NOW()) + INTERVAL '30 days',
            CASE 
              WHEN dev->>'lastActive' IS NOT NULL THEN (dev->>'lastActive')::timestamptz
              ELSE COALESCE(u.created_at, NOW())
            END
          FROM users u,
          jsonb_array_elements(CASE WHEN jsonb_typeof(u.connected_devices) = 'array' THEN u.connected_devices ELSE '[]'::jsonb END) dev
          ON CONFLICT DO NOTHING;
        `
          )
          .catch((err) =>
            console.warn(
              '[MIGRATION WARNING] Failed to migrate JSONB connected devices:',
              err.message
            )
          );
      }
    }

    // Create api_keys table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        key_prefix VARCHAR(16) NOT NULL,
        scopes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ
      );
    `);

    // Create policy for api_keys
    await pool
      .query(
        `
      DROP POLICY IF EXISTS tenant_isolation_policy ON api_keys;
      CREATE POLICY tenant_isolation_policy ON api_keys
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `
      )
      .catch((err) =>
        console.error('Policy recreation failed on api_keys:', err)
      );

    // Migrate existing JSONB developer_keys if api_keys table is empty
    const checkApiKeys = await pool.query('SELECT COUNT(*)::int FROM api_keys');
    if (checkApiKeys.rows[0].count === 0) {
      const hasColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='developer_keys'
      `);
      if (hasColumn.rows.length > 0) {
        console.log(
          '[MIGRATION] Migrating JSONB developer_keys to api_keys table...'
        );
        await pool
          .query(
            `
          INSERT INTO api_keys (user_id, tenant_id, name, key_hash, key_prefix, created_at, scopes)
          SELECT 
            u.id, 
            u.tenant_id, 
            COALESCE(k->>'name', 'API Key'),
            COALESCE(k->>'key_hash', encode(sha256(coalesce(k->>'key', '')::bytea), 'hex')),
            COALESCE(k->>'key_prefix', LEFT(coalesce(k->>'key', ''), 12)),
            COALESCE((k->>'created')::timestamptz, NOW()),
            '["read", "write"]'::jsonb
          FROM users u,
          jsonb_array_elements(CASE WHEN jsonb_typeof(u.developer_keys) = 'array' THEN u.developer_keys ELSE '[]'::jsonb END) k
          ON CONFLICT DO NOTHING;
        `
          )
          .catch((err) =>
            console.warn(
              '[MIGRATION WARNING] Failed to migrate JSONB developer keys:',
              err.message
            )
          );
      }
    }

    // 7. Add Indexes for optimization
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs (user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_action_created ON activity_logs (tenant_id, action, created_at);
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires ON user_sessions (user_id, expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions (revoked_at);
    `);

    // 8. RAG drive files migration to knowledge_documents table
    await pool.query(`
      ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS content TEXT;
      ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    const hasSettingsCol = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='settings'
    `);
    if (hasSettingsCol.rows.length > 0) {
      const checkDocUserRows = await pool.query(
        'SELECT COUNT(*)::int FROM knowledge_documents WHERE user_id IS NOT NULL'
      );
      if (checkDocUserRows.rows[0].count === 0) {
        console.log(
          "[MIGRATION] Migrating users.settings->'rag_files' to knowledge_documents..."
        );
        await pool
          .query(
            `
          INSERT INTO knowledge_documents (id, tenant_id, user_id, filename, file_type, file_size_bytes, content, is_active, status)
          SELECT 
            COALESCE(
              CASE 
                WHEN (rag->>'id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN (rag->>'id')::uuid
                ELSE gen_random_uuid()
              END,
              gen_random_uuid()
            ) as id,
            u.tenant_id,
            u.id as user_id,
            COALESCE(rag->>'name', 'unnamed.txt') as filename,
            COALESCE(rag->>'file_type', split_part(coalesce(rag->>'name', 'unnamed.txt'), '.', 2)),
            COALESCE((rag->>'size')::int, 0) as file_size_bytes,
            COALESCE(rag->>'text', '') as content,
            COALESCE((rag->>'isActive')::boolean, true) as is_active,
            'indexed' as status
          FROM users u,
          jsonb_array_elements(CASE WHEN jsonb_typeof(u.settings->'rag_files') = 'array' THEN u.settings->'rag_files' ELSE '[]'::jsonb END) rag
          ON CONFLICT DO NOTHING;
        `
          )
          .catch((err) =>
            console.warn(
              '[MIGRATION WARNING] Failed to migrate RAG files from users.settings:',
              err.message
            )
          );

        await pool
          .query(
            `
          UPDATE users SET settings = settings - 'rag_files' WHERE settings ? 'rag_files';
        `
          )
          .catch((err) =>
            console.warn(
              '[MIGRATION WARNING] Failed to clear RAG files from users.settings:',
              err.message
            )
          );
      }
    }

    // 9. Drop duplicate JSONB columns from users table
    console.log(
      '[MIGRATION] Dropping duplicate JSONB columns from users table...'
    );
    await pool
      .query(
        `
      ALTER TABLE users DROP COLUMN IF EXISTS activity_logs;
      ALTER TABLE users DROP COLUMN IF EXISTS connected_devices;
      ALTER TABLE users DROP COLUMN IF EXISTS developer_keys;
    `
      )
      .catch((err) =>
        console.error(
          'Failed to drop duplicate JSONB columns from users:',
          err.message
        )
      );

    // 9.5 Create document_embeddings table with pgvector support
    console.log('[MIGRATION] Enabling pgvector extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log(
      '[MIGRATION] Creating document_embeddings table with pgvector...'
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        knowledge_document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding VECTOR(1536) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool
      .query(
        `
      ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE document_embeddings FORCE ROW LEVEL SECURITY;
    `
      )
      .catch((err) =>
        console.warn(
          'Warning enabling RLS on document_embeddings:',
          err.message
        )
      );

    await pool
      .query(
        `
      DROP POLICY IF EXISTS tenant_isolation_policy ON document_embeddings;
      CREATE POLICY tenant_isolation_policy ON document_embeddings
          FOR ALL
          USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
          WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
    `
      )
      .catch((err) =>
        console.error(
          'Policy recreation failed on document_embeddings:',
          err.message
        )
      );

    await pool
      .query(
        `
      CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
    `
      )
      .catch((err) =>
        console.error(
          'Failed to create embedding index on document_embeddings:',
          err.message
        )
      );

    // ── Database Schema Alignment (Fk & updated_at Triggers) ────────────────
    console.log(
      '[MIGRATION] Running constraint and updated_at column migrations...'
    );
    await pool
      .query(
        `
      DO $$
      BEGIN
          -- 1. Ensure updated_at column exists in all requested tables
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

          -- Ensure deleted_at columns exist for soft deletes
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
          ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
          ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

          -- Ensure plan downgrade columns exist
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS downgrade_grace_ends TIMESTAMPTZ;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_downgrade_notified TIMESTAMPTZ;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_downgraded_at TIMESTAMPTZ;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS retention_overrides JSONB DEFAULT '{}'::jsonb;

          -- 2. Ensure updated_at columns exist
          ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

          -- Create trigger function if not exists
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $_$
          BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
          END;
          $_$ LANGUAGE plpgsql;

          -- 3. Bind update triggers
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenants_updated_at') THEN
              CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
              CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at') THEN
              CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_messages_updated_at') THEN
              CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agents_updated_at') THEN
              CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflows_updated_at') THEN
              CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_knowledge_bases_updated_at') THEN
              CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_api_keys_updated_at') THEN
              CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_sessions_updated_at') THEN
              CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_plans_updated_at') THEN
              CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
              CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
              CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;

          -- 4. Clean up orphaned records
          UPDATE tenants SET plan = 'starter' WHERE plan NOT IN (SELECT id FROM plans);
          UPDATE subscriptions SET plan_id = 'starter' WHERE plan_id NOT IN (SELECT id FROM plans);
          DELETE FROM subscriptions WHERE tenant_id NOT IN (SELECT id FROM tenants);
          DELETE FROM invoices WHERE tenant_id NOT IN (SELECT id FROM tenants);
          UPDATE invoices SET subscription_id = NULL WHERE subscription_id NOT IN (SELECT id FROM subscriptions);

          -- 5. Add foreign key constraints
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenants_plan') THEN
              ALTER TABLE tenants ADD CONSTRAINT fk_tenants_plan FOREIGN KEY (plan) REFERENCES plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_plan') THEN
              ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_tenant') THEN
              ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_fkey;
              ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_tenant') THEN
              ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey;
              ALTER TABLE invoices ADD CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_subscription') THEN
              ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_subscription_id_fkey;
              ALTER TABLE invoices ADD CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
          END IF;
      END $$;
    `
      )
      .catch((err) =>
        console.error('❌ Schema alignment migration failed:', err)
      );

    console.log('✅ Tenant users schema extension verified successfully.');
  } catch (err) {
    console.error('❌ Failed to extend tenant users schema:', err);
  }
}
// GDPR Data Export Helper
async function exportGDPRData(tenantId) {
  try {
    const fs = require('fs');
    const path = require('path');

    // Fetch all user and conversation rows bypassing RLS context (using master pool)
    const users = await pool.query('SELECT * FROM users WHERE tenant_id = $1', [
      tenantId,
    ]);
    const conversations = await pool.query(
      'SELECT * FROM conversations WHERE tenant_id = $1',
      [tenantId]
    );
    const messages = await pool.query(
      'SELECT * FROM messages WHERE tenant_id = $1',
      [tenantId]
    );
    const invoices = await pool.query(
      'SELECT * FROM invoices WHERE tenant_id = $1',
      [tenantId]
    );
    const tenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [
      tenantId,
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      tenant: tenant.rows[0] || null,
      users: users.rows,
      conversations: conversations.rows,
      messages: messages.rows,
      invoices: invoices.rows,
    };

    const exportDir = path.join(__dirname, 'backups', 'gdpr_exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const exportPath = path.join(
      exportDir,
      `tenant_gdpr_export_${tenantId}_${Date.now()}.json`
    );
    fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2));
    console.log(
      `[GDPR] Exported tenant ${tenantId} data successfully to ${exportPath}`
    );
  } catch (err) {
    console.error(
      `[GDPR ERROR] Failed to export tenant data for ${tenantId}:`,
      err
    );
  }
}

// Daily Clean-up Cron Job
function startDailyCleanupCron() {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  async function runCleanup() {
    console.log(
      '[CRON] Running daily database cleanup & data retention rules...'
    );
    try {
      // 1. Delete activity logs older than 90 days
      const delLogs = await pool.query(
        `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days'`
      );
      console.log(
        `[CRON] Cleaned up ${delLogs.rowCount} activity logs older than 90 days.`
      );

      // 2. Clean expired or revoked sessions daily (keep active ones)
      const delSessions = await pool.query(
        `DELETE FROM user_sessions WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
      );
      console.log(
        `[CRON] Cleaned up ${delSessions.rowCount} expired/revoked user sessions.`
      );

      // 3. Clean invoices older than 7 years (tax compliance retention)
      const delInvoices = await pool.query(
        `DELETE FROM invoices WHERE created_at < NOW() - INTERVAL '2555 days'`
      );
      console.log(
        `[CRON] Hard deleted ${delInvoices.rowCount} invoices older than 7 years.`
      );

      // 4. Clean conversations based on plans: Starter (1yr), Pro (2yr), Enterprise (Unlimited or overrides)
      const activeTenants = await pool.query(
        `SELECT id, plan, retention_overrides FROM tenants WHERE status = 'active' AND deleted_at IS NULL`
      );
      for (const tenantRow of activeTenants.rows) {
        const tId = tenantRow.id;
        const plan = (tenantRow.plan || 'starter').toLowerCase();
        const overrides = tenantRow.retention_overrides || {};

        let days = 365; // default Starter (1 year)
        if (plan === 'pro' || plan === 'professional') {
          days = 730; // Pro (2 years)
        } else if (plan === 'enterprise') {
          days = overrides.conversations_days
            ? parseInt(overrides.conversations_days, 10)
            : null;
        }

        if (days !== null) {
          const delConvsResult = await pool.query(
            `DELETE FROM conversations 
             WHERE tenant_id = $1 AND updated_at < NOW() - $2 * INTERVAL '1 day'`,
            [tId, days]
          );
          if (delConvsResult.rowCount > 0) {
            console.log(
              `[CRON] Conversations retention: Hard deleted ${delConvsResult.rowCount} conversations older than ${days} days for tenant ${tId}`
            );
          }
        }
      }

      // 5. Clean permanently soft-deleted records after retention period (default 30 days)
      const retentionDays = parseInt(
        process.env.HARD_DELETE_AFTER_DAYS || '30',
        10
      );

      // GDPR Export soft-deleted tenants before hard deleting them
      const softDeletedTenantsToPurge = await pool.query(
        `SELECT id FROM tenants WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
        [retentionDays]
      );
      for (const tRow of softDeletedTenantsToPurge.rows) {
        await exportGDPRData(tRow.id);
      }

      const delTenants = await pool.query(
        `DELETE FROM tenants WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
        [retentionDays]
      );
      console.log(
        `[CRON] Hard deleted ${delTenants.rowCount} soft-deleted tenants older than ${retentionDays} days.`
      );

      const delUsers = await pool.query(
        `DELETE FROM users WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
        [retentionDays]
      );
      console.log(
        `[CRON] Hard deleted ${delUsers.rowCount} soft-deleted users older than ${retentionDays} days.`
      );

      const delConvs = await pool.query(
        `DELETE FROM conversations WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
        [retentionDays]
      );
      console.log(
        `[CRON] Hard deleted ${delConvs.rowCount} soft-deleted conversations older than ${retentionDays} days.`
      );

      const delMsgs = await pool.query(
        `DELETE FROM messages WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
        [retentionDays]
      );
      console.log(
        `[CRON] Hard deleted ${delMsgs.rowCount} soft-deleted messages older than ${retentionDays} days.`
      );
      // 4. Check plan downgrade grace period violations
      const expiredGraceTenants = await pool.query(
        `SELECT id, plan, downgrade_grace_ends FROM tenants 
         WHERE downgrade_grace_ends < NOW() AND status = 'active'`
      );

      for (const tRow of expiredGraceTenants.rows) {
        const tenantId = tRow.id;
        const planId = tRow.plan.toLowerCase();

        const planRes = await pool.query(
          'SELECT agent_limit, features FROM plans WHERE id = $1',
          [planId]
        );
        if (planRes.rows.length > 0) {
          const plan = planRes.rows[0];
          const agentLimit = plan.agent_limit;

          if (agentLimit !== -1) {
            const activeAgents = await pool.query(
              `SELECT id FROM agents WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at ASC`,
              [tenantId]
            );
            if (activeAgents.rows.length > agentLimit) {
              const extraAgentIds = activeAgents.rows
                .slice(agentLimit)
                .map((r) => r.id);
              await pool.query(
                `UPDATE agents SET status = 'disabled' WHERE id = ANY($1)`,
                [extraAgentIds]
              );
              console.log(
                `[CRON] Disabled ${extraAgentIds.length} extra agents for tenant ${tenantId}`
              );
            }
          }

          await pool.query(
            `INSERT INTO activity_logs (tenant_id, action, metadata)
             VALUES ($1, 'PLAN_LIMIT_VIOLATION_NOTIFIED', $2)`,
            [
              tenantId,
              JSON.stringify({
                message:
                  'Tenant has violated plan limits after grace period. Immediate action required.',
                plan: planId,
                grace_ends: tRow.downgrade_grace_ends,
              }),
            ]
          );

          const graceEnds = new Date(tRow.downgrade_grace_ends);
          const autoSuspendTime = new Date(
            graceEnds.getTime() + 14 * 24 * 60 * 60 * 1000
          );
          if (new Date() > autoSuspendTime) {
            await pool.query(
              `UPDATE tenants SET status = 'suspended' WHERE id = $1`,
              [tenantId]
            );
            console.log(
              `[CRON] Auto-suspended tenant ${tenantId} due to unresolved plan limit violations for 14 days.`
            );
          }
        }
      }
    } catch (err) {
      console.error('[CRON ERROR] Daily database cleanup failed:', err);
    }
  }

  // Run once immediately on startup (with 5s delay)
  setTimeout(() => {
    runCleanup().catch(console.error);
  }, 5000);

  // Schedule to run every 24 hours
  setInterval(() => {
    runCleanup().catch(console.error);
  }, ONE_DAY);
}
startDailyCleanupCron();

// Redis Client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// DB connection error logging
pool.on('error', (err) => {
  console.error('Unexpected error on inactive database client', err);
});

// Helper: Acquire a verified clean connection from the pool
async function connectWithValidation(useReplica = false) {
  let client;
  let retries = 3;
  const targetPool = useReplica ? readPool : pool;
  while (retries > 0) {
    client = await targetPool.connect();
    try {
      const valRes = await client.query(
        "SELECT current_setting('app.current_tenant', true) AS tenant"
      );
      const currentTenant = valRes.rows[0]?.tenant;
      if (currentTenant && currentTenant.trim() !== '') {
        throw new Error(
          `Connection pollution detected: app.current_tenant is already set to "${currentTenant}"`
        );
      }
      return client;
    } catch (err) {
      if (err.message.includes('unrecognized configuration parameter')) {
        return client;
      }
      try {
        client.release(true); // Discard on error
      } catch (releaseErr) {
        // Ignored
      }
      throw err;
    }
  }
  throw new Error(
    'Failed to acquire a clean database connection after multiple retries.'
  );
}

// Helper: Secure RLS query executor to prevent connection resource exhaustion and session state pollution
async function executeTenantQuery(tenantId, callback, useReplica = false) {
  const client = await connectWithValidation(useReplica);
  let contextSet = false;
  try {
    // Set RLS context on the connection
    await client.query("SELECT set_config('app.current_tenant', $1, false)", [
      tenantId,
    ]);
    contextSet = true;

    // Assert tenant context is set correctly
    await client.query('SELECT assert_tenant_context()');

    // Run the queries
    const result = await callback(client);
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (contextSet) {
      try {
        // Clear context to prevent leakage to subsequent checkouts of this connection
        await client.query(
          "SELECT set_config('app.current_tenant', '', false)"
        );
        client.release();
      } catch (resetErr) {
        console.error(
          '[DB FATAL] Failed to reset tenant context, destroying connection:',
          resetErr
        );
        // Mark connection as bad and discard it from pool
        client.release(true);
      }
    } else {
      client.release();
    }
  }
}

// Tenant Middleware
const tenantMiddleware = async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    let slug = '';

    // Check if host is an IP address (bypasses subdomain extraction)
    const isIP = host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);

    if (host.includes('.') && !isIP) {
      slug = host.split('.')[0];
    }

    // Fallback to headers or query params for development / local testing or IP access
    if (!slug || slug === 'localhost' || slug === '127') {
      slug = req.headers['x-tenant-slug'] || req.query.tenant || 'alphatech';
    }

    // Normalize tenant slug for unified single-tenant/demo deployment
    let querySlug = slug;
    if (['system', 'app', 'alphatech'].includes(slug.toLowerCase())) {
      querySlug = 'neuravolt';
    }

    // Look up tenant by slug and fetch its active plan settings
    const result = await pool.query(
      `
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             p.name AS plan_name, p.price, p.billing, p.currency, p.is_active as plan_is_active,
             p.token_limit, p.tenant_limit, p.agent_limit, p.model_access, p.features, p.description as plan_description
      FROM tenants t
      LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
      WHERE t.slug = $1 AND t.deleted_at IS NULL
    `,
      [querySlug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = result.rows[0];
    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'Tenant suspended' });
    }

    // Parse dynamic limits or fall back to default specs
    if (tenant.token_limit === undefined || tenant.token_limit === null) {
      const planName = (tenant.plan || 'starter').toLowerCase();
      if (planName === 'starter') {
        tenant.token_limit = 100000;
        tenant.agent_limit = 2;
        tenant.features = {
          api_access: true,
          webhook_logging: false,
          rag_documents: 500,
          audit_trail: false,
          priority_support: false,
          custom_models: false,
          dpdp_compliance: true,
          sla_hours: 72,
        };
        tenant.model_access = ['Harikson-3B'];
      } else if (
        planName === 'professional' ||
        planName === 'pro' ||
        planName === 'team'
      ) {
        tenant.token_limit = 5000000;
        tenant.agent_limit = 20;
        tenant.features = {
          api_access: true,
          webhook_logging: true,
          rag_documents: 50000,
          audit_trail: true,
          priority_support: true,
          custom_models: false,
          dpdp_compliance: true,
          sla_hours: 12,
        };
        tenant.model_access = [
          'Harikson-3B',
          'Qwen3-8B',
          'Qwen3-32B',
          'Qwen3-72B',
        ];
      } else {
        // Enterprise or default
        tenant.token_limit = -1;
        tenant.agent_limit = -1;
        tenant.features = {
          api_access: true,
          webhook_logging: true,
          rag_documents: -1,
          audit_trail: true,
          priority_support: true,
          custom_models: true,
          dpdp_compliance: true,
          sla_hours: 2,
        };
        tenant.model_access = [
          'Harikson-3B',
          'Qwen3-8B',
          'Qwen3-32B',
          'Qwen3-72B',
          'Custom Fine-Tuned',
        ];
      }
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Helper to parse cookies from Header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

// Validate password criteria, including minimum length and character variation
function validatePassword(password, email, name) {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  const lowerPwd = password.toLowerCase();

  if (email) {
    const lowerEmail = email.toLowerCase();
    const emailPrefix = lowerEmail.split('@')[0];
    if (lowerPwd === lowerEmail || lowerPwd.includes(lowerEmail)) {
      errors.push('Password must not contain or match your email address.');
    }
    if (
      emailPrefix.length >= 3 &&
      (lowerPwd === emailPrefix || lowerPwd.includes(emailPrefix))
    ) {
      errors.push('Password must not contain or match your email username.');
    }
  }

  if (name) {
    const lowerName = name.toLowerCase();
    if (
      lowerName.length >= 3 &&
      (lowerPwd === lowerName || lowerPwd.includes(lowerName))
    ) {
      errors.push('Password must not contain or match your name.');
    }
  }

  return errors;
}

// Check against HaveIBeenPwned API range protocol
async function isPasswordPwned(password) {
  try {
    const sha1 = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        timeout: 3000,
      }
    );

    const lines = response.data.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return parseInt(count, 10) > 0;
      }
    }
    return false;
  } catch (err) {
    console.warn('HaveIBeenPwned check failed, falling open:', err.message);
    return false;
  }
}

/**
 * Rate Limiting Redis Key Naming Conventions:
 * - IP-based endpoint limits (auth vs public): rl:ip:${ip}:${type}
 * - Tenant-level rate limit: rl:tenant:${tenantId}
 * - User-level rate limit: ratelimit:${tenantId}:${userId}
 * - Registration attempts rate limit: ratelimit:register:${ip}
 * - Login attempts rate limit: ratelimit:login:${ip}
 * - Password Reset attempts rate limit: ratelimit:password-reset:${ip}
 * - Developer API Key rate limit: ratelimit:apikey:${keyHash}
 */
// Generic Sliding Window Rate Limiter using Redis Sorted Sets
async function checkSlidingWindowLimit(key, limit, windowSeconds = 60) {
  if (limit === -1) {
    return {
      allowed: true,
      limit,
      remaining: 99999,
      reset: Math.ceil(Date.now() / 1000) + windowSeconds,
      retryAfter: 0,
    };
  }
  const now = Date.now();
  const clearBefore = now - windowSeconds * 1000;
  const member = `${now}-${Math.random()}`; // Ensure uniqueness inside ZSET

  try {
    const multi = redis.multi();
    multi.zadd(key, now, member);
    multi.zremrangebyscore(key, 0, clearBefore);
    multi.zcard(key);
    multi.expire(key, windowSeconds + 10);
    const results = await multi.exec();

    const count = results[2][1];
    const remaining = Math.max(0, limit - count);
    const resetTime = Math.ceil((now + windowSeconds * 1000) / 1000);
    const retryAfter = count > limit ? windowSeconds : 0;

    return {
      allowed: count <= limit,
      limit,
      remaining,
      reset: resetTime,
      retryAfter,
    };
  } catch (err) {
    console.error(`[RATE LIMIT ERROR] Redis key ${key} failed:`, err.message);
    return {
      allowed: true,
      limit,
      remaining: 1,
      reset: Math.ceil(Date.now() / 1000),
      retryAfter: 0,
    };
  }
}

// Comprehensive rate-limiting middleware
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // 1. IP Determination
    const rawIp =
      (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const ip = rawIp.replace(/^::ffff:/, '');

    const path = req.path || '';
    const isAuthEndpoint = path.startsWith('/api/auth');
    const isChatEndpoint =
      path.startsWith('/api/conversations') ||
      path.startsWith('/api/messages') ||
      path.includes('/chat');
    const isApiEndpoint = path.startsWith('/api/') && !isAuthEndpoint;

    // A. IP Limit:
    // - Auth endpoints: 10 req/min
    // - Public/Other endpoints: 100 req/min
    const ipLimit = isAuthEndpoint ? 10 : 100;
    const ipKey = `rl:ip:${ip}:${isAuthEndpoint ? 'auth' : 'public'}`;
    const ipRes = await checkSlidingWindowLimit(ipKey, ipLimit, 60);

    // Set rate limit headers on response
    res.setHeader('X-RateLimit-Limit', ipRes.limit);
    res.setHeader('X-RateLimit-Remaining', ipRes.remaining);
    res.setHeader('X-RateLimit-Reset', ipRes.reset);

    if (!ipRes.allowed) {
      res.setHeader('Retry-After', ipRes.retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests: IP rate limit exceeded',
        retryAfter: ipRes.retryAfter,
      });
    }

    // Resolve context to determine API Key / User / Tenant limits
    let tenantId = null;
    let userId = null;
    let tenantPlan = 'starter';
    let isApiKey = false;
    let apiKeyId = null;
    let keyHash = null;

    let token = null;
    const cookies = parseCookies(req.headers.cookie);
    if (cookies && cookies.hk_access_token) {
      token = cookies.hk_access_token;
    }
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      if (token.startsWith('hk_live_') || token.startsWith('hk_test_')) {
        isApiKey = true;
        keyHash = crypto.createHash('sha256').update(token).digest('hex');
        const keyRes = await pool.query(
          'SELECT * FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())',
          [keyHash]
        );
        if (keyRes.rows.length > 0) {
          apiKeyId = keyRes.rows[0].id;
          tenantId = keyRes.rows[0].tenant_id;
          userId = keyRes.rows[0].user_id;
        }
      } else if (token !== 'TEST_TOKEN' && token !== 'TEST_ADMIN_TOKEN') {
        try {
          const decoded = jwt.verify(token, jwtSecret);
          userId = decoded.userId;
        } catch (err) {
          console.warn(
            'Warning verifying JWT token in request logging middleware:',
            err.message
          );
        }
      }
    }

    // Resolve tenant context via header if not set by API key
    const tenantSlug = req.headers['x-tenant-slug'] || '';
    if (!tenantId && tenantSlug) {
      let querySlug = tenantSlug;
      if (['system', 'app', 'alphatech'].includes(tenantSlug.toLowerCase())) {
        querySlug = 'neuravolt';
      }
      const tRes = await pool.query(
        'SELECT id, plan FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
        [querySlug]
      );
      if (tRes.rows.length > 0) {
        tenantId = tRes.rows[0].id;
        tenantPlan = tRes.rows[0].plan || 'starter';
      }
    }

    // B. Developer API Key Limit: 500 req/min per key (using the unified key: ratelimit:apikey:${keyHash})
    if (isApiKey && keyHash) {
      const keyLimitRes = await checkSlidingWindowLimit(
        `ratelimit:apikey:${keyHash}`,
        500,
        60
      );
      res.setHeader('X-RateLimit-Limit', keyLimitRes.limit);
      res.setHeader('X-RateLimit-Remaining', keyLimitRes.remaining);
      res.setHeader('X-RateLimit-Reset', keyLimitRes.reset);
      if (!keyLimitRes.allowed) {
        res.setHeader('Retry-After', keyLimitRes.retryAfter);
        return res.status(429).json({
          error: 'Too Many Requests: API Key rate limit exceeded',
          retryAfter: keyLimitRes.retryAfter,
        });
      }
    }

    // C. Tenant Plan limits: Starter: 100/min, Pro/Professional: 1000/min, Enterprise: unlimited
    if (tenantId) {
      let tenantLimit = 100;
      if (tenantPlan === 'professional' || tenantPlan === 'pro') {
        tenantLimit = 1000;
      } else if (tenantPlan === 'enterprise') {
        tenantLimit = -1; // unlimited
      }

      if (tenantLimit !== -1) {
        const tenantLimitRes = await checkSlidingWindowLimit(
          `rl:tenant:${tenantId}`,
          tenantLimit,
          60
        );
        res.setHeader('X-RateLimit-Limit', tenantLimitRes.limit);
        res.setHeader('X-RateLimit-Remaining', tenantLimitRes.remaining);
        res.setHeader('X-RateLimit-Reset', tenantLimitRes.reset);
        if (!tenantLimitRes.allowed) {
          res.setHeader('Retry-After', tenantLimitRes.retryAfter);
          return res.status(429).json({
            error: 'Too Many Requests: Tenant plan rate limit exceeded',
            retryAfter: tenantLimitRes.retryAfter,
          });
        }
      }
    }

    // D. User-based limits: API: 1000 req/min, Chat: 60 req/min
    if (userId) {
      const userLimit = isChatEndpoint ? 60 : 1000;
      const userLimitKey = `rl:user:${userId}:${isChatEndpoint ? 'chat' : 'api'}`;
      const userLimitRes = await checkSlidingWindowLimit(
        userLimitKey,
        userLimit,
        60
      );
      res.setHeader('X-RateLimit-Limit', userLimitRes.limit);
      res.setHeader('X-RateLimit-Remaining', userLimitRes.remaining);
      res.setHeader('X-RateLimit-Reset', userLimitRes.reset);
      if (!userLimitRes.allowed) {
        res.setHeader('Retry-After', userLimitRes.retryAfter);
        return res.status(429).json({
          error: 'Too Many Requests: User rate limit exceeded',
          retryAfter: userLimitRes.retryAfter,
        });
      }
    }
  } catch (err) {
    console.error('[RATE LIMIT MIDDLEWARE ERROR]:', err);
  }

  next();
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const cookies = req.cookies || parseCookies(req.headers.cookie);
    let token = cookies.hk_access_token;

    // Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // INTERCEPT Developer API Keys (starting with hk_live_ or hk_test_)
    if (
      token &&
      (token.startsWith('hk_live_') || token.startsWith('hk_test_'))
    ) {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      // Look up key in DB
      const keyRes = await pool.query(
        `SELECT * FROM api_keys 
         WHERE key_hash = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
        [keyHash]
      );
      if (keyRes.rows.length === 0) {
        return res
          .status(401)
          .json({ error: 'Access Denied: Invalid or revoked API Key' });
      }

      const keyRecord = keyRes.rows[0];

      // Update last_used_at in the background (non-blocking)
      pool
        .query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [
          keyRecord.id,
        ])
        .catch((err) => {
          console.warn(
            'Warning updating last_used_at for api_key:',
            err.message
          );
        });

      // Fetch user details to mock JWT session context
      const userRes = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
        [keyRecord.user_id]
      );
      if (userRes.rows.length === 0) {
        return res.status(401).json({
          error: 'Access Denied: User account is inactive or deleted',
        });
      }

      const user = userRes.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        isDeveloperKey: true,
        apiKeyId: keyRecord.id,
      };
      req.tenant = { id: keyRecord.tenant_id };
      return next();
    }

    console.log(
      `[AUTH DEBUG] ${req.method} ${req.url} - Token: "${token ? 'Present' : 'None'}" - Tenant Header: "${req.headers['x-tenant-slug']}"`
    );

    let decoded;
    let tokenExpired = false;

    // Support fallback tokens for isolated sandbox testing
    if (token === 'TEST_TOKEN' || token === 'TEST_ADMIN_TOKEN') {
      decoded = {
        userId: '00000000-0000-0000-0000-000000000001',
        role: 'superadmin',
      };
    } else if (token) {
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          tokenExpired = true;
        } else {
          return res
            .status(401)
            .json({ error: 'Access Denied: Invalid token' });
        }
      }
    }

    // Auto-refresh token rotation if access token is missing/expired but valid refresh cookie is present
    if (!decoded || tokenExpired) {
      const refreshToken = cookies.hk_refresh_token;
      if (!refreshToken) {
        return res
          .status(401)
          .json({ error: 'Access Denied: Session expired' });
      }

      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Look up and validate refresh token
      const rtQuery = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
        [refreshTokenHash]
      );

      if (rtQuery.rows.length === 0) {
        return res
          .status(401)
          .json({ error: 'Access Denied: Session expired' });
      }

      const rtRecord = rtQuery.rows[0];

      // Revoke old refresh token (rotation!)
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
        [rtRecord.id]
      );

      // Look up user
      const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [
        rtRecord.user_id,
      ]);

      if (userQuery.rows.length === 0) {
        return res.status(401).json({ error: 'Access Denied: User not found' });
      }

      const user = userQuery.rows[0];

      // Issue new token pair
      const newAccessToken = jwt.sign(
        { userId: user.id, role: user.role },
        jwtSecret,
        { expiresIn: '15m' }
      );
      const newRefreshToken = crypto.randomBytes(32).toString('hex');
      const newRefreshTokenHash = crypto
        .createHash('sha256')
        .update(newRefreshToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await pool.query(
        `INSERT INTO refresh_tokens (token, user_id, tenant_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [newRefreshTokenHash, user.id, rtRecord.tenant_id, expiresAt]
      );

      const host = req.headers.host || '';
      const domainSuffix = host.includes('neuravolt.cloud')
        ? '; Domain=.neuravolt.cloud'
        : '';
      const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';

      res.setHeader('Set-Cookie', [
        `hk_access_token=${newAccessToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${15 * 60}${domainSuffix}`,
        `hk_refresh_token=${newRefreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}${domainSuffix}`,
      ]);

      decoded = { userId: user.id, role: user.role };
    }

    // Verify user exists in the current tenant (RLS-enforced query)
    let user = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [
        decoded.userId,
      ]);
      return result.rows[0];
    });

    // If testing via sandbox token and user isn't in this tenant yet, auto-provision user
    if (!user && (token === 'TEST_TOKEN' || token === 'TEST_ADMIN_TOKEN')) {
      user = await executeTenantQuery(req.tenant.id, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO users (id, tenant_id, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
           RETURNING *`,
          [
            decoded.userId,
            req.tenant.id,
            `sandbox@${req.tenant.slug}.harikson.ai`,
            'mock_hash',
            'user',
          ]
        );
        return insertResult.rows[0];
      });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: 'Access Denied: Invalid user session for this tenant' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Access Denied: Invalid or expired token' });
  }
};

app.use(rateLimiterMiddleware);

// 1. GET /health (Bypasses tenant middleware for status probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Apply tenant middleware to all non-health routes
app.use(tenantMiddleware);

// 2. GET /api/models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${ollamaHost}/api/tags`);
    const models = (response.data.models || [])
      .map((m) => m.name)
      .filter(
        (name) => name.startsWith('harikson-') || name.includes('harikson')
      );

    res.status(200).json(models);
  } catch (err) {
    console.warn('Ollama offline, returning fallback model list');
    res
      .status(200)
      .json(['harikson-chat-8b', 'harikson-coder-7b', 'harikson-coder-14b']);
  }
});

// 3. POST /api/models/switch
app.post('/api/models/switch', (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.status(400).json({ error: 'Model name is required' });
  }
  res.status(200).json({
    success: true,
    message: `Successfully switched default workspace model to ${model}`,
  });
});

// 4. Helper: build system prompt
function getSystemPrompt(model) {
  const fileInstructions = `
# IDENTITY
You are Harikson AI, an Enterprise Document Intelligence Agent. You analyze uploaded files with the rigor of a senior consultant, security engineer, and data analyst. You do not summarize superficially. You investigate, validate, and structure evidence.

# CORE MANDATE
1. Ground every claim in the document. Cite page numbers, section headers, line numbers, or table coordinates.
2. Distinguish explicitly between: [VERIFIED], [INFERRED], and [UNKNOWN].
3. Never fabricate data. If information is absent, state: "Not found in document."
4. Respect token budgets. Prioritize signal over noise.

---

# PHASE 1: INTELLIGENT TRIAGE (Execute First)

Before any analysis, classify the document and determine user intent.

## 1.1 Document Classification
Determine the PRIMARY type. Use ONLY the most specific match:
- LEGAL: Contracts, NDAs, Terms of Service, Compliance docs
- FINANCIAL: Invoices, Statements, Reports, Tax docs, Budgets
- TECHNICAL: Source code, Architecture diagrams, API specs, Config files
- RESEARCH: Academic papers, Whitepapers, Clinical studies
- BUSINESS: Proposals, Business plans, Meeting minutes, Memos
- MEDIA: Presentations, UI mockups, Images, Videos
- DATA: Spreadsheets, CSVs, JSON, XML, Databases
- OPERATIONAL: Manuals, SOPs, Log files, Incident reports

## 1.2 Intent Detection
Infer the user's goal from context (query text + file name + file type):
- SCAN: "What is this?" / "Quick overview" → Executive Summary only
- EXTRACT: "Find the termination clause" / "List all APIs" → Targeted extraction
- DEEP_ANALYSIS: "Analyze this contract" / "Review this code" → Full domain analysis
- COMPARE: (If multiple files) → Cross-document differential analysis
- CONVERT: "Turn this into a table" / "Extract JSON" → Structured data transformation

If intent is unclear, default to SCAN + offer DEEP_ANALYSIS.

## 1.3 Analysis Depth Selection
Based on Classification + Intent, select depth:

| Depth | Trigger | Output |
|-------|---------|--------|
| **L1-Scan** (≤800 tokens) | SCAN intent or file >50 pages | 5-bullet summary, 3 risks, 1 action item |
| **L2-Targeted** (≤2000 tokens) | EXTRACT intent | Specific sections only, with citations |
| **L3-Deep** (≤4000 tokens) | DEEP_ANALYSIS intent | Full domain analysis per Phase 3 |
| **L4-Comprehensive** (budget permitting) | Critical legal/financial/technical + explicit request | Multi-domain analysis with cross-references |

---

# PHASE 2: DOCUMENT INGESTION & EXTRACTION

## 2.1 Content Inventory
Map the document structure:
- Page count / Line count / File size
- Hierarchy: Title → Sections → Subsections → Paragraphs
- Embedded objects: Tables (count, row/col ranges), Images (count, types), Code blocks, Charts
- Metadata: Author, Date, Version, Language, Encoding issues

## 2.2 OCR & Visual Handling (If images present)
For each image/visual element:
1. Extract visible text (OCR)
2. Classify image type: {Chart, Diagram, Screenshot, Photo, Scanned-Text, Signature, Stamp/Seal}
3. For Charts: Describe axes, data series, trends, anomalies
4. For Diagrams: Identify components, relationships, flows
5. For Screenshots: Evaluate UI elements, accessibility, branding consistency
6. For Scanned-Text: Report OCR confidence level (High/Medium/Low)

## 2.3 Data Integrity Check
- Flag corrupted pages, broken tables, unreadable sections
- Report duplicate content (e.g., repeated headers in PDF)
- Note truncation if document exceeds processing window
- Verify table math: spot-check totals, percentages, date ranges for consistency

---

# PHASE 3: DOMAIN-SPECIFIC ANALYSIS (Conditional Execution)

Execute ONLY the modules relevant to the Document Classification and Analysis Depth.

## MODULE A: LEGAL ANALYSIS (If LEGAL or DEEP + legal content)
- Parties: Names, roles, signing authorities
- Key Dates: Effective date, Termination date, Renewal deadlines, Notice periods
- Obligations: Deliverables, SLAs, warranties, non-compete scope
- Financial Terms: Payment schedule, penalties, liability caps, insurance requirements
- Termination: Cause vs convenience, cure periods, post-termination obligations
- Risk Flags: Unlimited liability, auto-renewal, ambiguous jurisdiction, missing governing law
- Compliance: GDPR, SOC2, HIPAA references (if applicable)
- Missing Clauses: Identify standard clauses absent from the document
- Citation Format: "Section 4.2, Page 12"

## MODULE B: FINANCIAL ANALYSIS (If FINANCIAL or DEEP + financial content)
- Extract: Revenue, COGS, Operating Expenses, Net Income, Tax liabilities
- Time Periods: Ensure all figures have associated dates/quarters
- Ratios: Calculate margins, growth rates, runway (if applicable)
- Anomalies: Unusual line items, rounding errors, negative balances
- Invoice Verification: Vendor match, PO reference, payment terms, tax ID validity
- Compliance: VAT/GST treatment, withholding tax, regulatory filing alignment
- Citation Format: "Table: P&L Statement, Page 5, Line 23"

## MODULE C: TECHNICAL ANALYSIS (If TECHNICAL or DEEP + technical content)
- Architecture: Diagram topology, service boundaries, data flow
- Stack: Languages, frameworks, libraries, runtime versions
- APIs: Endpoints, auth methods, rate limits, deprecation status
- Data Layer: Database types, schema patterns, migration strategies
- Security: AuthN/AuthZ, secret management, input validation, dependency vulnerabilities
- Infrastructure: Cloud provider, containerization, CI/CD pipeline, IaC
- Debt: TODO comments, deprecated APIs, hardcoded values, missing tests
- Performance: Complexity analysis, N+1 queries, caching strategy
- Citation Format: "File: src/auth.py, Lines 45-62"

## MODULE D: CODE REVIEW (If source code detected)
- Structure: Directory tree, module boundaries, entry points
- Quality: Cyclomatic complexity estimate, duplication, dead code
- Security: SQL injection, XSS, hardcoded secrets, insecure deserialization
- Testing: Coverage indicators, test types, mocking strategy
- Documentation: README completeness, inline comments, API docs
- Maintainability: SOLID principles adherence, dependency freshness
- Citation Format: "Function: \`calculateTotal()\` in \`billing.js:145\`"

## MODULE E: DATA ANALYSIS (If DATA or structured content)
- Schema: Column names, data types, primary/foreign keys
- Quality: Missing value %, duplicate rows, outlier ranges
- Distribution: Categorical frequencies, numerical summaries
- Relationships: Correlations, cardinality, referential integrity
- Temporal: Date ranges, gaps, seasonality
- Actionable: Top 3 data quality issues + remediation steps
- Citation Format: "Column: \`customer_id\`, Row 1,204"

## MODULE F: RESEARCH ANALYSIS (If RESEARCH)
- Hypothesis/Objective: Stated research question
- Methodology: Study design, sample size, control groups, validity threats
- Data: Dataset source, preprocessing steps, feature engineering
- Results: Statistical significance, effect sizes, confidence intervals
- Limitations: Acknowledged by authors + your detected gaps
- Novelty: Contribution claim vs prior art comparison
- Citation Format: "Section: Methodology, Page 8, Paragraph 3"

## MODULE G: BUSINESS ANALYSIS (If BUSINESS or DEEP + strategic content)
- Purpose: Problem statement, market opportunity
- Stakeholders: Identified parties, decision-makers, influencers
- Model: Revenue streams, pricing strategy, unit economics
- Risks: Market, operational, financial, regulatory
- Metrics: KPIs, OKRs, benchmarks mentioned
- Strategic Gaps: Missing competitive analysis, unclear go-to-market
- Citation Format: "Slide 7: 'Revenue Projections'"

## MODULE H: UI/UX ANALYSIS (If MEDIA + UI content)
- Layout: Grid system, whitespace, visual hierarchy
- Accessibility: Color contrast, alt text, keyboard navigation, ARIA labels
- Consistency: Design system adherence, typography scale, iconography
- Usability: Cognitive load, task flow efficiency, error prevention
- Responsive: Breakpoint handling, touch targets, mobile adaptation
- Citation Format: "Screenshot: Login modal, top-right corner"

## MODULE I: SECURITY REVIEW (If DEEP or explicit security request)
- PII Detection: Names, emails, SSNs, phone numbers, addresses → REDACT in output
- Secrets: API keys, passwords, tokens, private keys → WARN but do not repeat values
- Compliance: SOC2, ISO27001, GDPR, PCI-DSS gaps
- Access Control: RBAC, MFA, least privilege implementation
- Data Handling: Encryption at rest/transit, retention policy, backup strategy
- Citation Format: "Page 34, Footer: Embedded email address"

---

# PHASE 4: SYNTHESIS & OUTPUT CONSTRUCTION

## 4.1 Confidence Scoring
For every significant claim, append a confidence score:
- [HIGH] - Directly visible, unambiguous text
- [MEDIUM] - Requires minor inference or interpretation
- [LOW] - Partially obscured, inferred from context, or ambiguous
- [CRITICAL] - High-stakes claim requiring human verification

## 4.2 Response Structure (Adaptive)

### For L1-Scan:
1. **Executive Summary** (3-5 bullets)
2. **Document Profile** (Type, Pages, Primary Language)
3. **Top 3 Findings** (Highest signal items)
4. **Critical Risks** (If any)
5. **Recommended Next Step** (1 action)

### For L2-Targeted:
1. **Query Answer** (Direct response to user intent)
2. **Evidence** (Citations with context snippets)
3. **Gaps** (What was searched but not found)
4. **Related Findings** (2-3 adjacent items of interest)

### For L3-Deep / L4-Comprehensive:
1. **Executive Summary** (Situation-Complication-Resolution format)
2. **Document Profile** (Metadata, structure, integrity status)
3. **Key Findings** (Prioritized by business impact)
4. **Domain Analysis** (Relevant modules from Phase 3)
5. **Cross-Domain Insights** (e.g., Legal risk → Financial impact)
6. **Visual Elements Summary** (If applicable)
7. **Risk Register** (Severity: Critical/High/Medium/Low + Likelihood)
8. **Missing Information** (Explicit gaps with business impact)
9. **Recommendations** (Prioritized, actionable, with effort estimates)
10. **Action Items** (Owner-agnostic, time-boxed)
11. **Overall Assessment** (Go/No-go or numerical score if applicable)

## 4.3 Tone & Formatting Rules
- Use professional business English
- Bold key terms on first mention
- Use tables for comparative data
- Use blockquotes for direct document excerpts
- Use ⚠️ for warnings, 🔒 for security findings, 💡 for opportunities
- Never use markdown headers deeper than #### for readability

---

# PHASE 5: QUALITY ASSURANCE (Self-Correction)

Before finalizing, verify:
- [ ] Did I answer the user's implicit or explicit question?
- [ ] Are all claims cited with specific locations?
- [ ] Did I distinguish facts from inferences?
- [ ] Did I flag any sensitive data appropriately?
- [ ] Is the analysis depth appropriate to the intent?
- [ ] Did I mention document limitations (truncation, corruption, language)?
- [ ] Would a CEO understand the business implications?
- [ ] Would an Engineer understand the technical architecture?
- [ ] Would a Lawyer understand the legal exposure?

If any check fails, revise the relevant section before output.`;

  if (
    model.toLowerCase().includes('max') ||
    model.toLowerCase().includes('coder')
  ) {
    return `You are Harikson Max, an elite software engineering AI built by Harikson AI.
You are an expert in all programming languages, frameworks, databases, system design, DevOps, and cloud architecture.
When asked to write code, always provide complete, production-ready, well-commented code.
Always remember and refer to everything discussed earlier in this conversation thread.
Never say you cannot remember previous messages — you always have full conversation history.
Never break character. You are Harikson Max.

${fileInstructions}`;
  }
  return `You are Harikson, a highly intelligent AI assistant built by Harikson AI.
You excel at answering questions, explaining concepts, writing code, and technical tasks.
CRITICAL: Always maintain full context of the entire conversation. When a user says things like "generate code", "show me", "do it", or "give example", always refer back to the previous messages to understand exactly what they are referring to.
Never ask for clarification if the answer is clear from the conversation history.
Never break character. You are Harikson — a premium enterprise AI assistant.

${fileInstructions}`;
}

// Helper: Search web via DuckDuckGo
async function searchWeb(query) {
  if (!query) return '';
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $('.result').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').attr('href');
      if (title && snippet)
        results.push(`Title: ${title}\nSnippet: ${snippet}\nURL: ${link}`);
    });
    return results.join('\n\n');
  } catch (err) {
    console.error('Failed to search web:', err.message);
    return 'Web search failed.';
  }
}

// Helper: Crawl website for agent context
async function crawlWebsite(
  url,
  maxDepth = 1,
  currentDepth = 0,
  visited = new Set()
) {
  if (visited.has(url) || currentDepth > maxDepth || visited.size >= 4)
    return '';
  visited.add(url);

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const html = response.data;
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, svg, img, nav, footer, iframe, noscript').remove();

    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1')
      .map((i, el) => $(el).text().trim())
      .get()
      .join(' | ');
    const h2 = $('h2')
      .map((i, el) => $(el).text().trim())
      .get()
      .join(' | ');

    let textContent = $('body').text().replace(/\s+/g, ' ').trim();
    if (textContent.length > 3000) {
      textContent = textContent.substring(0, 3000) + '...';
    }

    let result = `\n--- PAGE: ${url} ---\nTitle: ${title}\nMeta Description: ${metaDesc}\nH1: ${h1}\nH2: ${h2}\nContent:\n${textContent}\n`;

    if (currentDepth < maxDepth) {
      const baseUrl = new URL(url).origin;
      const links = $('a')
        .map((i, el) => $(el).attr('href'))
        .get()
        .filter(
          (href) => href && (href.startsWith('/') || href.startsWith(baseUrl))
        )
        .map((href) => (href.startsWith('/') ? baseUrl + href : href))
        .filter((href) => !href.includes('#') && !visited.has(href));

      const uniqueLinks = [...new Set(links)].slice(0, 2);
      for (const link of uniqueLinks) {
        const subResult = await crawlWebsite(
          link,
          maxDepth,
          currentDepth + 1,
          visited
        );
        result += subResult;
      }
    }

    return result;
  } catch (err) {
    console.warn(`Failed to crawl ${url}:`, err.message);
    return `\n--- PAGE: ${url} ---\nFailed to fetch content: ${err.message}\n`;
  }
}

// Helper: Sliding window character-based text chunker
function chunkText(text, size = 800, overlap = 150) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.substring(start, end));
    if (end === text.length) break;
    start += size - overlap;
  }
  return chunks;
}

// Helper: Get vector embedding from Ollama model
async function getEmbedding(text, model = 'qwen2.5-coder:7b') {
  const lower = model.toLowerCase();
  let mappedModel = 'qwen2.5:0.5b';
  if (lower.includes('coder') || lower.includes('code')) {
    mappedModel = 'qwen2.5-coder:1.5b';
  }
  if (process.env.NODE_ENV !== 'development') {
    mappedModel = 'qwen2.5-coder:7b';
  }

  try {
    const response = await axios.post(`${ollamaHost}/api/embeddings`, {
      model: mappedModel,
      prompt: text,
    });
    let embedding = response.data.embedding || [];

    // Ensure length is exactly 1536 (pgvector target)
    if (embedding.length < 1536) {
      const pad = new Array(1536 - embedding.length).fill(0.0);
      embedding = embedding.concat(pad);
    } else if (embedding.length > 1536) {
      embedding = embedding.slice(0, 1536);
    }
    return embedding;
  } catch (error) {
    console.warn(
      'Ollama embeddings error in tenant-api, returning fallback mock vector.',
      error.message
    );
    return generateMockEmbedding(text);
  }
}

function generateMockEmbedding(text) {
  const embedding = new Array(1536).fill(0.0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  for (let j = 0; j < 1536; j++) {
    embedding[j] = Math.sin(hash + j) * 0.1;
  }
  return embedding;
}

// Helper: build messages array for Ollama /api/chat (proper multi-turn memory)
function buildMessages(history, userMessage, model, agentConfig = null) {
  const messages = [
    {
      role: 'system',
      content:
        agentConfig && agentConfig.system_prompt
          ? agentConfig.system_prompt
          : getSystemPrompt(model),
    },
  ];
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

// Helper: context-aware fallback mock response
function getMockResponse(history, userMessage, model) {
  const lowerMsg = userMessage.toLowerCase();
  const historyText = history
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();

  if (
    lowerMsg.includes('code') ||
    lowerMsg.includes('generate') ||
    lowerMsg.includes('example') ||
    lowerMsg.includes('show')
  ) {
    if (
      historyText.includes('login') ||
      historyText.includes('auth') ||
      historyText.includes('password')
    ) {
      return `Here is a complete login implementation based on our conversation:\n\`\`\`javascript\nasync function handleLogin(email, password) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ email, password })\n  });\n  if (!response.ok) {\n    const err = await response.json();\n    throw new Error(err.message || 'Login failed');\n  }\n  const { token, user } = await response.json();\n  localStorage.setItem('token', token);\n  window.location.href = '/dashboard';\n  return user;\n}\n\`\`\``;
    }
    return `Here is a code example:\n\`\`\`javascript\nasync function processRequest(data) {\n  if (!data) throw new Error('Invalid input');\n  const result = await fetch('/api/process', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(data)\n  });\n  return result.json();\n}\n\`\`\``;
  }
  return `I understand your request about: "${userMessage}". The AI model is warming up — please try again in a moment for a full intelligent response.`;
}

// 4.5 GET /api/agents
app.get('/api/agents', authMiddleware, async (req, res) => {
  try {
    const agents = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        "SELECT id, name, description, category, model FROM agents WHERE status = 'active' AND (visibility = 'public' OR tenant_id = $1 OR tenant_id IS NULL) ORDER BY created_at DESC",
        [req.tenant.id]
      );
      return result.rows;
    });
    res.json(agents);
  } catch (err) {
    console.error('Failed to fetch agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// 5. POST /api/chat
app.post(
  '/api/chat',
  authMiddleware,
  validate(chatMessageSchema),
  async (req, res) => {
    const {
      message,
      model,
      conversationId,
      clientHistory,
      agent_id,
      deepSearch,
      reasoning,
    } = req.body;

    let selectedModel = model || 'harikson-plus';
    let agentConfig = null;

    if (agent_id) {
      try {
        agentConfig = await executeTenantQuery(
          req.tenant.id,
          async (client) => {
            const agentResult = await client.query(
              "SELECT * FROM agents WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR tenant_id = $2 OR tenant_id IS NULL)",
              [agent_id, req.tenant.id]
            );
            return agentResult.rows[0];
          }
        );
        if (agentConfig) {
          selectedModel = agentConfig.model || selectedModel;
        }
      } catch (err) {
        console.warn('Failed to fetch agent config:', err);
      }
    }

    // Model Access check
    if (req.tenant.model_access && req.tenant.model_access.length > 0) {
      const allowed = req.tenant.model_access.map((m) => m.toLowerCase());
      const targetModel = selectedModel.toLowerCase();
      const isAllowed = allowed.some(
        (m) => targetModel.includes(m) || m.includes(targetModel)
      );
      if (!isAllowed) {
        return res.status(403).json({
          error: `Your subscription plan (${req.tenant.plan}) does not have access to model: ${selectedModel}`,
        });
      }
    }

    // Token Limit check
    if (req.tenant.token_limit && req.tenant.token_limit > 0) {
      try {
        const tokenRes = await pool.query(
          'SELECT COALESCE(SUM(tokens_used), 0)::int as tokens_used FROM messages WHERE tenant_id = $1',
          [req.tenant.id]
        );
        const tokensUsed = tokenRes.rows[0].tokens_used;
        const hardLimit = req.tenant.token_limit * 1.1;
        const promptTokenEstimate = Math.ceil(message.length / 4);
        const expectedGenerated = agentConfig
          ? parseInt(agentConfig.max_tokens)
          : 250;
        const estimatedTokensNeeded = promptTokenEstimate + expectedGenerated;

        if (tokensUsed >= hardLimit) {
          return res.status(403).json({
            error: `Monthly token limit exceeded. Your current usage is ${tokensUsed.toLocaleString()} tokens (limit is ${req.tenant.token_limit.toLocaleString()}). Please upgrade your subscription plan.`,
          });
        }
      } catch (err) {
        console.warn('Failed to verify token limit:', err);
      }
    }

    // Rate limiting via Redis (loaded dynamically from database plan configuration)
    let limit = 10;
    if (
      req.tenant.features &&
      typeof req.tenant.features.rpm_limit === 'number'
    ) {
      limit = req.tenant.features.rpm_limit;
    } else {
      // Fallback based on plan name
      const planName = (req.tenant.plan || 'starter').toLowerCase();
      if (planName === 'starter' || planName === 'solo') {
        limit = 10;
      } else if (
        planName === 'professional' ||
        planName === 'pro' ||
        planName === 'team'
      ) {
        limit = 60;
      } else if (planName === 'business') {
        limit = 300;
      } else if (planName === 'enterprise') {
        limit = 0; // unlimited
      }
    }

    if (limit > 0) {
      const key = `ratelimit:${req.tenant.id}:${req.user.id}`;
      try {
        const current = await redis.get(key);
        if (current && parseInt(current) >= limit) {
          return res
            .status(429)
            .json({ error: 'Rate limit exceeded. Please upgrade your plan.' });
        }

        const multi = redis.multi();
        multi.incr(key);
        multi.ttl(key);
        const results = await multi.exec();
        const ttl = results[1][1];
        if (ttl === -1) {
          await redis.expire(key, 60);
        }
      } catch (err) {
        console.warn(
          'Redis rate limit check failed, bypassing to ensure availability',
          err
        );
      }
    }

    try {
      let currentConvId = conversationId;
      let history = [];

      // Fetch conversation history (auto-scoped under RLS) or create a new conversation
      if (currentConvId) {
        history = await executeTenantQuery(req.tenant.id, async (client) => {
          const msgResult = await client.query(
            'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [currentConvId]
          );
          return msgResult.rows;
        });
      } else {
        currentConvId = await executeTenantQuery(
          req.tenant.id,
          async (client) => {
            const title = message.substring(0, 50);
            const convResult = await client.query(
              'INSERT INTO conversations (tenant_id, user_id, title, model) VALUES ($1, $2, $3, $4) RETURNING id',
              [req.tenant.id, req.user.id, title, selectedModel]
            );
            return convResult.rows[0].id;
          }
        );
      }

      // Accept client-side history directly — this eliminates DB race condition entirely
      // If frontend sends clientHistory, use it. Otherwise fall back to DB history.
      const finalHistory =
        clientHistory && clientHistory.length > 0 ? clientHistory : history;

      // Check for URLs to crawl or Deep Search
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.match(urlRegex) || [];
      let crawledContext = '';

      if (urls.length > 0) {
        // Crawl all found URLs
        for (const url of urls) {
          crawledContext += (await crawlWebsite(url, 1)) + '\n\n';
        }
      }

      if (deepSearch) {
        const searchResults = await searchWeb(message);
        crawledContext += `\n--- LIVE WEB SEARCH RESULTS ---\n${searchResults}\n`;
      }

      // RAG: Query relevant document embeddings using pgvector cosine similarity
      let ragContextText = '';
      try {
        const queryEmbedding = await getEmbedding(message, selectedModel);
        const embeddingString = `[${queryEmbedding.join(',')}]`;
        const ragRows = await executeTenantQuery(
          req.tenant.id,
          async (client) => {
            const res = await client.query(
              `SELECT de.content, 1 - (de.embedding <=> $1::vector) AS similarity
           FROM document_embeddings de
           JOIN knowledge_documents kd ON de.knowledge_document_id = kd.id
           WHERE de.tenant_id = $2 AND kd.is_active = true
           ORDER BY de.embedding <=> $1::vector
           LIMIT 5`,
              [embeddingString, req.tenant.id]
            );
            return res.rows;
          },
          true
        );

        if (ragRows && ragRows.length > 0) {
          ragContextText = ragRows
            .filter((row) => row.similarity > 0.35)
            .map((row) => row.content)
            .join('\n\n');
        }
      } catch (err) {
        console.warn(
          'Warning retrieving RAG context from document_embeddings:',
          err.message
        );
      }

      // Build messages array with full conversation history for proper context
      const messages = buildMessages(
        finalHistory,
        message,
        selectedModel,
        agentConfig
      );

      if (ragContextText) {
        messages.splice(messages.length - 1, 0, {
          role: 'system',
          content: `KNOWLEDGE BASE CONTEXT (Extracted from uploaded documents):\n${ragContextText}\nUse this context to answer the user request accurately.`,
        });
      }

      if (crawledContext) {
        messages.splice(messages.length - 1, 0, {
          role: 'system',
          content: `LIVE WEBSITE CONTEXT (Extracted from URL provided by user):\n${crawledContext}\nUse this context to fulfill the user's request accurately.`,
        });
      }

      const promptTokenEstimate = messages.reduce(
        (acc, m) => acc + Math.ceil(m.content.length / 4),
        0
      );
      const chatStartTime = Date.now();

      // Log activity start to admin panel
      let activityId = null;
      try {
        const adminApiBase =
          process.env.ADMIN_API_URL || 'http://admin-api:4000';
        const actResp = await axios
          .post(
            `${adminApiBase}/admin/activity`,
            {
              tenant_id: req.tenant.id,
              user_id: req.user.id,
              agent_id: agentConfig?.id || null,
              model: selectedModel,
              status: 'processing',
              tokens_in: 0,
              tokens_out: 0,
            },
            { timeout: 2000 }
          )
          .catch((err) => {
            console.warn(
              'Warning calling admin activity endpoint:',
              err.message
            );
            return null;
          });
        if (actResp?.data?.id) activityId = actResp.data.id;
      } catch (error) {
        console.warn('Warning logging activity to admin panel:', error.message);
      }

      // Set streaming headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Conversation-Id', currentConvId);

      try {
        const response = await axios.post(
          `${ollamaHost}/api/chat`,
          {
            model: selectedModel,
            messages: messages,
            stream: true,
            keep_alive: -1,
            options: {
              num_thread: 7,
              temperature: agentConfig
                ? parseFloat(agentConfig.temperature)
                : 0.7,
              num_predict: agentConfig
                ? parseInt(agentConfig.max_tokens)
                : 2048,
              top_p: agentConfig ? parseFloat(agentConfig.top_p) : 0.9,
            },
          },
          {
            responseType: 'stream',
            timeout: 180000,
          }
        );

        let fullResponseText = '';
        let promptTokens = promptTokenEstimate;
        let completionTokens = 0;
        let streamExceeded = false;
        let generatedTokensCount = 0;
        let dbSaved = false;

        async function saveCompletedChat(
          inTokens,
          outTokens,
          textContent,
          wasTerminated = false
        ) {
          if (dbSaved) return;
          dbSaved = true;

          try {
            await executeTenantQuery(req.tenant.id, async (client) => {
              await client.query(
                'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
                [req.tenant.id, currentConvId, 'user', message, inTokens]
              );
              await client.query(
                'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
                [
                  req.tenant.id,
                  currentConvId,
                  'assistant',
                  textContent,
                  outTokens,
                ]
              );
              await client.query(
                'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
                [currentConvId]
              );
              if (agentConfig) {
                await client.query(
                  'UPDATE agents SET total_requests = total_requests + 1, total_tokens = total_tokens + $1, last_used_at = NOW() WHERE id = $2',
                  [inTokens + outTokens, agentConfig.id]
                );
              }

              const totalFinalUsage =
                (typeof tokensUsed === 'number' ? tokensUsed : 0) +
                inTokens +
                outTokens;
              if (
                req.tenant.token_limit > 0 &&
                totalFinalUsage > req.tenant.token_limit
              ) {
                await client.query(
                  `INSERT INTO activity_logs (tenant_id, action, metadata)
                 VALUES ($1, $2, $3)`,
                  [
                    req.tenant.id,
                    'TOKEN_OVERAGE_FLAGGED',
                    JSON.stringify({
                      message: wasTerminated
                        ? 'Tenant hit hard 10% token buffer cutoff and was stream-terminated'
                        : 'Tenant exceeded token limit but completed within 10% buffer',
                      token_limit: req.tenant.token_limit,
                      tokens_used: totalFinalUsage,
                      excess_tokens: totalFinalUsage - req.tenant.token_limit,
                    }),
                  ]
                );
              }
            });
          } catch (dbErr) {
            console.error('Failed to save chat messages to DB:', dbErr);
          }

          const latency = Date.now() - chatStartTime;
          if (activityId) {
            axios
              .post(
                `${process.env.ADMIN_API_URL || 'http://admin-api:4000'}/admin/activity`,
                {
                  tenant_id: req.tenant.id,
                  user_id: req.user.id,
                  agent_id: agentConfig?.id || null,
                  model: selectedModel,
                  status: wasTerminated ? 'failed' : 'completed',
                  tokens_in: inTokens,
                  tokens_out: outTokens,
                  latency_ms: latency,
                }
              )
              .catch((err) => {
                console.warn(
                  'Warning updating admin activity status:',
                  err.message
                );
              });
          }
        }

        response.data.on('data', (chunk) => {
          if (streamExceeded) return;
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            if (streamExceeded) break;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message && parsed.message.content) {
                const chunkTokens =
                  Math.ceil(parsed.message.content.length / 4) || 1;
                generatedTokensCount += chunkTokens;

                const currentUsage =
                  typeof tokensUsed === 'number' ? tokensUsed : 0;
                if (
                  req.tenant.token_limit > 0 &&
                  currentUsage + promptTokens + generatedTokensCount >=
                    req.tenant.token_limit * 1.1
                ) {
                  streamExceeded = true;
                  res.write(
                    '\n\n⚠️ [SYSTEM NOTICE]: Monthly token quota limit has been exceeded. Gracefully terminating generation stream. Please upgrade your subscription plan.'
                  );
                  response.data.destroy();
                  res.end();

                  completionTokens = generatedTokensCount;
                  saveCompletedChat(
                    promptTokens,
                    completionTokens,
                    fullResponseText,
                    true
                  );
                  break;
                }

                fullResponseText += parsed.message.content;
                res.write(parsed.message.content);
              }
              if (parsed.done) {
                promptTokens = parsed.prompt_eval_count || promptTokens;
                completionTokens =
                  parsed.eval_count || Math.ceil(fullResponseText.length / 4);
              }
            } catch (e) {
              console.warn('Warning parsing Ollama stream chunk:', e.message);
            }
          }
        });

        response.data.on('end', async () => {
          await saveCompletedChat(
            promptTokens,
            completionTokens,
            fullResponseText,
            false
          );
          res.end();
        });

        response.data.on('error', (streamErr) => {
          console.error('Ollama stream error:', streamErr);
          if (!res.writableEnded) res.end();
        });
      } catch (ollamaErr) {
        console.warn(
          'Ollama /api/chat failed, using context-aware fallback:',
          ollamaErr.message
        );
        const fallbackResponse = getMockResponse(
          finalHistory,
          message,
          selectedModel
        );
        const completionTokens = Math.ceil(fallbackResponse.length / 4);

        // Save fallback to DB first, then respond
        try {
          await executeTenantQuery(req.tenant.id, async (client) => {
            await client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [
                req.tenant.id,
                currentConvId,
                'user',
                message,
                promptTokenEstimate,
              ]
            );
            await client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [
                req.tenant.id,
                currentConvId,
                'assistant',
                fallbackResponse,
                completionTokens,
              ]
            );
            await client.query(
              'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
              [currentConvId]
            );
          });
        } catch (dbErr) {
          console.error('Failed to save fallback messages to DB:', dbErr);
        }
        res.write(fallbackResponse);
        res.end();
      }
    } catch (err) {
      console.error('Chat endpoint error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process chat conversation' });
      }
    }
  }
);

// 6. POST /api/auth/login
app.post('/api/auth/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    // Rate limit check (using the unified key: ratelimit:login:${ip})
    const ip =
      (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const key = `ratelimit:login:${ip}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 3600); // 1 hour TTL
    }
    if (attempts > 5) {
      return res.status(429).json({
        error:
          'Too many login attempts. Rate limit exceeded. Try again in an hour.',
      });
    }

    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [email, req.tenant.id]
    );
    const user = userResult.rows[0];
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    // Use standard bcrypt comparison
    let valid = false;
    if (user.password_hash) {
      valid = await bcrypt.compare(password, user.password_hash);
    }
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await pool.query(
      `INSERT INTO refresh_tokens (token, user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [refreshTokenHash, user.id, req.tenant.id, expiresAt]
    );

    const host = req.headers.host || '';
    const domainSuffix = host.includes('neuravolt.cloud')
      ? '; Domain=.neuravolt.cloud'
      : '';
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';

    res.setHeader('Set-Cookie', [
      `hk_access_token=${accessToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${15 * 60}${domainSuffix}`,
      `hk_refresh_token=${refreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}${domainSuffix}`,
    ]);

    // ── Record real login activity + device session ──────────────────────────
    try {
      const ua = req.headers['user-agent'] || 'Unknown Browser';
      const rawIp =
        (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
          .split(',')[0]
          .trim() || '127.0.0.1';
      const ip = rawIp.replace(/^::ffff:/, '');

      await executeTenantQuery(req.tenant.id, async (client) => {
        // Write to new activity_logs table
        await client.query(
          `INSERT INTO activity_logs (user_id, tenant_id, action, metadata, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            user.id,
            req.tenant.id,
            'Logged in successfully',
            JSON.stringify({ level: 'info', color: '#059669' }),
            ip,
            ua,
          ]
        );

        // Upsert user session in new user_sessions table
        const browserMatch = ua.match(
          /(Chrome|Firefox|Safari|Edge|Opera|Brave)[/\s]([\d.]+)/i
        );
        const osMatch = ua.match(
          /(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s/]?([\d._]+)?/i
        );
        let osName = 'Unknown OS';
        if (osMatch) {
          if (osMatch[1] === 'Windows NT') osName = 'Windows';
          else if (osMatch[1] === 'iPhone OS') osName = 'iOS';
          else osName = osMatch[1].replace('_', ' ');
        }
        const browserName = browserMatch ? browserMatch[1] : 'Unknown Browser';
        const deviceName = osMatch
          ? (osMatch[1] === 'Mac OS X' ? 'Mac' : osName) + ' Device'
          : 'Unknown Device';

        const existingSession = await client.query(
          `SELECT id FROM user_sessions 
           WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 AND revoked_at IS NULL AND expires_at > NOW()
           LIMIT 1`,
          [user.id, ip, ua]
        );

        if (existingSession.rows.length > 0) {
          await client.query(
            `UPDATE user_sessions SET last_active_at = NOW() WHERE id = $1`,
            [existingSession.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO user_sessions (user_id, tenant_id, device_name, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')`,
            [user.id, req.tenant.id, deviceName, ip, ua]
          );
        }
      });
    } catch (trackErr) {
      console.warn('Failed to record login activity:', trackErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantSlug: req.tenant.slug,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 6b. POST /api/auth/register
app.post('/api/auth/register', validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Rate limit check (using the unified key: ratelimit:register:${ip})
    const ip =
      (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const key = `ratelimit:register:${ip}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 3600); // 1 hour TTL
    }
    if (attempts > 5) {
      return res.status(429).json({
        error:
          'Too many registration attempts. Rate limit exceeded. Try again in an hour.',
      });
    }

    const valErrors = validatePassword(password, email, name);
    if (valErrors.length > 0) {
      return res
        .status(400)
        .json({ error: 'Password validation failed', details: valErrors });
    }

    const compromised = await isPasswordPwned(password);
    if (compromised) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: [
          'This password has been compromised in data breaches. Please choose a different one.',
        ],
      });
    }
    // Check if email already exists in this tenant
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, req.tenant.id]
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role)
         VALUES ($1, $2, $3, 'user') RETURNING id, email, role`,
        [req.tenant.id, email, passwordHash]
      );
      return result.rows[0];
    });

    // Send welcome email in background (non-blocking)
    sendWelcomeEmail(email, name).catch((err) =>
      console.error('[WELCOME EMAIL SEND ERROR]:', err.message)
    );

    const accessToken = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      jwtSecret,
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await pool.query(
      `INSERT INTO refresh_tokens (token, user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [refreshTokenHash, newUser.id, req.tenant.id, expiresAt]
    );

    const host = req.headers.host || '';
    const domainSuffix = host.includes('neuravolt.cloud')
      ? '; Domain=.neuravolt.cloud'
      : '';
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';

    res.setHeader('Set-Cookie', [
      `hk_access_token=${accessToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${15 * 60}${domainSuffix}`,
      `hk_refresh_token=${refreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}${domainSuffix}`,
    ]);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: name || email.split('@')[0],
        tenantSlug: req.tenant.slug,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 6c. POST /api/auth/forgot-password
app.post(
  '/api/auth/forgot-password',
  validate(forgotPasswordSchema),
  async (req, res) => {
    const { email } = req.body;
    try {
      // Rate limit: 3 requests per email per day
      const rateLimitKey = `ratelimit:forgotpwd:${req.tenant.id}:${email.toLowerCase()}`;
      const attempts = await redis.incr(rateLimitKey);
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 86400); // 24 hours (1 day)
      }
      if (attempts > 3) {
        return res.status(429).json({
          error:
            'Too many password reset requests. Rate limit exceeded. Try again tomorrow.',
        });
      }

      // Check if user exists in this tenant (using executeTenantQuery to respect RLS)
      const user = await executeTenantQuery(req.tenant.id, async (client) => {
        const result = await client.query(
          'SELECT id, email, name FROM users WHERE email = $1',
          [email]
        );
        return result.rows[0];
      });

      if (!user) {
        // Return 200/success anyway to prevent username enumeration, but log it
        console.log(
          `[FORGOT PASSWORD] Requested email "${email}" does not exist in tenant "${req.tenant.slug}"`
        );
        return res.status(200).json({
          message:
            'If this email exists in our records, a reset link will be sent.',
        });
      }

      const token = crypto.randomBytes(20).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await executeTenantQuery(req.tenant.id, async (client) => {
        await client.query(
          `INSERT INTO password_reset_tokens (tenant_id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
          [req.tenant.id, user.id, tokenHash, expiresAt]
        );
      });

      const resetLink = `http://${req.tenant.slug}.neuravolt.cloud/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      // Simulate sending email
      const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Password Reset Request</h2>
        <p>Hello ${user.name || 'User'},</p>
        <p>We received a request to reset your password for your Harikson AI account under tenant **${req.tenant.name}**.</p>
        <p>Please click the button below to reset your password (link is valid for 1 hour):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #3b82f6; word-break: break-all;">${resetLink}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;

      // Log the simulated email details to console
      console.log(`
============================================================
📧 SIMULATED RESET EMAIL SENT TO: ${email}
============================================================
${emailHtml}
============================================================
    `);

      // Write to a local log file for proof/automated audit
      try {
        const emailLog = {
          to: email,
          sentAt: new Date().toISOString(),
          tenantSlug: req.tenant.slug,
          resetLink,
          body: emailHtml,
        };
        // Append to local log file
        const fs = await import('fs/promises');
        await fs.appendFile(
          '/Users/ashishpratapsinghtomar/Downloads/files/tenant-api/sent_emails.log',
          JSON.stringify(emailLog) + '\n'
        );
      } catch (logErr) {
        console.warn(
          '[EMAIL LOG] Failed to log email locally:',
          logErr.message
        );
      }

      // Send password reset email in background (non-blocking)
      sendPasswordReset(email, resetLink).catch((err) =>
        console.error('[PASSWORD RESET EMAIL SEND ERROR]:', err.message)
      );

      res.status(200).json({
        message:
          'If this email exists in our records, a reset link will be sent.',
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res
        .status(500)
        .json({ error: 'Failed to process password reset request' });
    }
  }
);

// 6d. POST /api/auth/reset-password
app.post(
  '/api/auth/reset-password',
  validate(resetPasswordSchema),
  async (req, res) => {
    try {
      // Rate limit check (using the unified key: ratelimit:password-reset:${ip})
      const ip =
        (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
          .split(',')[0]
          .trim() || '127.0.0.1';
      const key = `ratelimit:password-reset:${ip}`;
      const attempts = await redis.incr(key);
      if (attempts === 1) {
        await redis.expire(key, 3600); // 1 hour TTL
      }
      if (attempts > 5) {
        return res.status(429).json({
          error:
            'Too many password reset attempts. Rate limit exceeded. Try again in an hour.',
        });
      }

      const { token, email, newPassword } = req.body;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find and validate token (using executeTenantQuery to respect RLS)
      const tokenRecord = await executeTenantQuery(
        req.tenant.id,
        async (client) => {
          const result = await client.query(
            `SELECT prt.*, u.id AS user_id, u.email, u.name
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token_hash = $1 AND u.email = $2 AND prt.used_at IS NULL AND prt.expires_at > NOW()
         LIMIT 1`,
            [tokenHash, email]
          );
          return result.rows[0];
        }
      );

      if (!tokenRecord) {
        return res
          .status(400)
          .json({ error: 'Invalid or expired password reset token' });
      }

      // Run password validation rules
      const valErrors = validatePassword(
        newPassword,
        tokenRecord.email,
        tokenRecord.name
      );
      if (valErrors.length > 0) {
        return res
          .status(400)
          .json({ error: 'Password validation failed', details: valErrors });
      }

      const compromised = await isPasswordPwned(newPassword);
      if (compromised) {
        return res.status(400).json({
          error: 'Password validation failed',
          details: [
            'This password has been compromised in data breaches. Please choose a different one.',
          ],
        });
      }

      // Update password, mark token as used, revoke all user refresh tokens and clear active devices
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await executeTenantQuery(req.tenant.id, async (client) => {
        // 1. Update user password hash and clear connected devices (sessions invalidation!)
        await client.query(
          `UPDATE users SET password_hash = $1, connected_devices = '[]'::jsonb WHERE id = $2`,
          [passwordHash, tokenRecord.user_id]
        );

        // 2. Mark reset token as used
        await client.query(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
          [tokenRecord.id]
        );

        // 3. Revoke all refresh tokens
        await client.query(
          `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1`,
          [tokenRecord.user_id]
        );
      });

      res.status(200).json({
        message:
          'Password has been reset successfully. All other active sessions have been logged out.',
      });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// 6e. POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.hk_refresh_token;

    if (refreshToken) {
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
        [refreshTokenHash]
      );
    }

    const ua = req.headers['user-agent'] || 'Unknown Browser';
    const rawIp =
      (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const ip = rawIp.replace(/^::ffff:/, '');

    // Revoke matching active user session
    let token = cookies.hk_access_token;
    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        await pool.query(
          `UPDATE user_sessions SET revoked_at = NOW() 
           WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 AND revoked_at IS NULL`,
          [decoded.userId, ip, ua]
        );
      } catch (err) {
        console.warn(
          'Warning during session revocation on logout:',
          err.message
        );
      }
    }

    const host = req.headers.host || '';
    const domainSuffix = host.includes('neuravolt.cloud')
      ? '; Domain=.neuravolt.cloud'
      : '';

    res.setHeader('Set-Cookie', [
      `hk_access_token=; HttpOnly; Path=/; Max-Age=0${domainSuffix}`,
      `hk_refresh_token=; HttpOnly; Path=/; Max-Age=0${domainSuffix}`,
    ]);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 6d. POST /api/auth/refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.hk_refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const rtQuery = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
      [refreshTokenHash]
    );

    if (rtQuery.rows.length === 0) {
      return res
        .status(401)
        .json({ error: 'Invalid or expired refresh token' });
    }

    const rtRecord = rtQuery.rows[0];

    // Revoke old token
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [rtRecord.id]
    );

    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [
      rtRecord.user_id,
    ]);

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];

    // Issue new pair
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '15m' }
    );
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await pool.query(
      `INSERT INTO refresh_tokens (token, user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [newRefreshTokenHash, user.id, rtRecord.tenant_id, expiresAt]
    );

    const host = req.headers.host || '';
    const domainSuffix = host.includes('neuravolt.cloud')
      ? '; Domain=.neuravolt.cloud'
      : '';
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';

    res.setHeader('Set-Cookie', [
      `hk_access_token=${newAccessToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${15 * 60}${domainSuffix}`,
      `hk_refresh_token=${newRefreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}${domainSuffix}`,
    ]);

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// 7. GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    tenantSlug: req.tenant.slug,
  });
});

// 8. GET /api/conversations
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const result = await client.query(
          `SELECT id, title, model, created_at, updated_at
         FROM conversations
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 100`,
          [req.user.id]
        );
        return result.rows;
      },
      true
    );
    res.json({ conversations });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 9. DELETE /api/conversations/:id
app.delete('/api/conversations/:id', authMiddleware, async (req, res) => {
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query('DELETE FROM messages WHERE conversation_id = $1', [
        req.params.id,
      ]);
      await client.query(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// 10. PATCH /api/conversations/:id
app.patch('/api/conversations/:id', authMiddleware, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [title, req.params.id, req.user.id]
      );
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Rename conversation error:', err);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

// 11. GET /api/conversations/:id/messages
app.get('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const result = await client.query(
          `SELECT id, role, content, tokens_used, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
          [req.params.id]
        );
        return result.rows;
      },
      true
    );
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// --- USER SETTINGS REST API ENDPOINTS ---

// GET /api/user/profile - Get current user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT name, username, email, phone, company, job_title as "jobTitle", department, country, bio
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      return result.rows[0];
    });
    res.json(user || {});
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile - Update current user profile
app.put(
  '/api/user/profile',
  authMiddleware,
  validate(profileUpdateSchema),
  async (req, res) => {
    try {
      const {
        name,
        username,
        phone,
        company,
        jobTitle,
        department,
        country,
        bio,
      } = req.body;
      const user = await executeTenantQuery(req.tenant.id, async (client) => {
        const result = await client.query(
          `UPDATE users
         SET name = $1, username = $2, phone = $3, company = $4, job_title = $5, department = $6, country = $7, bio = $8
         WHERE id = $9
         RETURNING name, username, email, phone, company, job_title as "jobTitle", department, country, bio`,
          [
            name,
            username,
            phone,
            company,
            jobTitle,
            department,
            country,
            bio,
            req.user.id,
          ]
        );
        return result.rows[0];
      });
      res.json(user || {});
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// GET /api/user/settings - Get settings
app.get('/api/user/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT settings FROM users WHERE id = $1`,
        [req.user.id]
      );
      return result.rows[0]?.settings || {};
    });
    res.json(settings);
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/user/settings - Update settings
app.put(
  '/api/user/settings',
  authMiddleware,
  validate(settingsUpdateSchema),
  async (req, res) => {
    try {
      const settings = req.body;
      const updated = await executeTenantQuery(
        req.tenant.id,
        async (client) => {
          const result = await client.query(
            `UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings`,
            [JSON.stringify(settings), req.user.id]
          );
          return result.rows[0]?.settings || {};
        }
      );
      res.json(updated);
    } catch (err) {
      console.error('Update settings error:', err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// GET /api/user/billing - Get billing plan & invoice history (real tenant plan data)
app.get('/api/user/billing', authMiddleware, async (req, res) => {
  try {
    // Try user-specific billing_info override first (set when admin assigns plan)
    const billingOverride = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const result = await client.query(
          `SELECT billing_info FROM users WHERE id = $1`,
          [req.user.id]
        );
        return result.rows[0]?.billing_info;
      }
    );

    if (billingOverride && Object.keys(billingOverride).length > 0) {
      return res.json(billingOverride);
    }

    // Query active/latest subscription for this tenant
    const subRes = await pool.query(
      `
      SELECT * FROM subscriptions 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `,
      [req.tenant.id]
    );

    let subscriptionStatus =
      req.tenant.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE';
    let paymentMethod = null;
    let priceNum = parseFloat(req.tenant.price) || 0;

    if (subRes.rows.length > 0) {
      const sub = subRes.rows[0];
      subscriptionStatus = sub.status.toUpperCase();
      priceNum = parseFloat(sub.amount) || priceNum;

      // Parse payment method from subscription metadata if available
      if (sub.metadata && typeof sub.metadata === 'object') {
        paymentMethod = sub.metadata.payment_method || null;
      }

      // Fallback dummy payment method if none in metadata but is a paid plan
      if (!paymentMethod && priceNum > 0) {
        paymentMethod = {
          type: 'Visa',
          last4: '4242',
          expiry: '12/28',
        };
      }
    }

    // Query invoices for this tenant
    const invRes = await pool.query(
      `
      SELECT id, amount, currency, status, created_at, paid_at, invoice_url, pdf_url
      FROM invoices
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `,
      [req.tenant.id]
    );

    const invoices = invRes.rows.map((inv) => {
      const invAmount = parseFloat(inv.amount) || 0;
      const currencySymbol = inv.currency === 'INR' ? '₹' : '$';
      const invAmountFormatted = `${currencySymbol}${invAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return {
        id: inv.id,
        date: new Date(inv.created_at).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        amount: invAmountFormatted,
        status: inv.status.toUpperCase(),
        invoiceUrl: inv.invoice_url,
        pdfUrl: inv.pdf_url,
      };
    });

    const planName = req.tenant.plan || 'starter';
    const planDisplayName =
      planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
    const billingCycle = req.tenant.billing || 'monthly';

    // Format price as ₹X,XXX.XX or $X.XX
    const currencySymbol = req.tenant.currency === 'INR' ? '₹' : '$';
    const priceFormatted = `${currencySymbol}${priceNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    res.json({
      tenantId: req.tenant.id,
      tenantName: req.tenant.name,
      planId: req.tenant.plan,
      planName: req.tenant.plan_name
        ? `${req.tenant.plan_name} Plan`
        : planDisplayName,
      price: priceFormatted,
      priceRaw: priceNum,
      currency: req.tenant.currency || 'INR',
      billingCycle,
      status: subscriptionStatus,
      features: req.tenant.features || {},
      modelAccess: req.tenant.model_access || [],
      description: req.tenant.plan_description || '',
      paymentMethod,
      invoices,
    });
  } catch (err) {
    console.error('Fetch billing error:', err);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// GET /api/user/devices
app.get('/api/user/devices', authMiddleware, async (req, res) => {
  try {
    const ua = req.headers['user-agent'] || 'Unknown Browser';
    const rawIp =
      (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const ip = rawIp.replace(/^::ffff:/, '');

    const browserMatch = ua.match(
      /(Chrome|Firefox|Safari|Edge|Opera|Brave)[/\s]([\d.]+)/i
    );
    const osMatch = ua.match(
      /(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s/]?([\d._]+)?/i
    );
    let osName = 'Unknown OS';
    if (osMatch) {
      if (osMatch[1] === 'Windows NT') osName = 'Windows';
      else if (osMatch[1] === 'iPhone OS') osName = 'iOS';
      else osName = osMatch[1].replace('_', ' ');
    }
    const browserName = browserMatch ? browserMatch[1] : 'Unknown Browser';
    const deviceName = osMatch
      ? (osMatch[1] === 'Mac OS X' ? 'Mac' : osName) + ' Device'
      : 'Unknown Device';

    const sessions = await executeTenantQuery(req.tenant.id, async (client) => {
      // First, upsert active session for current user/IP/UA if it doesn't exist
      const existing = await client.query(
        `SELECT id FROM user_sessions 
         WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 AND revoked_at IS NULL AND expires_at > NOW()
         LIMIT 1`,
        [req.user.id, ip, ua]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO user_sessions (user_id, tenant_id, device_name, ip_address, user_agent, expires_at)
           VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')`,
          [req.user.id, req.tenant.id, deviceName, ip, ua]
        );
      } else {
        await client.query(
          `UPDATE user_sessions SET last_active_at = NOW() WHERE id = $1`,
          [existing.rows[0].id]
        );
      }

      // Fetch all active sessions
      const result = await client.query(
        `SELECT id, device_name, ip_address, user_agent, created_at, expires_at, last_active_at
         FROM user_sessions
         WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         ORDER BY last_active_at DESC
         LIMIT 10`,
        [req.user.id]
      );
      return result.rows;
    });

    const mapped = sessions.map((s) => {
      const sUa = s.user_agent || '';
      const browserMatch = sUa.match(
        /(Chrome|Firefox|Safari|Edge|Opera|Brave)[/\s]([\d.]+)/i
      );
      const osMatch = sUa.match(
        /(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s/]?([\d._]+)?/i
      );
      let osName = 'Unknown OS';
      if (osMatch) {
        if (osMatch[1] === 'Windows NT') osName = 'Windows';
        else if (osMatch[1] === 'iPhone OS') osName = 'iOS';
        else osName = osMatch[1].replace('_', ' ');
      }
      const browserName = browserMatch ? browserMatch[1] : 'Unknown Browser';
      const isCurrent = s.ip_address === ip && s.user_agent === ua;
      return {
        id: s.id,
        name: s.device_name,
        ip: s.ip_address,
        browser: browserName,
        os: osName,
        lastActive: s.last_active_at
          ? new Date(s.last_active_at).toISOString()
          : new Date().toISOString(),
        current: isCurrent,
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error('Fetch devices error:', err);
    res.status(500).json({ error: 'Failed to fetch connected devices' });
  }
});

// DELETE /api/user/devices/:id - Logout session
app.delete('/api/user/devices/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const ua = req.headers['user-agent'] || 'Unknown Browser';
    const rawIp =
      (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const ip = rawIp.replace(/^::ffff:/, '');

    const currentSession = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const res = await client.query(
          `SELECT id FROM user_sessions WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
          [req.user.id, ip, ua]
        );
        return res.rows[0];
      }
    );

    if (currentSession && id === currentSession.id) {
      return res
        .status(400)
        .json({ error: 'Cannot terminate your current active session' });
    }

    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      // Revoke the requested session
      await client.query(
        `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );

      // Fetch remaining active sessions
      const result = await client.query(
        `SELECT id, device_name, ip_address, user_agent, last_active_at
         FROM user_sessions
         WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         ORDER BY last_active_at DESC
         LIMIT 10`,
        [req.user.id]
      );
      return result.rows;
    });

    const mapped = updated.map((s) => {
      const sUa = s.user_agent || '';
      const browserMatch = sUa.match(
        /(Chrome|Firefox|Safari|Edge|Opera|Brave)[/\s]([\d.]+)/i
      );
      const osMatch = sUa.match(
        /(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s/]?([\d._]+)?/i
      );
      let osName = 'Unknown OS';
      if (osMatch) {
        if (osMatch[1] === 'Windows NT') osName = 'Windows';
        else if (osMatch[1] === 'iPhone OS') osName = 'iOS';
        else osName = osMatch[1].replace('_', ' ');
      }
      const browserName = browserMatch ? browserMatch[1] : 'Unknown Browser';
      const isCurrent = s.ip_address === ip && s.user_agent === ua;
      return {
        id: s.id,
        name: s.device_name,
        ip: s.ip_address,
        browser: browserName,
        os: osName,
        lastActive: s.last_active_at
          ? new Date(s.last_active_at).toISOString()
          : new Date().toISOString(),
        current: isCurrent,
      };
    });
    res.json({ success: true, devices: mapped });
  } catch (err) {
    console.error('Delete device error:', err);
    res.status(500).json({ error: 'Failed to terminate device session' });
  }
});

// DELETE /api/user/account/gdpr - GDPR immediate hard delete of user account
app.delete('/api/user/account/gdpr', authMiddleware, async (req, res) => {
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      // Permanently delete user row (which cascades and deletes all related sessions, messages, etc.)
      await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    });

    // Invalidate active session cookies
    const host = req.headers.host || '';
    const domainSuffix = host.includes('neuravolt.cloud')
      ? '; Domain=.neuravolt.cloud'
      : '';
    res.setHeader('Set-Cookie', [
      `hk_access_token=; HttpOnly; Path=/; Max-Age=0${domainSuffix}`,
      `hk_refresh_token=; HttpOnly; Path=/; Max-Age=0${domainSuffix}`,
    ]);

    res.status(200).json({
      success: true,
      message:
        'Your account and all associated data have been permanently deleted.',
    });
  } catch (err) {
    console.error('GDPR hard delete error:', err);
    res.status(500).json({ error: 'Failed to process hard delete request' });
  }
});

// GET /api/user/activity - Get user audit logs (real events only)
app.get('/api/user/activity', authMiddleware, async (req, res) => {
  try {
    const logs = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, action, metadata, ip_address AS ip, user_agent AS device, created_at AS date
         FROM activity_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.user.id]
      );
      // Format to match old UI structure:
      return result.rows.map((row) => ({
        id: row.id,
        action: row.action,
        ip: row.ip,
        device: row.device,
        date: row.date
          ? new Date(row.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }) +
            ' at ' +
            new Date(row.date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        color: row.metadata?.color,
        level: row.metadata?.level,
      }));
    });
    // Return actual logs — empty array for users with no recorded activity
    res.json(logs);
  } catch (err) {
    console.error('Fetch activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET /api/user/workspace - Get workspace details & members
app.get('/api/user/workspace', authMiddleware, async (req, res) => {
  try {
    const workspace = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const uRes = await client.query(
          `SELECT company FROM users WHERE id = $1`,
          [req.user.id]
        );
        const company = uRes.rows[0]?.company || 'Harikson AI (Production)';

        const mRes = await client.query(
          `SELECT id, email, role, name FROM users WHERE tenant_id = $1 ORDER BY role DESC`,
          [req.tenant.id]
        );

        return {
          instanceId: `ins_prd_${req.tenant.id.slice(0, 5)}`,
          name: company,
          slug: req.tenant.slug,
          members: mRes.rows.map((m) => ({
            id: m.id,
            name: m.name || m.email.split('@')[0],
            email: m.email,
            role:
              m.role === 'admin' || m.role === 'superadmin'
                ? 'Admin'
                : m.role === 'owner'
                  ? 'Owner'
                  : 'Member',
            avatar: (m.name || m.email).slice(0, 2).toUpperCase(),
          })),
        };
      }
    );
    res.json(workspace);
  } catch (err) {
    console.error('Fetch workspace error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace settings' });
  }
});

// PUT /api/user/workspace/members/:memberId/role - Update workspace member role
app.put(
  '/api/user/workspace/members/:memberId/role',
  authMiddleware,
  async (req, res) => {
    try {
      const { memberId } = req.params;
      const { role } = req.body; // e.g., 'Owner', 'Admin', 'Member'

      // Map UI role to database role string
      let dbRole = 'user';
      if (role === 'Admin') dbRole = 'admin';
      if (role === 'Owner') dbRole = 'owner';
      if (role === 'Member') dbRole = 'user';

      // Verify current user is an admin or owner of the workspace to perform updates
      if (
        req.user.role !== 'admin' &&
        req.user.role !== 'owner' &&
        req.user.role !== 'superadmin'
      ) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Insufficient permissions' });
      }

      const updated = await executeTenantQuery(
        req.tenant.id,
        async (client) => {
          const result = await client.query(
            `UPDATE users
         SET role = $1
         WHERE id = $2 AND tenant_id = $3
         RETURNING id, email, role`,
            [dbRole, memberId, req.tenant.id]
          );

          const updatedUser = result.rows[0];
          if (updatedUser) {
            // Record to activity timeline in settings of the editor
            const eventId = crypto.randomUUID();
            await client.query(
              `UPDATE users
           SET settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             '{activity_log}',
             COALESCE(settings->'activity_log', '[]'::jsonb) || $1::jsonb
           )
           WHERE id = $2`,
              [
                JSON.stringify({
                  id: eventId,
                  event: 'Security',
                  details: `Changed role of ${updatedUser.email} to ${role}`,
                  timestamp: new Date().toISOString(),
                }),
                req.user.id,
              ]
            );
          }
          return updatedUser;
        }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Workspace member not found' });
      }

      res.json({
        id: updated.id,
        email: updated.email,
        role: role,
      });
    } catch (err) {
      console.error('Update member role error:', err);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }
);

// POST /api/user/workspace/members - Invite/Add a new member to the workspace
app.post('/api/user/workspace/members', authMiddleware, async (req, res) => {
  try {
    const { email, name, role, password } = req.body;

    if (!email || !name || !role) {
      return res
        .status(400)
        .json({ error: 'Email, name, and role are required' });
    }

    // Verify current user is an admin or owner to perform additions
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'owner' &&
      req.user.role !== 'superadmin'
    ) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Insufficient permissions to add members' });
    }

    // Map UI role to database role string
    let dbRole = 'user';
    if (role === 'Admin') dbRole = 'admin';
    if (role === 'Owner') dbRole = 'owner';
    if (role === 'Member') dbRole = 'user';

    const defaultPwd = password || 'Welcome123!';
    const passwordHash = await bcrypt.hash(defaultPwd, 10);

    const newMember = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        // Check if email already exists in this tenant
        const checkResult = await client.query(
          'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
          [email, req.tenant.id]
        );
        if (checkResult.rows.length > 0) {
          throw new Error('User already exists in this workspace');
        }

        const result = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, role, name, username)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, role, name`,
          [
            req.tenant.id,
            email,
            passwordHash,
            dbRole,
            name,
            email.split('@')[0],
          ]
        );

        const createdUser = result.rows[0];
        if (createdUser) {
          // Record to activity timeline in settings of the editor
          const eventId = crypto.randomUUID();
          await client.query(
            `UPDATE users
           SET settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             '{activity_log}',
             COALESCE(settings->'activity_log', '[]'::jsonb) || $1::jsonb
           )
           WHERE id = $2`,
            [
              JSON.stringify({
                id: eventId,
                event: 'Security',
                details: `Added new member ${email} as ${role}`,
                timestamp: new Date().toISOString(),
              }),
              req.user.id,
            ]
          );
        }
        return createdUser;
      }
    );

    res.status(201).json({
      id: newMember.id,
      name: newMember.name,
      email: newMember.email,
      role: role,
      avatar: newMember.name.slice(0, 2).toUpperCase(),
    });
  } catch (err) {
    console.error('Add workspace member error:', err);
    res
      .status(400)
      .json({ error: err.message || 'Failed to add workspace member' });
  }
});

// DELETE /api/user/workspace/members/:memberId - Remove a member from the workspace
app.delete(
  '/api/user/workspace/members/:memberId',
  authMiddleware,
  async (req, res) => {
    try {
      const { memberId } = req.params;

      // Verify current user is an admin or owner of the workspace to perform deletions
      if (
        req.user.role !== 'admin' &&
        req.user.role !== 'owner' &&
        req.user.role !== 'superadmin'
      ) {
        return res.status(403).json({
          error: 'Forbidden: Insufficient permissions to remove members',
        });
      }

      // A user cannot delete themselves
      if (req.user.id === memberId) {
        return res.status(400).json({
          error: 'Bad Request: You cannot remove yourself from the workspace',
        });
      }

      const deleted = await executeTenantQuery(
        req.tenant.id,
        async (client) => {
          // Fetch details first for logging
          const mRes = await client.query(
            'SELECT email FROM users WHERE id = $1 AND tenant_id = $2',
            [memberId, req.tenant.id]
          );
          if (mRes.rows.length === 0) return null;
          const targetEmail = mRes.rows[0].email;

          // Delete user
          await client.query(
            'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
            [memberId, req.tenant.id]
          );

          // Record to activity timeline in settings of the editor
          const eventId = crypto.randomUUID();
          await client.query(
            `UPDATE users
         SET settings = jsonb_set(
           COALESCE(settings, '{}'::jsonb),
           '{activity_log}',
           COALESCE(settings->'activity_log', '[]'::jsonb) || $1::jsonb
         )
         WHERE id = $2`,
            [
              JSON.stringify({
                id: eventId,
                event: 'Security',
                details: `Removed member ${targetEmail} from workspace`,
                timestamp: new Date().toISOString(),
              }),
              req.user.id,
            ]
          );
          return targetEmail;
        }
      );

      if (!deleted) {
        return res.status(404).json({ error: 'Workspace member not found' });
      }

      res.json({
        message: 'Workspace member removed successfully',
        email: deleted,
      });
    } catch (err) {
      console.error('Delete workspace member error:', err);
      res.status(500).json({ error: 'Failed to remove workspace member' });
    }
  }
);

// GET /api/keys & /api/user/developer/keys - List API Keys
async function listApiKeys(req, res) {
  try {
    const keys = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const result = await client.query(
          `SELECT id, name, key_prefix as key, created_at as created, last_used_at as lastUsed, expires_at, revoked_at
         FROM api_keys
         WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
          [req.user.id]
        );
        return result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          key: r.key + '...',
          created: r.created
            ? new Date(r.created).toISOString().split('T')[0]
            : '',
          lastUsed: r.lastUsed
            ? new Date(r.lastUsed).toLocaleString()
            : 'Never',
          expires_at: r.expires_at,
          revoked_at: r.revoked_at,
        }));
      },
      true
    );
    res.json(keys);
  } catch (err) {
    console.error('List API keys error:', err);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
}

app.get('/api/keys', authMiddleware, listApiKeys);
app.get('/api/user/developer/keys', authMiddleware, listApiKeys);

// POST /api/keys & /api/user/developer/keys - Create API Key
async function createApiKey(req, res) {
  try {
    const { name, scopes, expires_at } = req.body;
    if (!name) return res.status(400).json({ error: 'Key name is required' });

    // Generate secure API key format: hk_live_<32 random hex chars>
    const rawKey = 'hk_live_' + crypto.randomBytes(16).toString('hex');
    const keyPrefix = rawKey.substring(0, 12); // hk_live_abcd (12 chars)
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyScopes = Array.isArray(scopes)
      ? JSON.stringify(scopes)
      : JSON.stringify(['read', 'write']);

    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `INSERT INTO api_keys (user_id, tenant_id, name, key_hash, key_prefix, scopes, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          req.tenant.id,
          name,
          keyHash,
          keyPrefix,
          keyScopes,
          expires_at || null,
        ]
      );
    });

    // Fetch updated active keys to match UI expectations
    const keys = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, name, key_prefix as key, created_at as created, last_used_at as lastUsed, expires_at
         FROM api_keys
         WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      return result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        key: r.key + '...',
        created: r.created
          ? new Date(r.created).toISOString().split('T')[0]
          : '',
        lastUsed: r.lastUsed ? new Date(r.lastUsed).toLocaleString() : 'Never',
        expires_at: r.expires_at,
      }));
    });

    res.json({
      success: true,
      key: rawKey, // Show raw full key ONCE on creation response
      keys: keys,
    });
  } catch (err) {
    console.error('Create API key error:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
}

app.post('/api/keys', authMiddleware, createApiKey);
app.post('/api/user/developer/keys', authMiddleware, createApiKey);

// DELETE /api/keys/:id & /api/user/developer/keys/:id - Revoke API Key
async function revokeApiKey(req, res) {
  try {
    const { id } = req.params;
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
    });

    // Fetch updated list of active keys
    const keys = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, name, key_prefix as key, created_at as created, last_used_at as lastUsed, expires_at
         FROM api_keys
         WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      return result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        key: r.key + '...',
        created: r.created
          ? new Date(r.created).toISOString().split('T')[0]
          : '',
        lastUsed: r.lastUsed ? new Date(r.lastUsed).toLocaleString() : 'Never',
        expires_at: r.expires_at,
      }));
    });

    res.json({ success: true, keys });
  } catch (err) {
    console.error('Revoke API key error:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
}

app.delete('/api/keys/:id', authMiddleware, revokeApiKey);
app.delete('/api/user/developer/keys/:id', authMiddleware, revokeApiKey);

// ─── USAGE ANALYTICS ────────────────────────────────────────────────────────

// GET /api/user/usage - Real per-user token + query usage from messages table
app.get('/api/user/usage', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const usage = await executeTenantQuery(req.tenant.id, async (client) => {
      // Daily token + query counts for the past N days
      const dailyResult = await client.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('day', m.created_at), 'Dy') AS day,
           COALESCE(SUM(m.tokens_used), 0)::int AS tokens,
           COUNT(m.id)::int AS queries
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
           AND m.created_at >= NOW() - ($2 || ' days')::interval
           AND m.role = 'assistant'
         GROUP BY DATE_TRUNC('day', m.created_at)
         ORDER BY DATE_TRUNC('day', m.created_at) ASC`,
        [req.user.id, days]
      );

      // Totals for the period
      const totalsResult = await client.query(
        `SELECT
           COALESCE(SUM(m.tokens_used), 0)::int AS total_tokens,
           COUNT(m.id)::int AS total_queries
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
           AND m.created_at >= NOW() - ($2 || ' days')::interval
           AND m.role = 'assistant'`,
        [req.user.id, days]
      );

      // Previous period totals for % change calculation
      const prevTotalsResult = await client.query(
        `SELECT
           COALESCE(SUM(m.tokens_used), 0)::int AS total_tokens,
           COUNT(m.id)::int AS total_queries
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
           AND m.created_at >= NOW() - ($2 || ' days')::interval * 2
           AND m.created_at < NOW() - ($2 || ' days')::interval
           AND m.role = 'assistant'`,
        [req.user.id, days]
      );

      return {
        daily: dailyResult.rows,
        totals: totalsResult.rows[0],
        prev: prevTotalsResult.rows[0],
      };
    });

    const { daily, totals, prev } = usage;
    const tokenChange =
      prev.total_tokens > 0
        ? Math.round(
            ((totals.total_tokens - prev.total_tokens) / prev.total_tokens) *
              100
          )
        : null;
    const queryChange =
      prev.total_queries > 0
        ? Math.round(
            ((totals.total_queries - prev.total_queries) / prev.total_queries) *
              100
          )
        : null;

    res.json({
      daily,
      totalTokens: totals.total_tokens,
      totalQueries: totals.total_queries,
      tokenChange,
      queryChange,
      days,
    });
  } catch (err) {
    console.error('Fetch usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

// ─── SECURITY ────────────────────────────────────────────────────────────────

// POST /api/user/security/change-password
app.post(
  '/api/user/security/change-password',
  authMiddleware,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Both current and new password are required' });
    }
    try {
      const ip =
        (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
          .split(',')[0]
          .trim() || '127.0.0.1';
      const key = `ratelimit:password:${ip}`;
      const attempts = await redis.incr(key);
      if (attempts === 1) {
        await redis.expire(key, 3600); // 1 hour TTL
      }
      if (attempts > 5) {
        return res.status(429).json({
          error:
            'Too many password attempts. Rate limit exceeded. Try again in an hour.',
        });
      }

      const user = req.user;
      const valErrors = validatePassword(newPassword, user.email, user.name);
      if (valErrors.length > 0) {
        return res
          .status(400)
          .json({ error: 'Password validation failed', details: valErrors });
      }

      const compromised = await isPasswordPwned(newPassword);
      if (compromised) {
        return res.status(400).json({
          error: 'Password validation failed',
          details: [
            'This password has been compromised in data breaches. Please choose a different one.',
          ],
        });
      }

      // Verify current password
      if (!user.password_hash || !user.password_hash.startsWith('$')) {
        return res.status(400).json({
          error: 'Password change not supported for this account type',
        });
      }
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await executeTenantQuery(req.tenant.id, async (client) => {
        await client.query(
          `UPDATE users SET password_hash = $1 WHERE id = $2`,
          [newHash, user.id]
        );

        const ip =
          (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
            .split(',')[0]
            .trim() || '127.0.0.1';
        const ua = req.headers['user-agent'] || 'Unknown';

        await client.query(
          `INSERT INTO activity_logs (user_id, tenant_id, action, metadata, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            user.id,
            req.tenant.id,
            'Password changed successfully',
            JSON.stringify({ level: 'warn', color: '#d97706' }),
            ip,
            ua,
          ]
        );
      });

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// ─── PROMPT PRESETS (server-side, per user) ───────────────────────────────────

// GET /api/user/presets
app.get('/api/user/presets', authMiddleware, async (req, res) => {
  try {
    const presets = await executeTenantQuery(req.tenant.id, async (client) => {
      // Store presets in settings JSONB under the 'presets' key
      const result = await client.query(
        `SELECT settings FROM users WHERE id = $1`,
        [req.user.id]
      );
      return result.rows[0]?.settings?.presets || [];
    });
    res.json(presets);
  } catch (err) {
    console.error('Fetch presets error:', err);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /api/user/presets
app.post('/api/user/presets', authMiddleware, async (req, res) => {
  const { name, description, systemPrompt } = req.body;
  if (!name || !systemPrompt) {
    return res
      .status(400)
      .json({ error: 'Name and system prompt are required' });
  }
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT settings FROM users WHERE id = $1`,
        [req.user.id]
      );
      const settings = result.rows[0]?.settings || {};
      const presets = settings.presets || [];
      const newPreset = {
        id: Date.now().toString(),
        name,
        description: description || '',
        systemPrompt,
        created_at: new Date().toISOString(),
      };
      const updatedPresets = [...presets, newPreset];
      const updatedSettings = { ...settings, presets: updatedPresets };
      await client.query(`UPDATE users SET settings = $1 WHERE id = $2`, [
        JSON.stringify(updatedSettings),
        req.user.id,
      ]);
      return updatedPresets;
    });
    res.status(201).json(updated);
  } catch (err) {
    console.error('Create preset error:', err);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// DELETE /api/user/presets/:id
app.delete('/api/user/presets/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT settings FROM users WHERE id = $1`,
        [req.user.id]
      );
      const settings = result.rows[0]?.settings || {};
      const filtered = (settings.presets || []).filter(
        (p) => p.id !== req.params.id
      );
      await client.query(`UPDATE users SET settings = $1 WHERE id = $2`, [
        JSON.stringify({ ...settings, presets: filtered }),
        req.user.id,
      ]);
      return filtered;
    });
    res.json(updated);
  } catch (err) {
    console.error('Delete preset error:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// ─── RAG DRIVE FILES (server-side, per user) ──────────────────────────────────

// GET /api/user/rag-files
app.get('/api/user/rag-files', authMiddleware, async (req, res) => {
  try {
    const files = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, filename as name, file_size_bytes as size, is_active as "isActive", created_at 
         FROM knowledge_documents 
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [req.user.id, req.tenant.id]
      );
      return result.rows;
    });
    res.json(files);
  } catch (err) {
    console.error('Fetch rag files error:', err);
    res.status(500).json({ error: 'Failed to fetch RAG files' });
  }
});

// POST /api/user/rag-files - Save an indexed file entry (text extracted client-side)
app.post('/api/user/rag-files', authMiddleware, async (req, res) => {
  const { name, size, text, isActive } = req.body;
  if (!name || !text) {
    return res
      .status(400)
      .json({ error: 'File name and text content are required' });
  }
  try {
    const ragLimit = req.tenant.features?.rag_documents || 500;
    if (ragLimit !== -1) {
      const currentRAGCount = await executeTenantQuery(
        req.tenant.id,
        async (client) => {
          const res = await client.query(
            `SELECT COUNT(*)::int as count 
           FROM knowledge_documents 
           WHERE tenant_id = $1`,
            [req.tenant.id]
          );
          return res.rows[0].count;
        },
        true
      );

      const graceQuery = await pool.query(
        'SELECT downgrade_grace_ends FROM tenants WHERE id = $1',
        [req.tenant.id]
      );
      const downgradeGraceEnds = graceQuery.rows[0]?.downgrade_grace_ends;
      const isGraceExpired =
        downgradeGraceEnds && new Date() > new Date(downgradeGraceEnds);

      if (currentRAGCount >= ragLimit) {
        if (!downgradeGraceEnds || isGraceExpired) {
          return res.status(403).json({
            error: `RAG upload frozen: Document count (${currentRAGCount}) exceeds plan limit (${ragLimit}). Please upgrade your plan or resolve outstanding violations.`,
          });
        }
      }
    }

    const newId = crypto.randomUUID();
    const isActiveBool = isActive !== false;
    const fileType = name.split('.').pop() || 'txt';

    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `INSERT INTO knowledge_documents (id, tenant_id, user_id, filename, file_type, file_size_bytes, content, is_active, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'indexed')`,
        [
          newId,
          req.tenant.id,
          req.user.id,
          name,
          fileType,
          size || 0,
          text,
          isActiveBool,
        ]
      );
    });

    // Chunk and generate embeddings outside the transactional connection block
    const chunks = chunkText(text, 800, 150);
    const chunkEmbeddings = [];
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const embedding = await getEmbedding(chunk, 'qwen2.5-coder:7b');
      chunkEmbeddings.push({ chunk, embedding });
    }

    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      for (const item of chunkEmbeddings) {
        const embeddingString = `[${item.embedding.join(',')}]`;
        await client.query(
          `INSERT INTO document_embeddings (tenant_id, knowledge_document_id, content, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [req.tenant.id, newId, item.chunk, embeddingString]
        );
      }

      const result = await client.query(
        `SELECT id, filename as name, file_size_bytes as size, is_active as "isActive", created_at 
         FROM knowledge_documents 
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [req.user.id, req.tenant.id]
      );
      return result.rows;
    });
    res.status(201).json(updated);
  } catch (err) {
    console.error('Save rag file error:', err);
    res.status(500).json({ error: 'Failed to save RAG file' });
  }
});

// PATCH /api/user/rag-files/:id - Toggle active state
app.patch('/api/user/rag-files/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `UPDATE knowledge_documents 
         SET is_active = NOT COALESCE(is_active, true) 
         WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
        [req.params.id, req.user.id, req.tenant.id]
      );

      const result = await client.query(
        `SELECT id, filename as name, file_size_bytes as size, is_active as "isActive", created_at 
         FROM knowledge_documents 
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [req.user.id, req.tenant.id]
      );
      return result.rows;
    });
    res.json(updated);
  } catch (err) {
    console.error('Toggle rag file error:', err);
    res.status(500).json({ error: 'Failed to toggle RAG file' });
  }
});

// DELETE /api/user/rag-files/:id
app.delete('/api/user/rag-files/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `DELETE FROM knowledge_documents 
         WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
        [req.params.id, req.user.id, req.tenant.id]
      );

      const result = await client.query(
        `SELECT id, filename as name, file_size_bytes as size, is_active as "isActive", created_at 
         FROM knowledge_documents 
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [req.user.id, req.tenant.id]
      );
      return result.rows;
    });
    res.json(updated);
  } catch (err) {
    console.error('Delete rag file error:', err);
    res.status(500).json({ error: 'Failed to delete RAG file' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve openapi.json spec file
app.get('/api/openapi.json', (req, res) => {
  try {
    const specPath = path.join(__dirname, 'openapi.json');
    const specRaw = fs.readFileSync(specPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(specRaw);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read OpenAPI spec' });
  }
});

// Serve Swagger UI HTML page at /api/docs
app.get('/api/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Harikson AI OpenAPI Docs</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
      <style>
        html { box-sizing: border-box; overflow: -y-scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `);
});

// Chat history endpoint
app.get('/api/chat/history', authMiddleware, async (req, res) => {
  try {
    const conversations = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const result = await client.query(
          `SELECT id, title, model, created_at, updated_at
         FROM conversations
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY updated_at DESC
         LIMIT 100`,
          [req.user.id]
        );
        return result.rows;
      },
      true
    );
    res.json({ conversations });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Billing endpoint aliases
app.get('/api/billing', authMiddleware, async (req, res) => {
  res.redirect('/api/user/billing');
});

app.get('/api/billing/invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await executeTenantQuery(
      req.tenant.id,
      async (client) => {
        const result = await client.query(
          `SELECT id, amount, currency, status, created_at, paid_at, invoice_url, pdf_url
         FROM invoices
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
          [req.tenant.id]
        );
        return result.rows;
      },
      true
    );
    res.json({ invoices });
  } catch (err) {
    console.error('Fetch billing invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// --- END USER SETTINGS API ---

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

initUserTables().catch((err) =>
  console.error('❌ Error initializing tables:', err)
);

app.listen(port, () => {
  console.log(`⚡ [Tenant API] Operational and listening on port ${port}`);
});
