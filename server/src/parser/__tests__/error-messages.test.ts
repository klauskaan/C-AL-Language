/**
 * Parser Error Message Tests
 *
 * Tests that parser error messages provide helpful context including:
 * - What was expected vs what was found
 * - Context about where in the object definition the error occurred
 * - Token type information for debugging
 *
 * These tests validate issue #40: Add more context to parser error messages
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Error Messages with Context', () => {
  describe('Integer parsing errors', () => {
    it('should provide context for invalid object ID', () => {
      const code = 'OBJECT Table abc Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Parser reports the type mismatch during token consumption
      expect(errors[0].message).toContain('Expected object ID');
      expect(errors[0].message).toContain('abc');
    });

    it('should provide context for invalid field number', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { abc ; ; No. ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find(e => e.message.includes('Expected field number'));
      expect(fieldError).toBeDefined();
      expect(fieldError?.message).toContain('abc');
    });

    it('should provide context for invalid array size', () => {
      const code = `OBJECT Table 18 Customer
{
  CODE
  {
    VAR
      MyArray : ARRAY[abc] OF Integer;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const arrayError = errors.find(e => e.message.includes('Expected array size'));
      expect(arrayError).toBeDefined();
      expect(arrayError?.message).toContain('abc');
    });

    it('should provide context for invalid string/code length', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code[abc] }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const lengthError = errors.find(e => e.message.includes('Expected length'));
      expect(lengthError).toBeDefined();
      expect(lengthError?.message).toContain('abc');
    });
  });

  describe('Token consumption errors', () => {
    it('should show what was found vs what was expected', () => {
      const code = 'OBJECT Table Name Customer'; // Invalid syntax - Table should be followed by number
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Should include token type information showing what was found
      expect(errors[0].message).toMatch(/but found/);
      expect(errors[0].message).toMatch(/IDENTIFIER/);
    });

    it('should provide context for missing semicolon in fields', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1  ; No. ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      if (errors.length > 0) {
        expect(errors[0].message).toContain('Expected ;');
      }
    });
  });

  describe('Field name errors', () => {
    it('should indicate error is in FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find(e => e.message.includes('Field name cannot be empty'));
      expect(nameError).toBeDefined();
      expect(nameError?.message).toContain('FIELDS section');
    });
  });

  describe('Parameter list errors', () => {
    it('should provide helpful message for unexpected token in parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc(Param1 : Integer Param2 : Text);
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const paramError = errors.find(e => e.message.includes('parameter list'));
      expect(paramError).toBeDefined();
      expect(paramError?.message).toContain("expected ';' or ')'");
    });
  });

  describe('Member access errors', () => {
    it('should show what was found after :: operator', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Status : Option;
    BEGIN
      Status := Status::;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const memberError = errors.find(e => e.message.includes('Expected identifier after :: operator'));
      expect(memberError).toBeDefined();
      expect(memberError?.message).toContain("got '");
    });
  });

  describe('AL-only feature errors', () => {
    it('should detect ternary operator (AL-only feature)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF (1 > 0) ? TRUE : FALSE THEN;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const ternaryError = errors.find(e => e.message.includes('TERNARY_OPERATOR'));
      expect(ternaryError).toBeDefined();
      // The error indicates an unexpected ternary operator token
      expect(ternaryError?.message).toContain('?');
    });
  });

  describe('REGRESSION TEST #53: Variable declaration errors', () => {
    it('should report error when reserved keyword is used as variable name (not silent drop)', () => {
      // Issue #53: parser silently drops variables when canBeUsedAsIdentifier() returns false
      // Location: parser.ts:1063-1065 - parseVariableDeclarations() just breaks without recording error
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      BEGIN : Integer;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report an error, not silently drop the variable
      expect(errors.length).toBeGreaterThan(0);

      // Error should indicate what was found and that it can't be used as an identifier
      const identifierError = errors.find(e =>
        e.message.includes('identifier') || e.message.includes('variable name')
      );
      expect(identifierError).toBeDefined();
      expect(identifierError?.message).toContain('BEGIN');
    });

    it('should report error for multiple invalid variable declarations', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      WHILE : Integer;
      REPEAT : Text;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report errors for both invalid declarations
      expect(errors.length).toBeGreaterThan(0);

      // At minimum, should find errors mentioning the invalid keywords
      const hasWhileError = errors.some(e => e.message.includes('WHILE'));
      const hasRepeatError = errors.some(e => e.message.includes('REPEAT'));

      // After error recovery fix, BOTH errors should be caught
      expect(hasWhileError).toBe(true);
      expect(hasRepeatError).toBe(true);
    });

    it('should continue parsing after invalid variable name error (error recovery)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      ValidVar1 : Integer;
      IF : Integer;
      ValidVar2 : Text;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should report error for invalid variable
      expect(errors.length).toBeGreaterThan(0);

      // But should still parse the procedure structure
      expect(ast.object).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBeGreaterThan(0);

      // The procedure should be found
      const proc = procedures[0];
      expect(proc.name).toBe('TestProc');

      // Should have captured valid variables (error recovery allows continuation)
      // After error recovery fix, both ValidVar1 AND ValidVar2 should be captured
      expect(proc.variables.length).toBeGreaterThanOrEqual(2);
      expect(proc.variables[0].name).toBe('ValidVar1');
      expect(proc.variables[1].name).toBe('ValidVar2');
    });

    it('should provide helpful error message for invalid variable identifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      EXIT : Integer;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];
      // Error should mention:
      // 1. Expected an identifier/variable name
      // 2. What was found (EXIT keyword)
      // 3. Context (VAR section)
      expect(error.message).toMatch(/identifier|variable/i);
      expect(error.message).toContain('EXIT');
    });

    it('should detect variable declaration attempt with @number suffix', () => {
      // Issue #53: Keywords with @number suffix (e.g. WHILE@1000) should be detected
      // as invalid variable declaration attempts and reported as errors
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      WHILE@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Should detect WHILE@1000 as invalid variable declaration attempt
      expect(errors.length).toBeGreaterThan(0);
      const whileError = errors.find(e => e.message.toLowerCase().includes('while'));
      expect(whileError).toBeDefined();
    });

    it('should NOT consume procedure declarations during error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      WHILE : Integer

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

      // Should report error for WHILE used as variable name
      expect(errors.length).toBeGreaterThan(0);
      const whileError = errors.find(e => e.message.toLowerCase().includes('while'));
      expect(whileError).toBeDefined();

      // Should NOT consume AnotherProc - both procedures should be in AST
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('TestProc');
      expect(procedures[1].name).toBe('AnotherProc');
    });
  });
});
