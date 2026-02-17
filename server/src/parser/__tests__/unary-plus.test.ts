/**
 * Parser Tests - Unary Plus Operator
 *
 * Tests for issue #505: Parser should handle unary + operator in expressions.
 *
 * ROOT CAUSE:
 * The parser's parseUnary() method (parser.ts line 4748) only handles Minus and Not
 * operators. Unary + is not recognized, causing parse errors when it appears in
 * expressions.
 *
 * Additionally, Plus is in NEVER_PRIMARY_CONSUME (parser.ts line 233), which prevents
 * it from being parsed as the start of a primary expression.
 *
 * EXPECTED BEHAVIOR:
 * Unary + should be handled the same way as unary - (Minus):
 * - Parse as UnaryExpression with operator "+"
 * - Support in all expression contexts (function arguments, assignments, etc.)
 * - Support recursive application: ++x should parse as +(+x)
 *
 * TEST PATTERNS FROM REAL NAV FILES:
 * - FORMAT(+Quantity) — unary + before identifier in function call
 * - Rec.NEXT(+1) — unary + before integer literal in method call
 * - x := +y — unary + in assignment
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Unary Plus Operator', () => {
  describe('Unary plus in function calls', () => {
    it('should parse unary + before identifier in FORMAT call', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Quantity : Decimal;
      Result : Text;
    BEGIN
      Result := FORMAT(+Quantity);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);

      // Verify the unary expression was created
      // The FORMAT call should have one argument: UnaryExpression with operator "+"
      // Note: We can't easily traverse the AST from parse() result, so we verify via no errors
    });

    it('should parse unary + before integer literal in method call', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec@1000 : Record 18;
    BEGIN
      Rec.NEXT(+1);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + before decimal literal', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Result : Decimal;
    BEGIN
      Result := +3.14;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });

  describe('Unary plus in assignments', () => {
    it('should parse unary + in simple assignment', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x := +y;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + in compound assignment +=', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      x += +y;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });

  describe('Unary plus in expressions', () => {
    it('should parse unary + in binary expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      y : Integer;
      Result : Integer;
    BEGIN
      Result := +x + y;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + in comparison', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
    BEGIN
      IF +x > 0 THEN;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + in parenthesized expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      Result : Integer;
    BEGIN
      Result := (+x);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });

  describe('Double unary plus', () => {
    it('should parse ++x as nested unary expressions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      Result : Integer;
    BEGIN
      Result := ++x;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });

  describe('Mixed unary operators', () => {
    it('should parse unary + and unary - together', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      y : Integer;
      Result : Integer;
    BEGIN
      Result := +x + -y;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + with NOT operator', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      Flag : Boolean;
    BEGIN
      IF NOT (+x > 0) THEN;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse +-x as unary + applied to unary - x', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      Result : Integer;
    BEGIN
      Result := +-x;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });

  describe('Unary plus in complex expressions', () => {
    it('should parse unary + in array index expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Arr : ARRAY[10] OF Integer;
      Index : Integer;
      Result : Integer;
    BEGIN
      Result := Arr[+Index];
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + in CASE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      Result : Integer;
    BEGIN
      CASE x OF
        +1: Result := 1;
        +2: Result := 2;
      END;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });

    it('should parse unary + in member expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec@1000 : Record 18;
      Index : Integer;
    BEGIN
      Rec.GET(+Index);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle unary + on TRUE literal', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Result : Boolean;
    BEGIN
      Result := +TRUE;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors (semantic validity is separate concern)
      expect(errors).toHaveLength(0);
    });

    it('should handle unary + on string literal', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Result : Text;
    BEGIN
      Result := +'Hello';
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors (semantic validity is separate concern)
      expect(errors).toHaveLength(0);
    });

    it('should handle unary + on function call result', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Result : Integer;
    BEGIN
      Result := +GetValue();
    END;

    PROCEDURE GetValue@2() : Integer;
    BEGIN
      EXIT(42);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors).toHaveLength(0);
    });
  });
});
