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
  KpiBlock,
  ChartBlock,
  ChartItem,
  TimelineBlock,
  DiagramBlock,
  ComparisonBlock,
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

    // 2b. Optional Table of Contents
    if (docModel.includeTableOfContents) {
      this.renderTableOfContents(doc, docModel, theme, contentWidth, bottomLimit);
      if (docModel.includeCoverPage) {
        doc.addPage();
      }
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

        case 'kpi':
          this.renderKpi(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'chart':
          this.renderChart(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'timeline':
          this.renderTimeline(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'diagram':
          this.renderDiagram(doc, block, theme, contentWidth, bottomLimit);
          break;

        case 'comparison':
          this.renderComparison(doc, block, theme, contentWidth, bottomLimit);
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
   * Render KPI Metric Cards (2 to 4 responsive columns with colored top accent, bold value, label, and trend)
   */
  private static renderKpi(
    doc: PDFKit.PDFDocument,
    block: KpiBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    if (!block.items || block.items.length === 0) return;

    const neededHeight = (block.title ? 28 : 0) + 75;
    if (doc.y + neededHeight > bottomLimit) {
      doc.addPage();
    }

    if (block.title) {
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(theme.typography.h4Size)
        .text(block.title, theme.margins.left, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
    }

    const items = block.items.slice(0, 4);
    const cols = items.length;
    const gap = 10;
    const cardWidth = (contentWidth - (cols - 1) * gap) / cols;
    const cardHeight = 65;
    const cardY = doc.y;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const cardX = theme.margins.left + idx * (cardWidth + gap);

      // Card Background
      doc
        .roundedRect(cardX, cardY, cardWidth, cardHeight, 4)
        .fillColor(theme.colors.cardBackground)
        .fill();

      // Border
      doc
        .roundedRect(cardX, cardY, cardWidth, cardHeight, 4)
        .strokeColor(theme.colors.border)
        .lineWidth(0.5)
        .stroke();

      // Top accent strip
      const accentColor = item.color || (idx === 0 ? theme.colors.accent : theme.colors.primary);
      doc
        .rect(cardX + 4, cardY, cardWidth - 8, 2.5)
        .fillColor(accentColor)
        .fill();

      // Large bold value
      const valStr = String(item.value || '');
      const valFontSize = valStr.length > 10 ? 12 : valStr.length > 6 ? 14 : 17;
      doc
        .font(this.selectFont(valStr, true))
        .fillColor(theme.colors.primary)
        .fontSize(valFontSize)
        .text(valStr, cardX + 8, cardY + 10, {
          width: cardWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });

      // Uppercase label
      const labelStr = (item.label || '').toUpperCase();
      doc
        .font(this.selectFont(labelStr, false))
        .fillColor(theme.colors.textMuted)
        .fontSize(7.5)
        .text(labelStr, cardX + 8, cardY + 31, {
          width: cardWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });

      // Optional trend or change indicator
      if (item.change) {
        const arrow = item.trend === 'up' ? '▲ ' : item.trend === 'down' ? '▼ ' : '• ';
        const trendColor = item.trend === 'up' ? '#16A34A' : item.trend === 'down' ? '#DC2626' : theme.colors.textMuted;
        doc
          .font(this.selectFont(arrow + item.change, true))
          .fillColor(trendColor)
          .fontSize(7.5)
          .text(arrow + item.change, cardX + 8, cardY + 47, {
            width: cardWidth - 16,
            lineBreak: false,
            ellipsis: true,
          });
      }
    }

    doc.y = cardY + cardHeight + 14;
  }

  /**
   * Render Native Vector Charts (Bar, Donut, Progress)
   */
  private static renderChart(
    doc: PDFKit.PDFDocument,
    block: ChartBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const items: ChartItem[] = (block.items && block.items.length > 0)
      ? block.items
      : (block.labels || []).map((label, idx) => ({
          label,
          value: (block.values && block.values[idx] !== undefined) ? block.values[idx] : 0,
          formattedValue: block.unit ? `${block.values?.[idx] || 0} ${block.unit}` : undefined,
          color: block.colors?.[idx],
        }));

    if (items.length === 0) return;

    const chartType = block.chartType || 'bar';

    if (chartType === 'donut') {
      this.renderDonutChart(doc, block, items, theme, contentWidth, bottomLimit);
      return;
    }

    // Horizontal Bar & Progress Chart
    const rowHeight = 24;
    const estimatedHeight = (block.title ? 30 : 0) + items.length * rowHeight + 20;
    if (doc.y + Math.min(estimatedHeight, 140) > bottomLimit) {
      doc.addPage();
    }

    if (block.title) {
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(theme.typography.h4Size)
        .text(block.title, theme.margins.left, doc.y, { width: contentWidth });
      if (block.subtitle) {
        doc.moveDown(0.2);
        doc
          .font(this.selectFont(block.subtitle, false))
          .fillColor(theme.colors.textMuted)
          .fontSize(theme.typography.captionSize)
          .text(block.subtitle, theme.margins.left, doc.y, { width: contentWidth });
      }
      doc.moveDown(0.5);
    }

    const maxVal = Math.max(...items.map((it) => it.value), 1);
    const labelColWidth = 140;
    const valueColWidth = 60;
    const barAreaWidth = contentWidth - labelColWidth - valueColWidth;

    for (const item of items) {
      if (doc.y + rowHeight > bottomLimit) {
        doc.addPage();
      }

      const rowY = doc.y;

      // Label
      doc
        .font(this.selectFont(item.label, false))
        .fillColor(theme.colors.text)
        .fontSize(8.5)
        .text(item.label, theme.margins.left, rowY + 3, {
          width: labelColWidth - 10,
          ellipsis: true,
          lineBreak: false,
        });

      // Background track
      const trackX = theme.margins.left + labelColWidth;
      doc
        .roundedRect(trackX, rowY + 4, barAreaWidth, 9, 4)
        .fillColor(theme.colors.cardBackground)
        .strokeColor(theme.colors.border)
        .lineWidth(0.5)
        .fillAndStroke();

      // Colored fill
      const ratio = Math.min(Math.max(item.value / maxVal, 0.03), 1);
      const fillW = Math.max(6, barAreaWidth * ratio);
      const barColor = item.color || theme.colors.primary;
      doc
        .roundedRect(trackX, rowY + 4, fillW, 9, 4)
        .fillColor(barColor)
        .fill();

      // Value label
      const valStr = item.formattedValue || String(item.value);
      doc
        .font(this.selectFont(valStr, true))
        .fillColor(theme.colors.primary)
        .fontSize(8.5)
        .text(valStr, trackX + barAreaWidth + 10, rowY + 3, {
          width: valueColWidth - 10,
          align: 'right',
          lineBreak: false,
        });

      doc.y = rowY + rowHeight;
    }

    doc.moveDown(0.5);
  }

  /**
   * Render Donut Chart with Legend and Summary
   */
  private static renderDonutChart(
    doc: PDFKit.PDFDocument,
    block: ChartBlock,
    items: ChartItem[],
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const chartHeight = 150;
    if (doc.y + chartHeight > bottomLimit) {
      doc.addPage();
    }

    if (block.title) {
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(theme.typography.h4Size)
        .text(block.title, theme.margins.left, doc.y, { width: contentWidth });
      doc.moveDown(0.4);
    }

    const startY = doc.y;
    const total = items.reduce((s, it) => s + (it.value || 0), 0) || 1;
    const palette = [theme.colors.primary, theme.colors.accent, '#059669', '#D97706', '#7C3AED', '#2563EB', '#DB2777'];

    const centerX = theme.margins.left + 75;
    const centerY = startY + 55;
    const ringRadius = 38;

    // Outer donut ring background
    doc
      .circle(centerX, centerY, ringRadius + 9)
      .fillColor(theme.colors.cardBackground)
      .fill();

    doc
      .circle(centerX, centerY, ringRadius)
      .lineWidth(18)
      .strokeColor(theme.colors.primary)
      .stroke();

    // Inner center text (donut hole)
    doc
      .circle(centerX, centerY, ringRadius - 9)
      .fillColor('#FFFFFF')
      .fill();

    doc
      .font(this.selectFont('100%', true))
      .fillColor(theme.colors.primary)
      .fontSize(10)
      .text('TOTAL', centerX - 25, centerY - 10, { width: 50, align: 'center', lineBreak: false });

    doc
      .font(this.selectFont(String(total), false))
      .fillColor(theme.colors.textMuted)
      .fontSize(8.5)
      .text(String(total), centerX - 25, centerY + 3, { width: 50, align: 'center', lineBreak: false });

    // Legend on right
    const legendX = theme.margins.left + 160;
    let legendY = startY + 10;
    const legendWidth = contentWidth - 170;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const sliceColor = item.color || palette[idx % palette.length];
      const pct = Math.round((item.value / total) * 100);

      // Swatch
      doc
        .roundedRect(legendX, legendY + 2, 8, 8, 2)
        .fillColor(sliceColor)
        .fill();

      // Label and value
      const desc = `${item.label} (${pct}% • ${item.formattedValue || item.value})`;
      doc
        .font(this.selectFont(desc, false))
        .fillColor(theme.colors.text)
        .fontSize(8.5)
        .text(desc, legendX + 15, legendY, {
          width: legendWidth - 15,
          lineBreak: false,
          ellipsis: true,
        });

      legendY += 18;
    }

    doc.y = Math.max(centerY + ringRadius + 20, legendY) + 10;
  }

  /**
   * Render Connected Milestone Roadmap / Timeline
   */
  private static renderTimeline(
    doc: PDFKit.PDFDocument,
    block: TimelineBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    if (!block.items || block.items.length === 0) return;

    if (block.title) {
      if (doc.y + 40 > bottomLimit) doc.addPage();
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(theme.typography.h3Size)
        .text(block.title, theme.margins.left, doc.y, { width: contentWidth });
      doc.moveDown(0.6);
    }

    const spineX = theme.margins.left + 16;
    const cardLeft = spineX + 20;
    const cardWidth = contentWidth - 36;

    for (let idx = 0; idx < block.items.length; idx++) {
      const item = block.items[idx];
      const isLast = idx === block.items.length - 1;

      const descLines = item.description ? Math.ceil(item.description.length / 70) : 1;
      const itemHeight = 35 + descLines * 12;

      if (doc.y + itemHeight > bottomLimit) {
        doc.addPage();
      }

      const itemTop = doc.y;

      // Connecting vertical rail to next node
      if (!isLast) {
        doc
          .moveTo(spineX, itemTop + 6)
          .lineTo(spineX, itemTop + itemHeight + 6)
          .strokeColor(theme.colors.border)
          .lineWidth(1.2)
          .stroke();
      }

      // Node circle
      const nodeY = itemTop + 6;
      doc
        .circle(spineX, nodeY, 5)
        .fillColor(theme.colors.accent)
        .fill();
      doc
        .circle(spineX, nodeY, 2)
        .fillColor('#FFFFFF')
        .fill();

      // Date badge pill
      const dateStr = (item.date || item.phase || '').toUpperCase();
      const dateWidth = Math.min(dateStr.length * 6 + 14, 110);
      doc
        .roundedRect(cardLeft, itemTop, dateWidth, 14, 3)
        .fillColor(theme.colors.cardBackground)
        .strokeColor(theme.colors.border)
        .lineWidth(0.5)
        .fillAndStroke();

      doc
        .font(this.selectFont(dateStr, true))
        .fillColor(theme.colors.accent)
        .fontSize(7.5)
        .text(dateStr, cardLeft, itemTop + 3, {
          width: dateWidth,
          align: 'center',
          lineBreak: false,
        });

      // Title
      const titleStr = item.title || item.phase || '';
      const titleX = cardLeft + dateWidth + 8;
      const titleWidth = cardWidth - dateWidth - 8 - (item.status ? 80 : 0);
      doc
        .font(this.selectFont(titleStr, true))
        .fillColor(theme.colors.primary)
        .fontSize(9.5)
        .text(titleStr, titleX, itemTop + 2, {
          width: Math.max(titleWidth, 100),
          lineBreak: false,
          ellipsis: true,
        });

      // Status Tag if available
      if (item.status) {
        const sLower = item.status.toLowerCase();
        const sColor = sLower.includes('done') || sLower.includes('complete')
          ? '#16A34A'
          : sLower.includes('progress')
          ? '#D97706'
          : theme.colors.textMuted;

        doc
          .font(this.selectFont(item.status, true))
          .fillColor(sColor)
          .fontSize(7.5)
          .text(`[${item.status.toUpperCase()}]`, cardLeft + cardWidth - 80, itemTop + 3, {
            width: 80,
            align: 'right',
            lineBreak: false,
          });
      }

      // Description
      if (item.description) {
        doc
          .font(this.selectFont(item.description, false))
          .fillColor(theme.colors.textMuted)
          .fontSize(8.5)
          .text(item.description, cardLeft, itemTop + 18, {
            width: cardWidth,
            lineGap: 2,
          });
      }

      doc.y = itemTop + itemHeight;
    }

    doc.moveDown(0.5);
  }

  /**
   * Render Process / Workflow Diagram Steps
   */
  private static renderDiagram(
    doc: PDFKit.PDFDocument,
    block: DiagramBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const steps = block.steps || [];
    if (steps.length === 0) return;

    if (block.title) {
      if (doc.y + 40 > bottomLimit) doc.addPage();
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(theme.typography.h4Size)
        .text(block.title, theme.margins.left, doc.y, { width: contentWidth });
      doc.moveDown(0.5);
    }

    const useHorizontal = block.direction === 'horizontal' || (steps.length <= 4 && block.direction !== 'vertical');

    if (useHorizontal) {
      const stepWidth = (contentWidth - (steps.length - 1) * 20) / steps.length;
      const stepHeight = 70;

      if (doc.y + stepHeight > bottomLimit) doc.addPage();

      const startY = doc.y;

      for (let idx = 0; idx < steps.length; idx++) {
        const step = steps[idx];
        const stepX = theme.margins.left + idx * (stepWidth + 20);

        // Card box
        doc
          .roundedRect(stepX, startY, stepWidth, stepHeight, 5)
          .fillColor(theme.colors.cardBackground)
          .strokeColor(theme.colors.border)
          .lineWidth(0.5)
          .fillAndStroke();

        // Step number badge
        doc
          .circle(stepX + 16, startY + 16, 9)
          .fillColor(theme.colors.primary)
          .fill();

        doc
          .font(this.selectFont(String(step.step), true))
          .fillColor('#FFFFFF')
          .fontSize(8)
          .text(String(step.step), stepX + 7, startY + 12, { width: 18, align: 'center', lineBreak: false });

        // Title
        doc
          .font(this.selectFont(step.title, true))
          .fillColor(theme.colors.primary)
          .fontSize(8.5)
          .text(step.title, stepX + 30, startY + 11, {
            width: stepWidth - 36,
            lineBreak: false,
            ellipsis: true,
          });

        // Description
        if (step.description) {
          doc
            .font(this.selectFont(step.description, false))
            .fillColor(theme.colors.textMuted)
            .fontSize(7.5)
            .text(step.description, stepX + 8, startY + 32, {
              width: stepWidth - 16,
              lineGap: 2,
            });
        }

        // Connecting arrow to next step
        if (idx < steps.length - 1) {
          const arrowX = stepX + stepWidth + 4;
          const arrowY = startY + stepHeight / 2 - 4;
          doc
            .font(this.selectFont('➔', true))
            .fillColor(theme.colors.accent)
            .fontSize(12)
            .text('➔', arrowX, arrowY, { width: 14, lineBreak: false });
        }
      }

      doc.y = startY + stepHeight + 14;
    } else {
      // Vertical flow
      for (let idx = 0; idx < steps.length; idx++) {
        const step = steps[idx];
        if (doc.y + 40 > bottomLimit) doc.addPage();

        const rowY = doc.y;

        doc
          .roundedRect(theme.margins.left, rowY, contentWidth, 34, 4)
          .fillColor(theme.colors.cardBackground)
          .strokeColor(theme.colors.border)
          .lineWidth(0.5)
          .fillAndStroke();

        // Badge
        doc
          .circle(theme.margins.left + 18, rowY + 17, 9)
          .fillColor(theme.colors.primary)
          .fill();

        doc
          .font(this.selectFont(String(step.step), true))
          .fillColor('#FFFFFF')
          .fontSize(8)
          .text(String(step.step), theme.margins.left + 9, rowY + 13, { width: 18, align: 'center', lineBreak: false });

        doc
          .font(this.selectFont(step.title, true))
          .fillColor(theme.colors.primary)
          .fontSize(9)
          .text(step.title, theme.margins.left + 36, rowY + 8, {
            width: contentWidth - 46,
            lineBreak: false,
            ellipsis: true,
          });

        if (step.description) {
          doc
            .font(this.selectFont(step.description, false))
            .fillColor(theme.colors.textMuted)
            .fontSize(8)
            .text(step.description, theme.margins.left + 36, rowY + 20, {
              width: contentWidth - 46,
              lineBreak: false,
              ellipsis: true,
            });
        }

        doc.y = rowY + 38;

        if (idx < steps.length - 1) {
          doc
            .font(this.selectFont('↓', true))
            .fillColor(theme.colors.accent)
            .fontSize(11)
            .text('↓', theme.margins.left + 14, doc.y - 2, { width: 20, align: 'center', lineBreak: false });
          doc.y += 12;
        }
      }
      doc.moveDown(0.4);
    }
  }

  /**
   * Render Multi-Column Comparison Cards
   */
  private static renderComparison(
    doc: PDFKit.PDFDocument,
    block: ComparisonBlock,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const cols = (block.columns || []).slice(0, 3);
    if (cols.length === 0) return;

    if (block.title) {
      if (doc.y + 40 > bottomLimit) doc.addPage();
      doc
        .font(this.selectFont(block.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(theme.typography.h3Size)
        .text(block.title, theme.margins.left, doc.y, { width: contentWidth });
      doc.moveDown(0.6);
    }

    const gap = 12;
    const colWidth = (contentWidth - (cols.length - 1) * gap) / cols.length;
    const maxPoints = Math.max(...cols.map((c) => (c.points ? c.points.length : 0)), 3);
    const colHeight = 55 + maxPoints * 18;

    if (doc.y + colHeight > bottomLimit) {
      doc.addPage();
    }

    const startY = doc.y;

    for (let cIdx = 0; cIdx < cols.length; cIdx++) {
      const col = cols[cIdx];
      const colX = theme.margins.left + cIdx * (colWidth + gap);

      const isPrimary = Boolean(col.isPrimary);
      const borderColor = isPrimary ? theme.colors.accent : theme.colors.border;
      const borderWidth = isPrimary ? 1.5 : 0.75;

      doc
        .roundedRect(colX, startY, colWidth, colHeight, 5)
        .fillColor(theme.colors.cardBackground)
        .strokeColor(borderColor)
        .lineWidth(borderWidth)
        .fillAndStroke();

      if (col.badge || isPrimary) {
        const badgeText = (col.badge || 'RECOMMENDED').toUpperCase();
        doc
          .roundedRect(colX + 8, startY + 8, colWidth - 16, 14, 3)
          .fillColor(isPrimary ? theme.colors.accent : theme.colors.primary)
          .fill();

        doc
          .font(this.selectFont(badgeText, true))
          .fillColor('#FFFFFF')
          .fontSize(7)
          .text(badgeText, colX + 8, startY + 11, {
            width: colWidth - 16,
            align: 'center',
            lineBreak: false,
          });
      }

      const titleY = (col.badge || isPrimary) ? startY + 28 : startY + 12;
      doc
        .font(this.selectFont(col.title, true))
        .fillColor(theme.colors.primary)
        .fontSize(10.5)
        .text(col.title, colX + 10, titleY, {
          width: colWidth - 20,
          align: 'center',
          lineBreak: false,
        });

      doc
        .moveTo(colX + 10, titleY + 16)
        .lineTo(colX + colWidth - 10, titleY + 16)
        .strokeColor(theme.colors.border)
        .lineWidth(0.5)
        .stroke();

      let ptY = titleY + 22;
      for (const pt of col.points || []) {
        doc
          .font(this.selectFont('✓', true))
          .fillColor(isPrimary ? '#16A34A' : theme.colors.accent)
          .fontSize(8.5)
          .text('✓', colX + 10, ptY, { width: 12, lineBreak: false });

        doc
          .font(this.selectFont(pt, false))
          .fillColor(theme.colors.text)
          .fontSize(8)
          .text(pt, colX + 24, ptY, {
            width: colWidth - 34,
            lineBreak: false,
            ellipsis: true,
          });

        ptY += 16;
      }
    }

    doc.y = startY + colHeight + 16;
  }

  /**
   * Render Professional Table of Contents
   */
  private static renderTableOfContents(
    doc: PDFKit.PDFDocument,
    docModel: DocumentModel,
    theme: any,
    contentWidth: number,
    bottomLimit: number
  ): void {
    const headings = docModel.blocks.filter(
      (b): b is HeadingBlock => b.type === 'heading' && (b.level === 1 || b.level === 2)
    );
    if (headings.length === 0) return;

    if (doc.y + 120 > bottomLimit) doc.addPage();

    const startY = doc.y;

    doc
      .font(this.selectFont('TABLE OF CONTENTS', true))
      .fillColor(theme.colors.accent)
      .fontSize(9)
      .text('TABLE OF CONTENTS', theme.margins.left, startY, {
        characterSpacing: 1.5,
      });

    doc.moveDown(0.4);

    doc
      .rect(theme.margins.left, doc.y, 36, 2)
      .fillColor(theme.colors.accent)
      .fill();

    doc.moveDown(0.8);

    let secIndex = 1;
    for (const h of headings) {
      if (doc.y + 20 > bottomLimit) doc.addPage();

      const isH1 = h.level === 1;
      const indent = isH1 ? 0 : 16;
      const itemY = doc.y;

      const titleStr = isH1 ? `${secIndex++}. ${h.text}` : `•  ${h.text}`;
      const font = this.selectFont(titleStr, isH1);

      doc
        .font(font)
        .fillColor(isH1 ? theme.colors.primary : theme.colors.text)
        .fontSize(isH1 ? 9.5 : 8.5)
        .text(titleStr, theme.margins.left + indent, itemY, {
          width: contentWidth - indent - 40,
          lineBreak: false,
          ellipsis: true,
        });

      const leaderStart = theme.margins.left + indent + Math.min(titleStr.length * 5.5 + 20, contentWidth - 70);
      const leaderEnd = theme.margins.left + contentWidth - 30;
      if (leaderEnd > leaderStart) {
        doc
          .moveTo(leaderStart, itemY + 8)
          .lineTo(leaderEnd, itemY + 8)
          .dash(2, { space: 3 })
          .strokeColor(theme.colors.border)
          .lineWidth(0.5)
          .stroke()
          .undash();
      }

      const pageStr = isH1 ? `SEC ${secIndex - 1}` : '—';
      doc
        .font(this.selectFont(pageStr, false))
        .fillColor(theme.colors.textMuted)
        .fontSize(8)
        .text(pageStr, theme.margins.left + contentWidth - 28, itemY, {
          width: 28,
          align: 'right',
          lineBreak: false,
        });

      doc.y = itemY + (isH1 ? 18 : 15);
    }

    doc.moveDown(1.2);
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
