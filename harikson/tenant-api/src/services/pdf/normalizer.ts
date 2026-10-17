import {
  DocumentModel,
  DocumentBlock,
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  TableBlock,
  CalloutBlock,
  CodeBlock,
  DividerBlock,
  PageBreakBlock,
  DocumentMetadata,
  CalloutType,
} from './types.js';

export class ContentNormalizer {
  /**
   * Main entry point: normalizes arbitrary input (Markdown, text, structured JSON, or Chat)
   */
  public static normalize(
    input: string | Partial<DocumentModel> | { messages: any[]; title?: string },
    options: {
      defaultTitle?: string;
      metadata?: DocumentMetadata;
      theme?: any;
      pageSize?: any;
      includeCoverPage?: boolean;
      includeTableOfContents?: boolean;
      includeHeaderFooter?: boolean;
      confidentiality?: any;
    } = {}
  ): DocumentModel {
    // 1. If input is a chat conversation
    if (typeof input === 'object' && input !== null && 'messages' in input && Array.isArray((input as any).messages)) {
      return this.fromChatConversation(input as any, options);
    }

    // 2. If input is already a DocumentModel or structured object with blocks
    if (typeof input === 'object' && input !== null && 'blocks' in input && Array.isArray((input as any).blocks)) {
      return {
        title: (input as any).title || options.defaultTitle || 'Xarwiz Document',
        subtitle: (input as any).subtitle,
        metadata: { ...options.metadata, ...(input as any).metadata },
        theme: (input as any).theme || options.theme || 'corporate',
        pageSize: (input as any).pageSize || options.pageSize || 'A4',
        includeCoverPage: (input as any).includeCoverPage ?? options.includeCoverPage ?? false,
        includeTableOfContents: (input as any).includeTableOfContents ?? options.includeTableOfContents ?? false,
        includeHeaderFooter: (input as any).includeHeaderFooter ?? options.includeHeaderFooter ?? true,
        blocks: (input as any).blocks,
      };
    }

    // 3. Otherwise treat as Markdown / plain-text string
    const rawMarkdown = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
    return this.fromMarkdown(rawMarkdown, options);
  }

  /**
   * Parse Markdown text into structured DocumentBlocks
   */
  public static fromMarkdown(
    markdown: string,
    options: {
      defaultTitle?: string;
      metadata?: DocumentMetadata;
      theme?: any;
      pageSize?: any;
      includeCoverPage?: boolean;
      includeTableOfContents?: boolean;
      includeHeaderFooter?: boolean;
    } = {}
  ): DocumentModel {
    const cleanMd = this.sanitizeInput(markdown || '');
    const lines = cleanMd.split(/\r?\n/);
    const blocks: DocumentBlock[] = [];

    let detectedTitle = options.defaultTitle || '';
    let detectedSubtitle = '';

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip blank lines
      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Explicit Page Breaks
      if (
        trimmed === '<!-- pagebreak -->' ||
        trimmed === '<!-- page-break -->' ||
        trimmed === '\\pagebreak' ||
        trimmed === '[pagebreak]'
      ) {
        blocks.push({ type: 'pagebreak' });
        i++;
        continue;
      }

      // 2. Horizontal Divider
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
        blocks.push({ type: 'divider' });
        i++;
        continue;
      }

      // 3. Fenced Code Blocks (```lang ... ```)
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length && lines[i].trim().startsWith('```')) {
          i++; // Skip closing ```
        }
        blocks.push({
          type: 'code',
          language: lang || undefined,
          code: codeLines.join('\n'),
        });
        continue;
      }

      // 4. Markdown Headings (# H1 to ###### H6)
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const text = this.cleanInlineMarkdown(headingMatch[2].trim());

        if (level === 1 && !detectedTitle) {
          detectedTitle = text;
        } else {
          blocks.push({
            type: 'heading',
            level,
            text,
            id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        }
        i++;
        continue;
      }

      // 5. Blockquotes and GitHub-style Callouts (> [!NOTE], > [!WARNING], > Quote)
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        let calloutType: CalloutType = 'quote';
        let calloutTitle: string | undefined = undefined;

        while (i < lines.length && lines[i].trim().startsWith('>')) {
          let qLine = lines[i].trim().replace(/^>\s?/, '');
          
          // Check for GitHub alert syntax in first line: > [!NOTE], > [!WARNING], etc.
          const alertMatch = qLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|SUCCESS)\]\s*(.*)$/i);
          if (alertMatch) {
            const rawType = alertMatch[1].toUpperCase();
            if (rawType === 'NOTE' || rawType === 'INFO') calloutType = 'info';
            else if (rawType === 'TIP' || rawType === 'SUCCESS') calloutType = 'tip';
            else if (rawType === 'WARNING' || rawType === 'CAUTION' || rawType === 'IMPORTANT') calloutType = 'warning';
            calloutTitle = alertMatch[2] || rawType;
            i++;
            continue;
          }

          quoteLines.push(qLine);
          i++;
        }

        blocks.push({
          type: 'callout',
          calloutType,
          title: calloutTitle,
          text: this.cleanInlineMarkdown(quoteLines.join(' ')),
        });
        continue;
      }

      // 6. GFM Tables (| Col1 | Col2 |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parsedTable = this.parseMarkdownTable(tableLines);
          if (parsedTable) {
            blocks.push(parsedTable);
            continue;
          }
        }
      }

      // 7. Lists (Unordered, Ordered, Checklist)
      const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const isOrdered = /^\d+\./.test(listMatch[1]);
        const listItems: { text: string; checked?: boolean; level?: number }[] = [];

        while (i < lines.length) {
          const curLine = lines[i];
          const curTrim = curLine.trim();
          if (!curTrim) break; // End of list on blank line

          const itemMatch = curTrim.match(/^([-*+]|\d+\.)\s+(.+)$/);
          if (!itemMatch) {
            // Continuation line of previous list item
            if (listItems.length > 0) {
              listItems[listItems.length - 1].text += ' ' + this.cleanInlineMarkdown(curTrim);
            }
            i++;
            continue;
          }

          let itemText = itemMatch[2];
          let checked: boolean | undefined = undefined;

          // Checklist detection: [ ] or [x]
          const checkMatch = itemText.match(/^\[([ xX])\]\s*(.*)$/);
          if (checkMatch) {
            checked = checkMatch[1].toLowerCase() === 'x';
            itemText = checkMatch[2];
          }

          // Calculate indentation level (2 or 4 spaces = 1 indent)
          const indentMatch = curLine.match(/^(\s*)/);
          const indentSpaces = indentMatch ? indentMatch[1].length : 0;
          const level = Math.min(Math.floor(indentSpaces / 2), 3);

          listItems.push({
            text: this.cleanInlineMarkdown(itemText),
            checked,
            level,
          });
          i++;
        }

        if (listItems.length > 0) {
          blocks.push({
            type: 'list',
            ordered: isOrdered,
            items: listItems,
          });
          continue;
        }
      }

      // 8. Normal Paragraph (accumulate multi-line paragraphs)
      const paraLines: string[] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        const curTrim = curLine.trim();
        if (!curTrim) break;
        // Check if next line starts another block
        if (
          curTrim.startsWith('#') ||
          curTrim.startsWith('```') ||
          curTrim.startsWith('>') ||
          curTrim.startsWith('|') ||
          /^([-*+]|\d+\.)\s+/.test(curTrim) ||
          /^(\*{3,}|-{3,}|_{3,})$/.test(curTrim)
        ) {
          break;
        }
        paraLines.push(curTrim);
        i++;
      }

      if (paraLines.length > 0) {
        const fullPara = this.cleanInlineMarkdown(paraLines.join(' '));
        if (fullPara) {
          blocks.push({
            type: 'paragraph',
            text: fullPara,
          });
        }
      }
    }

    // Default title if still empty
    if (!detectedTitle) {
      detectedTitle = options.defaultTitle || 'Xarwiz Executive Report';
    }

    return {
      title: detectedTitle,
      subtitle: detectedSubtitle || options.metadata?.subtitle,
      metadata: options.metadata,
      theme: options.theme || 'corporate',
      pageSize: options.pageSize || 'A4',
      includeCoverPage: options.includeCoverPage ?? false,
      includeTableOfContents: options.includeTableOfContents ?? false,
      includeHeaderFooter: options.includeHeaderFooter ?? true,
      blocks,
    };
  }

  /**
   * Convert a Chat conversation into a formal document
   */
  public static fromChatConversation(
    chatData: {
      title?: string;
      conversationId?: string;
      model?: string;
      createdAt?: string;
      messages: Array<{
        sender: 'user' | 'bot' | 'assistant';
        text: string;
        model?: string;
        timestamp?: string;
      }>;
    },
    options: {
      defaultTitle?: string;
      theme?: any;
      pageSize?: any;
      includeCoverPage?: boolean;
    } = {}
  ): DocumentModel {
    const title = chatData.title || options.defaultTitle || 'AI Consultation Transcript';
    const blocks: DocumentBlock[] = [];

    // Overview metadata card
    const userMsgCount = chatData.messages.filter(
      (m: any) => m.sender === 'user' || m.role === 'user'
    ).length;
    const aiMsgCount = chatData.messages.length - userMsgCount;

    blocks.push({
      type: 'keyvalue',
      pairs: [
        { label: 'Document Title', value: title },
        { label: 'Date', value: chatData.createdAt || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
        { label: 'Total Inquiries', value: `${userMsgCount} user prompts` },
        { label: 'AI Responses', value: `${aiMsgCount} responses` },
      ],
      columns: 2,
    });

    blocks.push({ type: 'divider' });

    // Format each message turn
    for (let idx = 0; idx < chatData.messages.length; idx++) {
      const msg: any = chatData.messages[idx];
      const isUser = msg.sender === 'user' || msg.role === 'user';
      const msgText = (msg.text || msg.content || '').trim();
      const roleBadge = isUser ? 'USER INQUIRY' : `ASSISTANT (${msg.model || chatData.model || 'Xarwiz Plus'})`;

      blocks.push({
        type: 'heading',
        level: 3,
        text: `${idx + 1}. ${roleBadge}`,
      });

      if (isUser) {
        // User prompt is cleanly quoted
        blocks.push({
          type: 'callout',
          calloutType: 'note',
          text: msgText,
        });
      } else {
        // Assistant output may contain rich Markdown (tables, code, lists)
        const subDoc = this.fromMarkdown(msgText, { defaultTitle: '' });
        blocks.push(...subDoc.blocks);
      }

      if (idx < chatData.messages.length - 1) {
        blocks.push({ type: 'divider' });
      }
    }

    return {
      title,
      subtitle: `Exported Conversation Transcript • ${chatData.messages.length} total messages`,
      metadata: {
        title,
        author: 'Xarwiz AI Platform',
        date: new Date().toISOString(),
        confidentiality: 'Internal',
      },
      theme: options.theme || 'corporate',
      pageSize: options.pageSize || 'A4',
      includeCoverPage: options.includeCoverPage ?? (chatData.messages.length > 8),
      includeTableOfContents: false,
      includeHeaderFooter: true,
      blocks,
    };
  }

  /**
   * Parse GFM Markdown Table
   */
  private static parseMarkdownTable(lines: string[]): TableBlock | null {
    if (lines.length < 2) return null;

    // Header line: | Col 1 | Col 2 |
    const headers = lines[0]
      .split('|')
      .slice(1, -1)
      .map((h) => this.cleanInlineMarkdown(h.trim()));

    // Separator line: |---|:---:|---:|
    const separatorLine = lines[1];
    const sepCols = separatorLine.split('|').slice(1, -1);
    const alignments: ('left' | 'center' | 'right')[] = sepCols.map((c) => {
      const t = c.trim();
      if (t.startsWith(':') && t.endsWith(':')) return 'center';
      if (t.endsWith(':')) return 'right';
      return 'left';
    });

    const rows: string[][] = [];
    for (let r = 2; r < lines.length; r++) {
      const rowCols = lines[r]
        .split('|')
        .slice(1, -1)
        .map((cell) => this.cleanInlineMarkdown(cell.trim()));
      
      // Ensure row has same column count as headers
      while (rowCols.length < headers.length) rowCols.push('');
      rows.push(rowCols.slice(0, headers.length));
    }

    return {
      type: 'table',
      headers,
      rows,
      alignments,
    };
  }

  /**
   * Clean inline Markdown formatting (links, bold, code) for plain typography rendering
   */
  private static cleanInlineMarkdown(text: string): string {
    if (!text) return '';
    return text
      // Convert Markdown links: [Title](url) -> Title (url) or just Title
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      // Strip bold & italic markers: **text** -> text, *text* -> text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Strip inline code backticks: `code` -> code
      .replace(/`([^`]+)`/g, '$1')
      // Strip HTML tags (<br>, <span>, etc.)
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  /**
   * Input security sanitizer
   */
  private static sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:[^\s"']+/gi, '#');
  }
}
