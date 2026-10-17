export type DocumentThemeName =
  | 'corporate'
  | 'professional'
  | 'executive'
  | 'minimal'
  | 'technical'
  | 'academic'
  | 'editorial'
  | 'branded'
  | 'xarwiz';

export type PageSizeName = 'A4' | 'LETTER' | 'LEGAL';
export type PageOrientation = 'portrait' | 'landscape';

export interface DocumentMetadata {
  title?: string;
  subtitle?: string;
  author?: string;
  organization?: string;
  department?: string;
  date?: string;
  version?: string;
  confidentiality?: 'Public' | 'Internal' | 'Confidential' | 'Strictly Confidential';
  tags?: string[];
  docId?: string;
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingBlock {
  type: 'heading';
  level: HeadingLevel;
  text: string;
  id?: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface ListItem {
  text: string;
  checked?: boolean; // For checklist items [x] or [ ]
  level?: number;    // Indentation level (0-based)
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: ListItem[];
}

export interface TableCell {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  alignments?: ('left' | 'center' | 'right')[];
  columnWidths?: number[]; // In percentage (e.g. [30, 70]) or points
  caption?: string;
}

export type CalloutType = 'info' | 'warning' | 'tip' | 'note' | 'quote' | 'success';

export interface CalloutBlock {
  type: 'callout';
  calloutType: CalloutType;
  title?: string;
  text: string;
}

export interface CodeBlock {
  type: 'code';
  code: string;
  language?: string;
  caption?: string;
}

export interface KeyValueItem {
  label: string;
  value: string;
}

export interface KeyValueBlock {
  type: 'keyvalue';
  pairs: KeyValueItem[];
  columns?: 2 | 3;
}

export interface DividerBlock {
  type: 'divider';
}

export interface PageBreakBlock {
  type: 'pagebreak';
}

export interface ImageBlock {
  type: 'image';
  src: string; // Base64 data URI or local filesystem path
  caption?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
}

export interface KpiItem {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  caption?: string;
  color?: string;
}

export interface KpiBlock {
  type: 'kpi';
  title?: string;
  items: KpiItem[];
}

export interface ChartItem {
  label: string;
  value: number;
  formattedValue?: string;
  color?: string;
}

export interface ChartBlock {
  type: 'chart';
  chartType: 'bar' | 'donut' | 'line' | 'progress';
  title?: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  unit?: string;
  colors?: string[];
  items?: ChartItem[];
}

export interface TimelineItem {
  phase: string;
  title?: string;
  date?: string;
  status?: 'Completed' | 'In Progress' | 'Planned' | string;
  description?: string;
}

export interface TimelineBlock {
  type: 'timeline';
  title?: string;
  items: TimelineItem[];
}

export interface DiagramStep {
  step: number;
  title: string;
  description?: string;
}

export interface DiagramBlock {
  type: 'diagram';
  title?: string;
  steps: DiagramStep[];
  direction?: 'horizontal' | 'vertical';
}

export interface ComparisonColumn {
  title: string;
  badge?: string;
  isPrimary?: boolean;
  points: string[];
}

export interface ComparisonBlock {
  type: 'comparison';
  title?: string;
  columns: ComparisonColumn[];
}

export type DocumentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | CalloutBlock
  | CodeBlock
  | KeyValueBlock
  | DividerBlock
  | PageBreakBlock
  | ImageBlock
  | KpiBlock
  | ChartBlock
  | TimelineBlock
  | DiagramBlock
  | ComparisonBlock;

export interface DocumentModel {
  title: string;
  subtitle?: string;
  metadata?: DocumentMetadata;
  theme?: DocumentThemeName;
  pageSize?: PageSizeName;
  orientation?: PageOrientation;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  includeHeaderFooter?: boolean;
  watermark?: string;
  blocks: DocumentBlock[];
}

export interface PdfThemeTokens {
  name: DocumentThemeName;
  colors: {
    primary: string;        // Main brand / heading color
    secondary: string;      // Supporting headings / subtle elements
    accent: string;         // Highlights, links, badges
    text: string;           // Main body text
    textMuted: string;      // Secondary captions, footer text
    background: string;     // Document background
    cardBackground: string; // Table headers, code blocks, callouts
    border: string;         // Lines, table borders
    tableHeaderBg: string;
    tableHeaderText: string;
    tableAltRowBg: string;
    codeBg: string;
    codeText: string;
    calloutRibbon: Record<CalloutType, string>;
    calloutBg: Record<CalloutType, string>;
  };
  typography: {
    baseFontSize: number;
    titleSize: number;
    subtitleSize: number;
    h1Size: number;
    h2Size: number;
    h3Size: number;
    h4Size: number;
    bodySize: number;
    captionSize: number;
    lineHeight: number;
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface PdfValidationResult {
  isValid: boolean;
  pageCount: number;
  sizeBytes: number;
  error?: string;
  warnings?: string[];
}

export interface GeneratedPdfArtifact {
  fileId: string;
  filename: string;
  storagePath: string;
  downloadUrl: string;
  pageCount: number;
  sizeBytes: number;
  createdAt: string;
}
