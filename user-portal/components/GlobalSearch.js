import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { authenticatedFetch, getApiConfig } from './settings/apiHelper';
import { Search, MessageSquare, Cpu, Workflow, FileText, X } from 'lucide-react';

export default function GlobalSearch({ isOpen, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { apiBase } = getApiConfig();
      const [convRes, agentRes, wfRes, docRes] = await Promise.allSettled([
        authenticatedFetch(`${apiBase}/api/v1/chat/conversations`),
        authenticatedFetch(`${apiBase}/api/agents`),
        authenticatedFetch(`${apiBase}/api/workflows`),
        authenticatedFetch(`${apiBase}/api/documents`),
      ]);

      const items = [];

      let localConvs = [];
      if (typeof window !== 'undefined') {
        try {
          localConvs = JSON.parse(localStorage.getItem('hk_recent_conversations') || '[]');
        } catch (_) {}
      }

      let serverConvs = [];
      if (convRes.status === 'fulfilled' && convRes.value?.ok) {
        const data = await convRes.value.json();
        serverConvs = Array.isArray(data) ? data : data.conversations || [];
      }

      const convMap = new Map();
      [...serverConvs, ...localConvs].forEach(c => {
        if (c && (c.id || c.title)) {
          const key = c.id || c.title;
          if (!convMap.has(key)) {
            convMap.set(key, c);
          }
        }
      });

      Array.from(convMap.values()).slice(0, 30).forEach(c => items.push({
        type: 'Conversation',
        name: c.title || 'Untitled',
        href: c.id ? `/chat?conversation=${c.id}` : '/chat',
        icon: MessageSquare,
      }));
      if (agentRes.status === 'fulfilled' && agentRes.value?.ok) {
        const data = await agentRes.value.json();
        (data.agents || []).forEach(a => items.push({
          type: 'Agent', name: a.name, href: '/agents', icon: Cpu,
        }));
      }
      if (wfRes.status === 'fulfilled' && wfRes.value?.ok) {
        const data = await wfRes.value.json();
        const wfs = Array.isArray(data) ? data : data.workflows || [];
        wfs.forEach(w => items.push({
          type: 'Workflow', name: w.name, href: '/workflows', icon: Workflow,
        }));
      }
      if (docRes.status === 'fulfilled' && docRes.value?.ok) {
        const data = await docRes.value.json();
        (data.documents || []).forEach(d => items.push({
          type: 'Document', name: d.filename, href: '/documents', icon: FileText,
        }));
      }

      setAllItems(items);
    } catch (err) {
      console.error('Search load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = query.trim()
    ? allItems.filter(item => item.name?.toLowerCase().includes(query.toLowerCase()))
    : allItems.slice(0, 10);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      onClose();
      router.push(filtered[selectedIndex].href);
    }
  }, [filtered, selectedIndex, onClose, router]);

  if (!isOpen) return null;

  const grouped = {};
  filtered.forEach(item => {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
  });

  let flatIndex = 0;

  return (
    <div
      onClick={onClose}
      className="global-search-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
        paddingLeft: '16px',
        paddingRight: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="global-search-dialog"
        style={{
          width: '560px',
          maxWidth: '100%',
          maxHeight: '480px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 48px -10px rgba(15, 23, 42, 0.18), 0 1px 3px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'inherit',
          animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Search input header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <Search size={18} color="#64748b" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations, agents, workflows, documents..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#0f172a',
              fontSize: '14.5px',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results list */}
        <div style={{ overflowY: 'auto', padding: '10px 12px', flex: 1 }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '36px 20px',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #e2e8f0',
                  borderTop: '2px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span>Loading items...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                color: '#64748b',
                fontSize: '13px',
                textAlign: 'center',
                padding: '36px 20px',
              }}
            >
              <p
                style={{
                  fontWeight: 600,
                  margin: '0 0 4px',
                  color: '#0f172a',
                }}
              >
                {query ? 'No matching results' : 'No items found'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                {query
                  ? `Try a different keyword than "${query}"`
                  : 'Start typing to search your workspace'}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} style={{ marginBottom: '10px' }}>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    padding: '4px 8px',
                    margin: '0 0 2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {type}s
                </p>
                {items.map((item) => {
                  const idx = flatIndex++;
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={`${item.type}-${item.name}-${idx}`}
                      onClick={() => {
                        onClose();
                        router.push(item.href);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '9px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        border: isSelected
                          ? '1px solid rgba(37, 99, 235, 0.2)'
                          : '1px solid transparent',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '7px',
                            background: isSelected ? '#dbeafe' : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <Icon
                            size={14}
                            color={isSelected ? '#2563eb' : '#64748b'}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '13.5px',
                            color: isSelected ? '#1d4ed8' : '#1e293b',
                            fontWeight: isSelected ? 600 : 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          color: isSelected ? '#2563eb' : '#94a3b8',
                          background: isSelected ? '#ffffff' : '#f8fafc',
                          border: '1px solid',
                          borderColor: isSelected
                            ? 'rgba(37, 99, 235, 0.2)'
                            : '#e2e8f0',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontWeight: 500,
                          flexShrink: 0,
                          marginLeft: '8px',
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            fontSize: '11.5px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd
                style={{
                  padding: '2px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
                  fontSize: '10.5px',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd
                style={{
                  padding: '2px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
                  fontSize: '10.5px',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                Enter
              </kbd>
              <span>Open</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd
                style={{
                  padding: '2px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
                  fontSize: '10.5px',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                Esc
              </kbd>
              <span>Close</span>
            </span>
          </div>

          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>
    </div>
  );
}
