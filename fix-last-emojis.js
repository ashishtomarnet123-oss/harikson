const fs = require('fs');
let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const importAnchor = "import { Copy, Check, Zap, Plus, Edit3, X, LogOut, Link, Rocket, ShieldCheck, FolderUp, Folder } from 'lucide-react';";
if (!chatJs.includes('Bug,')) {
  chatJs = chatJs.replace(
    importAnchor,
    importAnchor.replace("} from 'lucide-react';", ", Bug, FileText } from 'lucide-react';")
  );
}

chatJs = chatJs.replace("icon: '📝'", "icon: <FileText size={18} />");
chatJs = chatJs.replace("icon: '🐛'", "icon: <Bug size={18} />");

fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
