import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrivacyService } from '../services/privacyService.js';
import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';
const getJwtSecret = () => process.env.JWT_SECRET || 'secret';

const router = Router();

// Middleware: Authenticate user if token is present (optional for public, required for user-specific endpoints)
router.use(async (req: any, _res, next) => {
  if (!req.user) {
    const authHeader = req.headers.authorization || '';
    const cookieToken = req.cookies?.hk_access_token;
    let token = '';
    if (authHeader.startsWith('Bearer ') && !authHeader.startsWith('Bearer hk_live_')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (token) {
      try {
        const decoded: any = jwt.verify(token, getJwtSecret());
        req.user = decoded;
      } catch (err) {
        // Token invalid or expired - leave req.user undefined
      }
    }
  }

  // Ensure tenant is attached if user is authenticated
  if (req.user?.userId && !req.tenant) {
    try {
      const userTenantRes = await pool.query(
        'SELECT t.* FROM tenants t JOIN users u ON u.tenant_id = t.id WHERE u.id = $1',
        [req.user.userId]
      );
      if (userTenantRes.rows.length > 0) {
        req.tenant = userTenantRes.rows[0];
      }
    } catch (_) {}
  }

  next();
});

// Guard: Require authenticated user
function requireAuth(req: any, res: any, next: any) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Authentication required to access privacy settings and rights.' });
  }
  if (!req.tenant || !req.tenant.id) {
    return res.status(400).json({ error: 'Tenant context could not be resolved for this user.' });
  }
  next();
}

// ----------------------------------------------------
// 1. PUBLIC PRIVACY NOTICES & PURPOSES
// ----------------------------------------------------

/**
 * GET /api/privacy/notice
 * Returns the currently active published DPDP Privacy Notice or a specific version.
 */
router.get('/notice', async (req: any, res: any) => {
  try {
    const version = req.query.version as string | undefined;
    const notice = await PrivacyService.getPublishedNotice(version);
    if (!notice) {
      return res.status(404).json({ error: 'Privacy notice not found' });
    }
    return res.json({ notice });
  } catch (err: any) {
    logger.error('Fetch privacy notice error:', err);
    return res.status(500).json({ error: 'Failed to fetch privacy notice' });
  }
});

/**
 * GET /api/privacy/notices
 * Returns list of published and historical privacy notice versions.
 */
router.get('/notices', async (_req: any, res: any) => {
  try {
    const notices = await PrivacyService.listNoticeVersions();
    return res.json({ notices });
  } catch (err: any) {
    logger.error('List privacy notices error:', err);
    return res.status(500).json({ error: 'Failed to list privacy notice versions' });
  }
});

/**
 * GET /api/privacy/purposes
 * Returns all active processing purposes and their statutory lawful basis.
 */
router.get('/purposes', async (_req: any, res: any) => {
  try {
    const purposes = await PrivacyService.getPurposes();
    return res.json({ purposes });
  } catch (err: any) {
    logger.error('List consent purposes error:', err);
    return res.status(500).json({ error: 'Failed to list consent purposes' });
  }
});

// ----------------------------------------------------
// 2. USER CONSENT PREFERENCES (AUTHENTICATED)
// ----------------------------------------------------

/**
 * GET /api/privacy/preferences
 * Returns the user's current consent status for all defined purposes.
 */
router.get('/preferences', requireAuth, async (req: any, res: any) => {
  try {
    const consents = await PrivacyService.getUserConsents(req.tenant.id, req.user.userId);
    return res.json({
      success: true,
      tenantId: req.tenant.id,
      userId: req.user.userId,
      consents,
    });
  } catch (err: any) {
    logger.error('Fetch user consents error:', err);
    return res.status(500).json({ error: 'Failed to fetch consent preferences' });
  }
});

/**
 * PUT /api/privacy/preferences
 * Updates user consent preferences across one or more purposes.
 * Validates required contractual purposes and writes immutable audit logs.
 */
router.put('/preferences', requireAuth, async (req: any, res: any) => {
  try {
    const { updates, noticeVersion, source } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty consent updates array.' });
    }

    const clientIp =
      ((req.headers['x-forwarded-for'] as any) || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';

    const updatedConsents = await PrivacyService.updateUserConsents(
      req.tenant.id,
      req.user.userId,
      updates,
      {
        source: source || 'privacy_settings',
        ipAddress: clientIp,
        userAgent,
        noticeVersion: noticeVersion || '2.0-dpdp',
      }
    );

    return res.json({
      success: true,
      message: 'Privacy preferences successfully updated and recorded in compliance audit log.',
      consents: updatedConsents,
    });
  } catch (err: any) {
    logger.error('Update user consents error:', err);
    return res.status(400).json({ error: err.message || 'Failed to update consent preferences' });
  }
});

/**
 * POST /api/privacy/consent-events
 * Explicit event logger for consent transitions from front-end flows.
 */
router.post('/consent-events', requireAuth, async (req: any, res: any) => {
  try {
    const { purposeId, status, noticeVersion, source, metadata } = req.body;
    if (!purposeId || !status) {
      return res.status(400).json({ error: 'purposeId and status are required.' });
    }

    const clientIp =
      ((req.headers['x-forwarded-for'] as any) || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';

    const updatedConsents = await PrivacyService.updateUserConsents(
      req.tenant.id,
      req.user.userId,
      [{ purposeId, status }],
      {
        source: source || 'feature_prompt',
        ipAddress: clientIp,
        userAgent,
        noticeVersion: noticeVersion || '2.0-dpdp',
        metadata,
      }
    );

    return res.json({
      success: true,
      consents: updatedConsents,
    });
  } catch (err: any) {
    logger.error('Record consent event error:', err);
    return res.status(400).json({ error: err.message || 'Failed to record consent event' });
  }
});

// ----------------------------------------------------
// 3. DATA PRINCIPAL RIGHTS REQUESTS (DPDP ACT)
// ----------------------------------------------------

/**
 * GET /api/privacy/requests
 * Returns all submitted Data Principal privacy requests for the current user.
 */
router.get('/requests', requireAuth, async (req: any, res: any) => {
  try {
    const requests = await PrivacyService.listUserPrivacyRequests(req.tenant.id, req.user.userId);
    return res.json({ success: true, requests });
  } catch (err: any) {
    logger.error('List privacy requests error:', err);
    return res.status(500).json({ error: 'Failed to list privacy requests' });
  }
});

/**
 * POST /api/privacy/requests
 * Submits a new Data Principal Rights request (Access/Export, Correction, Erasure, Nomination).
 */
router.post('/requests', requireAuth, async (req: any, res: any) => {
  try {
    const { requestType, details } = req.body;
    const validTypes = ['access_export', 'correction', 'erasure', 'consent_withdrawal', 'nomination'];
    if (!requestType || !validTypes.includes(requestType)) {
      return res.status(400).json({
        error: `Invalid requestType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const clientIp =
      ((req.headers['x-forwarded-for'] as any) || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';

    const newRequest = await PrivacyService.createPrivacyRequest(
      req.tenant.id,
      req.user.userId,
      {
        requestType,
        details: details || {},
        clientIp,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Data Principal Rights request submitted successfully. A confirmation email has been dispatched.',
      request: newRequest,
    });
  } catch (err: any) {
    logger.error('Create privacy request error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit privacy request' });
  }
});

/**
 * GET /api/privacy/requests/:identifier
 * Lookup specific privacy request status by tracking number or UUID.
 */
router.get('/requests/:identifier', requireAuth, async (req: any, res: any) => {
  try {
    const request = await PrivacyService.getPrivacyRequest(
      req.params.identifier,
      req.tenant.id,
      req.user.userId
    );

    if (!request) {
      return res.status(404).json({ error: 'Privacy request not found' });
    }

    return res.json({ success: true, request });
  } catch (err: any) {
    logger.error('Fetch privacy request error:', err);
    return res.status(500).json({ error: 'Failed to fetch privacy request' });
  }
});

/**
 * GET /api/privacy/export-data
 * Generates and returns the personal data export bundle directly.
 */
router.get('/export-data', requireAuth, async (req: any, res: any) => {
  try {
    const exportBundle = await PrivacyService.generateDataExportBundle(
      req.tenant.id,
      req.user.userId
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="xarwiz_dpdp_export_${req.user.userId.slice(0, 8)}_${Date.now()}.json"`
    );
    return res.json(exportBundle);
  } catch (err: any) {
    logger.error('Generate data export error:', err);
    return res.status(500).json({ error: 'Failed to generate personal data export bundle' });
  }
});

/**
 * POST /api/privacy/erasure
 * Initiates user account and personal data erasure under Section 12 of DPDP Act 2023.
 */
router.post('/erasure', requireAuth, async (req: any, res: any) => {
  try {
    const { passwordConfirm, reason } = req.body;
    const result = await PrivacyService.executeAccountErasure(
      req.tenant.id,
      req.user.userId,
      passwordConfirm,
      reason
    );

    return res.json(result);
  } catch (err: any) {
    logger.error('Execute account erasure error:', err);
    return res.status(400).json({ error: err.message || 'Failed to execute account erasure' });
  }
});

// ----------------------------------------------------
// 4. GRIEVANCE MANAGEMENT (DPDP SECTION 13)
// ----------------------------------------------------

/**
 * POST /api/privacy/grievances
 * Public or authenticated endpoint to submit a DPDP grievance to the Grievance Officer.
 */
router.post('/grievances', async (req: any, res: any) => {
  try {
    const { complainantName, complainantEmail, complainantPhone, category, subject, description } = req.body;

    if (!complainantName || !complainantEmail || !category || !subject || !description) {
      return res.status(400).json({
        error: 'complainantName, complainantEmail, category, subject, and description are required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(complainantEmail)) {
      return res.status(400).json({ error: 'Invalid complainant email format.' });
    }

    const grievance = await PrivacyService.submitGrievance({
      complainantName,
      complainantEmail,
      complainantPhone,
      category,
      subject,
      description,
      tenantId: req.tenant?.id || null,
      userId: req.user?.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Grievance registered successfully with the Xarwiz Grievance Officer. An acknowledgment email has been dispatched.',
      grievanceNumber: grievance.grievance_number,
      assignedOfficer: grievance.assigned_officer,
      status: grievance.status,
    });
  } catch (err: any) {
    logger.error('Submit grievance error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit grievance' });
  }
});

/**
 * GET /api/privacy/grievances/:grievanceNumber
 * Public endpoint to track status of a grievance with email verification.
 */
router.get('/grievances/:grievanceNumber', async (req: any, res: any) => {
  try {
    const { grievanceNumber } = req.params;
    const email = req.query.email as string | undefined;

    const grievance = await PrivacyService.getGrievanceStatus(grievanceNumber, email);
    if (!grievance) {
      return res.status(404).json({
        error: 'Grievance not found or email verification failed.',
      });
    }

    return res.json({
      success: true,
      grievance: {
        grievance_number: grievance.grievance_number,
        category: grievance.category,
        subject: grievance.subject,
        status: grievance.status,
        assigned_officer: grievance.assigned_officer,
        resolution_notes: grievance.resolution_notes,
        created_at: grievance.created_at,
        resolved_at: grievance.resolved_at,
      },
    });
  } catch (err: any) {
    logger.error('Fetch grievance status error:', err);
    return res.status(500).json({ error: 'Failed to fetch grievance status' });
  }
});

// ----------------------------------------------------
// 5. COOKIE & TRACKING CONSENT LOG
// ----------------------------------------------------

/**
 * POST /api/privacy/cookie-consent
 * Logs cookie choice to cookie_consent_log table for compliance accountability.
 */
router.post('/cookie-consent', async (req: any, res: any) => {
  try {
    const { consentId, categories, consent, userId } = req.body;
    const clientIp =
      ((req.headers['x-forwarded-for'] as any) || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';

    const consentPayload = consent || {
      consentId: consentId || 'cookie_pref',
      categories: categories || { essential: true, analytics: false, marketing: false },
      timestamp: new Date().toISOString(),
    };

    await PrivacyService.logCookieConsent({
      tenantId: req.tenant?.id || null,
      userId: userId || req.user?.userId || null,
      ipAddress: clientIp,
      userAgent,
      consentJson: consentPayload,
    });

    return res.json({ success: true, message: 'Cookie consent preferences recorded' });
  } catch (err: any) {
    logger.error('Log cookie consent error:', err);
    return res.status(500).json({ error: 'Failed to record cookie consent' });
  }
});

export default router;
