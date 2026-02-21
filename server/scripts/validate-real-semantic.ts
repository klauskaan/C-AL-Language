import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SymbolTable } from '../src/symbols/symbolTable';
import { BuiltinRegistry } from '../src/builtins/builtinRegistry';
import { SemanticAnalyzer } from '../src/semantic/semanticAnalyzer';
import { readFileWithEncoding } from '../src/utils/encoding';
import { hasTxtExtension } from '../src/utils/fileExtensions';
import { escapeMarkdown } from '../src/utils/escapeMarkdown';
import { defaultSettings } from '../src/settings';
import { DiagnosticSeverity } from 'vscode-languageserver';

interface DiagnosticResult {
  code: string;
  severity: number;
  message: string;
  line: number;
  column: number;
}

interface SemanticValidationResult {
  file: string;
  lines: number;
  analyzeTime: number;
  diagnostics: DiagnosticResult[];
}

function severityLabel(severity: number): string {
  switch (severity) {
    case DiagnosticSeverity.Error:   return 'Error';
    case DiagnosticSeverity.Warning: return 'Warning';
    case DiagnosticSeverity.Information: return 'Information';
    case DiagnosticSeverity.Hint:    return 'Hint';
    default: return 'Unknown';
  }
}

function objectType(filename: string): string {
  return filename.substring(0, 3).toUpperCase();
}

function validateAllRealFiles(): SemanticValidationResult[] {
  const realDir = join(__dirname, '../../test/REAL');
  const files = readdirSync(realDir)
    .filter(hasTxtExtension)
    .sort();

  console.log(`Found ${files.length} files to analyse\n`);

  const builtins = new BuiltinRegistry();
  const analyzer = new SemanticAnalyzer(builtins);
  const results: SemanticValidationResult[] = [];

  for (const file of files) {
    const filePath = join(realDir, file);
    const { content } = readFileWithEncoding(filePath);
    const lineCount = content.split('\n').length;

    const startTime = Date.now();
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
    const diagnostics = analyzer.analyze(ast, symbolTable, `file://${filePath}`, defaultSettings);
    const analyzeTime = Date.now() - startTime;

    results.push({
      file,
      lines: lineCount,
      analyzeTime,
      diagnostics: diagnostics.map(d => ({
        code: String(d.code ?? 'unknown'),
        severity: d.severity ?? DiagnosticSeverity.Warning,
        message: d.message,
        line: (d.range?.start?.line ?? 0) + 1,
        column: (d.range?.start?.character ?? 0) + 1,
      }))
    });

    if (results.length % 200 === 0) {
      const withDiag = results.filter(r => r.diagnostics.length > 0).length;
      console.log(`Processed ${results.length}/${files.length} files (${withDiag} with diagnostics)...`);
    }
  }

  return results;
}

function generateMarkdownReport(results: SemanticValidationResult[]): string {
  const filesWithDiag = results.filter(r => r.diagnostics.length > 0);
  const totalDiag = results.reduce((sum, r) => sum + r.diagnostics.length, 0);
  const totalTime = results.reduce((sum, r) => sum + r.analyzeTime, 0);
  const totalLines = results.reduce((sum, r) => sum + r.lines, 0);

  // Aggregate by diagnostic code
  const byCode: Record<string, { count: number; files: Set<string>; severity: number }> = {};
  for (const r of results) {
    for (const d of r.diagnostics) {
      if (!byCode[d.code]) {
        byCode[d.code] = { count: 0, files: new Set(), severity: d.severity };
      }
      byCode[d.code].count++;
      byCode[d.code].files.add(r.file);
    }
  }

  // Aggregate by object type × diagnostic code
  const byTypeCode: Record<string, Record<string, number>> = {};
  for (const r of results) {
    const type = objectType(r.file);
    if (!byTypeCode[type]) byTypeCode[type] = {};
    for (const d of r.diagnostics) {
      byTypeCode[type][d.code] = (byTypeCode[type][d.code] ?? 0) + 1;
    }
  }

  let md = '# C/AL Semantic Validation Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Summary
  md += '## Summary\n\n';
  md += `- **Total files:** ${results.length.toLocaleString()}\n`;
  md += `- **Total lines:** ${totalLines.toLocaleString()}\n`;
  md += `- **Files with diagnostics:** ${filesWithDiag.length.toLocaleString()}\n`;
  md += `- **Total diagnostics:** ${totalDiag.toLocaleString()}\n`;
  md += `- **Analysis time:** ${(totalTime / 1000).toFixed(2)}s\n\n`;

  if (totalDiag === 0) {
    md += '🎉 **No semantic diagnostics!**\n';
    return md;
  }

  // By diagnostic code
  md += '## Diagnostics by Code\n\n';
  md += '| Code | Severity | Count | Files Affected |\n';
  md += '|------|----------|-------|----------------|\n';
  Object.entries(byCode)
    .sort(([, a], [, b]) => b.count - a.count)
    .forEach(([code, stats]) => {
      md += `| \`${escapeMarkdown(code)}\` | ${severityLabel(stats.severity)} | ${stats.count.toLocaleString()} | ${stats.files.size.toLocaleString()} |\n`;
    });
  md += '\n';

  // By object type
  md += '## Diagnostics by Object Type\n\n';
  const allCodes = Object.keys(byCode).sort();
  const types = Object.keys(byTypeCode).sort();
  md += `| Object Type | Total | ${allCodes.map(c => `\`${escapeMarkdown(c)}\``).join(' | ')} |\n`;
  md += `|-------------|-------|${allCodes.map(() => '---').join('|')}|\n`;
  types
    .map(type => ({
      type,
      total: Object.values(byTypeCode[type]).reduce((s, n) => s + n, 0)
    }))
    .sort((a, b) => b.total - a.total)
    .forEach(({ type, total }) => {
      const cols = allCodes.map(code => byTypeCode[type][code]?.toLocaleString() ?? '-');
      md += `| ${escapeMarkdown(type)} | ${total.toLocaleString()} | ${cols.join(' | ')} |\n`;
    });
  md += '\n';

  // Top 20 files by diagnostic count
  md += '## Top 20 Files with Most Diagnostics\n\n';
  md += '| File | Lines | Diagnostics | Breakdown |\n';
  md += '|------|-------|-------------|----------|\n';
  filesWithDiag
    .sort((a, b) => b.diagnostics.length - a.diagnostics.length)
    .slice(0, 20)
    .forEach(r => {
      const breakdown = Object.entries(
        r.diagnostics.reduce((acc, d) => {
          acc[d.code] = (acc[d.code] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .sort(([, a], [, b]) => b - a)
        .map(([code, n]) => `${escapeMarkdown(code)}:${n}`)
        .join(', ');
      md += `| [${escapeMarkdown(r.file)}](test/REAL/${r.file}) | ${r.lines.toLocaleString()} | ${r.diagnostics.length} | ${breakdown} |\n`;
    });
  md += '\n';

  // Per-code detail: top 10 files per code
  md += '## Per-Code Detail\n\n';
  Object.entries(byCode)
    .sort(([, a], [, b]) => b.count - a.count)
    .forEach(([code, stats]) => {
      md += `### \`${escapeMarkdown(code)}\` — ${severityLabel(stats.severity)} (${stats.count.toLocaleString()} total, ${stats.files.size} files)\n\n`;

      // Top 10 files for this code
      const filesForCode = results
        .map(r => ({
          file: r.file,
          diagnostics: r.diagnostics.filter(d => d.code === code)
        }))
        .filter(r => r.diagnostics.length > 0)
        .sort((a, b) => b.diagnostics.length - a.diagnostics.length)
        .slice(0, 10);

      if (filesForCode.length > 0) {
        md += '**Top files:**\n\n';
        md += '| File | Count | Sample message |\n';
        md += '|------|-------|----------------|\n';
        filesForCode.forEach(r => {
          const sample = escapeMarkdown(r.diagnostics[0].message).substring(0, 80);
          md += `| [${escapeMarkdown(r.file)}](test/REAL/${r.file}) | ${r.diagnostics.length} | ${sample} |\n`;
        });
        md += '\n';
      }

      // Sample unique messages (up to 10)
      const uniqueMessages = [...new Set(
        results.flatMap(r => r.diagnostics.filter(d => d.code === code).map(d => d.message))
      )].slice(0, 10);
      md += '**Sample messages:**\n\n';
      uniqueMessages.forEach(msg => {
        md += `- ${escapeMarkdown(msg)}\n`;
      });
      md += '\n';
    });

  return md;
}

// Main execution
if (require.main === module && !process.env.JEST_WORKER_ID) {
  console.log('C/AL Semantic Validation Tool\n');
  console.log('Scanning test/REAL directory...\n');

  const startTime = Date.now();
  const results = validateAllRealFiles();
  const totalTime = Date.now() - startTime;

  console.log(`\nAnalysis complete in ${(totalTime / 1000).toFixed(2)}s`);
  console.log('Generating report...');

  const report = generateMarkdownReport(results);
  const reportPath = join(__dirname, '../../semantic-report.md');
  writeFileSync(reportPath, report, 'utf-8');

  const withDiag = results.filter(r => r.diagnostics.length > 0).length;
  console.log(`\nReport saved to: semantic-report.md`);
  console.log(`Files with diagnostics: ${withDiag}/${results.length}`);
  console.log(`Total diagnostics: ${results.reduce((s, r) => s + r.diagnostics.length, 0)}`);
}
