/**
 * Central File-Type Capability Registry for Xarwiz AI
 * Defines preview, extraction, OCR, analysis, playback, and download capabilities
 * across all supported document, media, data, and code formats.
 */

export const FILE_CAPABILITIES = {
  // 1. PDF Documents
  pdf: {
    category: 'pdf',
    badge: 'PDF',
    label: 'PDF Document',
    canPreview: true,
    previewType: 'pdf',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: 'pdf',
  },

  // 2. Images
  png: {
    category: 'image',
    badge: 'PNG',
    label: 'PNG Image',
    canPreview: true,
    previewType: 'image',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: 'image',
  },
  jpg: {
    category: 'image',
    badge: 'JPG',
    label: 'JPEG Image',
    canPreview: true,
    previewType: 'image',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: 'image',
  },
  jpeg: {
    category: 'image',
    badge: 'JPEG',
    label: 'JPEG Image',
    canPreview: true,
    previewType: 'image',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: 'image',
  },
  webp: {
    category: 'image',
    badge: 'WEBP',
    label: 'WebP Image',
    canPreview: true,
    previewType: 'image',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: 'image',
  },
  gif: {
    category: 'image',
    badge: 'GIF',
    label: 'GIF Animation',
    canPreview: true,
    previewType: 'image',
    canExtract: false,
    canAnalyze: true,
    canDownload: true,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: 'image',
  },
  svg: {
    category: 'image',
    badge: 'SVG',
    label: 'Vector Graphic',
    canPreview: true,
    previewType: 'image',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: 'image',
  },

  // 3. Word Documents
  docx: {
    category: 'word',
    badge: 'DOCX',
    label: 'Word Document',
    canPreview: true,
    previewType: 'document',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'document',
  },
  doc: {
    category: 'word',
    badge: 'DOC',
    label: 'Word Document',
    canPreview: true,
    previewType: 'document',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'document',
  },

  // 4. Spreadsheets & Tabular Data
  xlsx: {
    category: 'spreadsheet',
    badge: 'XLSX',
    label: 'Excel Spreadsheet',
    canPreview: true,
    previewType: 'spreadsheet',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: 'spreadsheet',
  },
  xls: {
    category: 'spreadsheet',
    badge: 'XLS',
    label: 'Excel Spreadsheet',
    canPreview: true,
    previewType: 'spreadsheet',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: 'spreadsheet',
  },
  csv: {
    category: 'spreadsheet',
    badge: 'CSV',
    label: 'CSV Data',
    canPreview: true,
    previewType: 'spreadsheet',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: 'spreadsheet',
  },
  tsv: {
    category: 'spreadsheet',
    badge: 'TSV',
    label: 'TSV Data',
    canPreview: true,
    previewType: 'spreadsheet',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: 'spreadsheet',
  },

  // 5. Presentations
  pptx: {
    category: 'presentation',
    badge: 'PPTX',
    label: 'PowerPoint Slides',
    canPreview: true,
    previewType: 'presentation',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'presentation',
  },
  ppt: {
    category: 'presentation',
    badge: 'PPT',
    label: 'PowerPoint Slides',
    canPreview: true,
    previewType: 'presentation',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'presentation',
  },

  // 6. Text Documents
  txt: {
    category: 'text',
    badge: 'TXT',
    label: 'Text Document',
    canPreview: true,
    previewType: 'text',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: 'text',
  },
  md: {
    category: 'text',
    badge: 'MD',
    label: 'Markdown Note',
    canPreview: true,
    previewType: 'text',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: 'text',
  },
  rtf: {
    category: 'text',
    badge: 'RTF',
    label: 'Rich Text',
    canPreview: true,
    previewType: 'text',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: 'text',
  },

  // 7. Structured Data & Code
  json: {
    category: 'data',
    badge: 'JSON',
    label: 'JSON Data',
    canPreview: true,
    previewType: 'code',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: 'code',
  },
  xml: {
    category: 'data',
    badge: 'XML',
    label: 'XML Data',
    canPreview: true,
    previewType: 'code',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: 'code',
  },
  sql: {
    category: 'code',
    badge: 'SQL',
    label: 'SQL Script',
    canPreview: true,
    previewType: 'code',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: 'code',
  },
  js: {
    category: 'code',
    badge: 'JS',
    label: 'JavaScript',
    canPreview: true,
    previewType: 'code',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#eab308',
    bg: '#fefce8',
    border: '#fef08a',
    icon: 'code',
  },
  ts: {
    category: 'code',
    badge: 'TS',
    label: 'TypeScript',
    canPreview: true,
    previewType: 'code',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'code',
  },
  py: {
    category: 'code',
    badge: 'PY',
    label: 'Python Script',
    canPreview: true,
    previewType: 'code',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'code',
  },

  // 8. Audio
  mp3: {
    category: 'audio',
    badge: 'MP3',
    label: 'Audio File',
    canPreview: true,
    previewType: 'audio',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: 'audio',
  },
  wav: {
    category: 'audio',
    badge: 'WAV',
    label: 'Wave Audio',
    canPreview: true,
    previewType: 'audio',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: 'audio',
  },
  m4a: {
    category: 'audio',
    badge: 'M4A',
    label: 'AAC Audio',
    canPreview: true,
    previewType: 'audio',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: 'audio',
  },

  // 9. Video
  mp4: {
    category: 'video',
    badge: 'MP4',
    label: 'MP4 Video',
    canPreview: true,
    previewType: 'video',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#a5f3fc',
    icon: 'video',
  },
  webm: {
    category: 'video',
    badge: 'WEBM',
    label: 'WebM Video',
    canPreview: true,
    previewType: 'video',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#a5f3fc',
    icon: 'video',
  },
  mov: {
    category: 'video',
    badge: 'MOV',
    label: 'QuickTime Video',
    canPreview: true,
    previewType: 'video',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#a5f3fc',
    icon: 'video',
  },

  // 10. Archives
  zip: {
    category: 'archive',
    badge: 'ZIP',
    label: 'Zip Archive',
    canPreview: false,
    previewType: 'unsupported',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'archive',
  },
  tar: {
    category: 'archive',
    badge: 'TAR',
    label: 'Tar Archive',
    canPreview: false,
    previewType: 'unsupported',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'archive',
  },
  gz: {
    category: 'archive',
    badge: 'GZ',
    label: 'Gzip Archive',
    canPreview: false,
    previewType: 'unsupported',
    canExtract: true,
    canAnalyze: true,
    canDownload: true,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'archive',
  },
};

export const DEFAULT_CAPABILITY = {
  category: 'generic',
  badge: 'FILE',
  label: 'Attachment',
  canPreview: false,
  previewType: 'unsupported',
  canExtract: false,
  canAnalyze: false,
  canDownload: true,
  color: '#64748b',
  bg: '#f8fafc',
  border: '#e2e8f0',
  icon: 'generic',
};

/**
 * Extract clean lowercase extension from filename or URL
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const clean = filename.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  if (parts.length <= 1) return '';
  return parts.pop().toLowerCase().trim();
}

/**
 * Look up capabilities for a given filename and optional MIME type
 */
export function getFileCapability(filename, mimeType = '') {
  const ext = getFileExtension(filename);
  if (ext && FILE_CAPABILITIES[ext]) {
    return FILE_CAPABILITIES[ext];
  }

  // Fallback by MIME type
  if (mimeType) {
    const mime = mimeType.toLowerCase();
    if (mime.includes('pdf')) return FILE_CAPABILITIES.pdf;
    if (mime.startsWith('image/')) return FILE_CAPABILITIES.png;
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FILE_CAPABILITIES.xlsx;
    if (mime.includes('word') || mime.includes('wordprocessingml')) return FILE_CAPABILITIES.docx;
    if (mime.includes('presentation') || mime.includes('powerpoint')) return FILE_CAPABILITIES.pptx;
    if (mime.startsWith('audio/')) return FILE_CAPABILITIES.mp3;
    if (mime.startsWith('video/')) return FILE_CAPABILITIES.mp4;
    if (mime.includes('json')) return FILE_CAPABILITIES.json;
    if (mime.includes('xml')) return FILE_CAPABILITIES.xml;
    if (mime.startsWith('text/')) return FILE_CAPABILITIES.txt;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return FILE_CAPABILITIES.zip;
  }

  return DEFAULT_CAPABILITY;
}

/**
 * Format bytes to readable size
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const num = Number(bytes);
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
