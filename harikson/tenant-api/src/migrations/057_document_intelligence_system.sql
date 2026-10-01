-- Migration 057: Upgrade to Document Intelligence System
-- Adds document collections, structured metadata, semantic page/section metadata,
-- document classification, and processing pipeline state tracking.

-- 1. Create document_collections table
CREATE TABLE IF NOT EXISTS document_collections (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
    name                 VARCHAR(255) NOT NULL,
    description          TEXT,
    color                VARCHAR(50) DEFAULT '#2563EB',
    icon                 VARCHAR(50) DEFAULT 'folder',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for document_collections
ALTER TABLE document_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_collections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_document_collections ON document_collections;
CREATE POLICY tenant_isolation_document_collections ON document_collections
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

CREATE INDEX IF NOT EXISTS idx_doc_collections_tenant_user
    ON document_collections (tenant_id, user_id);

-- 2. Extend knowledge_documents with intelligence attributes
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES document_collections(id) ON DELETE SET NULL;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS structure JSONB DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS page_count INT DEFAULT 1;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS word_count INT DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100) DEFAULT 'general';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS processing_step VARCHAR(50) DEFAULT 'completed';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_collection ON knowledge_documents(tenant_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_type ON knowledge_documents(tenant_id, document_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_hash ON knowledge_documents(tenant_id, content_hash);

-- 3. Extend document_embeddings with chunk-level semantic metadata (page_number, section, heading)
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_metadata ON document_embeddings USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_doc_tenant ON document_embeddings (tenant_id, knowledge_document_id);
