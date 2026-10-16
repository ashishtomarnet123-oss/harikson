import { TitleService } from '../src/services/titleService.js';

console.log('=== RUNNING TITLE SERVICE UNIT TESTS ===\n');

const testCases: Array<{ input: string; expected: string | RegExp; desc: string }> = [
  // Requirement 2 Examples
  {
    input: 'Analyze this business: https://www.myntra.com/',
    expected: /Myntra Business Analysis/i,
    desc: 'URL Business Analysis (Myntra)',
  },
  {
    input: 'Audit my code for security and performance',
    expected: /Code Security Audit/i,
    desc: 'Code Security Audit',
  },
  {
    input: 'Summarize this financial report',
    expected: /Financial Report Summary/i,
    desc: 'Financial Report Summary',
  },
  {
    input: 'Can you explain quantum computing?',
    expected: /Understanding Quantum Computing/i,
    desc: 'Quantum Computing Explanation',
  },
  {
    input: 'Help me plan a Thailand trip in December',
    expected: /Thailand Trip Planning/i,
    desc: 'Thailand Trip Planning',
  },
  {
    input: "Improve my website's Google visibility",
    expected: /Google Visibility Strategy/i,
    desc: 'Google Visibility / SEO',
  },
  {
    input: 'Give me a marketing strategy for Xarwiz',
    expected: /Xarwiz Marketing Strategy/i,
    desc: 'Xarwiz Marketing Strategy',
  },
  {
    input: 'Write a professional email to my bank',
    expected: /Bank Email Draft/i,
    desc: 'Bank Email Draft',
  },
  {
    input: 'ये है मेरी कुंडली, इसका विश्लेषण करो',
    expected: 'कुंडली विश्लेषण',
    desc: 'Hindi: Kundali Analysis',
  },
  {
    input: 'अलविदा संदेश लिखना है',
    expected: 'अलविदा संदेश',
    desc: 'Hindi: Farewell Message',
  },

  // Requirement 3 Examples (Attachments + Tasks)
  {
    input: '<uploaded_file name="financial_2026.pdf" type="application/pdf">some pdf content</uploaded_file>\nAnalyze this document.',
    expected: /Document Analysis/i,
    desc: 'PDF + Analyze this document',
  },
  {
    input: '<uploaded_file name="q3_financial_report.pdf" type="application/pdf">report</uploaded_file>\nSummarize this financial report.',
    expected: /Financial Report Summary/i,
    desc: 'PDF + Summarize financial report',
  },
  {
    input: '<uploaded_file name="sales_data.xlsx" type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">data</uploaded_file>\nAnalyze our monthly sales and identify trends.',
    expected: /Monthly Sales Analysis/i,
    desc: 'Spreadsheet + Monthly sales analysis',
  },
  {
    input: '<uploaded_file name="screen_capture_12.png" type="image/png">img</uploaded_file>\nExplain this screenshot.',
    expected: /Screenshot Analysis/i,
    desc: 'Image + Explain this screenshot',
  },
  {
    input: '<uploaded_file name="vendor_master_agreement.docx" type="application/vnd.openxmlformats-officedocument.wordprocessingml.document">contract</uploaded_file>\nIdentify the legal and commercial risks.',
    expected: /Contract Risk Review/i,
    desc: 'Contract + Identify legal & commercial risks',
  },

  // Attachment without user prompt
  {
    input: '<uploaded_file name="airticket_Document_1791518619881.pdf" type="application/pdf" size="911831"></uploaded_file>',
    expected: /Airticket Document|PDF Document Analysis/i,
    desc: 'PDF Attachment with no user text (timestamp stripped)',
  },
  {
    input: '<uploaded_file name="Xarwiz_Social_Media_Growth_Strategy.pdf" type="application/pdf"></uploaded_file>',
    expected: /Xarwiz Social Media Growth Strategy/i,
    desc: 'Named PDF Attachment without user text',
  },

  // Corrupted / Truncated markup from Screenshot 1
  {
    input: '<uploaded_file name="Xarwiz_So...',
    expected: /Xarwiz So|Document Analysis/i,
    desc: 'Truncated markup from legacy DB bug',
  },
  {
    input: '[Attached Image: "WhatsApp Image 2026-10-16 at 1.12.28 AM.jpeg"]\n\nanalysis this',
    expected: /Image Analysis|Screenshot Analysis/i,
    desc: 'Legacy attached image tag with analysis prompt',
  },

  // Long prompt truncation / summary
  {
    input: 'Can you analyze my current Xarwiz marketing strategy and tell me how to improve the launch in Asian markets?',
    expected: /Xarwiz Marketing Strategy/i,
    desc: 'Long marketing strategy prompt',
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = TitleService.generateDeterministicTitle(tc.input);
  const isValid = typeof tc.expected === 'string' ? result === tc.expected : tc.expected.test(result);

  if (isValid) {
    console.log(`✅ [PASS] ${tc.desc} -> "${result}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${tc.desc} -> Got "${result}", Expected "${tc.expected}"`);
    failed++;
  }
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
