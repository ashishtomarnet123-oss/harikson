import { useState, useEffect } from 'react';
import { X, Search, FileText, Sparkles, Send, Download, Layers, ShieldAlert, CheckCircle, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { authenticatedFetch, getApiConfig } from './settings/apiHelper';

export default function DocumentViewerModal({ isOpen, onClose, documentId }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'sections' | 'tables'

  // AI Assistant state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiAnswers, setAiAnswers] = useState([]);
  const [analyzingMode, setAnalyzingMode] = useState(null);

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocumentDetails();
    }
  }, [isOpen, documentId]);

  const loadDocumentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/documents/${documentId}`);
      if (!res?.ok) throw new Error('Failed to load document');
      const data = await res.json();
      setDoc(data.document);
      setCurrentPage(1);

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
      setError(err?.message || 'Error loading document');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (qText) => {
    const textToAsk = qText || question;
    if (!textToAsk || !textToAsk.trim() || asking) return;

    setAsking(true);
    setQuestion('');
    try {
      const { apiBase } = getApiConfig();
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
    } catch (err) {
      setAiAnswers((prev) => [
        ...prev,
        {
          type: 'error',
          question: textToAsk,
          text: 'Failed to retrieve AI analysis. Please try again.',
          citations: [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleRunAnalysisMode = async (mode) => {
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
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} style={{ backgroundColor: '#FEF08A', color: '#854D0E', padding: '0 2px', borderRadius: 2 }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1240px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: '#EFF6FF', color: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>
                  {doc?.filename || 'Document Viewer'}
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#E0E7FF',
                  color: '#4338CA',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {doc?.document_type || 'General'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                {totalPages} Page{totalPages > 1 ? 's' : ''} · {(doc?.word_count || 0).toLocaleString()} words · {((doc?.file_size_bytes || 0) / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748B', padding: '6px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body: Split Screen */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Pane: Document Viewer */}
          <div style={{ flex: 1.1, borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
            {/* Viewer Controls */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAFAFA'
            }}>
              {/* Search in Doc */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: '8px', padding: '4px 10px', width: '220px'
              }}>
                <Search size={14} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.82rem', width: '100%' }}
                />
              </div>

              {/* View Tabs */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
                <button
                  onClick={() => setActiveTab('preview')}
                  style={{
                    border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'preview' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'preview' ? '#0F172A' : '#64748B',
                    boxShadow: activeTab === 'preview' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Pages
                </button>
                <button
                  onClick={() => setActiveTab('sections')}
                  style={{
                    border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'sections' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'sections' ? '#0F172A' : '#64748B',
                    boxShadow: activeTab === 'sections' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Sections ({sections.length})
                </button>
                {tables.length > 0 && (
                  <button
                    onClick={() => setActiveTab('tables')}
                    style={{
                      border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                      fontWeight: 600,
                      backgroundColor: activeTab === 'tables' ? '#FFFFFF' : 'transparent',
                      color: activeTab === 'tables' ? '#0F172A' : '#64748B',
                      boxShadow: activeTab === 'tables' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Tables ({tables.length})
                  </button>
                )}
              </div>

              {/* Page Navigator */}
              {activeTab === 'preview' && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: '4px', padding: '2px 6px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: '4px', padding: '2px 6px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Document Text Display */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  Loading document intelligence...
                </div>
              ) : activeTab === 'preview' ? (
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {highlightMatches(pageText)}
                </div>
              ) : activeTab === 'sections' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sections.map((s, idx) => (
                    <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', backgroundColor: '#F8FAFC' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '0.95rem' }}>{s.title}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                        {highlightMatches(s.content)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {tables.map((t, idx) => (
                    <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', overflowX: 'auto' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#0F172A' }}>{t.name || `Table ${idx + 1}`}</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9' }}>
                            {t.headers?.map((h, hi) => (
                              <th key={hi} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #CBD5E1' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows?.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: '6px 10px' }}>{String(cell)}</td>
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
            {/* Quick Action Chips Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Sparkles size={16} color="#4F46E5" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>AI Document Intelligence</span>
              </div>

              {/* Mode Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['executive', 'financial', 'legal', 'technical', 'risks'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleRunAnalysisMode(mode)}
                    disabled={analyzingMode !== null || asking}
                    style={{
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {analyzingMode === mode ? 'Analyzing...' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Q&A Stream & Conversation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {aiAnswers.map((ans, idx) => (
                <div key={idx} style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {ans.question && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563EB', marginBottom: '8px' }}>
                      Q: {ans.question}
                    </div>
                  )}
                  {ans.title && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                      {ans.title}
                    </div>
                  )}
                  <div className="prose prose-sm" style={{ fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.6' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {ans.text}
                    </ReactMarkdown>
                  </div>

                  {/* Citations Footer */}
                  {ans.citations && ans.citations.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {ans.citations.slice(0, 3).map((cit, ci) => (
                        <span
                          key={ci}
                          style={{
                            fontSize: '0.72rem',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          📄 {cit.sourceLocation}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Suggested Questions */}
              {metadata.suggestedQuestions && metadata.suggestedQuestions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
                    SUGGESTED ACTIONS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {metadata.suggestedQuestions.slice(0, 4).map((sq, sqi) => (
                      <button
                        key={sqi}
                        onClick={() => handleAskQuestion(sq)}
                        disabled={asking}
                        style={{
                          textAlign: 'left',
                          border: '1px dashed #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        💡 {sq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
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
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem' }}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || asking}
                  style={{
                    backgroundColor: question.trim() && !asking ? '#2563EB' : '#94A3B8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: question.trim() && !asking ? 'pointer' : 'default',
                  }}
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
