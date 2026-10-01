import React, { useState } from 'react';
import { Download, Copy, Check, Maximize2, RefreshCw, X, Sparkles, Wand2, GitFork, ArrowRight } from 'lucide-react';

export default function GeneratedImageCard({
  src,
  alt = 'Generated Image',
  prompt = '',
  aspectRatio = '1:1',
  model = 'flux',
  generationType,
  parentImageId,
  onEdit,
  onVariation,
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const displayPrompt = prompt || alt;

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src.includes('/view') ? src.replace('/view', '/download') : src;
    link.download = `xarwiz-visual-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerVariation = (e) => {
    e.stopPropagation();
    if (onVariation) {
      onVariation(src);
    }
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editInstruction.trim()) return;
    setIsSubmittingEdit(true);
    if (onEdit) {
      onEdit(editInstruction.trim(), src);
    }
    setShowEditInput(false);
    setEditInstruction('');
    setIsSubmittingEdit(false);
  };

  return (
    <>
      <div className="generated-image-card">
        <div
          className="generated-image-media"
          onClick={() => setLightboxOpen(true)}
          title="Click to view full image"
        >
          {!loaded && <div className="image-loading-skeleton" />}
          <img
            src={src}
            alt={displayPrompt}
            onLoad={() => setLoaded(true)}
            className={`generated-img ${loaded ? 'visible' : ''}`}
            loading="lazy"
          />

          <div className="image-overlay-badges">
            <span className="aspect-ratio-badge">{aspectRatio}</span>
            {generationType === 'edit' ? (
              <span className="type-badge edit-badge">
                <Wand2 size={10} style={{ marginRight: 3 }} /> Edited
              </span>
            ) : generationType === 'variation' ? (
              <span className="type-badge var-badge">
                <GitFork size={10} style={{ marginRight: 3 }} /> Variation
              </span>
            ) : null}
            {model && <span className="model-badge">{model}</span>}
          </div>

          <div className="image-hover-actions">
            {onEdit && (
              <button
                type="button"
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditInput(!showEditInput);
                }}
                title="Edit this image"
              >
                <Wand2 size={14} color="#818cf8" />
              </button>
            )}

            {onVariation && (
              <button
                type="button"
                className="action-btn"
                onClick={handleTriggerVariation}
                title="Create another variation"
              >
                <GitFork size={14} color="#34d399" />
              </button>
            )}

            <button
              type="button"
              className="action-btn"
              onClick={handleDownload}
              title="Download image"
            >
              <Download size={14} />
            </button>

            <button
              type="button"
              className="action-btn"
              onClick={handleCopyLink}
              title={copied ? 'Copied!' : 'Copy image link'}
            >
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              className="action-btn"
              onClick={() => setLightboxOpen(true)}
              title="Expand full screen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Inline Quick Edit Bar */}
        {showEditInput && (
          <form className="inline-edit-form" onSubmit={handleSubmitEdit} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="inline-edit-input"
              placeholder="Describe changes, e.g. 'Make exterior white', 'Add pool'..."
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              autoFocus
            />
            <button type="submit" className="inline-edit-submit-btn" disabled={!editInstruction.trim() || isSubmittingEdit}>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {displayPrompt && (
          <div className="generated-image-meta">
            <div className="prompt-header">
              <Sparkles size={13} className="sparkle-icon" />
              <span className="prompt-title">
                {generationType === 'edit' ? 'Edited Asset' : generationType === 'variation' ? 'Visual Variation' : 'Generated Visual'}
              </span>
            </div>
            <p className="prompt-body">“{displayPrompt}”</p>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="lightbox-modal" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxOpen(false)}
            >
              <X size={20} />
            </button>
            <img src={src} alt={displayPrompt} className="lightbox-image" />
            <div className="lightbox-footer">
              <span className="lightbox-prompt">“{displayPrompt}”</span>
              <div className="lightbox-footer-actions">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxOpen(false);
                      setShowEditInput(true);
                    }}
                    className="lightbox-act-btn"
                  >
                    <Wand2 size={15} /> Edit
                  </button>
                )}
                {onVariation && (
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxOpen(false);
                      handleTriggerVariation({ stopPropagation: () => {} });
                    }}
                    className="lightbox-act-btn"
                  >
                    <GitFork size={15} /> Variation
                  </button>
                )}
                <button type="button" onClick={handleDownload} className="lightbox-act-btn">
                  <Download size={15} /> Download
                </button>
                <button type="button" onClick={handleCopyLink} className="lightbox-act-btn">
                  {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .generated-image-card {
          margin: 12px 0;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          max-width: 480px;
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.35);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .generated-image-card:hover {
          border-color: rgba(99, 102, 241, 0.4);
        }
        .generated-image-media {
          position: relative;
          cursor: zoom-in;
          overflow: hidden;
          background: #0b0f17;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 220px;
        }
        .image-loading-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
          background-size: 200% 100%;
          animation: skeleton-pulse 1.5s infinite;
        }
        @keyframes skeleton-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .generated-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .generated-img.visible {
          opacity: 1;
        }
        .generated-image-media:hover .generated-img {
          transform: scale(1.02);
        }
        .image-overlay-badges {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          gap: 6px;
          pointer-events: none;
        }
        .aspect-ratio-badge, .model-badge, .type-badge {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: #f1f5f9;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-flex;
          align-items: center;
        }
        .edit-badge {
          background: rgba(99, 102, 241, 0.85);
          border-color: rgba(165, 180, 252, 0.4);
          color: #fff;
        }
        .var-badge {
          background: rgba(16, 185, 129, 0.85);
          border-color: rgba(110, 231, 183, 0.4);
          color: #fff;
        }
        .image-hover-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 6px;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .generated-image-media:hover .image-hover-actions {
          opacity: 1;
          transform: translateY(0);
        }
        .action-btn {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #f8fafc;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .action-btn:hover {
          background: rgba(99, 102, 241, 0.85);
          transform: scale(1.08);
        }
        .inline-edit-form {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(30, 41, 59, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .inline-edit-input {
          flex: 1;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #f8fafc;
          font-size: 13px;
          padding: 6px 10px;
          outline: none;
        }
        .inline-edit-input:focus {
          border-color: #6366f1;
        }
        .inline-edit-submit-btn {
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 6px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .inline-edit-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .generated-image-meta {
          padding: 12px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.4);
        }
        .prompt-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #818cf8;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .prompt-body {
          margin: 0;
          color: #cbd5e1;
          font-size: 13.5px;
          line-height: 1.45;
          font-style: italic;
        }
        .lightbox-modal {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .lightbox-content {
          position: relative;
          max-width: 92vw;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lightbox-close-btn {
          position: absolute;
          top: -44px;
          right: 0;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: #fff;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lightbox-image {
          max-width: 88vw;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7);
        }
        .lightbox-footer {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 88vw;
          gap: 16px;
        }
        .lightbox-prompt {
          color: #e2e8f0;
          font-size: 14px;
          font-style: italic;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lightbox-footer-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .lightbox-act-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #fff;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .lightbox-act-btn:hover {
          background: rgba(99, 102, 241, 0.8);
        }
      `}</style>
    </>
  );
}
