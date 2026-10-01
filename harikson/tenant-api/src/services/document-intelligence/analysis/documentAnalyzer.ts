import { DocumentType, DocumentEntity, DocumentMetadata } from '../types.js';

export class DocumentAnalyzer {
  /**
   * Classify document based on text content, filename and structure
   */
  public static classifyDocument(filename: string, fullText: string, extension: string): DocumentType {
    const textLower = fullText.toLowerCase().substring(0, 8000);
    const nameLower = filename.toLowerCase();

    if (['xlsx', 'xls', 'csv', 'tsv'].includes(extension)) return 'spreadsheet';
    if (['pptx'].includes(extension)) return 'presentation';
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'php', 'rb', 'rs', 'cpp', 'c', 'sql'].includes(extension)) {
      return 'source_code';
    }

    if (nameLower.includes('invoice') || textLower.includes('tax invoice') || textLower.includes('bill to:') || textLower.includes('invoice number')) {
      return 'invoice';
    }
    if (nameLower.includes('receipt') || textLower.includes('receipt #') || textLower.includes('total payment:')) {
      return 'receipt';
    }
    if (nameLower.includes('contract') || nameLower.includes('agreement') || textLower.includes('by and between') || textLower.includes('confidentiality agreement') || textLower.includes('indemnification')) {
      return 'contract';
    }
    if (nameLower.includes('resume') || nameLower.includes('cv') || textLower.includes('curriculum vitae') || (textLower.includes('experience') && textLower.includes('education') && textLower.includes('skills'))) {
      return 'resume';
    }
    if (nameLower.includes('financial') || textLower.includes('balance sheet') || textLower.includes('income statement') || textLower.includes('cash flow') || textLower.includes('fiscal year')) {
      return 'financial_report';
    }
    if (nameLower.includes('policy') || textLower.includes('terms of service') || textLower.includes('privacy policy') || textLower.includes('acceptable use')) {
      return 'policy';
    }
    if (textLower.includes('abstract') && textLower.includes('methodology') && textLower.includes('references')) {
      return 'research_paper';
    }
    if (textLower.includes('meeting minutes') || textLower.includes('attendees:') || textLower.includes('action items:')) {
      return 'meeting_notes';
    }
    if (textLower.includes('architecture') || textLower.includes('api documentation') || textLower.includes('sdk reference')) {
      return 'technical_doc';
    }
    if (textLower.includes('court') || textLower.includes('plaintiff') || textLower.includes('defendant') || textLower.includes('jurisdiction')) {
      return 'legal';
    }

    return 'general';
  }

  /**
   * Extract business entities using regex pattern matching
   */
  public static extractEntities(text: string): DocumentEntity[] {
    const entities: DocumentEntity[] = [];
    const sample = text.substring(0, 30000);

    // Amounts (e.g. $1,250.00, ₹99,999, €450, 100,000 INR)
    const amountRegex = /(?:[\$₹€]|USD|EUR|INR|GBP)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/gi;
    let match: RegExpExecArray | null;
    let amountCount = 0;
    while ((match = amountRegex.exec(sample)) !== null && amountCount < 8) {
      entities.push({ type: 'amount', value: match[0].trim() });
      amountCount++;
    }

    // Dates (e.g. 2026-09-30, 15 May 2025, May 15, 2024)
    const dateRegex = /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi;
    let dateCount = 0;
    while ((match = dateRegex.exec(sample)) !== null && dateCount < 6) {
      entities.push({ type: 'date', value: match[0].trim() });
      dateCount++;
    }

    // Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
    let emailCount = 0;
    while ((match = emailRegex.exec(sample)) !== null && emailCount < 5) {
      entities.push({ type: 'email', value: match[0].trim() });
      emailCount++;
    }

    // Invoice / Contract IDs
    const idRegex = /(?:INV|PO|REF|CNTR|AGR)[-_#]?\s*([A-Za-z0-9-]{4,16})/gi;
    let idCount = 0;
    while ((match = idRegex.exec(sample)) !== null && idCount < 4) {
      entities.push({ type: 'invoice_number', value: match[0].trim() });
      idCount++;
    }

    return entities;
  }

  /**
   * Generate contextual suggested questions based on classified document type
   */
  public static generateSuggestedQuestions(docType: DocumentType, filename: string): string[] {
    switch (docType) {
      case 'contract':
        return [
          'What are the payment terms and schedules?',
          'What are the termination conditions and notice periods?',
          'What are the liabilities and indemnity obligations?',
          'Highlight any non-standard clauses or penalties.'
        ];
      case 'invoice':
      case 'receipt':
        return [
          'Extract invoice number, total amount, and due date.',
          'List all billable line items and tax calculations.',
          'Verify if the total matches individual item sums.',
          'Identify vendor information and bank transfer details.'
        ];
      case 'financial_report':
        return [
          'Summarize the financial performance and revenue changes.',
          'What are the highest cost drivers and operating expenses?',
          'Identify potential financial risks or cash flow concerns.',
          'Compare year-over-year revenue and net profit margins.'
        ];
      case 'spreadsheet':
        return [
          'Summarize key totals, averages, and column distributions.',
          'Which category or item produced the highest value?',
          'Detect any missing values, anomalies, or duplicate rows.',
          'Provide a structured summary of the main trends.'
        ];
      case 'presentation':
        return [
          'Summarize the executive takeaways of this deck.',
          'Which slides cover financial projections and revenue?',
          'What are the primary strategic goals presented?',
          'Extract key action points for leadership.'
        ];
      case 'source_code':
        return [
          'Explain the overall architecture and main entry points.',
          'List all exposed API routes and their handlers.',
          'Identify potential security or performance issues.',
          'Explain how authentication or data validation is handled.'
        ];
      case 'legal':
      case 'policy':
        return [
          'What are the key compliance requirements and rules?',
          'Who are the affected parties and what are their duties?',
          'Identify any clauses carrying legal or financial risk.',
          'Summarize the dispute resolution process.'
        ];
      default:
        return [
          'Provide an executive summary of this document.',
          'What are the top 5 key findings or takeaways?',
          'Extract all critical numbers, dates, and entities.',
          'What actions or follow-ups are required?'
        ];
    }
  }

  /**
   * Produce a concise executive summary based on extracted text and entities
   */
  public static generateQuickSummary(docType: DocumentType, fullText: string, metadata: Partial<DocumentMetadata>): string {
    const cleanSample = fullText.replace(/\s+/g, ' ').substring(0, 300);
    const pages = metadata.pageCount || 1;
    const words = metadata.wordCount || 0;

    return `Document classified as **${docType.toUpperCase().replace('_', ' ')}** (${pages} page${pages > 1 ? 's' : ''}, ${words.toLocaleString()} words). Sample context: "${cleanSample}..."`;
  }
}
