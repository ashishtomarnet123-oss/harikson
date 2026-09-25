# Xarwiz Workflow Engine — Troubleshooting & Common Issues Guide

## 1. Graph Validation Failures

### Issue: "Graph contains a circular dependency (cycle)"
- **Cause**: Node A points to Node B, which eventually points back to Node A.
- **Resolution**: Workflows must be strictly acyclic (DAG). For iterative loops, use the dedicated `logic.loop` node which iterates over array items rather than creating edge cycles.

### Issue: "At least one trigger node is required"
- **Cause**: The graph contains only action or logic nodes without a trigger.
- **Resolution**: Add a `trigger.manual`, `trigger.webhook`, or `trigger.cron` node to serve as the workflow entrypoint.

---

## 2. Execution Timeouts & Deadlocks

### Issue: "Node execution timed out after 30000ms"
- **Cause**: An external LLM or HTTP request took longer than the configured timeout.
- **Resolution**: Increase `timeoutMs` in the node inspector, or check target API health.

### Issue: "SSRF validation failed: IP address is restricted"
- **Cause**: An `integration.http` node attempted to request a private subnet (RFC-1918), `localhost`, or internal Docker service.
- **Resolution**: Outbound HTTP requests to internal private infrastructure are disallowed by security policy. Provide a public URL or proxy endpoint.

---

## 3. Credential Decryption Errors

### Issue: "Invalid encrypted credential payload format"
- **Cause**: Database record corrupted or encrypted with a different master key.
- **Resolution**: Ensure `WORKFLOW_CREDENTIAL_KEY` or `TENANT_MASTER_KEY` environment variables are preserved consistently across container deployments.
