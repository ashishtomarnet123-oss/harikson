import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, Download, Maximize2, Minimize2 } from 'lucide-react';

export default function ImageViewerModal({ isOpen, onClose, imageSrc, imageName = 'Image Preview', imageSize = null }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setIsFullscreen(false);
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        setZoom(1);
        setRotation(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDownload = useCallback(() => {
    if (!imageSrc) return;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = imageName || 'image-download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [imageSrc, imageName]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={imageName}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 15, 29, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isFullscreen ? 0 : '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Toolbar */}
      <div
        style={{
          width: '100%',
          maxWidth: isFullscreen ? '100%' : '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: isFullscreen ? 0 : '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '360px',
            }}
            title={imageName}
          >
            {imageName}
          </span>
          {imageSize && (
            <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              ({imageSize})
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            style={btnStyle}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '42px', textAlign: 'center', fontWeight: 600 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            style={btnStyle}
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setRotation(0);
            }}
            style={btnStyle}
            title="Reset Zoom (0)"
            aria-label="Reset Zoom"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            style={btnStyle}
            title="Rotate 90°"
            aria-label="Rotate Image"
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            style={btnStyle}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            style={{ ...btnStyle, backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#3b82f6' }}
            title="Download Image"
            aria-label="Download Image"
          >
            <Download size={16} />
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />
          <button
            type="button"
            onClick={onClose}
            style={{ ...btnStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            title="Close (Esc)"
            aria-label="Close Image Viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '20px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={imageSrc}
          alt={imageName}
          style={{
            maxWidth: isFullscreen ? '98vw' : '90vw',
            maxHeight: isFullscreen ? '90vh' : '80vh',
            objectFit: 'contain',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
            borderRadius: isFullscreen ? 0 : '8px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            cursor: zoom > 1 ? 'grab' : 'default',
            userSelect: 'none',
          }}
        />
      </div>

      {/* Bottom Footer Tip */}
      <div
        style={{
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(15, 23, 42, 0.6)',
          color: '#94a3b8',
          fontSize: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
        }}
      >
        Press <kbd style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>Esc</kbd> to close · Use <kbd style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>+</kbd> / <kbd style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>-</kbd> to zoom
      </div>
    </div>
  );
}

const btnStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#e2e8f0',
  borderRadius: '8px',
  width: '32px',
  height: '32px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
