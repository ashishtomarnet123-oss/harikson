import pdf from 'pdf-parse';
import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure } from '../types.js';

export class PdfProcessor implements DocumentProcessor {
  supports(extension: string, mimeType?: string): boolean {
    return extension === 'pdf' || mimeType === 'application/pdf';
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
    const pageTexts: Array<{ pageNumber: number; text: string }> = [];

    // Custom pagerender to capture text per page with page numbers
    const customPagerender = async (pageData: any) => {
      const pageNumber = pageData.pageIndex + 1;
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: true,
        disableCombineTextItems: false,
      });

      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      const cleanText = pageText.trim();
      pageTexts.push({ pageNumber, text: cleanText });
      return `--- Page ${pageNumber} ---\n${cleanText}\n\n`;
    };

    let parsed: any;
    try {
      parsed = await pdf(buffer, { pagerender: customPagerender });
    } catch {
      // Fallback to default pdf parser if pagerender fails
      parsed = await pdf(buffer);
    }

    const pageCount = parsed.numpages || (pageTexts.length > 0 ? pageTexts.length : 1);
    const rawText = parsed.text || '';

    // Check if the PDF has a usable text layer or if it is scanned
    const isScanned = rawText.trim().length < 40 && pageCount >= 1;

    // Detect structural sections and headings (e.g. "1. Introduction", "## Overview", etc.)
    const sections: Array<{ title: string; level: number; pageNumber?: number; content: string }> = [];
    const lines = rawText.split('\n');
    let currentSectionTitle = 'Introduction';
    let currentSectionContent: string[] = [];
    let currentPageNum = 1;

    for (const line of lines) {
      const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPageNum = parseInt(pageMatch[1], 10);
        continue;
      }

      const trimmed = line.trim();
      // Check if line looks like a major section heading
      const isHeading =
        /^(?:[0-9]+(?:\.[0-9]+)*\s+[A-Z][A-Za-z0-9\s]{2,50}|[A-Z\s]{4,40}:?$|#{1,4}\s+.+)$/.test(trimmed) &&
        trimmed.length < 70;

      if (isHeading && currentSectionContent.length > 0) {
        sections.push({
          title: currentSectionTitle,
          level: 1,
          pageNumber: currentPageNum,
          content: currentSectionContent.join('\n').trim(),
        });
        currentSectionTitle = trimmed.replace(/^#+\s*/, '');
        currentSectionContent = [];
      } else {
        currentSectionContent.push(line);
      }
    }

    if (currentSectionContent.length > 0) {
      sections.push({
        title: currentSectionTitle,
        level: 1,
        pageNumber: currentPageNum,
        content: currentSectionContent.join('\n').trim(),
      });
    }

    // Detect tables by pattern (lines containing multiple delimiter spaces or tabular pipes)
    let tablesDetected = 0;
    const tableRegex = /(?:\|.+\|\s*\n\|[-:\s|]+\|\s*\n(?:\|.+\|\s*\n?)+)/g;
    const tableMatches = rawText.match(tableRegex);
    if (tableMatches) {
      tablesDetected = tableMatches.length;
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    const structure: DocumentStructure = {
      pages: pageTexts.length > 0 ? pageTexts : [{ pageNumber: 1, text: rawText }],
      sections: sections.length > 0 ? sections : [{ title: 'Main Document', level: 1, pageNumber: 1, content: rawText }],
    };

    return {
      fullText: rawText,
      structure,
      metadata: {
        pageCount,
        wordCount,
        tablesCount: tablesDetected,
        imagesCount: 0,
        hasOcr: isScanned,
        title: parsed.info?.Title || filename.replace(/\.pdf$/i, ''),
        author: parsed.info?.Author || undefined,
      },
    };
  }
}
