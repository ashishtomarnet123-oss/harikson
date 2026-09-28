import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MarkdownRenderer from '../../components/chat/MarkdownRenderer';
import { User, Bot, AlertTriangle, ExternalLink } from 'lucide-react';

// ─────────────────────────────────────────────
// Timestamp formatter
// ─────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return ''; }
}

// ─────────────────────────────────────────────
// Error view
// ─────────────────────────────────────────────
function ErrorView({ message }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: '440px', textAlign: 'center',
        background: '#ffffff', border: '1px solid #e2e8f0',
        borderRadius: '20px', padding: '40px 32px',
        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: '#fff5f5', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <AlertTriangle size={26} color="#dc2626" />
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
          Conversation unavailable
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
          {message || 'This shared link may have expired or been revoked by its owner.'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff', textDecoration: 'none',
            padding: '10px 20px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600,
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}
        >
          Go to Xarwiz AI
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Individual message bubble
// ─────────────────────────────────────────────
function MessageBubble({ message, index }) {
  const isUser = message.role === 'user';
  return (
    <div
      key={index}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '12px',
        marginBottom: '24px',
        maxWidth: '100%',
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
          : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: isUser ? '1.5px solid #bfdbfe' : '1.5px solid #bbf7d0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser
          ? <User size={16} color="#2563eb" />
          : <Bot size={16} color="#16a34a" />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: 'min(680px, calc(100% - 46px))',
        background: isUser ? '#eff6ff' : '#ffffff',
        border: isUser ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
      }}>
        {isUser ? (
          <p style={{ margin: 0, fontSize: '14.5px', color: '#1e3a6e', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main public share page
// ─────────────────────────────────────────────
export default function SharePage() {
  const router = useRouter();
  const { token } = router.query;

  const [state, setState] = useState('loading'); // loading | loaded | error
  const [shareData, setShareData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function load() {
      try {
        const apiBase =
          typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/api/public/shares/${encodeURIComponent(token)}`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.status === 404) {
          setErrorMessage('This shared link may have expired or been revoked by its owner.');
          setState('error');
          return;
        }
        if (res.status === 429) {
          setErrorMessage('Too many requests. Please wait a moment and try again.');
          setState('error');
          return;
        }
        if (!res.ok) {
          setErrorMessage('Something went wrong. Please try again later.');
          setState('error');
          return;
        }
        const data = await res.json();
        setShareData(data);
        setState('loaded');
      } catch (e) {
        if (e.name === 'AbortError') return;
        setErrorMessage('Failed to load the shared conversation. Please check your connection.');
        setState('error');
      }
    }

    load();
    return () => controller.abort();
  }, [token]);

  // ── Error & Loading states ──────────────────────────────────
  if (state === 'error') return <ErrorView message={errorMessage} />;

  if (state === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid #e2e8f0',
            borderTop: '3px solid #2563eb', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 14px',
          }} />
          <p style={{ color: '#64748b', fontSize: '13.5px', margin: 0 }}>Loading shared conversation...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const { title, messages = [], createdAt } = shareData;

  // ── Full public viewer ──────────────────────────────────────
  return (
    <>
      <Head>
        {/* noindex/nofollow — shared conversations must not be indexed */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />

        <title>{title ? `${title} — Xarwiz AI` : 'Shared conversation — Xarwiz AI'}</title>
        <meta name="description" content="A shared, read-only AI conversation from Xarwiz AI." />

        {/* Open Graph — kept generic to avoid leaking conversation content */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Shared conversation — Xarwiz AI" />
        <meta property="og:description" content="A shared, read-only AI conversation from Xarwiz AI." />
        <meta property="og:site_name" content="Xarwiz AI" />

        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="no-referrer" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Top nav bar ── */}
        <header style={{
          background: '#ffffff', borderBottom: '1px solid #e2e8f0',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        }}>
          <div style={{
            maxWidth: '780px', margin: '0 auto',
            padding: '0 16px',
            height: '56px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Brand */}
            <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Xarwiz AI</span>
            </a>

            {/* View-only badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '20px', padding: '4px 10px',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#64748b',
              }} />
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>View only</span>
            </div>
          </div>
        </header>

        {/* ── Content area ── */}
        <main style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 16px 80px' }}>

          {/* Conversation title + metadata */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '20px', padding: '4px 12px', marginBottom: '12px',
            }}>
              <ExternalLink size={12} color="#2563eb" />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#1d4ed8' }}>
                Shared conversation
              </span>
            </div>

            <h1 style={{
              margin: '0 0 6px', fontSize: '24px', fontWeight: 700, color: '#0f172a',
              lineHeight: 1.3, wordBreak: 'break-word',
            }}>
              {title || 'Shared Conversation'}
            </h1>
            {createdAt && (
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Shared on {formatDate(createdAt)} · {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Messages */}
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '16px', color: '#94a3b8', fontSize: '14px',
            }}>
              No messages to display.
            </div>
          ) : (
            <div>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} index={i} />
              ))}
            </div>
          )}

          {/* Footer notice */}
          <div style={{
            marginTop: '40px', padding: '16px 20px',
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px',
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              This is a <strong style={{ color: '#0f172a' }}>shared, read-only</strong> conversation.
              You cannot reply or modify it.
            </p>
            <a
              href="/chat"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff', textDecoration: 'none',
                padding: '9px 16px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              Start your own chat
              <ExternalLink size={13} />
            </a>
          </div>
        </main>
      </div>

      {/* Global styles needed for code blocks and animations from MarkdownRenderer */}
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        * { box-sizing: border-box; }

        /* Code blocks — reuse the same classes as MarkdownRenderer */
        .code-block {
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin: 12px 0;
          background: #0f172a;
        }
        .code-block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .code-lang { font-size: 11px; color: #94a3b8; font-family: monospace; }
        .artifact-actions { display: flex; gap: 6px; }
        .copy-btn {
          display: flex; align-items: center; gap: 4px;
          background: transparent; border: 1px solid #334155;
          color: #94a3b8; cursor: pointer; padding: 3px 8px;
          border-radius: 5px; font-size: 11px;
        }
        .copy-btn.copied { color: #4ade80; border-color: #4ade80; }
        .code-wrapper { overflow-x: auto; }
        pre { margin: 0; padding: 14px; background: #0f172a !important; }
        pre code { font-size: 13px !important; font-family: 'JetBrains Mono', 'Fira Code', monospace !important; line-height: 1.65; }

        /* Markdown body */
        .markdown-body { color: #1e293b; font-size: 14.5px; line-height: 1.7; }
        .markdown-h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        .markdown-h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 14px 0 6px; }
        .markdown-h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 12px 0 6px; }
        .markdown-h4, .markdown-h5, .markdown-h6 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 10px 0 4px; }
        .markdown-p { margin: 6px 0; }
        .markdown-ul, .markdown-ol { padding-left: 20px; margin: 6px 0; }
        .markdown-li { margin-bottom: 4px; }
        .markdown-blockquote { border-left: 3px solid #2563eb; padding: 8px 12px; margin: 10px 0; background: #eff6ff; border-radius: 0 8px 8px 0; color: #1e40af; }
        .markdown-strong { font-weight: 700; }
        .markdown-em { font-style: italic; }
        .markdown-del { text-decoration: line-through; color: #94a3b8; }
        .markdown-link { color: #2563eb; text-decoration: underline; }
        .markdown-link:hover { color: #1d4ed8; }
        .markdown-hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
        .inline-code { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 5px; font-family: monospace; font-size: 13px; color: #1e293b; }
        .table-container { overflow-x: auto; margin: 10px 0; }
        .markdown-table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
        .markdown-table th, .markdown-table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
        .markdown-table th { background: #f8fafc; font-weight: 600; color: #0f172a; }
        .markdown-table tr:hover { background: #f8fafc; }

        /* Responsive */
        @media (max-width: 600px) {
          .markdown-h1 { font-size: 17px; }
          .markdown-h2 { font-size: 15px; }
        }
      `}</style>
    </>
  );
}
