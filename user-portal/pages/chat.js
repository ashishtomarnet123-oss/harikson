import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/* ────────────────────────────────────────────────────────────
   Markdown renderer — converts plain text/markdown to JSX
   without external deps (Next.js 14 Pages Router, no Tailwind)
──────────────────────────────────────────────────────────── */
function CodeBlock({ language, code }) {
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
        <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
          {copied ? '✓ Copied' : '⧉ Copy'}
        </button>
      </div>
      <pre><code className="block-code">{code}</code></pre>
    </div>
  );
}

function renderMarkdown(text) {
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
      elements.push(<CodeBlock key={i} language={lang} code={codeLines.join('\n')} />);
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
  const [error, setError] = useState(null);
  const [model, setModel] = useState('harikson-plus');
  const [systemPreset, setSystemPreset] = useState('general');
  const [attachedFiles, setAttachedFiles] = useState([]);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  /* ── Resolve config from localStorage on mount ── */
  useEffect(() => {
    const savedToken = localStorage.getItem('hk_token');
    if (!savedToken) { router.replace('/login'); return; }
    const savedUser = JSON.parse(localStorage.getItem('hk_user') || 'null');
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

  /* ── Send message ── */
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText('');
    setError(null);
    setLoading(true);

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

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
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
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((m) => !(m.sender === 'bot' && m.text === '')));
    } finally {
      setLoading(false);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

  if (!token) return null; // Wait for mount

  return (
    <>
      <Head>
        <title>Harikson AI — Chat</title>
        <meta name="description" content="Harikson AI Chat Interface" />
      </Head>

      <div className="chat-root">
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
        <main className="main-area">
          {/* Top bar */}
          <div className="topbar">
            <span className="topbar-title">
              {activeConvId
                ? conversations.find((c) => c.id === activeConvId)?.title || 'Conversation'
                : 'New Conversation'}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
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
                      {renderMarkdown(msg.text)}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Thinking indicator */}
            {loading && (
              <div className="thinking-row">
                <div className="thinking-avatar">⚡</div>
                <div className="thinking-dots">
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                </div>
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
              <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
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
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Harikson…"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={loading || (!inputText.trim() && attachedFiles.length === 0)}
                  title="Send (Enter)"
                >
                  {loading ? '...' : '↑'}
                </button>
              </div>
            </form>
            <p className="input-hint">Press Enter to send · Shift+Enter for new line · Attach code files</p>
          </div>
        </main>
      </div>
    </>
  );
}
