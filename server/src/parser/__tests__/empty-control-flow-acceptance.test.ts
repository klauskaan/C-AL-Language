/**
 * Empty Control Flow Body Acceptance Tests
 *
 * CONTEXT: Production NAV code contains 307+ instances of patterns like:
 * - IF condition THEN END;
 * - WHILE condition DO END;
 * - FOR i := 1 TO 10 DO END;
 *
 * This proves these patterns are VALID C/AL syntax, not errors.
 *
 * TDD EXPECTATION: These tests should FAIL initially, showing that the parser
 * currently rejects valid C/AL syntax. After the parser fix, they will pass.
 *
 * The parser should accept empty control flow bodies when followed by
 * END/ELSE/UNTIL keywords, treating them as implicit EmptyStatement nodes.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Empty Control Flow Body Acceptance', () => {
  describe('IF statement with empty bodies (valid C/AL patterns)', () => {
    it('should accept IF condition THEN END without errors', () => {
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

      // This is VALID C/AL - should NOT produce any errors
      expect(errors.length).toBe(0);

      // AST should contain IF statement with EmptyStatement for then branch
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const ifStmt = procedures[0]?.body?.[0] as any;
      expect(ifStmt?.type).toBe('IfStatement');
      expect(ifStmt?.thenBranch?.type).toBe('EmptyStatement');
    });

    it('should accept IF condition THEN ELSE statement END without errors', () => {
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

      // Empty THEN branch before ELSE is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should have EmptyStatement for then branch, EXIT for else branch
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0] as any;
      expect(ifStmt?.type).toBe('IfStatement');
      expect(ifStmt?.thenBranch?.type).toBe('EmptyStatement');
      expect(ifStmt?.elseBranch).toBeDefined();
    });

    it('should accept IF condition THEN statement ELSE END without errors', () => {
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

      // Empty ELSE branch before END is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should have EXIT for then branch, EmptyStatement for else branch
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const ifStmt = procedures[0]?.body?.[0] as any;
      expect(ifStmt?.type).toBe('IfStatement');
      expect(ifStmt?.thenBranch?.type).toBe('ExitStatement');
      expect(ifStmt?.elseBranch?.type).toBe('EmptyStatement');
    });

    it('should accept nested IF with empty bodies', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
        IF FALSE THEN
        END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Nested IF with empty body is valid
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });
  });

  describe('WHILE statement with empty body (valid C/AL pattern)', () => {
    it('should accept WHILE condition DO END without errors', () => {
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

      // Empty WHILE body is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should contain WHILE statement with EmptyStatement body
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const whileStmt = procedures[0]?.body?.[1] as any;
      expect(whileStmt?.type).toBe('WhileStatement');
      expect(whileStmt?.body?.type).toBe('EmptyStatement');
    });

    it('should accept REPEAT UNTIL with empty body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      REPEAT
      UNTIL i > 10;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty REPEAT body is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should contain REPEAT statement
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const repeatStmt = procedures[0]?.body?.[0] as any;
      expect(repeatStmt?.type).toBe('RepeatStatement');
    });
  });

  describe('FOR statement with empty body (valid C/AL pattern)', () => {
    it('should accept FOR TO loop with empty body', () => {
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

      // Empty FOR body is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should contain FOR statement with EmptyStatement body
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const forStmt = procedures[0]?.body?.[0] as any;
      expect(forStmt?.type).toBe('ForStatement');
      expect(forStmt?.body?.type).toBe('EmptyStatement');
    });

    it('should accept FOR DOWNTO loop with empty body', () => {
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

      // Empty FOR DOWNTO body is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should contain FOR statement with EmptyStatement body
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const forStmt = procedures[0]?.body?.[0] as any;
      expect(forStmt?.type).toBe('ForStatement');
      expect(forStmt?.body?.type).toBe('EmptyStatement');
    });
  });

  describe('WITH statement with empty body (valid C/AL pattern)', () => {
    it('should accept WITH DO END without errors', () => {
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

      // Empty WITH body is VALID C/AL
      expect(errors.length).toBe(0);

      // AST should contain WITH statement with EmptyStatement body
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      const withStmt = procedures[0]?.body?.[0] as any;
      expect(withStmt?.type).toBe('WithStatement');
      expect(withStmt?.body?.type).toBe('EmptyStatement');
    });
  });

  describe('CASE statement with empty branches (valid C/AL pattern)', () => {
    it('should accept CASE with empty branch before ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1:
        ELSE
          EXIT;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty CASE branch before ELSE is VALID C/AL
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });

    it('should accept CASE with empty branch before next case value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1:
        2:
          EXIT;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty CASE branch before next case value is VALID C/AL
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });

    it('should accept CASE with empty branch before END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1:
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty CASE branch before END is VALID C/AL
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });
  });

  describe('Real-world production patterns', () => {
    it('should accept IF with FINDLAST pattern (common in NAV)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      TempRec : TEMPORARY Record 18;
    BEGIN
      IF TempRec.FINDLAST THEN
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Common production pattern - should be accepted
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });

    it('should accept multiple empty control flows in sequence', () => {
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

      FOR i := 1 TO 5 DO
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Multiple empty bodies should all be accepted
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures[0]?.body?.length).toBe(3);
    });

    it('should accept complex nesting with mixed empty and non-empty bodies', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      IF TRUE THEN
        IF FALSE THEN
        ELSE
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

      // Complex nesting with empty bodies should be accepted
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });
  });

  describe('Edge cases with semicolons still accepted', () => {
    it('should still accept semicolon after THEN as explicit empty statement', () => {
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

      // Explicit semicolon is also valid
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });

    it('should accept semicolon after DO as explicit empty statement', () => {
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

      // Explicit semicolon is also valid
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });
  });

  describe('Positive tests: non-empty bodies should continue to work', () => {
    it('should accept IF with EXIT statement', () => {
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

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });

    it('should accept IF with BEGIN-END block', () => {
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

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
    });
  });
});
