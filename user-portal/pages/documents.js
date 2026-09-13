import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import { FileText, Upload, Trash2, Download, Database, AlertCircle, UploadCloud } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const toast = useToast();
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents`);
      if (res?.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      } else {
        setError('Failed to load documents. Please try again.');
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
      setError('Unable to connect to the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = (file) => {
    return new Promise((resolve) => {
      const { apiBase } = getApiConfig();
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('hk_user') || '{}').token; } catch { return null; }
      })();
      const formData = new FormData();
      formData.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBase}/api/documents/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(formData);
    });
  };

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;
    for (const file of files) {
      setUploadProgress(0);
      const ok = await uploadFile(file);
      if (ok) successCount++;
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) {
      fetchDocuments();
      toast.success(`${successCount} document${successCount > 1 ? 's' : ''} uploaded`);
    }
    if (successCount < files.length) {
      toast.error(`${files.length - successCount} upload${files.length - successCount > 1 ? 's' : ''} failed`);
    }
  };

  const handleUpload = (e) => handleUploadFiles(Array.from(e.target.files || []));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUploadFiles(files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      const { apiBase } = getApiConfig();
      await authenticatedFetch(`${apiBase}/api/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
      toast.success('Document deleted');
    } catch (err) {
      console.error('Delete document error:', err);
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/${doc.id}/download`);
      if (!res?.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const pagedDocs = documents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getTypeBadgeColor = (type) => {
    const colors = {
      pdf: '#ef4444', docx: '#3b82f6', txt: '#6b7280', md: '#8b5cf6',
      html: '#f97316', csv: '#10b981', json: '#eab308',
    };
    return colors[type?.toLowerCase()] || '#6b7280';
  };

  return (
    <DashboardShell title="Knowledge Base">
      <Head><title>Knowledge Base — Xarwiz</title></Head>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--shell-text-secondary)', fontSize: '14px', margin: 0 }}>
          Upload and manage documents for RAG-powered search
        </p>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".pdf,.docx,.txt,.md,.html,.csv,.json"
            multiple
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              backgroundColor: '#6366f1', color: '#fff',
              border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: 600,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Documents'}
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : 'var(--shell-card-border, #e2e8f0)'}`,
          borderRadius: '12px',
          padding: uploading ? '16px 24px' : '28px 24px',
          textAlign: 'center',
          marginBottom: '24px',
          backgroundColor: dragOver ? 'rgba(99,102,241,0.06)' : 'transparent',
          cursor: uploading ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {uploading ? (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', marginBottom: '10px' }}>
              Uploading... {uploadProgress}%
            </div>
            <div style={{
              height: '6px', borderRadius: '3px',
              backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
              overflow: 'hidden', maxWidth: '400px', margin: '0 auto',
            }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                backgroundColor: '#6366f1',
                width: `${uploadProgress}%`,
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        ) : (
          <>
            <UploadCloud size={28} color={dragOver ? '#6366f1' : 'var(--shell-text-muted, #6b7280)'} />
            <p style={{ color: 'var(--shell-text-muted)', fontSize: '13px', margin: '8px 0 0' }}>
              {dragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
            </p>
            <p style={{ color: 'var(--shell-text-muted)', fontSize: '11px', margin: '4px 0 0', opacity: 0.7 }}>
              PDF, DOCX, TXT, MD, HTML, CSV, JSON
            </p>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <AlertCircle size={24} color="#f87171" />
          </div>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          <button onClick={fetchDocuments} style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
          }}>
            Retry
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Database size={40} color="var(--shell-text-muted)" />
          <p style={{ color: 'var(--shell-text-muted)', fontSize: '14px', marginTop: '12px' }}>No documents yet. Upload files to build your knowledge base.</p>
        </div>
      ) : (
        <div style={{
          borderRadius: '12px',
          backgroundColor: 'var(--shell-surface)',
          border: '1px solid var(--shell-card-border)',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 100px 90px',
            padding: '12px 20px', gap: '12px',
            borderBottom: '1px solid var(--shell-card-border)',
            fontSize: '11px', fontWeight: 600, color: 'var(--shell-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Filename</span>
            <span>Type</span>
            <span>Size</span>
            <span>Status</span>
            <span>Uploaded</span>
            <span>Actions</span>
          </div>

          {pagedDocs.map((doc) => (
            <div key={doc.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 100px 90px',
              padding: '14px 20px', gap: '12px', alignItems: 'center',
              borderBottom: '1px solid var(--shell-card-border-subtle)',
              fontSize: '13px',
            }}>
              <span style={{ color: 'var(--shell-text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={14} color="var(--shell-text-muted)" />
                {doc.filename}
              </span>
              <span>
                <span style={{
                  fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                  backgroundColor: `${getTypeBadgeColor(doc.file_type)}22`,
                  color: getTypeBadgeColor(doc.file_type),
                  textTransform: 'uppercase',
                }}>
                  {doc.file_type || '?'}
                </span>
              </span>
              <span style={{ color: 'var(--shell-text-secondary)' }}>{formatSize(doc.file_size_bytes)}</span>
              <span>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 500,
                  backgroundColor: doc.status === 'processed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: doc.status === 'processed' ? '#34d399' : '#fbbf24',
                }}>
                  {doc.status || 'pending'}
                </span>
              </span>
              <span style={{ color: 'var(--shell-text-muted)', fontSize: '12px' }}>{formatDate(doc.created_at)}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleDownload(doc)} title="Download" style={{
                  background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: '4px',
                }}>
                  <Download size={14} />
                </button>
                <button onClick={() => handleDelete(doc.id)} title="Delete" style={{
                  background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px',
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
            padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
            backgroundColor: 'var(--shell-surface)', color: 'var(--shell-text-secondary)',
            border: '1px solid var(--shell-card-border)', cursor: page <= 1 ? 'default' : 'pointer',
            opacity: page <= 1 ? 0.4 : 1,
          }}>Previous</button>
          <span style={{ fontSize: '13px', color: 'var(--shell-text-muted)' }}>
            Page {page} of {totalPages} · {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
            padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
            backgroundColor: 'var(--shell-surface)', color: 'var(--shell-text-secondary)',
            border: '1px solid var(--shell-card-border)', cursor: page >= totalPages ? 'default' : 'pointer',
            opacity: page >= totalPages ? 0.4 : 1,
          }}>Next</button>
        </div>
      )}
    </DashboardShell>
  );
}

export default withAuth(DocumentsPage);
