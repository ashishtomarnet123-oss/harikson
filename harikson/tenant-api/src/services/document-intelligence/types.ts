/**
 * Document Intelligence System Types
 */

export type DocumentType =
  | 'contract'
  | 'invoice'
  | 'receipt'
  | 'financial_report'
  | 'legal'
  | 'resume'
  | 'technical_doc'
  | 'presentation'
  | 'spreadsheet'
  | 'source_code'
  | 'policy'
  | 'research_paper'
  | 'meeting_notes'
  | 'image'
  | 'general';

export type ProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'extracting'
  | 'ocr_processing'
  | 'vision_processing'
  | 'structuring'
  | 'chunking'
  | 'embedding'
  | 'indexing'
  | 'completed'
  | 'failed';

export interface DocumentEntity {
  type: 'amount' | 'date' | 'email' | 'phone' | 'invoice_number' | 'person' | 'organization';
  value: string;
  context?: string;
}

export interface DocumentSection {
  title: string;
  level: number;
  pageNumber?: number;
  content: string;
}

export interface DocumentTable {
  name?: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalRows?: number;
  totalColumns?: number;
  summary?: Record<string, any>;
}

export interface DocumentCodeSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'import' | 'route' | 'variable';
  line?: number;
  signature?: string;
}

export interface DocumentStructure {
  pages?: Array<{
    pageNumber: number;
    text: string;
    tables?: DocumentTable[];
    hasImages?: boolean;
  }>;
  sections?: DocumentSection[];
  headings?: Array<{ text: string; level?: number; pageNumber?: number }>;
  tables?: DocumentTable[];
  codeSymbols?: DocumentCodeSymbol[];
  sheets?: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    headers: string[];
    sampleRows: any[][];
    columnStats?: Record<string, { type: string; min?: number; max?: number; sum?: number; avg?: number; nullCount?: number }>;
  }>;
  visualSummary?: string;
}

export interface DocumentMetadata {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  wordCount: number;
  documentType: DocumentType;
  language?: string;
  author?: string;
  title?: string;
  contentHash: string;
  entities: DocumentEntity[];
  tablesCount: number;
  imagesCount: number;
  summary: string;
  suggestedQuestions: string[];
  processingDurationMs?: number;
  hasOcr?: boolean;
  hasVision?: boolean;
}

export interface SemanticChunk {
  chunkId: string;
  documentId: string;
  content: string;
  pageNumber?: number;
  section?: string;
  heading?: string;
  sourceType: string;
  sourceLocation: string;
  tokenCount: number;
  embedding?: number[];
}

export interface ProcessedDocumentResult {
  fullText: string;
  structure: DocumentStructure;
  metadata: Partial<DocumentMetadata>;
  chunks: SemanticChunk[];
}

export interface CitationReference {
  documentId: string;
  filename: string;
  pageNumber?: number;
  section?: string;
  sourceLocation: string;
  snippet: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DocumentCollection {
  id: string;
  tenantId: string;
  userId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}
