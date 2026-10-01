import React, { memo, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, Maximize2 } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   Secure Clipboard copy helper
──────────────────────────────────────────────────────────── */
function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (success) resolve();
      else reject(new Error('copy command failed'));
    } catch (err) {
      reject(err);
    }
  });
}

/* ────────────────────────────────────────────────────────────
   Helper to extract plain text string from arbitrary React nodes
──────────────────────────────────────────────────────────── */
function getNodeText(node) {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (node.props && node.props.children) return getNodeText(node.props.children);
  return '';
}

/* ────────────────────────────────────────────────────────────
   URL Protocol Sanitizer — blocks javascript:, data:, vbscript:
──────────────────────────────────────────────────────────── */
function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  // Safe relative paths or anchors
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }
  // Safe protocols
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('doc://')
  ) {
    return true;
  }
  // Block any dangerous scheme (e.g. javascript:, data:, vbscript:)
  return false;
}

/* ────────────────────────────────────────────────────────────
   Code Block Component with syntax highlighting, copy, & canvas
──────────────────────────────────────────────────────────── */
const CodeBlockWrapper = memo(function CodeBlockWrapper({ children, onOpenArtifact }) {
  const [copied, setCopied] = useState(false);

  // The child of <pre> in react-markdown with rehype-highlight is <code>
  const codeElement = React.Children.toArray(children)[0];
  const className = codeElement?.props?.className || '';
  const langMatch = className.match(/language-([a-zA-Z0-9_\-+]+)/);
  const language = langMatch ? langMatch[1] : '';

  // Extract raw unformatted text for copying or artifact inspection
  const rawCode = useMemo(() => getNodeText(children).replace(/\n$/, ''), [children]);

  const handleCopy = useCallback(() => {
    copyToClipboard(rawCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error('Copy failed:', err));
  }, [rawCode]);

  const handleOpenArtifact = useCallback(() => {
    if (onOpenArtifact) {
      onOpenArtifact({ language: language || 'text', code: rawCode });
    }
  }, [onOpenArtifact, language, rawCode]);

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <div className="artifact-actions">
          {onOpenArtifact && (
            <button
              type="button"
              onClick={handleOpenArtifact}
              title="Open in Canvas"
              className="canvas-btn"
            >
              <Maximize2 size={12} />
              <span>Canvas</span>
            </button>
          )}
          <button
            type="button"
            className={`copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="code-wrapper">
        <pre tabIndex={0}>
          {children}
        </pre>
      </div>
    </div>
  );
});

/* ────────────────────────────────────────────────────────────
   Centralized Markdown Renderer Component
──────────────────────────────────────────────────────────── */
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeHighlight];

function MarkdownRenderer({ content, onOpenArtifact, onCitationClick, className = '' }) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const components = useMemo(() => ({
    // Code blocks
    pre: ({ children, ...props }) => (
      <CodeBlockWrapper onOpenArtifact={onOpenArtifact}>
        {children}
      </CodeBlockWrapper>
    ),

    // Inline code (distinguished when outside <pre>)
    code: ({ node, inline, className: codeClass, children, ...props }) => {
      const isBlock = node?.data?.meta || (codeClass && codeClass.includes('hljs')) || (codeClass && codeClass.includes('language-'));
      if (inline || !isBlock) {
        return (
          <code className="inline-code" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className={codeClass} {...props}>
          {children}
        </code>
      );
    },

    // Headings (H1 to H6)
    h1: ({ children, ...props }) => <h1 className="markdown-h1" {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 className="markdown-h2" {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 className="markdown-h3" {...props}>{children}</h3>,
    h4: ({ children, ...props }) => <h4 className="markdown-h4" {...props}>{children}</h4>,
    h5: ({ children, ...props }) => <h5 className="markdown-h5" {...props}>{children}</h5>,
    h6: ({ children, ...props }) => <h6 className="markdown-h6" {...props}>{children}</h6>,

    // Paragraph
    p: ({ children, ...props }) => <p className="markdown-p" {...props}>{children}</p>,

    // Lists
    ul: ({ children, ...props }) => <ul className="markdown-ul" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="markdown-ol" {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li className="markdown-li" {...props}>{children}</li>,

    // Blockquote
    blockquote: ({ children, ...props }) => (
      <blockquote className="markdown-blockquote" {...props}>
        {children}
      </blockquote>
    ),

    // Responsive Table
    table: ({ children, ...props }) => (
      <div className="table-container">
        <table className="markdown-table" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    th: ({ children, ...props }) => <th {...props}>{children}</th>,
    td: ({ children, ...props }) => <td {...props}>{children}</td>,

    // Safe Links
    a: ({ href, children, ...props }) => {
      if (href && href.startsWith('doc://')) {
        let docId = '';
        let pageNum = 1;
        try {
          const raw = href.replace('doc://', '');
          const [idPart, queryPart] = raw.split('?');
          docId = idPart;
          if (queryPart) {
            const params = new URLSearchParams(queryPart);
            pageNum = parseInt(params.get('page') || '1', 10);
          }
        } catch (e) {
          docId = href.replace('doc://', '');
        }

        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (onCitationClick) {
                onCitationClick({ documentId: docId, page: pageNum });
              }
            }}
            className="markdown-link citation-source-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--accent, #4f8cff)',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(79, 140, 255, 0.08)',
              border: '1px solid rgba(79, 140, 255, 0.2)',
              cursor: 'pointer',
              fontSize: '0.9em',
            }}
            title={`Open document preview at Page ${pageNum}`}
            {...props}
          >
            📄 {children}
          </a>
        );
      }

      const safe = isSafeUrl(href);
      const isExternal = safe && /^https?:\/\//i.test(href);
      return (
        <a
          href={safe ? href : '#'}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="markdown-link"
          {...props}
        >
          {children}
        </a>
      );
    },

    // Horizontal Rule
    hr: (props) => <hr className="markdown-hr" {...props} />,

    // Bold, Italic, Strikethrough
    strong: ({ children, ...props }) => <strong className="markdown-strong" {...props}>{children}</strong>,
    em: ({ children, ...props }) => <em className="markdown-em" {...props}>{children}</em>,
    del: ({ children, ...props }) => <del className="markdown-del" {...props}>{children}</del>,
  }), [onOpenArtifact]);

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownRenderer);
