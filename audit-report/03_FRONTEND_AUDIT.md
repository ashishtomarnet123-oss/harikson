# REPORT 3: COMPLETE FRONTEND AUDIT

**Target Applications:**  
1. `user-portal` (Next.js 14 Pages Router, 151 files, Tailwind CSS)  
2. `admin-panel` (Next.js 14 App Router, 66 files, Tailwind CSS + Lucide React)  
3. `landing` (Static HTML/CSS, 28 files)  

---

## 1. UI and UX Audit

### A. Design System and Visual Consistency
- **Branding Fragmentation:** The codebase reveals multiple evolutionary branding phases. Assets and copy contain references to `Harikson`, `NeuraVolt`, `NeuraCollect`, and `Xarwiz`. For example:
  - Header in `user-portal/components/SettingsModal.js` displays `/assets/xarwiz-logo.png`.
  - Fallback avatar and text in `user-portal/lib/documentTitle.js` and `user-portal/components/settings/workspace.js` reference "Harikson Workspace" or "Neuravolt AI".
  - Admin login pages reference `admin@harikson.ai` and `admin@neuravolt.cloud`.
- **Theme Support:** `user-portal/context/ThemeContext.js` manages dark/light theme switching with local storage persistence (`hk_theme`). However, several key modal components (e.g., `user-portal/components/DocumentViewerModal.js` and `VisualWorkflowEditor.js`) have hardcoded dark backgrounds (`#0a0b0e`, `#111827`) that do not invert properly when light mode is selected, creating severe contrast and readability issues.
- **Form Validation & Feedback:**
  - Login form (`user-portal/pages/login.js`) features client-side email regex validation and password length checks.
  - Reset password (`user-portal/pages/reset-password.js`) provides visual password strength meters.
  - However, in `user-portal/pages/workflows.js`, editing workflow step parameters lacks inline schema validation; entering invalid JSON in step configuration triggers an unhandled UI runtime error instead of displaying a friendly field error.

### B. Broken Links & Dead Navigation Elements
1. **Broken Grievance Route:**
   - **File:** `user-portal/components/settings/privacy.js`, Line 387
   - **Code:** `<Link href="/grievance">`
   - **Defect:** There is no `/grievance.js` or `pages/grievance/` route in `user-portal`. Clicking this link immediately renders a 404 Not Found error page.
2. **Broken Billing Route in Activity Tab:**
   - **File:** `user-portal/components/settings/activity.js`, Line 205
   - **Code:** `<a href="/settings/billing">`
   - **Defect:** Settings tabs are modal subviews, not standalone URL pages. Navigating to `/settings/billing` results in a 404 error.
3. **Dead Nav Items in Settings Modal:**
   - **File:** `user-portal/components/SettingsModal.js`, Lines 34-36
   - **Defect:** `AppearanceSettings`, `LanguageSettings`, and `HelpSettings` components are imported at the top of the file, but are completely omitted from the `navSections` data structure. As a result, users cannot configure their UI theme preferences, localization languages, or access help documentation from within the Settings modal.
4. **Broken Asset Reference:**
   - **Files:** `user-portal/pages/_app.js` and `user-portal/pages/_document.js`
   - **Reference:** `/assets/favicon-x.png`
   - **Defect:** In certain static server configurations, root favicon fallback is unmapped, triggering 404 console errors on initial load.

---

## 2. Frontend Logic Audit

### A. State Management & API Integration
- **Centralized API Config (`user-portal/lib/api-config.ts`):** Resolves base URLs intelligently:
  - If running in the browser on non-localhost (`isDirectAccess`), returns `''` (relative URL) to route all requests through Next.js `rewrites()` reverse proxy.
  - Attaches `x-tenant-slug` and `Authorization: Bearer <token>` automatically when using `apiFetch()`.
  - Automatically clears `hk_access_token` and redirects to `/login?session_expired=true` upon receiving HTTP 401.
- **Critical Logic Divergence in Workflows:**
  - While `documents.js`, `agents.js`, and `chat.js` correctly use `authenticatedFetch` or `apiFetch`, `user-portal/pages/workflows.js` uses **bare `window.fetch()`** without importing `apiFetch`:
  ```javascript
  // user-portal/pages/workflows.js:200
  const res = await fetch(`${base}/api/workflows`, {
    credentials: 'include',
    headers: {
      'x-tenant-slug': tenant || 'system',
    },
  });
  ```
  - It **never passes the `Authorization` header**. It relies entirely on the tenant header, exposing tenant workflow graphs to unauthenticated snooping.

### B. Component Monoliths & Re-render Hazards
- **`user-portal/pages/chat.js` (4,314 Lines):**
  - Contains all logic for text chat, streaming SSE parsing, local message state, model catalog selection, title auto-generation, voice session state machines, PDF exports, file attachments, and search.
  - State changes in voice audio levels (firing at 60Hz from Web Audio AnalyserNode) trigger continuous re-evaluations across the entire 4,300-line component tree, causing dropped frames on low-end machines.
  - **Recommendation:** Decompose into `ChatHistorySidebar`, `ChatInputBar`, `MessageBubbleList`, and `VoiceOverlayController` with memoized subcomponents.

---

## 3. Frontend Performance Audit

- **Next.js Proxy Timeout Optimization:** `user-portal/next.config.js` sets `experimental.proxyTimeout: 600000` (10 minutes). This effectively prevents Next.js proxy disconnections during prolonged local LLM generation (CPU inference on large 7B/14B models).
- **Bundle Optimization:** Image imports leverage Next.js `<Image>` with modern AVIF and WebP formats enabled (`next.config.js`).
- **Code Splitting:** Dynamic imports are underutilized in `pages/chat.js`. Heavy libraries such as `pdfkit`, `qrcode`, and math renderers (`katex`) are bundled directly into main chunks rather than lazy-loaded upon user interaction.

---

## 4. Page-by-Page Functional Audit Matrix

| Page Route | File Path | Lines | Auth Protected | Primary APIs | Expected Behavior | Actual Behavior & Bugs |
|---|---|:---:|:---:|---|---|---|
| `/` | `user-portal/pages/index.js` | 1466 | Public | None (Static) | Marketing landing page | Fully functional marketing page with interactive product tabs. |
| `/login` | `user-portal/pages/login.js` | 830 | Public | `/api/v1/auth/login` | User authentication & 2FA challenge | Fully functional; stores tokens in localStorage & cookies. |
| `/signup` | `user-portal/pages/signup.js` | 423 | Public | `/api/v1/auth/register` | User workspace registration | Working; enforces email validation & password policy. |
| `/chat` | `user-portal/pages/chat.js` | 4314 | Yes (`withAuth`) | `/api/v1/chat`, `/api/v1/voice/*` | Main LLM conversational workspace | Working, but monolithic file causes excessive re-renders during voice streaming. |
| `/documents` | `user-portal/pages/documents.js` | 765 | Yes (`withAuth`) | `/api/documents/*` | RAG document uploads & collections | Functional; multi-doc comparison working. |
| `/workflows` | `user-portal/pages/workflows.js` | 2482 | Yes (`withAuth`) | `/api/workflows/*` | Visual workflow automation editor | **Critical Bug:** Emits unauthenticated API requests without JWT token. |
| `/agents` | `user-portal/pages/agents.js` | 521 | Yes (`withAuth`) | `/api/agents/*` | Custom AI Agent CRUD & Execution | Functional UI; triggers backend agent orchestrator. |
| `/pricing` | `user-portal/pages/pricing.js` | 786 | Public | `/api/v1/billing/plans` | Subscription tier matrix & checkout | Working; dynamically renders INR plan prices. |
| `/security` | `user-portal/pages/security.js` | 926 | Public | None | Trust Center & compliance FAQs | Fully functional static compliance page. |
| `/settings` | `user-portal/components/SettingsModal.js` | 260 | Yes | Sub-components | User workspace configuration | **Bug:** Appearance, Language, and Help tabs are omitted from sidebar. |
| `/grievance` | *Missing* | 0 | N/A | None | Data principal grievance filing | **Broken Route:** Missing page linked from privacy settings (404 error). |
