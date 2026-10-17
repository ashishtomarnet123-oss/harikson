import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import {
  DocumentModel,
  DocumentBlock,
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  TableBlock,
  CalloutBlock,
  CodeBlock,
  KeyValueBlock,
  DividerBlock,
  PageBreakBlock,
  ImageBlock,
} from './types.js';
import { getTheme } from './themes.js';
import logger from '../../utils/logger.js';

export class PdfRenderer {
  private static fontPaths: {
    regular?: string;
    bold?: string;
    devanagariRegular?: string;
    devanagariBold?: string;
  } = {};

  private static fontsInitialized = false;

  /**
   * Locate and register bundled TrueType fonts
   */
  private static initFonts(): void {
    if (this.fontsInitialized) return;

    // Search common font locations
    const candidateDirs = [
      path.resolve(process.cwd(), 'assets/fonts'),
      path.resolve(process.cwd(), 'dist/assets/fonts'),
      path.join(path.dirname(new URL(import.meta.url).pathname), '../../../assets/fonts'),
      path.join(path.dirname(new URL(import.meta.url).pathname), '../../../../assets/fonts'),
    ];

    let fontDir: string | null = null;
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        fontDir = dir;
        break;
      }
    }

    if (fontDir) {
      const regular = path.join(fontDir, 'NotoSans-Regular.ttf');
      const bold = path.join(fontDir, 'NotoSans-Bold.ttf');
      const devRegular = path.join(fontDir, 'Mukta-Regular.ttf');
      const devBold = path.join(fontDir, 'Mukta-Bold.ttf');

      if (fs.existsSync(regular)) this.fontPaths.regular = regular;
      if (fs.existsSync(bold)) this.fontPaths.bold = bold;
      if (fs.existsSync(devRegular)) this.fontPaths.devanagariRegular = devRegular;
      if (fs.existsSync(devBold)) this.fontPaths.devanagariBold = devBold;

      logger.info({ fontDir, fontPaths: this.fontPaths }, 'Registered TrueType Unicode fonts for PDF engine');
    } else {
      logger.warn('Font directory not found; falling back to built-in PostScript fonts');
    }

    this.fontsInitialized = true;
  }

  /**
   * Render a DocumentModel into a high-quality PDF Buffer
   */
  public static async renderToBuffer(docModel: DocumentModel): Promise<Buffer> {
    this.initFonts();
    const theme = getTheme(docModel.theme);

    const isLandscape = docModel.orientation === 'landscape';
    const pageSize = docModel.pageSize || 'A4';

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new PDFDocument({
        size: pageSize,
        layout: isLandscape ? 'landscape' : 'portrait',
        margins: theme.margins,
        bufferPages: true, // Needed for 2-pass header/footer and page numbering
        autoFirstPage: true,
        info: {
          Title: docModel.title,
          Author: docModel.metadata?.author || 'Xarwiz AI Platform',
          Subject: docModel.subtitle || 'Executive Intelligence Document',
          Creator: 'Xarwiz Universal PDF Engine',
          Producer: 'Xarwiz Platform (India)',
          CreationDate: new Date(),
        },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Register TrueType Fonts on the PDFKit instance if available
      if (this.fontPaths.regular) doc.registerFont('NotoSans', this.fontPaths.regular);
      if (this.fontPaths.bold) doc.registerFont('NotoSans-Bold', this.fontPaths.bold);
      if (this.fontPaths.devanagariRegular) doc.registerFont('Mukta', this.fontPaths.devanagariRegular);
      if (this.fontPaths.devanagariBold) doc.registerFont('Mukta-Bold', this.fontPaths.devanagariBold);

      try {
        this.renderDocument(doc, docModel, theme);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Layout all document blocks
   */
  private static renderDocument(doc: PDFKit.PDFDocument, docModel: DocumentModel, theme: any): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - theme.margins.left - theme.margins.right;
    const bottomLimit = pageHeight - theme.margins.bottom - 20;

    let coverPageRendered = false;

    // 1. Optional Cover Page
    if (docModel.includeCoverPage) {
      this.renderCoverPage(doc, docModel, theme);
      coverPageRendered = true;
      doc.addPage();
    }

    // 2. Document Title Banner (if no cover page was printed)
    if (!coverPageRendered) {
      this.renderHeaderTitle(doc, docModel, theme, contentWidth);
    }

    // 3. Render Each Content Block
    for (let bIdx = 0; bIdx < docModel.blocks.length; bIdx++) {
      const block = docModel.blocks[bIdx];

      switch (block.type) {
        case 'heading':
          this.renderHeading(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'paragraph':
          this.renderParagraph(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'list':
          this.renderList(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'table':
          this.renderTable(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'callout':
          this.renderCallout(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'code':
          this.renderCodeBlock(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'keyvalue':
          this.renderKeyValue(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'divider':
          this.renderDivider(doc, theme, contentWidth, bottomLimit);
          break;

        case 'pagebreak':
          doc.addPage();
          break;

        case 'image':
          this.renderImage(doc, block, theme, contentWidth, bottomLimit);
          break;
      }
    }

    // 4. Second Pass: Running Headers, Footers, and Page Numbers
    if (docModel.includeHeaderFooter !== false) {
      this.applyRunningHeadersAndFooters(doc, docModel, theme, coverPageRendered);
    }
  }

  /**
   * Render formal cover page
   */
  private static renderCoverPage(doc: PDFKit.PDFDocument, docModel: DocumentModel, theme: any): void {
    const contentWidth = doc.page.width - theme.margins.left - theme.margins.right;
    const startY = 120;
    doc.y = startY;

    // Brand tag
    doc
      .fillColor(theme.colors.accent)
      .fontSize(10)
      .text('XARWIZ AI PLATFORM • ENTERPRISE REPORT', theme.margins.left, doc.y, {
        characterSpacing: 1.5,
      });

    doc.moveDown(1.5);

    // Accent line
    doc
      .rect(theme.margins.left, doc.y, 48, 4)
      .fill(theme.colors.accent);

    doc.moveDown(2);

    // Main Title
    const titleFont = this.selectFont(docModel.title, true);
    doc
      .font(titleFont)
      .fillColor(theme.colors.primary)
      .fontSize(28)
      .text(docModel.title, theme.margins.left, doc.y, {
        width: contentWidth,
        lineGap: 4,
      });

    doc.moveDown(1.2);

    // Subtitle
    if (docModel.subtitle) {
      const subFont = this.selectFont(docModel.subtitle, false);
      doc
        .font(subFont)
        .fillColor(theme.colors.textMuted)
        .fontSize(13)
        .text(docModel.subtitle, theme.margins.left, doc.y, {
          width: contentWidth,
          lineGap: 3,
        });
      doc.moveDown(2);
    }

    // Metadata Card at bottom half
    const cardY = doc.page.height - 240;
    doc
      .roundedRect(theme.margins.left, cardY, contentWidth, 120, 8)
      .fillAndStroke(theme.colors.cardBackground, theme.colors.border);

    const col1X = theme.margins.left + 24;
    const col2X = theme.margins.left + contentWidth / 2 + 12;
    let mY = cardY + 20;

    const renderMetaField = (label: string, value: string, xPos: number, yPos: number) => {
      doc
        .font(this.selectFont(label, true))
        .fillColor(theme.colors.textMuted)
        .fontSize(8.5)
        .text(label.toUpperCase(), xPos, yPos);
      doc
        .font(this.selectFont(value, false))
        .fillColor(theme.colors.text)
        .fontSize(10)
        .text(value, xPos, yPos + 12);
    };

    renderMetaField('Prepared For', docModel.metadata?.organization || 'Enterprise Workspace', col1X, mY);
    renderMetaField('Author / Source', docModel.metadata?.author || 'Xarwiz Sovereign AI', col2X, mY);

    mY += 38;
    const dateStr = docModel.metadata?.date
      ? new Date(docModel.metadata.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    renderMetaField('Publication Date', dateStr, col1X, mY);
    renderMetaField('Classification', docModel.metadata?.confidentiality || 'Internal & Confidential', col2X, mY);

    // Bottom sovereign assurance (safely avoid triggering PDFKit auto-page-break)
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    try {
      doc
        .font(this.selectFont('Protected', false))
        .fillColor(theme.colors.textMuted)
        .fontSize(8)
        .text('Generated with DPDP compliance on Xarwiz AI Cloud Platform.', theme.margins.left, doc.page.height - 50, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        });
    } finally {
      doc.page.margins.bottom = oldBottom;
    }
  }

  /**
   * Render top title when cover page is skipped
   */
  private static renderHeaderTitle(doc: PDFKit.PDFDocument, docModel: DocumentModel, theme: any, contentWidth: number): void {
    const titleFont = this.selectFont(docModel.title, true);
    doc
      .font(titleFont)
      .fillColor(theme.colors.primary)
      .fontSize(theme.typography.titleSize)
      .text(docModel.title, theme.margins.left, doc.y, {
        width: contentWidth,
        lineGap: 3,
      });

    if (docModel.subtitle) {
      doc.moveDown(0.4);
      doc
        .font(this.selectFont(docModel.subtitle, false))
        .fillColor(theme.colors.textMuted)
        .fontSize(theme.typography.subtitleSize)
        .text(docModel.subtitle, theme.margins.left, doc.y, {
          width: contentWidth,
        });
    }

    doc.moveDown(0.8);
    // Divider
    doc
      .moveTo(theme.margins.left, doc.y)
      .lineTo(theme.margins.left + contentWidth, doc.y)
      .strokeColor(theme.colors.border)
      .lineWidth(1)
      .stroke();

    doc.moveDown(1.2);
  }

  /**
   * Render Headings (Orphan Prevention Included!)
   */
  private static renderHeading(
    doc: PDFKit.PDFDocument,
    block: HeadingBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    let size = theme.typography.h3Size;
    let spaceBefore = 12;
    let spaceAfter = 6;

    if (block.level === 1) {
      size = theme.typography.h1Size;
      spaceBefore = 20;
      spaceAfter = 8;
    } else if (block.level === 2) {
      size = theme.typography.h2Size;
      spaceBefore = 16;
      spaceAfter = 6;
    } else if (block.level >= 4) {
      size = theme.typography.h4Size;
      spaceBefore = 10;
      spaceAfter = 4;
    }

    // Orphan Prevention: Check if remaining page height cannot fit heading + at least 2 lines of text
    const estimatedNeededHeight = spaceBefore + size * 1.5 + 35;
    if (doc.y + estimatedNeededHeight > bottomLimit) {
      doc.addPage();
    } else if (doc.y > theme.margins.top + 10) {
      doc.y += spaceBefore;
    }

    const fontName = this.selectFont(block.text, true);
    doc
      .font(fontName)
      .fillColor(block.level === 1 ? theme.colors.primary : theme.colors.secondary)
      .fontSize(size)
      .text(block.text, theme.margins.left, doc.y, {
        width: contentWidth,
      });

    doc.y += spaceAfter;
  }

  /**
   * Render Paragraphs
   */
  private static renderParagraph(
    doc: PDFKit.PDFDocument,
    block: ParagraphBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    if (doc.y + 20 > bottomLimit) {
      doc.addPage();
    }

    const fontName = this.selectFont(block.text, false);
    doc
      .font(fontName)
      .fillColor(theme.colors.text)
      .fontSize(theme.typography.bodySize)
      .text(block.text, theme.margins.left, doc.y, {
        width: contentWidth,
        lineGap: 3,
        align: 'left',
      });

    doc.moveDown(0.7);
  }

  /**
   * Render Lists (with bullet / numbers and checklist boxes)
   */
  private static renderList(
    doc: PDFKit.PDFDocument,
    block: ListBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const itemFontSize = theme.typography.bodySize;
    const indentBase = 18;

    for (let i = 0; i < block.items.length; i++) {
      if (doc.y + 18 > bottomLimit) {
        doc.addPage();
      }

      const item = block.items[i];
      const level = item.level || 0;
      const leftX = theme.margins.left + level * indentBase;
      const textX = leftX + 16;
      const availableTextWidth = contentWidth - (textX - theme.margins.left);

      let bulletText = '•';
      if (block.ordered) {
        bulletText = `${i + 1}.`;
      } else if (item.checked !== undefined) {
        bulletText = item.checked ? '☑' : '☐';
      }

      const itemY = doc.y;

      // Draw Bullet at same baseline without moving doc.y
      doc
        .font(this.selectFont(bulletText, false))
        .fillColor(item.checked ? theme.colors.accent : theme.colors.textMuted)
        .fontSize(itemFontSize)
        .text(bulletText, leftX, itemY, { lineBreak: false });

      // Draw Item Text starting at itemY
      doc
        .font(this.selectFont(item.text, false))
        .fillColor(theme.colors.text)
        .fontSize(itemFontSize)
        .text(item.text, textX, itemY, {
          width: availableTextWidth,
          lineGap: 2,
        });

      doc.y += 3;
    }

    doc.moveDown(0.5);
  }

  /**
   * Render Table with Header Repetition across Page Breaks
   */
  private static renderTable(
    doc: PDFKit.PDFDocument,
    block: TableBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    if (!block.headers || block.headers.length === 0) return;

    const colCount = block.headers.length;
    const colWidth = contentWidth / colCount;
    const cellPadding = 6;
    const headerHeight = 24;

    // Check if there is room for table header + at least 1 row
    if (doc.y + headerHeight + 25 > bottomLimit) {
      doc.addPage();
    }

    const drawHeader = () => {
      const startX = theme.margins.left;
      const startY = doc.y;

      // Header background rectangle
      doc
        .rect(startX, startY, contentWidth, headerHeight)
        .fill(theme.colors.tableHeaderBg);

      // Draw header titles
      for (let c = 0; c < colCount; c++) {
        const title = block.headers[c];
        const cellX = startX + c * colWidth + cellPadding;
        const align = block.alignments?.[c] || 'left';

        doc
          .font(this.selectFont(title, true))
          .fillColor(theme.colors.tableHeaderText)
          .fontSize(theme.typography.captionSize + 0.5)
          .text(title, cellX, startY + 6, {
            width: colWidth - cellPadding * 2,
            align,
            ellipsis: true,
          });
      }

      doc.y = startY + headerHeight;
    };

    // Draw initial header
    drawHeader();

    // Draw Rows
    for (let r = 0; r < block.rows.length; r++) {
      const row = block.rows[r];
      const isAlt = r % 2 === 1;

      // Calculate row height by finding maximum text height among columns
      let maxCellHeight = 18;
      for (let c = 0; c < colCount; c++) {
        const cellText = row[c] || '';
        const h = doc.heightOfString(cellText, {
          width: colWidth - cellPadding * 2,
        });
        if (h + cellPadding * 2 > maxCellHeight) {
          maxCellHeight = h + cellPadding * 2;
        }
      }

      // Pagination & Repeating Header Check!
      if (doc.y + maxCellHeight > bottomLimit) {
        doc.addPage();
        drawHeader(); // Repeat header on new page!
      }

      const rowY = doc.y;

      // Row background
      if (isAlt) {
        doc
          .rect(theme.margins.left, rowY, contentWidth, maxCellHeight)
          .fill(theme.colors.tableAltRowBg);
      }

      // Row bottom border
      doc
        .moveTo(theme.margins.left, rowY + maxCellHeight)
        .lineTo(theme.margins.left + contentWidth, rowY + maxCellHeight)
        .strokeColor(theme.colors.border)
        .lineWidth(0.5)
        .stroke();

      // Render cells
      for (let c = 0; c < colCount; c++) {
        const cellText = row[c] || '';
        const cellX = theme.margins.left + c * colWidth + cellPadding;
        const align = block.alignments?.[c] || 'left';

        doc
          .font(this.selectFont(cellText, false))
          .fillColor(theme.colors.text)
          .fontSize(theme.typography.bodySize - 0.5)
          .text(cellText, cellX, rowY + cellPadding, {
            width: colWidth - cellPadding * 2,
            align,
          });
      }

      doc.y = rowY + maxCellHeight;
    }

    doc.moveDown(0.8);
  }

  /**
   * Render Callout Cards / Blockquotes with Left Colored Ribbon
   */
  private static renderCallout(
    doc: PDFKit.PDFDocument,
    block: CalloutBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const ribbonColor = theme.colors.calloutRibbon[block.calloutType] || theme.colors.accent;
    const bgColor = theme.colors.calloutBg[block.calloutType] || theme.colors.cardBackground;

    const padH = 12;
    const padV = 8;
    const textWidth = contentWidth - padH * 2 - 6;

    // Estimate height
    let estimatedHeight = doc.heightOfString(block.text, { width: textWidth }) + padV * 2;
    if (block.title) estimatedHeight += 16;

    if (doc.y + estimatedHeight > bottomLimit) {
      doc.addPage();
    }

    const startX = theme.margins.left;
    const startY = doc.y;

    // Card background
    doc
      .roundedRect(startX, startY, contentWidth, estimatedHeight, 4)
      .fill(bgColor);

    // Left ribbon bar
    doc
      .roundedRect(startX, startY, 4, estimatedHeight, 2)
      .fill(ribbonColor);

    let curY = startY + padV;

    if (block.title) {
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(ribbonColor)
        .fontSize(theme.typography.captionSize + 1)
        .text(block.title.toUpperCase(), startX + padH + 4, curY);
      curY += 14;
    }

    doc
      .font(this.selectFont(block.text, false))
      .fillColor(theme.colors.text)
      .fontSize(theme.typography.bodySize)
      .text(block.text, startX + padH + 4, curY, {
        width: textWidth,
        lineGap: 2,
      });

    doc.y = startY + estimatedHeight + 8;
  }

  /**
   * Render Code Blocks with Monospace Dark Container
   */
  private static renderCodeBlock(
    doc: PDFKit.PDFDocument,
    block: CodeBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const pad = 10;
    const codeFont = 'Courier';
    const codeLines = block.code.split('\n');
    const lineHeight = 12;
    const blockHeight = Math.max(codeLines.length * lineHeight + pad * 2, 30);

    if (doc.y + Math.min(blockHeight, 60) > bottomLimit) {
      doc.addPage();
    }

    const startX = theme.margins.left;
    const startY = doc.y;

    // Background container
    doc
      .roundedRect(startX, startY, contentWidth, blockHeight, 6)
      .fill(theme.colors.codeBg);

    // Header label if language specified
    let codeY = startY + pad;
    if (block.language) {
      doc
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .fontSize(7.5)
        .text(block.language.toUpperCase(), startX + pad, codeY);
      codeY += 12;
    }

    // Code lines
    doc
      .font(codeFont)
      .fillColor(theme.colors.codeText)
      .fontSize(8.5);

    for (const cLine of codeLines) {
      if (codeY + 12 > startY + blockHeight - pad) break;
      doc.text(cLine, startX + pad, codeY, {
        width: contentWidth - pad * 2,
      });
      codeY += lineHeight;
    }

    doc.y = startY + blockHeight + 8;
  }

  /**
   * Render Key-Value Stat Grid
   */
  private static renderKeyValue(
    doc: PDFKit.PDFDocument,
    block: KeyValueBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const cols = block.columns || 2;
    const colWidth = contentWidth / cols;
    const rowHeight = 36;
    const rows = Math.ceil(block.pairs.length / cols);
    const totalHeight = rows * rowHeight + 12;

    if (doc.y + totalHeight > bottomLimit) {
      doc.addPage();
    }

    const startX = theme.margins.left;
    const startY = doc.y;

    doc
      .roundedRect(startX, startY, contentWidth, totalHeight, 6)
      .fillAndStroke(theme.colors.cardBackground, theme.colors.border);

    for (let i = 0; i < block.pairs.length; i++) {
      const pair = block.pairs[i];
      const c = i % cols;
      const r = Math.floor(i / cols);

      const cellX = startX + c * colWidth + 14;
      const cellY = startY + r * rowHeight + 8;

      doc
        .font(this.selectFont(pair.label, true))
        .fillColor(theme.colors.textMuted)
        .fontSize(7.5)
        .text(pair.label.toUpperCase(), cellX, cellY);

      doc
        .font(this.selectFont(pair.value, false))
        .fillColor(theme.colors.primary)
        .fontSize(9.5)
        .text(pair.value, cellX, cellY + 11, {
          width: colWidth - 28,
          ellipsis: true,
        });
    }

    doc.y = startY + totalHeight + 8;
  }

  /**
   * Render Divider Line
   */
  private static renderDivider(doc: PDFKit.PDFDocument, theme: any, contentWidth: number, bottomLimit: number): void {
    if (doc.y + 15 > bottomLimit) {
      doc.addPage();
    }

    doc.moveDown(0.5);
    doc
      .moveTo(theme.margins.left, doc.y)
      .lineTo(theme.margins.left + contentWidth, doc.y)
      .strokeColor(theme.colors.border)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.8);
  }

  /**
   * Render Image with Aspect Ratio Preservation
   */
  private static renderImage(
    doc: PDFKit.PDFDocument,
    block: ImageBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    try {
      let imageBuffer: Buffer | null = null;

      if (block.src.startsWith('data:image')) {
        const base64Data = block.src.split(',')[1];
        if (base64Data) imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (fs.existsSync(block.src)) {
        imageBuffer = fs.readFileSync(block.src);
      }

      if (!imageBuffer) return;

      const maxW = Math.min(block.width || contentWidth, contentWidth);
      const maxH = block.height || 260;

      if (doc.y + maxH + 20 > bottomLimit) {
        doc.addPage();
      }

      const imgAlign: 'center' | 'right' = block.align === 'right' ? 'right' : 'center';
      doc.image(imageBuffer, {
        fit: [maxW, maxH],
        align: imgAlign,
      });

      if (block.caption) {
        doc.moveDown(0.3);
        doc
          .font(this.selectFont(block.caption, false))
          .fillColor(theme.colors.textMuted)
          .fontSize(theme.typography.captionSize)
          .text(block.caption, theme.margins.left, doc.y, {
            align: 'center',
            width: contentWidth,
          });
      }

      doc.moveDown(0.6);
    } catch (err) {
      logger.warn({ err }, 'Failed to render image in PDF');
    }
  }

  /**
   * Second Pass: Running Headers, Footers, and Dynamic "Page X of Y"
   */
  private static applyRunningHeadersAndFooters(
    doc: PDFKit.PDFDocument,
    docModel: DocumentModel,
    theme: any,
    hasCoverPage: boolean
  ): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const contentWidth = doc.page.width - theme.margins.left - theme.margins.right;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Skip running header & footer on cover page
      if (hasCoverPage && i === 0) {
        continue;
      }

      // Temporarily clear margins so headers and footers never trigger PDFKit auto-page-break
      const oldTop = doc.page.margins.top;
      const oldBottom = doc.page.margins.bottom;
      doc.page.margins.top = 0;
      doc.page.margins.bottom = 0;

      try {
        // 1. Running Top Header
        const headerY = 24;
        doc
          .font(this.selectFont(docModel.title, false))
          .fillColor(theme.colors.textMuted)
          .fontSize(8)
          .text(docModel.title, theme.margins.left, headerY, {
            width: contentWidth,
            align: 'left',
            ellipsis: true,
            lineBreak: false,
          });

        // Header hairline
        doc
          .moveTo(theme.margins.left, headerY + 12)
          .lineTo(theme.margins.left + contentWidth, headerY + 12)
          .strokeColor(theme.colors.border)
          .lineWidth(0.5)
          .stroke();

        // 2. Running Bottom Footer
        const footerY = doc.page.height - 32;

        // Footer hairline
        doc
          .moveTo(theme.margins.left, footerY - 8)
          .lineTo(theme.margins.left + contentWidth, footerY - 8)
          .strokeColor(theme.colors.border)
          .lineWidth(0.5)
          .stroke();

        // Left: Confidentiality / Workspace
        const confText = docModel.metadata?.confidentiality
          ? `XARWIZ AI • ${docModel.metadata.confidentiality.toUpperCase()}`
          : 'XARWIZ AI PLATFORM • CONFIDENTIAL';

        doc
          .font(this.selectFont(confText, false))
          .fillColor(theme.colors.textMuted)
          .fontSize(7.5)
          .text(confText, theme.margins.left, footerY, {
            width: contentWidth / 2,
            align: 'left',
            lineBreak: false,
          });

        // Right: Exact "Page X of Y"
        const pageNumStr = `Page ${i + 1} of ${totalPages}`;
        doc
          .font(this.selectFont(pageNumStr, false))
          .fillColor(theme.colors.textMuted)
          .fontSize(7.5)
          .text(pageNumStr, theme.margins.left + contentWidth / 2, footerY, {
            width: contentWidth / 2,
            align: 'right',
            lineBreak: false,
          });
      } finally {
        doc.page.margins.top = oldTop;
        doc.page.margins.bottom = oldBottom;
      }
    }
  }

  /**
   * Multilingual Font Selector:
   * Chooses Devanagari font when Hindi characters are present,
   * Latin NotoSans when available, or built-in Helvetica as resilient fallback.
   */
  private static selectFont(text: string, bold = false): string {
    const hasDevanagari = /[\u0900-\u097F]/.test(text || '');

    if (hasDevanagari) {
      if (bold && this.fontPaths.devanagariBold) return 'Mukta-Bold';
      if (this.fontPaths.devanagariRegular) return 'Mukta';
    }

    if (bold) {
      if (this.fontPaths.bold) return 'NotoSans-Bold';
      return 'Helvetica-Bold';
    }

    if (this.fontPaths.regular) return 'NotoSans';
    return 'Helvetica';
  }
}
