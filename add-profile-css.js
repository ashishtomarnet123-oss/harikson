const fs = require('fs');

let css = fs.readFileSync('user-portal/styles/globals.css', 'utf8');

const newCss = `
/* Profile Menu */
.profile-menu {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 10px;
  width: calc(100% - 20px);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 8px 0;
  z-index: 100;
  animation: slideUpFade 0.2s ease-out forwards;
}
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.profile-menu-header {
  padding: 8px 16px;
}
.plan-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.email-full {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.profile-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}
.profile-menu-item {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13.5px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all var(--transition);
}
.profile-menu-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Settings Modal */
.settings-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.settings-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 600px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: slideUpFade 0.2s ease-out forwards;
}
.settings-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}
.settings-modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.settings-modal-header button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition);
}
.settings-modal-header button:hover {
  color: var(--text-primary);
}
.settings-modal-body {
  padding: 24px;
}
.settings-modal-body h3 {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.settings-modal-body p {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--text-muted);
}
.settings-modal-body textarea {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition);
}
.settings-modal-body textarea:focus {
  border-color: var(--accent);
}
`;

if (!css.includes('.settings-modal-overlay')) {
  fs.writeFileSync('user-portal/styles/globals.css', css + newCss, 'utf8');
}
