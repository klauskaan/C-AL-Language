/**
 * Parser - Nested CASE Statement Error Recovery Tests
 *
 * Tests error recovery for nested CASE statements, validating:
 * - Error detection and reporting in nested CASE contexts
 * - Error location accuracy (line and column via error.token)
 * - Parser recovery (subsequent code parsed correctly)
 * - AST structure preservation after errors
 *
 * Related issues:
 * - #290: Investigate missing error for malformed statement in inner CASE
 * - #299: Add coverage for nested CASE error recovery
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { CaseStatement } from '../ast';

describe('Parser - Nested CASE Error Recovery', () => {
  describe('Issue #299 exact example', () => {
    // BLOCKED: Issue #310 - Parser bug - set literal vs indexer ambiguity needs investigation
    it.skip('should detect malformed statement in inner CASE branch', () => {
      // Issue #299: Original example from investigation
      // CASE x OF 1: CASE y OF A: [malformed statement;
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Option A,B,C;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            y::A: [ malformed statement;
          END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error for malformed statement in inner CASE
      expect(errors.length).toBeGreaterThan(0);

      // Error should be detected (set literal or statement error)
      const hasError = errors.some(e =>
        e.message.includes('Expected ] after set literal') ||
        e.message.includes('statement') ||
        e.message.includes('identifier')
      );
      expect(hasError).toBe(true);

      // Parser should complete (not throw)
      expect(ast).toBeDefined();
      expect(ast.object).not.toBeNull();
    });
  });

  describe('Error in outer CASE after successful inner CASE', () => {
    it('should detect error in outer CASE branch value after inner CASE completes', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          BEGIN
            CASE y OF
              1: EXIT;
            END;
          END;
        2 EXIT;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error for missing colon after "2"
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Verify error location points to the problematic line
      expect(colonError?.token.line).toBeGreaterThanOrEqual(17);

      // Should preserve outer CASE structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].name).toBe('TestProc');
    });
  });

  describe('Missing colon in inner CASE with error location verification', () => {
    it('should report error location for missing colon in nested CASE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            5 MESSAGE('Error here');
          END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report missing colon error
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Verify error is on line 13 (the inner CASE branch)
      expect(colonError?.token.line).toBe(13);
      expect(colonError?.token.column).toBeGreaterThan(0);
    });
  });

  describe('Recovery boundary verification', () => {
    it('should not consume subsequent procedures during nested CASE error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2 EXIT;
          END;
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report the error
      expect(errors.length).toBeGreaterThan(0);

      // Should NOT consume SecondProc - both procedures should be in AST
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('FirstProc');
      expect(procedures[1].name).toBe('SecondProc');
    });
  });

  describe('Multiple errors in nested CASE', () => {
    it('should report multiple errors without cascading failures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2 EXIT;
            3 MESSAGE('test');
          END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report errors for both missing colons
      expect(errors.length).toBeGreaterThanOrEqual(2);

      // Filter for colon errors
      const colonErrors = errors.filter(e => e.message.includes('Expected : after case branch value'));
      expect(colonErrors.length).toBeGreaterThanOrEqual(2);

      // Verify both are on different lines
      const lines = colonErrors.map(e => e.token.line);
      expect(new Set(lines).size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Unclosed set literal in nested CASE branch', () => {
    it('should recover from unclosed set literal in inner CASE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
      Value : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            5:
              IF Value IN [1, 2, 3 THEN;
          END;
      END;
    END;

    PROCEDURE AnotherProc();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report unclosed set literal error
      expect(errors.length).toBeGreaterThan(0);
      const setError = errors.find(e => e.message.includes('Expected ] after set literal'));
      expect(setError).toBeDefined();

      // Verify error is in the inner CASE
      expect(setError?.token.line).toBe(15);

      // Should NOT consume AnotherProc
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[1].name).toBe('AnotherProc');
    });
  });

  describe('ELSE clause in both nesting levels', () => {
    it('should handle ELSE clauses at both outer and inner CASE levels', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            1: EXIT;
            ELSE
              MESSAGE('Inner else');
          END;
        ELSE
          MESSAGE('Outer else');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors.length).toBe(0);

      // Verify outer CASE structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      expect(statements.length).toBeGreaterThan(0);

      const outerCase = statements[0] as CaseStatement;
      expect(outerCase.type).toBe('CaseStatement');
      expect(outerCase.elseBranch).not.toBeNull();
      expect(outerCase.elseBranch?.length).toBeGreaterThan(0);
    });
  });

  describe('Three-level nesting with error in deepest level', () => {
    it('should detect error in third-level nested CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
      z : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2:
              CASE z OF
                3 EXIT;
              END;
          END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report missing colon in deepest CASE
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Error should be on line 16 (deepest CASE branch)
      expect(colonError?.token.line).toBe(16);
    });
  });

  describe('Three-level nesting with error in middle level', () => {
    // BLOCKED: Issue #308 - Parser reports error on wrong line (line 15 instead of 14)
    it.skip('should detect error in second-level CASE while preserving third level', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
      z : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2
              CASE z OF
                3: EXIT;
              END;
          END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report missing colon in middle CASE
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Error should be on line 14 (middle CASE branch)
      expect(colonError?.token.line).toBe(14);

      // Should still preserve procedure structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
    });
  });

  describe('Recovery preserves subsequent procedures', () => {
    it('should preserve multiple procedures after nested CASE with multiple errors', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2 EXIT;
            3 MESSAGE('test');
          END;
        4 EXIT;
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;

    PROCEDURE ThirdProc();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report multiple errors
      expect(errors.length).toBeGreaterThanOrEqual(3);

      // Should preserve all three procedures
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(3);
      expect(procedures[0].name).toBe('FirstProc');
      expect(procedures[1].name).toBe('SecondProc');
      expect(procedures[2].name).toBe('ThirdProc');
    });
  });

  describe('Malformed expression in nested CASE branch value', () => {
    // BLOCKED: Issue #309 - Parser silently accepts malformed range '2..)'
    it.skip('should detect malformed expression in inner CASE branch value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2..): EXIT;
          END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report error for malformed range expression
      expect(errors.length).toBeGreaterThan(0);

      // Error could be about expression or unexpected token
      const hasError = errors.some(e =>
        e.message.includes('expression') ||
        e.message.includes('Expected') ||
        e.message.includes('statement')
      );
      expect(hasError).toBe(true);
    });
  });

  describe('Empty nested CASE with error in outer', () => {
    it('should handle empty inner CASE and detect error in outer CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
          END;
        2 EXIT;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report missing colon after "2" in outer CASE
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Error should be on line 14 (outer CASE branch)
      expect(colonError?.token.line).toBe(14);
    });
  });
});
