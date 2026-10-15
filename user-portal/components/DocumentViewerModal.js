import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  FileText,
  Sparkles,
  Send,
  Download,
  Layers,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { authenticatedFetch, getApiConfig } from './settings/apiHelper';

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentId,
  initialPage = 1,
  fileData = null,
}) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Viewer state
  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'sections' | 'tables'
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePane, setMobilePane] = useState('viewer'); // 'viewer' | 'ai'

  // AI Assistant state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiAnswers, setAiAnswers] = useState([]);
  const [analyzingMode, setAnalyzingMode] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage || 1);
      setZoom(1);

      const parsePagesFromContent = (content) => {
        if (!content) return [];
        const parts = content.split(/--- Page (\d+) ---\n/);
        if (parts.length > 2) {
          const list = [];
          for (let i = 1; i < parts.length; i += 2) {
            list.push({
              pageNumber: parseInt(parts[i], 10),
              text: parts[i + 1]?.trim() || '',
            });
          }
          return list;
        }
        return [{ pageNumber: 1, text: content }];
      };

      if (fileData) {
        setLoading(false);
        setError(null);
        const parsedPages = fileData.pageList || fileData.structure?.pages || parsePagesFromContent(fileData.content);
        const pageCountVal = fileData.pageCount || fileData.pages || (parsedPages.length > 0 ? parsedPages.length : 1);

        setDoc({
          id: fileData.documentId || (typeof documentId === 'string' ? documentId : null),
          filename: fileData.name || fileData.title || 'Document',
          document_type: fileData.documentType || 'general',
          page_count: pageCountVal,
          word_count:
            fileData.wordCount ||
            (fileData.content ? fileData.content.split(/\s+/).length : 0),
          file_size_bytes: fileData.size || 0,
          url: fileData.url || fileData.dataUrl || '',
          structure: fileData.structure || {
            pages: parsedPages,
            sections: fileData.sections || [{ title: 'Extracted Content', content: fileData.content || '' }],
            tables: fileData.tables || [],
          },
          metadata: fileData.metadata || { summary: fileData.summary || '' },
        });

        if (fileData.summary) {
          setAiAnswers([
            {
              type: 'summary',
              title: 'Document Overview',
              text: fileData.summary,
              citations: [],
            },
          ]);
        }

        const docIdToFetch = fileData.documentId || (typeof documentId === 'object' ? documentId?.id : documentId);
        if (docIdToFetch) {
          loadDocumentDetails(docIdToFetch, true);
        }
      } else if (documentId) {
        const idToLoad = typeof documentId === 'object' ? documentId?.id : documentId;
        if (idToLoad) {
          loadDocumentDetails(idToLoad, false);
        }
      }
    }
  }, [isOpen, documentId, initialPage, fileData]);

  const loadDocumentDetails = async (targetId, silent = false) => {
    const idToFetch = targetId || (typeof documentId === 'object' ? documentId?.id : documentId);
    if (!idToFetch) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/${idToFetch}`);
      if (!res?.ok) throw new Error('Failed to load document');
      const data = await res.json();
      setDoc((prev) => ({
        ...prev,
        ...data.document,
        structure: data.document.structure || prev?.structure,
      }));
      if (initialPage) setCurrentPage(initialPage);

      // Preload quick summary if available
      if (data.document?.metadata?.summary) {
        setAiAnswers([
          {
            type: 'summary',
            title: 'Document Overview',
            text: data.document.metadata.summary,
            citations: [],
          },
        ]);
      }
    } catch (err) {
      if (!silent) {
        setError(err?.message || 'Error loading document');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!doc) return;
    try {
      if (documentId) {
        const { apiBase } = getApiConfig();
        const res = await authenticatedFetch(`${apiBase}/api/documents/${documentId}/download`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.filename || 'document';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          return;
        }
      }

      // Fallback client-side download if text content is available
      const textToDownload =
        doc.structure?.pages?.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n') ||
        doc.structure?.sections?.[0]?.content ||
        '';
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.filename || 'document'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [doc, documentId]);

  const handleAskQuestion = async (qText) => {
    const textToAsk = qText || question;
    if (!textToAsk || !textToAsk.trim() || asking) return;

    setAsking(true);
    setQuestion('');
    try {
      const { apiBase } = getApiConfig();
      if (documentId) {
        const res = await authenticatedFetch(`${apiBase}/api/documents/${documentId}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: textToAsk }),
        });

        if (!res?.ok) throw new Error('AI query failed');
        const data = await res.json();

        setAiAnswers((prev) => [
          ...prev,
          {
            type: 'qa',
            question: textToAsk,
            text: data.answer,
            citations: data.citations || [],
          },
        ]);
      } else {
        // Local extraction fallback Q&A
        setAiAnswers((prev) => [
          ...prev,
          {
            type: 'qa',
            question: textToAsk,
            text: `Based on the extracted document content: ${doc?.metadata?.summary || 'Information retrieved from document pages.'}`,
            citations: [{ page: currentPage, preview: 'Page reference' }],
          },
        ]);
      }
    } catch (err) {
      setAiAnswers((prev) => [
        ...prev,
        {
          type: 'error',
          question: textToAsk,
          text: 'Failed to retrieve AI analysis. Please try asking again.',
          citations: [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleRunAnalysisMode = async (mode) => {
    if (!documentId) return;
    setAnalyzingMode(mode);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/${documentId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      if (!res?.ok) throw new Error('Analysis mode failed');
      const data = await res.json();

      setAiAnswers((prev) => [
        ...prev,
        {
          type: 'mode',
          title: `${mode.toUpperCase()} Analysis`,
          text: data.analysis,
          citations: data.citations || [],
        },
      ]);
    } catch (err) {
      setAiAnswers((prev) => [
        ...prev,
        {
          type: 'error',
          text: `Failed to generate ${mode} analysis.`,
          citations: [],
        },
      ]);
    } finally {
      setAnalyzingMode(null);
    }
  };

  if (!isOpen) return null;

  const metadata = doc?.metadata || {};
  const structure = doc?.structure || {};
  const pages = structure.pages || [];
  const sections = structure.sections || [];
  const tables = structure.tables || [];
  const totalPages = doc?.page_count || (pages.length > 0 ? pages.length : 1);

  const currentPageData = pages.find((p) => p.pageNumber === currentPage);
  const pageText = currentPageData ? currentPageData.text : (sections[0]?.content || 'Content preview not available');

  // Filter text by search query if set
  const highlightMatches = (text) => {
    if (!text) return '';
    if (!searchQuery.trim()) return text;
    const parts = String(text).split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0 2px', borderRadius: 2 }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isFullscreen ? 0 : '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: isFullscreen ? 0 : '16px',
          width: isFullscreen ? '100vw' : '100%',
          maxWidth: isFullscreen ? '100vw' : '1280px',
          height: isFullscreen ? '100vh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: isFullscreen ? 'none' : '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '400px',
                  }}
                  title={doc?.filename}
                >
                  {doc?.filename || 'Document Viewer'}
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {doc?.document_type || 'PDF'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                {totalPages} Page{totalPages > 1 ? 's' : ''} · {(doc?.word_count || 0).toLocaleString()} words
                {doc?.file_size_bytes ? ` · ${((doc.file_size_bytes) / 1024).toFixed(1)} KB` : ''}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mobile Tab Switcher */}
            <div className="doc-viewer-mobile-tabs" style={{ display: 'none', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setMobilePane('viewer')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: mobilePane === 'viewer' ? '#ffffff' : 'transparent',
                  color: mobilePane === 'viewer' ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('ai')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: mobilePane === 'ai' ? '#ffffff' : 'transparent',
                  color: mobilePane === 'ai' ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                AI Insights
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              style={iconBtnStyle}
              title="Download Document"
              aria-label="Download Document"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={iconBtnStyle}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ ...iconBtnStyle, color: '#ef4444' }}
              title="Close (Esc)"
              aria-label="Close Document Viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body: Split Screen */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Pane: Document Viewer */}
          <div
            className={`doc-viewer-left-pane ${mobilePane === 'ai' ? 'mobile-hidden' : ''}`}
            style={{
              flex: 1.15,
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              minWidth: 0,
            }}
          >
            {/* Viewer Controls */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#fafafa',
                flexWrap: 'wrap',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {/* Search in Doc */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  width: '180px',
                }}
              >
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.8rem', width: '100%', background: 'transparent' }}
                />
              </div>

              {/* View Tabs */}
              <div style={{ display: 'flex', gap: '3px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'preview' ? '#ffffff' : 'transparent',
                    color: activeTab === 'preview' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'preview' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  Pages
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sections')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'sections' ? '#ffffff' : 'transparent',
                    color: activeTab === 'sections' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'sections' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  Sections ({sections.length})
                </button>
                {tables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('tables')}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      backgroundColor: activeTab === 'tables' ? '#ffffff' : 'transparent',
                      color: activeTab === 'tables' ? '#0f172a' : '#64748b',
                      boxShadow: activeTab === 'tables' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Tables ({tables.length})
                  </button>
                )}
              </div>

              {/* Zoom & Page Navigator Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Zoom Controls */}
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))}
                  style={miniBtnStyle}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span style={{ fontSize: '11px', color: '#64748b', minWidth: '34px', textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.0, +(z + 0.15).toFixed(2)))}
                  style={miniBtnStyle}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  style={miniBtnStyle}
                  title="Reset Zoom"
                >
                  <RotateCcw size={12} />
                </button>

                {/* Page Navigation */}
                {activeTab === 'preview' && totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#475569', marginLeft: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      style={{ ...miniBtnStyle, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1 }}
                      title="Previous Page"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      style={{ ...miniBtnStyle, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                      title="Next Page"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Text Display */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: `${0.9 * zoom}rem`,
                lineHeight: '1.65',
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '3px solid #e2e8f0',
                      borderTopColor: '#2563eb',
                      borderRadius: '50%',
                      margin: '0 auto 12px auto',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span>Loading document intelligence & pages...</span>
                </div>
              ) : activeTab === 'preview' ? (
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {highlightMatches(pageText)}
                </div>
              ) : activeTab === 'sections' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sections.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '0.95rem' }}>{s.title}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                        {highlightMatches(s.content)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {tables.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        overflowX: 'auto',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '0.9rem' }}>
                        {t.name || `Table ${idx + 1}`}
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9' }}>
                            {t.headers?.map((h, hi) => (
                              <th
                                key={hi}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #cbd5e1',
                                  fontWeight: 600,
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows?.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: '8px 12px' }}>
                                  {String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: AI Document Assistant */}
          <div
            className={`doc-viewer-right-pane ${mobilePane === 'viewer' ? 'mobile-hidden' : ''}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fafafa',
              minWidth: 0,
            }}
          >
            {/* Quick Action Chips Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={16} color="#4f46e5" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>AI Document Intelligence</span>
              </div>

              {/* Mode Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['executive', 'financial', 'legal', 'technical', 'risks'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleRunAnalysisMode(mode)}
                    disabled={analyzingMode !== null || asking}
                    style={{
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    {analyzingMode === mode ? 'Analyzing...' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Q&A Stream & Conversation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {aiAnswers.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '40px 20px' }}>
                  Ask any question about this document or select a quick analysis mode above.
                </div>
              )}
              {aiAnswers.map((ans, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {ans.question && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb', marginBottom: '8px' }}>
                      Q: {ans.question}
                    </div>
                  )}
                  {ans.title && (
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                      {ans.title}
                    </div>
                  )}
                  <div className="prose prose-sm" style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.6' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {ans.text}
                    </ReactMarkdown>
                  </div>

                  {/* Citations Footer */}
                  {ans.citations && ans.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {ans.citations.slice(0, 3).map((cit, ci) => (
                        <button
                          key={ci}
                          type="button"
                          onClick={() => {
                            if (cit.page) {
                              setCurrentPage(cit.page);
                              setActiveTab('preview');
                              setMobilePane('viewer');
                            }
                          }}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #dbeafe',
                            color: '#2563eb',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Page {cit.page || 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '6px 12px',
                }}
              >
                <input
                  type="text"
                  placeholder="Ask anything about this document..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={asking}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || asking}
                  style={{
                    backgroundColor: question.trim() && !asking ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: question.trim() && !asking ? 'pointer' : 'default',
                    flexShrink: 0,
                  }}
                  aria-label="Ask Question"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  color: '#475569',
  padding: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const miniBtnStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  color: '#475569',
  padding: '3px 6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
