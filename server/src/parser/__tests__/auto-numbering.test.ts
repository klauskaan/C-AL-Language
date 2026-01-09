/**
 * Parser Tests - Auto-Numbering (@number) Handling
 *
 * Tests parsing of C/AL auto-numbering syntax (Identifier@Number).
 * The parser's skipAutoNumberSuffix() method handles @number suffixes,
 * but it currently only checks token VALUE for '@', which fails when
 * the @ character is tokenized as Unknown instead of being part of
 * the identifier token.
 *
 * REGRESSION TESTS for Issue #XX:
 * - Parser error: "Unexpected token in parameter list" when procedure
 *   has @number followed immediately by parameters
 * - Procedure names with @numbers not parsed correctly
 * - Parameter names with @numbers cause parse errors
 * - Array variables with @numbers showing incorrect CodeLens
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Auto-Numbering (@number) Handling', () => {
  describe('Procedure declarations with @numbers', () => {
    it('should parse procedure name with @number', () => {
      const code = `
        OBJECT Codeunit 1003 Test
        {
          CODE
          {
            PROCEDURE Indent@1();
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();
      expect(ast.object?.code).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Indent');
    });

    it('should parse procedure with @number followed immediately by parameters', () => {
      // REGRESSION TEST: This causes "Unexpected token in parameter list at line X, column Y"
      const code = `
        OBJECT Codeunit 1003 Test
        {
          CODE
          {
            PROCEDURE Indent@1(JobNo@1000 : Code[20]);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Before fix: ast.errors will contain "Unexpected token in parameter list"
      // After fix: should parse cleanly
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Indent');

      // Check parameter was parsed correctly
      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(1);
      expect(parameters[0].name).toBe('JobNo');
      expect(parameters[0].dataType?.typeName).toBe('Code[20]');
    });

    it('should parse procedure with [External] attribute and @number', () => {
      // REGRESSION TEST: From COD1003.TXT lines 42-43
      const code = `
        OBJECT Codeunit 1003 Test
        {
          CODE
          {
            [External]
            PROCEDURE Indent@1(JobNo@1000 : Code[20]);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Indent');

      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(1);
      expect(parameters[0].name).toBe('JobNo');
    });

    it('should parse procedure with multiple parameters with @numbers', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@1(Param1@1000 : Code[20];Param2@1001 : Integer);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(2);
      expect(parameters[0].name).toBe('Param1');
      expect(parameters[1].name).toBe('Param2');
    });

    it('should parse procedure with VAR parameter with @number', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@1(VAR Customer@1000 : Record 18);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(1);
      expect(parameters[0].name).toBe('Customer');
      expect(parameters[0].isVar).toBe(true);
    });
  });

  describe('Variable declarations with @numbers', () => {
    it('should parse local variable with @number', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@1();
            VAR
              Customer@1001 : Record 18;
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Customer');
    });

    it('should parse array variable with @number', () => {
      // REGRESSION TEST: From COD1003.TXT line 39
      const code = `
        OBJECT Codeunit 1003 Test
        {
          CODE
          {
            PROCEDURE Test@1();
            VAR
              JTNo@1008 : ARRAY [10] OF Code[20];
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('JTNo');
      expect(variables[0].dataType?.typeName).toBe('ARRAY[10] OF Code[20]');
    });

    it('should parse multiple local variables with @numbers', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@1();
            VAR
              Window@1007 : Dialog;
              JTNo@1008 : ARRAY [10] OF Code[20];
              i@1009 : Integer;
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(3);
      expect(variables[0].name).toBe('Window');
      expect(variables[1].name).toBe('JTNo');
      expect(variables[2].name).toBe('i');
    });

    it('should parse TEMPORARY variable with @number', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@1();
            VAR
              Customer@1000 : TEMPORARY Record 18;
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Customer');
      expect(variables[0].isTemporary).toBe(true);
    });
  });

  describe('Global variables with @numbers', () => {
    it('should parse global variable with @number', () => {
      const code = `
        OBJECT Codeunit 1003 Test
        {
          OBJECT-PROPERTIES
          {
          }
          PROPERTIES
          {
          }
          CODE
          {
            VAR
              JT@1006 : Record 1001;
              Window@1007 : Dialog;

            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();
      expect(ast.object?.code).not.toBeNull();

      const globalVariables = ast.object?.code?.variables || [];
      expect(globalVariables.length).toBeGreaterThanOrEqual(2);

      const jtVar = globalVariables.find((v: any) => v.name === 'JT');
      expect(jtVar).toBeDefined();

      const windowVar = globalVariables.find((v: any) => v.name === 'Window');
      expect(windowVar).toBeDefined();
    });
  });

  describe('AST structure validation', () => {
    it('should maintain correct AST structure for procedure with @number and parameters', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Indent@1(JobNo@1000 : Code[20]);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // AST should be well-formed
      expect(ast.type).toBe('CALDocument');
      expect(ast.object?.type).toBe('ObjectDeclaration');
      expect(ast.object?.code?.type).toBe('CodeSection');

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures[0].type).toBe('ProcedureDeclaration');
      expect(procedures[0].parameters?.[0].type).toBe('ParameterDeclaration');

      // startToken and endToken should be defined
      expect(procedures[0].startToken).toBeDefined();
      expect(procedures[0].endToken).toBeDefined();
      expect(procedures[0].parameters?.[0].startToken).toBeDefined();
      expect(procedures[0].parameters?.[0].endToken).toBeDefined();
    });

    it('should include correct position information in AST nodes', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Indent@1(JobNo@1000 : Code[20]);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const procedures = ast.object?.code?.procedures || [];
      const procedure = procedures[0];

      expect(procedure.startToken?.line).toBeDefined();
      expect(procedure.startToken?.column).toBeDefined();
      expect(procedure.endToken?.line).toBeDefined();
      expect(procedure.endToken?.column).toBeDefined();

      // Parameter position info
      const param = procedure.parameters?.[0];
      expect(param?.startToken?.line).toBeDefined();
      expect(param?.startToken?.column).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should collect errors for malformed @number syntax', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@(Param : Integer);
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should not crash, but may collect errors
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });

    it('should handle @ without number gracefully', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@;
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should not crash
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });

    it('should recover from errors in parameter list with @numbers', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Test@1(Invalid@1000 : : Code[20]);
            BEGIN
            END;

            PROCEDURE Valid@2();
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should still parse the valid procedure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should parse procedure with mixed parameter types and @numbers', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE ComplexProc@1(
              Param1@1000 : Code[20];
              VAR Param2@1001 : Record 18;
              Param3@1002 : ARRAY [10] OF Integer;
              VAR Param4@1003 : Text[100]
            );
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(4);
      expect(parameters[0].name).toBe('Param1');
      expect(parameters[0].isVar).toBe(false);
      expect(parameters[1].name).toBe('Param2');
      expect(parameters[1].isVar).toBe(true);
      expect(parameters[2].name).toBe('Param3');
      expect(parameters[3].name).toBe('Param4');
      expect(parameters[3].isVar).toBe(true);
    });

    it('should parse procedure with return type and @numbers', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE GetValue@1(Param@1000 : Integer) : Boolean;
            BEGIN
              EXIT(TRUE);
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('GetValue');
      expect(procedures[0].returnType).not.toBeNull();

      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(1);
      expect(parameters[0].name).toBe('Param');
    });

    it('should parse procedure with both local and parameter @numbers', () => {
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            PROCEDURE Process@1(JobNo@1000 : Code[20]);
            VAR
              JT@1006 : Record 1001;
              Window@1007 : Dialog;
              i@1009 : Integer;
            BEGIN
            END;
          }
        }
      `;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const parameters = procedures[0].parameters || [];
      expect(parameters).toHaveLength(1);
      expect(parameters[0].name).toBe('JobNo');

      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(3);
      expect(variables[0].name).toBe('JT');
      expect(variables[1].name).toBe('Window');
      expect(variables[2].name).toBe('i');
    });
  });
});
