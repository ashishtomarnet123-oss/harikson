# Xarwiz AI Platform — Smart Conversation Titles & Technical SEO Audit

**Document Version:** 1.0.0  
**Date:** October 16, 2026  
**Auditor:** Senior Full-Stack Architect, SEO Engineer & Application Security Architect  
**Scope:** `harikson/tenant-api`, `user-portal`, database `neuravolt`, and routing/SEO layer.

---

## 1. Actual Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **User Frontend** | Next.js 14.2.3 (Pages Router) | React 18.3.1, styled-jsx & Vanilla CSS tokens, `@xyflow/react`, `lucide-react` |
| **Admin Panel** | Next.js 14 (App Router) | React 18, TypeScript, Tailwind CSS |
| **Tenant Backend API** | Node.js 20+ / Express 4.19+ | TypeScript 5.4, Server-Sent Events (SSE), pg Pool, Ollama AI Client |
| **Admin Backend API** | Node.js / Express | JavaScript, JWT & Session-based authorization |
| **Database** | PostgreSQL 16 | Multi-tenant row-level security (`app.current_tenant`), UUID v4 keys |
| **Local / Edge LLM** | Ollama | Self-hosted local inference (`llama3`, `qwen2.5`, `mistral`, `deepseek`) |
| **Reverse Proxy & Ingress** | Traefik v2.10 | Let's Encrypt TLS, routes `https://xarwiz.com` to `user-portal` & `tenant-api` |

---

## 2. Existing Architecture & Relevant File Paths

### Conversation Titles & Chat Lifecycle
- **`harikson/tenant-api/src/services/titleService.ts`**: Contains existing `TitleService` with deterministic generator and background Ollama `generateAITitle`.
- **`harikson/tenant-api/src/routes/chat.routes.ts`**: Handles `POST /` (new messages & conversation creation), `PATCH /conversations/:id` (manual rename), `GET /conversations` (list with sanitization), `POST /conversations/repair-titles` (batch title repair).
- **`user-portal/pages/chat.js`**: Main interactive chat interface. Manages `conversations` list, active conversation `activeConvId`, client title fallback `generateClientTitle`, and sidebar grouping.
- **`harikson/tenant-api/src/migrations/001_initial_schema.sql`**: Defines `conversations` table (`id`, `tenant_id`, `user_id`, `title`, `model`, `created_at`, `updated_at`, `deleted_at`).
- **`harikson/tenant-api/src/migrations/062_repair_corrupted_conversation_titles.sql`**: Prior cleanup script for truncated file tags.

### Frontend Routing & Head Metadata
- **`user-portal/pages/_app.js`**: Global app wrapper containing basic viewport and font links. Does not set default page titles or canonical fallbacks.
- **`user-portal/pages/_document.js`**: **Missing**. Next.js defaults to `<html>` without explicit `lang="en"`.
- **`user-portal/pages/chat.js` (Line 3251)**: Hardcoded `<title>Xarwiz AI — Chat</title>`. Never updates when the active conversation changes.
- **`user-portal/pages/neuravolt.js` (Line 125)**: Homepage hardcoded to `<title>India's All-in-One AI Platform for Agents &amp; Automation</title>`. Missing brand name prefix, canonical tag, Open Graph image/tags, Twitter cards, and Schema.org structured data.
- **`user-portal/public/robots.txt`**: **Missing** (confirmed in prior audits).
- **`user-portal/public/sitemap.xml`**: **Missing** (confirmed in prior audits).

---

## 3. Current Title-Generation Flow & Gaps

### Flow Analysis
1. **Creation**: When a user submits their first prompt on `/chat` with no prior conversation selected:
   - `chat.routes.ts` generates an immediate deterministic title via `TitleService.generateDeterministicTitle(message)`.
   - Creates a conversation row in PostgreSQL with that title.
   - Spawns background asynchronous AI refinement via `TitleService.generateAITitle(message)` with a 2.8s budget.
   - Returns the conversation ID and title in the SSE stream (`X-Conversation-Title` and `{ conversationId, title }`).
2. **Client Update**: `user-portal/pages/chat.js` captures `title` from header/SSE and updates `conversations` in React state and `localStorage`.
3. **Identified Gaps**:
   - **Browser Tab Title Disconnect**: The browser tab document title in `chat.js` remains static (`Xarwiz AI — Chat`) throughout the entire session. It never reflects the active conversation name.
   - **Manual Rename Protection**: When a user renames a conversation, `chat.routes.ts` updates `title`, but there is no explicit `title_locked` column. If a background job or title repair script runs, it relies only on string comparison heuristics, which risks overwriting user-chosen titles.
   - **Attachment-Aware Titles**: While `TitleService` recognizes attachment names, it lacks contextual handling for mixed intent (e.g., uploaded code file + "help me debug" → should be `Code Debugging` rather than the filename).
   - **Multi-Tab Isolation**: Switching conversations or generating titles in Tab A must not bleed into Tab B. While Next.js component state is tab-local, `document.title` must be synchronized reactively to the active conversation of each tab.

---

## 4. Current Metadata & Indexing Behavior

### Technical SEO Deficiencies
1. **No Robots Policy (`robots.txt`)**: Search engines have no crawling instructions. Private administrative, authentication, and chat API routes (`/api/*`, `/admin/*`, `/chat/*`) are not explicitly disallowed in robots.txt.
2. **No XML Sitemap (`sitemap.xml`)**: No index of canonical marketing and legal pages exists for Google or Bing.
3. **Missing Canonical Tags**: Neither the homepage nor legal/marketing pages declare `<link rel="canonical" href="...">`.
4. **No Open Graph / Social Cards**: Sharing links on LinkedIn, Twitter, WhatsApp, or Slack lacks rich previews (`og:title`, `og:description`, `og:image`, `twitter:card`).
5. **No Schema.org Structured Data**: Search engines cannot parse `Organization`, `WebSite`, or `SoftwareApplication` entities in rich search results.
6. **Missing `_document.js` with `lang="en"`**: Causes accessibility warnings and search engine language detection ambiguity.
7. **Private Route Indexing Hazard**: Authenticated routes like `/chat`, `/dashboard`, `/documents`, and `/workflows` lack strict `<meta name="robots" content="noindex, nofollow" />` safeguards.

---

## 5. Security, Privacy, and Performance Risks

| Risk Area | Severity | Description | Mitigation |
|---|---|---|---|
| **Privacy Leakage in Titles** | High | Titles displayed in browser tabs could expose sensitive prompt text or file paths in browser history. | Clamp titles to 2–7 generic words; strip all file paths, UUIDs, and credentials; never include raw prompt text. |
| **Private Chat SEO Exposure** | Critical | If `/chat` or shared tokens were crawled without `noindex`, private conversation snippets could be indexed by search engines. | Add `noindex, nofollow` to `/chat`, `/dashboard`, and all private app routes; disallow in `robots.txt`; exclude from `sitemap.xml`. |
| **Cross-Tenant IDOR on Titles** | High | Malicious users renaming conversations belonging to other tenants. | Enforce `tenant_id = req.tenant.id AND user_id = req.user.userId` on all title updates via PostgreSQL RLS. |
| **Title Injection (XSS)** | Medium | Untrusted titles containing HTML/script tags rendered in DOM or document title. | Sanitize titles server-side and client-side; use text node bindings and Next.js `<Head>` escaping. |
| **Canonical URL Spoofing** | Medium | Using untrusted `Host` request headers could create poisonous canonical URLs. | Use strict trusted origin `https://xarwiz.com` for all canonical and sitemap URLs. |
| **LLM Exhaustion & Blocking** | Medium | Waiting for LLM title generation during chat streaming causes slow response times. | Use zero-latency deterministic generation for immediate UI response; keep AI title refinement strictly non-blocking. |

---

## 6. Proposed Minimal-Change Implementation Plan

### Step 1: Database Migration (`tenant-api`)
- Create migration `064_add_conversation_title_locked.sql` to add `title_locked BOOLEAN DEFAULT FALSE` to `conversations`.
- Mark existing manually renamed conversations or non-generic titles as safe.

### Step 2: Backend Title Service & Route Enhancements (`tenant-api`)
- Enhance `TitleService`:
  - Strengthen 2–7 word title generation with casing and language preservation (English, Hindi, Hinglish, Unicode).
  - Add attachment + intent combination heuristics (Financial Report Analysis, Code Debugging, Presentation Review, etc.).
  - Enforce strict input sanitization (strip XML, file tags, URLs, paths).
- Update `chat.routes.ts`:
  - In `PATCH /conversations/:id`, set `title_locked = TRUE`.
  - In background AI refinement and auto-repair, verify `title_locked = FALSE`.

### Step 3: Centralized Document Title Utility & Dynamic Tab Titles (`user-portal`)
- Create reusable `useDocumentTitle` hook and `components/AppHead.js` with precedence:
  1. Active conversation title (`<Title> — Xarwiz`)
  2. Page-specific title (`Dashboard — Xarwiz`, `Sign In — Xarwiz`)
  3. Route fallback (`Xarwiz — AI Platform`)
- Update `user-portal/pages/chat.js` to dynamically bind `document.title` and `<Head>` to `activeConvId`'s title, reacting instantly to renames and new chat creation.
- Ensure strict multi-tab isolation (each tab binds to its own React router instance).

### Step 4: Technical SEO Foundation (`user-portal`)
- Create `components/SEOHead.js`:
  - Reusable metadata component supporting `title`, `description`, `canonical`, `og:*`, `twitter:*`, `robots` (`index, follow` vs `noindex, nofollow`), and Schema.org JSON-LD.
- Create `user-portal/pages/_document.js` with `lang="en"`, proper meta charset, and viewport configuration.
- Implement `public/robots.txt` declaring sitemap and disallowing private app routes.
- Implement dynamic `pages/sitemap.xml.js` and static `public/sitemap.xml` for all public canonical URLs.
- Integrate `SEOHead` across all public marketing and legal pages (`/`, `/about`, `/pricing`, `/privacy-policy`, `/terms`, `/cookie-policy`, `/data-rights`, `/grievance`, `/data-processing`, `/security-policy`, `/aup`).
- Ensure private routes (`/chat`, `/dashboard`, `/documents`, `/workflows`, `/agents`, `/studio`, `/privacy-settings`) include `noindex, nofollow`.

### Step 5: Verification & Testing
- Unit and integration tests for title generator (Hindi, Hinglish, attachments, fallbacks, length limits).
- SEO audit tests (sitemap syntax, robots.txt validity, canonical tags, no private data exposure).
- Production build validation and deployment sync.
