-- Migration 063: Production-Ready DPDP Privacy Notice, Consent Management, and Data Principal Rights System
-- Compliant with India's Digital Personal Data Protection Act, 2023 (DPDP Act)

-- 1. Privacy Notices Versioning Table
CREATE TABLE IF NOT EXISTS privacy_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    summary TEXT,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'published', -- 'draft', 'published', 'archived'
    published_by VARCHAR(255) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_privacy_notices_version ON privacy_notices(version);
CREATE INDEX IF NOT EXISTS idx_privacy_notices_status ON privacy_notices(status);

-- Seed initial official published notice (v2.0-dpdp) and legacy baseline (v1.0)
INSERT INTO privacy_notices (version, title, effective_date, summary, content_json, status, published_by)
VALUES 
(
  '1.0',
  'Xarwiz Initial Privacy Policy',
  '2026-01-01 00:00:00+05:30',
  'Initial baseline privacy notice for Xarwiz AI platform.',
  '{"version": "1.0", "notes": "Legacy baseline"}'::jsonb,
  'archived',
  'System'
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO privacy_notices (version, title, effective_date, summary, content_json, status, published_by)
VALUES 
(
  '2.0-dpdp',
  'Xarwiz Privacy Policy & Data Protection Notice (DPDP 2023)',
  '2026-10-16 00:00:00+05:30',
  'Production DPDP Act 2023 compliant privacy notice covering data fiduciary duties, purpose-specific processing, AI model isolation, Indian data localization, data principal rights, and grievance redressal.',
  '{
    "version": "2.0-dpdp",
    "entity": "Xarwiz Technologies LLP",
    "address": "House No 2, Sai Dham Colony, DD Nagar, Gwalior, Madhya Pradesh - 474005, India",
    "grievance_officer": "Ashish Pratap Singh Tomar",
    "grievance_email": "grievance@xarwiz.com",
    "privacy_email": "privacy@xarwiz.com",
    "data_localization": "India",
    "security_standards": "AES-256 at rest, TLS 1.3 in transit, PostgreSQL RLS tenant segregation"
  }'::jsonb,
  'published',
  'Compliance Officer'
)
ON CONFLICT (version) DO NOTHING;


-- 2. Purpose-Based Consent Master Table
CREATE TABLE IF NOT EXISTS consent_purposes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    legal_basis VARCHAR(100) NOT NULL, -- 'contractual_necessity', 'consent', 'legal_obligation', 'legitimate_uses'
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_optional BOOLEAN NOT NULL DEFAULT true,
    consent_wording TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '2.0-dpdp',
    withdrawal_behavior TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed core processing purposes with appropriate lawful bases under DPDP Act 2023
INSERT INTO consent_purposes (id, name, description, legal_basis, is_required, is_optional, consent_wording, version, withdrawal_behavior)
VALUES
(
  'service_processing',
  'Core Service & Workspace Operation',
  'Processing necessary to authenticate accounts, operate workspaces, execute chat queries, and secure your account.',
  'contractual_necessity',
  true,
  false,
  'Required to operate your workspace, authenticate sessions, and deliver the Xarwiz AI services requested.',
  '2.0-dpdp',
  'Cannot be withdrawn while maintaining an active account. Account deletion required to cease core service processing.'
),
(
  'marketing_emails',
  'Promotional & Educational Communications',
  'Optional emails regarding new AI model releases, discount offers, feature webinars, and platform insights.',
  'consent',
  false,
  true,
  'I agree to receive optional promotional updates, feature announcements, and marketing emails from Xarwiz.',
  '2.0-dpdp',
  'Can be withdrawn at any time in Privacy Settings. Immediate suppression from promotional mailing lists.'
),
(
  'product_updates',
  'Changelog & Operational Product Announcements',
  'Non-promotional announcements regarding system upgrades, scheduled maintenance, and security advisories.',
  'legitimate_uses',
  false,
  true,
  'Keep me informed about critical product updates, deprecation warnings, and system release notes.',
  '2.0-dpdp',
  'Can be disabled in user preferences while maintaining security and billing operational alerts.'
),
(
  'analytics',
  'Diagnostic Telemetry & Platform Optimization',
  'Aggregated latency, token consumption patterns, and diagnostic logs to troubleshoot inference speed.',
  'consent',
  false,
  true,
  'Allow anonymized operational metrics and performance diagnostic logs to help improve platform reliability.',
  '2.0-dpdp',
  'Can be disabled at any time. Ceases client-side and session performance telemetry recording.'
),
(
  'third_party_ai_processing',
  'External AI Model Inference',
  'Routing prompts and queries to configured external AI model providers when selected by tenant administrators.',
  'consent',
  false,
  true,
  'Authorize routing prompts to external AI model providers configured for your workspace.',
  '2.0-dpdp',
  'Can be toggled. Restricts inference strictly to locally-hosted open-source Ollama models within India.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  legal_basis = EXCLUDED.legal_basis,
  is_required = EXCLUDED.is_required,
  is_optional = EXCLUDED.is_optional,
  consent_wording = EXCLUDED.consent_wording,
  withdrawal_behavior = EXCLUDED.withdrawal_behavior;


-- 3. Active User Consents Table (Current state per user/tenant/purpose)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose_id VARCHAR(100) NOT NULL REFERENCES consent_purposes(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'granted', 'declined', 'withdrawn', 'superseded'
    notice_version VARCHAR(50) NOT NULL DEFAULT '2.0-dpdp',
    collection_source VARCHAR(100) NOT NULL DEFAULT 'privacy_settings', -- 'signup', 'privacy_settings', 'cookie_banner', 'feature_prompt', 'api'
    valid_until TIMESTAMP WITH TIME ZONE,
    last_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_tenant_purpose UNIQUE (tenant_id, user_id, purpose_id)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_tenant_user ON user_consents(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_purpose ON user_consents(purpose_id);

-- Enable & Force RLS for multi-tenant isolation
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_user_consents ON user_consents;
CREATE POLICY tenant_isolation_user_consents ON user_consents
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);


-- 4. Immutable Append-Only Consent Audit Trail
CREATE TABLE IF NOT EXISTS consent_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'requested', 'granted', 'declined', 'withdrawn', 'superseded', 'reconsent_required'
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notice_version VARCHAR(50) NOT NULL,
    collection_source VARCHAR(100) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_user ON consent_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_tenant_user ON consent_audit_events(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_created ON consent_audit_events(created_at DESC);

ALTER TABLE consent_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_consent_audit_events ON consent_audit_events;
CREATE POLICY tenant_isolation_consent_audit_events ON consent_audit_events
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);


-- 5. Data Principal Rights Requests Workflow Table
CREATE TABLE IF NOT EXISTS privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. DPR-20261016-1234
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'access_export', 'correction', 'erasure', 'consent_withdrawal', 'nomination', 'grievance'
    status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- 'submitted', 'identity_verification', 'under_review', 'awaiting_information', 'approved', 'rejected_with_reason', 'completed', 'closed'
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    rejection_reason TEXT,
    export_file_url TEXT,
    export_expires_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_tracking ON privacy_requests(tracking_number);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_tenant ON privacy_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);

ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_privacy_requests ON privacy_requests;
CREATE POLICY tenant_isolation_privacy_requests ON privacy_requests
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);


-- 6. Privacy Grievances Table (Section 13 DPDP Act 2023)
CREATE TABLE IF NOT EXISTS privacy_grievances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grievance_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. GRV-20261016-5678
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    complainant_name VARCHAR(255) NOT NULL,
    complainant_email VARCHAR(255) NOT NULL,
    complainant_phone VARCHAR(50),
    category VARCHAR(100) NOT NULL, -- 'unauthorized_processing', 'consent_violation', 'delayed_erasure', 'data_inaccuracy', 'security_concern', 'other'
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- 'submitted', 'acknowledged', 'investigating', 'resolved', 'dismissed_with_reason'
    assigned_officer VARCHAR(255) DEFAULT 'Ashish Pratap Singh Tomar',
    resolution_notes TEXT,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_privacy_grievances_num ON privacy_grievances(grievance_number);
CREATE INDEX IF NOT EXISTS idx_privacy_grievances_email ON privacy_grievances(complainant_email);
CREATE INDEX IF NOT EXISTS idx_privacy_grievances_status ON privacy_grievances(status);


-- 7. Add tenant_id to cookie_consent_log if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cookie_consent_log' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE cookie_consent_log ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
END $$;
