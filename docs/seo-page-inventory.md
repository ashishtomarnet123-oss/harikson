# Xarwiz AI Platform — SEO Page Inventory & Indexing Policy

**Document Version:** 1.0.0  
**Date:** October 16, 2026  
**Canonical Production Origin:** `https://xarwiz.com`

---

## 1. Indexable Public Pages (Sitemap & Crawlable)

The following pages are intended for public indexing by search engines. They contain marketing, product, company, and statutory compliance information.

| Route | Canonical URL | Page Title | Primary Intent | Schema.org Type | Current Status |
|---|---|---|---|---|---|
| `/` | `https://xarwiz.com/` | `Xarwiz — India's All-in-One AI Platform for Agents & Automation` | Homepage, product capabilities, agent overview | `Organization`, `WebSite`, `SoftwareApplication` | Implemented & Verified |
| `/about` | `https://xarwiz.com/about` | `About Xarwiz \| India's AI Platform for Agents & Automation` | Company mission, leadership, core pillars | `Organization`, `AboutPage` | Implemented & Verified |
| `/pricing` | `https://xarwiz.com/pricing` | `Pricing Plans — Xarwiz` | Transparent subscription tiers, enterprise quotes | `Product`, `AggregateOffer` | Implemented & Verified |
| `/privacy-policy` | `https://xarwiz.com/privacy-policy` | `Privacy Policy — Xarwiz AI Platform` | DPDP Act statutory privacy notice & data practices | `WebPage` | Implemented & Verified |
| `/privacy` | `https://xarwiz.com/privacy-policy` | `Privacy Policy — Xarwiz AI Platform` | Canonical alias pointing to `/privacy-policy` | None (Canonical to `/privacy-policy`) | Implemented & Verified |
| `/terms` | `https://xarwiz.com/terms` | `Terms of Service — Xarwiz AI Platform` | Terms of service, acceptable use, liability | `WebPage` | Implemented & Verified |
| `/cookie-policy` | `https://xarwiz.com/cookie-policy` | `Cookie Policy — Xarwiz AI Platform` | Cookie disclosure & tracking categorization | `WebPage` | Implemented & Verified |
| `/cookies` | `https://xarwiz.com/cookie-policy` | `Cookie Policy — Xarwiz AI Platform` | Canonical alias pointing to `/cookie-policy` | None (Canonical to `/cookie-policy`) | Implemented & Verified |
| `/data-processing` | `https://xarwiz.com/data-processing` | `Data Processing Addendum & Architecture — Xarwiz` | Enterprise DPA, TOMs, sub-processors | `WebPage` | Implemented & Verified |
| `/security-policy` | `https://xarwiz.com/security-policy` | `Security Policy & Platform Safeguards — Xarwiz` | Security controls, encryption, incident response | `WebPage` | Implemented & Verified |
| `/security` | `https://xarwiz.com/security-policy` | `Security Policy & Platform Safeguards — Xarwiz` | Canonical alias pointing to `/security-policy` | None (Canonical to `/security-policy`) | Implemented & Verified |
| `/aup` | `https://xarwiz.com/aup` | `Acceptable Use Policy — Xarwiz AI Platform` | Prohibited AI activities and compliance rules | `WebPage` | Implemented & Verified |
| `/data-rights` | `https://xarwiz.com/data-rights` | `Data Principal Rights & Privacy Requests — Xarwiz` | Statutory DPDP rights submission & tracking | `WebPage` | Implemented & Verified |
| `/grievance` | `https://xarwiz.com/grievance` | `Grievance Redressal Mechanism — Xarwiz DPDP` | Grievance Officer details & submission form | `WebPage` | Implemented & Verified |

---

## 2. Public Authentication Pages (Crawlable, But Excluded From Sitemap)

These pages are accessible publicly to allow user registration and authentication, but should not dominate search queries:

| Route | Canonical URL | Robots Directive | Rationale |
|---|---|---|---|
| `/login` | `https://xarwiz.com/login` | `noindex, follow` | Sign in portal; crawling login forms creates noise in index |
| `/signup` | `https://xarwiz.com/signup` | `index, follow` | Access request / registration portal |
| `/forgot-password` | `https://xarwiz.com/forgot-password` | `noindex, nofollow` | Utility password recovery |
| `/verify-email` | `https://xarwiz.com/verify-email` | `noindex, nofollow` | Verification token handler |
| `/unlock-account` | `https://xarwiz.com/unlock-account` | `noindex, nofollow` | Security unlock flow |

---

## 3. Private / Authenticated Application Routes (STRICTLY NOINDEX, NOFOLLOW)

These routes contain private user workspace data, AI chat interactions, and administrative settings. Under no circumstances should these ever appear in search engine indexes or sitemaps.

| Route Category | Routes | Robots Directive | Security Controls |
|---|---|---|---|
| **AI Conversations** | `/chat`, `/chat?conversation=*` | `noindex, nofollow` | Authentication required; tenant-isolated RLS; no private chat content in static HTML. |
| **Workspace & Dashboard** | `/dashboard`, `/documents`, `/agents`, `/studio`, `/workflows` | `noindex, nofollow` | Authenticated session check; API-driven CSR. |
| **Privacy Management** | `/privacy-settings`, `/impersonate` | `noindex, nofollow` | Authenticated user session. |
| **New User Setup** | `/onboarding` | `noindex, nofollow` | Authenticated session check. |
| **Shared Snippets** | `/share/[token]` | `noindex, nofollow` | Tokenized read-only conversation view; excluded from index to protect principal privacy. |
| **API Endpoints** | `/api/*`, `/admin/api/*`, `/admin/api-proxy/*` | Disallowed in `robots.txt` | Returns JSON / SSE streams; not indexable web documents. |
| **Admin Control Plane** | `/admin/*` | Disallowed in `robots.txt`, `noindex, nofollow` | Superadmin authorization required. |

---

## 4. Canonical URL & Normalization Rules

1. **Host Policy**: Strictly `https://xarwiz.com`. No `localhost`, internal IPs, or staging domains in canonical tags.
2. **Trailing Slash**: Stripped consistently (e.g., `https://xarwiz.com/about` not `https://xarwiz.com/about/`).
3. **Query Parameters**: Stripped from canonical tags (e.g., UTM campaign tags, tracking IDs, or `?tab=...` must point to the clean base URL).
4. **Aliases**: Duplicate routes must declare their primary destination as canonical:
   - `/privacy` → canonical is `https://xarwiz.com/privacy-policy`
   - `/cookies` → canonical is `https://xarwiz.com/cookie-policy`
   - `/security` → canonical is `https://xarwiz.com/security-policy`
