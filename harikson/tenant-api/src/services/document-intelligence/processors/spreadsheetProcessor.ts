import * as XLSX from 'xlsx';
import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure, DocumentTable } from '../types.js';

export class SpreadsheetProcessor implements DocumentProcessor {
  supports(extension: string, mimeType?: string): boolean {
    const exts = ['csv', 'xlsx', 'xls', 'tsv'];
    return (
      exts.includes(extension) ||
      (mimeType ? /csv|excel|spreadsheet/i.test(mimeType) : false)
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
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames || [];

    const sheets: DocumentStructure['sheets'] = [];
    const tables: DocumentTable[] = [];
    const textSections: string[] = [];

    let totalRowCount = 0;

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rawJson.length === 0) continue;

      const headers: string[] = (rawJson[0] || []).map((h: any, i: number) =>
        h !== undefined && h !== null && String(h).trim() !== '' ? String(h).trim() : `Column_${i + 1}`
      );

      const rows: any[][] = rawJson.slice(1);
      totalRowCount += rows.length;

      // Detect column types and calculate statistics
      const columnStats: Record<string, { type: string; min?: number; max?: number; sum?: number; avg?: number; nullCount?: number }> = {};

      headers.forEach((header, colIdx) => {
        let numCount = 0;
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        let nullCount = 0;

        for (const row of rows) {
          const val = row[colIdx];
          if (val === '' || val === null || val === undefined) {
            nullCount++;
            continue;
          }

          const parsedNum = typeof val === 'number' ? val : parseFloat(String(val).replace(/[\$,₹]/g, ''));
          if (!isNaN(parsedNum)) {
            numCount++;
            sum += parsedNum;
            if (parsedNum < min) min = parsedNum;
            if (parsedNum > max) max = parsedNum;
          }
        }

        const isNumeric = numCount > rows.length * 0.5 && rows.length > 0;
        columnStats[header] = {
          type: isNumeric ? 'number' : 'string',
          nullCount,
          ...(isNumeric && numCount > 0
            ? {
                min: min === Infinity ? 0 : min,
                max: max === -Infinity ? 0 : max,
                sum: Math.round(sum * 100) / 100,
                avg: Math.round((sum / numCount) * 100) / 100,
              }
            : {}),
        };
      });

      // Format markdown table preview for top 25 rows
      const previewRows = rows.slice(0, 25);
      const mdTable = this.formatMarkdownTable(headers, previewRows);

      // Create human-readable sheet summary
      let sheetSummary = `## Sheet: ${name} (${rows.length} rows, ${headers.length} columns)\n\n`;
      sheetSummary += `### Column Schema & Statistics:\n`;
      for (const [col, stat] of Object.entries(columnStats)) {
        if (stat.type === 'number') {
          sheetSummary += `- **${col}** (Numeric): Sum=${stat.sum}, Avg=${stat.avg}, Min=${stat.min}, Max=${stat.max}, Missing=${stat.nullCount}\n`;
        } else {
          sheetSummary += `- **${col}** (Text): Missing=${stat.nullCount}\n`;
        }
      }
      sheetSummary += `\n### Data Preview (First 25 Rows):\n${mdTable}\n`;

      textSections.push(sheetSummary);

      sheets.push({
        name,
        rowCount: rows.length,
        columnCount: headers.length,
        headers,
        sampleRows: previewRows,
        columnStats,
      });

      tables.push({
        name: `Sheet: ${name}`,
        sheetName: name,
        headers,
        rows: previewRows,
        totalRows: rows.length,
        totalColumns: headers.length,
        summary: columnStats,
      });
    }

    const fullText = textSections.join('\n\n---\n\n');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      fullText,
      structure: {
        sheets,
        tables,
      },
      metadata: {
        pageCount: sheetNames.length || 1,
        wordCount,
        tablesCount: tables.length,
        documentType: 'spreadsheet',
        title: filename.replace(/\.(xlsx|xls|csv|tsv)$/i, ''),
      },
    };
  }

  /**
   * Helper to format markdown table
   */
  private formatMarkdownTable(headers: string[], rows: any[][]): string {
    if (headers.length === 0) return '';
    const headerRow = `| ${headers.join(' | ')} |`;
    const dividerRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const bodyRows = rows
      .map((row) => {
        const cells = headers.map((_, i) => {
          const val = row[i];
          if (val === null || val === undefined) return '';
          return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
        });
        return `| ${cells.join(' | ')} |`;
      })
      .join('\n');

    return `${headerRow}\n${dividerRow}\n${bodyRows}`;
  }

  /**
   * Programmatic Query Engine for Spreadsheet computation
   */
  public static executeComputation(
    headers: string[],
    rows: any[][],
    operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'top_n' | 'find_duplicates',
    columnName?: string,
    limit: number = 10
  ): { result: any; explanation: string } {
    const colIdx = columnName ? headers.findIndex((h) => h.toLowerCase() === columnName.toLowerCase()) : -1;

    if (operation === 'count') {
      return {
        result: rows.length,
        explanation: `Total rows verified: ${rows.length}`,
      };
    }

    if (operation === 'find_duplicates') {
      const seen = new Set<string>();
      const duplicates: any[] = [];
      for (const row of rows) {
        const key = colIdx >= 0 ? String(row[colIdx]) : JSON.stringify(row);
        if (seen.has(key)) {
          duplicates.push(row);
        } else {
          seen.add(key);
        }
      }
      return {
        result: duplicates.slice(0, limit),
        explanation: `Found ${duplicates.length} duplicate entries based on ${columnName || 'entire row'}.`,
      };
    }

    if (colIdx >= 0 && ['sum', 'avg', 'min', 'max'].includes(operation)) {
      const numbers: number[] = [];
      for (const row of rows) {
        const val = row[colIdx];
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[\$,₹]/g, ''));
        if (!isNaN(num)) numbers.push(num);
      }

      if (numbers.length === 0) {
        return { result: 0, explanation: `No numeric values found in column "${columnName}".` };
      }

      let resVal = 0;
      if (operation === 'sum') resVal = numbers.reduce((a, b) => a + b, 0);
      else if (operation === 'avg') resVal = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      else if (operation === 'min') resVal = Math.min(...numbers);
      else if (operation === 'max') resVal = Math.max(...numbers);

      const rounded = Math.round(resVal * 100) / 100;
      return {
        result: rounded,
        explanation: `Programmatic calculation for ${operation.toUpperCase()} of "${columnName}": ${rounded} across ${numbers.length} values.`,
      };
    }

    return {
      result: null,
      explanation: 'Unsupported calculation or column not found.',
    };
  }
}
