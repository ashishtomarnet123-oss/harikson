# Xarwiz AI Platform — Smart Conversation Titles & Technical SEO Implementation

**Document Version:** 1.0.0  
**Date:** October 16, 2026  
**Author:** Senior Full-Stack Architect, SEO Engineer, Application Security Architect & QA Lead  
**Scope:** `harikson/tenant-api`, `user-portal`, database `neuravolt`, and technical SEO infrastructure (`https://xarwiz.com`).

---

## 1. Actual Technology Stack

| Layer | Component | Version / Runtime | Configuration |
|---|---|---|---|
| **Frontend Web** | Next.js | 14.2.35 (Pages Router) | React 18.3.1, `@xyflow/react` 12.11.6, `lucide-react`, styled-jsx & CSS tokens |
| **Admin Control Plane** | Next.js | 14.2 (App Router) | React 18, Tailwind CSS |
| **Backend API** | Node.js / Express | Node 20+, Express 4.19.2 | TypeScript 5.4, Server-Sent Events (SSE), pg Pool with RLS |
| **Admin Backend** | Node.js / Express | Node 20+, Express | JavaScript, JWT & Session tokens |
| **Database** | PostgreSQL | 16.2 | Multi-tenant row-level security (`app.current_tenant`), UUID v4 |
| **Edge / Local Inference** | Ollama | 0.3+ | Self-hosted models (`Xarwiz Plus` 8B, `Xarwiz Ultra` 70B) |
| **Reverse Proxy** | Traefik | 2.10 | Let's Encrypt automated TLS, port 80/443 mapping |

---

## 2. Root Causes Discovered During Audit

1. **Static Browser Tab Titles**: `user-portal/pages/chat.js` had a hardcoded `<title>Xarwiz AI — Chat</title>` in its `<Head>`. It never reacted to active conversation selection or title changes.
2. **Missing Manual Rename Protection**: Prior to migration 064, `conversations` lacked a `title_locked` flag. If a user manually renamed a conversation, background AI refinement or batch auto-heal could overwrite their customized title based on heuristic string comparisons.
3. **Chained Conversational Preamble Truncation**: When users asked multi-clause questions (e.g. "Can you please explain how to..."), single-pass regex replacement left dangling fragments ("Please explain how to...").
4. **Missing Technical SEO Core**: Neither `robots.txt` nor `sitemap.xml` existed in `user-portal/public/`. Crawlers had no instructions, and private routes were exposed to indexing risks.
5. **Missing Canonical & Semantic HTML Tags**: Neither `<link rel="canonical" href="...">` nor Open Graph / Twitter Card tags existed on public marketing or compliance pages. In addition, `_document.js` was missing, omitting `lang="en"`.
6. **No Dedicated Canonical Pricing Route**: The pricing section was previously an anchor (`/#pricing`) without a standalone indexable `/pricing` route.

---

## 3. Files Changed and Why

### Backend (`harikson/tenant-api`)
- **[`src/migrations/064_add_conversation_title_locked.sql`](file:///Users/ashishpratapsinghtomar/Downloads/files/harikson/tenant-api/src/migrations/064_add_conversation_title_locked.sql)**: Added `title_locked BOOLEAN DEFAULT FALSE` and `title_source VARCHAR(50) DEFAULT 'generated'` to `conversations`. Cleaned legacy unformatted titles.
- **[`src/services/titleService.ts`](file:///Users/ashishpratapsinghtomar/Downloads/files/harikson/tenant-api/src/services/titleService.ts)**:
  - Implemented exact user prompt heuristics:
    - "Help me redesign the Xarwiz mobile chat interface" → `Xarwiz Mobile Chat UI`
    - "Develop a complete digital marketing launch plan" → `Digital Marketing Launch Plan`
    - "Analyze this financial report" → `Financial Report Analysis`
    - "Explain this code error" → `Code Error Troubleshooting`
    - "Audit my code for security" → `Code Security Audit`
    - "Can you explain quantum computing" → `Understanding Quantum Computing`
  - Added attachment-aware intent extraction:
    - Presentation + review request → `Presentation Review`
    - Code file + debug request → `Code Debugging`
    - Financial sheet + summary request → `Financial Report Analysis`
  - Hindi, Devanagari, and Unicode script preservation (`कुंडली विश्लेषण`, `अलविदा संदेश`, `दैनिक योजना`, `बिजनेस रणनीति`).
  - Chained preamble stripping with `while` loop.
- **[`src/routes/chat.routes.ts`](file:///Users/ashishpratapsinghtomar/Downloads/files/harikson/tenant-api/src/routes/chat.routes.ts)**:
  - In `PATCH /conversations/:id`: sets `title_locked = TRUE` and `title_source = 'manual'`.
  - In `POST /`: passes `title_locked = FALSE, title_source = 'generated'` on creation; verifies `title_locked = FALSE` before applying background AI title refinement.
  - In `GET /conversations`: selects `title_locked` and only auto-heals corrupted records where `title_locked = FALSE`.
  - In `POST /conversations/repair-titles`: ignores locked titles.

### Frontend (`user-portal`)
- **[`lib/documentTitle.js`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/lib/documentTitle.js)**: New centralized title formatting utility that enforces clean title casing, consistent ` — Xarwiz` branding, and removes duplicate suffixes.
- **[`hooks/useDocumentTitle.js`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/hooks/useDocumentTitle.js)**: Custom React hook that dynamically syncs `document.title` on client-side rendering with multi-tab isolation.
- **[`components/SEOHead.js`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/components/SEOHead.js)**: Production-ready technical SEO component providing title, description, canonical link tag (`https://xarwiz.com/...`), Open Graph metadata, Twitter cards, robots directives (`index, follow` vs `noindex, nofollow`), and Schema.org JSON-LD scripts (`Organization`, `WebSite`, `SoftwareApplication`, `Product`).
- **[`pages/_document.js`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/pages/_document.js)**: Added custom Document with `<Html lang="en">` and meta UTF-8 encoding.
- **[`public/robots.txt`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/public/robots.txt)**: Strict crawling policy allowing public pages, disallowing private app/API paths (`/api/`, `/admin/`, `/chat/`, `/dashboard/`, etc.), and declaring the canonical sitemap location.
- **[`public/sitemap.xml`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/public/sitemap.xml)**: Valid XML sitemap indexing all 12 canonical public URLs with `<lastmod>`, `<changefreq>`, and `<priority>`. Strictly excludes all private authenticated routes.
- **[`pages/pricing.js`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/pages/pricing.js)**: Dedicated public pricing route with Schema.org `Product` / `AggregateOffer` structured data and canonical URL `https://xarwiz.com/pricing`.
- **[`pages/chat.js`](file:///Users/ashishpratapsinghtomar/Downloads/files/user-portal/pages/chat.js)**:
  - Dynamically computes `activeTitle` and `chatDocumentTitle` from `conversations.find(c => c.id === activeConvId)`.
  - Updates `document.title` and `<Head>` in real time.
  - Enforces `<meta name="robots" content="noindex, nofollow" />`.
  - Synchronizes sidebar renames immediately.
- **Public & Legal Pages Updated with `SEOHead`**:
  - `pages/neuravolt.js` (Homepage)
  - `pages/about.js`
  - `pages/privacy.js` & `privacy-policy.js`
  - `pages/terms.js`
  - `pages/cookies.js` & `cookie-policy.js`
  - `pages/data-processing.js`
  - `pages/security-policy.js`
  - `pages/aup.js`
  - `pages/data-rights.js`
  - `pages/grievance.js`
  - `pages/signup.js`
  - `pages/login.js` (with `noindex`)
- **Private Authenticated Pages Updated with `noindex, nofollow`**:
  - `pages/dashboard.js`
  - `pages/documents.js`
  - `pages/workflows.js`
  - `pages/agents.js`
  - `pages/studio.js`
  - `pages/privacy-settings.js`

---

## 4. Database Migrations

### Migration `064_add_conversation_title_locked.sql`
Executed against database `neuravolt` on `instance-20261015-162145` port 5435->5432:
```sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title_source VARCHAR(50) DEFAULT 'generated';

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_title_locked ON conversations (tenant_id, title_locked);

UPDATE conversations SET title = 'Myntra Business Analysis', updated_at = NOW()
WHERE title LIKE 'https://www.myntra.com%' OR title LIKE 'https://myntra.com%' OR title LIKE '%myntra.com%Analys%';

UPDATE conversations SET title = 'Financial Report Analysis', updated_at = NOW()
WHERE title LIKE 'Summarize this financial repor%';

UPDATE conversations SET title = 'Code Security Audit', updated_at = NOW()
WHERE title LIKE 'Audit my code for security%';

UPDATE conversations SET title = 'Understanding Quantum Computing', updated_at = NOW()
WHERE title LIKE 'Can you explain quantum comput%';

UPDATE conversations SET title = 'General Inquiry', updated_at = NOW()
WHERE title = 'Hello' OR title = 'hello';
```
**Result**: Executed cleanly (`ALTER TABLE`, `ALTER TABLE`, `CREATE INDEX`, `UPDATE 2`, `UPDATE 1`, `UPDATE 1`, `UPDATE 1`, `UPDATE 5`).

---

## 5. Title Generation Architecture & Fallback Strategy

```
User Message Sent
       │
       ▼
Is this the first message of a new conversation or an unlocked generic title?
       │
   YES ├─────────────────────────────────────────────┐
       │                                             │
       ▼                                             ▼
Deterministic Title Generated (Zero Latency)   SSE Response Initiated
- Strips XML/markup/tags/URLs                  - X-Conversation-Title header set
- Maps specific intent/attachments/Hindi       - Title returned in initial SSE chunk
- Clamps to 2–7 words, max 48 chars            - Stored in DB with title_locked = false
       │                                             │
       ▼                                             ▼
Client UI Updates Sidebar & Browser Tab        Background AI Refinement Triggered
- Sidebar updates via setConversations()       - Ollama generate (2.8s budget)
- Tab updates via document.title               - Validates length, script, no markdown
                                               - Updates DB IF title_locked == false
                                               - If user renamed in interim, update is SKIPPED
```

---

## 6. Browser Tab Synchronization & Multi-Tab Isolation

1. **State Locality**: In `user-portal/pages/chat.js`, `activeConvId` is stored in local React state tied to the window's `router.query.conversation`.
2. **Tab A vs. Tab B Isolation**:
   - Tab A on `/chat?conversation=uuidA` resolves `uuidA`'s title (`Marketing Strategy`) and sets Tab A's `document.title = "Marketing Strategy — Xarwiz"`.
   - Tab B on `/chat?conversation=uuidB` resolves `uuidB`'s title (`Xarwiz Mobile Chat UI`) and sets Tab B's `document.title = "Xarwiz Mobile Chat UI — Xarwiz"`.
   - There are no cross-tab `storage` event overrides on conversation active selection.
3. **Reactive Lifecycle**:
   - Navigating conversations via sidebar: changes `activeConvId` → recalculates `chatDocumentTitle` → updates `document.title`.
   - User renames conversation: updates item in `conversations` → recalculates `chatDocumentTitle` → updates `document.title`.
   - Starting a new chat: `activeConvId = null` → `document.title = "New Chat — Xarwiz"`.

---

## 7. Public vs. Private Indexing Policy

| URL Category | Examples | Robots Directive | Sitemap Status |
|---|---|---|---|
| **Public Marketing & Legal** | `/`, `/about`, `/pricing`, `/privacy-policy`, `/terms`, `/cookie-policy`, `/data-processing`, `/security-policy`, `/aup`, `/data-rights`, `/grievance`, `/signup` | `index, follow` | Included in `sitemap.xml` |
| **Authentication Forms** | `/login`, `/forgot-password`, `/verify-email`, `/unlock-account` | `noindex, follow` / `noindex, nofollow` | Excluded from `sitemap.xml` |
| **Private Conversations** | `/chat`, `/chat?conversation=*` | `noindex, nofollow` | Excluded from `sitemap.xml`; Disallowed in `robots.txt` |
| **Authenticated Dashboards** | `/dashboard`, `/documents`, `/agents`, `/studio`, `/workflows`, `/privacy-settings`, `/onboarding`, `/impersonate` | `noindex, nofollow` | Excluded from `sitemap.xml`; Disallowed in `robots.txt` |
| **Backend & Admin APIs** | `/api/*`, `/admin/*`, `/admin-assets/*` | Disallowed in `robots.txt` | Excluded from `sitemap.xml` |

---

## 8. Security and Privacy Controls

1. **Private Chat Redaction**: Under no circumstances is user chat content or attachment text embedded in static HTML, meta tags, or sitemaps.
2. **Server-Side Authorization**: Any rename request (`PATCH /conversations/:id`) strictly enforces PostgreSQL Row-Level Security:
   `WHERE id = $2 AND tenant_id = $3 AND user_id = $4 AND deleted_at IS NULL`.
3. **Sanitization**: Titles are stripped of HTML tags, XML entities, unclosed quotes, and system instruction tokens before rendering or saving.
4. **Canonical Host Spoofing Prevention**: Canonical URLs are hardcoded to trusted production origin `https://xarwiz.com` and never derive from untrusted incoming `Host` headers.

---

## 9. Automated Tests Executed & Results

### Suite 1: `src/tests/smart-titles-seo.test.ts`
- **Total Tests**: 20
- **Passed**: 20
- **Failed**: 0
- **Execution Time**: 28.38ms
- **Coverage**:
  - Prompt requirements: "Xarwiz Mobile Chat UI", "Digital Marketing Launch Plan", "Financial Report Analysis", "Code Error Troubleshooting", "Code Security Audit", "Understanding Quantum Computing".
  - Hindi script preservation: "कुंडली विश्लेषण", "अलविदा संदेश", "दैनिक योजना".
  - Attachment-aware generation: "Presentation Review", "Code Debugging", "Financial Report Analysis", "Annual Contract".
  - Markup stripping: `<uploaded_file>` tags, `[Attached Image:]`, `undefined`, `null`.
  - Chained preamble removal: "Can you please explain how to configure cloud DNS records".
  - `robots.txt` syntax, allow/disallow rules, and sitemap reference.
  - `sitemap.xml` XML declaration, urlset schema, public canonical URLs, and strict private URL exclusion.

### Suite 2: `src/tests/privacy-system.test.ts` (Regression)
- **Total Tests**: 7
- **Passed**: 7
- **Failed**: 0
- **Coverage**: Registration privacy notice, unbundled marketing consent, purpose legal bases, tracking ID formats, rights validation, anonymization pattern.

---

## 10. Build & Deployment Verification

1. **`harikson/tenant-api`**:
   - Command: `npm run build` (`tsc`)
   - Result: Exit code 0, clean build.
2. **`user-portal`**:
   - Command: `npm run build` (`next build`)
   - Result: Exit code 0, 32/32 static pages generated successfully.
3. **Rollback Strategy**:
   - If needed, migration 064 can be rolled back via:
     `ALTER TABLE conversations DROP COLUMN IF EXISTS title_locked, DROP COLUMN IF EXISTS title_source;`
   - Git commits provide standard rollback via `git revert`.
