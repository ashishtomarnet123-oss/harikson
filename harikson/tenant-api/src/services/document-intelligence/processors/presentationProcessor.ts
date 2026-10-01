import JSZip from 'jszip';
import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure, DocumentSection } from '../types.js';

export class PresentationProcessor implements DocumentProcessor {
  supports(extension: string, mimeType?: string): boolean {
    return (
      extension === 'pptx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
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
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles: string[] = [];

    // Find all slide XML files in ppt/slides/
    zip.forEach((relativePath) => {
      if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
        slideFiles.push(relativePath);
      }
    });

    // Sort slides numerically (slide1, slide2, slide10, etc.)
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    const pages: Array<{ pageNumber: number; text: string }> = [];
    const sections: DocumentSection[] = [];
    const fullTextParts: string[] = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const slideNum = i + 1;
      const slideXml = await zip.file(slidePath)?.async('string');
      if (!slideXml) continue;

      // Extract all text elements (<a:t>...</a:t>)
      const textMatches = slideXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
      const textPieces = textMatches.map((t) =>
        t.replace(/<[^>]+>/g, '').trim()
      ).filter(Boolean);

      // Extract slide title (first text piece or title shape)
      const slideTitle = textPieces[0] || `Slide ${slideNum}`;
      const slideBody = textPieces.slice(1).join('\n');

      // Check for speaker notes
      let speakerNotes = '';
      const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      const notesXml = await zip.file(notesPath)?.async('string');
      if (notesXml) {
        const notesMatches = notesXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
        const notesPieces = notesMatches
          .map((t) => t.replace(/<[^>]+>/g, '').trim())
          .filter((t) => t && !t.includes('Click to edit') && !t.match(/^\d+$/));
        if (notesPieces.length > 0) {
          speakerNotes = notesPieces.join(' ');
        }
      }

      let slideContent = `### Slide ${slideNum}: ${slideTitle}\n`;
      if (slideBody) {
        slideContent += `${slideBody}\n`;
      }
      if (speakerNotes) {
        slideContent += `\n*Speaker Notes:* ${speakerNotes}\n`;
      }

      fullTextParts.push(slideContent);
      pages.push({
        pageNumber: slideNum,
        text: slideContent.trim(),
      });
      sections.push({
        title: slideTitle,
        level: 2,
        pageNumber: slideNum,
        content: slideContent.trim(),
      });
    }

    const fullText = fullTextParts.join('\n\n---\n\n');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      fullText,
      structure: {
        pages,
        sections,
      },
      metadata: {
        pageCount: slideFiles.length,
        wordCount,
        tablesCount: 0,
        imagesCount: 0,
        documentType: 'presentation',
        title: filename.replace(/\.pptx$/i, ''),
      },
    };
  }
}
