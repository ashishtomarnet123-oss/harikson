# REPORT 6: COMPLETE USER PANEL AUDIT

**Target Application:** `user-portal` (Next.js 14 Pages Router, 151 files)  

---

## 1. Feature-by-Feature Functional Analysis

### A. Authentication & Onboarding
- **Registration (`/signup`):** Collects user name, email, password, and organization name. Enforces password complexity rules. Creates tenant record and user record in a single transaction.
- **Login (`/login`):** Validates credentials, checks for account lockout (`users.locked_until`), issues JWT access token (7-day expiry) and refresh token (30-day expiry). Supports TOTP 2FA challenge.
- **Password Reset (`/forgot-password`, `/reset-password`):** Generates cryptographically secure 32-byte hex reset token with 1-hour expiration.

### B. Conversational AI Workspace (`/chat`)
- **Model Switching:** Interacts with `/api/v1/models`. Allows toggling between default platform models (`Xarwiz Plus`, `Xarwiz Pro`, `Xarwiz Ultra`) and custom models.
- **Context Injection (RAG):** When document attachments are present or toggled on, queries vector embeddings via `RagService` and injects contextual chunks into the prompt.
- **Universal PDF Export:** Users can export the conversation or single message cards into professional PDFs via `POST /api/v1/chat/conversations/:id/export/pdf`.
- **Barge-in / Interrupt:** Live SSE responses can be cancelled mid-stream using the interrupt button, which triggers `POST /api/v1/chat/:id/interrupt` and aborts the upstream Ollama generation.

### C. Voice Telemetry & Interactive Mode
- **Voice Mode Controller (`user-portal/src/voice/`):**
  - Implements a strict Finite State Machine (FSM) transitioning between `IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING`, and `ERROR`.
  - Integrates Web Audio API VAD (Voice Activity Detection) worker (`public/workers/vad-processor.js`).
  - Dispatches granular latency telemetry to `POST /api/v1/voice/usage` tracking `sttStart`, `sttFinal`, `llmRequest`, `llmFirstToken`, `ttsFirstAudio`, and `ttfaMs`.

### D. Workflow Canvas (`/workflows`)
- **Visual Workflow Editor:** Node-based workflow editor supporting Triggers (Manual, Cron, Webhook), Actions (LLM Prompt, HTTP Request, Send Email, Database Query, Transform Code).
- **Critical Flaw:** Frontend issues unauthenticated requests to `/api/workflows` without passing the user's Bearer token.

---

## 2. End-to-End User Journeys & Integrity

| User Journey | Flow Trace | Backend Connection | Status | Broken Links / Blockers |
|---|---|---|:---:|---|
| **Onboarding** | Signup → Verify Email → Onboarding Wizard → Dashboard | Connected (`/api/auth/*`) | Working | Fully functional. |
| **Document Upload** | Drop file → Upload → Chunking → pgvector Embeddings | Connected (`/api/documents/upload`) | Working | Working; enforces 50MB file size limits and plan quotas. |
| **Voice Conversation**| Mic click → Speech-to-Text → LLM → Text-to-Speech | Connected (`/api/voice/*`, `/api/chat`) | Working | Fully functional with sub-800ms TTFA on local models. |
| **Workflow Run** | Node design → Save → Trigger Execution → View Logs | Connected (`/api/workflows/*`) | **VULN** | Unauthenticated API requests; security risk. |
| **Plan Upgrade** | Pricing page → Select Plan → Gateway Checkout | Connected (`/api/billing/checkout`) | Working | PhonePe, Cashfree, and Razorpay flows connected. |
| **Privacy Rights** | Privacy Settings → Request Data Export / Erasure | Connected (`/api/privacy/*`) | **PARTIAL**| Link to `/grievance` is broken (404 Not Found). |
