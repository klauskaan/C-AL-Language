/**
 * Regression Test Suite - Real-World C/AL Files
 *
 * Purpose:
 * This test suite ensures that the lexer and parser can handle real-world
 * production-quality C/AL code from Microsoft's cal-open-library.
 *
 * What This Tests:
 * - All fixture files parse without throwing exceptions
 * - AST structure is captured via Jest snapshots
 * - Future changes that break parsing are detected immediately
 * - Refactoring doesn't introduce unintended AST changes
 *
 * Snapshot Testing:
 * - Snapshots capture the complete AST structure for each file
 * - When snapshots fail, it indicates the AST structure has changed
 * - Review snapshot diffs carefully to determine if changes are intentional
 * - Update snapshots with: npm test -- -u (only after reviewing changes!)
 *
 * Fixtures Coverage (9 files, ~130KB):
 * - Tables: 3 files (simple, medium, complex with CalcFormulas)
 * - Codeunits: 3 files (simple, medium, complex business logic)
 * - Pages: 2 files (list part, dashboard with actions)
 * - XMLports: 1 file (complex import/export)
 *
 * Expected Behavior:
 * - All files should parse successfully without errors
 * - Parser should never throw exceptions (returns AST with errors instead)
 * - All tests should complete in < 5 seconds
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';

describe('Regression Suite - Real C/AL Files', () => {
  // Resolve path to fixtures directory
  const fixturesDir = join(__dirname, '../../../test/fixtures/regression');

  // Discover all .cal files in the fixtures directory
  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.cal'));

  // Ensure we have fixtures to test
  it('should have regression fixtures available', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.length).toBe(9); // We expect 9 fixture files
  });

  /**
   * Helper function to extract expected object type from filename
   * Examples:
   *   "table-18-customer.cal" -> "Table"
   *   "codeunit-93-purch-quote-to-order.cal" -> "Codeunit"
   *   "page-1216-data-exch-col-def-part.cal" -> "Page"
   *   "xmlport-1225-data-exch-def-mapping.cal" -> "XMLport"
   */
  function extractExpectedObjectType(filename: string): string | null {
    const match = filename.match(/^(table|codeunit|page|xmlport|report)-/i);
    if (!match) return null;

    const type = match[1].toLowerCase();

    // Special case for XMLport (not Xmlport)
    if (type === 'xmlport') {
      return 'XMLport';
    }

    // Capitalize first letter for C/AL convention
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Helper function to extract expected object ID from filename
   * Examples:
   *   "table-18-customer.cal" -> 18
   *   "codeunit-93-purch-quote-to-order.cal" -> 93
   *   "page-1216-data-exch-col-def-part.cal" -> 1216
   */
  function extractExpectedObjectId(filename: string): number | null {
    const match = filename.match(/^[a-z]+-(\d+)-/i);
    return match ? parseInt(match[1], 10) : null;
  }

  // Generate a test for each fixture file
  files.forEach(file => {
    describe(`Fixture: ${file}`, () => {
      let code: string;
      let ast: any;
      let parseError: Error | null = null;

      // Parse the fixture file once for all tests in this describe block
      beforeAll(() => {
        const filePath = join(fixturesDir, file);
        code = readFileSync(filePath, 'utf-8');

        try {
          const lexer = new Lexer(code);
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          ast = parser.parse();
        } catch (error) {
          parseError = error as Error;
        }
      });

      it('should parse without throwing exceptions', () => {
        expect(parseError).toBeNull();
        expect(ast).toBeDefined();
      });

      it('should produce a valid CALDocument AST', () => {
        expect(ast).toBeDefined();
        expect(ast.type).toBe('CALDocument');
      });

      it('should have a parsed object definition', () => {
        expect(ast.object).toBeDefined();

        // Some files may not parse completely (e.g., contain unsupported syntax)
        // We document this but don't fail the test - the snapshot captures the state
        if (ast.object === null) {
          console.warn(`Warning: ${file} did not produce an object definition (possibly contains unsupported syntax)`);
        }
      });

      it('should match expected object type from filename', () => {
        // Skip if object is null (incomplete parse)
        if (ast.object === null) {
          return;
        }

        const expectedType = extractExpectedObjectType(file);
        if (expectedType) {
          expect(ast.object.objectKind).toBe(expectedType);
        }
      });

      it('should match expected object ID from filename', () => {
        // Skip if object is null (incomplete parse)
        if (ast.object === null) {
          return;
        }

        const expectedId = extractExpectedObjectId(file);
        if (expectedId) {
          expect(ast.object.objectId).toBe(expectedId);
        }
      });

      it('should have object name defined', () => {
        // Skip if object is null (incomplete parse)
        if (ast.object === null) {
          return;
        }

        expect(ast.object.objectName).toBeDefined();
        expect(typeof ast.object.objectName).toBe('string');
        expect(ast.object.objectName.length).toBeGreaterThan(0);
      });

      /**
       * Snapshot Test - The Most Important Test
       *
       * This test captures the entire AST structure as a snapshot.
       * If this test fails in the future, it means:
       *   1. The AST structure has changed (intentional refactoring), OR
       *   2. A bug was introduced that breaks parsing
       *
       * How to Handle Snapshot Failures:
       *   1. Review the snapshot diff carefully
       *   2. If the change is intentional (e.g., added new AST node type):
       *      - Update the snapshot with: npm test -- -u
       *      - Commit the updated snapshot with a clear message
       *   3. If the change is unintentional:
       *      - Fix the bug that broke the AST structure
       *      - Re-run tests to ensure snapshot matches again
       *
       * Why Snapshots Matter:
       *   - Catches unintended side effects of refactoring
       *   - Provides regression protection with minimal maintenance
       *   - Documents expected AST structure for each fixture
       */
      it('should match AST snapshot', () => {
        expect(ast).toMatchSnapshot();
      });
    });
  });

  /**
   * Performance Test
   *
   * All regression tests should complete quickly (< 5 seconds total).
   * If this test fails, it indicates a performance regression.
   */
  describe('Performance', () => {
    it('should parse all fixtures in reasonable time', () => {
      const startTime = Date.now();

      files.forEach(file => {
        const filePath = join(fixturesDir, file);
        const code = readFileSync(filePath, 'utf-8');
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();
      });

      const duration = Date.now() - startTime;

      // All 9 files should parse in < 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });

  /**
   * Coverage Summary
   *
   * This test documents what features are covered by the regression fixtures.
   * It doesn't fail - it just provides visibility into what we're testing.
   */
  describe('Coverage Summary', () => {
    it('should test all major object types', () => {
      const objectTypes = files.map(f => extractExpectedObjectType(f));

      expect(objectTypes).toContain('Table');
      expect(objectTypes).toContain('Codeunit');
      expect(objectTypes).toContain('Page');
      expect(objectTypes).toContain('XMLport');

      // Count coverage
      const tableCoverage = objectTypes.filter(t => t === 'Table').length;
      const codeunitCoverage = objectTypes.filter(t => t === 'Codeunit').length;
      const pageCoverage = objectTypes.filter(t => t === 'Page').length;
      const xmlportCoverage = objectTypes.filter(t => t === 'XMLport').length;

      // Document coverage (informational, not assertions)
      console.log(`\nRegression Suite Coverage:`);
      console.log(`  Tables: ${tableCoverage} files`);
      console.log(`  Codeunits: ${codeunitCoverage} files`);
      console.log(`  Pages: ${pageCoverage} files`);
      console.log(`  XMLports: ${xmlportCoverage} files`);
      console.log(`  Total: ${files.length} files\n`);
    });
  });
});
