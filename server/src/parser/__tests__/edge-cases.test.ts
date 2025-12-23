/**
 * Parser Tests - Edge Cases
 *
 * Tests edge case scenarios for the parser including:
 * - Deeply nested expressions (20+ levels)
 * - Maximum field numbers (approaching 2 billion limit)
 * - Empty PROPERTIES blocks and other empty sections
 * - Comments within field definitions
 *
 * The parser should NEVER throw exceptions - it should collect errors
 * and return a (possibly partial) AST for all inputs.
 *
 * See spec.md for detailed requirements on each edge case category.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Deeply Nested Expressions', () => {
  describe('Nested parentheses in expressions', () => {
    it('should handle 20 levels of nested parentheses without stack overflow', () => {
      const depth = 20;
      const nested = '('.repeat(depth) + 'x + 1' + ')'.repeat(depth);
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${nested};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle 25 levels of nested parentheses without stack overflow', () => {
      const depth = 25;
      const nested = '('.repeat(depth) + 'x + 1' + ')'.repeat(depth);
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${nested};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle 50 levels of nested parentheses without stack overflow', () => {
      const depth = 50;
      const nested = '('.repeat(depth) + 'value' + ')'.repeat(depth);
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${nested};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should return valid AST for deeply nested expression', () => {
      const depth = 20;
      const nested = '('.repeat(depth) + 'x' + ')'.repeat(depth);
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${nested};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });
  });

  describe('Nested NOT expressions', () => {
    it('should handle deeply nested NOT operators', () => {
      const notChain = 'NOT '.repeat(20) + 'x';
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF ${notChain} THEN;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle 10 levels of nested NOT operators', () => {
      const notChain = 'NOT '.repeat(10) + 'boolVar';
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${notChain};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Nested function calls', () => {
    it('should handle deeply nested function calls', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := Func1(Func2(Func3(Func4(Func5(x)))));
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle nested function calls with multiple arguments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := Outer(Inner1(a, b), Inner2(c, Inner3(d, e)));
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Nested IF statements', () => {
    it('should handle deeply nested IF-THEN-ELSE structures', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF a THEN
              IF b THEN
                IF c THEN
                  IF d THEN
                    IF e THEN
                      x := 1
                    ELSE
                      x := 2
                  ELSE
                    x := 3
                ELSE
                  x := 4
              ELSE
                x := 5
            ELSE
              x := 6;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle 15 levels of nested IF statements', () => {
      let code = 'IF x THEN ';
      for (let i = 0; i < 15; i++) {
        code = `IF cond${i} THEN BEGIN ${code} END`;
      }
      const fullCode = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            ${code};
          END;
        }
      }`;
      const lexer = new Lexer(fullCode);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Mixed nested structures', () => {
    it('should handle combination of nested parentheses and operators', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ((((a + b) * c) - d) / ((e + f) * g));
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });
});

describe('Parser - Maximum Field Numbers', () => {
  describe('Large field IDs', () => {
    it('should handle maximum INT32 value as field number (2147483647)', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 2147483647 ; ; "MaxField" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle field number at JavaScript safe integer limit', () => {
      // JavaScript MAX_SAFE_INTEGER is 9007199254740991
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 9007199254740991 ; ; "MaxSafeField" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle field number 1 (minimum practical)', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; "FirstField" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle field number 0', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 0 ; ; "ZeroField" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Large object IDs', () => {
    it('should handle maximum INT32 value as object ID (2147483647)', () => {
      const code = `OBJECT Table 2147483647 MaxTable`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object).not.toBeNull();
      expect(ast.object?.objectId).toBe(2147483647);
    });

    it('should handle object ID of 1 billion', () => {
      const code = `OBJECT Table 1000000000 BigTable`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectId).toBe(1000000000);
    });

    it('should handle typical NAV reserved range IDs', () => {
      const code = `OBJECT Codeunit 99999999 ExtendedCodeunit`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectId).toBe(99999999);
    });
  });

  describe('Boundary value field IDs', () => {
    it('should handle multiple fields with varying large IDs', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; "First" ; Code20 }
          { 1000000 ; ; "Million" ; Code20 }
          { 2147483647 ; ; "MaxInt" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });
});

describe('Parser - Empty Sections', () => {
  describe('Empty PROPERTIES blocks', () => {
    it('should handle empty PROPERTIES section', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();

      const ast = parser.parse();
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });

    it('should handle PROPERTIES section with only whitespace', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {

        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle inline empty PROPERTIES section', () => {
      const code = `OBJECT Table 1 Test { PROPERTIES { } }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Empty FIELDS blocks', () => {
    it('should handle empty FIELDS section', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle inline empty FIELDS section', () => {
      const code = `OBJECT Table 1 Test { FIELDS { } }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Empty KEYS blocks', () => {
    it('should handle empty KEYS section', () => {
      const code = `OBJECT Table 1 Test {
        KEYS {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Empty CODE blocks', () => {
    it('should handle empty CODE section', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle CODE section with only VAR block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            x : Integer;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Multiple empty sections', () => {
    it('should handle object with all empty sections', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
        }
        FIELDS {
        }
        KEYS {
        }
        CODE {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle page with empty sections', () => {
      const code = `OBJECT Page 1 TestPage {
        PROPERTIES {
        }
        CONTROLS {
        }
        CODE {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Empty procedure body', () => {
    it('should handle procedure with empty BEGIN-END block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE EmptyProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle function with empty BEGIN-END block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          FUNCTION EmptyFunc() : Boolean;
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });
});

describe('Parser - Comments in Structural Sections', () => {
  describe('Comments in FIELDS section', () => {
    it('should handle line comment before field definition', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          // This is a field comment
          { 1 ; ; "Field1" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle line comment between fields', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; "Field1" ; Code20 }
          // Separator comment
          { 2 ; ; "Field2" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle inline comment after field definition', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; "Field1" ; Code20 } // field comment
          { 2 ; ; "Field2" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle block comment in FIELDS section', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { commented field block }
          { 1 ; ; "RealField" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle multi-line block comment between fields', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; "Field1" ; Code20 }
          {
            This is a multi-line
            block comment between fields
          }
          { 2 ; ; "Field2" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Comments in PROPERTIES section', () => {
    it('should handle comments in PROPERTIES', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          // Property comment
          CaptionML=ENU=Test;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle inline comment after property', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          CaptionML=ENU=Test; // caption property
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Comments in CODE section', () => {
    it('should handle comments between procedures', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Proc1();
          BEGIN
          END;

          // Helper procedure
          PROCEDURE Proc2();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle block comments within procedure body', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            { block comment in code }
            x := 1;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle line comments within procedure body', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            // line comment
            x := 1;
            // another comment
            y := 2;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Comments between tokens', () => {
    it('should handle comment between OBJECT and kind', () => {
      const code = `OBJECT { comment } Table 1 Test`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle comment between object kind and ID', () => {
      const code = `OBJECT Table { comment } 1 Test`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle multiple comments between tokens', () => {
      const code = `OBJECT { c1 } Table { c2 } 1 { c3 } Test`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Comments in VAR section', () => {
    it('should handle comments between variable declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            x : Integer;
            // comment between vars
            y : Decimal;

          PROCEDURE Test();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle inline comment after variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Counter : Integer; // loop counter

          PROCEDURE Test();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });
});

describe('Parser - Edge Case Combinations', () => {
  describe('Combined edge cases', () => {
    it('should handle deeply nested expression with large numbers', () => {
      const depth = 10;
      const nested = '('.repeat(depth) + '2147483647' + ')'.repeat(depth);
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${nested};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle empty sections with comments', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          // Empty properties
        }
        FIELDS {
          { Only a comment here }
        }
        KEYS {
          // No keys defined
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle object with quoted name containing special characters', () => {
      const code = `OBJECT Table 50000 "My Table (Test) - Special/Chars"`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object).not.toBeNull();
      expect(ast.object?.objectName).toBe('My Table (Test) - Special/Chars');
    });
  });

  describe('Stress tests', () => {
    it('should handle 100 levels of nesting without crash', () => {
      const depth = 100;
      const nested = '('.repeat(depth) + 'x' + ')'.repeat(depth);
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            result := ${nested};
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle many comments scattered throughout', () => {
      const code = `OBJECT { c1 } Table { c2 } 1 { c3 } Test {
        // comment
        PROPERTIES {
          // property comment
        }
        // between sections
        FIELDS {
          // field section comment
          { 1 ; ; "Field1" ; Code20 } // inline
          // another comment
          { 2 ; ; "Field2" ; Code20 }
        }
        // after fields
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });
});
