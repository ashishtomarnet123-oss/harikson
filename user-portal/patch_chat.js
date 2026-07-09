const fs = require('fs');

let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

// 1. Add pinnedChats state and togglePin function
const stateHooksHook = `  const [attachedFiles, setAttachedFiles] = useState([]);`;
const stateHooksAdd = `  const [attachedFiles, setAttachedFiles] = useState([]);
  const [pinnedChats, setPinnedChats] = useState([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

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
`;
content = content.replace(stateHooksHook, stateHooksAdd);

// 2. Add SLASH COMMANDS definitions
const slashDefs = `
const SLASH_COMMANDS = [
  { id: 'code', icon: '</>', title: 'Write Code', desc: 'Generate a code snippet or component', prompt: 'Write the code for a ' },
  { id: 'summarize', icon: '📝', title: 'Summarize', desc: 'Summarize text or meeting notes', prompt: 'Summarize the following: \\n' },
  { id: 'debug', icon: '🐛', title: 'Debug', desc: 'Find bugs in my code', prompt: 'Debug this code and explain the fixes: \\n' },
  { id: 'explain', icon: '🧠', title: 'Explain', desc: 'Explain a complex concept simply', prompt: 'Explain this concept to me as if I were a beginner: ' },
];
`;
content = content.replace('/* ────────────────────────────────────────────────────────────\n   Main Chat Page', slashDefs + '\n/* ────────────────────────────────────────────────────────────\n   Main Chat Page');

// 3. Replace handleKeyDown logic
const handleKeyDownOld = `  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };`;
const handleKeyDownNew = `  const handleKeyDown = (e) => {
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
      sendMessage(e);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    
    // Check if the user just typed "/" at the start or after a space
    if (val === '/' || val.endsWith(' /')) {
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else if (showSlashMenu && !val.includes('/')) {
      setShowSlashMenu(false);
    }
  };

  const applySlashCommand = (cmd) => {
    // Replace the trailing slash with the command prompt
    const parts = inputText.split('/');
    parts.pop(); // remove last part (the slash)
    setInputText(parts.join('/') + cmd.prompt);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };
`;
content = content.replace(handleKeyDownOld, handleKeyDownNew);
// Fix the onChange handler in textarea
content = content.replace('onChange={(e) => setInputText(e.target.value)}', 'onChange={handleInputChange}');


// 4. Update Sidebar UI
const sidebarOld = `          {/* Conversation List */}
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
                className={\`conv-item\${activeConvId === conv.id ? ' active' : ''}\`}
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
                  >
                    ✎
                  </button>
                  <button
                    className="conv-action-btn delete"
                    title="Delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>`;

const sidebarNew = `          {/* Conversation List */}
          <div className="conv-list">
            {conversations.length === 0 && (
              <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No conversations yet. Start chatting!
              </div>
            )}
            
            {/* Pinned Section */}
            {pinnedChats.length > 0 && (
              <>
                <div className="sidebar-section-title">Pinned</div>
                {conversations.filter(c => pinnedChats.includes(c.id)).map(conv => (
                  <div
                    key={conv.id}
                    className={\`conv-item\${activeConvId === conv.id ? ' active' : ''}\`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <span className="conv-title" style={{fontWeight: 600}}>📌 {conv.title || 'Untitled'}</span>
                    <div className="conv-actions">
                      <button className="pin-btn pinned" onClick={(e) => togglePin(e, conv.id)} title="Unpin">★</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Projects Mock Section */}
            <div className="sidebar-section-title">Projects</div>
            <div className="conv-item" onClick={() => handleSuggestionClick("Let's work on the Harikson App.")}>
              <span className="conv-title" style={{color: 'var(--text-secondary)'}}>📁 Harikson App</span>
            </div>
            <div className="conv-item" onClick={() => handleSuggestionClick("Let's audit the DPDP compliance.")}>
              <span className="conv-title" style={{color: 'var(--text-secondary)'}}>📁 Compliance Audit</span>
            </div>

            {conversations.length > 0 && (
              <div className="sidebar-section-title" style={{marginTop: '16px'}}>Recent</div>
            )}
            {conversations.filter(c => !pinnedChats.includes(c.id)).map((conv) => (
              <div
                key={conv.id}
                className={\`conv-item\${activeConvId === conv.id ? ' active' : ''}\`}
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
                    className={\`pin-btn \${pinnedChats.includes(conv.id) ? 'pinned' : ''}\`}
                    title="Pin chat"
                    onClick={(e) => togglePin(e, conv.id)}
                  >
                    ★
                  </button>
                  <button
                    className="conv-action-btn"
                    title="Rename"
                    onClick={(e) => startRename(conv, e)}
                  >
                    ✎
                  </button>
                  <button
                    className="conv-action-btn delete"
                    title="Delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>`;
content = content.replace(sidebarOld, sidebarNew);

// 5. Update Empty State
const emptyOld = `            {messages.length === 0 && !loading && (
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
                      <strong>Optimize Query</strong>
                      <span>Improve database indexing efficiency</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Write a robust Node.js middleware for JWT auth.")}>
                    <div className="suggestion-icon">🔒</div>
                    <div className="suggestion-text">
                      <strong>JWT Auth Middleware</strong>
                      <span>Secure API routes with Express middleware</span>
                    </div>
                  </div>
                </div>
              </div>
            )}`;

const emptyNew = `            {messages.length === 0 && !loading && (
              <div className="messages-empty">
                <h1 className="messages-empty-title">
                  <span className="sparkle">✸</span>
                  Hey there, {user ? user.email.split('@')[0] : 'Ashish'}
                </h1>
                
                <div className="prompt-suggestions-row">
                  <button className="action-pill" onClick={() => handleSuggestionClick("Write a React component for a dashboard table.")}>
                    <span className="action-pill-icon">&lt;/&gt;</span> Code
                  </button>
                  <button className="action-pill" onClick={() => handleSuggestionClick("Write a technical design document for this microservice.")}>
                    <span className="action-pill-icon">✍️</span> Write
                  </button>
                  <button className="action-pill" onClick={() => handleSuggestionClick("Create a project plan for migrating from REST to GraphQL.")}>
                    <span className="action-pill-icon">📋</span> Plan
                  </button>
                  <button className="action-pill" onClick={() => handleSuggestionClick("Explain the differences between RAG and fine-tuning.")}>
                    <span className="action-pill-icon">🧠</span> Learn
                  </button>
                  <button className="action-pill" onClick={() => handleSuggestionClick("Generate a python script to parse logs.")}>
                    <span className="action-pill-icon">🐍</span> Script
                  </button>
                </div>
              </div>
            )}`;
content = content.replace(emptyOld, emptyNew);

// 6. Inject Slash Command UI inside form
const slashUi = `            <form onSubmit={sendMessage}>
              <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                {showSlashMenu && (
                  <div className="slash-command-popup">
                    {SLASH_COMMANDS.map((cmd, idx) => (
                      <div 
                        key={cmd.id} 
                        className={\`slash-command-item \${idx === slashIndex ? 'selected' : ''}\`}
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
`;
content = content.replace(`            <form onSubmit={sendMessage}>
              <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>`, slashUi);

fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
console.log('Successfully patched user-portal/pages/chat.js');
