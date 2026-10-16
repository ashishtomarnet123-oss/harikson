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
  Code,
  Music,
  Video,
  Presentation as PresentationIcon,
  Copy,
  Check,
  Table,
  ArrowLeft,
  Columns,
  Maximize,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { authenticatedFetch, getApiConfig } from './settings/apiHelper';
import { getFileCapability } from '../lib/fileCapabilities';

function parseCsvToTable(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const parseLine = (line) => {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1, 250).map(parseLine);
  return { headers, rows, name: 'Sheet 1', totalRows: lines.length - 1 };
}

function parsePagesFromContent(content) {
  if (!content) return [];
  const parts = content.split(/--- Page (\d+) ---\s*/);
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
}

function createDocFromFileData(fileData, documentId) {
  if (!fileData) return null;
  const parsedPages = fileData.pageList || fileData.structure?.pages || parsePagesFromContent(fileData.content || fileData.extractedText);
  const pageCountVal = parseInt(fileData.pageCount || fileData.pages || (parsedPages.length > 0 ? parsedPages.length : 1), 10) || 1;

  return {
    id: fileData.documentId || (typeof documentId === 'string' ? documentId : null),
    filename: fileData.name || fileData.title || 'Document',
    document_type: fileData.documentType || fileData.type || 'general',
    page_count: pageCountVal,
    word_count:
      fileData.wordCount ||
      (fileData.content ? fileData.content.split(/\s+/).length : 0),
    file_size_bytes: fileData.size || 0,
    url: fileData.url || fileData.dataUrl || '',
    content: fileData.content || fileData.extractedText || '',
    structure: fileData.structure || {
      pages: parsedPages,
      sections: fileData.sections || [{ title: 'Extracted Content', content: fileData.content || fileData.extractedText || '' }],
      tables: fileData.tables || [],
    },
    metadata: fileData.metadata || { summary: fileData.summary || '' },
  };
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentId,
  initialPage = 1,
  fileData = null,
}) {
  const [doc, setDoc] = useState(() => createDocFromFileData(fileData, documentId));
  const [loading, setLoading] = useState(() => !fileData && !!documentId);
  const [error, setError] = useState(null);

  // Workspace Viewer state
  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'sections' | 'tables' | 'raw'
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState('page'); // 'page' | 'width'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState('viewer'); // 'viewer' | 'ai'

  // AI Assistant state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiAnswers, setAiAnswers] = useState([]);
  const [analyzingMode, setAnalyzingMode] = useState(null);

  // Initialize and load document
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage || 1);
      setZoom(1);
      setFitMode('page');

      if (fileData) {
        setLoading(false);
        setError(null);
        const derivedDoc = createDocFromFileData(fileData, documentId);
        setDoc(derivedDoc);

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

  // Keyboard navigation: Left/Right arrows for pages, Escape for close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        const effective = doc || createDocFromFileData(fileData, documentId);
        const maxPages = effective?.page_count || 1;
        setCurrentPage((p) => Math.min(maxPages, p + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, doc, fileData, documentId, onClose]);

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
        doc.content ||
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
        setAiAnswers((prev) => [
          ...prev,
          {
            type: 'qa',
            question: textToAsk,
            text: `Based on ${doc?.filename || 'the document'}: ${doc?.metadata?.summary || 'The requested analysis has been extracted from the document workspace.'}`,
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
          type: 'analysis',
          title: mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ') + ' Analysis',
          text: data.result,
          citations: data.citations || [],
        },
      ]);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzingMode(null);
    }
  };

  if (!isOpen) return null;

  const currentDoc = doc || createDocFromFileData(fileData, documentId);
  const fileName = currentDoc?.filename || fileData?.name || fileData?.title || 'Document';
  const capability = getFileCapability(fileName, currentDoc?.document_type || fileData?.type || fileData?.mimeType);

  const metadata = currentDoc?.metadata || {};
  const structure = currentDoc?.structure || {};
  const pages = structure.pages || [];
  const sections = structure.sections || [];
  let tables = structure.tables || [];

  if (tables.length === 0 && (currentDoc?.content || fileData?.content)) {
    const parsedCsv = parseCsvToTable(currentDoc?.content || fileData?.content || '');
    if (parsedCsv) {
      tables = [parsedCsv];
    }
  }

  const isSpreadsheet = capability.category === 'spreadsheet' || tables.length > 0;
  const isPresentation = capability.category === 'presentation';
  const isCodeOrData = capability.category === 'code' || capability.category === 'data';
  const isAudio = capability.category === 'audio';
  const isVideo = capability.category === 'video';
  const isPdf = capability.category === 'pdf';

  const totalPages = parseInt(currentDoc?.page_count || (pages.length > 0 ? pages.length : 1), 10) || 1;
  const currentPageData = pages.find((p) => p.pageNumber === currentPage);
  const pageText =
    currentPageData ? currentPageData.text : sections[0]?.content || currentDoc?.content || fileData?.content || 'Content preview not available';

  // Highlight search query matches
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
      id="xarwiz-document-workspace"
      data-testid="xarwiz-document-workspace"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* ── TOP WORKSPACE NAVIGATION BAR ─────────────────────────────────── */}
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          flexShrink: 0,
          gap: '16px',
        }}
      >
        {/* Left: Back to Chat + Document Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <button
            id="workspace-back-to-chat-btn"
            data-testid="workspace-back-to-chat-btn"
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Chat</span>
          </button>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: capability.bg,
              border: `1px solid ${capability.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isPdf ? (
              <FileText size={18} color="#ef4444" />
            ) : isSpreadsheet ? (
              <BarChart2 size={18} color="#10b981" />
            ) : isCodeOrData ? (
              <Code size={18} color="#6366f1" />
            ) : isPresentation ? (
              <PresentationIcon size={18} color="#f59e0b" />
            ) : isAudio ? (
              <Music size={18} color="#8b5cf6" />
            ) : isVideo ? (
              <Video size={18} color="#06b6d4" />
            ) : (
              <FileText size={18} color="#64748b" />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 650,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '360px',
                }}
                title={fileName}
              >
                {fileName}
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: capability.bg,
                  color: capability.color,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  border: `1px solid ${capability.border}`,
                }}
              >
                {capability.badge}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
              {totalPages} {totalPages === 1 ? 'Page' : 'Pages'} · {(currentDoc?.word_count || 0).toLocaleString()} words
              {currentDoc?.file_size_bytes ? ` · ${((currentDoc.file_size_bytes) / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>
        </div>

        {/* Center / View Selector Tabs */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1e293b', padding: '3px', borderRadius: '8px', border: '1px solid #334155' }}>
          <button
            id="workspace-tab-preview"
            data-testid="workspace-tab-preview"
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              border: 'none',
              padding: '5px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              backgroundColor: activeTab === 'preview' ? '#2563eb' : 'transparent',
              color: activeTab === 'preview' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            {isPresentation ? 'Slides' : isSpreadsheet ? 'Spreadsheet' : isCodeOrData ? 'Source Code' : isAudio || isVideo ? 'Media' : 'Document Pages'}
          </button>
          {sections.length > 0 && (
            <button
              id="workspace-tab-sections"
              data-testid="workspace-tab-sections"
              type="button"
              onClick={() => setActiveTab('sections')}
              style={{
                border: 'none',
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                backgroundColor: activeTab === 'sections' ? '#2563eb' : 'transparent',
                color: activeTab === 'sections' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease',
              }}
            >
              Sections ({sections.length})
            </button>
          )}
          {tables.length > 0 && (
            <button
              id="workspace-tab-tables"
              data-testid="workspace-tab-tables"
              type="button"
              onClick={() => setActiveTab('tables')}
              style={{
                border: 'none',
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                backgroundColor: activeTab === 'tables' ? '#2563eb' : 'transparent',
                color: activeTab === 'tables' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease',
              }}
            >
              Tables ({tables.length})
            </button>
          )}
        </div>

        {/* Right: Zoom, AI Assistant Toggle, Download & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#1e293b', padding: '2px 4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <button
              id="workspace-zoom-out"
              data-testid="workspace-zoom-out"
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', padding: '4px', cursor: 'pointer', display: 'flex' }}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '36px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              id="workspace-zoom-in"
              data-testid="workspace-zoom-in"
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', padding: '4px', cursor: 'pointer', display: 'flex' }}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              id="workspace-fit-toggle"
              data-testid="workspace-fit-toggle"
              type="button"
              onClick={() => {
                setZoom(1);
                setFitMode((m) => (m === 'page' ? 'width' : 'page'));
              }}
              style={{
                background: fitMode === 'width' ? '#334155' : 'transparent',
                border: 'none',
                color: '#cbd5e1',
                padding: '3px 6px',
                fontSize: '10.5px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Toggle Fit to Width"
            >
              {fitMode === 'width' ? 'Fit Page' : 'Fit Width'}
            </button>
          </div>

          {/* AI Split Panel Toggle */}
          <button
            id="workspace-ai-toggle"
            data-testid="workspace-ai-toggle"
            type="button"
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isAiPanelOpen ? '#2563eb' : '#1e293b',
              border: `1px solid ${isAiPanelOpen ? '#3b82f6' : '#334155'}`,
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Toggle Split-Screen AI Assistant"
          >
            <Sparkles size={14} />
            <span>AI Assistant</span>
          </button>

          {/* Download Original */}
          <button
            id="workspace-download"
            data-testid="workspace-download"
            type="button"
            onClick={handleDownload}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Download Document"
          >
            <Download size={15} />
          </button>

          {/* Close Workspace */}
          <button
            id="workspace-close"
            data-testid="workspace-close"
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close Workspace (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTENT: DOCUMENT CANVAS + COLLAPSIBLE AI PANEL ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* LEFT / CENTER: PRIMARY DOCUMENT WORKSPACE CANVAS */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#090d16',
            minWidth: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Sub-toolbar: Search within Document */}
          <div
            style={{
              padding: '8px 18px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#0f172a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  width: '220px',
                }}
              >
                <Search size={13} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', background: 'transparent', color: '#f8fafc' }}
                />
              </div>
              {searchQuery && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Filter active
                </span>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Viewing Page <strong style={{ color: '#f8fafc' }}>{currentPage}</strong> of <strong style={{ color: '#f8fafc' }}>{totalPages}</strong>
            </div>
          </div>

          {/* Central Reading Canvas */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px 24px 80px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#0b1120',
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #334155',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                    margin: '0 auto 16px auto',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading document pages & structure...</span>
              </div>
            ) : activeTab === 'preview' ? (
              isAudio && (doc?.url || fileData?.url || fileData?.dataUrl) ? (
                <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', color: '#f8fafc' }}>
                  <audio controls src={doc?.url || fileData?.url || fileData?.dataUrl} style={{ width: '100%', marginBottom: '20px' }} />
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#38bdf8' }}>Audio Intelligence & Transcription</h4>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', lineHeight: '1.7', fontSize: '13.5px' }}>
                    {pageText || 'Audio uploaded. Ask the AI assistant on the right to summarize or inspect.'}
                  </div>
                </div>
              ) : isVideo && (doc?.url || fileData?.url || fileData?.dataUrl) ? (
                <div style={{ width: '100%', maxWidth: '880px', backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                  <video controls src={doc?.url || fileData?.url || fileData?.dataUrl} style={{ width: '100%', maxHeight: '480px', borderRadius: '8px', background: '#000' }} />
                </div>
              ) : isCodeOrData ? (
                <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: '#0f172a', borderRadius: '12px', padding: '24px', border: '1px solid #334155', color: '#f8fafc', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(pageText)}
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Copy Code
                  </button>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.7', color: '#38bdf8', overflowX: 'auto' }}>
                    <code>{highlightMatches(pageText)}</code>
                  </pre>
                </div>
              ) : isSpreadsheet && tables.length > 0 ? (
                <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {tables.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <div style={{ padding: '12px 18px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                          {t.name || `Sheet ${idx + 1}`}
                        </span>
                        <span style={{ fontSize: '11px', color: '#047857' }}>
                          {t.rows?.length || 0} rows displayed
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                              <th style={{ padding: '8px 12px', color: '#64748b', fontSize: '11px', textAlign: 'center', width: '40px' }}>#</th>
                              {t.headers?.map((h, hi) => (
                                <th key={hi} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 650, color: '#334155', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {t.rows?.map((row, ri) => (
                              <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: ri % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '10.5px' }}>{ri + 1}</td>
                                {row.map((cell, ci) => (
                                  <td key={ci} style={{ padding: '6px 14px', color: '#1e293b', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Standard Document Paper Sheet Canvas (PDF / Word / TXT) */
                <div
                  className="document-paper-sheet"
                  style={{
                    width: fitMode === 'width' ? '96%' : '100%',
                    maxWidth: fitMode === 'width' ? '1180px' : '840px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
                    padding: '48px 56px',
                    minHeight: '750px',
                    color: '#0f172a',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Page Top Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '12px',
                      marginBottom: '28px',
                      fontSize: '11px',
                      color: '#94a3b8',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>{fileName}</span>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>

                  {/* Document Page Content with crisp readable typography */}
                  <div
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.8',
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'system-ui, -apple-system, Georgia, serif',
                    }}
                  >
                    {highlightMatches(pageText)}
                  </div>
                </div>
              )
            ) : activeTab === 'sections' ? (
              <div style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sections.map((s, idx) => (
                  <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1rem' }}>{s.title}</h4>
                    <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                      {highlightMatches(s.content)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {tables.map((t, idx) => (
                  <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>{t.name || `Table ${idx + 1}`}</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          {t.headers?.map((h, hi) => (
                            <th key={hi} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.rows?.map((row, ri) => (
                          <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '8px 12px' }}>{String(cell)}</td>
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

          {/* ── FLOATING MODERN PAGE CONTROLLER ──────────────────────────── */}
          {activeTab === 'preview' && totalPages > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '30px',
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#ffffff',
                boxShadow: '0 8px 28px rgba(0, 0, 0, 0.45)',
                zIndex: 10,
              }}
            >
              <button
                id="workspace-prev-page"
                data-testid="workspace-prev-page"
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentPage <= 1 ? '#475569' : '#ffffff',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft size={18} />
              </button>

              <span style={{ fontSize: '12.5px', fontWeight: 600, minWidth: '96px', textAlign: 'center' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                id="workspace-next-page"
                data-testid="workspace-next-page"
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentPage >= totalPages ? '#475569' : '#ffffff',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title="Next Page (Right Arrow)"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: COLLAPSIBLE SPLIT-SCREEN AI DOCUMENT ASSISTANT ──────── */}
        {isAiPanelOpen && (
          <div
            style={{
              width: '380px',
              borderLeft: '1px solid #1e293b',
              backgroundColor: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Assistant Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#0f172a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#38bdf8" />
                <span style={{ fontSize: '13px', fontWeight: 650, color: '#f8fafc' }}>
                  AI Document Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                title="Collapse AI panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Analysis Mode Action Chips */}
            {documentId && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Summarize', mode: 'summary' },
                  { label: 'Key Risks', mode: 'risks' },
                  { label: 'Financials', mode: 'financial' },
                  { label: 'Action Items', mode: 'action-items' },
                ].map((chip) => (
                  <button
                    key={chip.mode}
                    type="button"
                    disabled={analyzingMode !== null}
                    onClick={() => handleRunAnalysisMode(chip.mode)}
                    style={{
                      border: '1px solid #334155',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 500,
                      backgroundColor: analyzingMode === chip.mode ? '#2563eb' : '#1e293b',
                      color: analyzingMode === chip.mode ? '#ffffff' : '#cbd5e1',
                      cursor: analyzingMode !== null ? 'wait' : 'pointer',
                    }}
                  >
                    {analyzingMode === chip.mode ? 'Analyzing...' : chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* AI Q&A Conversation Stream */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {aiAnswers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  <Sparkles size={28} color="#38bdf8" style={{ margin: '0 auto 10px auto', opacity: 0.6 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
                    Ask anything about this document
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
                    Answers include grounded citations to pages, sections, or tables.
                  </div>
                </div>
              ) : (
                aiAnswers.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: item.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : '#1e293b',
                      border: `1px solid ${item.type === 'error' ? '#ef4444' : '#334155'}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      fontSize: '12.5px',
                      lineHeight: '1.6',
                      color: '#f8fafc',
                    }}
                  >
                    {item.question && (
                      <div style={{ fontWeight: 650, color: '#38bdf8', marginBottom: '6px' }}>
                        Q: {item.question}
                      </div>
                    )}
                    {item.title && (
                      <div style={{ fontWeight: 650, color: '#a78bfa', marginBottom: '4px', fontSize: '12px' }}>
                        {item.title}
                      </div>
                    )}
                    <div style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown>
                    </div>

                    {/* Grounded Citation Chips */}
                    {item.citations && item.citations.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {item.citations.map((c, ci) => (
                          <button
                            key={ci}
                            type="button"
                            onClick={() => {
                              if (c.page) setCurrentPage(c.page);
                            }}
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #3b82f6',
                              color: '#60a5fa',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Jump to cited page"
                          >
                            Page {c.page || 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Question Composer */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  placeholder="Ask a question about this file..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    color: '#f8fafc',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  style={{
                    backgroundColor: asking || !question.trim() ? '#334155' : '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: '#ffffff',
                    cursor: asking || !question.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
