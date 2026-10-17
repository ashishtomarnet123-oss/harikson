import { UniversalPdfEngine } from '../src/services/pdf/index.js';
import { ContentNormalizer } from '../src/services/pdf/normalizer.js';
import { PdfValidator } from '../src/services/pdf/validator.js';
import { PdfStorageService } from '../src/services/pdf/storage.js';
import { PDF_THEMES } from '../src/services/pdf/themes.js';
import { DocumentModel } from '../src/services/pdf/types.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 XARWIZ UNIVERSAL PDF ENGINE - DEEP TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Markdown Normalization & Sanitization
  // ----------------------------------------------------
  console.log('Test 1: Content Normalization & Script Sanitization');
  const maliciousMarkdown = `# Safe Heading
<script>alert("hacked")</script>
<iframe src="evil.com"></iframe>

Regular paragraph text with [legit link](https://xarwiz.com).
<script type="text/javascript">document.cookie</script>
`;

  const parsedDoc = ContentNormalizer.fromMarkdown(maliciousMarkdown, {
    title: 'Sanitization Verification',
  });

  assert(parsedDoc.title === 'Safe Heading', 'Extracted top heading as title');
  const allText = parsedDoc.blocks.map(b => (b as any).text || '').join(' ');
  assert(!allText.includes('<script>'), 'Stripped raw script tags');
  assert(!allText.includes('evil.com'), 'Stripped iframe tags');
  assert(allText.includes('Regular paragraph text'), 'Preserved genuine user content');

  // ----------------------------------------------------
  // TEST 2: GFM Table Normalization
  // ----------------------------------------------------
  console.log('\nTest 2: GFM Table Parsing and Alignment');
  const tableMd = `
| Service | SLA | Status |
| :--- | :---: | ---: |
| Tenant API | 99.9% | Online |
| Document Engine | 99.99% | Active |
`;
  const tableDoc = ContentNormalizer.fromMarkdown(tableMd);
  const tableBlock = tableDoc.blocks.find(b => b.type === 'table') as any;
  assert(tableBlock !== undefined, 'Found table block');
  assert(tableBlock.headers.length === 3, 'Table headers parsed (3 columns)');
  assert(tableBlock.rows.length === 2, 'Table rows parsed (2 rows)');
  assert(tableBlock.alignments[0] === 'left', 'Left alignment detected');
  assert(tableBlock.alignments[1] === 'center', 'Center alignment detected');
  assert(tableBlock.alignments[2] === 'right', 'Right alignment detected');

  // ----------------------------------------------------
  // TEST 3: Multilingual & Hindi Devanagari Unicode
  // ----------------------------------------------------
  console.log('\nTest 3: Multilingual & Devanagari Hindi Font Support');
  const hindiMd = `# ज़ारविज़ सॉवरेन एआई प्लेटफ़ॉर्म
## भारतीय उद्यमों के लिए डेटा संप्रभुता

ज़ारविज़ एक संपूर्ण स्वदेशी और सुरक्षित एआई आर्किटेक्चर प्रदान करता है।
लागत: ₹4,999 प्रति माह।

- [x] डीपीडीपी अधिनियम 2023 अनुपालन (DPDP Act Compliance)
- [x] हिंदी और हिंग्लिश में प्राकृतिक भाषा प्रसंस्करण
- [ ] मासिक सुरक्षा ऑडिट
`;
  const hindiRender = await UniversalPdfEngine.renderDirect(hindiMd, {
    theme: 'corporate',
    includeCoverPage: false,
    includeHeaderFooter: true,
  });

  assert(hindiRender.buffer.length > 5000, `Hindi PDF rendered buffer size: ${hindiRender.buffer.length} bytes`);
  assert(hindiRender.pageCount === 1, `Single-page compact Hindi summary: ${hindiRender.pageCount} page`);

  const hindiVal = await PdfValidator.validateBuffer(hindiRender.buffer);
  assert(hindiVal.isValid, 'Hindi PDF passed structural byte validation (%PDF header and %%EOF trailer)');

  // ----------------------------------------------------
  // TEST 4: Multi-Theme Support
  // ----------------------------------------------------
  console.log('\nTest 4: Visual Themes Rendering');
  const themes = ['corporate', 'minimal', 'technical', 'academic', 'xarwiz'] as const;
  for (const t of themes) {
    const tRender = await UniversalPdfEngine.renderDirect('# Theme Test Document\n\nTesting theme tokens.', {
      theme: t,
    });
    assert(tRender.buffer.length > 4000, `Rendered theme '${t}' successfully (${tRender.buffer.length} bytes)`);
  }

  // ----------------------------------------------------
  // TEST 5: Chat Transcript Format Normalization
  // ----------------------------------------------------
  console.log('\nTest 5: Chat Transcript Normalization');
  const transcriptDoc = ContentNormalizer.fromChatConversation({
    messages: [
      { role: 'user', content: 'What is DPDP 2023 compliance?' },
      { role: 'assistant', content: 'DPDP 2023 is India\'s comprehensive data privacy framework.' },
    ],
    title: 'Chat Session Review',
  });

  assert(transcriptDoc.title === 'Chat Session Review', 'Chat transcript title set');
  assert(transcriptDoc.blocks.some(b => b.type === 'callout'), 'User turns formatted as styled callout cards');
  assert(transcriptDoc.blocks.some(b => b.type === 'paragraph'), 'Assistant response parsed into content blocks');

  // ----------------------------------------------------
  // TEST 6: Tenant Storage Isolation & Directory Traversal Protection
  // ----------------------------------------------------
  console.log('\nTest 6: Tenant Storage Isolation & Security');
  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';

  const resA = await UniversalPdfEngine.generateDocumentPdf(tenantA, '# Tenant A Confidential Data');
  assert(resA.artifact.storagePath.includes(tenantA), 'Artifact stored in tenant A folder');

  // Verify Tenant B cannot access Tenant A's file
  const crossTenantAccess = PdfStorageService.getPdfFile(tenantB, resA.artifact.fileId);
  assert(!crossTenantAccess.exists, 'Tenant B blocked from accessing Tenant A file (tenant isolation verified)');

  // Traversal attack test
  const traversalAccess = PdfStorageService.getPdfFile(tenantA, '../../etc/passwd');
  assert(!traversalAccess.exists, 'Path traversal attack safely rejected by storage service');

  // ----------------------------------------------------
  // TEST 7: Long Multi-Page Document & Table Pagination
  // ----------------------------------------------------
  console.log('\nTest 7: Long Multi-Page Document & Repeating Table Headers');
  let longTableMd = '# Large Scale Cloud Architecture Benchmarks\n\n| Cluster ID | Region | Nodes | Pods | Latency | Status |\n|---|---|---|---|---|---|\n';
  for (let r = 1; r <= 60; r++) {
    longTableMd += `| cluster-ind-node-${r.toString().padStart(3, '0')} | ap-south-1 | ${r * 4} | ${r * 40} | ${12 + (r % 7)}ms | Active |\n`;
  }

  const multiPageRes = await UniversalPdfEngine.renderDirect(longTableMd, {
    theme: 'corporate',
    includeCoverPage: true,
    includeHeaderFooter: true,
  });

  assert(multiPageRes.pageCount >= 3, `Correctly paginated 60-row table across multiple pages (Count: ${multiPageRes.pageCount})`);
  const multiVal = await PdfValidator.validateBuffer(multiPageRes.buffer);
  assert(multiVal.isValid, 'Multi-page document passed deep PDF validation');

  // ----------------------------------------------------
  // TEST 8: PdfOrchestrator Intent Detection
  // ----------------------------------------------------
  console.log('\nTest 8: PdfOrchestrator Intent Detection & Theme Selection');
  const { PdfOrchestrator } = await import('../src/services/pdf/index.js');

  const intent1 = PdfOrchestrator.detectPdfIntent('Make this into a PDF', true);
  assert(intent1.isPdfIntent && intent1.type === 'EXPORT_PREVIOUS', 'Recognized "Make this into a PDF" as EXPORT_PREVIOUS');

  const intent2 = PdfOrchestrator.detectPdfIntent('Export your previous answer as a PDF', true);
  assert(intent2.isPdfIntent && intent2.type === 'EXPORT_PREVIOUS', 'Recognized "Export your previous answer as a PDF"');

  const intent3 = PdfOrchestrator.detectPdfIntent('Give me the downloadable version', true);
  assert(intent3.isPdfIntent && intent3.type === 'EXPORT_PREVIOUS', 'Recognized "Give me the downloadable version"');

  const intent4 = PdfOrchestrator.detectPdfIntent('Create a PDF marketing strategy for my company', false);
  assert(intent4.isPdfIntent && intent4.type === 'GENERATE_NEW_PDF', 'Recognized "Create a PDF marketing strategy..." as GENERATE_NEW_PDF');
  assert(intent4.title?.includes('Marketing Strategy'), `Extracted title: ${intent4.title}`);

  const intent5 = PdfOrchestrator.detectPdfIntent('Generate an investor pitch report in PDF format', false);
  assert(intent5.isPdfIntent && intent5.theme === 'executive', 'Mapped investor pitch to executive theme');

  const intent6 = PdfOrchestrator.detectPdfIntent('Create a technical architecture document as a PDF', false);
  assert(intent6.isPdfIntent && intent6.theme === 'technical', 'Mapped architecture document to technical theme');

  const intent7 = PdfOrchestrator.detectPdfIntent('What is a PDF?', true);
  assert(!intent7.isPdfIntent && intent7.type === 'NONE', 'Correctly excluded informational question "What is a PDF?"');

  const intent8 = PdfOrchestrator.detectPdfIntent('Explain the difference between PDF and DOCX files', true);
  assert(!intent8.isPdfIntent && intent8.type === 'NONE', 'Correctly excluded educational question "difference between PDF and DOCX"');

  // ----------------------------------------------------
  // TEST 9: Executive, Professional & Branded Themes
  // ----------------------------------------------------
  console.log('\nTest 9: Executive, Professional & Branded Themes');
  const execDoc = await UniversalPdfEngine.renderDirect('# Executive Board Report\n\nQ3 Financial and Strategic Review', {
    theme: 'executive',
    includeCoverPage: true,
  });
  assert(execDoc.buffer.length > 5000, `Rendered executive theme: ${execDoc.buffer.length} bytes`);
  assert(execDoc.pageCount >= 2, `Cover page + content = ${execDoc.pageCount} pages`);

  const profDoc = await UniversalPdfEngine.renderDirect('# Professional Proposal\n\nEnterprise Services Agreement', {
    theme: 'professional' as any,
  });
  assert(profDoc.buffer.length > 4000, `Rendered professional theme alias: ${profDoc.buffer.length} bytes`);

  // ----------------------------------------------------
  // TEST 10: Complete End-to-End PDF Compilation & Storage
  // ----------------------------------------------------
  console.log('\nTest 10: Full End-to-End PDF Generation & Persistence');
  const sampleTenant = 'test-e2e-tenant-0001';
  const sampleContent = `# Comprehensive Business & Technology Strategy

## Executive Summary
This document provides a complete 360-degree blueprint for national AI deployment across sovereign cloud infrastructure.

## Strategic Pillars
**1. Infrastructure Sovereignty**
Deploying dedicated on-premise compute nodes with zero foreign data egress.

**2. Enterprise Automation**
Integrating autonomous agents across document analysis, compliance auditing, and workflows.

## Benchmarks & Milestones
| Quarter | Target Milestones | SLA Requirement |
| :--- | :--- | :---: |
| Q1 2026 | Initial Pilot & Security Audit | 99.9% |
| Q2 2026 | National Sovereign Cloud Rollout | 99.99% |
| Q3 2026 | Full DPDP 2023 Certification | 100% |

> **Security Note**: All cryptographic keys are rotated every 90 days in accordance with ISO 27001 standards.

## Conclusion & Next Steps
Immediate implementation commences with cluster provisioning in Asia-South regions.
`;

  const generated = await UniversalPdfEngine.generateDocumentPdf(sampleTenant, sampleContent, {
    defaultTitle: 'Comprehensive Business & Technology Strategy',
    theme: 'executive',
    includeCoverPage: true,
    includeHeaderFooter: true,
  });

  assert(generated.artifact.fileId.length > 0, `Generated artifact fileId: ${generated.artifact.fileId}`);
  assert(generated.artifact.pageCount >= 2, `Verified page count: ${generated.artifact.pageCount}`);
  assert(generated.artifact.sizeBytes > 8000, `Verified file size: ${generated.artifact.sizeBytes} bytes`);

  // Verify file was written to disk and can be retrieved via storage service
  const fetchedFile = PdfStorageService.getPdfFile(sampleTenant, generated.artifact.fileId);
  assert(fetchedFile.exists, `File exists on storage: ${fetchedFile.filename}`);
  assert(fetchedFile.buffer.length === generated.artifact.sizeBytes, 'Fetched buffer size matches generated size');

  const fetchedVal = await PdfValidator.validateBuffer(fetchedFile.buffer);
  assert(fetchedVal.isValid, 'Persisted file passed deep PDF validation (%PDF- signature and valid pages)');

  // ----------------------------------------------------
  // TEST 11: AI Disclaimer & Meta-Text Scrubbing
  // ----------------------------------------------------
  console.log('\nTest 11: AI Model Disclaimer Scrubbing & Smart Title Detection');
  const dirtyModelOutput = `I'm sorry for the confusion, but as a text-based model, I don't have the capability to create or produce PDF files. However, you can use this markdown text as a starting point and export it to a PDF using a tool or software that supports markdown to PDF conversion. Here’s the markdown text for the marketing strategy plan blueprint:

Marketing Strategy Plan Blueprint

1. Executive Summary
- Overview: A concise summary of the marketing strategy.
- Objectives: Define the specific outcomes.

2. Market Analysis
- Target Market: Identify and define your target audience.

You can copy and paste this markdown content into a markdown editor or document, and then use a tool such as pandoc or a word processor that supports markdown to convert it to a PDF.`;

  const normalizedDirty = ContentNormalizer.fromMarkdown(dirtyModelOutput, {
    defaultTitle: 'Pdf For Me Of This Detail',
    includeCoverPage: true,
  });

  // Verify that disclaimers are completely stripped
  const dirtyAllText = normalizedDirty.blocks.map(b => (b as any).text || '').join(' ');
  assert(!dirtyAllText.includes("text-based model"), 'Stripped "text-based model" disclaimer');
  assert(!dirtyAllText.includes("capability to create"), 'Stripped capability apology');
  assert(!dirtyAllText.includes("pandoc"), 'Stripped pandoc advice');
  assert(!dirtyAllText.includes("export it to a PDF using a tool"), 'Stripped conversion advice');

  // Verify title was promoted from content rather than keeping prompt artifact
  assert(normalizedDirty.title === 'Marketing Strategy Plan Blueprint', `Title promoted to: ${normalizedDirty.title}`);

  // Test intent detection on "Pdf For Me Of This Detail"
  const intentExportDetail = PdfOrchestrator.detectPdfIntent('Pdf For Me Of This Detail', true);
  assert(intentExportDetail.isPdfIntent, 'Recognized "Pdf For Me Of This Detail" as PDF intent');
  assert(intentExportDetail.type === 'EXPORT_PREVIOUS', 'Recognized "Pdf For Me Of This Detail" as EXPORT_PREVIOUS');

  // Verify full render of stripped document succeeds without disclaimers
  const renderedClean = await UniversalPdfEngine.renderDirect(dirtyModelOutput, {
    defaultTitle: 'Pdf For Me Of This Detail',
    theme: 'executive',
    includeCoverPage: true,
  });
  assert(renderedClean.buffer.length > 5000, `Rendered cleaned PDF buffer: ${renderedClean.buffer.length} bytes`);
  assert(renderedClean.pageCount >= 2, `Rendered clean doc page count: ${renderedClean.pageCount}`);

  // ----------------------------------------------------
  // TEST 12: Creative Document Design & Visual Graphics (Sections 25-36)
  // ----------------------------------------------------
  console.log('\nTest 12: Creative Document Design, Vector Graphics & Visual Visualizations');

  // 12a. Marketing Strategy with KPI Metric Cards & Phased Timeline
  const marketingMd = `# Omnichannel Enterprise Growth & Marketing Blueprint
## Executive Summary
This strategic roadmap defines market positioning, budget allocation, and multi-channel acquisition tactics.

## Key Performance Indicators
\`\`\`kpi
98.5% | Customer Retention | up | +4.2% YoY
₹14.8 Cr | Quarterly Revenue | up | +28% MoM
4.8 / 5 | NPS Satisfaction | neutral | Top Tier
< 24 hrs | Campaign Turnaround | down | -6 hrs
\`\`\`

## Implementation Roadmap
* **Phase 1 (Q1 2026)**: Market Research, Customer Discovery & ICP Refinement [Completed]
* **Phase 2 (Q2 2026)**: Production of Omnichannel Creative Collateral & Pilot Campaigns [In Progress]
* **Phase 3 (Q3 2026)**: Full Pan-India Digital & Direct Enterprise Rollout [Planned]
* **Phase 4 (Q4 2026)**: Performance Attribution Audit & Retention Optimization [Planned]
`;

  const mktDoc = ContentNormalizer.fromMarkdown(marketingMd, { theme: 'corporate' });
  const kpiBlock = mktDoc.blocks.find(b => b.type === 'kpi') as any;
  assert(kpiBlock !== undefined, 'KPI block parsed from markdown');
  assert(kpiBlock.items.length === 4, 'All 4 KPI metric cards extracted');
  assert(kpiBlock.items[0].value === '98.5%', 'KPI value parsed: 98.5%');
  assert(kpiBlock.items[0].trend === 'up', 'KPI trend recognized: up');

  const timelineBlock = mktDoc.blocks.find(b => b.type === 'timeline') as any;
  assert(timelineBlock !== undefined, 'Elevated roadmap list into vector timeline block');
  assert(timelineBlock.items.length === 4, 'Timeline contains all 4 implementation phases');
  assert(timelineBlock.items[0].status === 'Completed', 'Extracted milestone status: Completed');

  const mktRender = await UniversalPdfEngine.renderDirect(marketingMd, {
    theme: 'corporate',
    includeCoverPage: false,
    includeHeaderFooter: true,
  });
  assert(mktRender.buffer.length > 15000, `Rendered marketing PDF with vector KPI & Timeline: ${mktRender.buffer.length} bytes`);
  const mktVal = await PdfValidator.validateBuffer(mktRender.buffer);
  assert(mktVal.isValid, 'Marketing PDF passed deep PDF validation');

  // 12b. Financial Report with Vector Bar Chart and Donut Chart
  const financialMd = `# Q1 Enterprise Financial Performance & Capital Allocation
## Revenue by Business Line
\`\`\`chart
{
  "chartType": "bar",
  "title": "Quarterly Revenue Breakdown (in Lakhs)",
  "labels": ["Sovereign AI Compute", "Enterprise Cloud", "Managed Security", "Consulting"],
  "values": [420, 280, 190, 110],
  "unit": "Lakhs"
}
\`\`\`

## Capital Allocation Distribution
\`\`\`chart
{
  "chartType": "donut",
  "title": "Operating Expenditure Distribution",
  "labels": ["R&D & Engineering", "Infrastructure & GPUs", "Enterprise Sales", "G&A"],
  "values": [45, 30, 15, 10]
}
\`\`\`
`;

  const finDoc = ContentNormalizer.fromMarkdown(financialMd, { theme: 'executive' });
  const chartBlocks = finDoc.blocks.filter(b => b.type === 'chart') as any[];
  assert(chartBlocks.length === 2, 'Parsed both Bar and Donut chart blocks');
  assert(chartBlocks[0].chartType === 'bar', 'First chart is Bar chart');
  assert(chartBlocks[1].chartType === 'donut', 'Second chart is Donut chart');

  const finRender = await UniversalPdfEngine.renderDirect(financialMd, {
    theme: 'executive',
    includeCoverPage: true,
    includeHeaderFooter: true,
  });
  assert(finRender.buffer.length > 20000, `Rendered financial PDF with native vector charts: ${finRender.buffer.length} bytes`);
  assert(finRender.pageCount >= 2, `Financial report with cover page rendered ${finRender.pageCount} pages`);
  const finVal = await PdfValidator.validateBuffer(finRender.buffer);
  assert(finVal.isValid, 'Financial PDF passed deep structural validation');

  // 12c. Technical Architecture Diagram & Multi-Column Comparison
  const techMd = `# Zero-Trust Cloud Architecture & Security Audit
## Severity & Remediation Matrix
| ID | Vulnerability | Severity | CVSS | Remediation Status |
| :--- | :--- | :---: | :---: | :--- |
| SEC-01 | TLS 1.2 Deprecation | Low | 3.1 | Patched |
| SEC-02 | Key Rotation Interval | Medium | 5.4 | In Progress |

## Security Pipeline Architecture
\`\`\`diagram
1. Vulnerability Ingestion: Automated daily SAST/DAST scanner runs across clusters
2. Triage & Quarantine: Automated isolation of non-compliant container pods
3. Canary Verification: Automated deployment to staging sandbox with synthetic traffic
4. Production Promotion: Zero-downtime rolling update across all sovereign regions
\`\`\`

## Architecture Deployment Comparison
\`\`\`comparison
{
  "title": "Deployment Options Comparison",
  "columns": [
    {
      "title": "Public Multi-Tenant",
      "isPrimary": false,
      "points": ["Shared compute nodes", "Multi-tenant database", "Standard public ingress"]
    },
    {
      "title": "Sovereign Dedicated",
      "isPrimary": true,
      "badge": "RECOMMENDED",
      "points": ["Air-gapped on-premise compute", "Dedicated HSM keys", "100% DPDP 2023 compliant"]
    }
  ]
}
\`\`\`
`;

  const techDoc = ContentNormalizer.fromMarkdown(techMd, { theme: 'technical' });
  const diagramBlock = techDoc.blocks.find(b => b.type === 'diagram') as any;
  assert(diagramBlock !== undefined, 'Parsed diagram block');
  assert(diagramBlock.steps.length === 4, 'Diagram has 4 sequential steps');

  const compBlock = techDoc.blocks.find(b => b.type === 'comparison') as any;
  assert(compBlock !== undefined, 'Parsed comparison block');
  assert(compBlock.columns.length === 2, 'Comparison has 2 columns');
  assert(compBlock.columns[1].isPrimary === true, 'Second column marked as primary recommendation');

  const techRender = await UniversalPdfEngine.renderDirect(techMd, { theme: 'technical' });
  assert(techRender.buffer.length > 18000, `Rendered technical audit PDF: ${techRender.buffer.length} bytes`);
  const techVal = await PdfValidator.validateBuffer(techRender.buffer);
  assert(techVal.isValid, 'Technical audit PDF passed validation');

  // 12d. Editorial Theme & Table of Contents Rendering
  const editorialMd = `# Modern AI Governance & Legal Frameworks
## 1. Regulatory Context
The Digital Personal Data Protection Act establishes stringent sovereign residency rules.

## 2. Institutional Compliance
Organizations must implement automated auditing and verifiable consent trails.

## 3. Implementation Recommendations
Deploying on-premise models eliminates foreign cross-border data egress risks.
`;

  const editRender = await UniversalPdfEngine.renderDirect(editorialMd, {
    theme: 'editorial',
    includeCoverPage: true,
    includeTableOfContents: true,
    includeHeaderFooter: true,
  });
  assert(editRender.buffer.length > 20000, `Rendered editorial theme with TOC: ${editRender.buffer.length} bytes`);
  assert(editRender.pageCount >= 2, `Editorial document page count: ${editRender.pageCount}`);

  // ----------------------------------------------------
  // TEST 13: Accuracy, Data Integrity & Negative Tests (Section 32 & 37)
  // ----------------------------------------------------
  console.log('\nTest 13: Accuracy, Source Integrity & Negative Testing');

  // 13a. Document with NO numerical data must NOT fabricate charts
  const noDataMd = `# Philosophical Analysis of Autonomy
The concept of autonomous decision-making in multi-agent architectures raises fundamental epistemological questions.
Agency is defined by intentionality and state preservation across asynchronous message boundaries.
`;
  const noDataDoc = ContentNormalizer.fromMarkdown(noDataMd);
  const fabricatedCharts = noDataDoc.blocks.filter(b => b.type === 'chart');
  assert(fabricatedCharts.length === 0, 'No charts fabricated when source contains no numerical data');

  // 13b. Plain text export request does NOT receive unnecessary graphics
  const plainMd = `# Simple Notes
- Task 1: Review deployment
- Task 2: Update documentation
`;
  const plainDoc = ContentNormalizer.fromMarkdown(plainMd, {
    defaultTitle: 'Plain Notes',
    theme: 'minimal',
  });
  const plainVisuals = plainDoc.blocks.filter(b => ['chart', 'kpi', 'diagram', 'comparison'].includes(b.type));
  assert(plainVisuals.length === 0, 'Plain request received no forced graphics (preserved simple lists)');

  // 13c. Intent detection for editorial theme
  const editorialIntent = PdfOrchestrator.detectPdfIntent('Create an editorial article for our magazine in PDF', false);
  assert(editorialIntent.isPdfIntent, 'Recognized editorial PDF intent');
  assert(editorialIntent.theme === 'editorial', 'Detected editorial theme');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});

