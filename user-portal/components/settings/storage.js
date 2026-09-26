import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  HardDrive,
  Database,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Check,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return '';
  }
}

function getFileIcon(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
    return <FileSpreadsheet size={16} className="text-emerald-500" />;
  }
  if (['py', 'js', 'ts', 'jsx', 'tsx', 'json', 'sql', 'html', 'css'].includes(ext)) {
    return <FileCode size={16} className="text-indigo-500" />;
  }
  return <FileText size={16} className="text-blue-500" />;
}

export default function StorageSettings({ onClose }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [storage, setStorage] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { apiBase, tenantSlug } = getApiConfig();

      // Fetch storage metrics
      const storagePromise = authenticatedFetch(`${apiBase}/api/v1/user/storage`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      }).then((res) => (res && res.ok ? res.json() : null));

      // Fetch recent documents
      const docsPromise = authenticatedFetch(`${apiBase}/api/documents`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      }).then((res) => (res && res.ok ? res.json() : null));

      const [storageData, docsData] = await Promise.all([storagePromise, docsPromise]);

      if (storageData) {
        setStorage(storageData);
      } else {
        setError('Unable to load storage usage right now.');
      }

      if (docsData && Array.isArray(docsData.documents)) {
        setRecentDocs(docsData.documents.slice(0, 5));
      }
    } catch (err) {
      console.error('Storage data fetch error:', err);
      setError('Unable to reach the storage telemetry service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // File validation: Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds the 50MB limit.');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setUploadError('');
    setUploadSuccess('');

    try {
      const { apiBase } = getApiConfig();
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(45);

      const res = await authenticatedFetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      if (res && res.ok) {
        setUploadProgress(100);
        setUploadSuccess(`"${file.name}" uploaded and queued for vector indexing!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setUploadSuccess(''), 4000);
        // Refresh usage and docs list
        await loadAllData(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setUploadError(errorData.error || 'Failed to upload document. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Network error during upload. Please check your connection.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const openKnowledgeBase = () => {
    if (onClose) onClose();
    router.push('/documents');
  };

  if (loading) {
    return (
      <div className="storage-loading-state">
        <Loader2 size={28} className="animate-spin text-accent" />
        <p className="loading-text">Loading workspace storage telemetry...</p>
        <style jsx>{`
          .storage-loading-state {
            padding: 80px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
          }
          .text-accent {
            color: var(--accent, #3b82f6);
          }
          .loading-text {
            color: var(--text-secondary);
            font-size: 13.5px;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  const quotaBytes = storage?.quotaBytes || (storage?.quotaGB ? storage.quotaGB * 1024 * 1024 * 1024 : null);
  const totalBytes = storage?.totalBytes || 0;
  const docCount = storage?.documentCount || 0;
  const usagePct = quotaBytes && quotaBytes > 0
    ? Math.min(100, Math.round((totalBytes / quotaBytes) * 1000) / 10)
    : (storage?.usagePct ?? 0);

  return (
    <div className="storage-settings-wrapper">
      {/* ── Page Header ── */}
      <div className="storage-header">
        <div className="storage-header-left">
          <div className="storage-icon-badge">
            <HardDrive size={22} />
          </div>
          <div className="storage-header-text">
            <div className="storage-title-row">
              <h1 className="storage-title">Storage & RAG Drive</h1>
              <span className="storage-badge-live">Active</span>
            </div>
            <p className="storage-description">
              Monitor workspace knowledge base capacity, vector storage usage, and document indexing status.
            </p>
          </div>
        </div>
        <button
          onClick={() => loadAllData(true)}
          disabled={refreshing}
          className="storage-refresh-btn"
          title="Refresh storage metrics"
          type="button"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="storage-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Key Metrics Cards ── */}
      <div className="storage-metrics-grid">
        {/* Total Storage Used */}
        <div className="metric-card metric-card-blue">
          <div className="metric-top-bar">
            <span className="metric-label">Storage In Use</span>
            <div className="metric-icon-box icon-blue">
              <Database size={15} />
            </div>
          </div>
          <div className="metric-value-row">
            <div className="metric-value">{formatBytes(totalBytes)}</div>
          </div>
          <div className="metric-footer">
            <span className="metric-footer-text">
              {quotaBytes ? `${usagePct}% of ${formatBytes(quotaBytes)} limit` : 'Standard workspace pool'}
            </span>
          </div>
        </div>

        {/* Documents Indexed */}
        <div className="metric-card metric-card-emerald">
          <div className="metric-top-bar">
            <span className="metric-label">Knowledge Documents</span>
            <div className="metric-icon-box icon-emerald">
              <FileText size={15} />
            </div>
          </div>
          <div className="metric-value-row">
            <div className="metric-value">{docCount}</div>
          </div>
          <div className="metric-footer">
            <div className="metric-pill pill-emerald">
              <CheckCircle2 size={12} />
              <span>Ready for semantic search</span>
            </div>
          </div>
        </div>

        {/* RAG Vector Pipeline Status */}
        <div className="metric-card metric-card-purple">
          <div className="metric-top-bar">
            <span className="metric-label">Vector Pipeline</span>
            <div className="metric-icon-box icon-purple">
              <Sparkles size={15} />
            </div>
          </div>
          <div className="metric-value-row">
            <div className="metric-status-val">
              <span className="pulse-dot" />
              <span>Active & Synced</span>
            </div>
          </div>
          <div className="metric-footer">
            <div className="metric-pill pill-purple">
              <span>pgvector · semantic index</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quota Progress Bar ── */}
      {quotaBytes && (
        <div className="capacity-card">
          <div className="capacity-header">
            <div className="capacity-title-group">
              <span className="capacity-title">Plan Storage Capacity</span>
              <span className="capacity-subtitle">
                Storage includes chunked embeddings, vector indices, and document metadata.
              </span>
            </div>
            <div className="capacity-stats">
              <span className="capacity-bytes">
                <strong>{formatBytes(totalBytes)}</strong> / {formatBytes(quotaBytes)}
              </span>
              <span className={`capacity-badge ${usagePct > 90 ? 'danger' : usagePct > 75 ? 'warning' : 'normal'}`}>
                {usagePct}% used
              </span>
            </div>
          </div>
          <div className="capacity-track">
            <div
              className={`capacity-fill ${usagePct > 90 ? 'fill-danger' : usagePct > 75 ? 'fill-warning' : 'fill-normal'}`}
              style={{ width: `${Math.max(2, Math.min(100, usagePct))}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Quick Document Ingestion / Upload Dropzone ── */}
      <div className="upload-container-card">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Quick Document Ingestion</h2>
            <p className="section-subtitle">
              Ingest new files directly into your workspace RAG index without leaving settings.
            </p>
          </div>
        </div>

        {uploadSuccess && (
          <div className="storage-alert success">
            <Check size={16} />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div className="storage-alert error">
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`dropzone-box ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
            accept=".pdf,.docx,.txt,.md,.csv,.json,.py,.js,.ts,.html,.sql"
            disabled={uploading}
          />

          {uploading ? (
            <div className="uploading-state">
              <Loader2 size={32} className="animate-spin text-accent" />
              <div className="uploading-title">Ingesting and generating vector embeddings...</div>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="upload-progress-text">{uploadProgress}% complete</span>
            </div>
          ) : (
            <div className="dropzone-idle">
              <div className="dropzone-icon-circle">
                <Upload size={20} />
              </div>
              <div className="dropzone-primary-text">
                <span className="dropzone-highlight">Click to upload</span> or drag and drop files here
              </div>
              <p className="dropzone-secondary-text">
                Supports PDF, DOCX, TXT, Markdown, CSV, JSON, and source code (up to 50MB)
              </p>
              <div className="format-pills">
                <span className="format-pill">PDF</span>
                <span className="format-pill">DOCX</span>
                <span className="format-pill">TXT</span>
                <span className="format-pill">Markdown</span>
                <span className="format-pill">CSV / JSON</span>
                <span className="format-pill">Code</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Documents Section ── */}
      <div className="recent-docs-section">
        <div className="recent-docs-header">
          <div>
            <h2 className="section-title">Recent Knowledge Documents</h2>
            <p className="section-subtitle">Recently embedded files active in semantic search retrieval.</p>
          </div>
          <button onClick={openKnowledgeBase} className="view-all-docs-btn" type="button">
            <span>View all in Documents ({docCount})</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="empty-docs-box">
            <FileText size={28} className="empty-icon" />
            <p className="empty-title">No documents ingested yet</p>
            <p className="empty-subtitle">
              Upload a document above or visit the Documents workspace to begin building your knowledge base.
            </p>
          </div>
        ) : (
          <div className="docs-list">
            {recentDocs.map((doc) => (
              <div key={doc.id || doc._id} className="doc-item-row" onClick={openKnowledgeBase} role="button" tabIndex={0}>
                <div className="doc-left-content">
                  <div className="doc-file-icon">{getFileIcon(doc.filename || doc.title || doc.name)}</div>
                  <div className="doc-meta-info">
                    <div className="doc-name" title={doc.filename || doc.title || doc.name}>
                      {doc.filename || doc.title || doc.name || 'Untitled Document'}
                    </div>
                    <div className="doc-submeta">
                      <span>{formatBytes(doc.file_size_bytes || doc.size || 0)}</span>
                      {doc.created_at && (
                        <>
                          <span className="dot-sep">·</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="doc-right-content">
                  <span className="indexed-badge">
                    <span className="indexed-dot" />
                    Indexed
                  </span>
                  <div className="doc-arrow-hover">
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .storage-settings-wrapper {
          width: 100%;
          max-width: 100%;
        }

        /* ── Header ── */
        .storage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }

        .storage-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .storage-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.12));
          border: 1px solid rgba(59, 130, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent, #3b82f6);
          flex-shrink: 0;
        }

        .storage-header-text {
          min-width: 0;
          flex: 1;
        }

        .storage-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .storage-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.25;
        }

        .storage-badge-live {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .storage-description {
          margin: 4px 0 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
        }

        .storage-refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 9px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-primary);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          min-width: fit-content;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .storage-refresh-btn:hover:not(:disabled) {
          background: var(--bg-hover, #f8fafc);
          border-color: var(--border-hover, #cbd5e1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        .storage-refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Alert ── */
        .storage-alert {
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
        }

        .storage-alert.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .storage-alert.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        /* ── Metrics Grid ── */
        .storage-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 860px) {
          .storage-metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
        }

        .metric-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 128px;
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.03));
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }

        .metric-card-blue::before {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }

        .metric-card-emerald::before {
          background: linear-gradient(90deg, #10b981, #34d399);
        }

        .metric-card-purple::before {
          background: linear-gradient(90deg, #a855f7, #c084fc);
        }

        .metric-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-hover, #cbd5e1);
          box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.05));
        }

        .metric-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .metric-label {
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
        }

        .metric-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-blue {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .icon-emerald {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .icon-purple {
          background: rgba(168, 85, 247, 0.1);
          color: #9333ea;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }

        .metric-value-row {
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .metric-status-val {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 9px;
          letter-spacing: -0.015em;
        }

        .pulse-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
          display: inline-block;
          flex-shrink: 0;
          animation: pulseGlow 2s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.15);
          }
        }

        .metric-footer {
          display: flex;
          align-items: center;
          min-height: 22px;
        }

        .metric-footer-text {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 500;
          padding: 2.5px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .pill-emerald {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .pill-purple {
          background: rgba(168, 85, 247, 0.08);
          color: #9333ea;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }

        /* ── Capacity Progress ── */
        .capacity-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-sm);
        }

        .capacity-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }

        .capacity-title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .capacity-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .capacity-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .capacity-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .capacity-bytes {
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .capacity-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
        }

        .capacity-badge.normal {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .capacity-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .capacity-badge.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .capacity-track {
          height: 8px;
          background: var(--bg-hover, #f1f5f9);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border-subtle, #edf2f7);
        }

        .capacity-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .fill-normal {
          background: linear-gradient(90deg, #3b82f6, #6366f1);
        }

        .fill-warning {
          background: #f59e0b;
        }

        .fill-danger {
          background: #ef4444;
        }

        /* ── Upload Section ── */
        .upload-container-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-sm);
        }

        .section-header-row {
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 3px;
        }

        .section-subtitle {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin: 0;
        }

        .dropzone-box {
          border: 2px dashed var(--border-hover, #cbd5e1);
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          padding: 30px 20px;
          text-align: center;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .dropzone-box:hover {
          border-color: var(--accent, #3b82f6);
          background: var(--bg-hover, #f1f5f9);
        }

        .dropzone-box.dragging {
          border-color: var(--accent, #3b82f6);
          background: rgba(59, 130, 246, 0.05);
          transform: scale(0.995);
        }

        .dropzone-box.uploading {
          cursor: wait;
        }

        .dropzone-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        .dropzone-primary-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .dropzone-highlight {
          color: var(--accent, #3b82f6);
          font-weight: 600;
        }

        .dropzone-secondary-text {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0 0 14px;
        }

        .format-pills {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .format-pill {
          font-size: 10.5px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          padding: 2px 7px;
          border-radius: 5px;
        }

        .uploading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
        }

        .uploading-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .upload-progress-bar {
          width: 240px;
          height: 6px;
          background: var(--bg-hover, #e2e8f0);
          border-radius: 999px;
          overflow: hidden;
        }

        .upload-progress-fill {
          height: 100%;
          background: var(--accent, #3b82f6);
          transition: width 0.2s ease;
          border-radius: 999px;
        }

        .upload-progress-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        /* ── Recent Docs Section ── */
        .recent-docs-section {
          margin-bottom: 24px;
        }

        .recent-docs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }

        .view-all-docs-btn {
          background: none;
          border: none;
          color: var(--accent, #3b82f6);
          font-size: 12.5px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .view-all-docs-btn:hover {
          color: var(--accent-hover, #2563eb);
          background: rgba(59, 130, 246, 0.06);
        }

        .empty-docs-box {
          background: var(--bg-surface, #ffffff);
          border: 1px dashed var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 32px 20px;
          text-align: center;
        }

        .empty-icon {
          color: var(--text-muted, #94a3b8);
          margin: 0 auto 10px;
        }

        .empty-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px;
        }

        .empty-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
          max-width: 440px;
          margin: 0 auto;
        }

        .docs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .doc-item-row {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 11px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .doc-item-row:hover {
          background: var(--bg-hover, #f8fafc);
          border-color: var(--border-hover, #cbd5e1);
          transform: translateX(2px);
        }

        .doc-left-content {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .doc-file-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: var(--bg-secondary, #f1f5f9);
          border: 1px solid var(--border-subtle, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .doc-meta-info {
          min-width: 0;
          flex: 1;
        }

        .doc-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .doc-submeta {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dot-sep {
          color: var(--text-muted);
        }

        .doc-right-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .indexed-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .indexed-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        .doc-arrow-hover {
          color: var(--text-muted);
          transition: color 0.15s ease;
        }

        .doc-item-row:hover .doc-arrow-hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
