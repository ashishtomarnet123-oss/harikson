import { useState } from 'react';

function downloadBlob(content, filename, contentType) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function usePdfExport({ apiBase, authHeaders, activeConvId, activeTitle, messages }) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingMsgIdx, setExportingMsgIdx] = useState(null);
  const [downloadedMsgIdx, setDownloadedMsgIdx] = useState(null);

  const exportMessageAsPDF = async (msgText, idx) => {
    if (!msgText || exportingMsgIdx !== null) return;
    setExportingMsgIdx(idx);

    try {
      const res = await fetch(`${apiBase}/api/pdf/export`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          markdown: msgText,
          title: activeTitle || 'Xarwiz AI Analysis',
          filename: `xarwiz_analysis_${idx + 1}`,
          options: {
            theme: 'corporate',
            includeCoverPage: msgText.length > 2500,
            includeHeaderFooter: true,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to export message as PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xarwiz_analysis_${idx + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setDownloadedMsgIdx(idx);
      setTimeout(() => setDownloadedMsgIdx(null), 2500);
    } catch (err) {
      console.error('Message PDF export failed:', err);
      alert('Failed to generate PDF for this message.');
    } finally {
      setExportingMsgIdx(null);
    }
  };

  const exportAsPDF = async (theme = 'corporate', includeCover = true) => {
    if (messages.length === 0 || exportingPdf) return;
    setExportingPdf(true);
    setShowExportMenu(false);

    try {
      if (activeConvId && !activeConvId.startsWith('conv_')) {
        const res = await fetch(
          `${apiBase}/api/v1/chat/conversations/${activeConvId}/export/pdf?cover=${includeCover}&theme=${theme}&download=true`,
          {
            headers: authHeaders(),
            credentials: 'include',
          }
        );
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeTitle = (activeTitle || 'Xarwiz_Report').replace(/[^a-zA-Z0-9._-]/g, '_');
          a.download = `${safeTitle}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        }
      }

      const chatMessages = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text || '',
      }));

      const res = await fetch(`${apiBase}/api/pdf/export`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          messages: chatMessages,
          title: activeTitle || 'Xarwiz AI Intelligence Session',
          filename: (activeTitle || 'xarwiz_chat').replace(/[^a-zA-Z0-9._-]/g, '_'),
          options: {
            theme,
            includeCoverPage: includeCover,
            includeHeaderFooter: true,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to export PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(activeTitle || 'xarwiz_chat').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportAsMarkdown = () => {
    if (messages.length === 0) return;
    const chatTitle = activeTitle || 'Xarwiz AI Conversation';
    let md = `# ${chatTitle}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    messages.forEach((m) => {
      const sender = m.sender === 'user' ? '### 👤 User' : '### 🤖 Xarwiz AI';
      md += `${sender}\n\n${m.text || ''}\n\n---\n\n`;
    });

    downloadBlob(
      md,
      `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`,
      'text/markdown'
    );
    setShowExportMenu(false);
  };

  const exportAsJSON = () => {
    if (messages.length === 0) return;
    const chatTitle = activeTitle || 'Xarwiz AI Conversation';
    const payload = {
      title: chatTitle,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        files: m.files || [],
      })),
    };

    downloadBlob(
      JSON.stringify(payload, null, 2),
      `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`,
      'application/json'
    );
    setShowExportMenu(false);
  };

  return {
    exportingPdf,
    showExportMenu,
    setShowExportMenu,
    exportAsPDF,
    exportAsMarkdown,
    exportAsJSON,
    exportMessageAsPDF,
    exportingMsgIdx,
    downloadedMsgIdx,
  };
}
