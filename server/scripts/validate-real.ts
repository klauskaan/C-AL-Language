import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { readFileWithEncoding } from '../src/utils/encoding';

interface ValidationResult {
  file: string;
  lines: number;
  parseTime: number;
  errors: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

function validateAllRealFiles(): ValidationResult[] {
  const realDir = join(__dirname, '../../test/REAL');
  const files = readdirSync(realDir)
    .filter(f => f.endsWith('.TXT'))
    .sort();

  console.log(`Found ${files.length} files to validate\n`);
  const results: ValidationResult[] = [];

  for (const file of files) {
    const filePath = join(realDir, file);
    const { content } = readFileWithEncoding(filePath);
    const lineCount = content.split('\n').length;

    const startTime = Date.now();
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    parser.parse();
    const errors = parser.getErrors();
    const parseTime = Date.now() - startTime;

    results.push({
      file,
      lines: lineCount,
      parseTime,
      errors: errors.map(e => ({
        line: e.token.line,
        column: e.token.column,
        message: e.message
      }))
    });

    // Progress indicator
    if (results.length % 100 === 0) {
      const filesWithErrors = results.filter(r => r.errors.length > 0).length;
      console.log(`Processed ${results.length}/${files.length} files (${filesWithErrors} with errors)...`);
    }
  }

  return results;
}

function generateMarkdownReport(results: ValidationResult[]): string {
  const filesWithErrors = results.filter(r => r.errors.length > 0);
  const totalErrors = filesWithErrors.reduce((sum, r) => sum + r.errors.length, 0);
  const totalTime = results.reduce((sum, r) => sum + r.parseTime, 0);
  const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
  const successRate = ((1 - filesWithErrors.length / results.length) * 100).toFixed(2);

  let md = '# C/AL Parser Validation Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Summary section
  md += '## Summary\n\n';
  md += `- **Total files:** ${results.length.toLocaleString()}\n`;
  md += `- **Total lines:** ${totalLines.toLocaleString()}\n`;
  md += `- **Files with errors:** ${filesWithErrors.length.toLocaleString()}\n`;
  md += `- **Total parse errors:** ${totalErrors.toLocaleString()}\n`;
  md += `- **Parse time:** ${(totalTime / 1000).toFixed(2)}s\n`;
  md += `- **Success rate:** ${successRate}%\n\n`;

  if (filesWithErrors.length === 0) {
    md += '🎉 **All files parsed successfully!**\n';
    return md;
  }

  // Error distribution by object type
  md += '## Error Distribution by Object Type\n\n';
  const errorsByType: Record<string, { files: number; errors: number }> = {};

  filesWithErrors.forEach(r => {
    const type = r.file.substring(0, 3); // TAB, COD, PAG, REP
    if (!errorsByType[type]) {
      errorsByType[type] = { files: 0, errors: 0 };
    }
    errorsByType[type].files++;
    errorsByType[type].errors += r.errors.length;
  });

  md += '| Object Type | Files with Errors | Total Errors | Avg Errors/File |\n';
  md += '|-------------|-------------------|--------------|------------------|\n';
  Object.entries(errorsByType)
    .sort(([, a], [, b]) => b.errors - a.errors)
    .forEach(([type, stats]) => {
      const avg = (stats.errors / stats.files).toFixed(1);
      md += `| ${type} | ${stats.files} | ${stats.errors} | ${avg} |\n`;
    });
  md += '\n';

  // Top 20 files with most errors
  md += '## Top 20 Files with Most Errors\n\n';
  md += '| File | Lines | Errors | Parse Time |\n';
  md += '|------|-------|--------|------------|\n';
  filesWithErrors
    .sort((a, b) => b.errors.length - a.errors.length)
    .slice(0, 20)
    .forEach(r => {
      md += `| [${r.file}](test/REAL/${r.file}) | ${r.lines.toLocaleString()} | ${r.errors.length} | ${r.parseTime}ms |\n`;
    });
  md += '\n';

  // Detailed error listings
  md += '## Detailed Error Listings\n\n';
  md += `Showing all ${filesWithErrors.length} files with parse errors.\n\n`;

  filesWithErrors
    .sort((a, b) => b.errors.length - a.errors.length)
    .forEach(r => {
      md += `### [${r.file}](test/REAL/${r.file}) (${r.errors.length} ${r.errors.length === 1 ? 'error' : 'errors'})\n\n`;
      md += `**Lines:** ${r.lines.toLocaleString()} | **Parse time:** ${r.parseTime}ms\n\n`;

      r.errors.forEach(e => {
        md += `- **Line ${e.line}:${e.column}** - ${e.message}\n`;
      });
      md += '\n';
    });

  return md;
}

// Main execution
console.log('C/AL Parser Validation Tool\n');
console.log('Scanning test/REAL directory...\n');

const startTime = Date.now();
const results = validateAllRealFiles();
const totalTime = Date.now() - startTime;

console.log(`\nValidation complete in ${(totalTime / 1000).toFixed(2)}s`);
console.log('Generating report...');

const report = generateMarkdownReport(results);
const reportPath = join(__dirname, '../../validation-report.md');
writeFileSync(reportPath, report, 'utf-8');

const filesWithErrors = results.filter(r => r.errors.length > 0).length;
console.log(`\nReport saved to: validation-report.md`);
console.log(`Files with errors: ${filesWithErrors}/${results.length}`);
