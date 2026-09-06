-- Migration 039: Add RLS policies to core tenant-scoped tables.
-- These tables previously relied on WHERE clauses for tenant filtering.
-- RLS provides a safety net so a missing WHERE never leaks cross-tenant data.

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_messages ON messages;
CREATE POLICY tenant_isolation_messages ON messages
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_conversations ON conversations;
CREATE POLICY tenant_isolation_conversations ON conversations
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_agents ON agents;
CREATE POLICY tenant_isolation_agents ON agents
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- knowledge_documents
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_knowledge_documents ON knowledge_documents;
CREATE POLICY tenant_isolation_knowledge_documents ON knowledge_documents
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
