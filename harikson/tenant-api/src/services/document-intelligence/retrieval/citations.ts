import { CitationReference, SemanticChunk } from '../types.js';

export class CitationEngine {
  /**
   * Format citation for LLM context injection
   */
  public static formatChunkForContext(chunk: SemanticChunk, documentName: string): string {
    const loc = chunk.sourceLocation || (chunk.pageNumber ? `Page ${chunk.pageNumber}` : 'General Document');
    return `[SOURCE: ${documentName} | ${loc}]\n${chunk.content}`;
  }

  /**
   * Build structured citations from retrieved chunks
   */
  public static buildCitations(chunks: Array<{
    filename: string;
    documentId: string;
    pageNumber?: number;
    section?: string;
    content: string;
    final_score?: number;
  }>): CitationReference[] {
    return chunks.map((c) => {
      const pageStr = c.pageNumber ? `Page ${c.pageNumber}` : undefined;
      const secStr = c.section ? `Section: ${c.section}` : undefined;
      const location = [pageStr, secStr].filter(Boolean).join(' · ') || 'General Context';

      // Trim snippet to key 150 chars
      const snippet = c.content.replace(/\s+/g, ' ').substring(0, 180).trim();
      const confidence: CitationReference['confidence'] =
        (c.final_score || 0) > 0.65 ? 'HIGH' : (c.final_score || 0) > 0.4 ? 'MEDIUM' : 'LOW';

      return {
        documentId: c.documentId,
        filename: c.filename,
        pageNumber: c.pageNumber,
        section: c.section,
        sourceLocation: location,
        snippet,
        confidence,
      };
    });
  }

  /**
   * Append formatted markdown citations list to an AI answer
   */
  public static appendMarkdownCitations(answer: string, citations: CitationReference[]): string {
    if (citations.length === 0 || answer.includes('### Sources & Citations')) {
      return answer;
    }

    const uniqueCitations = new Map<string, CitationReference>();
    for (const cit of citations) {
      const key = `${cit.filename}-${cit.sourceLocation}`;
      if (!uniqueCitations.has(key)) {
        uniqueCitations.set(key, cit);
      }
    }

    const citationItems = Array.from(uniqueCitations.values()).map((c, i) => {
      return `${i + 1}. **[${c.filename}](doc://${c.documentId}?page=${c.pageNumber || 1})** — *${c.sourceLocation}* ("${c.snippet}...")`;
    });

    return `${answer.trim()}\n\n---\n### Sources & Citations\n${citationItems.join('\n')}`;
  }
}
