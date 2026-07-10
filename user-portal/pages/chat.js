import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Mic, Paperclip, ArrowUp, Square, Globe, BrainCircuit, Maximize2, TriangleAlert, Bot, Search, Image as ImageIcon, Copy, Check, Zap, Plus, Edit3, X, LogOut, Link, Rocket, ShieldCheck, FolderUp, Folder, Bug, FileText } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

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
            <button onClick={() => onOpenArtifact({ language, code })} title="Open in Canvas" style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Maximize2 size={12} /> Canvas</button>
          )}
          <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
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
  { id: 'summarize', icon: <FileText size={18} />, title: 'Summarize', desc: 'Summarize text or meeting notes', prompt: 'Summarize the following: \n' },
  { id: 'debug', icon: <Bug size={18} />, title: 'Debug', desc: 'Find bugs in my code', prompt: 'Debug this code and explain the fixes: \n' },
  { id: 'explain', icon: <BrainCircuit size={18} />, title: 'Explain', desc: 'Explain a complex concept simply', prompt: 'Explain this concept to me as if I were a beginner: ' },
];

let pdfjsPromise = null;
const loadPdfJs = () => {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = (err) => {
      pdfjsPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return pdfjsPromise;
};

const extractTextFromPdf = async (arrayBuffer) => {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  if (!fullText.trim()) {
    return '[Empty PDF document or scanned PDF with no extractable text]';
  }
  return fullText;
};

let tesseractPromise = null;
const loadTesseract = () => {
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js';
    script.onload = () => {
      resolve(window.Tesseract);
    };
    script.onerror = (err) => {
      tesseractPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return tesseractPromise;
};

const extractTextFromImage = async (dataUrl) => {
  const tesseract = await loadTesseract();
  const worker = await tesseract.createWorker('eng');
  const ret = await worker.recognize(dataUrl);
  await worker.terminate();
  if (!ret.data.text.trim()) {
    return '[No extractable text found in image]';
  }
  return ret.data.text;
};

/* ────────────────────────────────────────────────────────────
   Main Chat Page
   ──────────────────────────────────────────────────────────── */

export default function ChatPage() {
  const [globalError, setGlobalError] = useState('');
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      setGlobalError(msg + " at " + line + ":" + col + "\n" + (err ? err.stack : ''));
    };
    window.addEventListener('unhandledrejection', (event) => {
      setGlobalError("Unhandled Promise Rejection: " + event.reason);
    });
  }, []);
  const router = useRouter();

  // Voice dictation initialization
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        if (!recognitionRef.current) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) throw new Error("Speech recognition not supported");
          
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputText(prev => prev ? prev + ' ' + transcript : transcript);
            setIsRecording(false);
          };
          recognitionRef.current.onerror = (e) => {
            console.error("Mic error:", e);
            setIsRecording(false);
          };
          recognitionRef.current.onend = () => setIsRecording(false);
        }
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Speech API Error:", err);
        alert("Voice dictation is not available in this browser or requires HTTPS.");
        setIsRecording(false);
      }
    }
  };

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [pinnedChats, setPinnedChats] = useState([]);
  const hasProcessingFiles = attachedFiles.some(f => f.status === 'processing');
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
  // Flag to prevent the URL effect from re-loading the old conversation
  // when we intentionally start a new chat (state updates before URL changes)
  const isNewChatMode = useRef(false);

  /* ── Resolve config from localStorage on mount ── */


  useEffect(() => {
    const savedToken = localStorage.getItem('hk_token');
    const savedInstructions = localStorage.getItem('harikson_custom_instructions');
    if (savedInstructions) setCustomInstructions(savedInstructions);
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

  /* ── Load shared conversation link if present on mount or URL change ── */
  useEffect(() => {
    if (token && router.isReady) {
      const urlConvId = router.query.conversation;

      // If we just triggered a new chat, skip this effect run.
      // Once the URL clears the conversation param, reset the flag.
      if (isNewChatMode.current) {
        if (!urlConvId) {
          // URL has caught up — new chat mode is fully active, reset flag
          isNewChatMode.current = false;
        }
        // Either way, don't load anything while in new-chat mode
        return;
      }

      if (urlConvId && urlConvId !== activeConvId) {
        loadConversation(urlConvId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Set flag BEFORE any state changes so the URL effect ignores
    // the interim state where activeConvId=null but URL still has old convId
    isNewChatMode.current = true;

    // Abort any ongoing generation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveConvId(null);
    setMessages([]);
    setError(null);
    setInputText('');
    setAttachedFiles([]);
    setLoading(false);
    setLoadingStatus('');
    setActiveArtifact(null);
    router.replace(`/chat`, undefined, { shallow: true });
    // Focus the input so the user can start typing immediately
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };


  const processFile = (file) => {
    const fileId = Math.random().toString(36).substring(7);
    
    // Add placeholder with status 'processing'
    setAttachedFiles(prev => [
      ...prev,
      { id: fileId, name: file.name, status: 'processing', content: '' }
    ]);

    const updateFileContent = (content, status = 'ready', error = null) => {
      setAttachedFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return { ...f, content, status, error };
        }
        return f;
      }));
    };

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const text = await extractTextFromPdf(arrayBuffer);
          updateFileContent(text);
        } catch (err) {
          console.error('Failed to parse PDF:', err);
          updateFileContent('', 'error', 'Failed to extract PDF text');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target.result;
          const text = await extractTextFromImage(dataUrl);
          updateFileContent(text);
        } catch (err) {
          console.error('Failed to OCR image:', err);
          updateFileContent('', 'error', 'Failed to extract text from image');
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateFileContent(event.target.result || '');
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => processFile(file));
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
    files.forEach(file => processFile(file));
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
    const readyAttachments = attachedFiles.filter(f => f.status !== 'error' && f.status !== 'processing');
    if ((!inputText.trim() && readyAttachments.length === 0) || loading || hasProcessingFiles) return;

    const userText = inputText.trim();
    setInputText('');
    setError(null);
    setLoading(true);
    
    // Determine loading status based on toggles and URLs
    if (useDeepSearch) {
      setLoadingStatus('Searching the web...');
    } else if (userText.match(/(https?:\/\/[^\s]+)/g)) {
      setLoadingStatus('Crawling websites...');
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
      { role: 'system', content: (presets[systemPreset] || presets.general) + (customInstructions ? '\n\nCustom Instructions:\n' + customInstructions : '') },
      ...messages
        .filter(m => m.text && m.text.trim())
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
    ];

    // Handle document/file attachment injection
    let finalMessage = userText;
    const readyAttachments = attachedFiles.filter(f => f.status !== 'error' && f.status !== 'processing');
    if (readyAttachments.length > 0) {
      const attachments = readyAttachments.map(f => `<uploaded_file name="${f.name}">\n${f.content}\n</uploaded_file>`).join('\n\n');
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
            {globalError && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'red', color: 'white', zIndex: 9999, padding: '20px', whiteSpace: 'pre-wrap' }}>
          <h1>CLIENT SIDE CRASH!</h1>
          {globalError}
        </div>
      )}
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
            <div className="sidebar-logo-icon"><Zap size={20} color="var(--accent)" /></div>
            <div className="sidebar-logo-text">Harikson AI</div>
          </div>

          {/* New Chat */}
          <button className="new-chat-btn" onClick={startNewChat}>
            <Plus size={16} />
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
                  ><Edit3 size={14} /></button>
                  <button
                    className="conv-action-btn danger"
                    title="Delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  ><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* User Info / Logout */}
          <div className="sidebar-footer">
            <div 
              className="user-info" 
              onClick={() => setShowSettingsModal(true)}
              style={{ cursor: 'pointer', transition: 'background 0.2s', padding: '8px', borderRadius: 'var(--radius-md)' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="user-avatar">{userInitial}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span className="user-email" style={{ fontSize: '13px', fontWeight: '500' }}>{user?.name || user?.email?.split('@')[0] || 'User'}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manage Account</span>
              </div>
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
                <span style={{marginRight: "6px"}}><Link size={14} /></span> Share
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
                <div className="messages-empty-icon"><Zap size={40} color="var(--accent)" /></div>
                <h2>Harikson AI</h2>
                <p>Your enterprise AI coding assistant. Ask anything about your codebase, architecture, or software.</p>
                
                <div className="prompt-suggestions-grid">
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Create a private LLM deployment template with Harikson.")}>
                    <div className="suggestion-icon"><Rocket size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>Deploy Private LLM</strong>
                      <span>Create a sovereign deployment template</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Auditing my code for DPDP compliance rules.")}>
                    <div className="suggestion-icon"><ShieldCheck size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>DPDP Audit</strong>
                      <span>Check code compliance on Indian soil</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Optimize this query for active tenant indexes.")}>
                    <div className="suggestion-icon"><Zap size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>Optimize SQL Index</strong>
                      <span>DBA schema indexing assistant</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Write a robust RAG data pipeline configuration.")}>
                    <div className="suggestion-icon"><Folder size={24} color="var(--accent)" /></div>
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
                    <div className="assistant-avatar"><Zap size={16} color="white" /></div>
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
                <div className="thinking-avatar"><Zap size={16} color="white" /></div>
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
                <TriangleAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="input-bar">
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', padding: '0 12px' }}>
                {attachedFiles.map((file, i) => (
                  <div key={i} className={`attached-file-pill ${file.status || 'ready'}`} style={
                    file.status === 'error' ? { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', color: '#dc2626' } :
                    file.status === 'processing' ? { borderColor: 'rgba(79, 140, 255, 0.4)', background: 'rgba(79, 140, 255, 0.05)' } : {}
                  }>
                    {file.status === 'processing' ? (
                      <div className="settings-spinner" style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid rgba(79, 140, 255, 0.2)',
                        borderTop: '2px solid var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <Paperclip size={12} />
                    )}
                    <span style={{ fontSize: '11.5px' }}>
                      {file.name} 
                      {file.status === 'processing' && ' (extracting...)'}
                      {file.status === 'error' && ' (failed)'}
                    </span>
                    <button type="button" onClick={() => removeAttachedFile(i)} style={
                      file.status === 'error' ? { color: '#dc2626' } : {}
                    }><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={sendMessage}>
              <div className="input-wrapper">
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
                <div className="input-toolbar">
                  <div className="input-toolbar-left">
                    <button 
                      type="button" 
                      className={`toolbar-btn ${isRecording ? 'mic-pulsing' : ''}`} 
                      onClick={toggleRecording}
                      title={isRecording ? 'Stop recording' : 'Dictate with voice'}
                    >
                      <Mic size={18} />
                    </button>
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="file-upload" className="toolbar-btn" title="Attach Files">
                      <Paperclip size={18} />
                    </label>
                    <div className="toolbar-divider" />
                    <button type="button" className={`compute-toggle ${useDeepSearch ? 'active' : ''}`} onClick={() => setUseDeepSearch(!useDeepSearch)}>
                      <Globe size={14} /> Search
                    </button>
                    <button type="button" className={`compute-toggle ${useReasoning ? 'active' : ''}`} onClick={() => setUseReasoning(!useReasoning)}>
                      <BrainCircuit size={14} /> Reason
                    </button>
                  </div>
                  <div className="input-toolbar-right">
                    {loading ? (
                      <button
                        type="button"
                        className="send-btn stop-btn"
                        onClick={stopGeneration}
                        title="Stop generation"
                      >
                        <Square fill="currentColor" size={14} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="send-btn"
                        disabled={(!inputText.trim() && attachedFiles.length === 0) || hasProcessingFiles}
                        title="Send (Enter)"
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </div>
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
                <Maximize2 size={16} color="#ff7e67" style={{marginRight: '8px'}} /> {activeArtifact.language === 'html' ? 'index.html' : 'snippet.' + (activeArtifact.language || 'txt')}
              </div>
              <div className="artifact-actions">
                <button onClick={() => { navigator.clipboard.writeText(activeArtifact.code); }}><Copy size={14} /></button>
                <button onClick={() => setActiveArtifact(null)}><X size={14} /></button>
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
            <div className="drag-drop-icon"><FolderUp size={48} color="var(--accent)" /></div>
            <span>Drop your files to attach to Harikson</span>
          </div>
        )}

        {toast && (
          <div className="toast-msg">{toast}</div>
        )}
        
        <SettingsModal 
          isOpen={showSettingsModal} 
          onClose={() => setShowSettingsModal(false)} 
          initialTab="profile"
        />
      </div>
    </>
  );
}
