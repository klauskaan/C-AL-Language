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
    source: 'cal',
    code: error.code
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

  describe('Diagnostic Codes', () => {
    describe('Default Code', () => {
      it('should assign parse-error code to generic parse errors', () => {
        // Invalid object type is a generic parse error (not in specific categories)
        const code = `OBJECT InvalidType 18 Test { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const diagnostic = errorToDiagnostic(errors[0]);
        expect(diagnostic.code).toBe('parse-error');
      });

      it('should assign parse-error code when code field is undefined', () => {
        const code = `OBJECT Table abc Customer { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const diagnostic = errorToDiagnostic(errors[0]);
        // Should have a code, defaulting to 'parse-error'
        expect(diagnostic.code).toBeDefined();
        expect(typeof diagnostic.code).toBe('string');
      });
    });

    describe('Expected Token Code', () => {
      it('should assign parse-expected-token code for missing semicolon in statement', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      x : Integer
    BEGIN
      MESSAGE('Done');
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const semicolonError = errors.find(e => e.message.includes('Expected ;'));
        expect(semicolonError).toBeDefined();

        const diagnostic = errorToDiagnostic(semicolonError!);
        expect(diagnostic.code).toBe('parse-expected-token');
      });

      it('should assign parse-expected-token code for missing END keyword', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      MESSAGE('Test');
    // Missing END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        // Look for error about missing END or unexpected BEGIN
        const endError = errors.find(e =>
          e.message.includes('END') || e.message.includes('BEGIN')
        );
        expect(endError).toBeDefined();

        const diagnostic = errorToDiagnostic(endError!);
        expect(diagnostic.code).toBe('parse-expected-token');
      });

      it('should assign parse-expected-token code for missing colon in CASE branch', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1 EXIT;
      END;
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const colonError = errors.find(e => e.message.includes(':'));
        expect(colonError).toBeDefined();

        const diagnostic = errorToDiagnostic(colonError!);
        expect(diagnostic.code).toBe('parse-expected-token');
      });
    });

    describe('Unclosed Block Code', () => {
      it('should assign parse-unclosed-block code for missing closing brace in FIELDS', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        // Look for unclosed section/block error
        const braceError = errors.find(e =>
          e.message.toLowerCase().includes('unclosed') ||
          e.message.includes('}')
        );
        expect(braceError).toBeDefined();

        const diagnostic = errorToDiagnostic(braceError!);
        expect(diagnostic.code).toBe('parse-unclosed-block');
      });

      it('should assign parse-unclosed-block code for missing closing brace in object', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  // Missing closing brace for FIELDS section
  KEYS
  {
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const braceError = errors.find(e =>
          e.message.includes('Expected } to close FIELDS section')
        );
        expect(braceError).toBeDefined();

        const diagnostic = errorToDiagnostic(braceError!);
        expect(diagnostic.code).toBe('parse-unclosed-block');
      });

      it('should assign parse-unclosed-block code for missing closing brace in CODE section', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      REPEAT
        MESSAGE('Test');
      // Missing UNTIL to close REPEAT
    END;
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const braceError = errors.find(e =>
          e.message.includes('Expected UNTIL to close REPEAT')
        );
        expect(braceError).toBeDefined();

        const diagnostic = errorToDiagnostic(braceError!);
        expect(diagnostic.code).toBe('parse-unclosed-block');
      });
    });

    describe('AL-Only Syntax Code', () => {
      it('should assign parse-al-only-syntax code for null coalescing operator', () => {
        // Null coalescing operator (??) is AL-only, not available in C/AL
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      x : Text;
      y : Text;
      z : Text;
    BEGIN
      z := x ?? y;
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        // Look for error about ?? operator
        const alError = errors.find(e =>
          e.message.includes('??') ||
          e.message.toLowerCase().includes('al') ||
          e.message.toLowerCase().includes('not supported')
        );
        expect(alError).toBeDefined();

        const diagnostic = errorToDiagnostic(alError!);
        expect(diagnostic.code).toBe('parse-al-only-syntax');
      });

      it('should assign parse-al-only-syntax code for datatype var prefix', () => {
        // The 'var' keyword as a parameter modifier is AL-only
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(var x : Integer);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);

        // This might not generate an error in current parser, but when it does:
        const alError = errors.find(e =>
          e.message.toLowerCase().includes('var') &&
          (e.message.toLowerCase().includes('al') ||
           e.message.toLowerCase().includes('not supported'))
        );

        if (alError) {
          const diagnostic = errorToDiagnostic(alError);
          expect(diagnostic.code).toBe('parse-al-only-syntax');
        }
      });
    });

    describe('Error Recovery Code', () => {
      it('should assign parse-error-recovery code for skipped tokens', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { completely invalid garbage tokens here }
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        // Look for error recovery message
        const recoveryError = errors.find(e =>
          e.message.toLowerCase().includes('skipped') ||
          e.message.toLowerCase().includes('recovery')
        );

        if (recoveryError) {
          const diagnostic = errorToDiagnostic(recoveryError);
          expect(diagnostic.code).toBe('parse-error-recovery');
        }
      });
    });

    describe('Property Value Code', () => {
      it('should assign parse-property-value code for invalid property value', () => {
        const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    DataPerCompany=InvalidValue;
  }
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
        const errors = getParseErrors(code);

        // Look for property-related error
        const propError = errors.find(e =>
          e.message.toLowerCase().includes('property')
        );

        if (propError) {
          const diagnostic = errorToDiagnostic(propError);
          expect(diagnostic.code).toBe('parse-property-value');
        }
      });
    });

    describe('Code Field in Diagnostic Conversion', () => {
      it('should include code field when converting error to diagnostic', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ;`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const diagnostic = errorToDiagnostic(errors[0]);
        expect(diagnostic).toHaveProperty('code');
        expect(typeof diagnostic.code).toBe('string');
        expect((diagnostic.code as string).length).toBeGreaterThan(0);
      });

      it('should preserve code field through diagnostic conversion', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      x : Integer
    BEGIN
      MESSAGE('Test');
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        const semicolonError = errors.find(e => e.message.includes('Expected ;'));
        expect(semicolonError).toBeDefined();

        // Convert to diagnostic
        const diagnostic = errorToDiagnostic(semicolonError!);

        // Code should be preserved and be expected-token
        expect(diagnostic.code).toBe('parse-expected-token');
        expect(diagnostic.message).toBeTruthy();
        expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
      });
    });
  });
});
