import { useState, useEffect, useRef } from 'react';

const renderMessageText = (text) => {
  if (!text) return null;
  
  // Split text by code blocks (```)
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Extract language and code content
      const lines = part.slice(3, -3).trim().split('\n');
      let language = 'code';
      let codeContent = lines.join('\n');
      
      // If first line has no spaces and is short, treat as language identifier
      if (lines[0] && !lines[0].includes(' ') && lines[0].length < 15) {
        language = lines[0];
        codeContent = lines.slice(1).join('\n');
      }
      
      return (
        <div key={index} style={{ margin: '12px 0', width: '100%', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
          <div style={{
            backgroundColor: '#2d3139',
            color: '#c5c9db',
            padding: '6px 14px',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e222b'
          }}>
            <span>{language}</span>
          </div>
          <pre style={{
            backgroundColor: '#1e222b',
            color: '#abb2bf',
            padding: '14px',
            margin: 0,
            overflowX: 'auto',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            whiteSpace: 'pre'
          }}>
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }
    
    // For non-code-block text, split by newlines to render lists and paragraphs correctly
    return (
      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {part.split('\n').map((line, lineIndex) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            return (
              <li key={lineIndex} style={{ marginLeft: '20px', listStyleType: 'disc', margin: '2px 0' }}>
                {trimmed.substring(2)}
              </li>
            );
          }
          if (/^\d+\.\s/.test(trimmed)) {
            const listContent = trimmed.replace(/^\d+\.\s/, '');
            return (
              <li key={lineIndex} style={{ marginLeft: '20px', listStyleType: 'decimal', margin: '2px 0' }}>
                {listContent}
              </li>
            );
          }
          // Preserve empty line structure
          if (!trimmed) {
            return <div key={lineIndex} style={{ height: '8px' }} />;
          }
          return <p key={lineIndex} style={{ margin: 0 }}>{line}</p>;
        })}
      </div>
    );
  });
};

export default function ChatPage() {
  const [tenant, setTenant] = useState('system');
  const [apiBase, setApiBase] = useState('http://localhost:3000');
  const [model, setModel] = useState('Harikson-Plus');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const chatEndRef = useRef(null);

  // Extract tenant name from subdomain if available in browser URL and determine dynamic apiBase
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const host = window.location.host;
      
      // Calculate dynamic apiBase based on how client accessed portal
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        if (window.location.port) {
          setApiBase(`http://${hostname}:3000`);
        } else {
          setApiBase(process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//api.${hostname.split('.').slice(1).join('.')}`);
        }
      }

      // Calculate tenant slug dynamically
      if (host.includes('.')) {
        const parts = host.split('.');
        if (parts[0] !== 'localhost' && parts[0] !== 'www') {
          // If first part is a number, it's an IP address, so skip subdomain extraction
          const isIP = !isNaN(parts[0]);
          if (!isIP) {
            setTenant(parts[0]);
          } else {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantParam = urlParams.get('tenant');
            if (tenantParam) {
              setTenant(tenantParam);
            } else {
              setTenant('system');
            }
          }
        }
      }
    }
  }, []);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText;
    setInputText('');
    setError(null);
    setLoading(true);

    // Add user message to UI state immediately
    const userMessage = { sender: 'user', text: userMessageText };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer TEST_TOKEN',
          'Host': `${tenant}.harikson.ai`,
          'x-tenant-slug': tenant // Custom header fallback to bypass forbidden header checks in browsers
        },
        body: JSON.stringify({
          message: userMessageText,
          model: model === 'Harikson-Plus' ? 'harikson-plus' : 'harikson-max',
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error status ${response.status}`);
      }

      // Check for dynamic conversation ID header
      const convIdHeader = response.headers.get('X-Conversation-Id') || response.headers.get('x-conversation-id');
      if (convIdHeader) {
        setConversationId(convIdHeader);
      }

      // Initialize reader and decoder for streaming body
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      // Append an empty bot message bubble to start rendering
      const activeModelName = model === 'Harikson-Plus' ? 'harikson-plus' : 'harikson-max';
      setMessages((prev) => [...prev, { sender: 'bot', text: '', model: activeModelName }]);

      let botResponseText = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        botResponseText += textChunk;

        // Keep updating the active message bubble
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].sender === 'bot') {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: botResponseText
            };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#333'
    }}>
      {/* Header Panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eaeaea',
        paddingBottom: '15px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Harikson Chat - <span style={{ color: '#0070f3', textTransform: 'capitalize' }}>{tenant}</span>
          </h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            Testing Sandbox UI
          </p>
        </div>
        
        <div>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
              backgroundColor: '#fff',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="Harikson-Plus">Harikson-Plus (Chat 8B)</option>
            <option value="Harikson-Max">Harikson-Max (Coder 14B)</option>
          </select>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#ffebeb',
          color: '#d32f2f',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          border: '1px solid #ffcdd2'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Chat History Area */}
      <div style={{
        height: '500px',
        overflowY: 'auto',
        border: '1px solid #eaeaea',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#fafafa',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: '#888',
            fontSize: '0.95rem'
          }}>
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                backgroundColor: msg.sender === 'user' ? '#0070f3' : '#eef0f2',
                color: msg.sender === 'user' ? '#fff' : '#1a1a1a',
                padding: '10px 16px',
                borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                fontSize: '0.95rem',
                lineHeight: '1.4',
                wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {renderMessageText(msg.text)}
              </div>
              {msg.sender === 'bot' && (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#888',
                  marginTop: '4px',
                  marginLeft: '4px'
                }}>
                  Model: {msg.model}
                </span>
              )}
            </div>
          ))
        )}
        
        {/* Thinking loading state bubble */}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            maxWidth: '75%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              backgroundColor: '#eef0f2',
              color: '#666',
              padding: '10px 16px',
              borderRadius: '18px 18px 18px 2px',
              fontSize: '0.95rem',
              fontStyle: 'italic'
            }}>
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Form Area */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message here..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
          }}
          onFocus={(e) => e.target.style.borderColor = '#0070f3'}
          onBlur={(e) => e.target.style.borderColor = '#ccc'}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: (loading || !inputText.trim()) ? '#ccc' : '#0070f3',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: (loading || !inputText.trim()) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
