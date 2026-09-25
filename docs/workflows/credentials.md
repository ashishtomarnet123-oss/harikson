# Xarwiz Workflow Engine — Credential Management Reference

## 1. Overview

Credentials in Xarwiz are isolated per-tenant, encrypted at rest using **AES-256-GCM**, and never exposed in plaintext over HTTP APIs or UI responses.

---

## 2. Encryption Scheme

- **Algorithm**: `AES-256-GCM` with authenticated data tag.
- **Key Derivation**: SHA-256 derived from `WORKFLOW_CREDENTIAL_KEY` or `TENANT_MASTER_KEY`.
- **Payload Format**: `iv:authTag:ciphertext` stored in PostgreSQL column `workflow_credentials.encrypted_data`.
- **Masked Previews**: Previews (e.g. `sk-p...90ab` or `••••••••`) are generated upon credential creation and stored in `metadata.preview` for display in the User Portal and Admin Panel.

---

## 3. Supported Credential Types

1. `api_key`: Generic bearer or header API keys.
2. `bearer_token`: OAuth2 / static JWT tokens.
3. `basic_auth`: Username and password pairs.
4. `openai`: OpenAI API keys and organization IDs.
5. `anthropic`: Anthropic API keys.
6. `smtp`: Host, port, username, password, and TLS configuration.
7. `slack`: Slack bot tokens or webhook URLs.
8. `discord`: Discord bot tokens or incoming webhook URLs.

---

## 4. Node Credential Binding

Nodes do not store raw secrets. A node definition references a credential by UUID:

```json
{
  "id": "node_http_1",
  "type": "integration.http",
  "data": {
    "credentialId": "e1f1c7e9-4e78-4392-808b-6bc15d86da09",
    "config": {
      "url": "https://api.external.com/v1/resource"
    }
  }
}
```

During node execution inside the worker, `CredentialService.resolveCredentialSecret(tenantId, credentialId)` decrypts the secret in memory.
