import logger from '../utils/logger.js';
import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import { validate } from '../middleware/validation.middleware.js';
import {
  createAgentSchema,
  updateAgentSchema,
} from '../validators/agents.schema.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = express.Router();

// GET / - List all agents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
             CASE 
               WHEN (a.success_count + a.error_count) > 0 THEN 
                 ROUND((a.success_count::decimal / (a.success_count + a.error_count)) * 100, 2)
               ELSE 0.00
             END AS success_rate,
             CASE 
               WHEN (a.success_count + a.error_count) > 0 THEN 
                 ROUND((a.error_count::decimal / (a.success_count + a.error_count)) * 100, 2)
               ELSE 0.00
             END AS error_rate,
             t.name as tenant_name 
      FROM agents a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error('Failed to fetch agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// POST / - Create an agent
router.post('/', validate(createAgentSchema), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      model,
      system_prompt,
      temperature,
      top_p,
      max_tokens,
      context_length,
      streaming_enabled,
      memory_enabled,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO agents (
        name, description, category, model, system_prompt,
        temperature, top_p, max_tokens, context_length,
        streaming_enabled, memory_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        name,
        description,
        category,
        model,
        system_prompt,
        temperature,
        top_p,
        max_tokens,
        context_length,
        streaming_enabled,
        memory_enabled,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to create agent:', err);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PUT /:id - Update an agent
router.put('/:id', validate(updateAgentSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      model,
      system_prompt,
      temperature,
      top_p,
      max_tokens,
      context_length,
      streaming_enabled,
      memory_enabled,
      status,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE agents SET 
        name = $1, description = $2, category = $3, model = $4, system_prompt = $5,
        temperature = $6, top_p = $7, max_tokens = $8, context_length = $9,
        streaming_enabled = $10, memory_enabled = $11, status = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `,
      [
        name,
        description,
        category,
        model,
        system_prompt,
        temperature,
        top_p,
        max_tokens,
        context_length,
        streaming_enabled,
        memory_enabled,
        status,
        id,
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to update agent:', err);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// DELETE /:id - Archive an agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      UPDATE agents SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *
    `,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to archive agent:', err);
    res.status(500).json({ error: 'Failed to archive agent' });
  }
});

export default router;
