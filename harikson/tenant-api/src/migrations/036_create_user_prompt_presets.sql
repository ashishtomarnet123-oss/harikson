-- Migration 036: Real persistence for the Prompt Library ("Custom Agents")
-- feature. The frontend (SettingsModal.js PromptLibrarySettings + chat.js
-- model selector) already called GET/POST/DELETE /api/v1/user/presets,
-- but no route or table backed it, so every call 404'd.

CREATE TABLE IF NOT EXISTS user_prompt_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_prompt_presets_user ON user_prompt_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompt_presets_tenant ON user_prompt_presets(tenant_id);
