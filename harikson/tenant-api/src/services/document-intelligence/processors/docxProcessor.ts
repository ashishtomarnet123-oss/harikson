import mammoth from 'mammoth';
import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure, DocumentSection, DocumentTable } from '../types.js';

export class DocxProcessor implements DocumentProcessor {
  supports(extension: string, mimeType?: string): boolean {
    return (
      extension === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  async process(
    buffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<{
    fullText: string;
    structure: DocumentStructure;
    metadata: Partial<DocumentMetadata>;
  }> {
    // 1. Extract structured HTML and clean raw text
    const [rawTextResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);

    const rawText = rawTextResult.value || '';
    const html = htmlResult.value || '';

    // 2. Parse HTML structure into sections and headings
    const sections: DocumentSection[] = [];
    const tables: DocumentTable[] = [];

    // Extract tables from HTML
    const tableRegex = /<table>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;
    let tableIdx = 1;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const rows: string[][] = [];
      const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowContent = rowMatch[1];
        const cells: string[] = [];
        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        let cellMatch: RegExpExecArray | null;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length > 0) rows.push(cells);
      }

      if (rows.length > 0) {
        tables.push({
          name: `Table ${tableIdx++}`,
          headers: rows[0] || [],
          rows: rows.slice(1),
          totalRows: rows.length - 1,
          totalColumns: rows[0]?.length || 0,
        });
      }
    }

    // Extract headings and sections
    const headingSplitRegex = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)/gi;
    const parts = html.split(headingSplitRegex);

    let currentTitle = 'Document Overview';
    let currentLevel = 1;
    let currentContent = '';

    for (const part of parts) {
      const headingMatch = part.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
      if (headingMatch) {
        if (currentContent.trim()) {
          sections.push({
            title: currentTitle,
            level: currentLevel,
            content: this.cleanHtml(currentContent),
          });
        }
        currentLevel = parseInt(headingMatch[1], 10);
        currentTitle = headingMatch[2].replace(/<[^>]+>/g, '').trim() || `Section ${sections.length + 1}`;
        currentContent = '';
      } else {
        currentContent += part;
      }
    }

    if (currentContent.trim() || sections.length === 0) {
      sections.push({
        title: currentTitle,
        level: currentLevel,
        content: this.cleanHtml(currentContent) || rawText,
      });
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    // Estimate page count for DOCX (~350 words per page average)
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 350));

    const structure: DocumentStructure = {
      sections,
      tables,
    };

    return {
      fullText: rawText,
      structure,
      metadata: {
        pageCount: estimatedPages,
        wordCount,
        tablesCount: tables.length,
        imagesCount: 0,
        title: filename.replace(/\.docx$/i, ''),
      },
    };
  }

  private cleanHtml(htmlStr: string): string {
    return htmlStr
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}
