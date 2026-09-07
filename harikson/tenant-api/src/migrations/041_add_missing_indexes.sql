-- Migration 041: Add missing indexes on high-traffic columns (D-05).
-- These are the most frequently queried columns that lack indexes,
-- causing sequential scans on every chat load, login, and session check.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id
  ON messages (conversation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id
  ON conversations (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users (email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id
  ON users (tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_tenant_id
  ON activity_logs (tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_tenant_created
  ON messages (tenant_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_user
  ON conversations (tenant_id, user_id);
