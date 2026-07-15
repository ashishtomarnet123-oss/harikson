const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, 'user-portal/pages/chat.js');
let content = fs.readFileSync(chatPath, 'utf8');

// The multi_replace_file_content tried to inject SettingsModal at the bottom but failed.
// Let's manually inject it before the last </div></div></div>
content = content.replace(
  /          <\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n}/g,
  `          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        initialTab="profile"
      />
    </div>
  );
}`
);

// Also the first replacement for profile-menu didn't apply as intended, let's fix it.
content = content.replace(
  /<button \n                className="profile-menu-item"\n                onClick=\{\(\) => router.push\('\/settings\/profile'\)\}\n              >/g,
  `<button 
                className="profile-menu-item"
                onClick={() => {
                  setShowSettingsModal(true);
                  setShowProfileMenu(false);
                }}
              >`
);

fs.writeFileSync(chatPath, content);
console.log('Updated chat.js');
