# Xarwiz Workflow Engine — Webhook System Reference

## 1. Webhook Endpoint Specification

Workflows configured with a Webhook Trigger (`trigger.webhook`) expose an inbound HTTP endpoint:

```http
POST /api/v1/workflows/:workflowId/webhook/:token
```

### URL Parameters:
- `workflowId`: Unique ID of the workflow.
- `token`: Cryptographic webhook security token.

---

## 2. Inbound Payload Handling

The webhook endpoint accepts:
- `Content-Type: application/json`
- `Content-Type: application/x-www-form-urlencoded`
- Query parameters and HTTP headers

### Inbound Context Mappings:
```json
{
  "body": { "leadName": "Alex", "email": "alex@acme.corp" },
  "query": { "source": "landing_page" },
  "headers": { "user-agent": "WebhookDispatcher/1.0" },
  "method": "POST"
}
```

These values become immediately accessible in downstream nodes via `{{$trigger.body.field}}`.

---

## 3. Webhook Security & Signature Verification

1. **Token Authentication**: The inbound `:token` is validated against `workflow.definition.triggerConfig.token`.
2. **HMAC Signature Verification**: If `secret` is configured, incoming requests must include `X-Hub-Signature-256` or `X-Signature` matching `hmac_sha256(rawBody, secret)`.
3. **Rate Limiting**: Inbound webhooks are throttled via Redis to 120 requests/minute per tenant.
