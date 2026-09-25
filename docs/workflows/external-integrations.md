# Xarwiz Workflow Engine — External Integrations & n8n / Make Bridge

## 1. Overview

Xarwiz workflows can integrate bidirectionally with external automation platforms such as **n8n** and **Make.com** via standard HTTP webhooks and OpenAPI contracts.

---

## 2. Inbound Bridge (n8n / Make → Xarwiz)

To trigger a Xarwiz workflow from an external platform:
1. In Xarwiz, add a `trigger.webhook` node and copy the webhook URL:
   `https://api.xarwiz.com/api/v1/workflows/:id/webhook/:token`
2. In n8n or Make, configure an **HTTP Request** or **Webhook** node pointing to that URL.
3. Pass JSON payload with custom body fields.
4. Downstream nodes in Xarwiz can reference incoming fields via `{{$trigger.body.fieldName}}`.

---

## 3. Outbound Bridge (Xarwiz → n8n / Make)

To dispatch data from Xarwiz to an external workflow:
1. In n8n or Make, create a **Webhook Trigger** and copy the test/production webhook URL.
2. In Xarwiz, add an `integration.http` node:
   - Method: `POST`
   - URL: External webhook endpoint URL.
   - Body: `{{$node["llm_summary"].output.data}}`
3. The Xarwiz `SSRFGuard` validates the outbound URL to ensure it targets legitimate public endpoints.
