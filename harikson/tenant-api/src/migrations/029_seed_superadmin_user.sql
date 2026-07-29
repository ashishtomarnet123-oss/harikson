-- Migration 029: Seed superadmin user credentials and disable force_password_change
INSERT INTO tenants (id, name, slug, plan, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'System Admin Services', 'system', 'ENTERPRISE', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash, role, force_password_change)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@harikson.ai',
    '$2b$10$OODNgUovGx1N9FYGXHVFqOhM1TfdSoFBHGWJ2qtm3ESudIYIuk.JW',
    'superadmin',
    FALSE
)
ON CONFLICT (tenant_id, email) DO UPDATE SET 
    password_hash = '$2b$10$OODNgUovGx1N9FYGXHVFqOhM1TfdSoFBHGWJ2qtm3ESudIYIuk.JW',
    force_password_change = FALSE;

INSERT INTO users (id, tenant_id, email, password_hash, role, force_password_change)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'admin@neuravolt.cloud',
    '$2b$10$OODNgUovGx1N9FYGXHVFqOhM1TfdSoFBHGWJ2qtm3ESudIYIuk.JW',
    'superadmin',
    FALSE
)
ON CONFLICT (tenant_id, email) DO UPDATE SET 
    password_hash = '$2b$10$OODNgUovGx1N9FYGXHVFqOhM1TfdSoFBHGWJ2qtm3ESudIYIuk.JW',
    force_password_change = FALSE;
