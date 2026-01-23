/**
 * CI Guard for test/REAL/ Content Leak Prevention
 *
 * Tests for the CI guard utility that prevents proprietary NAV object content
 * from test/REAL/ from being accidentally committed in fixtures or snapshots.
 *
 * Background:
 * - test/REAL/ contains proprietary NAV C/AL objects (gitignored)
 * - These files can be read/parsed for analysis during development
 * - They must NEVER be copied to committed files (fixtures, snapshots, etc.)
 * - The CI guard scans fixtures and snapshots for test/REAL/ path references
 *
 * TDD Note:
 * These tests are EXPECTED TO FAIL initially because ciRealGuard.ts doesn't exist yet.
 * This validates our diagnosis that we need this guard functionality.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runCLI, checkForRealPaths } from '../utils/ciRealGuard';

describe('CI REAL Guard', () => {
  let tempDir: string;
  let fixturesDir: string;
  let snapshotsDir: string;

  beforeEach(() => {
    // Create temporary directory structure mimicking the project
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-guard-test-'));
    fixturesDir = path.join(tempDir, 'test', 'fixtures');
    snapshotsDir = path.join(tempDir, 'server', 'src', '__tests__', '__snapshots__');

    fs.mkdirSync(fixturesDir, { recursive: true });
    fs.mkdirSync(snapshotsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Clean repository validation', () => {
    it('should pass when no test/REAL/ references exist', () => {
      // Create clean fixture with synthetic content
      const fixtureFile = path.join(fixturesDir, 'table-customer.cal');
      fs.writeFileSync(fixtureFile, `
OBJECT Table 18 Customer
{
  PROPERTIES
  {
    DataCaptionFields=No.,Name;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
}
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass when fixtures contain only synthetic test data', () => {
      // Multiple clean fixtures
      const fixture1 = path.join(fixturesDir, 'table-item.cal');
      const fixture2 = path.join(fixturesDir, 'codeunit-test.cal');

      fs.writeFileSync(fixture1, 'OBJECT Table 27 Item\n{ PROPERTIES { } }');
      fs.writeFileSync(fixture2, 'OBJECT Codeunit 50000 Test\n{ }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass when snapshots contain synthetic data', () => {
      const snapshotFile = path.join(snapshotsDir, 'parser.test.ts.snap');
      fs.writeFileSync(snapshotFile, `
// Jest Snapshot v1

exports[\`should parse table correctly 1\`] = \`
{
  type: "Table",
  id: 18,
  name: "Customer"
}
\`;
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Fixture violation detection', () => {
    it('should fail when fixture contains test/REAL/ path', () => {
      const fixtureFile = path.join(fixturesDir, 'leaked-content.cal');
      fs.writeFileSync(fixtureFile, `
OBJECT Table 6000001 ProprietaryTable
{
  PROPERTIES
  {
    // This was copied from test/REAL/Table-6000001.cal
    DataCaptionFields=No.,Name;
  }
}
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('leaked-content.cal');
      expect(result.violations[0]).toContain('test/REAL/');
    });

    it('should fail when fixture references test/REAL/ in comment', () => {
      const fixtureFile = path.join(fixturesDir, 'with-real-reference.cal');
      fs.writeFileSync(fixtureFile, `
// Source: test/REAL/Codeunit-50000.cal
OBJECT Codeunit 50000 Test
{ }
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/with-real-reference\.cal.*test\/REAL\//)
      ]));
    });

    it('should detect test/REAL/ path with backslashes (Windows-style)', () => {
      const fixtureFile = path.join(fixturesDir, 'windows-path.cal');
      fs.writeFileSync(fixtureFile, `
// From: test\\REAL\\Table-18.cal
OBJECT Table 18 Customer
{ }
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/windows-path\.cal/)
      ]));
    });

    it('should detect test/REAL/ path in middle of file content', () => {
      const fixtureFile = path.join(fixturesDir, 'embedded-reference.cal');
      fs.writeFileSync(fixtureFile, `
OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
    // Debug: parsing test/REAL/large-codeunit.cal
  }
  CODE
  {
    BEGIN
    END.
  }
}
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/embedded-reference\.cal.*test\/REAL\//)
      ]));
    });

    it('should detect multiple violations in single fixture', () => {
      const fixtureFile = path.join(fixturesDir, 'multiple-refs.cal');
      fs.writeFileSync(fixtureFile, `
// Reference 1: test/REAL/Table-18.cal
// Reference 2: test/REAL/Codeunit-50000.cal
OBJECT Table 18 Customer
{ }
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      // At least one violation detected (implementation may report file once or per line)
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('multiple-refs.cal');
    });

    it('should detect violations across multiple fixture files', () => {
      const fixture1 = path.join(fixturesDir, 'leaked1.cal');
      const fixture2 = path.join(fixturesDir, 'leaked2.cal');

      fs.writeFileSync(fixture1, '// From test/REAL/Table-18.cal\nOBJECT Table 18 Customer { }');
      fs.writeFileSync(fixture2, '// From test/REAL/Codeunit-1.cal\nOBJECT Codeunit 1 Test { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);

      const violationText = result.violations.join('\n');
      expect(violationText).toContain('leaked1.cal');
      expect(violationText).toContain('leaked2.cal');
    });
  });

  describe('Snapshot violation detection', () => {
    it('should fail when snapshot contains test/REAL/ path', () => {
      const snapshotFile = path.join(snapshotsDir, 'leaked.test.ts.snap');
      fs.writeFileSync(snapshotFile, `
// Jest Snapshot v1

exports[\`should parse large file 1\`] = \`
Parsed from: test/REAL/Table-6000001.cal
{
  type: "Table",
  id: 6000001
}
\`;
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/leaked\.test\.ts\.snap.*test\/REAL\//)
      ]));
    });

    it('should detect test/REAL/ in snapshot AST dump', () => {
      const snapshotFile = path.join(snapshotsDir, 'parser.test.ts.snap');
      fs.writeFileSync(snapshotFile, `
exports[\`complex object 1\`] = \`
Object {
  "fileName": "test/REAL/Codeunit-50000.cal",
  "type": "Codeunit"
}
\`;
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/parser\.test\.ts\.snap/)
      ]));
    });

    it('should detect violations in both fixtures and snapshots', () => {
      const fixtureFile = path.join(fixturesDir, 'fixture-leak.cal');
      const snapshotFile = path.join(snapshotsDir, 'snapshot-leak.snap');

      fs.writeFileSync(fixtureFile, '// test/REAL/Table-18.cal\nOBJECT Table 18 { }');
      fs.writeFileSync(snapshotFile, 'exports[`test`] = `from test/REAL/Codeunit.cal`');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);

      const violationText = result.violations.join('\n');
      expect(violationText).toContain('fixture-leak.cal');
      expect(violationText).toContain('snapshot-leak.snap');
    });
  });

  describe('Source code exemption', () => {
    it('should ignore test/REAL/ references in TypeScript source files', () => {
      // Create source directory
      const srcDir = path.join(tempDir, 'server', 'src', 'parser');
      fs.mkdirSync(srcDir, { recursive: true });

      // TypeScript source with legitimate test/REAL/ reference
      const sourceFile = path.join(srcDir, 'parser.ts');
      fs.writeFileSync(sourceFile, `
// This parser is tested against files in test/REAL/ directory
export function parseFile(content: string) {
  // Implementation that reads from test/REAL/ during development
  return parse(content);
}
`.trim());

      const result = checkForRealPaths(tempDir);

      // Should pass - .ts files are exempt from the guard
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should ignore test/REAL/ in test source files', () => {
      const testDir = path.join(tempDir, 'server', 'src', '__tests__');
      fs.mkdirSync(testDir, { recursive: true });

      const testFile = path.join(testDir, 'parser.test.ts');
      fs.writeFileSync(testFile, `
describe('Parser', () => {
  it('should read from test/REAL/ directory', () => {
    const files = fs.readdirSync('test/REAL/');
    expect(files.length).toBeGreaterThan(0);
  });
});
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should check fixtures even when source files contain test/REAL/', () => {
      const srcDir = path.join(tempDir, 'server', 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Legitimate source reference (should be ignored)
      const sourceFile = path.join(srcDir, 'loader.ts');
      fs.writeFileSync(sourceFile, 'const realDir = "test/REAL/";');

      // Illegitimate fixture reference (should be caught)
      const fixtureFile = path.join(fixturesDir, 'leaked.cal');
      fs.writeFileSync(fixtureFile, '// From test/REAL/Table.cal\nOBJECT Table 1 { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/leaked\.cal/)
      ]));
      // Violations should not mention the source file
      expect(result.violations.join('\n')).not.toContain('loader.ts');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty fixtures directory gracefully', () => {
      // fixturesDir exists but is empty
      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle empty snapshots directory gracefully', () => {
      // snapshotsDir exists but is empty
      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle missing fixtures directory gracefully', () => {
      // Delete fixtures directory
      fs.rmSync(fixturesDir, { recursive: true });

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle missing snapshots directory gracefully', () => {
      // Delete snapshots directory
      fs.rmSync(snapshotsDir, { recursive: true });

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle empty files without errors', () => {
      const emptyFixture = path.join(fixturesDir, 'empty.cal');
      const emptySnapshot = path.join(snapshotsDir, 'empty.snap');

      fs.writeFileSync(emptyFixture, '');
      fs.writeFileSync(emptySnapshot, '');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should be case-insensitive for path detection', () => {
      const fixtureFile = path.join(fixturesDir, 'case-variant.cal');
      fs.writeFileSync(fixtureFile, `
// Mixed case: test/Real/Table-18.cal
// Upper case: TEST/REAL/Codeunit.cal
OBJECT Table 18 Customer { }
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/case-variant\.cal/)
      ]));
    });

    it('should handle very long file paths', () => {
      // Create nested directory structure
      const deepDir = path.join(fixturesDir, 'level1', 'level2', 'level3', 'level4');
      fs.mkdirSync(deepDir, { recursive: true });

      const deepFile = path.join(deepDir, 'deep-fixture.cal');
      fs.writeFileSync(deepFile, '// test/REAL/Table.cal\nOBJECT Table 1 { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/deep-fixture\.cal/)
      ]));
    });

    it('should handle binary files gracefully', () => {
      // Create a binary file in fixtures (should be ignored or handled safely)
      const binaryFile = path.join(fixturesDir, 'binary.dat');
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);
      fs.writeFileSync(binaryFile, binaryData);

      const result = checkForRealPaths(tempDir);

      // Should not crash - binary files should be skipped or handled
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
    });
  });

  describe('Violation reporting format', () => {
    it('should include file path in violation message', () => {
      const fixtureFile = path.join(fixturesDir, 'leaked.cal');
      fs.writeFileSync(fixtureFile, '// test/REAL/Table.cal\nOBJECT Table 1 { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain('leaked.cal');
    });

    it('should include relative path from base directory', () => {
      const fixtureFile = path.join(fixturesDir, 'leaked.cal');
      fs.writeFileSync(fixtureFile, '// test/REAL/Table.cal\nOBJECT Table 1 { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      // Should show relative path like "test/fixtures/leaked.cal"
      expect(result.violations[0]).toContain('test/fixtures');
    });

    it('should be usable in CI failure message', () => {
      const fixtureFile = path.join(fixturesDir, 'leaked.cal');
      fs.writeFileSync(fixtureFile, '// test/REAL/Table.cal\nOBJECT Table 1 { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);

      // Violations should be joinable into error message
      const errorMessage = result.violations.join('\n');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple snapshot directories', () => {
    it('should scan all __snapshots__ directories under server/src/', () => {
      // Create multiple snapshot directories like in real project structure
      const lexerSnapshotsDir = path.join(tempDir, 'server', 'src', 'lexer', '__tests__', '__snapshots__');
      const utilsSnapshotsDir = path.join(tempDir, 'server', 'src', 'utils', '__tests__', '__snapshots__');
      const parserSnapshotsDir = path.join(tempDir, 'server', 'src', 'parser', '__tests__', '__snapshots__');

      fs.mkdirSync(lexerSnapshotsDir, { recursive: true });
      fs.mkdirSync(utilsSnapshotsDir, { recursive: true });
      fs.mkdirSync(parserSnapshotsDir, { recursive: true });

      // Add violations in different snapshot directories
      const lexerSnapshot = path.join(lexerSnapshotsDir, 'lexer.test.ts.snap');
      const utilsSnapshot = path.join(utilsSnapshotsDir, 'utils.test.ts.snap');

      fs.writeFileSync(lexerSnapshot, 'exports[`test`] = `from test/REAL/Table.cal`');
      fs.writeFileSync(utilsSnapshot, 'exports[`test`] = `from test/REAL/Codeunit.cal`');

      // Add clean snapshot in parser
      const parserSnapshot = path.join(parserSnapshotsDir, 'parser.test.ts.snap');
      fs.writeFileSync(parserSnapshot, 'exports[`test`] = `clean synthetic data`');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(2);

      const violationText = result.violations.join('\n');
      expect(violationText).toContain('lexer/__tests__/__snapshots__/lexer.test.ts.snap');
      expect(violationText).toContain('utils/__tests__/__snapshots__/utils.test.ts.snap');
      expect(violationText).not.toContain('parser.test.ts.snap');
    });

    it('should handle deeply nested __snapshots__ directories', () => {
      const deepSnapshotsDir = path.join(tempDir, 'server', 'src', 'deep', 'nested', 'path', '__tests__', '__snapshots__');
      fs.mkdirSync(deepSnapshotsDir, { recursive: true });

      const snapshotFile = path.join(deepSnapshotsDir, 'deep.test.ts.snap');
      fs.writeFileSync(snapshotFile, 'exports[`test`] = `from test/REAL/Data.cal`');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/deep\/nested\/path\/__tests__\/__snapshots__\/deep\.test\.ts\.snap/)
      ]));
    });

    it('should skip node_modules when searching for __snapshots__', () => {
      const nodeModulesSnapshotsDir = path.join(tempDir, 'server', 'src', 'node_modules', 'some-package', '__snapshots__');
      fs.mkdirSync(nodeModulesSnapshotsDir, { recursive: true });

      const nodeModuleSnapshot = path.join(nodeModulesSnapshotsDir, 'test.snap');
      fs.writeFileSync(nodeModuleSnapshot, 'exports[`test`] = `from test/REAL/Table.cal`');

      const result = checkForRealPaths(tempDir);

      // Should pass - node_modules should be skipped
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('test/regression directory scanning', () => {
    it('should scan test/regression directory for violations', () => {
      const regressionDir = path.join(tempDir, 'test', 'regression');
      fs.mkdirSync(regressionDir, { recursive: true });

      const regressionFile = path.join(regressionDir, 'issue-123.md');
      fs.writeFileSync(regressionFile, `
# Regression test for issue #123

File from: test/REAL/Codeunit-50000.cal

Expected behavior: ...
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/test\/regression\/issue-123\.md/)
      ]));
    });

    it('should handle missing test/regression directory gracefully', () => {
      // Don't create test/regression directory
      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should catch leaked object ID from proprietary range', () => {
      // Object IDs 6000000+ are proprietary customer objects
      const fixtureFile = path.join(fixturesDir, 'suspicious-id.cal');
      fs.writeFileSync(fixtureFile, `
// Based on test/REAL/Table-6000001-CustomerExtended.cal
OBJECT Table 6000001 "Customer Extended"
{
  PROPERTIES
  {
    // Proprietary customization
  }
}
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/suspicious-id\.cal/)
      ]));
    });

    it('should catch snapshot with file path in AST', () => {
      const snapshotFile = path.join(snapshotsDir, 'ast-dump.snap');
      fs.writeFileSync(snapshotFile, `
exports[\`parse result 1\`] = \`
Object {
  "location": Object {
    "file": "/home/user/project/test/REAL/Codeunit-50000.cal",
    "line": 1,
  },
  "type": "Codeunit",
}
\`;
`.trim());

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(expect.arrayContaining([
        expect.stringMatching(/ast-dump\.snap/)
      ]));
    });

    it('should allow GitHub issue references that happen to contain REAL', () => {
      // Edge case: "REAL" might appear in legitimate contexts
      const fixtureFile = path.join(fixturesDir, 'legit-real.cal');
      fs.writeFileSync(fixtureFile, `
// This tests REAL number handling (Decimal data type)
// See GitHub issue: "Parser should handle REAL data type"
OBJECT Codeunit 1 Test
{
  CODE
  {
    VAR
      Amount : Decimal;  // Called REAL in older NAV versions
  }
}
`.trim());

      const result = checkForRealPaths(tempDir);

      // Should pass - these don't reference test/REAL/ path
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('CLI exit codes', () => {
    it('should have a runCLI function', () => {
      // Verify the runCLI function exists
      expect(typeof runCLI).toBe('function');
    });
  });

  describe('Integration test - realistic project structure', () => {
    it('should handle complete project structure with multiple directories', () => {
      // Create a structure mimicking real project
      const lexerSnapshotsDir = path.join(tempDir, 'server', 'src', 'lexer', '__tests__', '__snapshots__');
      const parserSnapshotsDir = path.join(tempDir, 'server', 'src', 'parser', '__tests__', '__snapshots__');
      const utilsSnapshotsDir = path.join(tempDir, 'server', 'src', 'utils', '__tests__', '__snapshots__');
      const regressionDir = path.join(tempDir, 'test', 'regression');
      const fixturesRegressionDir = path.join(tempDir, 'test', 'fixtures', 'regression');

      fs.mkdirSync(lexerSnapshotsDir, { recursive: true });
      fs.mkdirSync(parserSnapshotsDir, { recursive: true });
      fs.mkdirSync(utilsSnapshotsDir, { recursive: true });
      fs.mkdirSync(regressionDir, { recursive: true });
      fs.mkdirSync(fixturesRegressionDir, { recursive: true });

      // Add clean files
      fs.writeFileSync(path.join(lexerSnapshotsDir, 'clean.snap'), 'exports[`test`] = `synthetic data`');
      fs.writeFileSync(path.join(parserSnapshotsDir, 'clean.snap'), 'exports[`test`] = `synthetic data`');
      fs.writeFileSync(path.join(fixturesRegressionDir, 'clean.cal'), 'OBJECT Table 1 Test { }');

      // Add violations in different locations
      fs.writeFileSync(path.join(utilsSnapshotsDir, 'leaked.snap'), 'exports[`test`] = `from test/REAL/Data.cal`');
      fs.writeFileSync(path.join(regressionDir, 'leaked.md'), 'Source: test/REAL/File.cal');
      fs.writeFileSync(path.join(fixturesDir, 'leaked.cal'), '// test/REAL/Table.cal\nOBJECT Table 1 { }');

      const result = checkForRealPaths(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(3);

      const violationText = result.violations.join('\n');
      expect(violationText).toContain('utils/__tests__/__snapshots__/leaked.snap');
      expect(violationText).toContain('test/regression/leaked.md');
      expect(violationText).toContain('test/fixtures/leaked.cal');

      // Clean files should not be in violations
      expect(violationText).not.toContain('clean.snap');
      expect(violationText).not.toContain('clean.cal');
    });
  });
});
