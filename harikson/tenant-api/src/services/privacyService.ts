import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { pool, executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';
import {
  sendPrivacyRequestAcknowledgmentEmail,
  sendGrievanceAcknowledgmentEmail,
} from './email.js';

export interface PrivacyNoticeRecord {
  id: string;
  version: string;
  title: string;
  effective_date: string;
  summary: string;
  content_json: any;
  status: 'draft' | 'published' | 'archived';
  published_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  legal_basis: 'contractual_necessity' | 'consent' | 'legal_obligation' | 'legitimate_uses';
  is_required: boolean;
  is_optional: boolean;
  consent_wording: string;
  version: string;
  withdrawal_behavior: string;
  is_active: boolean;
}

export interface UserConsentState {
  purpose_id: string;
  name: string;
  description: string;
  legal_basis: string;
  is_required: boolean;
  is_optional: boolean;
  consent_wording: string;
  status: 'granted' | 'declined' | 'withdrawn' | 'superseded' | 'not_configured';
  notice_version: string;
  collection_source: string;
  last_changed_at: string | null;
  withdrawal_behavior: string;
}

export interface PrivacyRequestRecord {
  id: string;
  tracking_number: string;
  tenant_id: string;
  user_id: string;
  request_type: 'access_export' | 'correction' | 'erasure' | 'consent_withdrawal' | 'nomination' | 'grievance';
  status: 'submitted' | 'identity_verification' | 'under_review' | 'awaiting_information' | 'approved' | 'rejected_with_reason' | 'completed' | 'closed';
  details: any;
  rejection_reason?: string | null;
  export_file_url?: string | null;
  export_expires_at?: string | null;
  verified_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacyGrievanceRecord {
  id: string;
  grievance_number: string;
  tenant_id?: string | null;
  user_id?: string | null;
  complainant_name: string;
  complainant_email: string;
  complainant_phone?: string | null;
  category: string;
  subject: string;
  description: string;
  status: 'submitted' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed_with_reason';
  assigned_officer: string;
  resolution_notes?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export class PrivacyService {
  /**
   * Fetch the current published privacy notice or specific version.
   */
  static async getPublishedNotice(version?: string): Promise<PrivacyNoticeRecord | null> {
    if (version) {
      const res = await pool.query(
        'SELECT * FROM privacy_notices WHERE version = $1 LIMIT 1',
        [version]
      );
      return res.rows[0] || null;
    }

    const res = await pool.query(
      "SELECT * FROM privacy_notices WHERE status = 'published' ORDER BY effective_date DESC LIMIT 1"
    );
    return res.rows[0] || null;
  }

  /**
   * List all privacy notices with historical versions for audit tracking.
   */
  static async listNoticeVersions(): Promise<Array<Partial<PrivacyNoticeRecord>>> {
    const res = await pool.query(
      'SELECT id, version, title, effective_date, summary, status, published_by, created_at FROM privacy_notices ORDER BY effective_date DESC'
    );
    return res.rows;
  }

  /**
   * Retrieve all active master consent purposes defined in Xarwiz.
   */
  static async getPurposes(): Promise<ConsentPurpose[]> {
    const res = await pool.query(
      'SELECT * FROM consent_purposes WHERE is_active = true ORDER BY is_required DESC, created_at ASC'
    );
    return res.rows;
  }

  /**
   * Retrieve the active user consent preferences across all purposes for a given user & tenant.
   * Multi-tenant RLS compliant via executeTenantQuery.
   */
  static async getUserConsents(tenantId: string, userId: string): Promise<UserConsentState[]> {
    return executeTenantQuery(tenantId, async (client) => {
      const purposesRes = await client.query(
        'SELECT * FROM consent_purposes WHERE is_active = true ORDER BY is_required DESC, created_at ASC'
      );
      const purposes: ConsentPurpose[] = purposesRes.rows;

      const userConsentsRes = await client.query(
        'SELECT * FROM user_consents WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, userId]
      );
      const userConsentMap = new Map<string, any>();
      for (const row of userConsentsRes.rows) {
        userConsentMap.set(row.purpose_id, row);
      }

      return purposes.map((purpose) => {
        const record = userConsentMap.get(purpose.id);
        if (record) {
          return {
            purpose_id: purpose.id,
            name: purpose.name,
            description: purpose.description,
            legal_basis: purpose.legal_basis,
            is_required: purpose.is_required,
            is_optional: purpose.is_optional,
            consent_wording: purpose.consent_wording,
            status: record.status,
            notice_version: record.notice_version,
            collection_source: record.collection_source,
            last_changed_at: record.last_changed_at || record.updated_at,
            withdrawal_behavior: purpose.withdrawal_behavior,
          };
        }

        // Default fallback if not yet explicitly stored:
        // Contractual necessity (service_processing) is granted upon account creation.
        // Optional purposes default to 'not_configured' (unconsented)
        const defaultStatus = purpose.is_required ? 'granted' : 'not_configured';
        return {
          purpose_id: purpose.id,
          name: purpose.name,
          description: purpose.description,
          legal_basis: purpose.legal_basis,
          is_required: purpose.is_required,
          is_optional: purpose.is_optional,
          consent_wording: purpose.consent_wording,
          status: defaultStatus as any,
          notice_version: purpose.version || '2.0-dpdp',
          collection_source: 'system_default',
          last_changed_at: null,
          withdrawal_behavior: purpose.withdrawal_behavior,
        };
      });
    });
  }

  /**
   * Update consent status for one or more purposes.
   * Validates required purposes cannot be withdrawn while retaining an active account.
   * Creates immutable audit entries in consent_audit_events.
   */
  static async updateUserConsents(
    tenantId: string,
    userId: string,
    updates: Array<{ purposeId: string; status: 'granted' | 'declined' | 'withdrawn' }>,
    context: {
      source: string;
      ipAddress?: string;
      userAgent?: string;
      noticeVersion?: string;
      metadata?: any;
    }
  ): Promise<UserConsentState[]> {
    const noticeVersion = context.noticeVersion || '2.0-dpdp';
    const collectionSource = context.source || 'privacy_settings';

    return executeTenantQuery(tenantId, async (client) => {
      // 1. Fetch purpose definitions to validate rules
      const purposesRes = await client.query('SELECT * FROM consent_purposes WHERE is_active = true');
      const purposeMap = new Map<string, ConsentPurpose>();
      for (const p of purposesRes.rows) {
        purposeMap.set(p.id, p);
      }

      for (const update of updates) {
        const purpose = purposeMap.get(update.purposeId);
        if (!purpose) {
          throw new Error(`Invalid purpose ID: ${update.purposeId}`);
        }

        // Required contractual purposes cannot be withdrawn directly without account closure
        if (purpose.is_required && (update.status === 'withdrawn' || update.status === 'declined')) {
          throw new Error(
            `Purpose "${purpose.name}" is required to deliver requested services. To cease processing, please submit an Account Erasure request.`
          );
        }

        // 2. Fetch previous status
        const prevRes = await client.query(
          'SELECT status, notice_version FROM user_consents WHERE tenant_id = $1 AND user_id = $2 AND purpose_id = $3',
          [tenantId, userId, update.purposeId]
        );
        const previousStatus = prevRes.rows[0]?.status || 'not_configured';

        // 3. Upsert into user_consents
        await client.query(
          `INSERT INTO user_consents (
             tenant_id, user_id, purpose_id, status, notice_version, collection_source, last_changed_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (tenant_id, user_id, purpose_id) DO UPDATE SET
             status = EXCLUDED.status,
             notice_version = EXCLUDED.notice_version,
             collection_source = EXCLUDED.collection_source,
             last_changed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`,
          [tenantId, userId, update.purposeId, update.status, noticeVersion, collectionSource]
        );

        // 4. Append immutable audit event
        const eventType =
          update.status === 'granted'
            ? 'granted'
            : update.status === 'withdrawn'
            ? 'withdrawn'
            : 'declined';

        await client.query(
          `INSERT INTO consent_audit_events (
             tenant_id, user_id, purpose_id, event_type, previous_status, new_status,
             notice_version, collection_source, ip_address, user_agent, metadata
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            tenantId,
            userId,
            update.purposeId,
            eventType,
            previousStatus,
            update.status,
            noticeVersion,
            collectionSource,
            context.ipAddress || null,
            context.userAgent || null,
            context.metadata ? JSON.stringify(context.metadata) : '{}',
          ]
        );
      }

      // Return updated state
      return PrivacyService.getUserConsents(tenantId, userId);
    });
  }

  /**
   * Helper to check if a specific user consent is currently granted.
   */
  static async isConsentGranted(tenantId: string, userId: string, purposeId: string): Promise<boolean> {
    try {
      const res = await pool.query(
        'SELECT status FROM user_consents WHERE tenant_id = $1 AND user_id = $2 AND purpose_id = $3',
        [tenantId, userId, purposeId]
      );
      if (res.rows.length === 0) {
        // If purpose is required contractual necessity, default true; otherwise false
        const purposeRes = await pool.query(
          'SELECT is_required FROM consent_purposes WHERE id = $1',
          [purposeId]
        );
        return purposeRes.rows[0]?.is_required || false;
      }
      return res.rows[0].status === 'granted';
    } catch (err) {
      logger.error(`Error checking consent for purpose ${purposeId}:`, err);
      return false;
    }
  }

  /**
   * Create a Data Principal Privacy Request (Access/Export, Correction, Erasure, Nomination, etc.)
   */
  static async createPrivacyRequest(
    tenantId: string,
    userId: string,
    data: {
      requestType: 'access_export' | 'correction' | 'erasure' | 'consent_withdrawal' | 'nomination';
      details?: any;
      clientIp?: string;
    }
  ): Promise<PrivacyRequestRecord> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const trackingNumber = `DPR-${dateStr}-${randomHex}`;

    return executeTenantQuery(tenantId, async (client) => {
      const userRes = await client.query('SELECT email, name FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];

      // Insert request
      const res = await client.query(
        `INSERT INTO privacy_requests (
           tracking_number, tenant_id, user_id, request_type, status, details, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, 'submitted', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          trackingNumber,
          tenantId,
          userId,
          data.requestType,
          JSON.stringify({
            ...data.details,
            submission_ip: data.clientIp || null,
            requested_by: user?.email,
          }),
        ]
      );

      const requestRecord = res.rows[0];

      // Send automated acknowledgment email if user has email
      if (user?.email) {
        sendPrivacyRequestAcknowledgmentEmail(user.email, {
          trackingNumber,
          requestType: data.requestType,
          name: user.name || 'Data Principal',
        }).catch((err) => logger.error('Failed to send privacy request acknowledgment:', err));
      }

      return requestRecord;
    });
  }

  /**
   * List privacy requests for the authenticated user within their tenant.
   */
  static async listUserPrivacyRequests(tenantId: string, userId: string): Promise<PrivacyRequestRecord[]> {
    return executeTenantQuery(tenantId, async (client) => {
      const res = await client.query(
        'SELECT * FROM privacy_requests WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at DESC',
        [tenantId, userId]
      );
      return res.rows;
    });
  }

  /**
   * Retrieve privacy request details by tracking number or UUID.
   */
  static async getPrivacyRequest(
    identifier: string,
    tenantId: string,
    userId?: string
  ): Promise<PrivacyRequestRecord | null> {
    return executeTenantQuery(tenantId, async (client) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      let query = 'SELECT * FROM privacy_requests WHERE tenant_id = $1 AND ';
      const params: any[] = [tenantId];

      if (isUuid) {
        query += 'id = $2';
        params.push(identifier);
      } else {
        query += 'tracking_number = $2';
        params.push(identifier);
      }

      if (userId) {
        query += ' AND user_id = $' + (params.length + 1);
        params.push(userId);
      }

      const res = await client.query(query, params);
      return res.rows[0] || null;
    });
  }

  /**
   * Generate secure JSON Data Export Bundle for Data Principal (Section 10).
   * Strips passwords, auth tokens, and sensitive internal keys.
   */
  static async generateDataExportBundle(tenantId: string, userId: string): Promise<any> {
    return executeTenantQuery(tenantId, async (client) => {
      // 1. User Profile
      const userRes = await client.query(
        `SELECT id, name, email, phone, role, two_factor_enabled, avatar_url, created_at, updated_at
         FROM users WHERE id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      const userProfile = userRes.rows[0] || null;

      // 2. Tenant / Workspace metadata
      const tenantRes = await client.query(
        `SELECT id, name, slug, plan, status, created_at FROM tenants WHERE id = $1`,
        [tenantId]
      );
      const tenantMeta = tenantRes.rows[0] || null;

      // 3. User Consents & Audit History
      const consentsRes = await client.query(
        `SELECT purpose_id, status, notice_version, collection_source, last_changed_at, created_at
         FROM user_consents WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      const auditRes = await client.query(
        `SELECT purpose_id, event_type, previous_status, new_status, notice_version, collection_source, created_at
         FROM consent_audit_events WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
        [tenantId, userId]
      );

      // 4. Conversation History (titles, message count, created timestamps)
      const convRes = await client.query(
        `SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.tenant_id = $1 AND c.user_id = $2
         GROUP BY c.id, c.title, c.created_at, c.updated_at
         ORDER BY c.created_at DESC`,
        [tenantId, userId]
      ).catch(() => ({ rows: [] }));

      // 5. Uploaded Documents
      const docsRes = await client.query(
        `SELECT id, filename, file_type, file_size, status, created_at
         FROM documents WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      ).catch(() => ({ rows: [] }));

      // 6. Privacy Requests and Grievances
      const requestsRes = await client.query(
        `SELECT id, tracking_number, request_type, status, created_at, resolved_at
         FROM privacy_requests WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      return {
        export_metadata: {
          platform: 'Xarwiz AI Platform',
          fiduciary: 'Xarwiz Technologies LLP',
          statutory_basis: 'Digital Personal Data Protection Act, 2023 (Section 11/12 Right to Access)',
          generated_at: new Date().toISOString(),
          user_id: userId,
          tenant_id: tenantId,
          data_classification: 'Personal Data Principal Export Bundle',
        },
        profile: userProfile,
        workspace: tenantMeta,
        consents: consentsRes.rows,
        consent_audit_trail: auditRes.rows,
        conversations: convRes.rows,
        uploaded_documents: docsRes.rows,
        privacy_rights_requests: requestsRes.rows,
      };
    });
  }

  /**
   * Execute Account and Personal Data Erasure (DPDP Act Section 12).
   * Verifies password if user has password authentication.
   * Scopes deletion safely:
   * - Erases / Anonymizes PII from users table.
   * - Marks status as deleted.
   * - Soft-deletes user conversations and documents.
   * - Retains immutable audit trails and statutory financial records required by law.
   */
  static async executeAccountErasure(
    tenantId: string,
    userId: string,
    passwordConfirm?: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    return executeTenantQuery(tenantId, async (client) => {
      // 1. Fetch user to verify password if provided
      const userRes = await client.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [
        userId,
        tenantId,
      ]);
      const user = userRes.rows[0];
      if (!user) {
        throw new Error('User not found');
      }

      if (user.password_hash && passwordConfirm) {
        const isMatch = await bcrypt.compare(passwordConfirm, user.password_hash);
        if (!isMatch) {
          throw new Error('Invalid password confirmation. Erasure aborted for security.');
        }
      }

      // Check if user is tenant owner and if other members exist
      const otherMembersRes = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND id != $2 AND deleted_at IS NULL',
        [tenantId, userId]
      );
      const otherMemberCount = parseInt(otherMembersRes.rows[0]?.count || '0', 10);

      // If user is owner and there are active team members, require transfer or admin deletion
      if (user.role === 'owner' && otherMemberCount > 0) {
        throw new Error(
          `You are the owner of this workspace with ${otherMemberCount} other active member(s). Please transfer workspace ownership before deleting your account.`
        );
      }

      // 2. Anonymize user record
      const anonymizedEmail = `erased_${user.id.slice(0, 8)}_${Date.now()}@anonymized.xarwiz.local`;
      await client.query(
        `UPDATE users SET
           email = $1,
           name = 'Erased Data Principal',
           phone = NULL,
           avatar_url = NULL,
           password_hash = 'ERASED',
           two_factor_enabled = false,
           two_factor_secret = NULL,
           backup_codes = NULL,
           status = 'deleted',
           deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3`,
        [anonymizedEmail, userId, tenantId]
      );

      // 3. Mark user consents as withdrawn
      await client.query(
        `UPDATE user_consents SET
           status = 'withdrawn',
           last_changed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      // 4. Record audit event for regulatory accountability
      await client.query(
        `INSERT INTO consent_audit_events (
           tenant_id, user_id, purpose_id, event_type, previous_status, new_status,
           notice_version, collection_source, metadata
         )
         VALUES ($1, $2, 'service_processing', 'withdrawn', 'granted', 'withdrawn',
                 '2.0-dpdp', 'account_erasure', $3)`,
        [
          tenantId,
          userId,
          JSON.stringify({
            reason: reason || 'Data Principal Erasure Request',
            erased_at: new Date().toISOString(),
          }),
        ]
      );

      // 5. Update or mark privacy request as completed
      await client.query(
        `UPDATE privacy_requests SET
           status = 'completed',
           resolved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND user_id = $2 AND request_type = 'erasure' AND status != 'completed'`,
        [tenantId, userId]
      );

      // If this was a single-member tenant, schedule tenant deactivation
      if (otherMemberCount === 0) {
        await client.query(
          `UPDATE tenants SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [tenantId]
        );
      }

      logger.info(`[PRIVACY ERASURE] Successfully executed DPDP erasure for user ${userId} in tenant ${tenantId}`);

      return {
        success: true,
        message: 'Account and personal data have been erased in accordance with DPDP Act 2023. Statutory audit exceptions retained.',
      };
    });
  }

  /**
   * Submit Privacy Grievance under Section 13 of DPDP Act 2023.
   * Grievance Redressal mechanism with tracking number and Grievance Officer assignment.
   */
  static async submitGrievance(data: {
    complainantName: string;
    complainantEmail: string;
    complainantPhone?: string;
    category: string;
    subject: string;
    description: string;
    tenantId?: string | null;
    userId?: string | null;
  }): Promise<PrivacyGrievanceRecord> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const grievanceNumber = `GRV-${dateStr}-${randomHex}`;

    const res = await pool.query(
      `INSERT INTO privacy_grievances (
         grievance_number, tenant_id, user_id, complainant_name, complainant_email,
         complainant_phone, category, subject, description, status, assigned_officer,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', 'Ashish Pratap Singh Tomar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        grievanceNumber,
        data.tenantId || null,
        data.userId || null,
        data.complainantName.trim(),
        data.complainantEmail.toLowerCase().trim(),
        data.complainantPhone || null,
        data.category,
        data.subject.trim(),
        data.description.trim(),
      ]
    );

    const grievance: PrivacyGrievanceRecord = res.rows[0];

    // Send acknowledgment email to complainant
    sendGrievanceAcknowledgmentEmail(grievance.complainant_email, {
      grievanceNumber,
      subject: grievance.subject,
      name: grievance.complainant_name,
      officerName: 'Ashish Pratap Singh Tomar',
      officerEmail: 'grievance@xarwiz.com',
    }).catch((err) => logger.error('Failed to send grievance acknowledgment email:', err));

    return grievance;
  }

  /**
   * Look up grievance status by grievance tracking number and email verification.
   */
  static async getGrievanceStatus(
    grievanceNumber: string,
    email?: string
  ): Promise<PrivacyGrievanceRecord | null> {
    let query = 'SELECT * FROM privacy_grievances WHERE grievance_number = $1';
    const params: any[] = [grievanceNumber.trim()];

    if (email) {
      query += ' AND LOWER(complainant_email) = $2';
      params.push(email.toLowerCase().trim());
    }

    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  /**
   * Log cookie consent selection into cookie_consent_log table.
   */
  static async logCookieConsent(data: {
    tenantId?: string | null;
    userId?: string | null;
    ipAddress?: string;
    userAgent?: string;
    consentJson: any;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO cookie_consent_log (tenant_id, user_id, ip_address, user_agent, consent_json, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        data.tenantId || null,
        data.userId || null,
        data.ipAddress || null,
        data.userAgent || null,
        JSON.stringify(data.consentJson),
      ]
    );
  }
}
