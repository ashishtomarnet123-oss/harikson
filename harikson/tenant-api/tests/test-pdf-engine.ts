import fs from 'fs';
import path from 'path';
import { UniversalPdfEngine } from '../src/services/pdf/index.js';
import { PdfValidator } from '../src/services/pdf/validator.js';

async function runTest() {
  console.log('--- Starting Universal PDF Engine Verification ---');

  const testMarkdown = `# Enterprise Market Intelligence & Automation
## Q4 Performance Analysis & Sovereign AI Road-map

This executive report summarizes the latest automation benchmarks and AI agent performance across multi-cloud enterprise deployments.

> [!NOTE]
> All metrics comply with the Digital Personal Data Protection (DPDP) Act, 2023 of India.

### Multilingual Support & Devanagari Testing
भारत के उद्यमों के लिए समर्पित AI समाधान। Xarwiz प्लेटफॉर्म पर स्वदेशी डेटा सुरक्षा, हिंदी और हिंग्लिश भाषा में सहज कार्यप्रवाह सुनिश्चित किया गया है।

### Key Architectural Benchmarks

| Component | Target SLA | Measured P99 | Availability | Status |
|---|---|---|---|---|
| Document Intelligence | < 1200ms | 840ms | 99.98% | Active |
| Multilingual Embedding | < 300ms | 195ms | 99.99% | Operational |
| Workflow Orchestrator | < 500ms | 310ms | 99.95% | Healthy |
| PDF Generation Engine | < 1500ms | 420ms | 100.0% | Certified |

### Operational Implementation Checklist

- [x] Configure TrueType Unicode font fallback
- [x] Repeat table headers across page breaks
- [x] Prevent orphan headings at page boundaries
- [ ] Schedule automated monthly compliance audit

### System Integration Code Example

\`\`\`typescript
import { UniversalPdfEngine } from './pdf/index.js';

const { artifact, buffer } = await UniversalPdfEngine.generateDocumentPdf('tenant_demo', markdown, {
  theme: 'corporate',
  includeCoverPage: true,
  includeHeaderFooter: true
});
console.log('Report generated:', artifact.downloadUrl, buffer.length);
\`\`\`

> [!TIP]
> Pro-tip: For wide datasets exceeding 6 columns, set orientation to landscape for optimal presentation.

<!-- pagebreak -->

# Section 2: Deep-Dive Pagination & Stress Test

This paragraph tests page continuity and running header/footer pagination after an intentional page break.

| Metric | 2024 Baseline | 2025 Projected | 2026 Target | Variance |
|---|---|---|---|---|
| Token Throughput | 450 t/s | 1,200 t/s | 3,500 t/s | +191% |
| Retrieval Accuracy | 88.4% | 94.2% | 97.8% | +6.5% |
| Memory Footprint | 2.1 GB | 1.4 GB | 850 MB | -39% |

End of verification report.
`;

  // 1. Generate PDF with Cover Page
  console.log('1. Generating PDF document with cover page...');
  const result = await UniversalPdfEngine.generateDocumentPdf(
    '00000000-0000-0000-0000-000000000001',
    testMarkdown,
    {
      filename: 'xarwiz_compliance_test',
      theme: 'corporate',
      includeCoverPage: true,
      includeHeaderFooter: true,
      metadata: {
        title: 'Enterprise Market Intelligence & Automation',
        author: 'Principal Architect',
        organization: 'Xarwiz India Enterprise',
        confidentiality: 'Confidential',
      },
    }
  );

  console.log('✓ PDF Generated successfully!');
  console.log('  File ID:', result.artifact.fileId);
  console.log('  Page Count:', result.artifact.pageCount);
  console.log('  Size (bytes):', result.artifact.sizeBytes);
  console.log('  Storage Path:', result.artifact.storagePath);

  // 2. Validate Buffer
  console.log('2. Running deep PDF validation...');
  const validation = await PdfValidator.validateBuffer(result.buffer);
  console.log('  Validation Result:', validation);

  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // 3. Test Direct Render (no disk persistence)
  console.log('3. Testing direct streaming render...');
  const direct = await UniversalPdfEngine.renderDirect(
    '# Quick Summary\n\nShort note generated directly without storage.',
    { theme: 'minimal' }
  );
  console.log('✓ Direct render success, buffer length:', direct.buffer.length, 'pages:', direct.pageCount);

  console.log('--- ALL UNIVERSAL PDF ENGINE TESTS PASSED! ---');
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
