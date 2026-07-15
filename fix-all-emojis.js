const fs = require('fs');
let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const importAnchor =
  "import { Mic, Paperclip, ArrowUp, Square, Globe, BrainCircuit, Maximize2, TriangleAlert, Bot, Search, Image as ImageIcon } from 'lucide-react';";
if (!chatJs.includes('Copy,')) {
  chatJs = chatJs.replace(
    importAnchor,
    importAnchor +
      "\nimport { Copy, Check, Zap, Plus, Edit3, X, LogOut, Link, Rocket, ShieldCheck, FolderUp, Folder } from 'lucide-react';"
  );
}

// Sidebar
chatJs = chatJs.replace(
  '<div className="sidebar-logo-icon">⚡</div>',
  '<div className="sidebar-logo-icon"><Zap size={20} color="var(--accent)" /></div>'
);
chatJs = chatJs.replace('<span>＋</span>', '<Plus size={16} />');
chatJs = chatJs.replace('>✎</button>', '><Edit3 size={14} /></button>');
chatJs = chatJs.replace('>✕</button>', '><X size={14} /></button>');
chatJs = chatJs.replace('>⎋</button>', '><LogOut size={16} /></button>');

// Main area top bar
chatJs = chatJs.replace(
  '<span>🔗</span> Share',
  '<span style={{marginRight: "6px"}}><Link size={14} /></span> Share'
);

// Empty state
chatJs = chatJs.replace(
  '<div className="messages-empty-icon">⚡</div>',
  '<div className="messages-empty-icon"><Zap size={40} color="var(--accent)" /></div>'
);
chatJs = chatJs.replace(
  '<div className="suggestion-icon">🚀</div>',
  '<div className="suggestion-icon"><Rocket size={24} color="var(--accent)" /></div>'
);
chatJs = chatJs.replace(
  '<div className="suggestion-icon">🛡️</div>',
  '<div className="suggestion-icon"><ShieldCheck size={24} color="var(--accent)" /></div>'
);
chatJs = chatJs.replace(
  '<div className="suggestion-icon">⚡</div>',
  '<div className="suggestion-icon"><Zap size={24} color="var(--accent)" /></div>'
);
chatJs = chatJs.replace(
  '<div className="suggestion-icon">📂</div>',
  '<div className="suggestion-icon"><Folder size={24} color="var(--accent)" /></div>'
);

// Avatars
chatJs = chatJs.replace(
  '<div className="assistant-avatar">⚡</div>',
  '<div className="assistant-avatar"><Zap size={16} color="white" /></div>'
);
chatJs = chatJs.replace(
  '<div className="thinking-avatar">⚡</div>',
  '<div className="thinking-avatar"><Zap size={16} color="white" /></div>'
);

// Artifact pane
chatJs = chatJs.replace(
  "{copied ? '✓ Copied' : '⧉ Copy'}",
  '{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}'
);
chatJs = chatJs.replace('>⧉</button>', '><Copy size={14} /></button>');

// Fix another ✕
chatJs = chatJs.replace(
  'onClick={() => setActiveArtifact(null)}>✕</button>',
  'onClick={() => setActiveArtifact(null)}><X size={14} /></button>'
);
chatJs = chatJs.replace(
  'onClick={() => removeAttachedFile(i)}>✕</button>',
  'onClick={() => removeAttachedFile(i)}><X size={14} /></button>'
);

// Drag drop
chatJs = chatJs.replace(
  '<div className="drag-drop-icon">📂</div>',
  '<div className="drag-drop-icon"><FolderUp size={48} color="var(--accent)" /></div>'
);

fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
