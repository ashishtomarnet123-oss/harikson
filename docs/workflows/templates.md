# Xarwiz Workflow Engine — Template System Reference

## 1. Overview

The Template System enables tenants to instantiate pre-built workflows for standard AI automation scenarios.

---

## 2. Seeded Templates

1. **AI Support Auto Responder**:
   - `trigger.webhook` → `ai.llm` → `logic.if` → `integration.email`
   - Classifies customer inquiry and sends automated triage reply.

2. **Knowledge Base Sync**:
   - `trigger.cron` → `ai.rag` → `utility.transform` → `integration.slack`
   - Periodically indexes internal documentation and posts status updates.

3. **Lead Enrichment & Qualification**:
   - `trigger.webhook` → `ai.rag` → `ai.llm` → `logic.switch` → `integration.http`
   - Enriches inbound leads with tenant vector context and updates CRM.

4. **Autonomous Customer Follow-up**:
   - `trigger.webhook` → `ai.agent` → `logic.delay` → `integration.email`
   - Executes multi-step AI reasoning and schedules follow-up outreach.

---

## 3. Template Cloning & Zero-Secret Guarantee

Templates contain no live credentials. When cloning a template via `POST /api/v1/workflows/templates/:id/clone`:
- Graph topology and node configs are cloned.
- Credential references are initialized to `null`.
- The user is prompted in the Visual Builder to select or create required credentials.
