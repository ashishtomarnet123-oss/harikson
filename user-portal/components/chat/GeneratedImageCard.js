import React, { useState } from 'react';
import { Download, Copy, Check, Maximize2, RefreshCw, X, Sparkles } from 'lucide-react';

export default function GeneratedImageCard({
  src,
  alt = 'Generated Image',
  prompt = '',
  aspectRatio = '1:1',
  model = 'flux',
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
    link.download = `xarwiz-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            {model && <span className="model-badge">{model}</span>}
          </div>

          <div className="image-hover-actions">
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
            {onRegenerate && (
              <button
                type="button"
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate(displayPrompt);
                }}
                title="Regenerate with same prompt"
              >
                <RefreshCw size={14} />
              </button>
            )}
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

        {displayPrompt && (
          <div className="generated-image-meta">
            <div className="prompt-header">
              <Sparkles size={13} className="sparkle-icon" />
              <span className="prompt-title">Generated Visual</span>
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
        .aspect-ratio-badge, .model-badge {
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
          background: rgba(15, 23, 42, 0.8);
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
          margin-bottom: 4px;
        }
        .sparkle-icon {
          color: #818cf8;
        }
        .prompt-body {
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.45;
          margin: 0;
          font-style: italic;
        }

        /* Lightbox */
        .lightbox-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lightbox-image {
          max-width: 85vw;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .lightbox-close-btn {
          position: absolute;
          top: -40px;
          right: 0;
          background: transparent;
          border: none;
          color: #f1f5f9;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .lightbox-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .lightbox-footer {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 16px;
        }
        .lightbox-prompt {
          color: #cbd5e1;
          font-size: 14px;
          font-style: italic;
          max-width: 60%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lightbox-footer-actions {
          display: flex;
          gap: 10px;
        }
        .lightbox-act-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.15s;
        }
        .lightbox-act-btn:hover {
          background: rgba(99, 102, 241, 0.8);
        }
      `}</style>
    </>
  );
}
