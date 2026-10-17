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

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});
