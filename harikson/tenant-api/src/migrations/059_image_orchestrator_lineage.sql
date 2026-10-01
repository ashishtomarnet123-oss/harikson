-- Migration 059: Image Orchestrator Lineage, Attachments, and Multi-turn Edit History
-- Adds parent_image_id, source_image_id, generation_type, reference_image_url, and mask_url
-- to enable recursive conversational image editing, lineage trees, and attachment tracking.

DO $$
BEGIN
    -- 1. Add parent_image_id (points to previous image in the edit chain)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generations' AND column_name = 'parent_image_id'
    ) THEN
        ALTER TABLE image_generations 
        ADD COLUMN parent_image_id UUID REFERENCES image_generations(id) ON DELETE SET NULL;
    END IF;

    -- 2. Add source_image_id (points to root/original generation or uploaded asset)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generations' AND column_name = 'source_image_id'
    ) THEN
        ALTER TABLE image_generations 
        ADD COLUMN source_image_id UUID REFERENCES image_generations(id) ON DELETE SET NULL;
    END IF;

    -- 3. Add generation_type: 'generate' | 'edit' | 'variation' | 'uploaded' | 'analysis'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generations' AND column_name = 'generation_type'
    ) THEN
        ALTER TABLE image_generations 
        ADD COLUMN generation_type VARCHAR(32) NOT NULL DEFAULT 'generate';
    END IF;

    -- 4. Add reference_image_url (URL of source image for img2img / edits)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generations' AND column_name = 'reference_image_url'
    ) THEN
        ALTER TABLE image_generations 
        ADD COLUMN reference_image_url TEXT;
    END IF;

    -- 5. Add mask_url (URL of inpainting/mask asset if provided)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generations' AND column_name = 'mask_url'
    ) THEN
        ALTER TABLE image_generations 
        ADD COLUMN mask_url TEXT;
    END IF;
END $$;

-- Indexes for lightning-fast conversation and lineage traversal
CREATE INDEX IF NOT EXISTS idx_img_gen_parent 
    ON image_generations(tenant_id, parent_image_id);
CREATE INDEX IF NOT EXISTS idx_img_gen_conv_created 
    ON image_generations(tenant_id, conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_img_gen_type 
    ON image_generations(tenant_id, generation_type);
