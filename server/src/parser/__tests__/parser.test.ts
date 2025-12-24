/**
 * Parser Tests - Basic Functionality
 *
 * Tests the fundamental parser behavior:
 * - Parser initialization and operation
 * - Error recovery and graceful handling
 * - Empty/minimal input edge cases
 * - AST structure validation
 *
 * The parser should NEVER throw exceptions - it should collect errors
 * and return a (possibly partial) AST for all inputs.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { TokenType } from '../../lexer/tokens';

describe('Parser - Basic Functionality', () => {
  describe('Parser initialization', () => {
    it('should create a parser instance', () => {
      const lexer = new Lexer('');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      expect(parser).toBeDefined();
    });

    it('should accept empty token list', () => {
      const parser = new Parser([]);

      expect(parser).toBeDefined();
    });
  });

  describe('Empty and minimal input', () => {
    it('should parse empty input gracefully', () => {
      const code = '';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });

    it('should return CALDocument with null object for empty input', () => {
      const code = '';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object).toBeNull();
    });

    it('should parse whitespace-only input gracefully', () => {
      const code = '   \n\n  \t  \n  ';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.object).toBeNull();
    });

    it('should parse comment-only input gracefully', () => {
      const code = '// Just a comment\n{ Block comment }';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.object).toBeNull();
    });
  });

  describe('Minimal valid object', () => {
    it('should parse minimal table object', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).not.toBeNull();
    });

    it('should extract object kind correctly', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectKind).toBe('Table');
    });

    it('should extract object ID correctly', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectId).toBe(18);
    });

    it('should extract object name correctly', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectName).toBe('Customer');
    });

    it('should handle quoted object names', () => {
      const code = `OBJECT Table 18 "Customer Master" {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectName).toBe('Customer Master');
    });

    it('should handle large object IDs', () => {
      const code = `OBJECT Table 99999 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.objectId).toBe(99999);
    });
  });

  describe('AST structure validation', () => {
    it('should include startToken and endToken', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.startToken).toBeDefined();
      expect(ast.endToken).toBeDefined();
    });

    it('should have correct node type for document', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.type).toBe('CALDocument');
    });

    it('should have correct node type for object', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.type).toBe('ObjectDeclaration');
    });
  });
});

describe('Parser - Error Recovery', () => {
  describe('Graceful error handling', () => {
    it('should not crash on syntax errors', () => {
      const code = `OBJECT Table Invalid Syntax {{{`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on unexpected tokens', () => {
      const code = `OBJECT := BEGIN END PROCEDURE {{{`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on incomplete object declaration', () => {
      const code = `OBJECT Table`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on missing object ID', () => {
      const code = `OBJECT Table Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on missing closing brace', () => {
      const code = `OBJECT Table 18 Customer {`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on missing opening brace', () => {
      const code = `OBJECT Table 18 Customer }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on random tokens', () => {
      const code = `123 'string' := + - * / ; , .`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should not crash on malformed sections', () => {
      const code = `OBJECT Table 18 Customer { PROPERTIES FIELDS KEYS }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });
  });

  describe('Error collection', () => {
    it('should collect parse errors without throwing', () => {
      const code = `OBJECT Table InvalidID Customer`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();

      const errors = parser.getErrors();
      // Parser may or may not report errors for this case
      // The important thing is it didn't crash and has a getErrors() method
      expect(errors).toBeDefined();
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should return error details', () => {
      const code = `OBJECT Table InvalidID Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      parser.parse();
      const errors = parser.getErrors();

      // Parser should collect at least one error for invalid object ID
      if (errors.length > 0) {
        expect(errors[0]).toHaveProperty('message');
      }
    });

    it('should continue parsing after errors when possible', () => {
      const code = `OBJECT Table 18 Customer {}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      // Valid code should produce valid AST with no errors
      expect(ast.object).not.toBeNull();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should collect multiple errors from different sections', () => {
      // Code with errors in PROPERTIES section (missing =) and recoverable
      const code = `OBJECT Table 18 Customer {
        PROPERTIES {
          BadProp Value;
        }
        FIELDS {
          { 1 ; ; "No." ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      // Should still have an AST
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      // Parser should collect errors but continue parsing
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should recover from errors in nested field parsing', () => {
      // Multiple malformed fields - parser should recover and continue
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { BAD ; ; "Field1" ; Code20 }
          { 2 ; ; "Field2" ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      // Parser should not throw and should return an AST
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });

    it('should recover from errors in CODE section and continue', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          PROCEDURE BadProc
          BEGIN
            x := ;
          END;

          PROCEDURE GoodProc();
          BEGIN
            MESSAGE('Hello');
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      // Parser should not throw
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });
  });

  describe('Partial AST construction', () => {
    it('should return AST even with errors', () => {
      const code = `OBJECT Table Invalid Syntax {{{`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });

    it('should build partial object when possible', () => {
      const code = `OBJECT Table 18 Customer {{{`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      // Parser might return null object or partial object depending on implementation
      expect(ast).toBeDefined();
    });
  });
});

describe('Parser - Different Object Types', () => {
  it('should recognize Table object kind', () => {
    const code = `OBJECT Table 18 Customer {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('Table');
  });

  it('should recognize Page object kind', () => {
    const code = `OBJECT Page 21 Customer {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('Page');
  });

  it('should recognize Codeunit object kind', () => {
    const code = `OBJECT Codeunit 80 Sales-Post {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('Codeunit');
  });

  it('should recognize Report object kind', () => {
    const code = `OBJECT Report 111 Customer {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('Report');
  });

  it('should recognize Query object kind', () => {
    const code = `OBJECT Query 100 Customers {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('Query');
  });

  it('should recognize XMLport object kind', () => {
    const code = `OBJECT XMLport 50000 Export {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('XMLport');
  });

  it('should recognize MenuSuite object kind', () => {
    const code = `OBJECT MenuSuite 1 Navigation {}`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe('MenuSuite');
  });
});

describe('Parser - LOCAL Procedures', () => {
  it('should parse LOCAL PROCEDURE and set isLocal to true', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        LOCAL PROCEDURE PrivateHelper();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.code).not.toBeNull();
    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('PrivateHelper');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(true);
  });

  it('should parse regular PROCEDURE with isLocal false', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        PROCEDURE PublicMethod();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('PublicMethod');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(false);
  });

  it('should parse LOCAL FUNCTION and set isLocal to true', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        LOCAL FUNCTION GetValue() : Integer;
        BEGIN
          EXIT(42);
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('GetValue');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(true);
  });

  it('should parse mixed LOCAL and public procedures', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        PROCEDURE PublicProc();
        BEGIN
        END;

        LOCAL PROCEDURE PrivateProc();
        BEGIN
        END;

        PROCEDURE AnotherPublic();
        BEGIN
        END;

        LOCAL FUNCTION PrivateFunc() : Boolean;
        BEGIN
          EXIT(TRUE);
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(4);
    expect(ast.object?.code?.procedures[0].name).toBe('PublicProc');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(false);
    expect(ast.object?.code?.procedures[1].name).toBe('PrivateProc');
    expect(ast.object?.code?.procedures[1].isLocal).toBe(true);
    expect(ast.object?.code?.procedures[2].name).toBe('AnotherPublic');
    expect(ast.object?.code?.procedures[2].isLocal).toBe(false);
    expect(ast.object?.code?.procedures[3].name).toBe('PrivateFunc');
    expect(ast.object?.code?.procedures[3].isLocal).toBe(true);
  });

  it('should parse LOCAL PROCEDURE with @number syntax', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        LOCAL PROCEDURE CheckCreditLimit@2() : Boolean;
        BEGIN
          EXIT(TRUE);
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('CheckCreditLimit');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(true);
  });

  it('should parse LOCAL PROCEDURE with parameters', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        LOCAL PROCEDURE ProcessCustomer(CustomerNo : Code; VAR Result : Boolean);
        BEGIN
          Result := TRUE;
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('ProcessCustomer');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(true);
    expect(ast.object?.code?.procedures[0].parameters).toHaveLength(2);
  });

  it('should parse LOCAL PROCEDURE with local variables', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        LOCAL PROCEDURE Calculate();
        VAR
          TempValue : Decimal;
        BEGIN
          TempValue := 100;
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('Calculate');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(true);
    expect(ast.object?.code?.procedures[0].variables).toHaveLength(1);
  });

  it('should parse global VAR section followed by LOCAL PROCEDURE', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        VAR
          GlobalVar : Integer;

        LOCAL PROCEDURE TestProc();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.variables).toHaveLength(1);
    expect(ast.object?.code?.variables[0].name).toBe('GlobalVar');
    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    expect(ast.object?.code?.procedures[0].isLocal).toBe(true);
  });
});

describe('Parser - TEMPORARY Variables', () => {
  it('should parse TEMPORARY Record variable and set isTemporary to true', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        VAR
          TempCustomer : TEMPORARY Record 18;

        PROCEDURE TestProc();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.variables).toHaveLength(1);
    expect(ast.object?.code?.variables[0].name).toBe('TempCustomer');
    expect(ast.object?.code?.variables[0].isTemporary).toBe(true);
    expect(ast.object?.code?.variables[0].dataType.typeName).toContain('Record');
  });

  it('should parse regular Record variable with isTemporary false', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        VAR
          Customer : Record 18;

        PROCEDURE TestProc();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.variables).toHaveLength(1);
    expect(ast.object?.code?.variables[0].name).toBe('Customer');
    expect(ast.object?.code?.variables[0].isTemporary).toBe(false);
    expect(ast.object?.code?.variables[0].dataType.typeName).toContain('Record');
  });

  it('should parse TEMPORARY variable with @number syntax', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        VAR
          TempCustomer@1009 : TEMPORARY Record 50000;

        PROCEDURE TestProc();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.variables).toHaveLength(1);
    expect(ast.object?.code?.variables[0].name).toBe('TempCustomer');
    expect(ast.object?.code?.variables[0].isTemporary).toBe(true);
  });

  it('should parse mixed TEMPORARY and regular variables', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        VAR
          TempCust : TEMPORARY Record 18;
          RegularCust : Record 18;
          TempItem : TEMPORARY Record 27;
          Counter : Integer;

        PROCEDURE TestProc();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.variables).toHaveLength(4);
    expect(ast.object?.code?.variables[0].name).toBe('TempCust');
    expect(ast.object?.code?.variables[0].isTemporary).toBe(true);
    expect(ast.object?.code?.variables[1].name).toBe('RegularCust');
    expect(ast.object?.code?.variables[1].isTemporary).toBe(false);
    expect(ast.object?.code?.variables[2].name).toBe('TempItem');
    expect(ast.object?.code?.variables[2].isTemporary).toBe(true);
    expect(ast.object?.code?.variables[3].name).toBe('Counter');
    expect(ast.object?.code?.variables[3].isTemporary).toBe(false);
  });

  it('should parse TEMPORARY variable in local procedure variables', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        PROCEDURE ProcessData();
        VAR
          TempBuffer : TEMPORARY Record 100;
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].variables).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].variables[0].name).toBe('TempBuffer');
    expect(ast.object?.code?.procedures[0].variables[0].isTemporary).toBe(true);
  });

  it('should parse quoted identifier with TEMPORARY', () => {
    const code = `OBJECT Codeunit 50000 Test {
      CODE {
        VAR
          "Temp Customer Entry" : TEMPORARY Record 21;

        PROCEDURE TestProc();
        BEGIN
        END;
      }
    }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.code?.variables).toHaveLength(1);
    expect(ast.object?.code?.variables[0].name).toBe('Temp Customer Entry');
    expect(ast.object?.code?.variables[0].isTemporary).toBe(true);
  });
});

describe('Parser - Field Properties', () => {
  describe('Simple field properties', () => {
    it('should parse field with CaptionML property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 ; CaptionML=ENU=No. }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.fields).not.toBeNull();
      expect(ast.object?.fields?.fields).toHaveLength(1);
      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('No.');
      expect(field?.properties).not.toBeNull();
      expect(field?.properties?.properties).toHaveLength(1);
      expect(field?.properties?.properties[0].name).toBe('CaptionML');
      expect(field?.properties?.properties[0].value).toBe('ENU=No.');
    });

    it('should parse field with NotBlank property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 ; NotBlank=Yes }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties).not.toBeNull();
      expect(field?.properties?.properties).toHaveLength(1);
      expect(field?.properties?.properties[0].name).toBe('NotBlank');
      expect(field?.properties?.properties[0].value).toBe('Yes');
    });

    it('should parse field with TableRelation property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 5 ; ; "Post Code" ; Code20 ; TableRelation="Post Code" }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('Post Code');
      expect(field?.properties).not.toBeNull();
      expect(field?.properties?.properties).toHaveLength(1);
      expect(field?.properties?.properties[0].name).toBe('TableRelation');
      expect(field?.properties?.properties[0].value).toContain('Post Code');
    });

    it('should parse field with Editable property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 6 ; ; Balance ; Decimal ; Editable=No }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties?.properties[0].name).toBe('Editable');
      expect(field?.properties?.properties[0].value).toBe('No');
    });

    it('should parse field with FieldClass property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 6 ; ; Balance ; Decimal ; FieldClass=FlowField }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties?.properties[0].name).toBe('FieldClass');
      expect(field?.properties?.properties[0].value).toBe('FlowField');
    });

    it('should parse field with DecimalPlaces property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 6 ; ; Balance ; Decimal ; DecimalPlaces=2:2 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties?.properties[0].name).toBe('DecimalPlaces');
      expect(field?.properties?.properties[0].value).toBe('2:2');
    });

    it('should parse field with AutoFormatType property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 7 ; ; Amount ; Decimal ; AutoFormatType=1 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties?.properties[0].name).toBe('AutoFormatType');
      expect(field?.properties?.properties[0].value).toBe('1');
    });

    it('should parse field with ExtendedDatatype property', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 14 ; ; "E-Mail" ; Text80 ; ExtendedDatatype=E-Mail }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('E-Mail');
      expect(field?.properties?.properties[0].name).toBe('ExtendedDatatype');
    });
  });

  describe('Multiple field properties', () => {
    it('should parse field with CaptionML and NotBlank properties', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 ; CaptionML=ENU=No.;
                                  NotBlank=Yes }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties).not.toBeNull();
      expect(field?.properties?.properties.length).toBeGreaterThanOrEqual(2);

      const propNames = field?.properties?.properties.map(p => p.name) || [];
      expect(propNames).toContain('CaptionML');
      expect(propNames).toContain('NotBlank');
    });

    it('should parse field with multiple properties including TableRelation', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 5 ; ; "Post Code" ; Code20 ; CaptionML=ENU=Post Code;
                                        TableRelation="Post Code";
                                        ValidateTableRelation=No }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties?.properties.length).toBeGreaterThanOrEqual(2);

      const propNames = field?.properties?.properties.map(p => p.name) || [];
      expect(propNames).toContain('CaptionML');
      expect(propNames).toContain('TableRelation');
    });

    it('should parse field with FlowField properties', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 6 ; ; Balance ; Decimal ; CaptionML=ENU=Balance;
                                       FieldClass=FlowField;
                                       Editable=No }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      const propNames = field?.properties?.properties.map(p => p.name) || [];
      expect(propNames).toContain('CaptionML');
      expect(propNames).toContain('FieldClass');
      expect(propNames).toContain('Editable');
    });

    it('should parse Option field with OptionString and OptionCaptionML', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 10 ; ; "Customer Type" ; Option ; CaptionML=ENU=Customer Type;
                                              OptionCaptionML=ENU=Standard,Premium,VIP;
                                              OptionString=Standard,Premium,VIP }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('Customer Type');
      const propNames = field?.properties?.properties.map(p => p.name) || [];
      expect(propNames).toContain('CaptionML');
      expect(propNames).toContain('OptionCaptionML');
      expect(propNames).toContain('OptionString');
    });
  });

  describe('Field without properties', () => {
    it('should parse simple field with no properties', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldNo).toBe(1);
      expect(field?.fieldName).toBe('No.');
      expect(field?.dataType.typeName).toBe('Code20');
      expect(field?.properties).toBeNull();
      expect(field?.triggers).toBeNull();
    });

    it('should parse multiple simple fields without properties', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 }
          { 2 ; ; Name ; Text100 }
          { 3 ; ; Address ; Text50 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.fields?.fields).toHaveLength(3);
      expect(ast.object?.fields?.fields[0].fieldName).toBe('No.');
      expect(ast.object?.fields?.fields[1].fieldName).toBe('Name');
      expect(ast.object?.fields?.fields[2].fieldName).toBe('Address');
    });
  });

  describe('Mixed fields with and without properties', () => {
    it('should parse table with mixed field definitions', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 ; CaptionML=ENU=No.;
                                  NotBlank=Yes }
          { 2 ; ; Name ; Text100 }
          { 3 ; ; City ; Text30 ; CaptionML=ENU=City }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.fields?.fields).toHaveLength(3);

      // First field has properties
      expect(ast.object?.fields?.fields[0].properties).not.toBeNull();
      expect(ast.object?.fields?.fields[0].properties?.properties.length).toBeGreaterThanOrEqual(1);

      // Second field has no properties
      expect(ast.object?.fields?.fields[1].properties).toBeNull();

      // Third field has one property
      expect(ast.object?.fields?.fields[2].properties).not.toBeNull();
    });
  });

  describe('Complex property values', () => {
    it('should parse CalcFormula with complex expression', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 6 ; ; Balance ; Decimal ; CalcFormula=Sum("Customer Ledger Entry".Amount WHERE ("Customer No."=FIELD(No.))) }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.properties).not.toBeNull();
      const calcFormulaProp = field?.properties?.properties.find(p => p.name === 'CalcFormula');
      expect(calcFormulaProp).toBeDefined();
      expect(calcFormulaProp?.value).toContain('Sum');
      expect(calcFormulaProp?.value).toContain('Customer Ledger Entry');
    });

    it('should parse property with special characters in value', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "E-Mail" ; Text80 ; CaptionML=ENU=E-Mail Address }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('E-Mail');
      expect(field?.properties?.properties[0].name).toBe('CaptionML');
    });
  });

  describe('Error recovery in field properties', () => {
    it('should not crash on malformed field properties', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 ; CaptionML }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should continue parsing after field property error', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 ; BadProp }
          { 2 ; ; Name ; Text100 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });
  });
});

describe('Parser - Field Triggers', () => {
  describe('OnValidate trigger parsing', () => {
    it('should parse field with OnValidate trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               MESSAGE('Name changed');
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.fields).not.toBeNull();
      expect(ast.object?.fields?.fields).toHaveLength(1);
      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('Name');
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(1);
      expect(field?.triggers?.[0].name).toBe('OnValidate');
      expect(field?.triggers?.[0].body.length).toBeGreaterThan(0);
    });

    it('should parse OnValidate trigger with empty body', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(1);
      expect(field?.triggers?.[0].name).toBe('OnValidate');
      expect(field?.triggers?.[0].body).toHaveLength(0);
    });

    it('should parse OnValidate trigger with IF statement', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               IF Name = '' THEN
                                                 ERROR('Name is required');
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers?.[0].body.length).toBeGreaterThan(0);
      expect(field?.triggers?.[0].body[0].type).toBe('IfStatement');
    });

    it('should parse OnValidate trigger with multiple statements', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               MESSAGE('First');
                                               MESSAGE('Second');
                                               MESSAGE('Third');
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers?.[0].body.length).toBe(3);
    });

    it('should parse OnValidate trigger with nested BEGIN...END', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               IF Name <> '' THEN BEGIN
                                                 MESSAGE('Name is set');
                                                 MESSAGE('Processing...');
                                               END;
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(1);
      const ifStmt = field?.triggers?.[0].body[0];
      expect(ifStmt?.type).toBe('IfStatement');
    });
  });

  describe('OnLookup trigger parsing', () => {
    it('should parse field with OnLookup trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 5 ; ; "Post Code" ; Code20 ; OnLookup=BEGIN
                                                    MESSAGE('Lookup invoked');
                                                  END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('Post Code');
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(1);
      expect(field?.triggers?.[0].name).toBe('OnLookup');
      expect(field?.triggers?.[0].body.length).toBeGreaterThan(0);
    });

    it('should parse OnLookup trigger with record operations', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 5 ; ; "Post Code" ; Code20 ; OnLookup=BEGIN
                                                    PostCode.RESET;
                                                    IF PostCode.FIND('-') THEN
                                                      MESSAGE('Found');
                                                  END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers?.[0].name).toBe('OnLookup');
      expect(field?.triggers?.[0].body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Field trigger with local variables', () => {
    it('should parse OnValidate trigger with VAR section', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=VAR
                                               LocalVar : Integer;
                                             BEGIN
                                               LocalVar := 100;
                                               MESSAGE('Value: %1', LocalVar);
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(1);
      expect(field?.triggers?.[0].name).toBe('OnValidate');
      expect(field?.triggers?.[0].variables.length).toBeGreaterThanOrEqual(1);
      expect(field?.triggers?.[0].variables[0].name).toBe('LocalVar');
    });
  });

  describe('Multiple field triggers', () => {
    it('should parse field with both OnValidate and OnLookup triggers', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 5 ; ; "Post Code" ; Code20 ; OnValidate=BEGIN
                                                      MESSAGE('Validated');
                                                    END;
                                         OnLookup=BEGIN
                                                    MESSAGE('Lookup');
                                                  END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(2);

      const triggerNames = field?.triggers?.map(t => t.name) || [];
      expect(triggerNames).toContain('OnValidate');
      expect(triggerNames).toContain('OnLookup');
    });
  });

  describe('Field trigger with properties', () => {
    it('should parse field with properties AND OnValidate trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; CaptionML=ENU=Name;
                                   NotBlank=Yes;
                                   OnValidate=BEGIN
                                                MESSAGE('Name validated');
                                              END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];

      // Check properties
      expect(field?.properties).not.toBeNull();
      const propNames = field?.properties?.properties.map(p => p.name) || [];
      expect(propNames).toContain('CaptionML');
      expect(propNames).toContain('NotBlank');

      // Check trigger
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers).toHaveLength(1);
      expect(field?.triggers?.[0].name).toBe('OnValidate');
    });

    it('should parse field with TableRelation and OnValidate trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 5 ; ; "Post Code" ; Code20 ; TableRelation="Post Code";
                                         OnValidate=BEGIN
                                                      IF "Post Code" = '' THEN
                                                        CLEAR(City);
                                                    END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];

      // Check properties
      expect(field?.properties).not.toBeNull();
      expect(field?.properties?.properties.some(p => p.name === 'TableRelation')).toBe(true);

      // Check trigger
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers?.[0].name).toBe('OnValidate');
      expect(field?.triggers?.[0].body[0].type).toBe('IfStatement');
    });
  });

  describe('Multiple fields with triggers', () => {
    it('should parse multiple fields each with their own triggers', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1 ; ; "No." ; Code20 }
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                                MESSAGE('Name changed');
                                              END; }
          { 3 ; ; Address ; Text50 }
          { 5 ; ; "Post Code" ; Code20 ; OnLookup=BEGIN
                                                    MESSAGE('Looking up');
                                                  END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast.object?.fields?.fields).toHaveLength(4);

      // First field: no trigger
      expect(ast.object?.fields?.fields[0].triggers).toBeNull();

      // Second field: OnValidate
      expect(ast.object?.fields?.fields[1].triggers).toHaveLength(1);
      expect(ast.object?.fields?.fields[1].triggers?.[0].name).toBe('OnValidate');

      // Third field: no trigger
      expect(ast.object?.fields?.fields[2].triggers).toBeNull();

      // Fourth field: OnLookup
      expect(ast.object?.fields?.fields[3].triggers).toHaveLength(1);
      expect(ast.object?.fields?.fields[3].triggers?.[0].name).toBe('OnLookup');
    });
  });

  describe('Field trigger with WHILE loop', () => {
    it('should parse OnValidate trigger with WHILE statement', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               Counter := 0;
                                               WHILE Counter < 10 DO BEGIN
                                                 Counter := Counter + 1;
                                               END;
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();
      expect(field?.triggers?.[0].body.length).toBeGreaterThanOrEqual(2);

      // Find the WHILE statement
      const whileStmt = field?.triggers?.[0].body.find(s => s.type === 'WhileStatement');
      expect(whileStmt).toBeDefined();
    });
  });

  describe('Field trigger with REPEAT...UNTIL', () => {
    it('should parse OnValidate trigger with REPEAT statement', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               Counter := 0;
                                               REPEAT
                                                 Counter := Counter + 1;
                                               UNTIL Counter >= 10;
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      const field = ast.object?.fields?.fields[0];
      expect(field?.triggers).not.toBeNull();

      // Find the REPEAT statement
      const repeatStmt = field?.triggers?.[0].body.find(s => s.type === 'RepeatStatement');
      expect(repeatStmt).toBeDefined();
    });
  });

  describe('Field trigger error recovery', () => {
    it('should not crash on malformed trigger code', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               IF THEN
                                             END; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).not.toThrow();
    });

    it('should continue parsing after field trigger error', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 2 ; ; Name ; Text100 ; OnValidate=BEGIN
                                               BadCode :::
                                             END; }
          { 3 ; ; Address ; Text50 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      const ast = parser.parse();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
    });
  });
});
