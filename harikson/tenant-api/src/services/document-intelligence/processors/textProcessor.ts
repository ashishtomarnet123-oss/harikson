import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure, DocumentSection } from '../types.js';

export class TextProcessor implements DocumentProcessor {
  supports(extension: string): boolean {
    const exts = ['txt', 'md', 'json', 'xml', 'log', 'rtf', 'yaml', 'yml'];
    return exts.includes(extension.toLowerCase());
  }

  async process(
    buffer: Buffer,
    filename: string
  ): Promise<{
    fullText: string;
    structure: DocumentStructure;
    metadata: Partial<DocumentMetadata>;
  }> {
    const rawText = buffer.toString('utf-8');
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const sections: DocumentSection[] = [];

    if (ext === 'md') {
      // Split markdown by headings
      const headingParts = rawText.split(/(^#{1,4}\s+.+$)/m);
      let currentTitle = 'Document Overview';
      let currentContent = '';

      for (let i = 0; i < headingParts.length; i++) {
        const part = headingParts[i];
        if (part.startsWith('#')) {
          if (currentContent.trim()) {
            sections.push({
              title: currentTitle,
              level: 1,
              content: currentContent.trim(),
            });
          }
          currentTitle = part.replace(/^#+\s*/, '').trim();
          currentContent = '';
        } else {
          currentContent += part;
        }
      }

      if (currentContent.trim() || sections.length === 0) {
        sections.push({
          title: currentTitle,
          level: 1,
          content: currentContent.trim() || rawText,
        });
      }
    } else if (ext === 'json') {
      try {
        const obj = JSON.parse(rawText);
        const keys = Object.keys(obj);
        sections.push({
          title: `JSON Schema (${keys.length} root keys)`,
          level: 1,
          content: `Root keys: ${keys.join(', ')}\n\n` + rawText.substring(0, 3000),
        });
      } catch {
        sections.push({ title: 'JSON Content', level: 1, content: rawText });
      }
    } else if (ext === 'log') {
      const lines = rawText.split('\n');
      const errorLines = lines.filter((l) => /error|fatal|exception|warn/i.test(l));
      sections.push({
        title: `Log Summary (${errorLines.length} warnings/errors detected)`,
        level: 1,
        content: errorLines.slice(0, 50).join('\n') || rawText.substring(0, 3000),
      });
    } else {
      sections.push({
        title: 'Document Content',
        level: 1,
        content: rawText,
      });
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 400));

    return {
      fullText: rawText,
      structure: {
        sections,
        headings: sections.map((s) => ({ text: s.title, level: s.level || 1, pageNumber: s.pageNumber })),
      },
      metadata: {
        pageCount: estimatedPages,
        wordCount,
        tablesCount: 0,
        imagesCount: 0,
        title: filename,
      },
    };
  }
}
