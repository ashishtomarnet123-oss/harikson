import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/* ────────────────────────────────────────────────────────────
   Markdown renderer — converts plain text/markdown to JSX
   without external deps (Next.js 14 Pages Router, no Tailwind)
──────────────────────────────────────────────────────────── */
function CodeBlock({ language, code, onOpenArtifact }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <div className="artifact-actions">
          {onOpenArtifact && (
            <button onClick={() => onOpenArtifact({ language, code })} title="Open in Canvas">⛶ Canvas</button>
          )}
          <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
            {copied ? '✓ Copied' : '⧉ Copy'}
          </button>
        </div>
      </div>
      <pre><code className="block-code">{code}</code></pre>
    </div>
  );
}

function renderMarkdown(text, onOpenArtifact) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<CodeBlock key={i} language={lang} code={codeLines.join('\n')} onOpenArtifact={onOpenArtifact} />);
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { elements.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('## '))  { elements.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('# '))   { elements.push(<h1 key={i}>{renderInline(line.slice(2))}</h1>); i++; continue; }

    // Unordered list
    if (line.match(/^[\*\-] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\*\-] /)) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />); i++; continue; }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Paragraph
    elements.push(<p key={i}>{renderInline(line)}</p>);
    i++;
  }
  return elements;
}

function renderInline(text) {
  // Process inline code, bold, italic
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}


const SLASH_COMMANDS = [
  { id: 'code', icon: '</>', title: 'Write Code', desc: 'Generate a code snippet or component', prompt: 'Write the code for a ' },
  { id: 'summarize', icon: '📝', title: 'Summarize', desc: 'Summarize text or meeting notes', prompt: 'Summarize the following: \n' },
  { id: 'debug', icon: '🐛', title: 'Debug', desc: 'Find bugs in my code', prompt: 'Debug this code and explain the fixes: \n' },
  { id: 'explain', icon: '🧠', title: 'Explain', desc: 'Explain a complex concept simply', prompt: 'Explain this concept to me as if I were a beginner: ' },
];

/* ────────────────────────────────────────────────────────────
   Main Chat Page
──────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const router = useRouter();

  // Auth & config
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [apiBase, setApiBase] = useState('http://localhost:3008');
  const [tenantSlug, setTenantSlug] = useState('system');

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Messages
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState(null);
  const [model, setModel] = useState('harikson-plus');
  const [systemPreset, setSystemPreset] = useState('general');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [pinnedChats, setPinnedChats] = useState([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useDeepSearch, setUseDeepSearch] = useState(false);
  const [useReasoning, setUseReasoning] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const savedPins = JSON.parse(localStorage.getItem('hk_pinned_chats') || '[]');
    setPinnedChats(savedPins);
  }, []);

  const togglePin = (e, id) => {
    e.stopPropagation();
    let newPins;
    if (pinnedChats.includes(id)) {
      newPins = pinnedChats.filter(p => p !== id);
    } else {
      newPins = [...pinnedChats, id];
    }
    setPinnedChats(newPins);
    localStorage.setItem('hk_pinned_chats', JSON.stringify(newPins));
  };

  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  /* ── Resolve config from localStorage on mount ── */
  useEffect(() => {
    const savedToken = localStorage.getItem('hk_token');
    if (!savedToken) { router.replace('/login'); return; }
    let savedUser = null;
    try {
      savedUser = JSON.parse(localStorage.getItem('hk_user') || 'null');
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      localStorage.removeItem('hk_token');
      localStorage.removeItem('hk_user');
      router.replace('/login');
      return;
    }
    const savedBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
    const savedTenant = localStorage.getItem('hk_tenant') || 'system';
    setToken(savedToken);
    setUser(savedUser);
    setApiBase(savedBase);
    setTenantSlug(savedTenant);
  }, [router]);

  /* ── Load conversations once token is ready ── */
  useEffect(() => {
    if (token) fetchConversations();
  }, [token]);

  /* ── Load shared conversation link if present on mount ── */
  useEffect(() => {
    if (token && router.isReady) {
      const urlConvId = router.query.conversation;
      if (urlConvId && urlConvId !== activeConvId) {
        loadConversation(urlConvId);
      }
    }
  }, [token, router.isReady, router.query.conversation, activeConvId]);

  /* ── Auto scroll on new messages ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Auto resize textarea ── */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [inputText]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-tenant-slug': tenantSlug,
  }), [token, tenantSlug]);

  /* ── Fetch conversation list ── */
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${apiBase}/api/conversations`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  /* ── Load messages for a conversation ── */
  const loadConversation = async (convId) => {
    setActiveConvId(convId);
    setError(null);
    setMessages([]);
    router.replace(`/chat?conversation=${convId}`, undefined, { shallow: true });
    try {
      const res = await fetch(`${apiBase}/api/conversations/${convId}/messages`, { headers: authHeaders() });
      const data = await res.json();
      const loaded = (data.messages || []).map((m) => ({
        id: m.id,
        sender: m.role === 'user' ? 'user' : 'bot',
        text: m.content,
        role: m.role,
      }));
      setMessages(loaded);
    } catch (err) {
      setError('Failed to load conversation messages.');
    }
  };

  /* ── New chat ── */
  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setError(null);
    setInputText('');
    router.replace(`/chat`, undefined, { shallow: true });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFiles(prev => [
          ...prev, 
          { name: file.name, content: event.target.result || '' }
        ]);
      };
      reader.readAsText(file);
    });
  };

  const removeAttachedFile = (idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSuggestionClick = (suggestionText) => {
    setInputText(suggestionText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleShareChat = () => {
    if (!activeConvId) {
      setToast('Please start a conversation first to share.');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const shareUrl = `${window.location.origin}/chat?conversation=${activeConvId}`;
    
    const fallbackCopy = (text) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setToast('Share link copied to clipboard!');
        } else {
          setToast('Failed to copy share link.');
        }
      } catch (err) {
        console.error('Fallback copy failed', err);
        setToast('Failed to copy share link.');
      }
      document.body.removeChild(textArea);
      setTimeout(() => setToast(null), 2500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setToast('Share link copied to clipboard!');
        setTimeout(() => setToast(null), 2500);
      }).catch(err => {
        console.error('Clipboard write failed, using fallback:', err);
        fallbackCopy(shareUrl);
      });
    } else {
      fallbackCopy(shareUrl);
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFiles(prev => [
          ...prev, 
          { name: file.name, content: event.target.result || '' }
        ]);
      };
      reader.readAsText(file);
    });
  };

  const stopGeneration = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  /* ── Send message ── */
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText('');
    setError(null);
    setLoading(true);
    
    // Determine loading status based on toggles and URLs
    if (useDeepSearch) {
      setLoadingStatus('🌐 Searching the web...');
    } else if (userText.match(/(https?:\/\/[^\s]+)/g)) {
      setLoadingStatus('🕷️ Crawling websites...');
    } else {
      setLoadingStatus('');
    }

    // Optimistically add user message
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    // Map system prompts presets
    const presets = {
      coder: "You are a senior developer. Write code in clean, modular blocks with TypeScript typings and proper error catches. Brand everything as 'Harikson'. Do not expose any open-source model names.",
      reviewer: "You are a code auditor. Find logic flows, edge cases, and performance leaks in the code. Brand everything as 'Harikson'.",
      dba: "You are a senior Postgres DBA. Focus on database schemas, transaction locks, and query index performance. Brand everything as 'Harikson'.",
      general: "You are a helpful, privacy-first enterprise AI assistant branded as 'Harikson'."
    };

    // Build client-side history to send to backend (ChatGPT approach — no DB race condition)
    const clientHistory = [
      { role: 'system', content: presets[systemPreset] || presets.general },
      ...messages
        .filter(m => m.text && m.text.trim())
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
    ];

    // Handle document/file attachment injection
    let finalMessage = userText;
    if (attachedFiles.length > 0) {
      const attachments = attachedFiles.map(f => `<uploaded_file name="${f.name}">\n${f.content}\n</uploaded_file>`).join('\n\n');
      finalMessage = `${attachments}\n\n${userText}`;
    }
    setAttachedFiles([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          message: finalMessage,
          model,
          conversationId: activeConvId,
          clientHistory, // ← send full conversation history from client
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      // Set conversation ID from response header
      const convId = res.headers.get('x-conversation-id') || res.headers.get('X-Conversation-Id');
      if (convId && !activeConvId) {
        setActiveConvId(convId);
        // Add to sidebar immediately
        setConversations((prev) => [
          { id: convId, title: userText.substring(0, 50), model, updated_at: new Date().toISOString() },
          ...prev.filter((c) => c.id !== convId),
        ]);
      }

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      setMessages((prev) => [...prev, { sender: 'bot', text: '' }]);

      let fullText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.sender === 'bot') {
            updated[updated.length - 1] = { ...last, text: fullText };
          }
          return updated;
        });
      }

      // Refresh conversation list
      fetchConversations();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        return;
      }
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((m) => !(m.sender === 'bot' && m.text === '')));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  /* ── Delete conversation ── */
  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await fetch(`${apiBase}/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) startNewChat();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  /* ── Rename conversation ── */
  const startRename = (conv, e) => {
    e.stopPropagation();
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };
  const commitRename = async (convId) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await fetch(`${apiBase}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, title: renameValue.trim() } : c)
      );
    } catch (err) {
      console.error('Rename failed', err);
    }
    setRenamingId(null);
  };

  /* ── Logout ── */
  const handleLogout = () => {
    localStorage.removeItem('hk_token');
    localStorage.removeItem('hk_user');
    localStorage.removeItem('hk_tenant');
    localStorage.removeItem('hk_api_base');
    router.replace('/login');
  };

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(prev => (prev + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(prev => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        applySlashCommand(SLASH_COMMANDS[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    
    if (val === '/' || val.endsWith(' /')) {
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else if (showSlashMenu && !val.includes('/')) {
      setShowSlashMenu(false);
    }
  };

  const applySlashCommand = (cmd) => {
    const parts = inputText.split('/');
    parts.pop(); 
    setInputText(parts.join('/') + cmd.prompt);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

  if (!token) return null; // Wait for mount

  return (
    <>
      <Head>
        <title>Harikson AI — Chat</title>
        <meta name="description" content="Harikson AI Chat Interface" />
      </Head>

      <div 
        className="chat-root"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ─── Sidebar ─────────────────────────────────────── */}
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-header">
            <div className="sidebar-logo-icon">⚡</div>
            <div className="sidebar-logo-text">Harikson AI</div>
          </div>

          {/* New Chat */}
          <button className="new-chat-btn" onClick={startNewChat}>
            <span>＋</span>
            <span>New conversation</span>
          </button>

          {/* Conversation List */}
          <div className="conv-list">
            {conversations.length === 0 && (
              <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No conversations yet. Start chatting!
              </div>
            )}
            {conversations.length > 0 && (
              <div className="conv-section-label">Recent</div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item${activeConvId === conv.id ? ' active' : ''}`}
                onClick={() => loadConversation(conv.id)}
              >
                {renamingId === conv.id ? (
                  <input
                    className="conv-rename-input"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(conv.id);
                      if (e.key === 'Escape') setRenamingId(null);
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="conv-title">{conv.title || 'Untitled'}</span>
                )}
                <div className="conv-actions">
                  <button
                    className="conv-action-btn"
                    title="Rename"
                    onClick={(e) => startRename(conv, e)}
                  >✎</button>
                  <button
                    className="conv-action-btn danger"
                    title="Delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* User Info / Logout */}
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">{userInitial}</div>
              <span className="user-email">{user?.email || 'User'}</span>
              <button className="logout-btn" onClick={handleLogout} title="Sign out">⎋</button>
            </div>
          </div>
        </aside>

        {/* ─── Main area ───────────────────────────────────── */}
        <div className="workspace">
        <main className={`main-area ${activeArtifact ? 'with-artifact' : ''}`}>
          {/* Top bar */}
          <div className="topbar">
            <span className="topbar-title">
              {activeConvId
                ? conversations.find((c) => c.id === activeConvId)?.title || 'Conversation'
                : 'New Conversation'}
            </span>
            <div className="topbar-actions">
              <button className="share-btn" onClick={handleShareChat} title="Share conversation link">
                <span>🔗</span> Share
              </button>
              <select
                className="model-select"
                value={systemPreset}
                onChange={(e) => setSystemPreset(e.target.value)}
              >
                <option value="general">General Agent</option>
                <option value="coder">Senior Coder</option>
                <option value="reviewer">Code Reviewer</option>
                <option value="dba">Database DBA</option>
              </select>
              <select
                className="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="harikson-plus">Harikson Plus · 8B</option>
                <option value="harikson-max">Harikson Max · 14B</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-area">
            {messages.length === 0 && !loading && (
              <div className="messages-empty">
                <div className="messages-empty-icon">⚡</div>
                <h2>Harikson AI</h2>
                <p>Your enterprise AI coding assistant. Ask anything about your codebase, architecture, or software.</p>
                
                <div className="prompt-suggestions-grid">
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Create a private LLM deployment template with Harikson.")}>
                    <div className="suggestion-icon">🚀</div>
                    <div className="suggestion-text">
                      <strong>Deploy Private LLM</strong>
                      <span>Create a sovereign deployment template</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Auditing my code for DPDP compliance rules.")}>
                    <div className="suggestion-icon">🛡️</div>
                    <div className="suggestion-text">
                      <strong>DPDP Audit</strong>
                      <span>Check code compliance on Indian soil</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Optimize this query for active tenant indexes.")}>
                    <div className="suggestion-icon">⚡</div>
                    <div className="suggestion-text">
                      <strong>Optimize SQL Index</strong>
                      <span>DBA schema indexing assistant</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Write a robust RAG data pipeline configuration.")}>
                    <div className="suggestion-icon">📂</div>
                    <div className="suggestion-text">
                      <strong>RAG Data Pipeline</strong>
                      <span>Inject documents for vector search</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) =>
              msg.sender === 'user' ? (
                <div key={idx} className="message-row user">
                  <div className="message-bubble-user">{msg.text}</div>
                </div>
              ) : (
                <div key={idx} className="message-row assistant">
                  <div className="message-bubble-assistant">
                    <div className="assistant-avatar">⚡</div>
                    <div className="assistant-content">
                      {renderMarkdown(msg.text, setActiveArtifact)}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Thinking indicator */}
            {loading && (
              <div className="thinking-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="thinking-avatar">⚡</div>
                <div className="thinking-dots">
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                </div>
                {loadingStatus && (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {loadingStatus}
                  </span>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="error-banner">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="input-bar">
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', padding: '0 20px' }}>
                {attachedFiles.map((file, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(79, 140, 255, 0.08)',
                    border: '1px solid rgba(79, 140, 255, 0.2)',
                    color: 'var(--accent)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    <span>📄 {file.name}</span>
                    <button type="button" onClick={() => removeAttachedFile(i)} style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '0 2px'
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={sendMessage}>
              <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <button 
                  type="button" 
                  className={`mic-btn ${isRecording ? 'mic-pulsing' : ''}`} 
                  onClick={toggleRecording}
                  title={isRecording ? 'Stop recording' : 'Dictate with voice'}
                >
                  🎤
                </button>
                {showSlashMenu && (
                  <div className="slash-command-popup">
                    {SLASH_COMMANDS.map((cmd, idx) => (
                      <div 
                        key={cmd.id} 
                        className={`slash-command-item ${idx === slashIndex ? 'selected' : ''}`}
                        onClick={() => applySlashCommand(cmd)}
                        onMouseEnter={() => setSlashIndex(idx)}
                      >
                        <div className="slash-command-icon">{cmd.icon}</div>
                        <div className="slash-command-details">
                          <span className="slash-command-title">{cmd.title}</span>
                          <span className="slash-command-desc">{cmd.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  id="file-upload"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload" style={{
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  marginRight: '6px'
                }} title="Attach Files">
                  📎
                </label>
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Harikson…"
                  disabled={loading}
                />
                 {loading ? (
                  <button
                    type="button"
                    className="send-btn stop-btn"
                    onClick={stopGeneration}
                    title="Stop generation"
                  >
                    ■
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={!inputText.trim() && attachedFiles.length === 0}
                    title="Send (Enter)"
                  >
                    ↑
                  </button>
                )}
              </div>
              <div className="compute-toggles-row">
                <button type="button" className={`compute-toggle ${useDeepSearch ? 'active' : ''}`} onClick={() => setUseDeepSearch(!useDeepSearch)}>
                  🌐 Deep Search
                </button>
                <button type="button" className={`compute-toggle ${useReasoning ? 'active' : ''}`} onClick={() => setUseReasoning(!useReasoning)}>
                  🧠 Reasoning
                </button>
              </div>
            </form>
            <p className="input-hint">Press Enter to send · Shift+Enter for new line · Attach code files</p>
          </div>
        </main>
        
        {/* ─── Artifact Pane ───────────────────────────────────── */}
        {activeArtifact && (
          <aside className="artifact-pane">
            <div className="artifact-header">
              <div className="artifact-title">
                <span style={{color: '#ff7e67'}}>⛶</span> {activeArtifact.language === 'html' ? 'index.html' : 'snippet.' + (activeArtifact.language || 'txt')}
              </div>
              <div className="artifact-actions">
                <button onClick={() => { navigator.clipboard.writeText(activeArtifact.code); }}>⧉</button>
                <button onClick={() => setActiveArtifact(null)}>✕</button>
              </div>
            </div>
            
            {(activeArtifact.language === 'html' || activeArtifact.language === 'svg') ? (
              <div className="artifact-content">
                <iframe 
                  className="artifact-iframe" 
                  srcDoc={activeArtifact.code}
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="artifact-content">
                <div className="artifact-code">{activeArtifact.code}</div>
              </div>
            )}
          </aside>
        )}
      </div>

        {isDragging && (
          <div className="drag-drop-overlay">
            <div className="drag-drop-icon">📂</div>
            <span>Drop your files to attach to Harikson</span>
          </div>
        )}

        {toast && (
          <div className="toast-msg">{toast}</div>
        )}
      </div>
    </>
  );
}
