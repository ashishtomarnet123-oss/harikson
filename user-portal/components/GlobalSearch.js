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

      if (convRes.status === 'fulfilled' && convRes.value?.ok) {
        const data = await convRes.value.json();
        const convs = Array.isArray(data) ? data : data.conversations || [];
        convs.slice(0, 20).forEach(c => items.push({
          type: 'Conversation', name: c.title || 'Untitled', href: '/chat', icon: MessageSquare,
        }));
      }
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
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '120px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px', maxHeight: '460px',
          backgroundColor: '#1f2937',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Search size={18} color="#6b7280" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations, agents, workflows, documents..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#f3f4f6', fontSize: '14px', fontFamily: 'inherit',
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflow: 'auto', padding: '8px' }}>
          {loading ? (
            <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              {query ? 'No results found' : 'No items loaded'}
            </p>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', padding: '4px 8px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {type}s
                </p>
                {items.map((item) => {
                  const idx = flatIndex++;
                  const Icon = item.icon;
                  return (
                    <div
                      key={`${item.type}-${item.name}-${idx}`}
                      onClick={() => { onClose(); router.push(item.href); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                        backgroundColor: idx === selectedIndex ? 'rgba(99,102,241,0.15)' : 'transparent',
                      }}
                    >
                      <Icon size={14} color="#9ca3af" />
                      <span style={{ fontSize: '13px', color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px', color: '#4b5563',
          display: 'flex', gap: '12px',
        }}>
          <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '10px' }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '10px' }}>Enter</kbd> Open</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '10px' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
