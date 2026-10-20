-- 074_fix_admin_analytics_and_system_metrics_schema.sql
-- Fix schema compatibility for Admin Panel live telemetry, system metrics, activity logs, and knowledge documents

-- 1. system_metrics
ALTER TABLE system_metrics 
ADD COLUMN IF NOT EXISTS gpu_vram_used_mb INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS gpu_vram_total_mb INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ram_used_mb INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ram_total_mb INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpu_percent INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS disk_used_gb INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS disk_total_gb INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_model VARCHAR(100) DEFAULT 'None',
ADD COLUMN IF NOT EXISTS vllm_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS tensor_parallel_size INT DEFAULT 1;

ALTER TABLE system_metrics ALTER COLUMN metric_name DROP NOT NULL;
ALTER TABLE system_metrics ALTER COLUMN metric_value DROP NOT NULL;

-- 2. ai_activity
ALTER TABLE ai_activity
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255) DEFAULT '/v1/chat/completions',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. knowledge_documents & knowledge_bases
ALTER TABLE knowledge_documents
ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

ALTER TABLE knowledge_bases
ADD COLUMN IF NOT EXISTS total_documents INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_bytes BIGINT DEFAULT 0;
