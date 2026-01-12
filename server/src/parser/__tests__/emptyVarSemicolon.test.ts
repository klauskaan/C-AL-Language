/**
 * Empty VAR Block Semicolon Handling Tests
 *
 * CONTEXT: NAV exports contain patterns like `VAR ; BEGIN` where empty VAR blocks
 * have trailing semicolons. This is valid C/AL syntax from C/SIDE exports.
 *
 * TDD EXPECTATION: These tests should FAIL initially (except test 7), showing that
 * the parser currently rejects valid C/AL syntax. After the parser fix, they will pass.
 *
 * The parser should skip stray semicolons in VAR blocks and continue parsing,
 * treating them as no-op separators that don't constitute variable declarations.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Empty VAR block semicolon handling', () => {
  describe('should skip stray semicolons', () => {
    it('should parse basic empty VAR with semicolon before BEGIN', () => {
      // Test Case 1: VAR ; BEGIN ... END;
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            ;
          BEGIN
            EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty VAR block with semicolon is valid C/AL
      expect(errors.length).toBe(0);

      // AST should contain procedure with 0 variables
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(0);
      expect(procedures[0].body).toBeDefined();
    });

    it('should parse multiple consecutive semicolons in VAR block', () => {
      // Test Case 3: VAR ;;; BEGIN ... END;
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            ;
            ;
            ;
          BEGIN
            EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Multiple semicolons should be skipped
      expect(errors.length).toBe(0);

      // AST should contain procedure with 0 variables
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(0);
    });

    it('should parse valid declaration after leading semicolons', () => {
      // Test Case 4: VAR ; x@1000 : Integer; BEGIN...
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            ;
            x@1000 : Integer;
          BEGIN
            x := 42;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Leading semicolon should be skipped, valid variable parsed
      expect(errors.length).toBe(0);

      // AST should contain procedure with 1 variable
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('x');
      expect(procedures[0].variables[0].dataType.typeName).toBe('Integer');
    });

    it('should parse semicolon before PROCEDURE keyword', () => {
      // Test Case 5: VAR ; PROCEDURE Foo;
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            ;

          PROCEDURE Foo();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Semicolon before PROCEDURE should exit VAR block cleanly
      expect(errors.length).toBe(0);

      // AST should contain 0 global variables and 1 procedure
      expect(ast).not.toBeNull();
      const codeSection = ast.object?.code;
      expect(codeSection?.variables).toHaveLength(0);
      expect(codeSection?.procedures).toHaveLength(1);
      expect(codeSection?.procedures[0].name).toBe('Foo');
    });

    it('should parse consecutive semicolons before valid declaration', () => {
      // Test Case 6: VAR ;;; x : Integer; BEGIN...
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            ;
            ;
            ;
            x@1 : Integer;
          BEGIN
            x := 10;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Multiple leading semicolons should be skipped
      expect(errors.length).toBe(0);

      // AST should contain procedure with 1 variable
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('x');
      expect(procedures[0].variables[0].dataType.typeName).toBe('Integer');
    });

    it('should parse table field trigger OnValidate with empty VAR', () => {
      // Test Case 8: OnValidate=VAR ; BEGIN... in field context
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        ;
                                                     OnValidate=VAR
                                                                  ;
                                                                BEGIN
                                                                  TESTFIELD(Name);
                                                                END;
                                                                 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty VAR in field trigger is valid
      expect(errors.length).toBe(0);

      // AST should contain table with field that has OnValidate trigger
      expect(ast).not.toBeNull();
      expect(ast.object?.objectKind).toBe('Table');
      const fieldSection = ast.object?.fields;
      expect(fieldSection).not.toBeNull();
      const fields = fieldSection?.fields || [];
      expect(fields.length).toBe(1);

      const field = fields[0];
      expect(field.triggers).toBeDefined();
      const onValidate = field.triggers?.find((t: any) => t.name === 'OnValidate');
      expect(onValidate).toBeDefined();
      expect(onValidate?.variables).toHaveLength(0);
      expect(onValidate?.body).toBeDefined();
    });

    it('should parse line comment before semicolon in VAR block', () => {
      // Test Case 9: VAR // comment\n ; x : Integer;
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            // Empty variable list
            ;
            x@1 : Integer;
          BEGIN
            x := 5;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Line comment before semicolon should be handled
      expect(errors.length).toBe(0);

      // AST should contain procedure with 1 variable
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('x');
    });

  });

  describe('should preserve error behavior', () => {
    it('should report error for partial declaration with semicolon', () => {
      // Test Case 7: NEGATIVE - VAR x ; (no type)
      // This should FAIL because it's a malformed declaration
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x
            ;
          BEGIN
            EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Partial declaration without type should produce an error
      expect(errors.length).toBeGreaterThan(0);

      // Error should mention missing colon or type
      const errorMessages = errors.map(e => e.message.toLowerCase()).join(' ');
      expect(
        errorMessages.includes('expected :') ||
        errorMessages.includes('expected colon') ||
        errorMessages.includes('type')
      ).toBe(true);
    });
  });

  describe('Real-world NAV export patterns', () => {
    it('should parse realistic codeunit with empty VAR in OnRun trigger', () => {
      // Pattern from actual NAV exports
      const code = `OBJECT Codeunit 50000 "Test Manager"
{
  OBJECT-PROPERTIES
  {
    Date=01/12/26;
    Time=12:00:00;
  }
  PROPERTIES
  {
    OnRun=VAR
            ;
          BEGIN
            MESSAGE('Test passed');
          END;

  }
  CODE
  {

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Real-world pattern should parse without errors
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();
      expect(ast.object?.objectKind).toBe('Codeunit');

      // OnRun trigger in PROPERTIES section is stored in properties, not code.triggers
      expect(ast.object?.properties).toBeDefined();
      const properties = ast.object?.properties?.properties || [];
      const onRunProperty = properties.find(p => p.name === 'OnRun');
      expect(onRunProperty).toBeDefined();
      // The OnRun property has trigger body - semicolon in empty VAR should not break parsing
      expect(onRunProperty?.triggerBody).toBeDefined();
      // Empty VAR section (with just semicolon) should have no variables
      expect(onRunProperty?.triggerVariables || []).toHaveLength(0);
    });

    it('should parse procedure with mixed semicolons and valid declarations', () => {
      // Edge case: semicolons interspersed with declarations
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ComplexVarBlock();
          VAR
            ;
            x@1 : Integer;
            ;
            y@2 : Text[50];
            ;
          BEGIN
            x := 1;
            y := 'test';
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Interspersed semicolons should be skipped
      expect(errors.length).toBe(0);

      // AST should contain procedure with 2 variables
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(2);
      expect(procedures[0].variables[0].name).toBe('x');
      expect(procedures[0].variables[1].name).toBe('y');
    });
  });

  describe('Edge cases with temporary variables', () => {
    it('should parse semicolon before TEMPORARY variable declaration', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            ;
            TempCustomer@1 : TEMPORARY Record 18;
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Semicolon before TEMPORARY should be handled
      expect(errors.length).toBe(0);

      // AST should contain procedure with 1 TEMPORARY variable
      expect(ast).not.toBeNull();
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('TempCustomer');
      expect(procedures[0].variables[0].isTemporary).toBe(true);
    });
  });

  describe('Semicolons in global VAR section', () => {
    it('should parse global VAR block with leading semicolons', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            ;
            ;
            GlobalVar@1000 : Integer;

          PROCEDURE TestProc();
          BEGIN
            GlobalVar := 100;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Leading semicolons in global VAR should be skipped
      expect(errors.length).toBe(0);

      // AST should contain 1 global variable
      expect(ast).not.toBeNull();
      const codeSection = ast.object?.code;
      expect(codeSection?.variables).toHaveLength(1);
      expect(codeSection?.variables[0].name).toBe('GlobalVar');
    });

    it('should parse empty global VAR block with only semicolons', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            ;
            ;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Empty global VAR with semicolons should be valid
      expect(errors.length).toBe(0);

      // AST should contain 0 global variables
      expect(ast).not.toBeNull();
      const codeSection = ast.object?.code;
      expect(codeSection?.variables).toHaveLength(0);
      expect(codeSection?.procedures).toHaveLength(1);
    });
  });
});
