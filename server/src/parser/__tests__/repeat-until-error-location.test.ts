/**
 * REPEAT/UNTIL Error Location Tests
 *
 * Tests for Issue #369: Improve REPEAT/UNTIL error location when UNTIL is missing.
 *
 * When UNTIL is missing, the error should point to the REPEAT keyword, not to
 * the token where the parser eventually gives up (like END or EOF).
 *
 * === Error Location Assertion Strategy ===
 * See: .claude/skills/cal-dev-guide/SKILL.md "Error Location Assertion Strategy"
 *
 * All error location tests in this file are Tier 1 (exact location) because
 * the error location is the subject of issue #369.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - REPEAT/UNTIL Error Location', () => {
  describe('Missing UNTIL - error location tests', () => {
    it('should report error at REPEAT when UNTIL is missing (basic case)', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      REPEAT
        x := 1;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report "Expected UNTIL" error
      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT keyword (line 9), not END or EOF
      expect(untilError!.token.line).toBe(9);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');
    });

    it('should report error at REPEAT when UNTIL is missing (multiple body statements)', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
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
      REPEAT
        x := 1;
        y := 2;
        z := 3;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT (line 11)
      expect(untilError!.token.line).toBe(11);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');

      // Verify that all three statements were parsed into the body
      const procedures = ast.object?.code?.procedures || [];
      const testProc = procedures.find(p => p.name === 'TestProc');
      expect(testProc).toBeDefined();
      const body = testProc?.body || [];
      expect(body.length).toBeGreaterThan(0);
      const repeatStmt = body.find(s => s.type === 'RepeatStatement') as any;
      expect(repeatStmt).toBeDefined();
      expect(repeatStmt?.body?.length).toBe(3);
    });

    it('should report error at REPEAT when UNTIL is missing (empty body)', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      REPEAT
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT (line 7)
      expect(untilError!.token.line).toBe(7);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');

      // Verify that the body array is empty
      const procedures = ast.object?.code?.procedures || [];
      const testProc = procedures.find(p => p.name === 'TestProc');
      expect(testProc).toBeDefined();
      const body = testProc?.body || [];
      const repeatStmt = body.find(s => s.type === 'RepeatStatement') as any;
      expect(repeatStmt).toBeDefined();
      expect(repeatStmt?.body?.length).toBe(0);
    });

    it('should report error at REPEAT when UNTIL is missing at procedure boundary', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      REPEAT
        x := 1;
    PROCEDURE NextProc();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT (line 9)
      expect(untilError!.token.line).toBe(9);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');
    });

    it('should report error at outer REPEAT when both nested REPEATs missing UNTIL', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      REPEAT
        REPEAT
          x := 1;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Both REPEATs should produce errors
      const untilErrors = errors.filter(e => e.message.includes('Expected UNTIL'));
      expect(untilErrors.length).toBe(2);

      // Inner REPEAT error (line 10)
      const innerError = untilErrors.find(e => e.token.line === 10);
      expect(innerError).toBeDefined();
      expect(innerError!.token.column).toBe(9);
      expect(innerError!.token.value).toBe('REPEAT');

      // Outer REPEAT error (line 9)
      const outerError = untilErrors.find(e => e.token.line === 9);
      expect(outerError).toBeDefined();
      expect(outerError!.token.column).toBe(7);
      expect(outerError!.token.value).toBe('REPEAT');
    });

    it('should report error only at outer REPEAT when inner has UNTIL but outer does not', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      REPEAT
        REPEAT
          x := 1;
        UNTIL x > 5;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Only outer REPEAT should produce error
      const untilErrors = errors.filter(e => e.message.includes('Expected UNTIL'));
      expect(untilErrors.length).toBe(1);

      // Outer REPEAT error (line 9)
      expect(untilErrors[0].token.line).toBe(9);
      expect(untilErrors[0].token.column).toBe(7);
      expect(untilErrors[0].token.value).toBe('REPEAT');
    });

    it('should report error at REPEAT when UNTIL is missing with nested BEGIN-END block', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      REPEAT
        BEGIN
          x := 1;
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

      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT (line 9)
      expect(untilError!.token.line).toBe(9);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');
    });

    it('should report error at REPEAT when UNTIL is missing with nested CASE-END', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      REPEAT
        CASE x OF
          1: y := 1;
          2: y := 2;
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

      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT (line 10)
      expect(untilError!.token.line).toBe(10);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');
    });

    it('should report error at REPEAT when UNTIL is missing at EOF', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      REPEAT
        x := 1;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      const untilError = errors.find(e => e.message.includes('Expected UNTIL'));
      expect(untilError).toBeDefined();
      // Error should point to REPEAT (line 7), NOT EOF
      expect(untilError!.token.line).toBe(7);
      expect(untilError!.token.column).toBe(7);
      expect(untilError!.token.value).toBe('REPEAT');
    });
  });

  describe('Regression - normal REPEAT/UNTIL still works', () => {
    it('should parse valid REPEAT...UNTIL without errors', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      x := 1;
      REPEAT
        x := x + 1;
      UNTIL x > 10;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // No errors expected
      expect(errors.length).toBe(0);

      // Verify AST structure
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const testProc = procedures[0];
      expect(testProc.name).toBe('TestProc');

      // Verify REPEAT statement is in the body
      const body = testProc.body || [];
      expect(body.length).toBe(2); // assignment + repeat statement
      const repeatStmt = body.find(s => s.type === 'RepeatStatement') as any;
      expect(repeatStmt).toBeDefined();
      expect(repeatStmt.body.length).toBe(1); // one statement in loop body
      expect(repeatStmt.condition).toBeDefined(); // has condition expression
    });
  });
});
