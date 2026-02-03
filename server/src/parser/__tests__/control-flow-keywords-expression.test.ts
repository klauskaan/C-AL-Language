/**
 * Control-Flow Keywords in Expression Position Tests (Issue #301)
 *
 * Tests that control-flow keywords (THEN, ELSE, DO, OF, TO, DOWNTO, UNTIL, BEGIN, END)
 * are properly rejected when used as identifiers in expression positions.
 *
 * Bug: parsePrimary() fallback treats control-flow keywords as identifiers without errors.
 * Example: `CASE x OF ELSE EXIT THEN;` - THEN is parsed as an identifier, no error.
 *
 * Fix: Add CONTROL_FLOW_KEYWORDS set and check in parsePrimary() fallback.
 *
 * Note: Break and Exit are intentionally EXCLUDED:
 * - Break is a valid procedure name (Issue #258)
 * - Exit can take expression arguments
 *
 * Issue #329: Added test coverage for keywords after binary/unary operators
 *              (tests currently skipped - see #331 for parser bug fix)
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { parseCode } from '../parser';

describe('Control-Flow Keywords in Expression Position', () => {
  describe('Exact bug scenario from issue #301', () => {
    it('should report error for THEN keyword used as identifier', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: EXIT;
        ELSE EXIT THEN;
      END;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for control-flow keyword in expression position
      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.message.includes('in expression')
      );
      expect(keywordError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });

  describe('Each control-flow keyword in expression position', () => {
    const controlFlowKeywords = [
      'THEN',
      'ELSE',
      'DO',
      'OF',
      'TO',
      'DOWNTO',
      'UNTIL',
      'BEGIN',
      'END'
    ];

    controlFlowKeywords.forEach(keyword => {
      it(`should report error for ${keyword} keyword in assignment`, () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x := ${keyword};
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error: "Unexpected keyword in expression"
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });
    });
  });

  describe('Break regression guard', () => {
    it('should allow Break as procedure name without error', () => {
      // Break is a valid procedure name per Issue #258
      // Calls require quoted syntax: "Break"(param);
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE "Break"(param : Integer);
    BEGIN
    END;

    PROCEDURE Caller();
    BEGIN
      "Break"(5);
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
      expect(ast.object).toBeDefined();
    });

    it('should not report error when Break used in valid BREAK statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO BEGIN
        IF i = 5 THEN
          BREAK;
      END;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });
  });

  describe('Exit validation', () => {
    it('should parse EXIT statement without arguments', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse EXIT statement with expression argument', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE GetValue() : Integer;
    BEGIN
      EXIT(42);
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });
  });

  describe('Control-flow keywords in valid contexts', () => {
    it('should parse THEN in IF-THEN statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Boolean;
    BEGIN
      IF x THEN
        EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse ELSE in IF-THEN-ELSE statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Boolean;
    BEGIN
      IF x THEN
        EXIT
      ELSE
        EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse DO in FOR loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse OF in CASE statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: EXIT;
        2: EXIT;
      END;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse TO in FOR loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse DOWNTO in FOR loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse UNTIL in REPEAT-UNTIL loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Boolean;
    BEGIN
      REPEAT
        EXIT;
      UNTIL x;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should parse BEGIN-END block', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      BEGIN
        EXIT;
      END;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should report error for multiple control-flow keywords in sequence', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x := THEN ELSE DO;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report multiple errors (one for each keyword)
      expect(errors.length).toBeGreaterThan(0);

      // At least one should be the control-flow keyword error
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.message.includes('in expression')
      );
      expect(keywordError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for control-flow keyword in function call position', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x := THEN();
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for control-flow keyword in expression
      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.message.includes('in expression')
      );
      expect(keywordError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should allow control-flow keyword as field name in member access', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      rec : Record 18;
    BEGIN
      x := rec.THEN;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Field names in member access are allowed to use reserved words
      // (the field is defined in the record's FIELDS section, not as an expression identifier)
      expect(errors.length).toBe(0);

      // AST should parse without errors
      expect(ast).toBeDefined();
    });
  });

  describe('Keywords after logical/arithmetic operators', () => {
    describe('Binary operators (AND, OR, XOR, DIV, MOD, IN)', () => {
      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := y AND THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error for control-flow keyword in expression
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });

      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := y OR THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error for control-flow keyword in expression
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });

      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := y XOR THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error for control-flow keyword in expression
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });

      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := y DIV THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error for control-flow keyword in expression
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });

      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := y MOD THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error for control-flow keyword in expression
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });

      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := y IN THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report error for control-flow keyword in expression
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();

        // AST should still parse (graceful recovery)
        expect(ast).toBeDefined();
      });
    });

    describe('Unary NOT operator', () => {
      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Boolean;
    BEGIN
      x := NOT THEN;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();
        expect(ast).toBeDefined();
      });
    });

    describe('Nested expressions', () => {
      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := (y + (THEN));
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('in expression') &&
          e.message.includes('THEN')
        );
        expect(keywordError).toBeDefined();
        expect(ast).toBeDefined();
      });
    });

    describe('Multiple errors', () => {
      it.skip('Bug: Parser does not detect control-flow keywords after binary/unary operators - see #331', () => {
        const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x := THEN + ELSE;
    END;

    BEGIN
    END.
  }
}`;

        const { ast, errors } = parseCode(code);

        // Should report at least 2 errors (one for THEN, one for ELSE)
        expect(errors.length).toBeGreaterThanOrEqual(2);

        const thenError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('THEN')
        );
        const elseError = errors.find(e =>
          e.message.includes('Unexpected keyword') &&
          e.message.includes('ELSE')
        );

        expect(thenError).toBeDefined();
        expect(elseError).toBeDefined();
        expect(ast).toBeDefined();
      });
    });
  });

  describe('Control-flow keywords in set literals and array subscripts (Issue #328)', () => {
    it('should report error for single keyword in set literal', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      IF x IN [THEN] THEN EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for control-flow keyword in set literal
      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.token?.value === 'THEN'
      );
      expect(keywordError).toBeDefined();
      if (keywordError) {
        expect(keywordError.message).toContain('Unexpected keyword');
        expect(keywordError.token?.value).toBe('THEN');
      }

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for multiple keywords in set literal', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      IF x IN [BEGIN, END] THEN EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report errors for both keywords
      expect(errors.length).toBeGreaterThan(0);

      // Check for BEGIN keyword error
      const beginError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.token?.value === 'BEGIN'
      );
      expect(beginError).toBeDefined();
      if (beginError) {
        expect(beginError.message).toContain('Unexpected keyword');
        expect(beginError.token?.value).toBe('BEGIN');
      }

      // Check for END keyword error
      // Note: END may trigger error recovery before parsePrimary reports "Unexpected keyword",
      // so we accept any error mentioning END (e.g., "Expected ]" or "Expected THEN")
      const endError = errors.find(e => e.token?.value === 'END');
      expect(endError).toBeDefined();
      if (endError) {
        expect(endError.token?.value).toBe('END');
      }

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for keyword as range end in set literal', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      IF x IN [1..THEN] THEN EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for control-flow keyword as range end
      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.token?.value === 'THEN'
      );
      expect(keywordError).toBeDefined();
      if (keywordError) {
        expect(keywordError.message).toContain('Unexpected keyword');
        expect(keywordError.token?.value).toBe('THEN');
      }

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for keyword in array subscript', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      MyArray : array[10] of Integer;
    BEGIN
      MyArray[THEN] := 1;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for control-flow keyword in array subscript
      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.token?.value === 'THEN'
      );
      expect(keywordError).toBeDefined();
      if (keywordError) {
        expect(keywordError.message).toContain('Unexpected keyword');
        expect(keywordError.token?.value).toBe('THEN');
      }

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for keyword as range start in set literal', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      IF x IN [ELSE..10] THEN EXIT;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for control-flow keyword as range start
      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected keyword') &&
        e.token?.value === 'ELSE'
      );
      expect(keywordError).toBeDefined();
      if (keywordError) {
        expect(keywordError.message).toContain('Unexpected keyword');
        expect(keywordError.token?.value).toBe('ELSE');
      }

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });
});
