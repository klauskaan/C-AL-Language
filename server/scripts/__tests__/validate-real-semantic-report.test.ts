/**
 * Tests for validate-real-semantic.ts report generation
 *
 * Tests cover:
 * - severityLabel() function (all 5 cases)
 * - objectType() function (extracts first 3 chars uppercased)
 * - generateMarkdownReport() function (all sections, markdown escaping)
 * - validateAllRealFiles() orchestration (mocking, timers, tableRegistryPopulated)
 *
 * These tests require the exported functions from validate-real-semantic.ts.
 */

import { DiagnosticSeverity } from 'vscode-languageserver';

import {
  severityLabel,
  objectType,
  generateMarkdownReport,
  validateAllRealFiles,
  SemanticValidationResult
} from '../validate-real-semantic';

// Mock modules for validateAllRealFiles tests
jest.mock('fs');
jest.mock('../../src/utils/encoding');
jest.mock('../../src/lexer/lexer');
jest.mock('../../src/parser/parser');
jest.mock('../../src/symbols/symbolTable');
jest.mock('../../src/semantic/semanticAnalyzer');
jest.mock('../../src/builtins/builtinRegistry');

import { readdirSync } from 'fs';
import { readFileWithEncoding } from '../../src/utils/encoding';
import { Lexer } from '../../src/lexer/lexer';
import { Parser } from '../../src/parser/parser';
import { SymbolTable } from '../../src/symbols/symbolTable';
import { SemanticAnalyzer } from '../../src/semantic/semanticAnalyzer';
import { BuiltinRegistry } from '../../src/builtins/builtinRegistry';

// Mock timers for deterministic timestamps
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));

/**
 * Factory function to create SemanticValidationResult objects with sensible defaults.
 */
function createSemanticValidationResult(
  overrides: Partial<SemanticValidationResult> = {}
): SemanticValidationResult {
  return {
    file: 'test.txt',
    lines: 100,
    analyzeTime: 10,
    diagnostics: [],
    ...overrides
  };
}

describe('severityLabel', () => {
  it('should return "Error" for DiagnosticSeverity.Error (1)', () => {
    expect(severityLabel(DiagnosticSeverity.Error)).toBe('Error');
  });

  it('should return "Warning" for DiagnosticSeverity.Warning (2)', () => {
    expect(severityLabel(DiagnosticSeverity.Warning)).toBe('Warning');
  });

  it('should return "Information" for DiagnosticSeverity.Information (3)', () => {
    expect(severityLabel(DiagnosticSeverity.Information)).toBe('Information');
  });

  it('should return "Hint" for DiagnosticSeverity.Hint (4)', () => {
    expect(severityLabel(DiagnosticSeverity.Hint)).toBe('Hint');
  });

  it('should return "Unknown" for unrecognized severity value', () => {
    expect(severityLabel(999)).toBe('Unknown');
    expect(severityLabel(0)).toBe('Unknown');
    expect(severityLabel(-1)).toBe('Unknown');
  });
});

describe('objectType', () => {
  it('should extract first 3 characters uppercased from filename', () => {
    expect(objectType('TAB12345.TXT')).toBe('TAB');
  });

  it('should uppercase lowercase filenames', () => {
    expect(objectType('cod50000.txt')).toBe('COD');
  });

  it('should handle mixed case filenames', () => {
    expect(objectType('PaG9999.TXT')).toBe('PAG');
  });

  it('should handle filenames with special characters', () => {
    expect(objectType('T|B12345.TXT')).toBe('T|B');
    expect(objectType('T*B12345.TXT')).toBe('T*B');
    expect(objectType('T_B12345.TXT')).toBe('T_B');
  });

  it('should handle filenames shorter than 3 characters', () => {
    expect(objectType('AB.TXT')).toBe('AB.');
    expect(objectType('X.TXT')).toBe('X.T');
  });

  it('should handle empty filename', () => {
    expect(objectType('')).toBe('');
  });
});

describe('generateMarkdownReport (semantic)', () => {
  describe('Report structure', () => {
    it('should include header with timestamp', () => {
      const results: SemanticValidationResult[] = [createSemanticValidationResult()];
      const report = generateMarkdownReport(results);

      expect(report).toContain('# C/AL Semantic Validation Report');
      expect(report).toMatch(/\*\*Generated:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      expect(report).toContain('**Generated:** 2024-01-15T10:00:00.000Z');
    });

    it('should include summary section with statistics', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file1.txt',
          lines: 200,
          analyzeTime: 50,
          diagnostics: [
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Undefined', line: 1, column: 1 }
          ]
        }),
        createSemanticValidationResult({
          file: 'file2.txt',
          lines: 300,
          analyzeTime: 75,
          diagnostics: []
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('## Summary');
      expect(report).toContain('- **Total files:** 2');
      expect(report).toContain('- **Total lines:** 500');
      expect(report).toContain('- **Files with diagnostics:** 1');
      expect(report).toContain('- **Total diagnostics:** 1');
      expect(report).toContain('- **Analysis time:** 0.13s'); // 125ms total
    });

    it('should return early with celebration for zero diagnostics', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({ diagnostics: [] }),
        createSemanticValidationResult({ diagnostics: [] })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('🎉 **No semantic diagnostics!**');
      expect(report).not.toContain('## Diagnostics by Code');
      expect(report).not.toContain('## Diagnostics by Object Type');
      expect(report).not.toContain('## Top 20 Files');
    });
  });

  describe('Diagnostics by Code section', () => {
    it('should create table with code, severity, count, and files affected', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file1.txt',
          diagnostics: [
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Undefined x', line: 1, column: 1 },
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Undefined y', line: 2, column: 1 }
          ]
        }),
        createSemanticValidationResult({
          file: 'file2.txt',
          diagnostics: [
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Undefined z', line: 1, column: 1 },
            { code: 'type-mismatch', severity: DiagnosticSeverity.Warning, message: 'Type error', line: 5, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('## Diagnostics by Code');
      expect(report).toContain('| Code | Severity | Count | Files Affected |');
      expect(report).toContain('| `undefined-var` | Error | 3 | 2 |');
      expect(report).toContain('| `type-mismatch` | Warning | 1 | 1 |');
    });

    it('should sort by count descending', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          diagnostics: [
            { code: 'rare-error', severity: DiagnosticSeverity.Error, message: 'Rare', line: 1, column: 1 },
            { code: 'common-error', severity: DiagnosticSeverity.Error, message: 'Common 1', line: 2, column: 1 },
            { code: 'common-error', severity: DiagnosticSeverity.Error, message: 'Common 2', line: 3, column: 1 },
            { code: 'common-error', severity: DiagnosticSeverity.Error, message: 'Common 3', line: 4, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // common-error should appear before rare-error
      const commonPos = report.indexOf('`common-error`');
      const rarePos = report.indexOf('`rare-error`');
      expect(commonPos).toBeLessThan(rarePos);
    });
  });

  describe('Diagnostics by Object Type section', () => {
    it('should create cross-tabulation table', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'TAB18.txt',
          diagnostics: [
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Error', line: 1, column: 1 }
          ]
        }),
        createSemanticValidationResult({
          file: 'COD50000.txt',
          diagnostics: [
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Error', line: 1, column: 1 },
            { code: 'type-mismatch', severity: DiagnosticSeverity.Warning, message: 'Warning', line: 2, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('## Diagnostics by Object Type');
      // Header row should include all diagnostic codes
      expect(report).toContain('| Object Type | Total | `type-mismatch` | `undefined-var` |');
      // COD row should show both diagnostics
      expect(report).toMatch(/\| COD \| 2 \| 1 \| 1 \|/);
      // TAB row should show only undefined-var
      expect(report).toMatch(/\| TAB \| 1 \| - \| 1 \|/);
    });

    it('should sort object types by total diagnostics descending', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'TAB18.txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 }
          ]
        }),
        createSemanticValidationResult({
          file: 'COD50000.txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 },
            { code: 'error2', severity: DiagnosticSeverity.Error, message: 'E2', line: 2, column: 1 },
            { code: 'error3', severity: DiagnosticSeverity.Error, message: 'E3', line: 3, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // COD (3 diagnostics) should appear before TAB (1 diagnostic)
      const codPos = report.lastIndexOf('| COD |');
      const tabPos = report.lastIndexOf('| TAB |');
      expect(codPos).toBeLessThan(tabPos);
    });
  });

  describe('Top 20 Files section', () => {
    it('should list top 20 files by diagnostic count', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file1.txt',
          lines: 100,
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 },
            { code: 'error2', severity: DiagnosticSeverity.Error, message: 'E2', line: 2, column: 1 }
          ]
        }),
        createSemanticValidationResult({
          file: 'file2.txt',
          lines: 200,
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('## Top 20 Files with Most Diagnostics');
      expect(report).toContain('| File | Lines | Diagnostics | Breakdown |');
      expect(report).toContain('| [file1.txt](test/REAL/file1.txt) | 100 | 2 | error1:1, error2:1 |');
      expect(report).toContain('| [file2.txt](test/REAL/file2.txt) | 200 | 1 | error1:1 |');
    });

    it('should sort files by diagnostic count descending', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'high.txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 },
            { code: 'error2', severity: DiagnosticSeverity.Error, message: 'E2', line: 2, column: 1 },
            { code: 'error3', severity: DiagnosticSeverity.Error, message: 'E3', line: 3, column: 1 }
          ]
        }),
        createSemanticValidationResult({
          file: 'low.txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // high.txt should appear before low.txt in the Top 20 Files section
      const top20Section = report.substring(
        report.indexOf('## Top 20 Files'),
        report.indexOf('## Per-Code Detail')
      );
      const highPos = top20Section.indexOf('[high.txt]');
      const lowPos = top20Section.indexOf('[low.txt]');
      expect(highPos).toBeLessThan(lowPos);
    });

    it('should limit to 20 files even if more exist', () => {
      const results: SemanticValidationResult[] = Array.from({ length: 30 }, (_, i) =>
        createSemanticValidationResult({
          file: `file${i}.txt`,
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'E1', line: 1, column: 1 }
          ]
        })
      );

      const report = generateMarkdownReport(results);

      // Count how many file links appear in the Top 20 section
      const top20Section = report.substring(
        report.indexOf('## Top 20 Files'),
        report.indexOf('## Per-Code Detail')
      );
      const linkMatches = top20Section.match(/\[file\d+\.txt\]/g);
      expect(linkMatches).toHaveLength(20);
    });

    it('should show breakdown sorted by count descending', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'test.txt',
          diagnostics: [
            { code: 'rare', severity: DiagnosticSeverity.Error, message: 'R1', line: 1, column: 1 },
            { code: 'common', severity: DiagnosticSeverity.Error, message: 'C1', line: 2, column: 1 },
            { code: 'common', severity: DiagnosticSeverity.Error, message: 'C2', line: 3, column: 1 },
            { code: 'common', severity: DiagnosticSeverity.Error, message: 'C3', line: 4, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Breakdown should show common:3 before rare:1
      expect(report).toContain('common:3, rare:1');
    });
  });

  describe('Per-Code Detail section', () => {
    it('should create subsections for each diagnostic code', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file1.txt',
          diagnostics: [
            { code: 'undefined-var', severity: DiagnosticSeverity.Error, message: 'Undefined x', line: 1, column: 1 },
            { code: 'type-mismatch', severity: DiagnosticSeverity.Warning, message: 'Type error', line: 2, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('## Per-Code Detail');
      expect(report).toContain('### `undefined-var` — Error (1 total, 1 files)');
      expect(report).toContain('### `type-mismatch` — Warning (1 total, 1 files)');
    });

    it('should show top 10 files for each code', () => {
      const results: SemanticValidationResult[] = Array.from({ length: 15 }, (_, i) =>
        createSemanticValidationResult({
          file: `file${i}.txt`,
          diagnostics: [
            { code: 'test-error', severity: DiagnosticSeverity.Error, message: `Error ${i}`, line: 1, column: 1 }
          ]
        })
      );

      const report = generateMarkdownReport(results);

      expect(report).toContain('**Top files:**');
      expect(report).toContain('| File | Count | Sample message |');

      // Should have exactly 10 file links in the top files table
      const detailSection = report.substring(report.indexOf('### `test-error`'));
      const linkMatches = detailSection.match(/\[file\d+\.txt\]\(test\/REAL\/file\d+\.txt\)/g) || [];
      // 10 in top files table
      expect(linkMatches.length).toBeGreaterThanOrEqual(10);
    });

    it('should show sample messages (up to 10 unique)', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file1.txt',
          diagnostics: [
            { code: 'test-error', severity: DiagnosticSeverity.Error, message: 'Message A', line: 1, column: 1 },
            { code: 'test-error', severity: DiagnosticSeverity.Error, message: 'Message B', line: 2, column: 1 },
            { code: 'test-error', severity: DiagnosticSeverity.Error, message: 'Message A', line: 3, column: 1 } // duplicate
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('**Sample messages:**');
      expect(report).toContain('- Message A');
      expect(report).toContain('- Message B');

      // Should only appear once each despite duplicate
      const detailSection = report.substring(report.indexOf('**Sample messages:**'));
      const messageAMatches = (detailSection.match(/- Message A/g) || []).length;
      const messageBMatches = (detailSection.match(/- Message B/g) || []).length;
      expect(messageAMatches).toBe(1);
      expect(messageBMatches).toBe(1);
    });

    it('should truncate sample message to 80 chars', () => {
      const longMessage = 'A'.repeat(100);
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'test.txt',
          diagnostics: [
            { code: 'test-error', severity: DiagnosticSeverity.Error, message: longMessage, line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // In the top files table, sample should be truncated
      const truncated = longMessage.substring(0, 80);
      expect(report).toContain(`| ${truncated} |`);
    });
  });

  describe('Markdown escaping', () => {
    it('should escape special characters in diagnostic codes', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          diagnostics: [
            { code: 'error|with|pipes', severity: DiagnosticSeverity.Error, message: 'Test', line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('`error\\|with\\|pipes`');
      expect(report).not.toContain('`error|with|pipes`');
    });

    it('should escape special characters in object types', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'T|B12345.txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'Test', line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Object type in table should be escaped
      expect(report).toContain('| T\\|B |');
    });

    it('should escape special characters in filenames (display text only)', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file|with|special#chars[].txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'Test', line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Display text should be escaped, URL should not
      expect(report).toContain('[file\\|with\\|special\\#chars\\[\\].txt](test/REAL/file|with|special#chars[].txt)');
    });

    it('should escape special characters in diagnostic messages', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          diagnostics: [
            {
              code: 'error1',
              severity: DiagnosticSeverity.Error,
              message: 'Expected **bold** _italic_ `code` |pipe|',
              line: 1,
              column: 1
            }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('Expected \\*\\*bold\\*\\* \\_italic\\_ \\`code\\` \\|pipe\\|');
    });

    it('should handle backslash escaping correctly', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          file: 'file\\with\\backslash.txt',
          diagnostics: [
            { code: 'error1', severity: DiagnosticSeverity.Error, message: 'Path: C:\\NAV\\Data', line: 1, column: 1 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('file\\\\with\\\\backslash.txt');
      expect(report).toContain('Path: C:\\\\NAV\\\\Data');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty results array', () => {
      const results: SemanticValidationResult[] = [];
      const report = generateMarkdownReport(results);

      expect(report).toContain('# C/AL Semantic Validation Report');
      expect(report).toContain('- **Total files:** 0');
      expect(report).toContain('- **Total lines:** 0');
      expect(report).toContain('🎉 **No semantic diagnostics!**');
    });

    it('should handle diagnostics with missing optional fields', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          diagnostics: [
            { code: '', severity: 0, message: '', line: 0, column: 0 }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Should not crash
      expect(report).toContain('# C/AL Semantic Validation Report');
    });

    it('should handle very large numbers with locale formatting', () => {
      const results: SemanticValidationResult[] = [
        createSemanticValidationResult({
          lines: 1234567,
          analyzeTime: 9876,
          diagnostics: []
        })
      ];

      const report = generateMarkdownReport(results);

      // Check that large numbers are formatted with commas
      expect(report).toContain('1,234,567');
    });
  });
});

describe('validateAllRealFiles', () => {
  // Suppress console.log output during tests
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Set up Date.now() mock for deterministic timing
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // start time
      .mockReturnValueOnce(1050); // after first file (50ms)
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Orchestration', () => {
    it('should read directory and filter for .txt files', () => {
      const mockFiles = ['file1.txt', 'file2.cal', 'file3.TXT', 'file4.md'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({ content: 'OBJECT Table 18 Test\n{}\n' });

      // Mock all the chain
      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      const results = validateAllRealFiles();

      // Should filter to only .txt files (case insensitive)
      expect(results).toHaveLength(2); // file1.txt and file3.TXT
      expect(results[0].file).toBe('file1.txt');
      expect(results[1].file).toBe('file3.TXT');
    });

    it('should call readFileWithEncoding 3N times (table registry + field registry + validation)', () => {
      const mockFiles = ['table1.txt', 'table2.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);

      // Use mockReturnValue to return same content for all 3 phases
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Customer\n{\n  FIELDS { { 1 ; ; No. ; Code20 } }\n}\n'
      });

      // Mock lexer/parser chain
      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          object: {
            objectKind: 'Table', // ObjectKind.Table (string enum)
            objectId: 18,
            objectName: 'Customer',
            fields: {
              fields: [
                { fieldName: 'No.', dataType: { type: 'Code20' } }
              ]
            }
          }
        })
      };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // N files × 3 phases (table registry + field registry + validation loop)
      // = 2 files × 3 = 6 calls
      expect(readFileWithEncoding).toHaveBeenCalledTimes(6);
    });

    it('should build table registry from all files', () => {
      const mockFiles = ['table1.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Customer\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          object: {
            objectKind: 'Table', // ObjectKind.Table (string enum)
            objectId: 18,
            objectName: 'Customer',
            fields: null // No fields section
          }
        })
      };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // Verify symbolTable.buildFromAST was called with tableRegistry
      expect(mockSymbolTable.buildFromAST).toHaveBeenCalled();
      const buildCall = mockSymbolTable.buildFromAST.mock.calls[0];
      const tableRegistry = buildCall[1];
      expect(tableRegistry).toBeInstanceOf(Map);
      expect(tableRegistry.get(18)).toBe('Customer');
    });

    it('should build field registry from all table files', () => {
      const mockFiles = ['table1.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);

      // Mock readFileWithEncoding to return same content for all phases
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Customer\n{\n  FIELDS { { 1 ; ; No. ; Code20 } }\n}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      // Parser returns same result for all phases
      const mockParser = {
        parse: jest.fn().mockReturnValue({
          object: {
            objectKind: 'Table', // ObjectKind.Table (string enum)
            objectId: 18,
            objectName: 'Customer',
            fields: {
              fields: [
                { fieldName: 'No.', dataType: { typeName: 'Code20' } }
              ]
            }
          }
        })
      };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // Verify symbolTable.buildFromAST was called with fieldRegistry
      const buildCall = mockSymbolTable.buildFromAST.mock.calls[0];
      const fieldRegistry = buildCall[2];
      expect(fieldRegistry).toBeInstanceOf(Map);
      const tableFields = fieldRegistry.get(18);
      expect(tableFields).toBeInstanceOf(Map);
      expect(tableFields?.get('NO.')).toEqual({ originalName: 'No.', typeName: 'Code20' });
    });

    it('should propagate tableRegistryPopulated flag from symbolTable to analyzer', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      // Test with hadTableRegistry = true
      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: true // Set to true
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // Verify analyzer.analyze was called with tableRegistryPopulated = true
      expect(mockAnalyzer.analyze).toHaveBeenCalled();
      const analyzeCall = mockAnalyzer.analyze.mock.calls[0];
      const options = analyzeCall[3]; // 4th argument (options object)
      expect(options.tableRegistryPopulated).toBe(true);
    });

    it('should pass fieldRegistry and tableRegistry to analyzer.analyze', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // Verify analyzer.analyze received both registries
      const analyzeCall = mockAnalyzer.analyze.mock.calls[0];
      const options = analyzeCall[3]; // 4th argument (options object)

      expect(options.fieldRegistry).toBeInstanceOf(Map);
      expect(options.tableRegistry).toBeInstanceOf(Map);
    });
  });

  describe('Result structure', () => {
    it('should return array of SemanticValidationResult objects', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{ }'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([
          {
            code: 'test-error',
            severity: DiagnosticSeverity.Error,
            message: 'Test error message',
            range: {
              start: { line: 0, character: 0 }
            }
          }
        ])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      const results = validateAllRealFiles();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        file: 'test.txt',
        lines: 2,
        analyzeTime: expect.any(Number),
        diagnostics: [
          {
            code: 'test-error',
            severity: DiagnosticSeverity.Error,
            message: 'Test error message',
            line: 1, // 0-indexed to 1-indexed
            column: 1 // 0-indexed to 1-indexed
          }
        ]
      });
    });

    it('should count lines correctly', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'Line 1\nLine 2\nLine 3'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      const results = validateAllRealFiles();

      expect(results[0].lines).toBe(3);
    });

    it('should measure analyzeTime using Date.now()', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      const results = validateAllRealFiles();

      // analyzeTime should be 50ms (1050 - 1000)
      expect(results[0].analyzeTime).toBe(50);
    });

    it('should convert 0-indexed positions to 1-indexed in diagnostics', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([
          {
            code: 'test',
            severity: DiagnosticSeverity.Error,
            message: 'Error',
            range: {
              start: { line: 5, character: 10 } // 0-indexed
            }
          }
        ])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      const results = validateAllRealFiles();

      expect(results[0].diagnostics[0].line).toBe(6); // 5 + 1
      expect(results[0].diagnostics[0].column).toBe(11); // 10 + 1
    });

    it('should handle diagnostics with missing range/code/severity', () => {
      const mockFiles = ['test.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([
          {
            // Missing code, severity, and range
            message: 'Error'
          }
        ])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      const results = validateAllRealFiles();

      expect(results[0].diagnostics[0]).toMatchObject({
        code: 'unknown', // default
        severity: DiagnosticSeverity.Warning, // default
        message: 'Error',
        line: 1, // 0 + 1 (default)
        column: 1 // 0 + 1 (default)
      });
    });
  });

  describe('Progress reporting', () => {
    it('should log progress every 200 files', () => {
      const mockFiles = Array.from({ length: 250 }, (_, i) => `file${i}.txt`);
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Table 18 Test\n{}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = { parse: jest.fn().mockReturnValue({ object: null }) };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // Should log at 200 files
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed 200/250 files')
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty directory', () => {
      (readdirSync as unknown as jest.Mock).mockReturnValue([]);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => ({
        analyze: jest.fn().mockReturnValue([])
      }));

      const results = validateAllRealFiles();

      expect(results).toHaveLength(0);
    });

    it('should handle non-table objects (skip from registries)', () => {
      const mockFiles = ['codeunit.txt'];
      (readdirSync as unknown as jest.Mock).mockReturnValue(mockFiles);
      (readFileWithEncoding as unknown as jest.Mock).mockReturnValue({
        content: 'OBJECT Codeunit 50000 Test\n{\n  CODE {}\n}\n'
      });

      const mockLexer = { tokenize: jest.fn().mockReturnValue([]) };
      (Lexer as unknown as jest.Mock).mockImplementation(() => mockLexer);

      const mockParser = {
        parse: jest.fn().mockReturnValue({
          object: {
            objectKind: 'Codeunit', // ObjectKind.Codeunit (string enum)
            objectId: 50000,
            objectName: 'Test'
          }
        })
      };
      (Parser as unknown as jest.Mock).mockImplementation(() => mockParser);

      const mockSymbolTable = {
        buildFromAST: jest.fn(),
        hadTableRegistry: false
      };
      (SymbolTable as unknown as jest.Mock).mockImplementation(() => mockSymbolTable);

      const mockAnalyzer = {
        analyze: jest.fn().mockReturnValue([])
      };
      (SemanticAnalyzer as unknown as jest.Mock).mockImplementation(() => mockAnalyzer);

      (BuiltinRegistry as unknown as jest.Mock).mockImplementation(() => ({}));

      validateAllRealFiles();

      // Should still process the file, just not add to registries
      expect(mockAnalyzer.analyze).toHaveBeenCalled();
    });
  });
});
