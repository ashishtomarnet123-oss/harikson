const fs = require('fs');

let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

// 1. Add states
const statesAnchor = "const [systemPreset, setSystemPreset] = useState('general');";
if (!chatJs.includes('const [showProfileMenu')) {
  chatJs = chatJs.replace(
    statesAnchor,
    statesAnchor + "\n  const [showProfileMenu, setShowProfileMenu] = useState(false);\n  const [showSettingsModal, setShowSettingsModal] = useState(false);\n  const [customInstructions, setCustomInstructions] = useState('');"
  );
}

// 2. Load custom instructions on mount
const loadConfigAnchor = "/* ── Resolve config from localStorage on mount ── */";
if (!chatJs.includes('harikson_custom_instructions')) {
  chatJs = chatJs.replace(
    loadConfigAnchor,
    loadConfigAnchor + "\n    const savedInstructions = localStorage.getItem('harikson_custom_instructions');\n    if (savedInstructions) setCustomInstructions(savedInstructions);\n"
  );
}

// 3. Append to system preset
const presetAnchor = "{ role: 'system', content: presets[systemPreset] || presets.general },";
if (!chatJs.includes('customInstructions ?')) {
  chatJs = chatJs.replace(
    presetAnchor,
    "{ role: 'system', content: (presets[systemPreset] || presets.general) + (customInstructions ? '\\n\\nCustom Instructions:\\n' + customInstructions : '') },"
  );
}

// 4. Update the sidebar footer (replace the whole sidebar-footer)
const sidebarFooterRegex = /<div className="sidebar-footer">[\s\S]*?<\/div>\n\s*<\/div>/;
const sidebarFooterStart = `<div className="sidebar-footer">`;
const sidebarFooterEnd = `</div>\n          </aside>`;
const startIndex = chatJs.indexOf(sidebarFooterStart);
const endIndex = chatJs.indexOf(sidebarFooterEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newFooter = `<div className="sidebar-footer" style={{ position: 'relative' }}>
            <div 
              className="user-info" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '8px', background: showProfileMenu ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.2s' }}
            >
              <div className="user-avatar">{userInitial}</div>
              <span className="user-email" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'User'}</span>
            </div>
            
            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <div className="plan-badge">Harikson Pro</div>
                  <div className="email-full">{user?.email}</div>
                </div>
                <div className="profile-menu-divider"></div>
                <button className="profile-menu-item" onClick={() => { setShowProfileMenu(false); setShowSettingsModal(true); }}>
                  <Zap size={14} /> Settings
                </button>
                <button className="profile-menu-item" onClick={() => { setShowProfileMenu(false); alert('Clear all conversations not yet linked to backend API'); }}>
                  <X size={14} /> Clear all conversations
                </button>
                <div className="profile-menu-divider"></div>
                <button className="profile-menu-item" onClick={handleLogout}>
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        </aside>

        {showSettingsModal && (
          <div className="settings-modal-overlay">
            <div className="settings-modal">
              <div className="settings-modal-header">
                <h2>Settings</h2>
                <button onClick={() => setShowSettingsModal(false)}><X size={20} /></button>
              </div>
              <div className="settings-modal-body">
                <h3>Custom Instructions</h3>
                <p>What would you like Harikson to know about you to provide better responses?</p>
                <textarea 
                  value={customInstructions}
                  onChange={(e) => {
                    setCustomInstructions(e.target.value);
                    localStorage.setItem('harikson_custom_instructions', e.target.value);
                  }}
                  placeholder="e.g. Always respond in Spanish, or I am a frontend developer..."
                  rows={6}
                />
              </div>
            </div>
          </div>
        )}`;
        
  chatJs = chatJs.substring(0, startIndex) + newFooter + chatJs.substring(endIndex + `</aside>`.length);
}

fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
