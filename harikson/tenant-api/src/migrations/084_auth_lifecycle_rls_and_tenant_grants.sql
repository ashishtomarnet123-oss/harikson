-- ==============================================================================
-- Migration 084: Authentication Lifecycle RLS Bootstrap & Tenant Grants
-- ==============================================================================
-- 1. Grant table-level SELECT on public.tenants to xarwiz_tenant_app
--    (Required for tenant resolution middleware executing SELECT * FROM tenants)
-- 2. Update RLS policies on pre-auth lifecycle tables:
--    - users: Allows unauthenticated lookup by email during login, register duplicate check,
--             and password reset, while enforcing tenant isolation once context is established.
--    - refresh_tokens: Allows unauthenticated token issuance and rotation.
--    - password_reset_tokens: Allows unauthenticated token lookup and verification.
--    - oauth_states: Allows unauthenticated OAuth state validation.
--    - user_passkeys: Allows unauthenticated passkey lookup.
-- ==============================================================================

BEGIN;

-- 1. Tenants table SELECT grant
GRANT SELECT ON public.tenants TO xarwiz_tenant_app;

-- 2. users
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.users;
CREATE POLICY tenant_isolation_tenant_app ON public.users
  FOR ALL TO xarwiz_tenant_app
  USING (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );

-- 3. refresh_tokens
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.refresh_tokens;
CREATE POLICY tenant_isolation_tenant_app ON public.refresh_tokens
  FOR ALL TO xarwiz_tenant_app
  USING (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );

-- 4. password_reset_tokens
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.password_reset_tokens;
DROP POLICY IF EXISTS tenant_isolation_password_reset_tokens ON public.password_reset_tokens;
CREATE POLICY tenant_isolation_tenant_app ON public.password_reset_tokens
  FOR ALL TO xarwiz_tenant_app
  USING (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );

-- 5. oauth_states
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.oauth_states;
DROP POLICY IF EXISTS tenant_isolation_oauth_states ON public.oauth_states;
CREATE POLICY tenant_isolation_tenant_app ON public.oauth_states
  FOR ALL TO xarwiz_tenant_app
  USING (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );

-- 6. user_passkeys
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.user_passkeys;
DROP POLICY IF EXISTS tenant_isolation_user_passkeys ON public.user_passkeys;
CREATE POLICY tenant_isolation_tenant_app ON public.user_passkeys
  FOR ALL TO xarwiz_tenant_app
  USING (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );

COMMIT;
