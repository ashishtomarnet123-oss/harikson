import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  BarChart2,
  Presentation,
  Code,
  Music,
  Video,
  Archive,
  Download,
  Eye,
  X,
  Loader2,
  Maximize2,
  ExternalLink,
  ChevronRight,
  Table,
} from 'lucide-react';
import { getFileCapability, formatFileSize } from '../../lib/fileCapabilities';

// Lightweight helper to parse CSV/TSV snippet into table rows for inline preview
function parseSnippetTable(text) {
  if (!text || typeof text !== 'string') return null;
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const parseLine = (line) => {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = parseLine(lines[0]).slice(0, 6);
  const rows = lines.slice(1, 5).map((l) => parseLine(l).slice(0, 6));
  return { headers, rows, totalRows: lines.length - 1 };
}

// Clean extracted document text for first-page preview snippet
function extractSnippetText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/--- Page \d+ ---/g, '')
    .replace(/\[Attached (?:Document|Image):\s*"[^"]*"\]/g, '')
    .trim();
}

export default function FileAttachmentCard({
  file,
  onPreview,
  onDownload,
  onRemove,
  isComposer = false,
  className = '',
}) {
  if (!file) return null;

  const [isHovered, setIsHovered] = useState(false);
  const fileName = file.name || file.filename || 'Attachment';
  const fileSize = file.size || file.file_size_bytes || 0;
  const status = file.status || 'ready';
  const isProcessing = status === 'processing';
  const capability = getFileCapability(fileName, file.type || file.mimeType);

  const isImage = capability.category === 'image';
  const hasThumbnail = isImage && (file.dataUrl || file.url);
  const isPdf = capability.category === 'pdf';
  const isWord = capability.category === 'word';
  const isSpreadsheet = capability.category === 'spreadsheet';
  const isPresentation = capability.category === 'presentation';
  const isCodeOrData = capability.category === 'code' || capability.category === 'data';
  const isAudio = capability.category === 'audio';
  const isVideo = capability.category === 'video';

  // Build metadata string (e.g. "PDF • 10 pages • 92.3 KB")
  const metaParts = [];
  metaParts.push(capability.badge);

  if (file.pages || file.pageCount) {
    const count = file.pages || file.pageCount;
    metaParts.push(`${count} ${count === 1 || count === '1' ? 'page' : 'pages'}`);
  } else if (file.sheets || file.sheetCount) {
    const sCount = file.sheets || file.sheetCount;
    metaParts.push(`${sCount} ${sCount === 1 ? 'sheet' : 'sheets'}`);
  } else if (file.slides || file.slideCount) {
    const slCount = file.slides || file.slideCount;
    metaParts.push(`${slCount} ${slCount === 1 ? 'slide' : 'slides'}`);
  }

  if (fileSize) {
    metaParts.push(formatFileSize(fileSize));
  } else if (file.content && typeof file.content === 'string') {
    const kChars = Math.round(file.content.length / 1000);
    if (kChars > 0) metaParts.push(`${kChars}k chars`);
  }

  const metaString = metaParts.join(' • ');

  // Icon renderer
  const renderIcon = () => {
    if (isProcessing) {
      return <Loader2 size={18} className="animate-spin text-blue-500" />;
    }
    switch (capability.category) {
      case 'pdf':
        return <FileText size={18} color="#ef4444" />;
      case 'spreadsheet':
        return <BarChart2 size={18} color="#10b981" />;
      case 'word':
        return <FileText size={18} color="#2563eb" />;
      case 'presentation':
        return <Presentation size={18} color="#f59e0b" />;
      case 'audio':
        return <Music size={18} color="#8b5cf6" />;
      case 'video':
        return <Video size={18} color="#06b6d4" />;
      case 'code':
      case 'data':
        return <Code size={18} color="#6366f1" />;
      case 'archive':
        return <Archive size={18} color="#d97706" />;
      case 'image':
        return <ImageIcon size={18} color="#ec4899" />;
      default:
        return <FileText size={18} color="#64748b" />;
    }
  };

  // ── 1. COMPOSER COMPACT PREVIEW (Input Area Before Send) ───────────────────
  if (isComposer) {
    return (
      <div
        className={`composer-attachment-pill ${capability.category}-pill ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '6px 12px',
          maxWidth: '280px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: capability.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isProcessing ? (
            <Loader2 size={13} className="animate-spin text-blue-500" />
          ) : (
            <span style={{ fontSize: '10px', fontWeight: 800, color: capability.color }}>
              {capability.badge.slice(0, 3)}
            </span>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={fileName}
          >
            {fileName}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>
            {fileSize ? formatFileSize(fileSize) : capability.badge}
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(file);
            }}
            title="Remove attachment"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  // ── 2. LARGE INLINE IMAGE PREVIEW (ChatGPT Style) ─────────────────────────
  if (isImage && hasThumbnail) {
    const imgSrc = file.dataUrl || file.url;
    return (
      <div
        className={`chat-inline-image-preview ${className}`}
        style={{
          borderRadius: '14px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          maxWidth: '480px',
          margin: '4px 0 8px 0',
          cursor: onPreview ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        onClick={() => onPreview && onPreview(file)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          style={{
            position: 'relative',
            maxHeight: '400px',
            overflow: 'hidden',
            backgroundColor: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={imgSrc}
            alt={fileName}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              transition: 'transform 0.25s ease',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Maximize2 size={18} />
            <span>Click to view full image</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div style={{ minWidth: 0, flex: 1, marginRight: '12px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={fileName}
            >
              {fileName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {metaString}
            </div>
          </div>
          {capability.canDownload && onDownload && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file);
              }}
              title="Download Original Image"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 3. LARGE INLINE PDF & WORD DOCUMENT PREVIEW (ChatGPT Style) ───────────
  if (isPdf || isWord) {
    const rawSnippet = extractSnippetText(file.content || '');
    const hasSnippet = rawSnippet && rawSnippet.length > 20;
    const pageCountVal = file.pages || file.pageCount || (isPdf ? '10' : '1');

    return (
      <div
        className={`chat-inline-doc-workspace-preview ${capability.category}-preview ${className}`}
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          margin: '4px 0 10px 0',
          cursor: capability.canPreview && onPreview ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        onClick={(e) => {
          if (capability.canPreview && onPreview) {
            if (e.target.closest('button')) return;
            onPreview(file);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Document Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: capability.bg,
            borderBottom: `1px solid ${capability.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: `1px solid ${capability.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {renderIcon()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 650,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '300px',
                }}
                title={fileName}
              >
                {fileName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                {metaString}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {capability.canDownload && onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file);
                }}
                title="Download file"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11.5px',
                }}
              >
                <Download size={13} />
              </button>
            )}
            {capability.canPreview && onPreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(file);
                }}
                style={{
                  background: isHovered ? '#1d4ed8' : '#2563eb',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '5px 12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'background 0.15s ease',
                }}
              >
                <Maximize2 size={12} />
                <span>Open Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Document Visual Page Canvas */}
        <div
          style={{
            position: 'relative',
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            minHeight: '140px',
            maxHeight: '220px',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Subtle Page 1 Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 700,
                color: capability.color,
                backgroundColor: capability.bg,
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              Document Page 1
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Preview · {pageCountVal} pages total
            </span>
          </div>

          {/* Page Body Content */}
          <div
            style={{
              fontSize: '13px',
              lineHeight: '1.65',
              color: '#334155',
              wordBreak: 'break-word',
            }}
          >
            {hasSnippet ? (
              <div>
                <p style={{ margin: 0 }}>
                  {rawSnippet.slice(0, 360)}
                  {rawSnippet.length > 360 ? '...' : ''}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px 0',
                  color: '#64748b',
                  textAlign: 'center',
                }}
              >
                <FileText size={32} color={capability.color} style={{ opacity: 0.6, marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {fileName}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                  Click to inspect full document pages and structure
                </div>
              </div>
            )}
          </div>

          {/* Bottom Gradient Fade & Action Banner */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '70px',
              background: 'linear-gradient(to top, rgba(255, 255, 255, 1) 40%, rgba(255, 255, 255, 0) 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '10px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: isHovered ? '#1d4ed8' : '#2563eb',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '4px 14px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Read in Full Document Workspace</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. LARGE INLINE SPREADSHEET PREVIEW (ChatGPT Style) ───────────────────
  if (isSpreadsheet) {
    const tableData = parseSnippetTable(file.content || '');
    return (
      <div
        className={`chat-inline-sheet-preview ${className}`}
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #10b98133',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          margin: '4px 0 10px 0',
          cursor: capability.canPreview && onPreview ? 'pointer' : 'default',
        }}
        onClick={(e) => {
          if (capability.canPreview && onPreview) {
            if (e.target.closest('button')) return;
            onPreview(file);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Spreadsheet Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            borderBottom: '1px solid #bbf7d0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BarChart2 size={18} color="#10b981" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 650,
                  color: '#065f46',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '300px',
                }}
                title={fileName}
              >
                {fileName}
              </div>
              <div style={{ fontSize: '11px', color: '#047857', marginTop: '1px' }}>
                {metaString} {tableData ? `• ${tableData.totalRows} data rows` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {capability.canDownload && onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file);
                }}
                title="Download Spreadsheet"
                style={{
                  background: '#ffffff',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#047857',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Download size={13} />
              </button>
            )}
            {capability.canPreview && onPreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(file);
                }}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '5px 12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Table size={13} />
                <span>Spreadsheet Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabular Data View Container */}
        {tableData && tableData.headers.length > 0 ? (
          <div style={{ overflowX: 'auto', padding: '10px 14px', backgroundColor: '#ffffff' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {tableData.headers.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      style={{
                        padding: '6px 10px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col || `Col ${cIdx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    {tableData.headers.map((_, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '6px 10px',
                          color: '#334155',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row[cIdx] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              <span>Showing first {tableData.rows.length} rows</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Click to explore full dataset →</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '12.5px',
            }}
          >
            Click to open interactive spreadsheet workspace with column filtering and sorting
          </div>
        )}
      </div>
    );
  }

  // ── 5. LARGE INLINE PRESENTATION PREVIEW ──────────────────────────────────
  if (isPresentation) {
    return (
      <div
        className={`chat-inline-presentation-preview ${className}`}
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #fef3c7',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          margin: '4px 0 10px 0',
          cursor: capability.canPreview && onPreview ? 'pointer' : 'default',
        }}
        onClick={() => onPreview && onPreview(file)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#fffbeb',
            borderBottom: '1px solid #fde68a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Presentation size={18} color="#d97706" />
            <span style={{ fontSize: '13px', fontWeight: 650, color: '#92400e' }}>
              {fileName}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#b45309' }}>{metaString}</span>
        </div>
        <div
          style={{
            aspectRatio: '16 / 9',
            backgroundColor: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <Presentation size={36} color="#fbbf24" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{fileName}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Click to present slides in full workspace
          </div>
        </div>
      </div>
    );
  }

  // ── 6. INLINE CODE & DATA PREVIEW ─────────────────────────────────────────
  if (isCodeOrData) {
    const rawCode = extractSnippetText(file.content || '').slice(0, 300);
    return (
      <div
        className={`chat-inline-code-preview ${className}`}
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '14px',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          margin: '4px 0 10px 0',
          cursor: capability.canPreview && onPreview ? 'pointer' : 'default',
        }}
        onClick={() => onPreview && onPreview(file)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={16} color="#818cf8" />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#f1f5f9' }}>
              {fileName}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{capability.badge}</span>
        </div>
        {rawCode ? (
          <pre
            style={{
              padding: '12px 16px',
              margin: 0,
              fontSize: '12px',
              fontFamily: 'monospace',
              lineHeight: '1.5',
              overflowX: 'auto',
              color: '#38bdf8',
            }}
          >
            {rawCode}
            {rawCode.length >= 300 ? '\n...' : ''}
          </pre>
        ) : (
          <div style={{ padding: '14px', fontSize: '12px', color: '#94a3b8' }}>
            Click to inspect source code and structured data
          </div>
        )}
      </div>
    );
  }

  // ── 7. DEFAULT / GENERIC FILE CARD (Audio, Video, Archives, Generic) ─────
  return (
    <div
      className={`chat-doc-attachment-card ${capability.category}-card ${className}`}
      onClick={(e) => {
        if (capability.canPreview && !isProcessing && onPreview) {
          if (e.target.closest('button')) return;
          onPreview(file);
        }
      }}
      style={{
        cursor: capability.canPreview && !isProcessing && onPreview ? 'pointer' : 'default',
      }}
    >
      <div
        className={`chat-doc-icon-badge ${capability.category}`}
        style={{
          backgroundColor: capability.bg,
          borderColor: capability.border,
        }}
      >
        {renderIcon()}
        <span
          className="doc-badge-ext"
          style={{ color: capability.color, fontWeight: 700 }}
        >
          {capability.badge}
        </span>
      </div>

      <div className="chat-doc-details">
        <div className="chat-doc-name" title={fileName}>
          {fileName}
        </div>
        <div className="chat-doc-meta">{metaString}</div>
        {file.error && (
          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
            {file.error}
          </div>
        )}
      </div>

      <div className="chat-doc-actions">
        {capability.canPreview && !isProcessing && onPreview && (
          <button
            type="button"
            className="chat-doc-btn preview"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            title="Open in Workspace"
            aria-label={`Preview ${fileName}`}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        )}

        {capability.canDownload && onDownload && (
          <button
            type="button"
            className="chat-doc-btn download"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(file);
            }}
            title="Download Original"
            aria-label={`Download ${fileName}`}
          >
            <Download size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
