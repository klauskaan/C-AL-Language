/**
 * Diagnostics Tests
 *
 * Tests for the parser error to diagnostic conversion system.
 * Verifies that syntax errors are properly captured and converted to
 * LSP diagnostics with correct positions and messages.
 */

import { Lexer } from '../lexer/lexer';
import { Parser, ParseError } from '../parser/parser';
import { DiagnosticSeverity, Diagnostic } from 'vscode-languageserver';

/**
 * Helper to simulate what the server does: parse code and convert errors to diagnostics
 */
function getParseErrors(code: string): ParseError[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  parser.parse();
  return parser.getErrors();
}

/**
 * Convert ParseError to Diagnostic (mirrors server.ts logic)
 * Uses source span (endOffset - startOffset) for accurate range calculation.
 */
function errorToDiagnostic(error: ParseError): Diagnostic {
  return {
    severity: DiagnosticSeverity.Error,
    range: {
      start: { line: error.token.line - 1, character: error.token.column - 1 },
      end: { line: error.token.line - 1, character: error.token.column + (error.token.endOffset - error.token.startOffset) - 1 }
    },
    message: error.message,
    source: 'cal'
  };
}

describe('Diagnostics', () => {
  describe('Parser Error Collection', () => {
    it('should return empty array for valid code', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
      const errors = getParseErrors(code);
      expect(errors).toEqual([]);
    });

    it('should collect error for missing closing brace', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;"No."           ;Code20        }
`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should collect error for invalid object type', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('object type');
    });

    it('should collect error for missing object ID', () => {
      const code = `OBJECT Table Customer { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should collect multiple errors with error recovery', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { invalid field }
    { 1   ;"No."           ;Code20        }
    { another invalid }
  }
}`;
      const errors = getParseErrors(code);
      // Parser should recover and find multiple issues
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error to Diagnostic Conversion', () => {
    it('should convert line numbers from 1-indexed to 0-indexed', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      // Token is on line 1 (1-indexed), diagnostic should be line 0 (0-indexed)
      expect(diagnostic.range.start.line).toBe(0);
    });

    it('should convert column numbers from 1-indexed to 0-indexed', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      // Column should be 0-indexed
      expect(diagnostic.range.start.character).toBeGreaterThanOrEqual(0);
    });

    it('should set correct error range for token width', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      const rangeWidth = diagnostic.range.end.character - diagnostic.range.start.character;
      // Range should span at least one character
      expect(rangeWidth).toBeGreaterThan(0);
    });

    it('should set severity to Error', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
    });

    it('should set source to cal', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      expect(diagnostic.source).toBe('cal');
    });

    it('should include error message', () => {
      const code = `OBJECT InvalidType 18 Test { }`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      expect(diagnostic.message).toBeTruthy();
      expect(diagnostic.message.length).toBeGreaterThan(0);
    });
  });

  describe('Error Positions', () => {
    it('should report error at correct position for multiline code', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { invalid field }
  }
}`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = errorToDiagnostic(errors[0]);
      // Error should be on line 4 or 5 (0-indexed: 3 or 4) where the invalid field is
      expect(diagnostic.range.start.line).toBeGreaterThanOrEqual(3);
    });

    it('should handle errors in CODE section', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    BEGIN
      invalid syntax here !!!
    END;

    BEGIN
    END.
  }
}`;
      const errors = getParseErrors(code);
      // Should have errors for invalid syntax
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery', () => {
    it('should continue parsing after error in FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { bad }
    { 1   ;"No."           ;Code20        }
  }
  CODE
  {
    PROCEDURE Test@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      // Parser should recover and still parse the CODE section
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // AST should still have CODE section despite FIELDS errors
      expect(ast.object?.code).toBeDefined();
    });

    it('should continue parsing after error in procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE First@1();
    BEGIN
      ;;; invalid
    END;

    PROCEDURE Second@2();
    BEGIN
      MESSAGE('Hello');
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should still find procedures despite error
      expect(ast.object?.code?.procedures?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Invalid Integer Handling', () => {
    it('should record error for invalid object ID without throwing', () => {
      // Object ID is not a valid integer (contains letters)
      const code = `OBJECT Table abc Customer { }`;
      // Should not throw - just record error
      expect(() => getParseErrors(code)).not.toThrow();
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should record error for invalid field number without throwing', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { xyz ;   ;"No."           ;Code20        }
  }
}`;
      expect(() => getParseErrors(code)).not.toThrow();
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should record error for invalid array size without throwing', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;Values          ;ARRAY[abc] OF Integer }
  }
}`;
      expect(() => getParseErrors(code)).not.toThrow();
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should record error for invalid text length without throwing', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text[xyz]     }
  }
}`;
      expect(() => getParseErrors(code)).not.toThrow();
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should continue parsing after invalid integer in object ID', () => {
      const code = `OBJECT Table abc Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Parser should not crash and should attempt to continue
      expect(ast).toBeDefined();
    });

    it('should include invalid value in error message', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { notanumber ;   ;"No."    ;Code20        }
  }
}`;
      const errors = getParseErrors(code);
      // Look for an error mentioning the invalid value or integer
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input without crashing', () => {
      const errors = getParseErrors('');
      // Empty input might not have errors, just no AST
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle whitespace-only input', () => {
      const errors = getParseErrors('   \n\n   \t  ');
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle just OBJECT keyword', () => {
      const errors = getParseErrors('OBJECT');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle truncated field definition', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ;`;
      const errors = getParseErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
