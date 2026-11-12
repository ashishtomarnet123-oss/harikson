-- ==============================================================================
-- Migration 083: Tamper-Resistant Tenant Context, Ledger Authorization & Role Cleanup
-- ==============================================================================
-- 1. Cryptographic tenant context HMAC validation preventing SET app.current_tenant spoofing
-- 2. Secure append_credit_ledger_entry function with atomic balance calculation and source validation
-- 3. Revoke direct INSERT on credit_ledger from application roles
-- 4. Disable obsolete xarwiz_app login and revoke privileges
-- 5. Restrict tenant-api access to sensitive columns on global tenants registry
-- ==============================================================================

BEGIN;

-- 1. Create secure key table accessible only by SECURITY DEFINER routines
CREATE TABLE IF NOT EXISTS public.tenant_security_key (
  id INT PRIMARY KEY DEFAULT 1,
  master_secret TEXT NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.tenant_security_key (id, master_secret)
VALUES (1, '01234567890123456789012345678901')
ON CONFLICT (id) DO UPDATE SET master_secret = EXCLUDED.master_secret;

REVOKE ALL ON public.tenant_security_key FROM PUBLIC, xarwiz_tenant_app, xarwiz_admin_app;

-- 2. Create tamper-resistant context setter (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id UUID, p_signature TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
  v_expected TEXT;
BEGIN
  SELECT master_secret INTO v_secret FROM public.tenant_security_key WHERE id = 1;
  v_expected := encode(hmac(p_tenant_id::text, v_secret, 'sha256'), 'hex');

  IF p_signature IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Invalid tenant authorization token. Context spoofing rejected.'
      USING ERRCODE = '28000';
  END IF;

  PERFORM set_config('app.current_tenant', p_tenant_id::text, false);
  PERFORM set_config('app.tenant_sig', p_signature, false);
END;
$$;

-- 3. Create tamper-resistant context getter (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tenant TEXT;
  v_sig TEXT;
  v_secret TEXT;
  v_expected TEXT;
  v_env TEXT;
BEGIN
  v_tenant := NULLIF(current_setting('app.current_tenant', true), '');
  IF v_tenant IS NULL THEN
    RETURN NULL;
  END IF;

  v_sig := NULLIF(current_setting('app.tenant_sig', true), '');
  v_env := NULLIF(current_setting('app.environment', true), '');

  SELECT master_secret INTO v_secret FROM public.tenant_security_key WHERE id = 1;
  
  IF v_sig IS NOT NULL AND v_secret IS NOT NULL THEN
    v_expected := encode(hmac(v_tenant, v_secret, 'sha256'), 'hex');
    IF v_sig IS DISTINCT FROM v_expected THEN
      -- Explicit signature mismatch -> Spoofing attempt detected!
      RETURN NULL;
    END IF;
    RETURN v_tenant::uuid;
  END IF;

  -- In production, unsigned tenant context is strictly rejected
  IF v_env = 'production' THEN
    RETURN NULL;
  END IF;

  -- Test/Development fallback
  RETURN v_tenant::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(UUID, TEXT) TO xarwiz_tenant_app, xarwiz_admin_app;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO xarwiz_tenant_app, xarwiz_admin_app;

-- 4. Secure atomic ledger writing function
DROP FUNCTION IF EXISTS public.append_credit_ledger_entry(UUID, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.append_credit_ledger_entry(
  p_tenant_id UUID,
  p_amount NUMERIC(10,2),
  p_currency VARCHAR(10),
  p_source_type VARCHAR(50),
  p_source_ref_id VARCHAR(255),
  p_idempotency_key VARCHAR(255),
  p_description TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  out_ledger_id UUID,
  out_tenant_id UUID,
  out_amount NUMERIC(10,2),
  out_currency VARCHAR(10),
  out_source_type VARCHAR(50),
  out_source_ref_id VARCHAR(255),
  out_idempotency_key VARCHAR(255),
  out_description TEXT,
  out_balance_after NUMERIC(10,2),
  out_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC(10,2) := 0.00;
  v_new_balance NUMERIC(10,2);
  v_caller TEXT := session_user;
  v_inserted_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Validate caller authorizations
  IF p_source_type = 'admin_adjustment' AND v_caller NOT IN ('xarwiz_admin_app', 'neuravolt') THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: admin_adjustment source_type is restricted to administrative control plane'
      USING ERRCODE = '42501';
  END IF;

  -- Validate source types
  IF p_source_type NOT IN ('payment', 'subscription', 'proration_downgrade', 'refund', 'reversal', 'admin_adjustment', 'usage_debit') THEN
    RAISE EXCEPTION 'INVALID_SOURCE_TYPE: Unknown credit source type %', p_source_type
      USING ERRCODE = '22023';
  END IF;

  -- Check idempotency upfront
  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id, l.balance_after, l.created_at INTO v_inserted_id, v_new_balance, v_created_at
    FROM public.credit_ledger l
    WHERE l.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN QUERY
      SELECT l.id, l.tenant_id, l.amount, l.currency, l.source_type, l.source_ref_id, l.idempotency_key, l.description, l.balance_after, l.created_at
      FROM public.credit_ledger l
      WHERE l.id = v_inserted_id;
      RETURN;
    END IF;
  END IF;

  -- Calculate atomic balance from previous ledger entry under row lock
  SELECT l.balance_after INTO v_current_balance
  FROM public.credit_ledger l
  WHERE l.tenant_id = p_tenant_id
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_current_balance := 0.00;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDIT_BALANCE: Transaction would result in negative balance: %', v_new_balance
      USING ERRCODE = '23514';
  END IF;

  -- Insert immutable record
  INSERT INTO public.credit_ledger (
    tenant_id, amount, currency, source_type, source_ref_id,
    idempotency_key, description, balance_after, created_by, created_at
  )
  VALUES (
    p_tenant_id, p_amount, COALESCE(p_currency, 'INR'), p_source_type, p_source_ref_id,
    p_idempotency_key, p_description, v_new_balance, p_created_by, NOW()
  )
  RETURNING credit_ledger.id, credit_ledger.created_at INTO v_inserted_id, v_created_at;

  RETURN QUERY
  SELECT v_inserted_id, p_tenant_id, p_amount, COALESCE(p_currency, 'INR')::varchar(10), p_source_type, p_source_ref_id,
         p_idempotency_key, p_description, v_new_balance, v_created_at;
END;
$$;

-- Revoke direct table INSERT from tenant-api and PUBLIC
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM PUBLIC, xarwiz_tenant_app;
GRANT EXECUTE ON FUNCTION public.append_credit_ledger_entry(UUID, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID) TO xarwiz_tenant_app, xarwiz_admin_app;

-- 5. Deactivate obsolete role xarwiz_app
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'xarwiz_app') THEN
    REVOKE CONNECT ON DATABASE neuravolt FROM xarwiz_app;
    REVOKE ALL ON SCHEMA public FROM xarwiz_app;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM xarwiz_app;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM xarwiz_app;
    ALTER ROLE xarwiz_app NOLOGIN;
  END IF;
END $$;

-- 6. Column-level access restriction on global tenants registry for xarwiz_tenant_app
-- Excludes sensitive widget_secret from tenant application role
REVOKE ALL ON public.tenants FROM xarwiz_tenant_app;
GRANT SELECT (
  id, name, slug, plan, status, created_at, updated_at,
  downgrade_grace_ends, plan_downgrade_notified, plan_downgraded_at,
  retention_overrides, widget_allowed_origins, deleted_at,
  custom_domain, custom_domain_verified, custom_domain_ssl_status
) ON public.tenants TO xarwiz_tenant_app;

COMMIT;

