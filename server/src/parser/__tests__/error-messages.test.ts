/**
 * Parser Error Message Tests
 *
 * Tests that parser error messages provide helpful context including:
 * - What was expected vs what was found
 * - Context about where in the object definition the error occurred
 * - Token type information for debugging
 *
 * === Error Location Assertion Strategy ===
 * See: .claude/skills/cal-dev-guide/SKILL.md "Error Location Assertion Strategy"
 *
 * Tier 1 tests (exact location): Tests with "do not reformat" comments
 * Tier 2 tests (range): Tests with toBeGreaterThanOrEqual/toBeLessThanOrEqual on line numbers
 * Tier 3 tests (detection only): Tests that only check error existence/message content
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
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
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
      expect(errors[0].token.line).toBe(5);
      expect(errors[0].token.column).toBe(14);
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
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
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
      expect(errors[0].token.line).toBe(7);
      expect(errors[0].token.column).toBe(15);
    });

    it('should include context for missing closing bracket in array', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
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
      expect(bracketError?.token.line).toBe(7);
      expect(bracketError?.token.column).toBe(28);
    });

    it('should include context for missing closing paren in parameters', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
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
      expect(parenError?.token.line).toBe(6);
      expect(parenError?.token.column).toBe(5);
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

  describe('REGRESSION TEST #251: Procedure name validation', () => {
    describe('Invalid structural keywords as procedure names', () => {
      it('should report error when PROCEDURE keyword is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE PROCEDURE();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should report an error about invalid procedure name
        expect(errors.length).toBeGreaterThan(0);
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });

      it('should report error when BEGIN keyword is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE BEGIN();
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
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });

      it('should report error when IF keyword is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE IF();
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
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });

      it('should report error when END keyword is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE END();
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
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });

      it('should report error when VAR keyword is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE VAR();
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
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });
    });

    describe('Invalid punctuation/operators as procedure names', () => {
      it('should report error when LeftParen is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ();
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
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });

      it('should report error when Semicolon is used as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ;
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
        const nameError = errors.find(e => e.message.includes('Expected procedure name'));
        expect(nameError).toBeDefined();
      });

      it('should report error when procedure name is missing (EOF after PROCEDURE)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('Expected procedure name'))).toBe(true);
      });
    });

    describe('Critical cascade prevention tests', () => {
      it('should continue parsing after invalid procedure name with LeftParen', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ();
    PROCEDURE ValidProc();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        // Should report error for first invalid procedure
        expect(errors.length).toBeGreaterThan(0);

        // But should still parse the second procedure
        const procedures = ast.object?.code?.procedures || [];

        // Should have the valid procedure in the AST
        const validProc = procedures.find(p => p.name === 'ValidProc');
        expect(validProc).toBeDefined();
        expect(validProc?.name).toBe('ValidProc');
      });

      it('should continue parsing after invalid procedure name with BEGIN keyword', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE BEGIN
      MESSAGE('This should not happen');
    END;
    PROCEDURE ValidProc();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        // Should report error for first invalid procedure
        expect(errors.length).toBeGreaterThan(0);

        // Should recover and parse ValidProc
        const procedures = ast.object?.code?.procedures || [];
        const validProc = procedures.find(p => p.name === 'ValidProc');
        expect(validProc).toBeDefined();
        expect(validProc?.name).toBe('ValidProc');
      });

      it('should not consume subsequent procedures during error recovery', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE IF();
    PROCEDURE AnotherValidProc();
    BEGIN
    END;
    PROCEDURE ThirdValidProc();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        // Should report error for invalid procedure
        expect(errors.length).toBeGreaterThan(0);

        // Should have both valid procedures in AST
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBeGreaterThanOrEqual(2);

        const secondProc = procedures.find(p => p.name === 'AnotherValidProc');
        const thirdProc = procedures.find(p => p.name === 'ThirdValidProc');

        expect(secondProc).toBeDefined();
        expect(secondProc?.name).toBe('AnotherValidProc');
        expect(thirdProc).toBeDefined();
        expect(thirdProc?.name).toBe('ThirdValidProc');
      });
    });

    describe('Valid cases (regression)', () => {
      it('should accept normal identifier as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBe(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(1);
        expect(procedures[0].name).toBe('MyProc');
      });

      it('should accept identifier with auto-number as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@123();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBe(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(1);
        expect(procedures[0].name).toBe('MyProc');
      });

      it('should accept quoted identifier as procedure name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE "Quoted Name"();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBe(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(1);
        expect(procedures[0].name).toBe('Quoted Name');
      });

      it('should accept Table keyword as procedure name (allowed keyword)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Table();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBe(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(1);
        expect(procedures[0].name).toBe('Table');
      });

      it('should accept Code keyword as procedure name (allowed keyword)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Code();
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBe(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(1);
        expect(procedures[0].name).toBe('Code');
      });
    });
  });

  describe('Phase 1 error messages (Issue #285)', () => {
    describe('Case statement errors', () => {
      it('should report error for missing colon after case branch value', () => {
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
      CASE x OF
        1 EXIT;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected : after case branch value');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(9);
      });

      it('should report error for missing colon after multiple case values', () => {
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
      CASE x OF
        1, 2, 3 EXIT;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected : after case branch value');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(15);
      });

      it('should report error for missing colon after case range expression', () => {
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
      CASE x OF
        1..10 EXIT;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected : after case branch value');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(12);
      });

      it('should report error and recover when ELSE clause contains syntax error (#292)', () => {
        // Note: Issue #292 originally suggested testing "CASE x OF ELSE EXIT THEN"
        // but investigation revealed THEN is treated as a valid identifier (fallback behavior).
        // This test uses an unclosed set literal to test error recovery in CASE ELSE clause.
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      Value : Integer;
    BEGIN
      CASE x OF
        ELSE
          IF Value IN [1, 2, 3 THEN;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        // Should report error for unclosed set literal in ELSE clause
        expect(errors.length).toBeGreaterThan(0);
        const setLiteralError = errors.find(e => e.message.includes('Expected ] after set literal'));
        expect(setLiteralError).toBeDefined();

        // Error recovery should preserve the procedure structure
        expect(ast).toBeDefined();
        expect(ast.object).not.toBeNull();
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(1);
        expect(procedures[0].name).toBe('TestProc');
      });
    });

    describe('Set literal errors', () => {
      it('should report specific error for unclosed set literal', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Value : Integer;
    BEGIN
      IF Value IN [1, 2, 3 THEN;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected ] after set literal');
        expect(errors[0].token.line).toBe(9);
        expect(errors[0].token.column).toBe(28);
      });

      it('should report error for unclosed set literal with trailing comma before error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Value : Integer;
    BEGIN
      IF Value IN [1, 2, THEN;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected ] after set literal');
      });

      it('should report error for set literal with keyword as first element', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Value : Integer;
    BEGIN
      IF Value IN [ THEN;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        // After fix for issue #328, control-flow keywords in set literals
        // are reported as "Unexpected keyword" errors (not "Expected ]")
        expect(errors[0].message).toContain('Unexpected keyword');
      });
    });

    describe('EXIT statement errors', () => {
      it('should report error for missing closing parenthesis in EXIT', () => {
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
      EXIT(x;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected ) after EXIT value');
        expect(errors[0].token.line).toBe(9);
        expect(errors[0].token.column).toBe(13);
      });

      it('should report error for unclosed empty EXIT parentheses', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      EXIT(;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected ) after EXIT value');
        expect(errors[0].token.line).toBe(8);
        expect(errors[0].token.column).toBe(5);
      });
    });
  });

  describe('Phase 1 error recovery tests', () => {
    describe('CASE statement error recovery', () => {
      it('should continue parsing after missing colon in CASE branch', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1 EXIT;
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

        // Should report the error
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected : after case branch value');

        // Should NOT consume AnotherProc - both procedures should be in AST
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(2);
        expect(procedures[0].name).toBe('TestProc');
        expect(procedures[1].name).toBe('AnotherProc');
      });
    });

    describe('Set literal error recovery', () => {
      it('should continue parsing after unclosed set literal', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Value : Integer;
    BEGIN
      IF Value IN [1, 2, 3 THEN;
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

        // Should report the error
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected ] after set literal');

        // Should NOT consume AnotherProc - both procedures should be in AST
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(2);
        expect(procedures[0].name).toBe('TestProc');
        expect(procedures[1].name).toBe('AnotherProc');
      });
    });

    describe('EXIT statement error recovery', () => {
      it('should continue parsing after unclosed EXIT parenthesis', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      EXIT(x;
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

        // Should report the error
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected ) after EXIT value');

        // Should NOT consume AnotherProc - both procedures should be in AST
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(2);
        expect(procedures[0].name).toBe('TestProc');
        expect(procedures[1].name).toBe('AnotherProc');
      });
    });
  });

  describe('Contextual keyword error messages (Issue #287 Phase 2c)', () => {
    describe('DO keyword messages', () => {
      it('should provide error for missing DO after WHILE condition', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10
        i := i + 1;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected DO after WHILE condition');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(9);
      });

      it('should provide error for missing DO after FOR-TO range', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10
        i := i + 1;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected DO after FOR range');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(9);
      });

      it('should provide error for missing DO after FOR-DOWNTO range', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1
        i := i - 1;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected DO after FOR range');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(9);
      });

      it('should provide error for missing DO after WITH record', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer
        Customer.Name := 'Test';
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected DO after WITH record');
        expect(errors[0].token.line).toBe(10);
        expect(errors[0].token.column).toBe(9);
      });
    });

    describe('= sign messages', () => {
      it('should provide error for missing = in PROPERTIES property', () => {
        const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun BEGIN END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const equalError = errors.find(e => e.message.includes('Expected = after property name'));
        expect(equalError).toBeDefined();
      });

      it('should provide error for missing = in field property', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 ; Enabled True }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const equalError = errors.find(e => e.message.includes('Expected = after field property name'));
        expect(equalError).toBeDefined();
      });
    });

    describe(':: double colon message', () => {
      it('should provide error for missing :: in EVENT declaration', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    EVENT Subscriber@1 EventName@2();
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
        const doubleColonError = errors.find(e => e.message.includes('Expected :: between subscriber and event name'));
        expect(doubleColonError).toBeDefined();
      });
    });

    describe('END keyword messages', () => {
      it('should provide error for missing END to close BEGIN block', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN BEGIN
        MESSAGE('Test');
      END
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const endError = errors.find(e => e.message.includes('Expected END to close BEGIN block'));
        expect(endError).toBeDefined();
        expect(endError?.token.line).toBe(11);
        expect(endError?.token.column).toBe(2);
      });

      // Re-enabled for Issue #297: CASE statement END detection
      it('should provide error for missing END to close CASE statement', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      IF TRUE THEN
        CASE x OF
          1: MESSAGE('One');
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const endError = errors.find(e => e.message.includes('Expected END to close CASE statement'));
        expect(endError).toBeDefined();
      });

      it('should report CASE statement missing END, not BEGIN block error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
      // Missing END to close CASE
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should report CASE error, not BEGIN error
        const caseErrors = errors.filter(e =>
          e.message.includes('Expected END to close CASE statement')
        );
        const beginErrors = errors.filter(e =>
          e.message.includes('Expected END to close BEGIN block')
        );

        expect(caseErrors.length).toBeGreaterThan(0);
        expect(beginErrors).toHaveLength(0);
      });

      it('should detect nested CASE statements both missing END', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      a : Integer;
      b : Integer;
    BEGIN
      CASE a OF
        1:
          CASE b OF
            2: MESSAGE('Inner');
          // Inner CASE missing END
        // Outer CASE missing END
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        const caseErrors = errors.filter(e =>
          e.message.includes('Expected END to close CASE statement')
        );

        expect(caseErrors.length).toBeGreaterThanOrEqual(1);
      });

      it('should correctly parse valid nested CASE statements', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      a : Integer;
      b : Integer;
      c : Integer;
    BEGIN
      CASE a OF
        1:
          CASE b OF
            2:
              CASE c OF
                3: MESSAGE('Deep');
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

        const caseErrors = errors.filter(e =>
          e.message.includes('CASE')
        );

        expect(caseErrors).toHaveLength(0);
      });

      it('should detect CASE missing END followed by IF statement (current limitation)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
      // Missing END to close CASE
      IF TRUE THEN
        MESSAGE('After CASE');
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // NOTE: This test documents current behavior - the heuristic does NOT
        // trigger when END is followed by IF/WHILE/FOR (intentional conservatism).
        // The CASE error may not be detected in this scenario.
        // Tracked in issue #314

        expect(errors.length).toBeGreaterThan(0);
        // Just verify we get SOME error - exact error type varies
      });

      it('should detect CASE missing END when branch contains BEGIN block', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: BEGIN
             MESSAGE('In block');
           END;
        // Missing END to close CASE
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        const caseErrors = errors.filter(e =>
          e.message.includes('Expected END to close CASE statement')
        );

        expect(caseErrors.length).toBeGreaterThan(0);
      });

      it('should correctly parse CASE followed by more statements', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
      END;
      IF TRUE THEN
        MESSAGE('After CASE');
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('Contextual brace/bracket error messages (Issue #182 Phase 2b)', () => {
    describe('PROPERTIES section', () => {
      it('should provide context for missing { to open PROPERTIES section', () => {
        const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
    OnRun=BEGIN END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected { to open PROPERTIES section');
      });

      it('should provide context for missing } to close PROPERTIES section', () => {
        const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=BEGIN END;
    CaptionML=ENU=Test,DAN=Test;

  CODE
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close PROPERTIES section'));
        expect(closeError).toBeDefined();
      });
    });

    describe('FIELDS section', () => {
      it('should provide context for missing { to open FIELDS section', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
    { 1 ; ; No. ; Code20 }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Expected { to open FIELDS section');
      });

      it('should provide context for missing } to close FIELDS section', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
    { 2 ; ; Name ; Code50 }
  KEYS
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close FIELDS section'));
        expect(closeError).toBeDefined();
      });

      it.skip('should provide context for missing { to open field definition', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    1 ; ; No. ; Code20 }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open field definition'));
        expect(openError).toBeDefined();
      });

      // Skipped: Item-level boundary error recovery not implemented yet.
      // Recovery assertions added per #294, but parser doesn't recover from missing closing braces.
      // Re-enable when issue #302 (item-level boundary error recovery) is implemented.
      it.skip('should provide context for missing } to close field definition', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20
    { 2 ; ; Name ; Code50 }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close field definition'));
        expect(closeError).toBeDefined();

        // Verify recovery: both fields should be parsed despite first one missing }
        const fields = ast.object?.fields?.fields || [];
        expect(fields.length).toBe(2);
        expect(fields[0].fieldNo).toBe(1); // First field (malformed)
        expect(fields[1].fieldNo).toBe(2); // Second field (should parse correctly)
      });
    });

    describe('KEYS section', () => {
      it('should provide context for missing { to open KEYS section', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  KEYS
    { ; No. ; Clustered=Yes }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open KEYS section'));
        expect(openError).toBeDefined();
      });

      it('should provide context for missing } to close KEYS section', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  KEYS
  {
    { ; No. ; Clustered=Yes }
    { ; Name ; Clustered=No }

  CODE
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close KEYS section'));
        expect(closeError).toBeDefined();
      });

      it.skip('should provide context for missing { to open key definition', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  KEYS
  {
    ; No. ; Clustered=Yes }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open key definition'));
        expect(openError).toBeDefined();
      });

      // Skipped: Item-level boundary error recovery not implemented yet.
      // Recovery assertions added per #294, but parser doesn't recover from missing closing braces.
      // Re-enable when issue #302 (item-level boundary error recovery) is implemented.
      it.skip('should provide context for missing } to close key definition', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  KEYS
  {
    { ; No. ; Clustered=Yes
    { ; Name ; Clustered=No }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close key definition'));
        expect(closeError).toBeDefined();

        // Verify recovery: both keys should be parsed despite first one missing }
        const keys = ast.object?.keys?.keys || [];
        expect(keys.length).toBe(2);
        expect(keys[0].fields).toEqual(['No.']); // First key (malformed)
        expect(keys[1].fields).toEqual(['Name']); // Second key (should parse correctly)
      });
    });

    describe('FIELDGROUPS section', () => {
      it('should provide context for missing { to open FIELDGROUPS section', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  FIELDGROUPS
    { 1 ; DropDown ; No. }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open FIELDGROUPS section'));
        expect(openError).toBeDefined();
      });

      it('should provide context for missing } to close FIELDGROUPS section', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  FIELDGROUPS
  {
    { 1 ; DropDown ; No. }

  CODE
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close FIELDGROUPS section'));
        expect(closeError).toBeDefined();
      });

      it.skip('should provide context for missing { to open field group definition', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  FIELDGROUPS
  {
    1 ; DropDown ; No. }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open field group definition'));
        expect(openError).toBeDefined();
      });

      // Skipped: Item-level boundary error recovery not implemented yet.
      // Recovery assertions added per #294, but parser doesn't recover from missing closing braces.
      // Re-enable when issue #302 (item-level boundary error recovery) is implemented.
      it.skip('should provide context for missing } to close field group definition', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
    { 2 ; ; Name ; Text50 }
  }
  FIELDGROUPS
  {
    { 1 ; DropDown ; No., Name
    { 2 ; Brick ; No. }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close field group definition'));
        expect(closeError).toBeDefined();

        // Verify recovery: both field groups should be parsed despite first one missing }
        const fieldGroups = ast.object?.fieldGroups?.fieldGroups || [];
        expect(fieldGroups.length).toBe(2);
        expect(fieldGroups[0].id).toBe(1); // First field group (malformed)
        expect(fieldGroups[1].id).toBe(2); // Second field group (should parse correctly)
      });
    });

    describe('ACTIONS section', () => {
      it('should provide context for missing { to open ACTIONS section', () => {
        const code = `OBJECT Page 21 Customer
{
  ACTIONS
    { 1 ; 0 ; ActionContainer ; ActionContainerType=ActionItems }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open ACTIONS section'));
        expect(openError).toBeDefined();
      });

      it('should provide context for missing } to close ACTIONS section', () => {
        const code = `OBJECT Page 21 Customer
{
  ACTIONS
  {
    { 1 ; 0 ; ActionContainer ; ActionContainerType=ActionItems }
    { 2 ; 0 ; Action ; Enabled=Yes }

  CONTROLS
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close ACTIONS section'));
        expect(closeError).toBeDefined();
      });

      it.skip('should provide context for missing { to open action definition', () => {
        const code = `OBJECT Page 21 Customer
{
  ACTIONS
  {
    1 ; ActionContainer ; Processing ; ActionContainerType=ActionItems }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open action definition'));
        expect(openError).toBeDefined();
      });

      // Skipped: Item-level boundary error recovery not implemented yet.
      // Recovery assertions added per #294, but parser doesn't recover from missing closing braces.
      // Re-enable when issue #302 (item-level boundary error recovery) is implemented.
      it.skip('should provide context for missing } to close action definition', () => {
        const code = `OBJECT Page 21 Customer
{
  ACTIONS
  {
    { 1 ; 0 ; ActionContainer ; ActionContainerType=ActionItems
    { 2 ; 1 ; Action ; Enabled=Yes }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close action definition'));
        expect(closeError).toBeDefined();

        // Verify recovery: both actions should be parsed despite first one missing }
        const actions = ast.object?.actions?.actions || [];
        expect(actions.length).toBe(2);
        expect(actions[0].id).toBe(1); // First action (malformed)
        expect(actions[1].id).toBe(2); // Second action (should parse correctly)
      });
    });

    describe('CONTROLS section', () => {
      it('should provide context for missing { to open CONTROLS section', () => {
        const code = `OBJECT Page 21 Customer
{
  CONTROLS
    { 1 ; 0 ; Container ; ContainerType=ContentArea }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open CONTROLS section'));
        expect(openError).toBeDefined();
      });

      it('should provide context for missing } to close CONTROLS section', () => {
        const code = `OBJECT Page 21 Customer
{
  CONTROLS
  {
    { 1 ; 0 ; Container ; ContainerType=ContentArea }
    { 2 ; 0 ; Group ; GroupType=Group }

  CODE
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close CONTROLS section'));
        expect(closeError).toBeDefined();
      });

      it.skip('should provide context for missing { to open control definition', () => {
        const code = `OBJECT Page 21 Customer
{
  CONTROLS
  {
    1 ; 0 ; Container ; ContainerType=ContentArea }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open control definition'));
        expect(openError).toBeDefined();
      });

      // Skipped: Item-level boundary error recovery not implemented yet.
      // Recovery assertions added per #294, but parser doesn't recover from missing closing braces.
      // Re-enable when issue #302 (item-level boundary error recovery) is implemented.
      it.skip('should provide context for missing } to close control definition', () => {
        const code = `OBJECT Page 21 Customer
{
  CONTROLS
  {
    { 1 ; 0 ; Container ; ContainerType=ContentArea
    { 2 ; 1 ; Group ; GroupType=Group }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close control definition'));
        expect(closeError).toBeDefined();

        // Verify recovery: both controls should be parsed despite first one missing }
        const controls = ast.object?.controls?.controls || [];
        expect(controls.length).toBe(2);
        expect(controls[0].id).toBe(1); // First control (malformed)
        expect(controls[1].id).toBe(2); // Second control (should parse correctly)
      });
    });

    describe('ELEMENTS section', () => {
      it('should provide context for missing { to open ELEMENTS section', () => {
        const code = `OBJECT XMLport 99999 Test
{
  ELEMENTS
    [{12345678-1234-1234-1234-123456789012}] ; ; Element ; Element ; Text }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open ELEMENTS section'));
        expect(openError).toBeDefined();
      });

      it('should provide context for missing } to close ELEMENTS section', () => {
        const code = `OBJECT XMLport 99999 Test
{
  ELEMENTS
  {
    { [{12345678-1234-1234-1234-123456789012}] ; ; Customer ; Element ; Text }
    { [{87654321-4321-4321-4321-210987654321}] ; 1 ; Name ; Attribute ; Text }

  CODE
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close ELEMENTS section'));
        expect(closeError).toBeDefined();
      });

      it('should detect missing } to close ELEMENTS section with single element', () => {
        const code = `OBJECT XMLport 99999 Test
{
  ELEMENTS
  {
    { [{12345678-1234-1234-1234-123456789012}] ; ; Customer ; Element ; Text }

  CODE
  {
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close ELEMENTS section'));
        expect(closeError).toBeDefined();
      });

      it.skip('should provide context for missing { to open element definition', () => {
        const code = `OBJECT XMLport 99999 Test
{
  ELEMENTS
  {
    [{12345678-1234-1234-1234-123456789012}] ; ; Element ; Element ; Text }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected { to open element definition'));
        expect(openError).toBeDefined();
      });

      // Skipped: Item-level boundary error recovery not implemented yet.
      // Recovery assertions added per #294, but parser doesn't recover from missing closing braces.
      // Re-enable when issue #302 (item-level boundary error recovery) is implemented.
      it.skip('should provide context for missing } to close element definition', () => {
        const code = `OBJECT XMLport 99999 Test
{
  ELEMENTS
  {
    { [{12345678-1234-1234-1234-123456789012}] ; 0 ; Customer ; Element ; Table ; SourceTable=Customer
    { [{87654321-4321-4321-4321-210987654321}] ; 0 ; Item ; Element ; Table }
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const closeError = errors.find(e => e.message.includes('Expected } to close element definition'));
        expect(closeError).toBeDefined();

        // Verify recovery: both elements should be parsed despite first one missing }
        const elements = ast.object?.elements?.elements || [];
        expect(elements.length).toBe(2);
        expect(elements[0].name).toBe('Customer'); // First element (malformed)
        expect(elements[1].name).toBe('Item'); // Second element (should parse correctly)
        expect(elements[1].guid).toBeTruthy(); // Verify GUID was parsed
      });
    });

    describe('Set literal', () => {
      // Skipped: Parser takes wrong path when [ is missing. Needs new issue.
      it.skip('should provide context for missing [ to open set literal', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Value : Integer;
    BEGIN
      IF Value IN 1, 2, 3] THEN;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors.length).toBeGreaterThan(0);
        const openError = errors.find(e => e.message.includes('Expected [ to open set literal'));
        expect(openError).toBeDefined();
      });
    });
  });
});
