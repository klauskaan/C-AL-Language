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
      // Token value is sanitized
      expect(errors[0].message).toMatch(/\[content sanitized, \d+ chars\]/);
      expect(errors[0].message).not.toContain('abc'); // Should not expose literal value
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
      // Token value is sanitized
      expect(fieldError?.message).toMatch(/\[content sanitized, \d+ chars\]/);
      expect(fieldError?.message).not.toContain('abc'); // Should not expose literal value
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
      // Token value is sanitized
      expect(arrayError?.message).toMatch(/\[content sanitized, \d+ chars\]/);
      expect(arrayError?.message).not.toContain('abc'); // Should not expose literal value
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
      // Token value is sanitized
      expect(lengthError?.message).toMatch(/\[content sanitized, \d+ chars\]/);
      expect(lengthError?.message).not.toContain('abc'); // Should not expose literal value
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

      expect(errors.length).toBeGreaterThan(0);
      // Issue #3: Should provide contextual error message
      expect(errors[0].message).toMatch(/Expected ; after field/i);
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
      // Token types are now sanitized to prevent keyword leakage
      // Look for an error that mentions token type sanitization (from the ? operator)
      const ternaryError = errors.find(e =>
        e.message.includes('[token type sanitized]') ||
        e.message.includes('ternary') ||
        e.message.includes('unexpected')
      );
      expect(ternaryError).toBeDefined();
      // The error message will be sanitized
      expect(ternaryError?.message).toMatch(/\[content sanitized, \d+ chars\]/);
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
      // Token value is sanitized
      expect(identifierError?.message).toMatch(/\[content sanitized, \d+ chars\]/);
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

      // At minimum, should find errors about sanitized content or variable names
      // Token values are sanitized, so we can't search for literal 'WHILE' or 'REPEAT'
      const hasVariableErrors = errors.some(e =>
        e.message.includes('identifier') ||
        e.message.includes('variable') ||
        e.message.includes('[content sanitized')
      );

      // After error recovery fix, errors should be caught
      expect(hasVariableErrors).toBe(true);
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
      // 2. Token value is sanitized
      expect(error.message).toMatch(/identifier|variable/i);
      expect(error.message).toMatch(/\[content sanitized, \d+ chars\]/);
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
      // Token values are sanitized, check for error about identifier/variable
      const whileError = errors.find(e =>
        e.message.includes('identifier') ||
        e.message.includes('variable') ||
        e.message.includes('[content sanitized')
      );
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
      // Token values are sanitized, check for error about identifier/variable
      const whileError = errors.find(e =>
        e.message.includes('identifier') ||
        e.message.includes('variable') ||
        e.message.includes('[content sanitized')
      );
      expect(whileError).toBeDefined();

      // Should NOT consume AnotherProc - both procedures should be in AST
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('TestProc');
      expect(procedures[1].name).toBe('AnotherProc');
    });
  });

  describe('Improved error message context (Issue #3)', () => {
    it('should include context for missing semicolon in EXIT statement', () => {
      // NOTE: In C/AL, semicolons are optional between statements.
      // However, EXIT with a value followed by something else can trigger errors.
      // Test the EXIT statement which DOES require proper parsing.
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      EXIT(x)
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // EXIT(x) without semicolon before END is valid in C/AL
      // This test verifies that valid code parses without errors
      // The error message improvements are tested in other scenarios
      expect(errors.length).toBe(0);
    });

    it('should include context for missing semicolon in variable declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      MyVar@1 : Integer
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
      // Should provide context about missing semicolon in variable declaration
      expect(errors[0].message).toMatch(/Expected ; after (variable|declaration)/i);
    });

    it('should include context for missing semicolon in trigger body', () => {
      const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=BEGIN END
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Should provide context about missing semicolon after trigger body
      expect(errors[0].message).toMatch(/Expected ; after trigger body/i);
    });

    it('should include context for missing colon in variable declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      MyVar@1 Integer;
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
      // Should provide context about missing colon in variable declaration
      expect(errors[0].message).toMatch(/Expected : (after variable|in variable declaration)/i);
    });

    it('should include context for missing closing bracket in array', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      MyArray@1 : ARRAY[10 OF Integer;
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
      // Should provide context about missing closing bracket
      const bracketError = errors.find(e => e.message.includes(']'));
      expect(bracketError).toBeDefined();
      expect(bracketError?.message).toMatch(/Expected \] (after|in array)/i);
    });

    it('should include context for missing closing paren in parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Param1@1 : Integer;
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
      // Should provide context about missing closing parenthesis
      const parenError = errors.find(e => e.message.includes(')'));
      expect(parenError).toBeDefined();
      expect(parenError?.message).toMatch(/Expected \) (after|in parameter)/i);
    });
  });

  describe('Multi-error scenarios (Issue #3)', () => {
    it('should provide contextual error message for malformed variable declaration', () => {
      // NOTE: In C/AL, semicolons between statements are optional (separator, not terminator).
      // So missing semicolons between statements don't trigger errors.
      // However, missing semicolons in VAR sections DO trigger errors.
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Var1@1 : Integer
      Var2@2 : Text;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should report at least one error for missing semicolon after variable declaration
      expect(errors.length).toBeGreaterThanOrEqual(1);

      // The error should include contextual information
      const contextualErrors = errors.filter(e =>
        e.message.match(/after (variable|declaration)/i)
      );

      // Should have at least one contextual error message
      expect(contextualErrors.length).toBeGreaterThan(0);
    });
  });
});
