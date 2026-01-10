/**
 * Empty Statement Body Detection Tests
 *
 * Tests for detecting empty statement bodies in control flow statements.
 * These tests validate that the parser correctly identifies and reports
 * errors when control flow statements (IF, WHILE, FOR, WITH) have empty bodies.
 *
 * According to TDD principles, these tests MUST fail initially to validate
 * that the bug is correctly diagnosed.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { BlockStatement } from '../ast';

describe('Parser - Empty Statement Body Detection', () => {
  describe('IF statement with empty bodies', () => {
    it('should detect empty THEN body followed by END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty statement body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
      expect(emptyBodyError?.message).toContain('THEN');

      // AST should still be created with recovery node (empty BlockStatement)
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBeGreaterThan(0);
      const ifStmt = procedures[0]?.body?.[0];
      expect(ifStmt?.type).toBe('IfStatement');
    });

    it('should detect empty THEN body followed by ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
      ELSE
        EXIT;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty THEN body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
      expect(emptyBodyError?.message).toContain('THEN');

      // AST should still parse the ELSE branch
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0];
      expect(ifStmt?.type).toBe('IfStatement');
    });

    it('should detect empty ELSE body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
        EXIT
      ELSE
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty ELSE body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after ELSE') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
      expect(emptyBodyError?.message).toContain('ELSE');

      // AST should still contain the IF statement
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0];
      expect(ifStmt?.type).toBe('IfStatement');
    });

    it('should detect semicolon immediately after THEN (no statement)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Semicolon after THEN means no statement follows
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
    });
  });

  describe('WHILE statement with empty body', () => {
    it('should detect empty WHILE body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      i := 0;
      WHILE i < 10 DO
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty DO body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
      expect(emptyBodyError?.message).toContain('DO');

      // AST should still be created
      expect(ast).not.toBeNull();
    });

    it('should detect semicolon immediately after DO', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Semicolon after DO means no statement follows
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
    });
  });

  describe('FOR statement with empty body', () => {
    it('should detect empty FOR body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty DO body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
      expect(emptyBodyError?.message).toContain('DO');

      // AST should still be created
      expect(ast).not.toBeNull();
    });

    it('should detect empty FOR DOWNTO body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty DO body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
    });
  });

  describe('WITH statement with empty body', () => {
    it('should detect empty WITH body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer DO
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error about empty DO body
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();
      expect(emptyBodyError?.message).toContain('DO');

      // AST should still be created
      expect(ast).not.toBeNull();
    });
  });

  describe('Edge case: PROCEDURE after control flow (structural boundary)', () => {
    it('should detect empty THEN when next token is PROCEDURE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc1();
    BEGIN
      IF TRUE THEN
      END;
    END;

    PROCEDURE TestProc2();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect that THEN has no statement before structural boundary
      expect(errors.length).toBeGreaterThan(0);
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeDefined();

      // Should still parse both procedures (error recovery)
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('TestProc1');
      expect(procedures[1].name).toBe('TestProc2');
    });
  });

  describe('Positive tests: valid statements should NOT error', () => {
    it('should accept EXIT as valid statement after THEN', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
        EXIT;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should NOT report empty body error
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeUndefined();

      // AST should contain valid IF statement with EXIT
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0];
      expect(ifStmt?.type).toBe('IfStatement');
    });

    it('should accept EXIT as valid statement after DO (WHILE)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO
        EXIT;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should NOT report empty body error
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeUndefined();

      // AST should contain valid WHILE statement
      expect(ast).not.toBeNull();
    });

    it('should accept EXIT as valid statement after DO (FOR)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        EXIT;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should NOT report empty body error
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after DO') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeUndefined();

      // AST should contain valid FOR statement
      expect(ast).not.toBeNull();
    });

    it('should accept assignment as valid statement after THEN', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      IF TRUE THEN
        x := 1;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should NOT report empty body error
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeUndefined();

      // AST should be valid
      expect(ast).not.toBeNull();
    });

    it('should accept BEGIN-END block as valid body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      IF TRUE THEN BEGIN
        x := 1;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should NOT report empty body error
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeUndefined();

      // AST should contain valid block
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0];
      expect(ifStmt?.type).toBe('IfStatement');
    });

    it('should accept empty BEGIN-END block as valid body (not a statement body error)', () => {
      // Note: Empty BEGIN-END blocks are syntactically valid in C/AL
      // This is different from having NO statement after THEN/DO
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN BEGIN
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty BEGIN-END is valid syntax - should not report statement body error
      const emptyBodyError = errors.find(e =>
        e.message.includes('Expected statement after THEN') ||
        e.message.includes('Empty statement body')
      );
      expect(emptyBodyError).toBeUndefined();

      // AST should contain IF statement with empty BlockStatement
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0] as any;
      expect(ifStmt?.type).toBe('IfStatement');
      if (ifStmt && 'thenBranch' in ifStmt) {
        expect(ifStmt.thenBranch.type).toBe('BlockStatement');
        const block = ifStmt.thenBranch as BlockStatement;
        expect(block.statements.length).toBe(0);
      }
    });
  });

  describe('Multiple empty bodies in same procedure', () => {
    it('should detect multiple empty statement bodies', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      IF TRUE THEN
      END;

      WHILE i < 10 DO
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report errors for both empty bodies
      expect(errors.length).toBeGreaterThanOrEqual(2);

      const thenError = errors.find(e => e.message.includes('THEN'));
      expect(thenError).toBeDefined();

      const doError = errors.find(e => e.message.includes('DO'));
      expect(doError).toBeDefined();

      // AST should still be created with recovery
      expect(ast).not.toBeNull();
    });
  });
});
