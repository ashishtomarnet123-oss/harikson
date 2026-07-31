-- Migration 033: knowledge_documents has been schema-broken since migration
-- 012 first created it with a minimal shape (id, tenant_id, title, content,
-- created_at). Migration 023 later tried to redeclare a fuller version with
-- filename/user_id/is_active/status/knowledge_base_id/file_path — but
-- `CREATE TABLE IF NOT EXISTS` is a full no-op when the table already
-- exists, it does not add the missing columns. So on any real database that
-- ran these migrations in order, none of those columns actually exist,
-- while RagService.indexFile/indexUrl (INSERT), document.routes.ts
-- (SELECT/UPDATE), and RagService.queryContext (SELECT) have all referenced
-- them since they were written. Document upload, listing, deletion, and RAG
-- retrieval have never worked end-to-end against a real database.
--
-- `title` was also declared NOT NULL in 012, but nothing in the application
-- code ever populates it (everything writes `filename` instead) — every
-- insert would additionally fail that constraint.

ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'processed';
-- Separate from is_active (which means "not deleted" for GET's WHERE
-- filter): this is the per-file "include in RAG retrieval" toggle the
-- Settings > My RAG Drive UI's "Active" checkbox controls, without removing
-- the file from the visible list the way is_active=false does.
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN NOT NULL DEFAULT true;

UPDATE knowledge_documents SET filename = title WHERE filename IS NULL AND title IS NOT NULL;
ALTER TABLE knowledge_documents ALTER COLUMN title DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
