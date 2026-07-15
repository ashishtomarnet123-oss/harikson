const fs = require('fs');

let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const targetStart = `<div className="input-bar">`;
const targetEnd = `              </div>\n            </form>\n            <p className="input-hint">`;

const startIndex = chatJs.indexOf(targetStart);
const endIndex = chatJs.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newCode = `<div className="input-bar">
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
                        title="Send (Enter)"
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
            <p className="input-hint">`;

  chatJs =
    chatJs.substring(0, startIndex) +
    newCode +
    chatJs.substring(endIndex + targetEnd.length);
} else {
  console.error('Could not find start or end index for patch');
}

fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
