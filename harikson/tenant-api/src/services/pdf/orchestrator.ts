import { UniversalPdfEngine } from './index.js';
import { DocumentThemeName, GeneratedPdfArtifact } from './types.js';
import logger from '../../utils/logger.js';
import { executeTenantQuery } from '../../db/pool.js';
import { countExactTokens } from '../tokenCountingService.js';

export type PdfIntentType = 'EXPORT_PREVIOUS' | 'GENERATE_NEW_PDF' | 'NONE';

export interface PdfIntentDetectionResult {
  isPdfIntent: boolean;
  type: PdfIntentType;
  theme: DocumentThemeName;
  cleanPrompt: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  confidence: number;
}

export class PdfOrchestrator {
  /**
   * Universal intent detector for PDF creation requests.
   * Recognizes explicit requests to export prior content or generate fresh documents as PDFs,
   * while filtering out informational/educational queries about PDFs.
   */
  public static detectPdfIntent(
    prompt: string,
    hasPriorAssistantMessage: boolean
  ): PdfIntentDetectionResult {
    if (!prompt || typeof prompt !== 'string') {
      return { isPdfIntent: false, type: 'NONE', theme: 'corporate', cleanPrompt: '', confidence: 0 };
    }

    const trimmed = prompt.trim();
    const lower = trimmed.toLowerCase();

    // 1. Filter out purely informational or educational queries about the PDF format
    const isInformational =
      /^(?:what\s+is|what's|how\s+(?:does|do|can)|why\s+(?:is|do)|tell\s+me\s+about|explain)\s+(?:a\s+)?pdf/i.test(lower) ||
      /\b(?:difference\s+between\s+pdf|pdf\s+vs\s+|how\s+to\s+open\s+pdf|what\s+does\s+pdf\s+stand\s+for)\b/i.test(lower) ||
      /^(?:can\s+you\s+(?:read|parse|understand|extract|ocr)\s+(?:a\s+)?pdf)/i.test(lower);

    if (isInformational) {
      return { isPdfIntent: false, type: 'NONE', theme: 'corporate', cleanPrompt: trimmed, confidence: 0 };
    }

    // 2. Detect EXPORT_PREVIOUS intent: user wants the existing/previous response or conversation converted
    const exportPreviousPatterns = [
      /^(?:please\s+)?(?:make|convert|turn|export|download|save|generate|get)\s+(?:this|it|the\s+above|the\s+previous|your\s+previous|prior|current|that|last)\s*(?:conversation|response|answer|strategy|report|plan|detail|details|content)?\s*(?:in(?:to)?|as)?\s*(?:a\s*)?pdf/i,
      /^(?:please\s+)?(?:can\s+you\s+)?(?:export|make|convert|download|save|turn)\s+(?:this|it|the\s+above|the\s+previous|your\s+previous|your\s+last|the\s+last)\s*(?:answer|response|message|content|strategy|report|plan|detail|details)?\s*(?:as|into|to|in)?\s*(?:a\s*)?pdf/i,
      /\b(?:export|turn|convert|save|make|download)\s+(?:the\s+above|this|your\s+previous|the\s+previous|last)\s+(?:answer|response|content|strategy|report|document|detail|details)?\s*(?:as|into|in)?\s*(?:a\s*)?pdf\b/i,
      // Prompts starting with "pdf of/for ...": "pdf for me of this detail", "pdf of this", "pdf of this detail", "pdf for this", "pdf of the above"
      /^(?:please\s+)?(?:a\s+)?pdf\s+(?:for\s+me\s+)?(?:of|for|from)\s+(?:this|it|the\s+above|the\s+previous|that|these|all\s+this)\s*(?:detail|details|conversation|response|answer|strategy|report|plan|content)?/i,
      /^(?:please\s+)?(?:give|send|provide|make|get|create)\s+(?:me\s+)?(?:a\s+)?pdf\s+(?:of|for|from)\s+(?:this|it|the\s+above|the\s+previous|that|these)\s*(?:detail|details|conversation|response|answer|strategy|report|plan|content)?/i,
      /\bpdf\b.*\b(?:of\s+this|of\s+the\s+above|of\s+that|of\s+this\s+detail|of\s+these\s+details|from\s+above|for\s+me\s+of\s+this)\b/i,
      /^(?:give|send|provide)\s+me\s+the\s+downloadable\s+(?:pdf|version|file|report)/i,
      /^(?:please\s+)?(?:generate|create|export|download)\s+(?:the\s+)?pdf\s*(?:now|please|file)?$/i,
      /^(?:download|export)\s+(?:as|in|to)?\s*pdf$/i,
      /^(?:pdf\s+version|downloadable\s+version)\s*(?:please)?$/i,
    ];

    const isExportPrevious = exportPreviousPatterns.some((pattern) => pattern.test(lower));
    if (isExportPrevious && hasPriorAssistantMessage) {
      const theme = this.extractTheme(lower);
      const orientation = lower.includes('landscape') ? 'landscape' : 'portrait';
      return {
        isPdfIntent: true,
        type: 'EXPORT_PREVIOUS',
        theme,
        orientation,
        cleanPrompt: trimmed,
        confidence: 0.95,
      };
    }

    // 3. Detect GENERATE_NEW_PDF intent: user wants a new document/report authored as a PDF
    const generateNewPatterns = [
      /\b(?:create|generate|write|draft|build|make|produce)\s+(?:a|an)?\s*(?:comprehensive|detailed|in-depth|professional|executive|technical|formal|complete)?\s*(?:[0-9]+[\s-]*page\s+)?(?:.+?)\s*(?:as|in|into)?\s*(?:a\s*)?pdf\b/i,
      /\b(?:as|in|into)\s+(?:a\s*)?pdf\s*(?:document|report|file|format)?$/i,
      /\b(?:pdf\s+(?:document|report|format|version|export))\b/i,
      /\b(?:in\s+pdf\s+format|downloadable\s+pdf)\b/i,
      /^\/report\b/i,
    ];

    const isGenerateNew = generateNewPatterns.some((pattern) => pattern.test(lower));
    if (isGenerateNew) {
      const theme = this.extractTheme(lower);
      const orientation = lower.includes('landscape') ? 'landscape' : 'portrait';
      const extractedTitle = this.extractDocumentTitle(trimmed);

      return {
        isPdfIntent: true,
        type: 'GENERATE_NEW_PDF',
        theme,
        orientation,
        title: extractedTitle,
        cleanPrompt: trimmed,
        confidence: 0.9,
      };
    }

    return { isPdfIntent: false, type: 'NONE', theme: 'corporate', cleanPrompt: trimmed, confidence: 0 };
  }

  /**
   * Determine document design theme from user request
   */
  public static extractTheme(promptLower: string): DocumentThemeName {
    if (/\b(?:editorial|magazine|journalism|article|story|publishing|press|narrative)\b/.test(promptLower)) {
      return 'editorial';
    }
    if (/\b(?:executive|board|investor|pitch|c-level|director|leadership)\b/.test(promptLower)) {
      return 'executive';
    }
    if (/\b(?:technical|architecture|api|engineering|developer|code|audit|specification)\b/.test(promptLower)) {
      return 'technical';
    }
    if (/\b(?:academic|research|paper|study|thesis|citation|journal)\b/.test(promptLower)) {
      return 'academic';
    }
    if (/\b(?:minimal|clean|simple|compact|plain)\b/.test(promptLower)) {
      return 'minimal';
    }
    if (/\b(?:brand|branded|xarwiz|company|corporate)\b/.test(promptLower)) {
      return 'xarwiz';
    }
    return 'corporate';
  }

  /**
   * Extract meaningful document title from user prompt
   */
  private static extractDocumentTitle(prompt: string): string {
    const cleaned = prompt
      .replace(/^(?:create|generate|write|draft|build|make|produce)\s+(?:a|an)?\s*/i, '')
      .replace(/^(?:please\s+)?(?:a\s+)?pdf\s+(?:for\s+me\s+)?(?:of|for|from)?\s*/i, '')
      .replace(/^(?:give|send|provide|make|get|create)\s+(?:me\s+)?(?:a\s+)?pdf\s+(?:of|for|from)?\s*/i, '')
      .replace(/\s+(?:as|in|into)\s+(?:a\s*)?pdf.*$/i, '')
      .replace(/\s+in\s+pdf\s+format.*$/i, '')
      .replace(/\s+pdf\s+report.*$/i, '')
      .replace(/\s+pdf.*$/i, '')
      .trim();

    const lower = cleaned.toLowerCase();
    if (
      !cleaned ||
      cleaned.length <= 3 ||
      lower === 'this' ||
      lower === 'this detail' ||
      lower === 'these details' ||
      lower === 'the above' ||
      lower === 'it' ||
      lower === 'me of this detail'
    ) {
      return 'Business Strategy Document';
    }

    if (cleaned.length < 80) {
      return cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return 'Business Strategy Document';
  }

  /**
   * Prepend targeted document-generation directive to LLM prompt for new PDF requests
   */
  public static getDocumentPromptDirective(intent: PdfIntentDetectionResult): string {
    const themeName = intent.theme || 'corporate';
    return `### CRITICAL SYSTEM INSTRUCTION: DIRECT DOCUMENT AUTHORING
You are authoring a publication-grade, professional document that the Xarwiz Universal PDF Engine will compile directly into a formal PDF.
Document Theme: ${themeName.toUpperCase()}

MANDATORY RULES:
1. Start IMMEDIATELY with the top-level Title using markdown: # [Document Title].
2. Include an **Executive Summary** providing a high-level briefing.
3. Structure core content using standard ## Section and ### Subsection headings.
4. Use rich data presentation:
   - For Key Metrics / Highlights, list 2-4 bullet items under a KPI heading (e.g. **Metric**: Value) or use a \`\`\`kpi block.
   - For Implementation Roadmaps / Milestones, use bold phased lists (e.g. **Phase 1 (Q1)**: Goal...) or a \`\`\`timeline block.
   - For structured data comparisons, use GFM Markdown tables with clear column alignments.
   - For verified numerical data, you may provide a \`\`\`chart block (bar, donut, progress) with actual supplied values. NEVER invent fake financial or revenue metrics.
   - For pipelines or workflows, use numbered steps (1. Step: description...) or a \`\`\`diagram block.
5. Provide actionable conclusions, recommendations, or implementation milestones.
6. Support English, Hindi, or mixed multi-lingual text where requested.
7. ABSOLUTE PROHIBITION ON AI APOLOGIES OR CONVERSION ADVICE:
   - NEVER write conversational greetings, apologies, or disclaimers such as "I'm sorry", "as a text-based model", "I cannot create PDFs", "You can use this markdown text", or "use a tool such as pandoc".
   - The platform backend automatically compiles your output into a verified PDF file.
   - Begin directly with the document title and output ONLY publication document content.`;
  }

  /**
   * Format structured ```pdf-card codeblock and direct download link
   */
  public static formatPdfCardMarkdown(artifact: GeneratedPdfArtifact, theme: string): string {
    const sizeKb = Math.max(1, Math.round(artifact.sizeBytes / 1024));
    const title = artifact.filename.replace(/_[a-f0-9]{8}\.pdf$/i, '').replace(/_/g, ' ');

    const payload = JSON.stringify({
      fileId: artifact.fileId,
      title: title || artifact.filename,
      filename: artifact.filename,
      pageCount: artifact.pageCount,
      sizeBytes: artifact.sizeBytes,
      sizeKb,
      theme,
      downloadUrl: artifact.downloadUrl,
    }, null, 2);

    return `\n\n---\n### 📄 Verified PDF Document Ready for Download\n\n\`\`\`pdf-card\n${payload}\n\`\`\`\n\n[⬇️ **Download PDF: ${title}** (${artifact.pageCount} Pages · ${sizeKb} KB)](${artifact.downloadUrl})`;
  }

  /**
   * Execute EXPORT_PREVIOUS intent: converts the latest assistant response into a verified PDF
   */
  public static async executeExportPrevious({
    tenantId,
    userId,
    conversationId,
    userMessage,
    theme = 'corporate',
    orientation = 'portrait',
  }: {
    tenantId: string;
    userId: string;
    conversationId: string;
    userMessage: string;
    theme?: DocumentThemeName;
    orientation?: 'portrait' | 'landscape';
  }): Promise<{
    replyText: string;
    artifact?: GeneratedPdfArtifact;
    tokensUsed: number;
  }> {
    // 1. Fetch latest assistant message in this conversation
    const msgRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, content, created_at FROM messages
         WHERE tenant_id = $1 AND conversation_id = $2 AND sender = 'assistant'
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, conversationId]
      )
    );

    const latestAssistantMessage = msgRes.rows[0];
    if (!latestAssistantMessage || !latestAssistantMessage.content?.trim()) {
      const fallbackReply = `I couldn't find a previous response in this conversation to convert into a PDF. Please ask me to generate a report or strategy first, or specify what document you would like me to create as a PDF!`;
      return { replyText: fallbackReply, tokensUsed: countExactTokens(fallbackReply) };
    }

    // 2. Fetch conversation title
    const convRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT title FROM conversations WHERE id = $1 AND tenant_id = $2`,
        [conversationId, tenantId]
      )
    );
    const convTitle = convRes.rows[0]?.title || 'Executive Report';

    // 3. Render PDF from the latest message content
    const sourceContent = latestAssistantMessage.content;
    const { artifact } = await UniversalPdfEngine.generateDocumentPdf(tenantId, sourceContent, {
      defaultTitle: convTitle,
      theme,
      orientation,
      includeCoverPage: true,
      includeHeaderFooter: true,
    });

    const sizeKb = Math.max(1, Math.round(artifact.sizeBytes / 1024));
    const title = convTitle || 'Executive Report';

    const cardBlock = this.formatPdfCardMarkdown(artifact, theme);

    const replyText = `I have generated and verified your publication-ready PDF document from the previous response:\n\n### 📄 **${title}**\n- **Pages**: ${artifact.pageCount} Pages (A4)\n- **Size**: ${sizeKb} KB\n- **Theme**: ${theme.charAt(0).toUpperCase() + theme.slice(1)}\n- **Status**: ✅ Verified & Ready for Download${cardBlock}`;

    return {
      replyText,
      artifact,
      tokensUsed: countExactTokens(replyText),
    };
  }

  /**
   * Post-generation compiler: converts freshly generated LLM stream content into a verified PDF
   */
  public static async compileAndAttachPdf({
    tenantId,
    content,
    title,
    theme = 'corporate',
    orientation = 'portrait',
  }: {
    tenantId: string;
    content: string;
    title: string;
    theme?: DocumentThemeName;
    orientation?: 'portrait' | 'landscape';
  }): Promise<{
    artifact: GeneratedPdfArtifact;
    cardMarkdown: string;
  }> {
    const { artifact } = await UniversalPdfEngine.generateDocumentPdf(tenantId, content, {
      defaultTitle: title || 'Executive Document',
      theme,
      orientation,
      includeCoverPage: true,
      includeHeaderFooter: true,
    });

    const cardMarkdown = this.formatPdfCardMarkdown(artifact, theme);
    return { artifact, cardMarkdown };
  }
}
