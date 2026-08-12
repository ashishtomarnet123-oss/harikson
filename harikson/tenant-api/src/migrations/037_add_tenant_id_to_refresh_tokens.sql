-- Migration 037: refresh_tokens is missing tenant_id
--
-- auth.routes.ts's login handler has always inserted a tenant_id value
-- into refresh_tokens, but no committed migration (009_add_refresh_token_family.sql,
-- which created the table, or 010_add_device_binding_to_refresh_tokens.sql)
-- ever added the column. It must have existed on the old production server
-- via an untracked manual ALTER TABLE. A brand-new database (fresh server
-- migration) exposed this: every login INSERT failed with "column
-- tenant_id does not exist", returning 500 on POST /api/auth/login.

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_id ON refresh_tokens(tenant_id);
