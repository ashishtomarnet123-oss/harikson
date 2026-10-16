import { Router } from 'express';
import pool from '../db.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /admin/privacy/stats
 * Overview compliance metrics for admin dashboard.
 */
router.get('/stats', async (req, res) => {
  try {
    const [requestsCountRes, grievancesCountRes, consentsCountRes, noticesCountRes] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('submitted', 'under_review', 'identity_verification') THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'rejected_with_reason' THEN 1 END) as rejected
        FROM privacy_requests
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('submitted', 'investigating', 'acknowledged') THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
        FROM privacy_grievances
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN status = 'granted' THEN 1 END) as active_grants,
          COUNT(CASE WHEN status = 'withdrawn' THEN 1 END) as withdrawn
        FROM user_consents
      `),
      pool.query(`SELECT COUNT(*) as total_versions FROM privacy_notices`),
    ]);

    const stats = {
      requests: requestsCountRes.rows[0],
      grievances: grievancesCountRes.rows[0],
      consents: consentsCountRes.rows[0],
      notices: noticesCountRes.rows[0],
    };

    return res.json({ success: true, stats });
  } catch (err) {
    logger.error('Admin privacy stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch privacy stats' });
  }
});

// ----------------------------------------------------
// PRIVACY NOTICES MANAGEMENT
// ----------------------------------------------------

router.get('/notices', async (_req, res) => {
  try {
    const resNotices = await pool.query(
      'SELECT * FROM privacy_notices ORDER BY effective_date DESC'
    );
    return res.json({ success: true, notices: resNotices.rows });
  } catch (err) {
    logger.error('Admin list notices error:', err);
    return res.status(500).json({ error: 'Failed to list notices' });
  }
});

router.post('/notices', async (req, res) => {
  try {
    const { version, title, summary, contentJson, status, effectiveDate } = req.body;
    if (!version || !title) {
      return res.status(400).json({ error: 'Version and title are required' });
    }

    const adminName = req.user?.name || req.user?.email || 'Compliance Admin';
    const effDate = effectiveDate || new Date().toISOString();

    const insertRes = await pool.query(
      `INSERT INTO privacy_notices (version, title, effective_date, summary, content_json, status, published_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        version.trim(),
        title.trim(),
        effDate,
        summary || '',
        JSON.stringify(contentJson || {}),
        status || 'published',
        adminName,
      ]
    );

    return res.status(201).json({ success: true, notice: insertRes.rows[0] });
  } catch (err) {
    logger.error('Admin create notice error:', err);
    return res.status(400).json({ error: err.message || 'Failed to create notice' });
  }
});

router.put('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, contentJson, status, effectiveDate } = req.body;

    const updateRes = await pool.query(
      `UPDATE privacy_notices SET
         title = COALESCE($1, title),
         summary = COALESCE($2, summary),
         content_json = COALESCE($3, content_json),
         status = COALESCE($4, status),
         effective_date = COALESCE($5, effective_date),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        title || null,
        summary || null,
        contentJson ? JSON.stringify(contentJson) : null,
        status || null,
        effectiveDate || null,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notice version not found' });
    }

    return res.json({ success: true, notice: updateRes.rows[0] });
  } catch (err) {
    logger.error('Admin update notice error:', err);
    return res.status(500).json({ error: 'Failed to update notice' });
  }
});

// ----------------------------------------------------
// PURPOSES MANAGEMENT
// ----------------------------------------------------

router.get('/purposes', async (_req, res) => {
  try {
    const resPurposes = await pool.query('SELECT * FROM consent_purposes ORDER BY created_at ASC');
    return res.json({ success: true, purposes: resPurposes.rows });
  } catch (err) {
    logger.error('Admin list purposes error:', err);
    return res.status(500).json({ error: 'Failed to list consent purposes' });
  }
});

router.post('/purposes', async (req, res) => {
  try {
    const { id, name, description, legalBasis, isRequired, isOptional, consentWording, withdrawalBehavior } = req.body;

    if (!id || !name || !description || !legalBasis) {
      return res.status(400).json({ error: 'id, name, description, and legalBasis are required' });
    }

    const insertRes = await pool.query(
      `INSERT INTO consent_purposes (
         id, name, description, legal_basis, is_required, is_optional, consent_wording, withdrawal_behavior
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         legal_basis = EXCLUDED.legal_basis,
         is_required = EXCLUDED.is_required,
         is_optional = EXCLUDED.is_optional,
         consent_wording = EXCLUDED.consent_wording,
         withdrawal_behavior = EXCLUDED.withdrawal_behavior,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        id.trim(),
        name.trim(),
        description.trim(),
        legalBasis,
        isRequired === true,
        isOptional !== false,
        consentWording || '',
        withdrawalBehavior || '',
      ]
    );

    return res.status(201).json({ success: true, purpose: insertRes.rows[0] });
  } catch (err) {
    logger.error('Admin create/update purpose error:', err);
    return res.status(400).json({ error: err.message || 'Failed to save purpose' });
  }
});

// ----------------------------------------------------
// DATA PRINCIPAL RIGHTS REQUESTS WORKFLOW
// ----------------------------------------------------

router.get('/requests', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = `
      SELECT r.*, u.email as user_email, u.name as user_name, t.name as tenant_name
      FROM privacy_requests r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN tenants t ON t.id = r.tenant_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      query += ` AND r.request_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (r.tracking_number ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
    }

    query += ' ORDER BY r.created_at DESC LIMIT 100';

    const resRequests = await pool.query(query, params);
    return res.json({ success: true, requests: resRequests.rows });
  } catch (err) {
    logger.error('Admin list requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch privacy requests' });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, resolutionNotes } = req.body;

    const isResolved = status === 'completed' || status === 'approved' || status === 'rejected_with_reason';

    const updateRes = await pool.query(
      `UPDATE privacy_requests SET
         status = COALESCE($1, status),
         rejection_reason = COALESCE($2, rejection_reason),
         resolved_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE resolved_at END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status || null, rejectionReason || null, isResolved, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Privacy request not found' });
    }

    return res.json({ success: true, request: updateRes.rows[0] });
  } catch (err) {
    logger.error('Admin update request error:', err);
    return res.status(500).json({ error: 'Failed to update privacy request' });
  }
});

// ----------------------------------------------------
// GRIEVANCES WORKFLOW
// ----------------------------------------------------

router.get('/grievances', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM privacy_grievances WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (grievance_number ILIKE $${params.length} OR complainant_email ILIKE $${params.length} OR complainant_name ILIKE $${params.length} OR subject ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const resGrievances = await pool.query(query, params);
    return res.json({ success: true, grievances: resGrievances.rows });
  } catch (err) {
    logger.error('Admin list grievances error:', err);
    return res.status(500).json({ error: 'Failed to list grievances' });
  }
});

router.put('/grievances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedOfficer, resolutionNotes } = req.body;

    const isResolved = status === 'resolved' || status === 'dismissed_with_reason';

    const updateRes = await pool.query(
      `UPDATE privacy_grievances SET
         status = COALESCE($1, status),
         assigned_officer = COALESCE($2, assigned_officer),
         resolution_notes = COALESCE($3, resolution_notes),
         resolved_at = CASE WHEN $4 = true THEN CURRENT_TIMESTAMP ELSE resolved_at END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status || null, assignedOfficer || null, resolutionNotes || null, isResolved, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    return res.json({ success: true, grievance: updateRes.rows[0] });
  } catch (err) {
    logger.error('Admin update grievance error:', err);
    return res.status(500).json({ error: 'Failed to update grievance' });
  }
});

// ----------------------------------------------------
// CONSENT AUDIT LOGS
// ----------------------------------------------------

router.get('/audit-events', async (req, res) => {
  try {
    const { purposeId, search } = req.query;
    let query = `
      SELECT e.*, u.email as user_email, u.name as user_name, t.name as tenant_name
      FROM consent_audit_events e
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE 1=1
    `;
    const params = [];

    if (purposeId) {
      params.push(purposeId);
      query += ` AND e.purpose_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
    }

    query += ' ORDER BY e.created_at DESC LIMIT 100';

    const resAudit = await pool.query(query, params);
    return res.json({ success: true, events: resAudit.rows });
  } catch (err) {
    logger.error('Admin list consent audit error:', err);
    return res.status(500).json({ error: 'Failed to fetch consent audit events' });
  }
});

export default router;
