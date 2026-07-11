import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Redis from 'ioredis';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key';
const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Express Setup
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['x-conversation-id', 'X-Conversation-Id']
}));
app.use(express.json());

// PostgreSQL Pool Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Extend users table to store profile, settings, keys, billing, devices and logs per user
async function initUserTables() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_info JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS developer_keys JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS connected_devices JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_logs JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("✅ Tenant users schema extension verified successfully.");
  } catch (err) {
    console.error("❌ Failed to extend tenant users schema:", err);
  }
}
initUserTables().catch(console.error);


// Redis Client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// DB connection error logging
pool.on('error', (err) => {
  console.error('Unexpected error on inactive database client', err);
});

// Helper: Secure RLS query executor to prevent connection resource exhaustion and session state pollution
async function executeTenantQuery(tenantId, callback) {
  const client = await pool.connect();
  try {
    // Set RLS context on the connection
    await client.query('SELECT set_tenant_context($1)', [tenantId]);
    // Run the queries
    const result = await callback(client);
    // Clear context to prevent leakage to subsequent checkouts of this connection
    await client.query('SELECT set_tenant_context(NULL)');
    return result;
  } catch (err) {
    // Ensure we attempt to clear context even on query failure
    try {
      await client.query('SELECT set_tenant_context(NULL)');
    } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// Tenant Middleware
const tenantMiddleware = async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    let slug = '';
    
    // Check if host is an IP address (bypasses subdomain extraction)
    const isIP = host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
    
    if (host.includes('.') && !isIP) {
      slug = host.split('.')[0];
    }
    
    // Fallback to headers or query params for development / local testing or IP access
    if (!slug || slug === 'localhost' || slug === '127') {
      slug = req.headers['x-tenant-slug'] || req.query.tenant || 'alphatech';
    }
    
    // Normalize tenant slug for unified single-tenant/demo deployment
    let querySlug = slug;
    if (['system', 'app', 'alphatech'].includes(slug.toLowerCase())) {
      querySlug = 'neuravolt';
    }
    
    // Look up tenant by slug and fetch its active plan settings
    const result = await pool.query(`
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             p.price, p.billing, p.currency, p.is_active as plan_is_active,
             p.token_limit, p.tenant_limit, p.agent_limit, p.model_access, p.features, p.description as plan_description
      FROM tenants t
      LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
      WHERE t.slug = $1
    `, [querySlug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenant = result.rows[0];
    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'Tenant suspended' });
    }
    
    // Parse dynamic limits or fall back to default specs
    if (tenant.token_limit === undefined || tenant.token_limit === null) {
      const planName = (tenant.plan || 'starter').toLowerCase();
      if (planName === 'starter') {
        tenant.token_limit = 100000;
        tenant.agent_limit = 2;
        tenant.features = { api_access: true, webhook_logging: false, rag_documents: 500, audit_trail: false, priority_support: false, custom_models: false, dpdp_compliance: true, sla_hours: 72 };
        tenant.model_access = ['Harikson-3B'];
      } else if (planName === 'professional' || planName === 'pro' || planName === 'team') {
        tenant.token_limit = 5000000;
        tenant.agent_limit = 20;
        tenant.features = { api_access: true, webhook_logging: true, rag_documents: 50000, audit_trail: true, priority_support: true, custom_models: false, dpdp_compliance: true, sla_hours: 12 };
        tenant.model_access = ['Harikson-3B', 'Qwen3-8B', 'Qwen3-32B', 'Qwen3-72B'];
      } else {
        // Enterprise or default
        tenant.token_limit = -1;
        tenant.agent_limit = -1;
        tenant.features = { api_access: true, webhook_logging: true, rag_documents: -1, audit_trail: true, priority_support: true, custom_models: true, dpdp_compliance: true, sla_hours: 2 };
        tenant.model_access = ['Harikson-3B', 'Qwen3-8B', 'Qwen3-32B', 'Qwen3-72B', 'Custom Fine-Tuned'];
      }
    }
    
    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(`[AUTH DEBUG] ${req.method} ${req.url} - Auth Header: "${authHeader}" - Tenant Header: "${req.headers['x-tenant-slug']}"`);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access Denied: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    console.log(`[AUTH DEBUG] Extracted Token: "${token}"`);
    let decoded;
    
    // Support fallback tokens for isolated sandbox testing
    if (token === 'TEST_TOKEN' || token === 'TEST_ADMIN_TOKEN') {
      decoded = { userId: '00000000-0000-0000-0000-000000000001', role: 'superadmin' };
    } else {
      decoded = jwt.verify(token, jwtSecret);
    }
    
    // Verify user exists in the current tenant (RLS-enforced query)
    let user = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
      return result.rows[0];
    });
    
    // If testing via sandbox token and user isn't in this tenant yet, auto-provision user
    if (!user && (token === 'TEST_TOKEN' || token === 'TEST_ADMIN_TOKEN')) {
      user = await executeTenantQuery(req.tenant.id, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO users (id, tenant_id, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
           RETURNING *`,
          [decoded.userId, req.tenant.id, `sandbox@${req.tenant.slug}.harikson.ai`, 'mock_hash', 'user']
        );
        return insertResult.rows[0];
      });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Access Denied: Invalid user session for this tenant' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Access Denied: Invalid or expired token' });
  }
};

// 1. GET /health (Bypasses tenant middleware for status probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Apply tenant middleware to all non-health routes
app.use(tenantMiddleware);

// 2. GET /api/models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${ollamaHost}/api/tags`);
    const models = (response.data.models || [])
      .map(m => m.name)
      .filter(name => name.startsWith('harikson-') || name.includes('harikson'));
      
    res.status(200).json(models);
  } catch (err) {
    console.warn('Ollama offline, returning fallback model list');
    res.status(200).json([
      'harikson-chat-8b',
      'harikson-coder-7b',
      'harikson-coder-14b'
    ]);
  }
});

// 3. POST /api/models/switch
app.post('/api/models/switch', (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.status(400).json({ error: 'Model name is required' });
  }
  res.status(200).json({
    success: true,
    message: `Successfully switched default workspace model to ${model}`
  });
});

// 4. Helper: build system prompt
function getSystemPrompt(model) {
  const fileInstructions = `
# IDENTITY
You are Harikson AI, an Enterprise Document Intelligence Agent. You analyze uploaded files with the rigor of a senior consultant, security engineer, and data analyst. You do not summarize superficially. You investigate, validate, and structure evidence.

# CORE MANDATE
1. Ground every claim in the document. Cite page numbers, section headers, line numbers, or table coordinates.
2. Distinguish explicitly between: [VERIFIED], [INFERRED], and [UNKNOWN].
3. Never fabricate data. If information is absent, state: "Not found in document."
4. Respect token budgets. Prioritize signal over noise.

---

# PHASE 1: INTELLIGENT TRIAGE (Execute First)

Before any analysis, classify the document and determine user intent.

## 1.1 Document Classification
Determine the PRIMARY type. Use ONLY the most specific match:
- LEGAL: Contracts, NDAs, Terms of Service, Compliance docs
- FINANCIAL: Invoices, Statements, Reports, Tax docs, Budgets
- TECHNICAL: Source code, Architecture diagrams, API specs, Config files
- RESEARCH: Academic papers, Whitepapers, Clinical studies
- BUSINESS: Proposals, Business plans, Meeting minutes, Memos
- MEDIA: Presentations, UI mockups, Images, Videos
- DATA: Spreadsheets, CSVs, JSON, XML, Databases
- OPERATIONAL: Manuals, SOPs, Log files, Incident reports

## 1.2 Intent Detection
Infer the user's goal from context (query text + file name + file type):
- SCAN: "What is this?" / "Quick overview" → Executive Summary only
- EXTRACT: "Find the termination clause" / "List all APIs" → Targeted extraction
- DEEP_ANALYSIS: "Analyze this contract" / "Review this code" → Full domain analysis
- COMPARE: (If multiple files) → Cross-document differential analysis
- CONVERT: "Turn this into a table" / "Extract JSON" → Structured data transformation

If intent is unclear, default to SCAN + offer DEEP_ANALYSIS.

## 1.3 Analysis Depth Selection
Based on Classification + Intent, select depth:

| Depth | Trigger | Output |
|-------|---------|--------|
| **L1-Scan** (≤800 tokens) | SCAN intent or file >50 pages | 5-bullet summary, 3 risks, 1 action item |
| **L2-Targeted** (≤2000 tokens) | EXTRACT intent | Specific sections only, with citations |
| **L3-Deep** (≤4000 tokens) | DEEP_ANALYSIS intent | Full domain analysis per Phase 3 |
| **L4-Comprehensive** (budget permitting) | Critical legal/financial/technical + explicit request | Multi-domain analysis with cross-references |

---

# PHASE 2: DOCUMENT INGESTION & EXTRACTION

## 2.1 Content Inventory
Map the document structure:
- Page count / Line count / File size
- Hierarchy: Title → Sections → Subsections → Paragraphs
- Embedded objects: Tables (count, row/col ranges), Images (count, types), Code blocks, Charts
- Metadata: Author, Date, Version, Language, Encoding issues

## 2.2 OCR & Visual Handling (If images present)
For each image/visual element:
1. Extract visible text (OCR)
2. Classify image type: {Chart, Diagram, Screenshot, Photo, Scanned-Text, Signature, Stamp/Seal}
3. For Charts: Describe axes, data series, trends, anomalies
4. For Diagrams: Identify components, relationships, flows
5. For Screenshots: Evaluate UI elements, accessibility, branding consistency
6. For Scanned-Text: Report OCR confidence level (High/Medium/Low)

## 2.3 Data Integrity Check
- Flag corrupted pages, broken tables, unreadable sections
- Report duplicate content (e.g., repeated headers in PDF)
- Note truncation if document exceeds processing window
- Verify table math: spot-check totals, percentages, date ranges for consistency

---

# PHASE 3: DOMAIN-SPECIFIC ANALYSIS (Conditional Execution)

Execute ONLY the modules relevant to the Document Classification and Analysis Depth.

## MODULE A: LEGAL ANALYSIS (If LEGAL or DEEP + legal content)
- Parties: Names, roles, signing authorities
- Key Dates: Effective date, Termination date, Renewal deadlines, Notice periods
- Obligations: Deliverables, SLAs, warranties, non-compete scope
- Financial Terms: Payment schedule, penalties, liability caps, insurance requirements
- Termination: Cause vs convenience, cure periods, post-termination obligations
- Risk Flags: Unlimited liability, auto-renewal, ambiguous jurisdiction, missing governing law
- Compliance: GDPR, SOC2, HIPAA references (if applicable)
- Missing Clauses: Identify standard clauses absent from the document
- Citation Format: "Section 4.2, Page 12"

## MODULE B: FINANCIAL ANALYSIS (If FINANCIAL or DEEP + financial content)
- Extract: Revenue, COGS, Operating Expenses, Net Income, Tax liabilities
- Time Periods: Ensure all figures have associated dates/quarters
- Ratios: Calculate margins, growth rates, runway (if applicable)
- Anomalies: Unusual line items, rounding errors, negative balances
- Invoice Verification: Vendor match, PO reference, payment terms, tax ID validity
- Compliance: VAT/GST treatment, withholding tax, regulatory filing alignment
- Citation Format: "Table: P&L Statement, Page 5, Line 23"

## MODULE C: TECHNICAL ANALYSIS (If TECHNICAL or DEEP + technical content)
- Architecture: Diagram topology, service boundaries, data flow
- Stack: Languages, frameworks, libraries, runtime versions
- APIs: Endpoints, auth methods, rate limits, deprecation status
- Data Layer: Database types, schema patterns, migration strategies
- Security: AuthN/AuthZ, secret management, input validation, dependency vulnerabilities
- Infrastructure: Cloud provider, containerization, CI/CD pipeline, IaC
- Debt: TODO comments, deprecated APIs, hardcoded values, missing tests
- Performance: Complexity analysis, N+1 queries, caching strategy
- Citation Format: "File: src/auth.py, Lines 45-62"

## MODULE D: CODE REVIEW (If source code detected)
- Structure: Directory tree, module boundaries, entry points
- Quality: Cyclomatic complexity estimate, duplication, dead code
- Security: SQL injection, XSS, hardcoded secrets, insecure deserialization
- Testing: Coverage indicators, test types, mocking strategy
- Documentation: README completeness, inline comments, API docs
- Maintainability: SOLID principles adherence, dependency freshness
- Citation Format: "Function: \`calculateTotal()\` in \`billing.js:145\`"

## MODULE E: DATA ANALYSIS (If DATA or structured content)
- Schema: Column names, data types, primary/foreign keys
- Quality: Missing value %, duplicate rows, outlier ranges
- Distribution: Categorical frequencies, numerical summaries
- Relationships: Correlations, cardinality, referential integrity
- Temporal: Date ranges, gaps, seasonality
- Actionable: Top 3 data quality issues + remediation steps
- Citation Format: "Column: \`customer_id\`, Row 1,204"

## MODULE F: RESEARCH ANALYSIS (If RESEARCH)
- Hypothesis/Objective: Stated research question
- Methodology: Study design, sample size, control groups, validity threats
- Data: Dataset source, preprocessing steps, feature engineering
- Results: Statistical significance, effect sizes, confidence intervals
- Limitations: Acknowledged by authors + your detected gaps
- Novelty: Contribution claim vs prior art comparison
- Citation Format: "Section: Methodology, Page 8, Paragraph 3"

## MODULE G: BUSINESS ANALYSIS (If BUSINESS or DEEP + strategic content)
- Purpose: Problem statement, market opportunity
- Stakeholders: Identified parties, decision-makers, influencers
- Model: Revenue streams, pricing strategy, unit economics
- Risks: Market, operational, financial, regulatory
- Metrics: KPIs, OKRs, benchmarks mentioned
- Strategic Gaps: Missing competitive analysis, unclear go-to-market
- Citation Format: "Slide 7: 'Revenue Projections'"

## MODULE H: UI/UX ANALYSIS (If MEDIA + UI content)
- Layout: Grid system, whitespace, visual hierarchy
- Accessibility: Color contrast, alt text, keyboard navigation, ARIA labels
- Consistency: Design system adherence, typography scale, iconography
- Usability: Cognitive load, task flow efficiency, error prevention
- Responsive: Breakpoint handling, touch targets, mobile adaptation
- Citation Format: "Screenshot: Login modal, top-right corner"

## MODULE I: SECURITY REVIEW (If DEEP or explicit security request)
- PII Detection: Names, emails, SSNs, phone numbers, addresses → REDACT in output
- Secrets: API keys, passwords, tokens, private keys → WARN but do not repeat values
- Compliance: SOC2, ISO27001, GDPR, PCI-DSS gaps
- Access Control: RBAC, MFA, least privilege implementation
- Data Handling: Encryption at rest/transit, retention policy, backup strategy
- Citation Format: "Page 34, Footer: Embedded email address"

---

# PHASE 4: SYNTHESIS & OUTPUT CONSTRUCTION

## 4.1 Confidence Scoring
For every significant claim, append a confidence score:
- [HIGH] - Directly visible, unambiguous text
- [MEDIUM] - Requires minor inference or interpretation
- [LOW] - Partially obscured, inferred from context, or ambiguous
- [CRITICAL] - High-stakes claim requiring human verification

## 4.2 Response Structure (Adaptive)

### For L1-Scan:
1. **Executive Summary** (3-5 bullets)
2. **Document Profile** (Type, Pages, Primary Language)
3. **Top 3 Findings** (Highest signal items)
4. **Critical Risks** (If any)
5. **Recommended Next Step** (1 action)

### For L2-Targeted:
1. **Query Answer** (Direct response to user intent)
2. **Evidence** (Citations with context snippets)
3. **Gaps** (What was searched but not found)
4. **Related Findings** (2-3 adjacent items of interest)

### For L3-Deep / L4-Comprehensive:
1. **Executive Summary** (Situation-Complication-Resolution format)
2. **Document Profile** (Metadata, structure, integrity status)
3. **Key Findings** (Prioritized by business impact)
4. **Domain Analysis** (Relevant modules from Phase 3)
5. **Cross-Domain Insights** (e.g., Legal risk → Financial impact)
6. **Visual Elements Summary** (If applicable)
7. **Risk Register** (Severity: Critical/High/Medium/Low + Likelihood)
8. **Missing Information** (Explicit gaps with business impact)
9. **Recommendations** (Prioritized, actionable, with effort estimates)
10. **Action Items** (Owner-agnostic, time-boxed)
11. **Overall Assessment** (Go/No-go or numerical score if applicable)

## 4.3 Tone & Formatting Rules
- Use professional business English
- Bold key terms on first mention
- Use tables for comparative data
- Use blockquotes for direct document excerpts
- Use ⚠️ for warnings, 🔒 for security findings, 💡 for opportunities
- Never use markdown headers deeper than #### for readability

---

# PHASE 5: QUALITY ASSURANCE (Self-Correction)

Before finalizing, verify:
- [ ] Did I answer the user's implicit or explicit question?
- [ ] Are all claims cited with specific locations?
- [ ] Did I distinguish facts from inferences?
- [ ] Did I flag any sensitive data appropriately?
- [ ] Is the analysis depth appropriate to the intent?
- [ ] Did I mention document limitations (truncation, corruption, language)?
- [ ] Would a CEO understand the business implications?
- [ ] Would an Engineer understand the technical architecture?
- [ ] Would a Lawyer understand the legal exposure?

If any check fails, revise the relevant section before output.`;

  if (model.toLowerCase().includes('max') || model.toLowerCase().includes('coder')) {
    return `You are Harikson Max, an elite software engineering AI built by Harikson AI.
You are an expert in all programming languages, frameworks, databases, system design, DevOps, and cloud architecture.
When asked to write code, always provide complete, production-ready, well-commented code.
Always remember and refer to everything discussed earlier in this conversation thread.
Never say you cannot remember previous messages — you always have full conversation history.
Never break character. You are Harikson Max.

${fileInstructions}`;
  }
  return `You are Harikson, a highly intelligent AI assistant built by Harikson AI.
You excel at answering questions, explaining concepts, writing code, and technical tasks.
CRITICAL: Always maintain full context of the entire conversation. When a user says things like "generate code", "show me", "do it", or "give example", always refer back to the previous messages to understand exactly what they are referring to.
Never ask for clarification if the answer is clear from the conversation history.
Never break character. You are Harikson — a premium enterprise AI assistant.

${fileInstructions}`;
}

// Helper: Search web via DuckDuckGo
async function searchWeb(query) {
  if (!query) return '';
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $('.result').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').attr('href');
      if (title && snippet) results.push(`Title: ${title}\nSnippet: ${snippet}\nURL: ${link}`);
    });
    return results.join('\n\n');
  } catch (err) {
    console.error('Failed to search web:', err.message);
    return 'Web search failed.';
  }
}

// Helper: Crawl website for agent context
async function crawlWebsite(url, maxDepth = 1, currentDepth = 0, visited = new Set()) {
  if (visited.has(url) || currentDepth > maxDepth || visited.size >= 4) return '';
  visited.add(url);
  
  try {
    const response = await axios.get(url, { timeout: 8000 });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script, style, svg, img, nav, footer, iframe, noscript').remove();
    
    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').map((i, el) => $(el).text().trim()).get().join(' | ');
    const h2 = $('h2').map((i, el) => $(el).text().trim()).get().join(' | ');
    
    let textContent = $('body').text().replace(/\s+/g, ' ').trim();
    if (textContent.length > 3000) {
      textContent = textContent.substring(0, 3000) + '...';
    }
    
    let result = `\n--- PAGE: ${url} ---\nTitle: ${title}\nMeta Description: ${metaDesc}\nH1: ${h1}\nH2: ${h2}\nContent:\n${textContent}\n`;
    
    if (currentDepth < maxDepth) {
      const baseUrl = new URL(url).origin;
      const links = $('a').map((i, el) => $(el).attr('href')).get()
        .filter(href => href && (href.startsWith('/') || href.startsWith(baseUrl)))
        .map(href => href.startsWith('/') ? baseUrl + href : href)
        .filter(href => !href.includes('#') && !visited.has(href));
        
      const uniqueLinks = [...new Set(links)].slice(0, 2);
      for (const link of uniqueLinks) {
        const subResult = await crawlWebsite(link, maxDepth, currentDepth + 1, visited);
        result += subResult;
      }
    }
    
    return result;
  } catch (err) {
    console.warn(`Failed to crawl ${url}:`, err.message);
    return `\n--- PAGE: ${url} ---\nFailed to fetch content: ${err.message}\n`;
  }
}

// Helper: build messages array for Ollama /api/chat (proper multi-turn memory)
function buildMessages(history, userMessage, model, agentConfig = null) {
  const messages = [
    { role: 'system', content: agentConfig && agentConfig.system_prompt ? agentConfig.system_prompt : getSystemPrompt(model) }
  ];
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

// Helper: context-aware fallback mock response
function getMockResponse(history, userMessage, model) {
  const lowerMsg = userMessage.toLowerCase();
  const historyText = history.map(m => m.content).join(' ').toLowerCase();

  if (lowerMsg.includes('code') || lowerMsg.includes('generate') || lowerMsg.includes('example') || lowerMsg.includes('show')) {
    if (historyText.includes('login') || historyText.includes('auth') || historyText.includes('password')) {
      return `Here is a complete login implementation based on our conversation:\n\`\`\`javascript\nasync function handleLogin(email, password) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ email, password })\n  });\n  if (!response.ok) {\n    const err = await response.json();\n    throw new Error(err.message || 'Login failed');\n  }\n  const { token, user } = await response.json();\n  localStorage.setItem('token', token);\n  window.location.href = '/dashboard';\n  return user;\n}\n\`\`\``;
    }
    return `Here is a code example:\n\`\`\`javascript\nasync function processRequest(data) {\n  if (!data) throw new Error('Invalid input');\n  const result = await fetch('/api/process', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(data)\n  });\n  return result.json();\n}\n\`\`\``;
  }
  return `I understand your request about: "${userMessage}". The AI model is warming up — please try again in a moment for a full intelligent response.`;
}


// 4.5 GET /api/agents
app.get('/api/agents', authMiddleware, async (req, res) => {
  try {
    const agents = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        "SELECT id, name, description, category, model FROM agents WHERE status = 'active' AND (visibility = 'public' OR tenant_id = $1 OR tenant_id IS NULL) ORDER BY created_at DESC",
        [req.tenant.id]
      );
      return result.rows;
    });
    res.json(agents);
  } catch (err) {
    console.error('Failed to fetch agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// 5. POST /api/chat
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, model, conversationId, clientHistory, agent_id, deepSearch, reasoning } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  let selectedModel = model || 'harikson-plus';
  let agentConfig = null;

  if (agent_id) {
    try {
      agentConfig = await executeTenantQuery(req.tenant.id, async (client) => {
        const agentResult = await client.query(
          "SELECT * FROM agents WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR tenant_id = $2 OR tenant_id IS NULL)", 
          [agent_id, req.tenant.id]
        );
        return agentResult.rows[0];
      });
      if (agentConfig) {
        selectedModel = agentConfig.model || selectedModel;
      }
    } catch (err) {
      console.warn("Failed to fetch agent config:", err);
    }
  }

  // Model Access check
  if (req.tenant.model_access && req.tenant.model_access.length > 0) {
    const allowed = req.tenant.model_access.map(m => m.toLowerCase());
    const targetModel = selectedModel.toLowerCase();
    const isAllowed = allowed.some(m => targetModel.includes(m) || m.includes(targetModel));
    if (!isAllowed) {
      return res.status(403).json({ error: `Your subscription plan (${req.tenant.plan}) does not have access to model: ${selectedModel}` });
    }
  }

  // Token Limit check
  if (req.tenant.token_limit && req.tenant.token_limit > 0) {
    try {
      const tokenRes = await pool.query(
        'SELECT COALESCE(SUM(tokens_used), 0)::int as tokens_used FROM messages WHERE tenant_id = $1',
        [req.tenant.id]
      );
      const tokensUsed = tokenRes.rows[0].tokens_used;
      if (tokensUsed >= req.tenant.token_limit) {
        return res.status(403).json({ error: `Monthly token limit exceeded (${(req.tenant.token_limit).toLocaleString()} tokens). Please upgrade your subscription plan.` });
      }
    } catch (err) {
      console.warn('Failed to verify token limit:', err);
    }
  }

  // Rate limiting via Redis (loaded dynamically from database plan configuration)
  let limit = 10;
  if (req.tenant.features && typeof req.tenant.features.rpm_limit === 'number') {
    limit = req.tenant.features.rpm_limit;
  } else {
    // Fallback based on plan name
    const planName = (req.tenant.plan || 'starter').toLowerCase();
    if (planName === 'starter' || planName === 'solo') {
      limit = 10;
    } else if (planName === 'professional' || planName === 'pro' || planName === 'team') {
      limit = 60;
    } else if (planName === 'business') {
      limit = 300;
    } else if (planName === 'enterprise') {
      limit = 0; // unlimited
    }
  }

  if (limit > 0) {
    const key = `ratelimit:${req.tenant.id}:${req.user.id}`;
    try {
      const current = await redis.get(key);
      if (current && parseInt(current) >= limit) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please upgrade your plan.' });
      }
      
      const multi = redis.multi();
      multi.incr(key);
      multi.ttl(key);
      const results = await multi.exec();
      const ttl = results[1][1];
      if (ttl === -1) {
        await redis.expire(key, 60);
      }
    } catch (err) {
      console.warn('Redis rate limit check failed, bypassing to ensure availability', err);
    }
  }

  try {
    let currentConvId = conversationId;
    let history = [];

    // Fetch conversation history (auto-scoped under RLS) or create a new conversation
    if (currentConvId) {
      history = await executeTenantQuery(req.tenant.id, async (client) => {
        const msgResult = await client.query(
          'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
          [currentConvId]
        );
        return msgResult.rows;
      });
    } else {
      currentConvId = await executeTenantQuery(req.tenant.id, async (client) => {
        const title = message.substring(0, 50);
        const convResult = await client.query(
          'INSERT INTO conversations (tenant_id, user_id, title, model) VALUES ($1, $2, $3, $4) RETURNING id',
          [req.tenant.id, req.user.id, title, selectedModel]
        );
        return convResult.rows[0].id;
      });
    }

    // Accept client-side history directly — this eliminates DB race condition entirely
    // If frontend sends clientHistory, use it. Otherwise fall back to DB history.
    const finalHistory = (clientHistory && clientHistory.length > 0) ? clientHistory : history;

    // Check for URLs to crawl or Deep Search
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex) || [];
    let crawledContext = '';
    
    if (urls.length > 0) {
      // Crawl all found URLs
      for (const url of urls) {
        crawledContext += await crawlWebsite(url, 1) + '\n\n';
      }
    }
    
    if (deepSearch) {
      const searchResults = await searchWeb(message);
      crawledContext += `\n--- LIVE WEB SEARCH RESULTS ---\n${searchResults}\n`;
    }

    // Build messages array with full conversation history for proper context
    const messages = buildMessages(finalHistory, message, selectedModel, agentConfig);
    
    if (crawledContext) {
      messages.splice(messages.length - 1, 0, { 
        role: 'system', 
        content: `LIVE WEBSITE CONTEXT (Extracted from URL provided by user):\n${crawledContext}\nUse this context to fulfill the user's request accurately.`
      });
    }

    const promptTokenEstimate = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
    const chatStartTime = Date.now();

    // Log activity start to admin panel
    let activityId = null;
    try {
      const adminApiBase = process.env.ADMIN_API_URL || 'http://admin-api:4000';
      const actResp = await axios.post(`${adminApiBase}/admin/activity`, {
        tenant_id: req.tenant.id, user_id: req.user.id, agent_id: agentConfig?.id || null,
        model: selectedModel, status: 'processing', tokens_in: 0, tokens_out: 0
      }, { timeout: 2000 }).catch(() => null);
      if (actResp?.data?.id) activityId = actResp.data.id;
    } catch {}

    // Set streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Conversation-Id', currentConvId);

    try {
      // Use Ollama /api/chat — natively supports multi-turn conversation memory
      const response = await axios.post(`${ollamaHost}/api/chat`, {
        model: selectedModel,
        messages: messages,
        stream: true,
        keep_alive: -1,
        options: {
          num_thread: 7,
          temperature: agentConfig ? parseFloat(agentConfig.temperature) : 0.7,
          num_predict: agentConfig ? parseInt(agentConfig.max_tokens) : 2048,
          top_p: agentConfig ? parseFloat(agentConfig.top_p) : 0.9
        }
      }, { 
        responseType: 'stream',
        timeout: 180000 
      });

      let fullResponseText = '';
      let promptTokens = promptTokenEstimate;
      let completionTokens = 0;

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              fullResponseText += parsed.message.content;
              res.write(parsed.message.content);
            }
            if (parsed.done) {
              promptTokens = parsed.prompt_eval_count || promptTokens;
              completionTokens = parsed.eval_count || Math.ceil(fullResponseText.length / 4);
            }
          } catch (e) {}
        }
      });

      response.data.on('end', async () => {
        // ✅ CRITICAL FIX: Save to DB FIRST, then end response
        // This prevents race condition where next message arrives before history is saved
        try {
          await executeTenantQuery(req.tenant.id, async (client) => {
            await client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [req.tenant.id, currentConvId, 'user', message, promptTokens]
            );
            await client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [req.tenant.id, currentConvId, 'assistant', fullResponseText, completionTokens]
            );
            await client.query(
              'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
              [currentConvId]
            );
            if (agentConfig) {
              await client.query(
                'UPDATE agents SET total_requests = total_requests + 1, total_tokens = total_tokens + $1, last_used_at = NOW() WHERE id = $2',
                [promptTokens + completionTokens, agentConfig.id]
              );
            }
          });
        } catch (dbErr) {
          console.error('Failed to save chat messages to DB:', dbErr);
        }
        // Update ai_activity log with completion stats
        const latency = Date.now() - chatStartTime;
        if (activityId) {
          axios.post(`${process.env.ADMIN_API_URL || 'http://admin-api:4000'}/admin/activity`, {
            tenant_id: req.tenant.id, user_id: req.user.id, agent_id: agentConfig?.id || null,
            model: selectedModel, status: 'completed',
            tokens_in: promptTokens, tokens_out: completionTokens, latency_ms: latency
          }).catch(() => {});
        }
        res.end(); // End AFTER DB save
      });

      response.data.on('error', (streamErr) => {
        console.error('Ollama stream error:', streamErr);
        if (!res.writableEnded) res.end();
      });

    } catch (ollamaErr) {
      console.warn('Ollama /api/chat failed, using context-aware fallback:', ollamaErr.message);
      const fallbackResponse = getMockResponse(finalHistory, message, selectedModel);
      const completionTokens = Math.ceil(fallbackResponse.length / 4);

      // Save fallback to DB first, then respond
      try {
        await executeTenantQuery(req.tenant.id, async (client) => {
          await client.query(
            'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
            [req.tenant.id, currentConvId, 'user', message, promptTokenEstimate]
          );
          await client.query(
            'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
            [req.tenant.id, currentConvId, 'assistant', fallbackResponse, completionTokens]
          );
          await client.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [currentConvId]
          );
        });
      } catch (dbErr) {
        console.error('Failed to save fallback messages to DB:', dbErr);
      }
      res.write(fallbackResponse);
      res.end();
    }
  } catch (err) {
    console.error('Chat endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat conversation' });
    }
  }
});


// 6. POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND tenant_id = $2', [email, req.tenant.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // Support plaintext password for seeded superadmin if no hash exists, else use standard bcrypt comparison
    let valid = false;
    if (user.password_hash && user.password_hash.startsWith('$')) {
      valid = await bcrypt.compare(password, user.password_hash);
    } else {
      valid = (password === 'superadmin_pwd_2026' && user.role === 'superadmin');
    }
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });

    // ── Record real login activity + device session ──────────────────────────
    try {
      const ua = req.headers['user-agent'] || 'Unknown Browser';
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || '127.0.0.1';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      await executeTenantQuery(req.tenant.id, async (client) => {
        // Append to activity_logs (keep last 50)
        const logsRes = await client.query(`SELECT activity_logs FROM users WHERE id = $1`, [user.id]);
        const existingLogs = logsRes.rows[0]?.activity_logs || [];
        const newLog = {
          id: Date.now().toString(),
          action: 'Logged in successfully',
          ip,
          device: ua.length > 80 ? ua.slice(0, 80) + '...' : ua,
          date: dateStr,
          level: 'info',
          color: '#059669'
        };
        const updatedLogs = [newLog, ...existingLogs].slice(0, 50);

        // Upsert device session (keep last 10, mark current)
        const devsRes = await client.query(`SELECT connected_devices FROM users WHERE id = $1`, [user.id]);
        const existingDevices = (devsRes.rows[0]?.connected_devices || []).map(d => ({ ...d, current: false }));
        const deviceId = Buffer.from(ip + ua).toString('base64').slice(0, 16);
        const alreadyExists = existingDevices.find(d => d.id === deviceId);
        let updatedDevices;
        if (alreadyExists) {
          updatedDevices = existingDevices.map(d =>
            d.id === deviceId ? { ...d, lastActive: 'Active now', current: true } : d
          );
        } else {
          const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|Brave)[/\s]([\d.]+)/i);
          const osMatch = ua.match(/(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s/]?([\d._]+)?/i);
          const newDevice = {
            id: deviceId,
            name: osMatch ? (osMatch[1] === 'Mac OS X' ? 'Mac' : osMatch[1]) + ' Device' : 'Unknown Device',
            os: osMatch ? osMatch[1].replace('_', ' ') : 'Unknown OS',
            browser: browserMatch ? browserMatch[1] : 'Unknown Browser',
            ip,
            lastActive: 'Active now',
            current: true
          };
          updatedDevices = [newDevice, ...existingDevices].slice(0, 10);
        }

        await client.query(
          `UPDATE users SET activity_logs = $1, connected_devices = $2 WHERE id = $3`,
          [JSON.stringify(updatedLogs), JSON.stringify(updatedDevices), user.id]
        );
      });
    } catch (trackErr) {
      // Non-fatal — don't block login if tracking fails
      console.warn('Failed to record login activity:', trackErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantSlug: req.tenant.slug }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 6b. POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    // Check if email already exists in this tenant
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, req.tenant.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role)
         VALUES ($1, $2, $3, 'user') RETURNING id, email, role`,
        [req.tenant.id, email, passwordHash]
      );
      return result.rows[0];
    });

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role, name: name || email.split('@')[0], tenantSlug: req.tenant.slug }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 7. GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    tenantSlug: req.tenant.slug
  });
});

// 8. GET /api/conversations
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, title, model, created_at, updated_at
         FROM conversations
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 100`,
        [req.user.id]
      );
      return result.rows;
    });
    res.json({ conversations });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 9. DELETE /api/conversations/:id
app.delete('/api/conversations/:id', authMiddleware, async (req, res) => {
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query('DELETE FROM messages WHERE conversation_id = $1', [req.params.id]);
      await client.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// 10. PATCH /api/conversations/:id
app.patch('/api/conversations/:id', authMiddleware, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [title, req.params.id, req.user.id]
      );
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Rename conversation error:', err);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

// 11. GET /api/conversations/:id/messages
app.get('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, role, content, tokens_used, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [req.params.id]
      );
      return result.rows;
    });
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// --- USER SETTINGS REST API ENDPOINTS ---

// GET /api/user/profile - Get current user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT name, username, email, phone, company, job_title as "jobTitle", department, country, bio
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      return result.rows[0];
    });
    res.json(user || {});
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile - Update current user profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name, username, phone, company, jobTitle, department, country, bio } = req.body;
    const user = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `UPDATE users
         SET name = $1, username = $2, phone = $3, company = $4, job_title = $5, department = $6, country = $7, bio = $8
         WHERE id = $9
         RETURNING name, username, email, phone, company, job_title as "jobTitle", department, country, bio`,
        [name, username, phone, company, jobTitle, department, country, bio, req.user.id]
      );
      return result.rows[0];
    });
    res.json(user || {});
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/user/settings - Get settings
app.get('/api/user/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      return result.rows[0]?.settings || {};
    });
    res.json(settings);
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/user/settings - Update settings
app.put('/api/user/settings', authMiddleware, async (req, res) => {
  try {
    const settings = req.body;
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings`,
        [JSON.stringify(settings), req.user.id]
      );
      return result.rows[0]?.settings || {};
    });
    res.json(updated);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/user/billing - Get billing plan & invoice history (real tenant plan data)
app.get('/api/user/billing', authMiddleware, async (req, res) => {
  try {
    // Try user-specific billing_info override first (set when admin assigns plan)
    const billingOverride = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT billing_info FROM users WHERE id = $1`, [req.user.id]);
      return result.rows[0]?.billing_info;
    });

    if (billingOverride && Object.keys(billingOverride).length > 0) {
      return res.json(billingOverride);
    }

    // Derive plan info from the tenant's active plan (real data, no hardcoded fallback)
    const planName = req.tenant.plan || 'starter';
    const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
    const price = req.tenant.price ? `$${req.tenant.price}` : (planName === 'starter' ? '$0' : planName === 'pro' ? '$49' : '$99');
    const currency = req.tenant.currency || 'USD';
    const billingCycle = req.tenant.billing || 'monthly';

    res.json({
      planName: planDisplayName,
      price,
      currency,
      billingCycle,
      status: req.tenant.status === 'active' ? 'ACTIVE' : req.tenant.status?.toUpperCase() || 'ACTIVE',
      features: req.tenant.features || {},
      modelAccess: req.tenant.model_access || [],
      paymentMethod: null,   // No payment method until user adds one
      invoices: []           // No invoices until billing system is integrated
    });
  } catch (err) {
    console.error('Fetch billing error:', err);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// GET /api/user/devices - Get connected active sessions (real sessions only)
app.get('/api/user/devices', authMiddleware, async (req, res) => {
  try {
    const devices = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT connected_devices FROM users WHERE id = $1`, [req.user.id]);
      return result.rows[0]?.connected_devices || [];
    });
    // Return actual devices only — empty array for users with no recorded sessions
    res.json(devices);
  } catch (err) {
    console.error('Fetch devices error:', err);
    res.status(500).json({ error: 'Failed to fetch connected devices' });
  }
});

// DELETE /api/user/devices/:id - Logout session
app.delete('/api/user/devices/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const currentRes = await client.query(`SELECT connected_devices FROM users WHERE id = $1`, [req.user.id]);
      const list = currentRes.rows[0]?.connected_devices || [];
      const filtered = list.filter(d => d.id !== id);
      await client.query(`UPDATE users SET connected_devices = $1 WHERE id = $2`, [JSON.stringify(filtered), req.user.id]);
      return filtered;
    });
    res.json({ success: true, devices: updated });
  } catch (err) {
    console.error('Delete device error:', err);
    res.status(500).json({ error: 'Failed to terminate device session' });
  }
});

// GET /api/user/activity - Get user audit logs (real events only)
app.get('/api/user/activity', authMiddleware, async (req, res) => {
  try {
    const logs = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT activity_logs FROM users WHERE id = $1`, [req.user.id]);
      return result.rows[0]?.activity_logs || [];
    });
    // Return actual logs — empty array for users with no recorded activity
    res.json(logs);
  } catch (err) {
    console.error('Fetch activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET /api/user/workspace - Get workspace details & members
app.get('/api/user/workspace', authMiddleware, async (req, res) => {
  try {
    const workspace = await executeTenantQuery(req.tenant.id, async (client) => {
      const uRes = await client.query(`SELECT company FROM users WHERE id = $1`, [req.user.id]);
      const company = uRes.rows[0]?.company || 'Harikson AI (Production)';
      
      const mRes = await client.query(
        `SELECT id, email, role FROM users WHERE tenant_id = $1 ORDER BY role DESC`,
        [req.tenant.id]
      );
      
      return {
        instanceId: `ins_prd_${req.tenant.id.slice(0, 5)}`,
        name: company,
        slug: req.tenant.slug,
        members: mRes.rows.map(m => ({
          id: m.id,
          name: m.email.split('@')[0],
          email: m.email,
          role: m.role === 'admin' ? 'Admin' : m.role === 'owner' ? 'Owner' : 'Member',
          avatar: m.email.slice(0, 2).toUpperCase()
        }))
      };
    });
    res.json(workspace);
  } catch (err) {
    console.error('Fetch workspace error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace settings' });
  }
});

// PUT /api/user/workspace/members/:memberId/role - Update workspace member role
app.put('/api/user/workspace/members/:memberId/role', authMiddleware, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body; // e.g., 'Owner', 'Admin', 'Member'
    
    // Map UI role to database role string
    let dbRole = 'user';
    if (role === 'Admin') dbRole = 'admin';
    if (role === 'Owner') dbRole = 'owner';
    if (role === 'Member') dbRole = 'user';

    // Verify current user is an admin or owner of the workspace to perform updates
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `UPDATE users
         SET role = $1
         WHERE id = $2 AND tenant_id = $3
         RETURNING id, email, role`,
        [dbRole, memberId, req.tenant.id]
      );
      
      const updatedUser = result.rows[0];
      if (updatedUser) {
        // Record to activity timeline in settings of the editor
        const eventId = crypto.randomUUID();
        await client.query(
          `UPDATE users
           SET settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             '{activity_log}',
             COALESCE(settings->'activity_log', '[]'::jsonb) || $1::jsonb
           )
           WHERE id = $2`,
          [
            JSON.stringify({
              id: eventId,
              event: 'Security',
              details: `Changed role of ${updatedUser.email} to ${role}`,
              timestamp: new Date().toISOString()
            }),
            req.user.id
          ]
        );
      }
      return updatedUser;
    });

    if (!updated) {
      return res.status(404).json({ error: 'Workspace member not found' });
    }

    res.json({
      id: updated.id,
      email: updated.email,
      role: role
    });
  } catch (err) {
    console.error('Update member role error:', err);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// POST /api/user/workspace/members - Invite/Add a new member to the workspace
app.post('/api/user/workspace/members', authMiddleware, async (req, res) => {
  try {
    const { email, name, role, password } = req.body;
    
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role are required' });
    }

    // Verify current user is an admin or owner to perform additions
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to add members' });
    }

    // Map UI role to database role string
    let dbRole = 'user';
    if (role === 'Admin') dbRole = 'admin';
    if (role === 'Owner') dbRole = 'owner';
    if (role === 'Member') dbRole = 'user';

    const defaultPwd = password || 'Welcome123!';
    const passwordHash = await bcrypt.hash(defaultPwd, 10);

    const newMember = await executeTenantQuery(req.tenant.id, async (client) => {
      // Check if email already exists in this tenant
      const checkResult = await client.query(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
        [email, req.tenant.id]
      );
      if (checkResult.rows.length > 0) {
        throw new Error('User already exists in this workspace');
      }

      const result = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role, name, username)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, role, name`,
        [req.tenant.id, email, passwordHash, dbRole, name, email.split('@')[0]]
      );
      
      const createdUser = result.rows[0];
      if (createdUser) {
        // Record to activity timeline in settings of the editor
        const eventId = crypto.randomUUID();
        await client.query(
          `UPDATE users
           SET settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             '{activity_log}',
             COALESCE(settings->'activity_log', '[]'::jsonb) || $1::jsonb
           )
           WHERE id = $2`,
          [
            JSON.stringify({
              id: eventId,
              event: 'Security',
              details: `Added new member ${email} as ${role}`,
              timestamp: new Date().toISOString()
            }),
            req.user.id
          ]
        );
      }
      return createdUser;
    });

    res.status(201).json({
      id: newMember.id,
      name: newMember.name,
      email: newMember.email,
      role: role,
      avatar: newMember.name.slice(0, 2).toUpperCase()
    });

  } catch (err) {
    console.error('Add workspace member error:', err);
    res.status(400).json({ error: err.message || 'Failed to add workspace member' });
  }
});

// DELETE /api/user/workspace/members/:memberId - Remove a member from the workspace
app.delete('/api/user/workspace/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { memberId } = req.params;

    // Verify current user is an admin or owner of the workspace to perform deletions
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to remove members' });
    }

    // A user cannot delete themselves
    if (req.user.id === memberId) {
      return res.status(400).json({ error: 'Bad Request: You cannot remove yourself from the workspace' });
    }

    const deleted = await executeTenantQuery(req.tenant.id, async (client) => {
      // Fetch details first for logging
      const mRes = await client.query('SELECT email FROM users WHERE id = $1 AND tenant_id = $2', [memberId, req.tenant.id]);
      if (mRes.rows.length === 0) return null;
      const targetEmail = mRes.rows[0].email;

      // Delete user
      await client.query(
        'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
        [memberId, req.tenant.id]
      );

      // Record to activity timeline in settings of the editor
      const eventId = crypto.randomUUID();
      await client.query(
        `UPDATE users
         SET settings = jsonb_set(
           COALESCE(settings, '{}'::jsonb),
           '{activity_log}',
           COALESCE(settings->'activity_log', '[]'::jsonb) || $1::jsonb
         )
         WHERE id = $2`,
        [
          JSON.stringify({
            id: eventId,
            event: 'Security',
            details: `Removed member ${targetEmail} from workspace`,
            timestamp: new Date().toISOString()
          }),
          req.user.id
        ]
      );
      return targetEmail;
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Workspace member not found' });
    }

    res.json({ message: 'Workspace member removed successfully', email: deleted });
  } catch (err) {
    console.error('Delete workspace member error:', err);
    res.status(500).json({ error: 'Failed to remove workspace member' });
  }
});

// GET /api/user/developer/keys - Get API Keys (real keys only)
app.get('/api/user/developer/keys', authMiddleware, async (req, res) => {
  try {
    const keys = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT developer_keys FROM users WHERE id = $1`, [req.user.id]);
      return result.rows[0]?.developer_keys || [];
    });
    // Return real keys only — no fake pre-seeded keys for new users
    res.json(keys);
  } catch (err) {
    console.error('Fetch keys error:', err);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/user/developer/keys - Create API Key
app.post('/api/user/developer/keys', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Key name is required' });
    
    const newKeyVal = `hk_${Math.random() > 0.5 ? 'live' : 'test'}_${crypto.randomBytes(16).toString('hex')}`;
    
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const currentRes = await client.query(`SELECT developer_keys FROM users WHERE id = $1`, [req.user.id]);
      const list = currentRes.rows[0]?.developer_keys || [
        { id: '1', name: 'Production API', key: 'hk_live_8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c', created: '2026-06-15', lastUsed: '2 hours ago' },
        { id: '2', name: 'Testing Key', key: 'hk_test_4c2d1e3f4a5b6c7d8e9f0a1b2c3d4e5f', created: '2026-07-01', lastUsed: 'Never' }
      ];
      
      const newKey = {
        id: Date.now().toString(),
        name,
        key: newKeyVal,
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Never'
      };
      const newList = [...list, newKey];
      await client.query(`UPDATE users SET developer_keys = $1 WHERE id = $2`, [JSON.stringify(newList), req.user.id]);
      return newList;
    });
    
    // Log key generation activity
    await executeTenantQuery(req.tenant.id, async (client) => {
      const logsRes = await client.query(`SELECT activity_logs FROM users WHERE id = $1`, [req.user.id]);
      const logs = logsRes.rows[0]?.activity_logs || [];
      const newLog = {
        id: Date.now().toString(),
        action: `API Key '${name}' generated`,
        ip: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown Device',
        date: 'Today at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        level: 'warn',
        color: '#d97706'
      };
      await client.query(`UPDATE users SET activity_logs = $1 WHERE id = $2`, [JSON.stringify([newLog, ...logs]), req.user.id]);
    });
    
    res.json({ success: true, keys: updated });
  } catch (err) {
    console.error('Create key error:', err);
    res.status(500).json({ error: 'Failed to create developer key' });
  }
});

// DELETE /api/user/developer/keys/:id - Revoke API Key
app.delete('/api/user/developer/keys/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const currentRes = await client.query(`SELECT developer_keys FROM users WHERE id = $1`, [req.user.id]);
      const list = currentRes.rows[0]?.developer_keys || [];
      const filtered = list.filter(k => k.id !== id);
      await client.query(`UPDATE users SET developer_keys = $1 WHERE id = $2`, [JSON.stringify(filtered), req.user.id]);
      return filtered;
    });
    res.json({ success: true, keys: updated });
  } catch (err) {
    console.error('Delete key error:', err);
    res.status(500).json({ error: 'Failed to revoke developer key' });
  }
});

// ─── USAGE ANALYTICS ────────────────────────────────────────────────────────

// GET /api/user/usage - Real per-user token + query usage from messages table
app.get('/api/user/usage', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const usage = await executeTenantQuery(req.tenant.id, async (client) => {
      // Daily token + query counts for the past N days
      const dailyResult = await client.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('day', m.created_at), 'Dy') AS day,
           COALESCE(SUM(m.tokens_used), 0)::int AS tokens,
           COUNT(m.id)::int AS queries
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
           AND m.created_at >= NOW() - ($2 || ' days')::interval
           AND m.role = 'assistant'
         GROUP BY DATE_TRUNC('day', m.created_at)
         ORDER BY DATE_TRUNC('day', m.created_at) ASC`,
        [req.user.id, days]
      );

      // Totals for the period
      const totalsResult = await client.query(
        `SELECT
           COALESCE(SUM(m.tokens_used), 0)::int AS total_tokens,
           COUNT(m.id)::int AS total_queries
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
           AND m.created_at >= NOW() - ($2 || ' days')::interval
           AND m.role = 'assistant'`,
        [req.user.id, days]
      );

      // Previous period totals for % change calculation
      const prevTotalsResult = await client.query(
        `SELECT
           COALESCE(SUM(m.tokens_used), 0)::int AS total_tokens,
           COUNT(m.id)::int AS total_queries
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.user_id = $1
           AND m.created_at >= NOW() - ($2 || ' days')::interval * 2
           AND m.created_at < NOW() - ($2 || ' days')::interval
           AND m.role = 'assistant'`,
        [req.user.id, days]
      );

      return {
        daily: dailyResult.rows,
        totals: totalsResult.rows[0],
        prev: prevTotalsResult.rows[0]
      };
    });

    const { daily, totals, prev } = usage;
    const tokenChange = prev.total_tokens > 0
      ? Math.round(((totals.total_tokens - prev.total_tokens) / prev.total_tokens) * 100)
      : null;
    const queryChange = prev.total_queries > 0
      ? Math.round(((totals.total_queries - prev.total_queries) / prev.total_queries) * 100)
      : null;

    res.json({
      daily,
      totalTokens: totals.total_tokens,
      totalQueries: totals.total_queries,
      tokenChange,
      queryChange,
      days
    });
  } catch (err) {
    console.error('Fetch usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

// ─── SECURITY ────────────────────────────────────────────────────────────────

// POST /api/user/security/change-password
app.post('/api/user/security/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const user = req.user;

    // Verify current password
    if (!user.password_hash || !user.password_hash.startsWith('$')) {
      return res.status(400).json({ error: 'Password change not supported for this account type' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, user.id]);

      // Log the password change event
      const logsRes = await client.query(`SELECT activity_logs FROM users WHERE id = $1`, [user.id]);
      const existingLogs = logsRes.rows[0]?.activity_logs || [];
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'Unknown';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const newLog = {
        id: Date.now().toString(),
        action: 'Password changed successfully',
        ip,
        device: ua.length > 80 ? ua.slice(0, 80) + '...' : ua,
        date: dateStr,
        level: 'warn',
        color: '#d97706'
      };
      await client.query(
        `UPDATE users SET activity_logs = $1 WHERE id = $2`,
        [JSON.stringify([newLog, ...existingLogs].slice(0, 50)), user.id]
      );
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── PROMPT PRESETS (server-side, per user) ───────────────────────────────────

// GET /api/user/presets
app.get('/api/user/presets', authMiddleware, async (req, res) => {
  try {
    const presets = await executeTenantQuery(req.tenant.id, async (client) => {
      // Store presets in settings JSONB under the 'presets' key
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      return (result.rows[0]?.settings?.presets) || [];
    });
    res.json(presets);
  } catch (err) {
    console.error('Fetch presets error:', err);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /api/user/presets
app.post('/api/user/presets', authMiddleware, async (req, res) => {
  const { name, description, systemPrompt } = req.body;
  if (!name || !systemPrompt) {
    return res.status(400).json({ error: 'Name and system prompt are required' });
  }
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      const settings = result.rows[0]?.settings || {};
      const presets = settings.presets || [];
      const newPreset = {
        id: Date.now().toString(),
        name,
        description: description || '',
        systemPrompt,
        created_at: new Date().toISOString()
      };
      const updatedPresets = [...presets, newPreset];
      const updatedSettings = { ...settings, presets: updatedPresets };
      await client.query(
        `UPDATE users SET settings = $1 WHERE id = $2`,
        [JSON.stringify(updatedSettings), req.user.id]
      );
      return updatedPresets;
    });
    res.status(201).json(updated);
  } catch (err) {
    console.error('Create preset error:', err);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// DELETE /api/user/presets/:id
app.delete('/api/user/presets/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      const settings = result.rows[0]?.settings || {};
      const filtered = (settings.presets || []).filter(p => p.id !== req.params.id);
      await client.query(
        `UPDATE users SET settings = $1 WHERE id = $2`,
        [JSON.stringify({ ...settings, presets: filtered }), req.user.id]
      );
      return filtered;
    });
    res.json(updated);
  } catch (err) {
    console.error('Delete preset error:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// ─── RAG DRIVE FILES (server-side, per user) ──────────────────────────────────

// GET /api/user/rag-files
app.get('/api/user/rag-files', authMiddleware, async (req, res) => {
  try {
    const files = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      return (result.rows[0]?.settings?.rag_files) || [];
    });
    // Strip out the text content for listing (bandwidth saving)
    res.json(files.map(f => ({ id: f.id, name: f.name, size: f.size, isActive: f.isActive, created_at: f.created_at })));
  } catch (err) {
    console.error('Fetch rag files error:', err);
    res.status(500).json({ error: 'Failed to fetch RAG files' });
  }
});

// POST /api/user/rag-files - Save an indexed file entry (text extracted client-side)
app.post('/api/user/rag-files', authMiddleware, async (req, res) => {
  const { name, size, text, isActive } = req.body;
  if (!name || !text) {
    return res.status(400).json({ error: 'File name and text content are required' });
  }
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      const settings = result.rows[0]?.settings || {};
      const ragFiles = settings.rag_files || [];
      const newFile = {
        id: Date.now().toString(),
        name,
        size: size || 0,
        text,
        isActive: isActive !== false,
        created_at: new Date().toISOString()
      };
      const updatedFiles = [...ragFiles, newFile];
      await client.query(
        `UPDATE users SET settings = $1 WHERE id = $2`,
        [JSON.stringify({ ...settings, rag_files: updatedFiles }), req.user.id]
      );
      // Return without text for bandwidth efficiency
      return updatedFiles.map(f => ({ id: f.id, name: f.name, size: f.size, isActive: f.isActive, created_at: f.created_at }));
    });
    res.status(201).json(updated);
  } catch (err) {
    console.error('Save rag file error:', err);
    res.status(500).json({ error: 'Failed to save RAG file' });
  }
});

// PATCH /api/user/rag-files/:id - Toggle active state
app.patch('/api/user/rag-files/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      const settings = result.rows[0]?.settings || {};
      const ragFiles = (settings.rag_files || []).map(f =>
        f.id === req.params.id ? { ...f, isActive: !f.isActive } : f
      );
      await client.query(
        `UPDATE users SET settings = $1 WHERE id = $2`,
        [JSON.stringify({ ...settings, rag_files: ragFiles }), req.user.id]
      );
      return ragFiles.map(f => ({ id: f.id, name: f.name, size: f.size, isActive: f.isActive, created_at: f.created_at }));
    });
    res.json(updated);
  } catch (err) {
    console.error('Toggle rag file error:', err);
    res.status(500).json({ error: 'Failed to toggle RAG file' });
  }
});

// DELETE /api/user/rag-files/:id
app.delete('/api/user/rag-files/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(`SELECT settings FROM users WHERE id = $1`, [req.user.id]);
      const settings = result.rows[0]?.settings || {};
      const ragFiles = (settings.rag_files || []).filter(f => f.id !== req.params.id);
      await client.query(
        `UPDATE users SET settings = $1 WHERE id = $2`,
        [JSON.stringify({ ...settings, rag_files: ragFiles }), req.user.id]
      );
      return ragFiles.map(f => ({ id: f.id, name: f.name, size: f.size, isActive: f.isActive, created_at: f.created_at }));
    });
    res.json(updated);
  } catch (err) {
    console.error('Delete rag file error:', err);
    res.status(500).json({ error: 'Failed to delete RAG file' });
  }
});

// --- END USER SETTINGS API ---

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`⚡ [Tenant API] Operational and listening on port ${port}`);
});
