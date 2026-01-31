/**
 * Unit tests for isFollowedByLeftBrace() helper method (Issue #277)
 *
 * Context: Refactoring duplicated lookahead logic used to distinguish section
 * keywords (CODE {, CONTROLS {) from identifiers (Code[20], Variant Code).
 *
 * This helper is used in:
 * - peekNextMeaningfulToken(): Check if CODE/CONTROLS starts a section
 * - isSectionKeyword(): Validate section keywords during parsing
 *
 * Note: Since isFollowedByLeftBrace() is private, we test it through public
 * methods that use it. However, we can also access it via type casting for
 * more direct tests if needed.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('isFollowedByLeftBrace() helper', () => {
  describe('Basic functionality', () => {
    it('should return true when current token is followed by left brace', () => {
      // Test via isSectionKeyword which uses isFollowedByLeftBrace for CODE
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse successfully - CODE { recognized as section
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should return false when current token is followed by left bracket', () => {
      // Test case: Code[20] - should NOT be treated as section keyword
      const code = `OBJECT Table 50000 "Test"
      {
        FIELDS
        {
          { 1; ;MyField; Code[20] }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse successfully - Code[20] recognized as data type, not section
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should return false when current token is followed by identifier', () => {
      // Test case: "Variant Code" in property value
      const code = `OBJECT Table 50000 "Test"
      {
        PROPERTIES
        {
          CaptionML=ENU=Variant Code;
        }
        FIELDS
        {
          { 1; ;Field1; Integer }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse successfully - "Code" in caption not treated as section
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });
  });

  describe('Boundary conditions', () => {
    it('should return false when current token is last token (at EOF)', () => {
      // Edge case: CODE appears at end of token stream
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser handles EOF gracefully
      expect(parser.getErrors()).toHaveLength(0);
      // Parser should not crash
      expect(ast).toBeDefined();
    });

    it('should return false when current token is penultimate and next is EOF', () => {
      // Edge case: CODE followed only by EOF marker
      const code = `OBJECT Codeunit 50000 "Test"
      {
        PROPERTIES
        {
        }
        CODE`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser handles EOF gracefully
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should handle CODE at very start of file (before OBJECT)', () => {
      // Pathological case: malformed file starting with CODE
      const code = `CODE { BEGIN END. }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should handle gracefully (with errors)
      expect(parser.getErrors().length).toBeGreaterThan(0);
      expect(ast).toBeDefined();
    });
  });

  describe('CONTROLS keyword (uses same helper)', () => {
    it('should return true for CONTROLS followed by left brace', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1; 0; Container; ContainerType=ContentArea }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse successfully - CONTROLS { recognized as section
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should return false for Controls as identifier (not followed by brace)', () => {
      // Test case: "Controls" as parameter name
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE
        {
          PROCEDURE TestProc(Controls : Integer);
          BEGIN
          END;

          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse successfully - "Controls" recognized as parameter name
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });
  });

  describe('Real-world scenarios from test/REAL/', () => {
    it('should handle "Item Tracking Code" in table caption', () => {
      // Real pattern: CaptionML contains "Code" but not section keyword
      const code = `OBJECT Table 6502 "Item Tracking Code"
      {
        PROPERTIES
        {
          CaptionML=ENU=Item Tracking Code;
        }
        FIELDS
        {
          { 1; ;Code; Code10; CaptionML=ENU=Code }
        }
        KEYS
        {
          { ;Code; Clustered=Yes }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should handle "Code" in FIELDS section (not section keyword)', () => {
      // Real pattern: Field name "Code" followed by data type
      const code = `OBJECT Table 18 "Customer"
      {
        FIELDS
        {
          { 1; ;No.; Code20 }
          { 2; ;Name; Text50 }
        }
        KEYS
        {
          { ;No.; Clustered=Yes }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should handle multiple section keywords in sequence', () => {
      // Real pattern: FIELDS, KEYS, CODE sections back to back
      const code = `OBJECT Table 50000 "Test"
      {
        PROPERTIES
        {
          CaptionML=ENU=Test Table;
        }
        FIELDS
        {
          { 1; ;Code; Code20 }
        }
        KEYS
        {
          { ;Code; Clustered=Yes }
        }
        CODE
        {
          VAR
            Controls@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // All three sections should be recognized correctly
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });
  });

  describe('Whitespace handling', () => {
    it('should skip whitespace when looking ahead (lexer guarantee)', () => {
      // The lexer never emits whitespace tokens, so this.current + 1
      // is always the next meaningful token
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE


        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Extra whitespace should not affect section recognition
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should skip comments when looking ahead (lexer guarantee)', () => {
      // Comments are tokenized but lexer skips them in token stream
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE // This is a comment
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Comment should not affect section recognition
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });
  });

  describe('Integration with isSectionKeyword()', () => {
    it('should correctly identify CODE { as section keyword', () => {
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE
        {
          VAR
            x : Integer;

          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.code).toBeDefined();
    });

    it('should correctly reject Code[20] as section keyword', () => {
      const code = `OBJECT Table 50000 "Test"
      {
        FIELDS
        {
          { 1; ;Field1; Code[20] }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      // Field should be parsed with Code[20] data type
      expect(ast.object?.fields?.fields).toHaveLength(1);
    });

    it('should correctly identify CONTROLS { as section keyword', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        CONTROLS
        {
          { 1; 0; Container; ContainerType=ContentArea }
        }
        CODE
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.controls).toBeDefined();
    });

    it('should distinguish CONTROLS from Controls identifier', () => {
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE
        {
          VAR
            Controls@1000 : Integer;

          BEGIN
            Controls := 42;
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      // Variable "Controls" should be parsed as identifier
      expect(ast.object?.code?.variables).toHaveLength(1);
    });
  });

  describe('Error recovery', () => {
    it('should not crash on malformed token sequence', () => {
      // Malformed: CODE followed by unexpected token
      const code = `OBJECT Codeunit 50000 "Test"
      {
        CODE INVALID TOKEN
        {
          BEGIN
          END.
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser recovers gracefully from "CODE INVALID TOKEN"
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should recover after missing left brace', () => {
      const code = `OBJECT Codeunit 50000 "Test"
      {
        PROPERTIES
        {
        }
        CODE
        BEGIN
          // Missing opening brace
        END.
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser recovers gracefully from missing brace
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', () => {
      // Generate code with many sections
      const fields = Array.from({ length: 100 }, (_, i) =>
        `{ ${i + 1}; ;Field${i + 1}; Code20 }`
      ).join('\n          ');

      const code = `OBJECT Table 50000 "Large Table"
      {
        PROPERTIES
        {
          CaptionML=ENU=Large Table;
        }
        FIELDS
        {
          ${fields}
        }
        KEYS
        {
          { ;Field1; Clustered=Yes }
        }
        CODE
        {
          VAR
            Controls@1000 : Integer;
            Code@1001 : Code20;

          PROCEDURE Test();
          BEGIN
          END;

          BEGIN
          END.
        }
      }`;

      const start = Date.now();
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const duration = Date.now() - start;

      // Should parse quickly (under 100ms for this size)
      expect(duration).toBeLessThan(100);
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });
  });
});
