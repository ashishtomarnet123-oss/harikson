import React from 'react';
import { FileText, Bug, BrainCircuit } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   Clipboard helper - navigator.clipboard is only defined in
   secure contexts (HTTPS or localhost). Fall back to textarea
──────────────────────────────────────────────────────────── */
export function copyToClipboard(text) {
  if (typeof window !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('Document is undefined'));
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) resolve();
      else reject(new Error('document.execCommand(copy) returned false'));
    } catch (err) {
      document.body.removeChild(textArea);
      reject(err);
    }
  });
}

export function extractUserVisibleText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<uploaded_file[\s\S]*?<\/uploaded_file>/gi, '')
    .replace(/<uploaded_file[^>]*>[\s\S]*$/gi, '')
    .replace(/<uploaded_file[^>]*$/gi, '')
    .replace(/\[Attached (?:Image|Document):\s*"[^"]*"\]/gi, '')
    .replace(/\[Attached (?:Image|Document):[^\]]*$/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function formatConversationTitle(title) {
  if (!title || typeof title !== 'string') return 'New Conversation';
  const trimmed = title.trim();
  if (!trimmed || trimmed === 'New Conversation' || trimmed === 'New Chat') return 'New Conversation';

  if (
    trimmed.includes('<uploaded_file') ||
    trimmed.includes('</uploaded_file>') ||
    trimmed.startsWith('<uploaded_') ||
    trimmed.includes('[Attached') ||
    trimmed.includes('name="') ||
    trimmed.includes('undefined') ||
    trimmed.includes('null') ||
    trimmed.includes('[object Object]') ||
    /^<[^>]+(\.\.\.)?$/.test(trimmed)
  ) {
    const nameMatch = trimmed.match(/name="([^"]+)/i) || trimmed.match(/\[Attached (?:Document|Image):\s*"([^"]+)/i);
    if (nameMatch && nameMatch[1]) {
      let clean = nameMatch[1]
        .replace(/\.\.\.$/, '')
        .replace(/_\d{10,14}/g, '')
        .replace(/\s*\(\d+\)/g, '')
        .replace(/\.[a-zA-Z0-9]{2,5}$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      if (clean) {
        clean = clean
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        return clean.length > 36 ? clean.substring(0, 36) : clean;
      }
    }
    return 'Document Analysis';
  }

  return trimmed.length > 50 ? trimmed.substring(0, 50).trim() : trimmed;
}

export function generateClientTitle(text, files) {
  const cleanPrompt = extractUserVisibleText(text);

  // 1. Hindi / Devanagari Detection
  if (/[\u0900-\u097F]/.test(cleanPrompt)) {
    if (cleanPrompt.includes('कुंडली') || cleanPrompt.includes('कुण्डली')) return 'कुंडली विश्लेषण';
    if (cleanPrompt.includes('अलविदा')) return 'अलविदा संदेश';
    if (cleanPrompt.includes('रणनीति') || cleanPrompt.includes('स्ट्रेटेजी')) return 'बिजनेस रणनीति';
    if (cleanPrompt.includes('विश्लेषण')) return 'डॉक्यूमेंट विश्लेषण';
    if (cleanPrompt.includes('योजना') || cleanPrompt.includes('प्लान')) return 'दैनिक योजना';
    const words = cleanPrompt.split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
    return (words.length > 36 ? words.substring(0, 36) : words).trim();
  }

  // 2. URLs
  const urlMatch = cleanPrompt.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+\.[a-z]{2,})/i);
  if (urlMatch) {
    const domain = urlMatch[1].split('.')[0];
    const cap = domain.charAt(0).toUpperCase() + domain.slice(1);
    const low = cleanPrompt.toLowerCase();
    if (low.includes('analy') || low.includes('review') || low.includes('audit')) return `${cap} Business Analysis`;
    if (low.includes('seo') || low.includes('visibility') || low.includes('google')) return `${cap} SEO Strategy`;
    return `${cap} Overview`;
  }

  // 3. Keywords & Specific Intent
  const low = cleanPrompt.toLowerCase();

  if ((low.includes('redesign') && low.includes('mobile chat')) || low.includes('mobile chat interface') || low.includes('mobile chat ui')) {
    return 'Xarwiz Mobile Chat UI';
  }
  if (low.includes('digital marketing') && (low.includes('launch') || low.includes('plan'))) {
    return 'Digital Marketing Launch Plan';
  }
  if (low.includes('financial report') && (low.includes('analy') || low.includes('summar'))) {
    return 'Financial Report Analysis';
  }
  if ((low.includes('code error') || low.includes('debug')) && (low.includes('explain') || low.includes('troubleshoot') || low.includes('fix'))) {
    return 'Code Error Troubleshooting';
  }

  // Attachment-Aware Intent Combinations
  if (Array.isArray(files) && files.length > 0) {
    const f = files[0];
    const rawName = f.name || '';
    if (f.type?.includes('presentation') || rawName.match(/\.(pptx|ppt)$/i)) {
      if (low.includes('review') || low.includes('feedback') || low.includes('check')) return 'Presentation Review';
    }
    if (f.type?.includes('code') || rawName.match(/\.(js|ts|py|sql|html|css|json)$/i)) {
      if (low.includes('debug') || low.includes('error') || low.includes('fix') || low.includes('review')) return 'Code Debugging';
    }
    if (rawName.toLowerCase().includes('financial') || rawName.toLowerCase().includes('report') || f.type?.includes('csv') || rawName.match(/\.(xlsx|xls|csv)$/i)) {
      if (low.includes('analy') || low.includes('summar') || low.includes('overview')) return 'Financial Report Analysis';
    }
  }

  if (low.includes('marketing') && low.includes('strategy')) {
    return low.includes('xarwiz') ? 'Xarwiz Marketing Strategy' : 'Marketing Strategy Planning';
  }
  if (low.includes('audit') && (low.includes('code') || low.includes('security'))) return 'Code Security Audit';
  if (low.includes('quantum') && low.includes('comput')) return 'Understanding Quantum Computing';
  if (low.includes('thailand') && (low.includes('trip') || low.includes('plan'))) return 'Thailand Trip Planning';
  if (low.includes('visibility') || low.includes('seo')) return 'Google Visibility Strategy';
  if (low.includes('email') && (low.includes('write') || low.includes('draft'))) {
    if (low.includes('bank')) return 'Bank Email Draft';
    if (low.includes('client')) return 'Client Email Draft';
    return 'Professional Email Draft';
  }
  if (low.includes('risk') && (low.includes('contract') || low.includes('legal'))) return 'Contract Risk Review';
  if (low.includes('sales') && (low.includes('analy') || low.includes('trend'))) return 'Monthly Sales Analysis';
  if (low.includes('screenshot') || (low.includes('image') && low.includes('explain'))) return 'Screenshot Analysis';
  if (low.includes('analyze this document') || low.includes('analyze document') || low.includes('analyze report')) return 'Document Analysis';

  // 4. Attachments Present
  if (Array.isArray(files) && files.length > 0) {
    const f = files[0];
    const rawName = f.name || '';
    let clean = rawName
      .replace(/_\d{10,14}/g, '')
      .replace(/\s*\(\d+\)/g, '')
      .replace(/\.[a-zA-Z0-9]{2,5}$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (clean) {
      clean = clean
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      if (clean.length <= 32 && clean !== 'Document') return `${clean}`;
    }
    if (rawName.toLowerCase().endsWith('.pdf')) return 'PDF Document Analysis';
    if (/\.(xlsx|xls|csv)$/i.test(rawName)) return 'Spreadsheet Analysis';
    if (/\.(png|jpe?g|webp)$/i.test(rawName)) return 'Image Analysis';
    return 'Document Analysis';
  }

  // 5. General Clean Text
  if (cleanPrompt) {
    let candidate = cleanPrompt;
    while (/^(?:can you|could you|please|i want you to|help me|tell me about|explain|write|generate|give me a|give me an|how to|what is|what are)\s+/i.test(candidate)) {
      candidate = candidate.replace(/^(?:can you|could you|please|i want you to|help me|tell me about|explain|write|generate|give me a|give me an|how to|what is|what are)\s+/i, '').trim();
    }
    candidate = candidate.replace(/[?!.:,;]+$/, '').trim();
    const words = candidate.split(/\s+/).filter(Boolean).slice(0, 5);
    if (words.length > 0) {
      return words
        .map((w, idx) => {
          const l = w.toLowerCase();
          if (idx > 0 && ['a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'on', 'at', 'to'].includes(l)) return l;
          return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(' ');
    }
  }

  return 'New Conversation';
}

export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const num = Number(bytes);
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function parseUploadedFiles(text) {
  if (!text) return [];
  const results = [];
  const regex = /<uploaded_file(?:\s+([^>]*))?>([\s\S]*?)<\/uploaded_file>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const attrStr = match[1] || '';
    const content = match[2]?.trim() || '';
    const name = attrStr.match(/name="([^"]+)"/)?.[1] || 'Attachment';
    let type = attrStr.match(/type="([^"]+)"/)?.[1] || '';
    let size = attrStr.match(/size="([^"]+)"/)?.[1] || '';
    let pages = attrStr.match(/pages="([^"]+)"/)?.[1] || '';
    const documentId = attrStr.match(/documentId="([^"]+)"/)?.[1] || '';
    const dataUrl = attrStr.match(/dataUrl="([^"]+)"/)?.[1] || '';

    if (!pages) {
      const pageMatch = content.match(/\((\d+)\s+pages/i);
      if (pageMatch) pages = pageMatch[1];
    }
    if (!type) {
      if (name.match(/\.pdf$/i)) type = 'application/pdf';
      else if (name.match(/\.(xlsx|xls|csv)$/i)) type = 'text/csv';
      else if (name.match(/\.(docx|doc)$/i)) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (name.match(/\.(pptx|ppt)$/i)) type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) type = 'image/png';
    }

    results.push({ name, type, size, pages, documentId, dataUrl, content });
  }
  if (results.length === 0) {
    const legacyImgRegex = /\[Attached Image:\s*"([^"]+)"\]/g;
    while ((match = legacyImgRegex.exec(text)) !== null) {
      results.push({ name: match[1], type: 'image/png', size: '', pages: '', documentId: '', dataUrl: '', content: '' });
    }
    const legacyDocRegex = /\[Attached Document:\s*"([^"]+)"\]/g;
    while ((match = legacyDocRegex.exec(text)) !== null) {
      const docName = match[1];
      const isPdfDoc = docName.match(/\.pdf$/i);
      results.push({ name: docName, type: isPdfDoc ? 'application/pdf' : 'application/octet-stream', size: '', pages: isPdfDoc ? '1' : '', documentId: '', dataUrl: '', content: '' });
    }
  }
  return results;
}

export function maskModelName(rawModel) {
  if (!rawModel) return 'Xarwiz Plus';
  const m = String(rawModel).toLowerCase();
  if (m.includes('70b') || m.includes('72b') || m.includes('65b')) return 'Xarwiz Ultra-70B';
  if (m.includes('32b') || m.includes('34b') || m.includes('30b')) return 'Xarwiz Pro-32B';
  if (m.includes('14b') || m.includes('13b')) return 'Xarwiz Plus-14B';
  if (m.includes('8b') || m.includes('7b') || m.includes('6b')) return 'Xarwiz Plus-8B';
  if (m.includes('3b') || m.includes('2b') || m.includes('1b')) return 'Xarwiz Plus-8B';
  if (m.includes('deepseek')) return 'Xarwiz Plus-14B';
  if (m.includes('codellama') || m.includes('codegemma')) return 'Xarwiz Code';
  if (m.includes('qwen') || m.includes('llama') || m.includes('mistral') ||
      m.includes('mixtral') || m.includes('gemma') || m.includes('phi')) return 'Xarwiz Plus-8B';
  if (m.startsWith('harikson-plus') || m.startsWith('xarwiz-plus')) return 'Xarwiz Plus · 8B';
  if (m.startsWith('harikson-max') || m.startsWith('xarwiz-max')) return 'Xarwiz Max · 14B';
  return 'Xarwiz Plus';
}

export function groupConversationsByDate(convList) {
  if (!convList || !convList.length) return [];
  const groups = {
    today: [],
    yesterday: [],
    last7Days: [],
    last30Days: [],
    older: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7Days = startOfToday - 7 * 86400000;
  const startOf30Days = startOfToday - 30 * 86400000;

  for (const conv of convList) {
    const time = conv.updated_at
      ? new Date(conv.updated_at).getTime()
      : (conv.created_at ? new Date(conv.created_at).getTime() : 0);
    if (time >= startOfToday) {
      groups.today.push(conv);
    } else if (time >= startOfYesterday) {
      groups.yesterday.push(conv);
    } else if (time >= startOf7Days) {
      groups.last7Days.push(conv);
    } else if (time >= startOf30Days) {
      groups.last30Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  }

  const sections = [];
  if (groups.today.length) sections.push({ title: 'Today', items: groups.today });
  if (groups.yesterday.length) sections.push({ title: 'Yesterday', items: groups.yesterday });
  if (groups.last7Days.length) sections.push({ title: 'Previous 7 Days', items: groups.last7Days });
  if (groups.last30Days.length) sections.push({ title: 'Previous 30 Days', items: groups.last30Days });
  if (groups.older.length) sections.push({ title: 'Older', items: groups.older });

  if (sections.length === 0 && convList.length > 0) {
    sections.push({ title: 'Recent', items: convList });
  }

  return sections;
}

export const SLASH_COMMANDS = [
  {
    id: 'report',
    icon: <FileText size={18} />,
    title: 'Executive Report',
    desc: 'Draft a structured professional report',
    prompt: 'Draft a comprehensive executive report on ',
  },
  {
    id: 'code',
    icon: '</>',
    title: 'Write Code',
    desc: 'Generate a code snippet or component',
    prompt: 'Write the code for a ',
  },
  {
    id: 'summarize',
    icon: <FileText size={18} />,
    title: 'Summarize',
    desc: 'Summarize text or meeting notes',
    prompt: 'Summarize the following: \n',
  },
  {
    id: 'debug',
    icon: <Bug size={18} />,
    title: 'Debug',
    desc: 'Find bugs in my code',
    prompt: 'Debug this code and explain the fixes: \n',
  },
  {
    id: 'explain',
    icon: <BrainCircuit size={18} />,
    title: 'Explain',
    desc: 'Explain a complex concept simply',
    prompt: 'Explain this concept to me as if I were a beginner: ',
  },
];

