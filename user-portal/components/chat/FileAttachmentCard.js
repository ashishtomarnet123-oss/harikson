import React from 'react';
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
} from 'lucide-react';
import { getFileCapability, formatFileSize } from '../../lib/fileCapabilities';

export default function FileAttachmentCard({
  file,
  onPreview,
  onDownload,
  onRemove,
  isComposer = false,
  className = '',
}) {
  if (!file) return null;

  const fileName = file.name || file.filename || 'Attachment';
  const fileSize = file.size || file.file_size_bytes || 0;
  const status = file.status || 'ready';
  const isProcessing = status === 'processing';
  const capability = getFileCapability(fileName, file.type || file.mimeType);

  const isImage = capability.category === 'image';
  const hasThumbnail = isImage && file.dataUrl;

  // Choose icon based on category
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

  // Build meta string (e.g. "PDF • 12 pages • 1.4 MB")
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

  // For images in chat history with dataUrl, display the rich thumbnail card
  if (isImage && hasThumbnail && !isComposer) {
    return (
      <div className={`chat-image-attachment-card ${className}`}>
        <div
          className="chat-image-thumb-wrapper"
          onClick={() => onPreview && onPreview(file)}
          title={`Click to preview ${fileName}`}
          style={{ cursor: 'pointer' }}
        >
          <img src={file.dataUrl} alt={fileName} className="chat-image-thumb" />
          <div className="chat-image-overlay">
            <Eye size={16} />
          </div>
        </div>
        <div className="chat-image-footer">
          <span className="chat-image-name" title={fileName}>
            {fileName}
          </span>
          {fileSize > 0 && (
            <span className="chat-image-size">{formatFileSize(fileSize)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-doc-attachment-card ${capability.category}-card ${isComposer ? 'composer-card' : ''} ${className}`}
      onClick={(e) => {
        if (!isComposer && capability.canPreview && !isProcessing && onPreview) {
          if (e.target.closest('button')) return;
          onPreview(file);
        }
      }}
      style={{
        cursor: !isComposer && capability.canPreview && !isProcessing && onPreview ? 'pointer' : 'default',
      }}
    >
      {/* Icon or Thumbnail Badge */}
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

      {/* Details (Name and Metadata) */}
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

      {/* Actions */}
      <div className="chat-doc-actions">
        {capability.canPreview && !isProcessing && onPreview && (
          <button
            type="button"
            className="chat-doc-btn preview"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            title="Preview File"
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
            onClick={() => onDownload(file)}
            title="Download Original"
            aria-label={`Download ${fileName}`}
          >
            <Download size={13} />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            className="chat-doc-btn remove"
            onClick={() => onRemove(file)}
            title="Remove Attachment"
            aria-label={`Remove ${fileName}`}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '4px',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
