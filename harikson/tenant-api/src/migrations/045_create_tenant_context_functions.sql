-- Create set_tenant_context and assert_tenant_context functions
-- These are called by scheduler.ts, context-builder.ts, and tools/executor.ts
-- but were never defined. They wrap set_config/current_setting for tenant isolation.

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    PERFORM set_config('app.current_tenant', '', true);
  ELSE
    PERFORM set_config('app.current_tenant', p_tenant_id, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assert_tenant_context()
RETURNS VOID AS $$
DECLARE
  v_tenant TEXT;
BEGIN
  v_tenant := NULLIF(current_setting('app.current_tenant', true), '');
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant context not set — call set_tenant_context() first';
  END IF;
END;
$$ LANGUAGE plpgsql;
