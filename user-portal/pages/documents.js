import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import DocumentViewerModal from '../components/DocumentViewerModal';
import {
  FileText, Upload, Trash2, Download, Database, AlertCircle, UploadCloud,
  Search, Filter, FolderPlus, Folder, Sparkles, MessageSquare, ArrowRightLeft,
  CheckCircle2, Clock, Check, X, Eye, Table, Layers, ChevronDown
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'collections'
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Multi-Document Comparison
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Modals
  const [viewerDocId, setViewerDocId] = useState(null);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const toast = useToast();
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    fetchCollections();
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
        setError('Failed to load documents.');
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/collections/list`);
      if (res?.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error('Fetch collections error:', err);
    }
  };

  const uploadFile = (file, collectionId) => {
    return new Promise((resolve) => {
      const { apiBase } = getApiConfig();
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('hk_user') || '{}').token; } catch { return null; }
      })();
      const formData = new FormData();
      formData.append('file', file);
      if (collectionId) formData.append('collectionId', collectionId);

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
      const ok = await uploadFile(file, selectedCollection);
      if (ok) successCount++;
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) {
      fetchDocuments();
      toast.success(`${successCount} document${successCount > 1 ? 's' : ''} uploaded and analyzed`);
    }
    if (successCount < files.length) {
      toast.error(`${files.length - successCount} upload${files.length - successCount > 1 ? 's' : ''} failed`);
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim(), description: newCollectionDesc.trim() }),
      });
      if (res?.ok) {
        toast.success(`Collection "${newCollectionName}" created`);
        setNewCollectionName('');
        setNewCollectionDesc('');
        setShowNewCollectionModal(false);
        fetchCollections();
      } else {
        toast.error('Failed to create collection');
      }
    } catch (err) {
      toast.error('Failed to create collection');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this document and its embeddings?')) return;
    try {
      const { apiBase } = getApiConfig();
      await authenticatedFetch(`${apiBase}/api/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
      toast.success('Document deleted');
    } catch (err) {
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
      a.download = doc.filename || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const handleCompareSelected = async () => {
    if (selectedDocIds.length < 2) {
      toast.error('Please select at least 2 documents to compare');
      return;
    }
    setComparing(true);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedDocIds }),
      });
      if (!res?.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setComparisonResult(data.comparison);
    } catch (err) {
      toast.error('Document comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const handleChatWithDoc = (doc) => {
    // Navigate to /chat with document context
    router.push(`/chat?docId=${doc.id}&docName=${encodeURIComponent(doc.filename)}`);
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery.trim() ||
      doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCollection = !selectedCollection || doc.collection_id === selectedCollection;

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'pdf' && doc.file_type === 'pdf') ||
      (typeFilter === 'spreadsheet' && ['xlsx', 'csv', 'xls', 'tsv'].includes(doc.file_type)) ||
      (typeFilter === 'docs' && ['docx', 'txt', 'md', 'rtf'].includes(doc.file_type)) ||
      (typeFilter === 'code' && ['js', 'ts', 'py', 'json', 'sql', 'html'].includes(doc.file_type));

    return matchesSearch && matchesCollection && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const totalPagesProcessed = documents.reduce((acc, d) => acc + (d.page_count || 1), 0);

  return (
    <DashboardShell>
      <Head>
        <title>Document Intelligence Workspace — Xarwiz</title>
      </Head>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', fontFamily: "'Inter', sans-serif" }}>
        {/* Workspace Title & Actions Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Document Intelligence
              </h1>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE'
              }}>
                Multimodal RAG v2
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '4px', marginBottom: 0 }}>
              Upload, analyze, extract, and converse with documents, spreadsheets, slides, and code.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowNewCollectionModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
                fontWeight: 600, color: '#334155', cursor: 'pointer'
              }}
            >
              <FolderPlus size={16} />
              New Collection
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#2563EB', border: 'none',
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem',
                fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
              }}
            >
              <Upload size={16} />
              {uploading ? 'Analyzing...' : 'Upload Files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleUploadFiles(Array.from(e.target.files || []))}
            />
          </div>
        </div>

        {/* Intelligence Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>Total Documents</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
              {documents.length}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>Collections</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
              {collections.length}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>Pages Analyzed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
              {totalPagesProcessed}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>AI Search Status</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16A34A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={18} /> Ready
            </div>
          </div>
        </div>

        {/* Multi-Document Compare Bar (Active when 2+ docs selected) */}
        {selectedDocIds.length >= 2 && (
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#1E40AF', fontWeight: 600 }}>
              <ArrowRightLeft size={16} />
              {selectedDocIds.length} documents selected for comparison
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setSelectedDocIds([])}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                onClick={handleCompareSelected}
                disabled={comparing}
                style={{
                  backgroundColor: '#2563EB', color: '#fff', border: 'none',
                  padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                {comparing ? 'Comparing...' : 'Compare with AI'}
              </button>
            </div>
          </div>
        )}

        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) handleUploadFiles(files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragOver ? '2px dashed #2563EB' : '1px dashed #CBD5E1',
            borderRadius: '12px',
            backgroundColor: dragOver ? '#EFF6FF' : '#F8FAFC',
            padding: '28px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '24px',
            transition: 'all 0.15s ease',
          }}
        >
          <UploadCloud size={32} color={dragOver ? '#2563EB' : '#64748B'} style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
            Click to upload or drag and drop files here
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
            Supports PDF, DOCX, XLSX, CSV, PPTX, Images (PNG/JPG), Code, JSON, and Text (up to 50MB)
          </div>
          {uploading && (
            <div style={{ maxWidth: '300px', margin: '16px auto 0 auto' }}>
              <div style={{ height: '6px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#2563EB', transition: 'width 0.2s' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                Extracting structures and generating knowledge... {uploadProgress}%
              </div>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
            borderRadius: '8px', padding: '6px 12px', width: '280px'
          }}>
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search documents or types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%' }}
            />
          </div>

          {/* Type Filters & Collections Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
              {['all', 'pdf', 'spreadsheet', 'docs', 'code'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTypeFilter(tf)}
                  style={{
                    border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                    fontWeight: 600,
                    backgroundColor: typeFilter === tf ? '#FFFFFF' : 'transparent',
                    color: typeFilter === tf ? '#0F172A' : '#64748B',
                    boxShadow: typeFilter === tf ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    textTransform: 'capitalize'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Collection Filter Dropdown */}
            {collections.length > 0 && (
              <select
                value={selectedCollection || ''}
                onChange={(e) => setSelectedCollection(e.target.value || null)}
                style={{
                  border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px',
                  fontSize: '0.82rem', backgroundColor: '#FFFFFF', color: '#334155', outline: 'none'
                }}
              >
                <option value="">All Collections</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>{col.name} ({col.document_count})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Loading documents...
            </div>
          ) : pagedDocs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              No documents found. Upload your first document above.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', width: '36px' }}></th>
                  <th style={{ padding: '12px 16px' }}>Document</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Pages & Words</th>
                  <th style={{ padding: '12px 16px' }}>Collection</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectDoc(doc.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '6px',
                            backgroundColor: '#F1F5F9', color: '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div
                              onClick={() => setViewerDocId(doc.id)}
                              style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                              title="Click to view & analyze"
                            >
                              {doc.filename}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              {formatSize(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                          backgroundColor: '#F1F5F9', color: '#334155', textTransform: 'uppercase'
                        }}>
                          {doc.document_type || doc.file_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {doc.page_count || 1} pgs · {(doc.word_count || 0).toLocaleString()} words
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {doc.collection_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                            <Folder size={12} /> {doc.collection_name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.75rem', fontWeight: 600,
                          color: doc.status === 'indexed' ? '#16A34A' : doc.status === 'processing' ? '#D97706' : '#DC2626'
                        }}>
                          {doc.status === 'indexed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          {doc.status === 'indexed' ? 'Ready' : doc.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setViewerDocId(doc.id)}
                            title="Inspect & AI Analysis"
                            style={{
                              border: '1px solid #E2E8F0', background: '#fff', borderRadius: '6px',
                              padding: '6px', cursor: 'pointer', color: '#2563EB'
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleChatWithDoc(doc)}
                            title="Chat with AI about this document"
                            style={{
                              border: '1px solid #E2E8F0', background: '#fff', borderRadius: '6px',
                              padding: '6px', cursor: 'pointer', color: '#4F46E5'
                            }}
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Download document text"
                            style={{
                              border: '1px solid #E2E8F0', background: '#fff', borderRadius: '6px',
                              padding: '6px', cursor: 'pointer', color: '#64748B'
                            }}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                            style={{
                              border: '1px solid #E2E8F0', background: '#fff', borderRadius: '6px',
                              padding: '6px', cursor: 'pointer', color: '#EF4444'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748B' }}>
              <div>Page {page} of {totalPages}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{ border: '1px solid #E2E8F0', background: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{ border: '1px solid #E2E8F0', background: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer & AI Assistant Modal */}
      {viewerDocId && (
        <DocumentViewerModal
          isOpen={Boolean(viewerDocId)}
          onClose={() => setViewerDocId(null)}
          documentId={viewerDocId}
        />
      )}

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A' }}>Create Document Collection</h3>
              <button onClick={() => setShowNewCollectionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCollection}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Collection Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Due Diligence, Vendor Contracts"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Scope or notes for this collection..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewCollectionModal(false)}
                  style={{ border: '1px solid #E2E8F0', background: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#2563EB', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A' }}>Document Comparison Analysis</h3>
              </div>
              <button onClick={() => setComparisonResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div className="prose prose-sm" style={{ color: '#1E293B' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {comparisonResult}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default withAuth(DocumentsPage);
