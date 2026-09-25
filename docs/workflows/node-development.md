# Xarwiz Workflow Engine — Node Development SDK & Security

## 1. Node Development SDK

All workflow nodes implement the `INodeHandler` interface defined in `src/services/workflow/types.ts`:

```typescript
import {
  INodeHandler,
  INodeInput,
  INodeOutput,
  IValidationResult,
  IWorkflowExecutionContext
} from '../types.js';

export const CustomIntegrationNode: INodeHandler = {
  metadata: {
    type: 'integration.custom',
    version: 1,
    name: 'Custom Service',
    description: 'Connects to a custom external service',
    category: 'integration',
    icon: 'Plug',
    color: '#6366F1',
    supportedCredentials: ['api_key', 'bearer_token'],
  },

  validate(config: any): IValidationResult {
    if (!config?.endpoint) {
      return {
        valid: false,
        errors: [{ field: 'endpoint', message: 'Endpoint is required' }],
      };
    }
    return { valid: true, errors: [] };
  },

  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    // 1. Interpolate variables safely
    const endpoint = ExpressionEngine.interpolate(input.config.endpoint, context);

    // 2. Resolve credentials if bound
    const credentialId = input.config.credentialId;
    if (credentialId) {
      const secret = await CredentialService.resolveCredentialSecret(context.tenantId, credentialId);
      // use secret.apiKey, secret.token, etc.
    }

    // 3. Execute logic and return structured output
    return {
      status: 'success',
      data: { result: 'ok', timestamp: new Date().toISOString() },
    };
  }
};
```

To register a custom node, simply register it into `NodeRegistry`:
```typescript
NodeRegistry.register(CustomIntegrationNode);
```

---

## 2. Security Architecture

### A. SSRF Protection (`SSRFGuard`)
Located at `src/services/workflow/security/ssrf.ts`.
- Outbound requests from the `integration.http` node are validated before any socket connection is opened.
- Disallowed targets:
  - Loopback (`127.0.0.0/8`)
  - RFC-1918 Private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Cloud provider metadata IP (`169.254.169.254`)
  - Internal Docker container hostnames (`postgres`, `redis`, `traefik`, `ollama`, `admin-api`, `tenant-api`)

### B. Credential Encryption (`CredentialService`)
Located at `src/services/workflow/credential.service.ts`.
- Secrets are encrypted using **AES-256-GCM** with unique initialization vectors (IV) and authentication tags.
- Secrets are never returned to client APIs or exposed in workflow JSON definitions.
- The workflow canvas only stores a reference: `{"credentialId": "uuid"}`.
- Decryption occurs only in memory inside backend execution workers.

### C. Multi-Tenant Row Level Security (RLS)
- Every table (`workflows`, `workflow_versions`, `workflow_executions`, `workflow_node_executions`, `workflow_credentials`) enforces PostgreSQL Row-Level Security:
  ```sql
  ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE workflow_versions FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_policy ON workflow_versions
      FOR ALL
      USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
  ```
- All database operations route through `executeTenantQuery(tenantId, callback)` which applies transaction-scoped tenant identity (`SET LOCAL app.current_tenant = $1`).

### D. Sandboxed Code Execution
- The custom code node executes in a restricted JavaScript context where dangerous Node.js globals (`process`, `require`, `fs`, `child_process`, `eval`) are completely omitted.
