-- Migration 077: Secure Password Reset Token Consumption Function
-- Resolves RLS restriction under least-privilege non-superuser application roles.
-- Ensures token validation, expiry verification, password update, and session revocation
-- execute atomically within a single SECURITY DEFINER transaction.

CREATE OR REPLACE FUNCTION public.consume_password_reset_token(
    p_token_hash text,
    p_new_password_hash text
)
RETURNS TABLE (
    out_success boolean,
    out_user_id uuid,
    out_tenant_id uuid,
    out_error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token_id uuid;
    v_tenant_id uuid;
    v_user_id uuid;
    v_expires_at timestamptz;
    v_used_at timestamptz;
    v_user_status text;
BEGIN
    -- 1. Locate and lock token record to prevent race conditions
    SELECT id, tenant_id, user_id, expires_at, used_at
    INTO v_token_id, v_tenant_id, v_user_id, v_expires_at, v_used_at
    FROM public.password_reset_tokens
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'INVALID_TOKEN'::text;
        RETURN;
    END IF;

    -- 2. Verify token is unused
    IF v_used_at IS NOT NULL THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'TOKEN_ALREADY_USED'::text;
        RETURN;
    END IF;

    -- 3. Verify token has not expired
    IF v_expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'TOKEN_EXPIRED'::text;
        RETURN;
    END IF;

    -- 4. Verify user exists and is active (prevents reactivation of disabled/suspended users)
    SELECT status INTO v_user_status
    FROM public.users
    WHERE id = v_user_id AND tenant_id = v_tenant_id;

    IF NOT FOUND OR v_user_status != 'active' THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'USER_INELIGIBLE'::text;
        RETURN;
    END IF;

    -- 5. Atomically mark token used
    UPDATE public.password_reset_tokens
    SET used_at = NOW()
    WHERE id = v_token_id;

    -- 6. Update user password and clear any forced-change flags
    UPDATE public.users
    SET password_hash = p_new_password_hash,
        must_change_password = false,
        force_password_change = false,
        updated_at = NOW()
    WHERE id = v_user_id AND tenant_id = v_tenant_id;

    -- 7. Revoke all active refresh tokens for the user
    DELETE FROM public.refresh_tokens
    WHERE user_id = v_user_id;

    -- 8. Return success with user and tenant IDs
    RETURN QUERY SELECT true, v_user_id, v_tenant_id, NULL::text;
END;
$$;

-- Restrict function execution permissions to authorized roles only
REVOKE ALL ON FUNCTION public.consume_password_reset_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(text, text) TO neuravolt;
