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
      <div className="settings-loading" style={{ padding: '60px 0', textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading workspace storage telemetry...</p>
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
    <>
      <div className="settings-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <HardDrive size={22} style={{ color: 'var(--accent)' }} />
            Storage & RAG Drive
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Monitor workspace knowledge base capacity, vector storage usage, and document indexing status.
          </p>
        </div>
        <button
          onClick={() => loadAllData(true)}
          disabled={refreshing}
          style={{
            background: 'none',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12px',
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
          title="Refresh storage metrics"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="settings-alert error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Key Metrics Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {/* Total Storage Used */}
        <div className="settings-card" style={{ padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Storage In Use</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Database size={15} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatBytes(totalBytes)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {quotaBytes ? `${usagePct}% of ${formatBytes(quotaBytes)} limit` : 'Standard workspace pool'}
          </div>
        </div>

        {/* Documents Indexed */}
        <div className="settings-card" style={{ padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Knowledge Documents</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <FileText size={15} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {docCount}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            <span>Ready for semantic search</span>
          </div>
        </div>

        {/* RAG Vector Status */}
        <div className="settings-card" style={{ padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Vector Pipeline</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
              <Sparkles size={15} />
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Active & Synced
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            pgvector semantic index
          </div>
        </div>
      </div>

      {/* ── Quota Progress Bar ── */}
      {quotaBytes && (
        <div className="settings-card" style={{ padding: '18px 20px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Plan Storage Capacity</span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <strong>{formatBytes(totalBytes)}</strong> / {formatBytes(quotaBytes)} ({usagePct}%)
            </span>
          </div>
          <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.max(2, Math.min(100, usagePct))}%`,
                background: usagePct > 90 ? '#ef4444' : usagePct > 75 ? '#f59e0b' : '#2563eb',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Quick Document Ingestion / Upload Dropzone ── */}
      <div className="settings-section" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>Quick Document Ingestion</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          Ingest new files directly into your workspace RAG index without leaving settings.
        </p>

        {uploadSuccess && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Check size={16} />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${isDragging ? '#2563eb' : '#cbd5e1'}`,
            background: isDragging ? '#eff6ff' : '#fafafa',
            borderRadius: '12px',
            padding: '28px 20px',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            cursor: uploading ? 'wait' : 'pointer',
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#2563eb' }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ingesting and generating vector embeddings...
              </div>
              <div style={{ width: '220px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <Upload size={20} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Click to upload or drag and drop
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Supports PDF, DOCX, TXT, Markdown, CSV, JSON, and source code (up to 50MB)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Documents Section ── */}
      <div className="settings-section" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Recent Knowledge Documents</h2>
          <button
            onClick={openKnowledgeBase}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            <span>View all ({docCount})</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="settings-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <FileText size={24} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
            <p style={{ margin: 0 }}>No documents ingested yet. Upload a document above to enable RAG answers in your chat.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentDocs.map((doc) => (
              <div
                key={doc.id || doc._id}
                className="settings-card"
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={doc.filename || doc.title || doc.name}
                    >
                      {doc.filename || doc.title || doc.name || 'Untitled Document'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {formatBytes(doc.file_size_bytes || doc.size || 0)}
                      {doc.created_at && ` · ${formatDate(doc.created_at)}`}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11.5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Indexed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
