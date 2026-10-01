import crypto from 'crypto';
import { DocumentStructure, SemanticChunk, DocumentType } from '../types.js';

export class SemanticChunker {
  private static readonly MAX_CHUNK_TOKENS = 600;
  private static readonly CHUNK_OVERLAP_TOKENS = 80;

  /**
   * Produce structure-aware semantic chunks preserving source locations
   */
  public static chunkDocument(
    documentId: string,
    filename: string,
    fullText: string,
    structure: DocumentStructure,
    documentType: DocumentType
  ): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];

    // 1. Page-based chunking (PDFs and Presentations)
    if (structure.pages && structure.pages.length > 0) {
      for (const page of structure.pages) {
        if (!page.text || !page.text.trim()) continue;

        const subChunks = this.splitIntoTokenWindows(page.text, this.MAX_CHUNK_TOKENS, this.CHUNK_OVERLAP_TOKENS);
        subChunks.forEach((subText, subIdx) => {
          chunks.push({
            chunkId: crypto.randomUUID(),
            documentId,
            content: subText,
            pageNumber: page.pageNumber,
            heading: `Page ${page.pageNumber}${subChunks.length > 1 ? ` (Part ${subIdx + 1})` : ''}`,
            sourceType: documentType === 'presentation' ? 'slide' : 'pdf_page',
            sourceLocation: documentType === 'presentation' ? `Slide ${page.pageNumber}` : `Page ${page.pageNumber}`,
            tokenCount: this.estimateTokens(subText),
          });
        });
      }

      if (chunks.length > 0) return chunks;
    }

    // 2. Section/Heading-based chunking (DOCX, Markdown, Structured Docs)
    if (structure.sections && structure.sections.length > 0) {
      for (const section of structure.sections) {
        if (!section.content || !section.content.trim()) continue;

        const subChunks = this.splitIntoTokenWindows(section.content, this.MAX_CHUNK_TOKENS, this.CHUNK_OVERLAP_TOKENS);
        subChunks.forEach((subText, subIdx) => {
          chunks.push({
            chunkId: crypto.randomUUID(),
            documentId,
            content: `## ${section.title}\n\n${subText}`,
            pageNumber: section.pageNumber,
            section: section.title,
            heading: section.title,
            sourceType: 'document_section',
            sourceLocation: section.pageNumber ? `Page ${section.pageNumber} · Section: ${section.title}` : `Section: ${section.title}`,
            tokenCount: this.estimateTokens(subText),
          });
        });
      }

      if (chunks.length > 0) return chunks;
    }

    // 3. Sheet/Table-based chunking (Spreadsheets)
    if (structure.sheets && structure.sheets.length > 0) {
      for (const sheet of structure.sheets) {
        let sheetContent = `### Sheet: ${sheet.name} (${sheet.rowCount} rows, ${sheet.columnCount} columns)\n`;
        sheetContent += `Columns: ${sheet.headers.join(', ')}\n\n`;

        if (sheet.columnStats) {
          sheetContent += 'Key Metrics:\n';
          for (const [col, stat] of Object.entries(sheet.columnStats)) {
            if (stat.sum !== undefined) {
              sheetContent += `- ${col}: Sum=${stat.sum}, Avg=${stat.avg}, Min=${stat.min}, Max=${stat.max}\n`;
            }
          }
        }

        chunks.push({
          chunkId: crypto.randomUUID(),
          documentId,
          content: sheetContent,
          section: `Sheet: ${sheet.name}`,
          heading: `Sheet: ${sheet.name}`,
          sourceType: 'spreadsheet_sheet',
          sourceLocation: `Sheet: ${sheet.name}`,
          tokenCount: this.estimateTokens(sheetContent),
        });
      }

      if (chunks.length > 0) return chunks;
    }

    // 4. Fallback Paragraph-Aware Sliding Window
    const paragraphs = fullText.split(/\n\s*\n/);
    let currentChunkText = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (this.estimateTokens(currentChunkText + '\n\n' + trimmedPara) > this.MAX_CHUNK_TOKENS && currentChunkText) {
        chunks.push({
          chunkId: crypto.randomUUID(),
          documentId,
          content: currentChunkText.trim(),
          sourceType: 'general_text',
          sourceLocation: `Document chunk ${chunks.length + 1}`,
          tokenCount: this.estimateTokens(currentChunkText),
        });
        currentChunkText = trimmedPara;
      } else {
        currentChunkText += (currentChunkText ? '\n\n' : '') + trimmedPara;
      }
    }

    if (currentChunkText.trim()) {
      chunks.push({
        chunkId: crypto.randomUUID(),
        documentId,
        content: currentChunkText.trim(),
        sourceType: 'general_text',
        sourceLocation: `Document chunk ${chunks.length + 1}`,
        tokenCount: this.estimateTokens(currentChunkText),
      });
    }

    return chunks;
  }

  /**
   * Split a long text block into overlapping token windows
   */
  private static splitIntoTokenWindows(text: string, maxTokens: number, overlapTokens: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const maxWords = Math.round(maxTokens * 0.75); // approx 1 token = 0.75 words
    const overlapWords = Math.round(overlapTokens * 0.75);

    if (words.length <= maxWords) {
      return [text.trim()];
    }

    const windows: string[] = [];
    let i = 0;
    while (i < words.length) {
      const slice = words.slice(i, i + maxWords);
      if (slice.length > 0) {
        windows.push(slice.join(' '));
      }
      i += maxWords - overlapWords;
      if (i + overlapWords >= words.length && i < words.length) {
        // Last remaining segment
        const lastSlice = words.slice(i);
        if (lastSlice.length > 20) {
          windows.push(lastSlice.join(' '));
        }
        break;
      }
    }

    return windows;
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
