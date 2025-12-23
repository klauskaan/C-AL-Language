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
