import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Code,
  Plus,
  Search,
  MessageSquare,
  Pencil,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  BookOpen,
  Terminal,
  FileText,
  Briefcase,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// Built-in curated prompt personas that users can clone or immediately try
const CURATED_TEMPLATES = [
  {
    id: 'curated-senior-reviewer',
    name: 'Senior Code Reviewer',
    category: 'Coding',
    description: 'Thorough, senior-level code reviews focusing on architecture, edge cases, security, and performance.',
    systemPrompt: `You are an elite Senior Staff Software Engineer and Security Architect.
When reviewing or writing code:
1. Identify race conditions, memory leaks, and performance bottlenecks.
2. Flag potential security vulnerabilities (SQLi, XSS, SSRF, IDOR, improper auth).
3. Recommend idiomatic patterns, strict typing, and clean error handling.
4. Provide concrete diffs with rationale before and after each suggestion.
5. Keep explanations dense, technically precise, and actionable.`,
  },
  {
    id: 'curated-executive-summary',
    name: 'Executive Briefing & Strategy',
    category: 'Business',
    description: 'Distills complex technical, financial, and operational reports into crisp C-suite memos with ROI impact.',
    systemPrompt: `You are a Chief of Staff and Strategic Advisor to Fortune 500 CEOs.
Structure every analysis as an Executive Brief:
- **Bottom Line Up Front (BLUF)**: The single core takeaway in 2 sentences.
- **Key Findings**: 3-4 high-impact data points or risk factors.
- **Strategic Implications**: Near-term and long-term business/financial tradeoffs.
- **Actionable Recommendations**: Clear, prioritized decision items with owners and timelines.
Avoid fluff, buzzwords, or passive voice.`,
  },
  {
    id: 'curated-api-architect',
    name: 'API & Microservices Architect',
    category: 'Coding',
    description: 'Designs resilient REST, gRPC, and event-driven architectures with idempotent endpoints and schema models.',
    systemPrompt: `You are a Principal Cloud & Systems Architect specializing in distributed systems.
When asked to design APIs or systems:
1. Define strict RESTful contracts with idempotent request semantics.
2. Specify request/response JSON schemas with validation rules.
3. Address distributed failure modes: circuit breakers, retries, dead-letter queues, and rate-limiting.
4. Include database index recommendations and tenant isolation boundaries.
5. Use ASCII or Mermaid diagrams where appropriate.`,
  },
  {
    id: 'curated-sql-optimizer',
    name: 'Database DBA & SQL Optimizer',
    category: 'Analysis',
    description: 'Deep Postgres & distributed SQL tuning: index design, execution plans, vacuuming, and lock prevention.',
    systemPrompt: `You are a Senior PostgreSQL Database Administrator and Query Optimization specialist.
For any database task:
1. Analyze EXPLAIN (ANALYZE, BUFFERS) plans for sequential scans and nested loops.
2. Recommend composite, partial, and covering indexes with operational tradeoffs.
3. Optimize queries using CTEs, window functions, and bulk operation patterns.
4. Guard against table-level locks, connection pool exhaustion, and transaction bloat.
5. Provide the optimized SQL statements alongside execution cost comparisons.`,
  },
  {
    id: 'curated-tech-writer',
    name: 'Technical Documentation Lead',
    category: 'Writing',
    description: 'Transforms complex codebases and APIs into clear, engaging developer documentation and tutorials.',
    systemPrompt: `You are a Lead Developer Advocate and Technical Writer.
When authoring documentation:
1. Write with clarity, precision, and empathy for developers of varying seniority.
2. Structure guides with: Prerequisites, Quickstart, Detailed Walkthrough, and Troubleshooting.
3. Ensure every code block has copyable, working syntax with real-world variable names.
4. Use callout alerts ([!NOTE], [!TIP], [!IMPORTANT]) strategically.
5. Follow GitHub Flavored Markdown standards.`,
  },
  {
    id: 'curated-legal-auditor',
    name: 'Contract & Compliance Auditor',
    category: 'Business',
    description: 'Scans agreements for liability caps, indemnification traps, termination clauses, and DPDP/GDPR alignment.',
    systemPrompt: `You are a Corporate Legal Counsel specializing in Enterprise SaaS, Data Privacy, and Commercial Contracts.
When auditing documents:
1. Flag unilateral termination rights, uncapped indemnities, and governing law risks.
2. Identify data ownership ambiguities, sub-processor disclosures, and confidentiality terms.
3. Cross-reference privacy commitments against India DPDP Act 2023 and GDPR mandates.
4. Summarize findings in a Red/Amber/Green risk matrix with proposed clause revisions.
Note: Always clarify that this analysis is for informational and workflow preparation purposes.`,
  },
];

const CATEGORIES = ['All', 'Coding', 'Writing', 'Business', 'Analysis'];

export default function PromptLibrarySettings({ onClose }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('my-prompts'); // 'my-prompts' | 'curated'
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formCategory, setFormCategory] = useState('Coding');
  const [saving, setSaving] = useState(false);

  // Deletion modal state
  const [presetToDelete, setPresetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded prompt preview tracking
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/presets`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res && res.ok) {
        const data = await res.json();
        setPresets(Array.isArray(data) ? data : []);
      } else {
        setPresets([]);
      }
    } catch (err) {
      console.error('Failed to fetch prompt presets:', err);
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = (prefill = null) => {
    setModalMode('create');
    setEditingId(null);
    if (prefill) {
      setFormName(prefill.name ? `${prefill.name} (Copy)` : '');
      setFormDescription(prefill.description || '');
      setFormSystemPrompt(prefill.systemPrompt || '');
      setFormCategory(prefill.category || 'Coding');
    } else {
      setFormName('');
      setFormDescription('');
      setFormSystemPrompt('');
      setFormCategory('Coding');
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (preset) => {
    setModalMode('edit');
    setEditingId(preset.id);
    setFormName(preset.name || '');
    setFormDescription(preset.description || '');
    setFormSystemPrompt(preset.systemPrompt || '');
    setFormCategory(preset.category || 'Coding');
    setIsModalOpen(true);
  };

  const handleSavePreset = async (e) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formSystemPrompt.trim()) {
      setError('Name and System Prompt are required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();

      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        systemPrompt: formSystemPrompt.trim(),
      };

      let res;
      if (modalMode === 'create') {
        res = await authenticatedFetch(`${apiBase}/api/v1/user/presets`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authenticatedFetch(`${apiBase}/api/v1/user/presets/${editingId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (res && res.ok) {
        const updatedList = await res.json();
        setPresets(Array.isArray(updatedList) ? updatedList : []);
        setIsModalOpen(false);
        setActiveTab('my-prompts');
        // Notify any open chat sessions to refresh their presets list
        window.dispatchEvent(new Event('storage'));
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save preset.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!presetToDelete) return;
    try {
      setDeleting(true);
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/presets/${presetToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res && res.ok) {
        const updatedList = await res.json();
        setPresets(Array.isArray(updatedList) ? updatedList : []);
        setPresetToDelete(null);
        window.dispatchEvent(new Event('storage'));
      } else {
        setError('Failed to delete preset.');
      }
    } catch (err) {
      console.error(err);
      setError('Error deleting preset.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUseInChat = (presetId) => {
    if (onClose) onClose();
    router.push(`/chat?preset=custom_${presetId}`);
  };

  const handleCopyPrompt = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered list based on search and category
  const filteredMyPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.systemPrompt?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [presets, searchQuery]);

  const filteredCurated = useMemo(() => {
    return CURATED_TEMPLATES.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.systemPrompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          gap: '12px',
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent, #3b82f6)' }} />
        <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #64748b)' }}>
          Loading Prompt Library...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="settings-header-group" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 className="settings-main-title" style={{ margin: '0 0 6px 0' }}>
              Prompt Library
            </h1>
            <p className="settings-main-subtitle">
              Create, organize, and manage custom system prompt personas and reusable AI templates.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => handleOpenCreateModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            <span>Create Prompt</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '13.5px',
            marginBottom: '18px',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Tabs & Search Bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '2px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('my-prompts')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: 'none',
                fontSize: '13.5px',
                fontWeight: activeTab === 'my-prompts' ? 600 : 500,
                color: activeTab === 'my-prompts' ? '#2563eb' : '#64748b',
                borderBottom: activeTab === 'my-prompts' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <BookOpen size={14} />
              <span>My Prompts</span>
              <span
                style={{
                  fontSize: '11px',
                  background: activeTab === 'my-prompts' ? '#eff6ff' : '#f1f5f9',
                  color: activeTab === 'my-prompts' ? '#2563eb' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                {presets.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('curated')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: 'none',
                fontSize: '13.5px',
                fontWeight: activeTab === 'curated' ? 600 : 500,
                color: activeTab === 'curated' ? '#2563eb' : '#64748b',
                borderBottom: activeTab === 'curated' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} />
              <span>Curated Templates</span>
              <span
                style={{
                  fontSize: '11px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                {CURATED_TEMPLATES.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '300px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 30px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Category Pills (Active on Curated Tab) */}
        {activeTab === 'curated' && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: selectedCategory === cat ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  background: selectedCategory === cat ? '#eff6ff' : '#ffffff',
                  color: selectedCategory === cat ? '#1d4ed8' : '#64748b',
                  fontSize: '12px',
                  fontWeight: selectedCategory === cat ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: My Custom Prompts ── */}
      {activeTab === 'my-prompts' && (
        <div>
          {filteredMyPresets.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: '#fafafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Code size={20} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>
                {searchQuery ? 'No prompts match your search' : 'No Custom Prompts Yet'}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  maxWidth: '440px',
                  margin: '0 auto 18px',
                  lineHeight: '1.5',
                }}
              >
                {searchQuery
                  ? 'Try searching for another keyword or clear the search field.'
                  : 'Create your own reusable system prompt persona, or clone one of the curated templates to get started.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleOpenCreateModal()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={14} /> Create Prompt
                </button>
                <button
                  onClick={() => setActiveTab('curated')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} /> Browse Templates
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMyPresets.map((preset) => {
                const isExpanded = expandedId === preset.id;
                return (
                  <div
                    key={preset.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                            {preset.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#eff6ff',
                              color: '#2563eb',
                              padding: '2px 7px',
                              borderRadius: '4px',
                            }}
                          >
                            Custom Persona
                          </span>
                        </div>
                        {preset.description && (
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                            {preset.description}
                          </p>
                        )}
                      </div>

                      {/* Top Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleUseInChat(preset.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Start conversation using this persona"
                        >
                          <MessageSquare size={13} />
                          <span>Use in Chat</span>
                        </button>

                        <button
                          onClick={() => handleOpenCreateModal(preset)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Duplicate prompt"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(preset)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Edit prompt"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          onClick={() => setPresetToDelete(preset)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete prompt"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* System Prompt Code Box */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '12px',
                        color: '#334155',
                        lineHeight: '1.5',
                        position: 'relative',
                        maxHeight: isExpanded ? 'none' : '64px',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {preset.systemPrompt}
                    </div>

                    {/* Footer / Expander */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#94a3b8',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: 0,
                          fontWeight: 500,
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <span>Collapse</span> <ChevronUp size={13} />
                          </>
                        ) : (
                          <>
                            <span>View Full Prompt</span> <ChevronDown size={13} />
                          </>
                        )}
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(preset.systemPrompt, preset.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedId === preset.id ? '#059669' : '#64748b',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          {copiedId === preset.id ? (
                            <>
                              <Check size={12} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy prompt
                            </>
                          )}
                        </button>
                        <span>&middot;</span>
                        <span>
                          {preset.createdAt ? new Date(preset.createdAt).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Curated Templates Gallery ── */}
      {activeTab === 'curated' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filteredCurated.map((template) => (
            <div
              key={template.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '2px 7px',
                      borderRadius: '4px',
                    }}
                  >
                    {template.category}
                  </span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>
                  {template.name}
                </h4>
                <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.45', margin: '0 0 12px 0' }}>
                  {template.description}
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '7px',
                    padding: '8px 10px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11.5px',
                    color: '#475569',
                    maxHeight: '70px',
                    overflow: 'hidden',
                    lineHeight: '1.4',
                    marginBottom: '14px',
                  }}
                >
                  {template.systemPrompt}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleOpenCreateModal(template)}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} />
                  <span>Clone to My Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyPrompt(template.systemPrompt, template.id)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '7px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: copiedId === template.id ? '#059669' : '#475569',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Copy prompt text"
                >
                  {copiedId === template.id ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Create / Edit Prompt ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Code size={16} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {modalMode === 'create' ? 'Create Custom Prompt' : 'Edit Prompt Preset'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePreset}>
              {/* Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Prompt Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Go Architect, Executive Memo Writer"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="Brief note describing when to use this persona..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* System Prompt */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    System Instructions *
                  </label>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    {formSystemPrompt.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder={`Define the AI persona, rules, and tone. For example:\nYou are an expert React engineer. Always prefer server components, clean custom hooks, and functional composition...`}
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Tip: These instructions are injected as the system persona whenever this preset is selected in chat.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving...
                    </>
                  ) : modalMode === 'create' ? (
                    'Create Prompt'
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Confirmation ── */}
      {presetToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setPresetToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Delete Prompt Preset
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{presetToDelete.name}</strong>? It will no longer appear in your chat persona dropdown.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPresetToDelete(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  'Delete Preset'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
