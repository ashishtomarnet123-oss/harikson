# REPORT 16: TECHNICAL DEBT REGISTER

---

## 1. Code Quality & Architectural Technical Debt

1. **Monolithic Admin Controller (`admin-api/src/admin.js` — 7,240 Lines):**
   - *Issue:* Combines Express routing, database pooling, email queue management, payment webhooks, and system metrics in a single file.
   - *Remediation:* Decompose into modular controllers under `admin-api/src/controllers/` (e.g., `BillingWebhookController`, `AdminAuthController`, `TenantController`).
2. **Monolithic Chat Workspace (`user-portal/pages/chat.js` — 4,314 Lines):**
   - *Issue:* Houses text chat, streaming SSE listeners, audio visualizers, title generation, and PDF export logic in a single React component.
   - *Remediation:* Split into subcomponents (`ChatSidebar`, `ChatStream`, `VoiceOverlay`, `PdfExportModal`).
3. **Legacy Router Duplication (`chat.ts`, `documents.ts`, `widget.ts`):**
   - *Issue:* Dead or duplicate route files mounted at `/api/routes/*` that bypass JWT authentication in favor of unverified headers.
   - *Remediation:* Deprecate and delete `src/routes/chat.ts` and `src/routes/documents.ts`; ensure all traffic uses `chat.routes.ts` and `document.routes.ts`.
4. **Branding Inconsistencies (`Harikson`, `NeuraVolt`, `Xarwiz`):**
   - *Issue:* Lingering legacy strings in logs, emails, and database migration comments.
   - *Remediation:* Execute unified string normalization to "Xarwiz" across all public-facing and telemetry templates.
