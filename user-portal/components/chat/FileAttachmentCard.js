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
  File,
  X,
  Loader2,
} from 'lucide-react';
import { getFileCapability } from '../../lib/fileCapabilities';

/**
 * Derives the clean file format label (e.g. PDF, DOCX, XLSX, CSV, PPTX, PNG, JPG, TXT, JSON, MP3, MP4, ZIP)
 */
export function getFileFormatLabel(fileName, mimeType, capability) {
  if (fileName && typeof fileName === 'string' && fileName.includes('.')) {
    const ext = fileName.split('.').pop().trim().toUpperCase();
    if (ext && ext.length >= 1 && ext.length <= 5 && !['TMP', 'BAK', 'FILE', 'DOWNLOAD'].includes(ext)) {
      return ext;
    }
  }
  if (capability && capability.badge) {
    return capability.badge.toUpperCase();
  }
  if (mimeType && typeof mimeType === 'string') {
    const parts = mimeType.split('/');
    if (parts[1]) {
      const sub = parts[1].toLowerCase();
      if (sub.includes('pdf')) return 'PDF';
      if (sub.includes('word') || sub.includes('officedocument.wordprocessingml')) return 'DOCX';
      if (sub.includes('excel') || sub.includes('spreadsheet')) return 'XLSX';
      if (sub.includes('csv')) return 'CSV';
      if (sub.includes('presentation') || sub.includes('powerpoint')) return 'PPTX';
      if (sub.includes('json')) return 'JSON';
      if (sub.includes('jpeg') || sub.includes('jpg')) return 'JPG';
      if (sub.includes('png')) return 'PNG';
      if (sub.includes('webp')) return 'WEBP';
      if (sub.includes('zip')) return 'ZIP';
      if (sub.includes('mpeg') || sub.includes('mp3')) return 'MP3';
      if (sub.includes('mp4')) return 'MP4';
    }
  }
  return 'FILE';
}

/**
 * Helper to get category-specific icon and background for the ChatGPT-style attachment card
 */
function getIconConfig(category) {
  switch (category) {
    case 'pdf':
      return {
        bg: '#fee2e2',
        color: '#ef4444',
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
          </svg>
        ),
        miniIcon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ),
      };
    case 'word':
      return {
        bg: '#eff6ff',
        color: '#2563eb',
        icon: <FileText size={20} color="#2563eb" />,
        miniIcon: <FileText size={14} color="#2563eb" />,
      };
    case 'spreadsheet':
      return {
        bg: '#ecfdf5',
        color: '#10b981',
        icon: <BarChart2 size={20} color="#10b981" />,
        miniIcon: <BarChart2 size={14} color="#10b981" />,
      };
    case 'presentation':
      return {
        bg: '#fffbeb',
        color: '#f59e0b',
        icon: <Presentation size={20} color="#f59e0b" />,
        miniIcon: <Presentation size={14} color="#f59e0b" />,
      };
    case 'code':
    case 'data':
      return {
        bg: '#eef2ff',
        color: '#6366f1',
        icon: <Code size={20} color="#6366f1" />,
        miniIcon: <Code size={14} color="#6366f1" />,
      };
    case 'audio':
      return {
        bg: '#f5f3ff',
        color: '#8b5cf6',
        icon: <Music size={20} color="#8b5cf6" />,
        miniIcon: <Music size={14} color="#8b5cf6" />,
      };
    case 'video':
      return {
        bg: '#ecfeff',
        color: '#06b6d4',
        icon: <Video size={20} color="#06b6d4" />,
        miniIcon: <Video size={14} color="#06b6d4" />,
      };
    case 'archive':
      return {
        bg: '#fef3c7',
        color: '#d97706',
        icon: <Archive size={20} color="#d97706" />,
        miniIcon: <Archive size={14} color="#d97706" />,
      };
    case 'image':
      return {
        bg: '#fdf2f8',
        color: '#ec4899',
        icon: <ImageIcon size={20} color="#ec4899" />,
        miniIcon: <ImageIcon size={14} color="#ec4899" />,
      };
    case 'text':
    default:
      return {
        bg: '#f1f5f9',
        color: '#64748b',
        icon: <File size={20} color="#64748b" />,
        miniIcon: <File size={14} color="#64748b" />,
      };
  }
}

/**
 * Universal ChatGPT-Style Minimal Attachment Component
 * Renders compact horizontal cards for all documents/files and compact thumbnails for images.
 */
export function FileAttachmentCard({
  file,
  onPreview,
  onDownload,
  onRemove,
  isComposer = false,
  className = '',
}) {
  if (!file) return null;

  const fileName = file.name || file.filename || 'Attachment';
  const status = file.status || 'ready';
  const isProcessing = status === 'processing';
  const capability = getFileCapability(fileName, file.type || file.mimeType);
  const formatLabel = getFileFormatLabel(fileName, file.type || file.mimeType, capability);

  const isImage = capability.category === 'image';
  const hasThumbnail = isImage && (file.dataUrl || file.url);
  const iconConfig = getIconConfig(capability.category);

  // ── 1. COMPOSER PREVIEWS (Input Area Before Send) ──────────────────────────
  if (isComposer) {
    // Image thumbnail chip in composer
    if (isImage && hasThumbnail) {
      return (
        <div
          className={`composer-attachment-thumb ${className}`}
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            backgroundColor: '#0f172a',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={file.dataUrl || file.url}
            alt={fileName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2 size={16} className="animate-spin text-white" />
            </div>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(file);
              }}
              title="Remove attachment"
              aria-label="Remove attachment"
              style={{
                position: 'absolute',
                top: '3px',
                right: '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'background 0.15s ease',
              }}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      );
    }

    // Document / File pill in composer
    return (
      <div
        className={`composer-attachment-pill ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '6px 10px',
          maxWidth: '240px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            backgroundColor: iconConfig.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isProcessing ? (
            <Loader2 size={13} className="animate-spin text-blue-500" />
          ) : (
            iconConfig.miniIcon
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
              lineHeight: '1.3',
            }}
            title={fileName}
          >
            {fileName}
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: '#64748b',
              textTransform: 'uppercase',
              lineHeight: '1.2',
            }}
          >
            {formatLabel}
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
            aria-label="Remove attachment"
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
              flexShrink: 0,
            }}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  }

  // ── 2. IN-CHAT IMAGE THUMBNAIL (Minimal ChatGPT Style) ────────────────────
  if (isImage && hasThumbnail) {
    return (
      <div
        className={`chat-image-attachment-thumb ${className}`}
        onClick={() => onPreview && onPreview(file)}
        title={fileName}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview && onPreview(file);
          }
        }}
        style={{
          display: 'inline-block',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: '#0f172a',
          cursor: onPreview ? 'pointer' : 'default',
          maxWidth: '280px',
          maxHeight: '220px',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={file.dataUrl || file.url}
          alt={fileName}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: '220px',
            objectFit: 'contain',
            borderRadius: '13px',
          }}
        />
      </div>
    );
  }

  // ── 3. UNIVERSAL COMPACT DOCUMENT / FILE CARD (ChatGPT Style) ──────────────
  return (
    <div
      className={`chat-doc-attachment-card ${className}`}
      onClick={() => onPreview && onPreview(file)}
      title={fileName}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPreview && onPreview(file);
        }
      }}
    >
      <div
        className="chat-doc-icon-wrapper"
        style={{
          backgroundColor: iconConfig.bg,
        }}
      >
        {isProcessing ? (
          <Loader2 size={18} className="animate-spin text-blue-500" />
        ) : (
          iconConfig.icon
        )}
      </div>

      <div className="chat-doc-details">
        <div className="chat-doc-filename" title={fileName}>
          {fileName}
        </div>
        <div className="chat-doc-format-label">
          {formatLabel}
        </div>
      </div>
    </div>
  );
}

// Export ChatAttachment as an alias to satisfy both naming conventions
export { FileAttachmentCard as ChatAttachment };
export default FileAttachmentCard;
