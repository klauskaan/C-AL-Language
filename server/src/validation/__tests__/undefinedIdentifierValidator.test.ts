/**
 * Undefined Identifier Validator Tests
 *
 * Tests for semantic validator that detects undefined identifiers (variables, functions).
 *
 * The validator detects:
 * - References to undefined local variables
 * - References to undefined parameters
 * - Calls to undefined functions/procedures
 *
 * The validator suppresses:
 * - Known symbols (variables, parameters, global variables, procedures)
 * - Builtin functions (MESSAGE, ERROR, FORMAT, ROUND, TODAY, etc.)
 * - Builtin record methods (FIND, GET, INSERT, MODIFY, SETRANGE, etc.)
 * - Identifiers inside WITH statements (could be record fields)
 * - Identifiers in declaration contexts (left side of :=, parameter names, etc.)
 * - Property access in member expressions (only the object is validated)
 *
 * Diagnostic:
 * - Message: "Undefined identifier: '{name}'"
 * - Severity: Warning
 * - Source: 'cal'
 * - Range: The identifier's token position
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { UndefinedIdentifierValidator } from '../undefinedIdentifierValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run undefined identifier validation
 */
function validateUndefinedIdentifiers(code: string): Diagnostic[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);

  const builtins = new BuiltinRegistry();

  const context: ValidationContext = {
    ast,
    symbolTable,
    builtins,
    documentUri: 'file:///test.cal'
  };

  const validator = new UndefinedIdentifierValidator();
  return validator.validate(context);
}

describe('UndefinedIdentifierValidator - Basic Detection', () => {
  describe('Should produce diagnostic (undefined identifiers)', () => {
    it('should detect undefined variable in expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := UndefinedVar + 5;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedVar'");
      expect(undefinedError!.severity).toBe(DiagnosticSeverity.Warning);
      expect(undefinedError!.source).toBe('cal');
    });

    it('should detect undefined function call', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            UndefinedFunction();
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedFunction'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedFunction'");
      expect(undefinedError!.severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should detect undefined variable in IF condition', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            IF UndefinedCondition THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedCondition'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedCondition'");
    });

    it('should detect undefined variable in WHILE condition', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            i : Integer;
          BEGIN
            WHILE UndefinedCondition DO
              i := i + 1;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedCondition'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedCondition'");
    });

    it('should detect undefined variable in assignment', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            result : Integer;
          BEGIN
            result := UndefinedSource;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedSource'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedSource'");
    });

    it('should detect multiple undefined identifiers', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            IF FirstUndefined THEN
              SecondUndefined();
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const firstError = diagnostics.find(d => d.message.includes('FirstUndefined'));
      const secondError = diagnostics.find(d => d.message.includes('SecondUndefined'));

      expect(firstError).toBeDefined();
      expect(secondError).toBeDefined();
      expect(firstError!.message).toBe("Undefined identifier: 'FirstUndefined'");
      expect(secondError!.message).toBe("Undefined identifier: 'SecondUndefined'");
    });
  });
});

describe('UndefinedIdentifierValidator - Known Symbols Suppressed', () => {
  describe('Should NOT produce diagnostic (known symbols)', () => {
    it('should not flag local variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            myVar : Integer;
          BEGIN
            myVar := 42;
            MESSAGE(FORMAT(myVar));
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const myVarError = diagnostics.find(d => d.message.includes('myVar'));
      expect(myVarError).toBeUndefined();
    });

    it('should not flag procedure parameters', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc(param1 : Integer; VAR param2 : Text);
          BEGIN
            param2 := FORMAT(param1);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const param1Error = diagnostics.find(d => d.message.includes('param1'));
      const param2Error = diagnostics.find(d => d.message.includes('param2'));
      expect(param1Error).toBeUndefined();
      expect(param2Error).toBeUndefined();
    });

    it('should not flag global variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            GlobalVar : Integer;

          PROCEDURE TestProc();
          BEGIN
            GlobalVar := 42;
            MESSAGE(FORMAT(GlobalVar));
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const globalError = diagnostics.find(d => d.message.includes('GlobalVar'));
      expect(globalError).toBeUndefined();
    });

    it('should not flag defined procedures', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            HelperProc();
          END;

          PROCEDURE HelperProc();
          BEGIN
            MESSAGE('Helper');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const helperError = diagnostics.find(d => d.message.includes('HelperProc'));
      expect(helperError).toBeUndefined();
    });

    it('should not flag record variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.INIT;
            Customer.INSERT;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      expect(customerError).toBeUndefined();
    });

    it('should not flag TEMPORARY record variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TEMPORARY TempCustomer : Record 18;
          BEGIN
            TempCustomer.INIT;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const tempError = diagnostics.find(d => d.message.includes('TempCustomer'));
      expect(tempError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - Builtin Functions Suppressed', () => {
  describe('Should NOT produce diagnostic (builtin functions)', () => {
    it('should not flag MESSAGE builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            MESSAGE('Hello World');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const messageError = diagnostics.find(d => d.message.includes('MESSAGE'));
      expect(messageError).toBeUndefined();
    });

    it('should not flag ERROR builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            ERROR('An error occurred');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const errorError = diagnostics.find(d => d.message.includes('ERROR'));
      expect(errorError).toBeUndefined();
    });

    it('should not flag FORMAT builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            s : Text;
          BEGIN
            x := 42;
            s := FORMAT(x);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const formatError = diagnostics.find(d => d.message.includes('FORMAT'));
      expect(formatError).toBeUndefined();
    });

    it('should not flag ROUND builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Decimal;
            rounded : Decimal;
          BEGIN
            x := 3.14159;
            rounded := ROUND(x, 0.01);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const roundError = diagnostics.find(d => d.message.includes('ROUND'));
      expect(roundError).toBeUndefined();
    });

    it('should not flag TODAY builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            d : Date;
          BEGIN
            d := TODAY;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const todayError = diagnostics.find(d => d.message.includes('TODAY'));
      expect(todayError).toBeUndefined();
    });

    it('should not flag USERID builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            user : Code[50];
          BEGIN
            user := USERID;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const useridError = diagnostics.find(d => d.message.includes('USERID'));
      expect(useridError).toBeUndefined();
    });

    it('should not flag CONFIRM builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            IF CONFIRM('Continue?') THEN
              MESSAGE('OK');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const confirmError = diagnostics.find(d => d.message.includes('CONFIRM'));
      expect(confirmError).toBeUndefined();
    });

    it('should not flag string functions (STRLEN, STRPOS, COPYSTR)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            s : Text;
            len : Integer;
            pos : Integer;
          BEGIN
            len := STRLEN(s);
            pos := STRPOS(s, 'test');
            s := COPYSTR(s, 1, 10);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const strlenError = diagnostics.find(d => d.message.includes('STRLEN'));
      const strposError = diagnostics.find(d => d.message.includes('STRPOS'));
      const copystrError = diagnostics.find(d => d.message.includes('COPYSTR'));

      expect(strlenError).toBeUndefined();
      expect(strposError).toBeUndefined();
      expect(copystrError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - Builtin Record Methods Suppressed', () => {
  describe('Should NOT produce diagnostic (record methods)', () => {
    it('should not flag FIND method', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.FIND('-');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const findError = diagnostics.find(d => d.message.includes('FIND'));
      expect(findError).toBeUndefined();
    });

    it('should not flag GET method', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.GET('10000');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const getError = diagnostics.find(d => d.message.includes('GET'));
      expect(getError).toBeUndefined();
    });

    it('should not flag INSERT, MODIFY, DELETE methods', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.INSERT;
            Customer.MODIFY;
            Customer.DELETE;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const insertError = diagnostics.find(d => d.message.includes('INSERT'));
      const modifyError = diagnostics.find(d => d.message.includes('MODIFY'));
      const deleteError = diagnostics.find(d => d.message.includes('DELETE'));

      expect(insertError).toBeUndefined();
      expect(modifyError).toBeUndefined();
      expect(deleteError).toBeUndefined();
    });

    it('should not flag SETRANGE and SETFILTER methods', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.SETRANGE("No.", '10000', '20000');
            Customer.SETFILTER(Name, '@*Smith*');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const setrangeError = diagnostics.find(d => d.message.includes('SETRANGE'));
      const setfilterError = diagnostics.find(d => d.message.includes('SETFILTER'));

      expect(setrangeError).toBeUndefined();
      expect(setfilterError).toBeUndefined();
    });

    it('should not flag FINDSET and NEXT methods', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            IF Customer.FINDSET THEN
              REPEAT
                MESSAGE(Customer."No.");
              UNTIL Customer.NEXT = 0;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const findsetError = diagnostics.find(d => d.message.includes('FINDSET'));
      const nextError = diagnostics.find(d => d.message.includes('NEXT'));

      expect(findsetError).toBeUndefined();
      expect(nextError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - WITH Statement Suppression', () => {
  describe('Should NOT produce diagnostic inside WITH blocks', () => {
    it('should not flag unknown identifiers inside WITH body', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            WITH Customer DO BEGIN
              UnknownField := 'value';
              MESSAGE(AnotherUnknownField);
            END;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Inside WITH, unknown identifiers are suppressed (could be record fields)
      const unknownError = diagnostics.find(d => d.message.includes('UnknownField'));
      const anotherError = diagnostics.find(d => d.message.includes('AnotherUnknownField'));

      expect(unknownError).toBeUndefined();
      expect(anotherError).toBeUndefined();
    });

    it('should validate WITH record expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            WITH UndefinedRecord DO BEGIN
              MESSAGE('test');
            END;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // The WITH record itself should be validated
      const undefinedRecordError = diagnostics.find(d => d.message.includes('UndefinedRecord'));
      expect(undefinedRecordError).toBeDefined();
      expect(undefinedRecordError!.message).toBe("Undefined identifier: 'UndefinedRecord'");
    });

    it('should not flag identifiers in nested WITH blocks', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            SalesHeader : Record 36;
            SalesLine : Record 37;
          BEGIN
            WITH SalesHeader DO
              WITH SalesLine DO BEGIN
                UnknownField1 := 'value';
                MESSAGE(UnknownField2);
              END;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Both unknowns are suppressed (inside WITH)
      const unknown1Error = diagnostics.find(d => d.message.includes('UnknownField1'));
      const unknown2Error = diagnostics.find(d => d.message.includes('UnknownField2'));

      expect(unknown1Error).toBeUndefined();
      expect(unknown2Error).toBeUndefined();
    });

    it('should flag undefined identifiers outside WITH block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            OutsideUndefined := 'before';
            WITH Customer DO BEGIN
              InsideField := 'value';
            END;
            AnotherOutsideUndefined := 'after';
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Outside WITH: should be flagged
      const outsideError = diagnostics.find(d => d.message.includes('OutsideUndefined'));
      const anotherOutsideError = diagnostics.find(d => d.message.includes('AnotherOutsideUndefined'));

      expect(outsideError).toBeDefined();
      expect(anotherOutsideError).toBeDefined();

      // Inside WITH: should NOT be flagged
      const insideError = diagnostics.find(d => d.message.includes('InsideField'));
      expect(insideError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - MemberExpression Handling', () => {
  describe('Should validate object but NOT property', () => {
    it('should flag undefined object in member expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            MESSAGE(UndefinedObject.SomeProperty);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const objectError = diagnostics.find(d => d.message.includes('UndefinedObject'));
      expect(objectError).toBeDefined();
      expect(objectError!.message).toBe("Undefined identifier: 'UndefinedObject'");
    });

    it('should not flag property in member expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            MESSAGE(Customer."No.");
            MESSAGE(Customer.Name);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Customer is defined, properties should not be validated
      const noError = diagnostics.find(d => d.message.includes('"No."'));
      const nameError = diagnostics.find(d => d.message.includes('Name'));

      expect(noError).toBeUndefined();
      expect(nameError).toBeUndefined();
    });

    it('should not flag nested member expressions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            SalesHeader : Record 36;
          BEGIN
            MESSAGE(SalesHeader."Document Type");
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Only the leftmost object is validated
      const docTypeError = diagnostics.find(d => d.message.includes('"Document Type"'));
      expect(docTypeError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - CallExpression Handling', () => {
  describe('Should validate callee and arguments', () => {
    it('should flag undefined function in call expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := UndefinedFunc(42);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const funcError = diagnostics.find(d => d.message.includes('UndefinedFunc'));
      expect(funcError).toBeDefined();
      expect(funcError!.message).toBe("Undefined identifier: 'UndefinedFunc'");
    });

    it('should flag undefined arguments in call expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            MESSAGE(FORMAT(UndefinedArg));
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const argError = diagnostics.find(d => d.message.includes('UndefinedArg'));
      expect(argError).toBeDefined();
      expect(argError!.message).toBe("Undefined identifier: 'UndefinedArg'");
    });

    it('should not flag method calls on defined records', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.FIND('-');
            Customer.INSERT(TRUE);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Customer is defined, FIND and INSERT are builtins
      expect(diagnostics).toHaveLength(0);
    });

    it('should validate multiple arguments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            MESSAGE('%1 %2', x, UndefinedVar);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedVar'");

      // x should not be flagged
      const xError = diagnostics.find(d => d.message.includes("'x'"));
      expect(xError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - Declaration Contexts NOT Flagged', () => {
  describe('Should NOT produce diagnostic in declaration contexts', () => {
    it('should not flag identifiers in variable declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            myVar : Integer;
            myText : Text;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Variable declarations themselves should not be flagged
      expect(diagnostics).toHaveLength(0);
    });

    it('should not flag parameter names in procedure declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc(param1 : Integer; VAR param2 : Text);
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Parameter names in declaration should not be flagged
      expect(diagnostics).toHaveLength(0);
    });

    it('should not flag procedure names in procedure declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
          END;

          PROCEDURE AnotherProc();
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Procedure names should not be flagged
      expect(diagnostics).toHaveLength(0);
    });
  });
});

describe('UndefinedIdentifierValidator - Case Insensitivity', () => {
  describe('Should handle case-insensitive matching', () => {
    it('should not flag variable with different case', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            myVar : Integer;
          BEGIN
            MYVAR := 42;
            MESSAGE(FORMAT(MyVar));
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Case-insensitive: MYVAR and MyVar should match myVar
      const myvarError = diagnostics.find(d => d.message.includes('MYVAR'));
      const MyVarError = diagnostics.find(d => d.message.includes('MyVar'));

      expect(myvarError).toBeUndefined();
      expect(MyVarError).toBeUndefined();
    });

    it('should not flag builtin functions with different case', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            message('lowercase');
            Message('Mixed case');
            MESSAGE('UPPERCASE');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // All case variations of MESSAGE should be recognized
      const messageErrors = diagnostics.filter(d =>
        d.message.toLowerCase().includes('message')
      );

      expect(messageErrors).toHaveLength(0);
    });

    it('should not flag record methods with different case', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.find('-');
            Customer.Find('+');
            Customer.FIND('=');
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // All case variations of FIND should be recognized
      const findErrors = diagnostics.filter(d =>
        d.message.toLowerCase().includes('find')
      );

      expect(findErrors).toHaveLength(0);
    });
  });
});

describe('UndefinedIdentifierValidator - Diagnostic Properties', () => {
  describe('Diagnostic message format and properties', () => {
    it('should have correct diagnostic severity', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            UndefinedVar := 42;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should have correct diagnostic source', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            UndefinedVar := 42;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.source).toBe('cal');
    });

    it('should have correct message format', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            MyUndefinedVar := 42;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('MyUndefinedVar'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.message).toBe("Undefined identifier: 'MyUndefinedVar'");
    });

    it('should have valid range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            UndefinedVar := 42;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
      expect(undefinedError).toBeDefined();
      expect(undefinedError!.range).toBeDefined();
      expect(undefinedError!.range.start.line).toBeGreaterThanOrEqual(0);
      expect(undefinedError!.range.start.character).toBeGreaterThanOrEqual(0);
      expect(undefinedError!.range.end.character).toBeGreaterThan(undefinedError!.range.start.character);
    });
  });
});

describe('UndefinedIdentifierValidator - Edge Cases', () => {
  describe('Edge case handling', () => {
    it('should handle code with no procedures gracefully', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1   ;   ;"No."           ;Code20        }
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // No code section, no diagnostics expected
      expect(diagnostics).toHaveLength(0);
    });

    it('should handle empty code section', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      expect(diagnostics).toHaveLength(0);
    });

    it('should handle empty procedure body', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      expect(diagnostics).toHaveLength(0);
    });

    it('should handle parse errors gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            UndefinedVar :=
          END;
        }
      }`;

      // Should not throw even if there are parse errors
      expect(() => validateUndefinedIdentifiers(code)).not.toThrow();
    });

    it('should handle quoted identifiers', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            "My Variable" : Integer;
          BEGIN
            "My Variable" := 42;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Quoted identifier should not be flagged as undefined
      const quotedError = diagnostics.find(d => d.message.includes('My Variable'));
      expect(quotedError).toBeUndefined();
    });

    it('should handle complex expressions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            y : Integer;
          BEGIN
            x := (y + 5) * 2 - UndefinedVar;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Should only flag UndefinedVar
      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
      expect(undefinedError).toBeDefined();

      // x and y should not be flagged
      const xError = diagnostics.find(d => d.message.includes("'x'"));
      const yError = diagnostics.find(d => d.message.includes("'y'"));
      expect(xError).toBeUndefined();
      expect(yError).toBeUndefined();
    });

    it('should handle array access expressions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyArray : ARRAY[10] OF Integer;
            i : Integer;
          BEGIN
            MyArray[i] := 42;
            MESSAGE(FORMAT(MyArray[UndefinedIndex]));
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Should flag UndefinedIndex
      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedIndex'));
      expect(undefinedError).toBeDefined();

      // MyArray and i should not be flagged
      const arrayError = diagnostics.find(d => d.message.includes('MyArray'));
      const iError = diagnostics.find(d => d.message.includes("'i'"));
      expect(arrayError).toBeUndefined();
      expect(iError).toBeUndefined();
    });

    it('should handle CASE expressions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            CASE x OF
              1: MESSAGE('One');
              2: UndefinedProc();
              ELSE MESSAGE('Other');
            END;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedProc'));
      expect(undefinedError).toBeDefined();
    });

    it('should handle FOR loops', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            i : Integer;
          BEGIN
            FOR i := 1 TO UndefinedMax DO
              MESSAGE(FORMAT(i));
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const undefinedError = diagnostics.find(d => d.message.includes('UndefinedMax'));
      expect(undefinedError).toBeDefined();

      // i should not be flagged
      const iError = diagnostics.find(d => d.message.includes("'i'"));
      expect(iError).toBeUndefined();
    });
  });
});

describe('UndefinedIdentifierValidator - Real-World Patterns', () => {
  describe('Common C/AL patterns', () => {
    it('should handle record looping pattern', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessCustomers();
          VAR
            Customer : Record 18;
          BEGIN
            IF Customer.FINDSET THEN
              REPEAT
                MESSAGE(Customer."No.");
              UNTIL Customer.NEXT = 0;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // No undefined identifiers in this common pattern
      expect(diagnostics).toHaveLength(0);
    });

    it('should handle WITH record pattern', () => {
      const code = `OBJECT Codeunit 80 "Sales-Post" {
        CODE {
          PROCEDURE PostHeader(VAR SalesHeader : Record 36);
          BEGIN
            WITH SalesHeader DO BEGIN
              TESTFIELD("Document Type");
              TESTFIELD("No.");
              Status := Status::Released;
            END;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // TESTFIELD is builtin, fields are suppressed inside WITH
      expect(diagnostics).toHaveLength(0);
    });

    it('should handle error checking pattern', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE CheckValue(Value : Decimal);
          BEGIN
            IF Value < 0 THEN
              ERROR('Value must be positive');

            IF NOT CONFIRM('Continue with %1?', Value) THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // ERROR, CONFIRM, EXIT are builtins, Value is parameter
      expect(diagnostics).toHaveLength(0);
    });

    it('should not flag method calls on codeunit variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            SalesPost : Codeunit 80;
          BEGIN
            SalesPost.UndefinedMethod();
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // Methods on Codeunit variables cannot be validated
      // We don't know what methods exist on external codeunits
      expect(diagnostics).toHaveLength(0);
      // Methods on Codeunit variables cannot be validated
      // We don't know what methods exist on external codeunits
      expect(diagnostics).toHaveLength(0);
      // Methods on Codeunit variables cannot be validated
      // We don't know what methods exist on external codeunits
      expect(diagnostics).toHaveLength(0);
    });

    it('should handle global variable access', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            GlobalCounter : Integer;

          PROCEDURE IncrementCounter();
          BEGIN
            GlobalCounter := GlobalCounter + 1;
          END;

          PROCEDURE GetCounter() : Integer;
          BEGIN
            EXIT(GlobalCounter);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      // GlobalCounter is a global variable, should not be flagged
      const globalError = diagnostics.find(d => d.message.includes('GlobalCounter'));
      expect(globalError).toBeUndefined();
    });
  });
});
