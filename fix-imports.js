const fs = require('fs');
let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const headImport = "import Head from 'next/head';";
if (!chatJs.includes('lucide-react')) {
  chatJs = chatJs.replace(
    headImport,
    headImport +
      "\nimport { Mic, Paperclip, ArrowUp, Square, Globe, BrainCircuit, Maximize2, TriangleAlert, Bot, Search, Image as ImageIcon, Copy, Check, Zap, Plus, Edit3, X, LogOut, Link, Rocket, ShieldCheck, FolderUp, Folder, Bug, FileText } from 'lucide-react';"
  );
  fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
}
