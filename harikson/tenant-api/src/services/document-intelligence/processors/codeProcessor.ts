import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure, DocumentCodeSymbol, DocumentSection } from '../types.js';

export class CodeProcessor implements DocumentProcessor {
  private static readonly CODE_EXTENSIONS = new Set([
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'php', 'rb', 'rs',
    'cpp', 'c', 'h', 'css', 'html', 'sql', 'yaml', 'yml', 'json'
  ]);

  supports(extension: string): boolean {
    return CodeProcessor.CODE_EXTENSIONS.has(extension);
  }

  async process(
    buffer: Buffer,
    filename: string
  ): Promise<{
    fullText: string;
    structure: DocumentStructure;
    metadata: Partial<DocumentMetadata>;
  }> {
    const rawCode = buffer.toString('utf-8');
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const lines = rawCode.split('\n');

    const symbols: DocumentCodeSymbol[] = [];
    const sections: DocumentSection[] = [];

    // Language identification
    const langMap: Record<string, string> = {
      js: 'JavaScript', jsx: 'React JSX', ts: 'TypeScript', tsx: 'React TSX',
      py: 'Python', java: 'Java', go: 'Go', php: 'PHP', rb: 'Ruby', rs: 'Rust',
      cpp: 'C++', c: 'C', h: 'C Header', css: 'CSS', html: 'HTML', sql: 'SQL',
      yaml: 'YAML', yml: 'YAML', json: 'JSON'
    };
    const language = langMap[ext] || ext.toUpperCase();

    // Symbol extraction
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Function detection (JS/TS, Python, Go, Java, Rust)
      const funcMatch =
        trimmed.match(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/) ||
        trimmed.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/) ||
        trimmed.match(/def\s+([a-zA-Z0-9_]+)\s*\(/) ||
        trimmed.match(/func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/) ||
        trimmed.match(/(?:public|private|protected)?\s*(?:static\s+)?[a-zA-Z0-9_<>[\]]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/) ||
        trimmed.match(/fn\s+([a-zA-Z0-9_]+)\s*\(/);

      if (funcMatch && funcMatch[1]) {
        symbols.push({
          name: funcMatch[1],
          type: 'function',
          line: lineNum,
          signature: trimmed.substring(0, 80),
        });
      }

      // Class / Interface / Struct detection
      const classMatch =
        trimmed.match(/class\s+([a-zA-Z0-9_$]+)/) ||
        trimmed.match(/interface\s+([a-zA-Z0-9_$]+)/) ||
        trimmed.match(/type\s+([a-zA-Z0-9_$]+)\s+struct/) ||
        trimmed.match(/struct\s+([a-zA-Z0-9_]+)/);

      if (classMatch && classMatch[1]) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          line: lineNum,
          signature: trimmed.substring(0, 80),
        });
      }

      // API Route detection
      const routeMatch =
        trimmed.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i) ||
        trimmed.match(/@(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i);

      if (routeMatch) {
        const method = (routeMatch[1] || '').toUpperCase();
        const path = routeMatch[2] || '';
        symbols.push({
          name: `${method} ${path}`,
          type: 'route',
          line: lineNum,
          signature: trimmed.substring(0, 80),
        });
      }

      // Imports / dependencies
      const importMatch =
        trimmed.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/) ||
        trimmed.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/) ||
        trimmed.match(/import\s+([a-zA-Z0-9_.]+)/);

      if (importMatch && importMatch[1]) {
        symbols.push({
          name: importMatch[1],
          type: 'import',
          line: lineNum,
        });
      }
    });

    // Create a structured overview section
    const summaryLines = [
      `# Source Code: ${filename} (${language})`,
      `Total Lines: ${lines.length}`,
      `Total Symbols Extracted: ${symbols.length}`,
      '',
      '## Extracted Symbols & Endpoints:',
    ];

    const routes = symbols.filter((s) => s.type === 'route');
    if (routes.length > 0) {
      summaryLines.push(`### API Endpoints (${routes.length}):`);
      routes.forEach((r) => summaryLines.push(`- \`${r.name}\` (Line ${r.line})`));
      summaryLines.push('');
    }

    const classes = symbols.filter((s) => s.type === 'class');
    if (classes.length > 0) {
      summaryLines.push(`### Classes & Interfaces (${classes.length}):`);
      classes.forEach((c) => summaryLines.push(`- \`${c.name}\` (Line ${c.line})`));
      summaryLines.push('');
    }

    const funcs = symbols.filter((s) => s.type === 'function');
    if (funcs.length > 0) {
      summaryLines.push(`### Functions & Methods (${funcs.length}):`);
      funcs.forEach((f) => summaryLines.push(`- \`${f.name}()\` (Line ${f.line})`));
      summaryLines.push('');
    }

    summaryLines.push('## Source Code Listing:\n```' + ext + '\n' + rawCode + '\n```');
    const fullText = summaryLines.join('\n');

    sections.push({
      title: 'Code Overview & Symbols',
      level: 1,
      content: summaryLines.slice(0, 20).join('\n'),
    });

    const wordCount = rawCode.split(/\s+/).filter(Boolean).length;

    return {
      fullText,
      structure: {
        codeSymbols: symbols,
        sections,
        headings: symbols.map((s) => ({ text: `${s.type}: ${s.name}`, level: 2 })),
      },
      metadata: {
        pageCount: Math.max(1, Math.ceil(lines.length / 50)),
        wordCount,
        documentType: 'source_code',
        language,
        title: filename,
      },
    };
  }
}
