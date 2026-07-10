const fs = require('fs');

let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

// 1. Add lucide imports
const importAnchor = "import { useState, useRef, useEffect, useCallback } from 'react';";
if (!chatJs.includes('lucide-react')) {
  chatJs = chatJs.replace(
    importAnchor,
    importAnchor + "\nimport { Mic, Paperclip, ArrowUp, Square, Globe, BrainCircuit, Maximize2, TriangleAlert, Bot, Search, Image as ImageIcon } from 'lucide-react';"
  );
}

// 2. Replace input bar
const inputBarStart = `<div className="input-bar">`;
const inputBarEnd = `<div className="input-hint">`; // this is what is actually there!

const startIndex = chatJs.indexOf(inputBarStart);
const endIndex = chatJs.indexOf(inputBarEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newInputBar = `<div className="input-bar">
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', padding: '0 12px' }}>
                {attachedFiles.map((file, i) => (
                  <div key={i} className="attached-file-pill">
                    <Paperclip size={12} />
                    <span>{file.name}</span>
                    <button type="button" onClick={() => removeAttachedFile(i)}>✕</button>
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
                      className={\`toolbar-btn \${isRecording ? 'mic-pulsing' : ''}\`} 
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
                    <button type="button" className={\`compute-toggle \${useDeepSearch ? 'active' : ''}\`} onClick={() => setUseDeepSearch(!useDeepSearch)}>
                      <Globe size={14} /> Search
                    </button>
                    <button type="button" className={\`compute-toggle \${useReasoning ? 'active' : ''}\`} onClick={() => setUseReasoning(!useReasoning)}>
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
                        disabled={!inputText.trim() && attachedFiles.length === 0}
                        title="Send"
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
            `;
  chatJs = chatJs.substring(0, startIndex) + newInputBar + chatJs.substring(endIndex);
}

// 3. Replace loading text emojis
chatJs = chatJs.replace("setLoadingStatus('🌐 Searching the web...');", "setLoadingStatus('Searching the web...');");
chatJs = chatJs.replace("setLoadingStatus('🕷️ Crawling websites...');", "setLoadingStatus('Crawling websites...');");

// 4. Replace artifact title emoji
chatJs = chatJs.replace("<span style={{color: '#ff7e67'}}>⛶</span>", "<Maximize2 size={16} color=\"#ff7e67\" style={{marginRight: '8px'}} />");

// 5. Replace CodeBlock canvas emoji
chatJs = chatJs.replace(
  "<button onClick={() => onOpenArtifact({ language, code })} title=\"Open in Canvas\">⛶ Canvas</button>",
  "<button onClick={() => onOpenArtifact({ language, code })} title=\"Open in Canvas\" style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Maximize2 size={12} /> Canvas</button>"
);

// 6. Replace Error banner emoji
chatJs = chatJs.replace("<span>⚠</span>", "<TriangleAlert size={18} />");

// 7. Replace slash commands emojis (if they exist)
chatJs = chatJs.replace("icon: '🎨'", "icon: <ImageIcon size={18} />");
chatJs = chatJs.replace("icon: '🧠'", "icon: <BrainCircuit size={18} />");
chatJs = chatJs.replace("icon: '🌐'", "icon: <Globe size={18} />");
chatJs = chatJs.replace("icon: '🤖'", "icon: <Bot size={18} />");

fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
