const fs = require('fs');

let css = fs.readFileSync('user-portal/styles/globals.css', 'utf8');

const oldCSSRegex =
  /\.input-wrapper \{[\s\S]*?\.send-btn\.stop-btn:hover \{[\s\S]*?\}/;

const newCSS = `.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 900px;
  margin: 0 auto;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.chat-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 15px;
  font-family: var(--font-sans);
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 200px;
  overflow-y: auto;
  padding: 0;
}
.chat-textarea::placeholder { color: var(--text-muted); }

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.input-toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.input-toolbar-right {
  display: flex;
  align-items: center;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.toolbar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.toolbar-btn.mic-pulsing {
  color: #EF4444;
  animation: pulseMic 1.5s infinite;
}
@keyframes pulseMic {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); color: #EF4444; }
  100% { transform: scale(1); }
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}

.compute-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 20px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.compute-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.compute-toggle.active {
  background: rgba(79, 140, 255, 0.1);
  color: var(--accent);
}

.send-btn {
  width: 34px; height: 34px;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  color: #FFFFFF;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.send-btn:hover:not(:disabled) { background-color: var(--accent-hover); transform: scale(1.03); }
.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.send-btn.stop-btn { background: #EF4444; }
.send-btn.stop-btn:hover { background: #DC2626; }

.attached-file-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}
.attached-file-pill button {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
.attached-file-pill button:hover {
  color: #EF4444;
}`;

css = css.replace(oldCSSRegex, newCSS);

// Also remove old compute-toggles-row class if it exists elsewhere
const oldToggles =
  /\.compute-toggles-row \{[\s\S]*?\}\n\.compute-toggle \{[\s\S]*?\}\n\.compute-toggle:hover \{[\s\S]*?\}\n\.compute-toggle\.active \{[\s\S]*?\}/;
css = css.replace(oldToggles, '');

fs.writeFileSync('user-portal/styles/globals.css', css, 'utf8');
