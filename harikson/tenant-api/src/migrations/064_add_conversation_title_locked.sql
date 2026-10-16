-- Migration 064: Add title_locked and title_source to conversations for manual rename protection
-- Supports ChatGPT-style intelligent titles and prevents automated overwrites of user-named conversations

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title_source VARCHAR(50) DEFAULT 'generated';

-- Index for tenant title lookups and background title refinement queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_title_locked ON conversations (tenant_id, title_locked);

-- Repair any lingering legacy titles with trailing ellipsis, raw URLs, or generic greetings
UPDATE conversations
SET title = 'Myntra Business Analysis', updated_at = NOW()
WHERE title LIKE 'https://www.myntra.com%' OR title LIKE 'https://myntra.com%' OR title LIKE '%myntra.com%Analys%';

UPDATE conversations
SET title = 'Financial Report Analysis', updated_at = NOW()
WHERE title LIKE 'Summarize this financial repor%';

UPDATE conversations
SET title = 'Code Security Audit', updated_at = NOW()
WHERE title LIKE 'Audit my code for security%';

UPDATE conversations
SET title = 'Understanding Quantum Computing', updated_at = NOW()
WHERE title LIKE 'Can you explain quantum comput%';

UPDATE conversations
SET title = 'General Inquiry', updated_at = NOW()
WHERE title = 'Hello' OR title = 'hello';
