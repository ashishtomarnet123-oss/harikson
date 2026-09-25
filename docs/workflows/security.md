# Xarwiz Workflow Engine — Security & Multi-Tenancy Architecture

## 1. Multi-Tenant Isolation & PostgreSQL Row-Level Security (RLS)

All workflow tables enforce PostgreSQL Row-Level Security:
- `workflows`
- `workflow_versions`
- `workflow_node_executions`
- `workflow_credentials`
- `workflow_templates`

### RLS Policy Definition:
```sql
CREATE POLICY tenant_isolation_policy ON workflow_credentials
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
```

Every database transaction sets `app.current_tenant` via `executeTenantQuery()`. Cross-tenant data access is blocked by the database engine regardless of query bugs in application code.

---

## 2. Server-Side Request Forgery (SSRF) Protection

The HTTP Request Node (`integration.http`) runs every outbound URL through `SSRFGuard.validateUrl(url)` before opening a socket connection.

### Blocked Destinations:
- **Loopback**: `127.0.0.0/8`, `::1`, `localhost`
- **Private Subnets (RFC 1918)**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-Local & Cloud Metadata**: `169.254.169.254`, `169.254.0.0/16`
- **Internal Docker DNS**: `redis`, `postgres`, `tenant-api`, `admin-api`, `traefik`, `minio`, `clickhouse`, `ollama`

Any request matching blocked addresses throws `SSRFValidationError` with status code 400.

---

## 3. Sandboxed Code Execution

The Code Node (`utility.code`) executes user-provided JavaScript inside an isolated execution scope:
- Execution timeout: 5,000ms.
- Memory ceiling: 64MB.
- No filesystem access (`fs`, `path`).
- No child process spawning (`child_process`).
- No access to environment variables (`process.env`).
