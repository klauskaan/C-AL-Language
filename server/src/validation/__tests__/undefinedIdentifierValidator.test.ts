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
function validateUndefinedIdentifiers(
  code: string,
  tableRegistry?: ReadonlyMap<number, string>
): Diagnostic[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast, tableRegistry);

  const builtins = new BuiltinRegistry();

  const context: ValidationContext = {
    ast,
    symbolTable,
    builtins,
    documentUri: 'file:///test.cal',
    hasTableRegistry: symbolTable.hadTableRegistry
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
      expect(undefinedError!.code).toBe('undefined-identifier');
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

    it('should not flag BINDSUBSCRIPTION builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            EventSubscriberCodeunit : Codeunit 50000;
            Success : Boolean;
          BEGIN
            Success := BINDSUBSCRIPTION(EventSubscriberCodeunit);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const bindError = diagnostics.find(d => d.message.includes('BINDSUBSCRIPTION'));
      expect(bindError).toBeUndefined();
    });

    it('should not flag UNBINDSUBSCRIPTION builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            EventSubscriberCodeunit : Codeunit 50000;
            Success : Boolean;
          BEGIN
            Success := UNBINDSUBSCRIPTION(EventSubscriberCodeunit);
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const unbindError = diagnostics.find(d => d.message.includes('UNBINDSUBSCRIPTION'));
      expect(unbindError).toBeUndefined();
    });

    it('should not flag SELECTLATESTVERSION builtin', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            SELECTLATESTVERSION();
          END;
        }
      }`;

      const diagnostics = validateUndefinedIdentifiers(code);

      const selectError = diagnostics.find(d => d.message.includes('SELECTLATESTVERSION'));
      expect(selectError).toBeUndefined();
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

describe('UndefinedIdentifierValidator - field-reference arguments in record method calls', () => {
  it('should not flag bare field name in TESTFIELD', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.TESTFIELD(Date);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const dateError = diagnostics.find(d => d.message.includes("'Date'"));
    expect(dateError).toBeUndefined();
  });

  it('should not flag first arg (field) in SETRANGE but still flag undefined value args', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.SETRANGE("Employee No.", UndefinedFrom, UndefinedTo);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const fieldError = diagnostics.find(d => d.message.includes('"Employee No."') || d.message.includes('Employee No.'));
    expect(fieldError).toBeUndefined();

    const fromError = diagnostics.find(d => d.message.includes('UndefinedFrom'));
    expect(fromError).toBeDefined();
    expect(fromError!.message).toBe("Undefined identifier: 'UndefinedFrom'");

    const toError = diagnostics.find(d => d.message.includes('UndefinedTo'));
    expect(toError).toBeDefined();
    expect(toError!.message).toBe("Undefined identifier: 'UndefinedTo'");
  });

  it('should not flag field or defined value args in SETRANGE', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
          x : Code[20];
          y : Code[20];
        BEGIN
          Rec.SETRANGE(Status, x, y);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const statusError = diagnostics.find(d => d.message.includes("'Status'"));
    expect(statusError).toBeUndefined();

    const xError = diagnostics.find(d => d.message.includes("'x'"));
    expect(xError).toBeUndefined();

    const yError = diagnostics.find(d => d.message.includes("'y'"));
    expect(yError).toBeUndefined();
  });

  it('should not flag first arg (field) in SETFILTER but still flag undefined other args', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.SETFILTER(Name, '@*%1*', UndefinedVar);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const nameError = diagnostics.find(d => d.message.includes("'Name'"));
    expect(nameError).toBeUndefined();

    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedVar'");
  });

  it('should not flag any field args in CALCFIELDS', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.CALCFIELDS(Balance, Amount, Quantity);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const balanceError = diagnostics.find(d => d.message.includes("'Balance'"));
    expect(balanceError).toBeUndefined();

    const amountError = diagnostics.find(d => d.message.includes("'Amount'"));
    expect(amountError).toBeUndefined();

    const quantityError = diagnostics.find(d => d.message.includes("'Quantity'"));
    expect(quantityError).toBeUndefined();
  });

  it('should not flag any field args in CALCSUMS', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.CALCSUMS(Amount, Quantity, Balance);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const amountError = diagnostics.find(d => d.message.includes("'Amount'"));
    expect(amountError).toBeUndefined();

    const quantityError = diagnostics.find(d => d.message.includes("'Quantity'"));
    expect(quantityError).toBeUndefined();

    const balanceError = diagnostics.find(d => d.message.includes("'Balance'"));
    expect(balanceError).toBeUndefined();
  });

  it('should not flag any field args in SETCURRENTKEY', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.SETCURRENTKEY(PostingDate, DocumentNo, Amount);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const postingDateError = diagnostics.find(d => d.message.includes("'PostingDate'"));
    expect(postingDateError).toBeUndefined();

    const docNoError = diagnostics.find(d => d.message.includes("'DocumentNo'"));
    expect(docNoError).toBeUndefined();

    const amountError = diagnostics.find(d => d.message.includes("'Amount'"));
    expect(amountError).toBeUndefined();
  });

  it('should not flag first arg (field) in VALIDATE but still flag undefined second arg', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.VALIDATE(Status, UndefinedValue);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const statusError = diagnostics.find(d => d.message.includes("'Status'"));
    expect(statusError).toBeUndefined();

    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedValue'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedValue'");
  });

  it('should not flag first arg (field) in FIELDNO, FIELDCAPTION, FIELDERROR', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.FIELDNO(Name);
          Rec.FIELDCAPTION("No.");
          Rec.FIELDERROR(Status, 'must be valid');
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const nameError = diagnostics.find(d => d.message.includes("'Name'"));
    expect(nameError).toBeUndefined();

    const noError = diagnostics.find(d => d.message.includes('"No."') || d.message.includes("No."));
    expect(noError).toBeUndefined();

    const statusError = diagnostics.find(d => d.message.includes("'Status'"));
    expect(statusError).toBeUndefined();
  });

  it('should not flag first arg (field) in GETRANGEMIN, GETRANGEMAX, GETFILTER', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.GETRANGEMIN("No.");
          Rec.GETRANGEMAX("Posting Date");
          Rec.GETFILTER(Status);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const noError = diagnostics.find(d => d.message.includes('"No."') || d.message.includes("'No.'"));
    expect(noError).toBeUndefined();

    const postingDateError = diagnostics.find(d => d.message.includes('Posting Date') || d.message.includes('"Posting Date"'));
    expect(postingDateError).toBeUndefined();

    const statusError = diagnostics.find(d => d.message.includes("'Status'"));
    expect(statusError).toBeUndefined();
  });

  it('should not flag first arg (field) in MODIFYALL but still flag undefined second arg', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.MODIFYALL(Status, UndefinedNewValue);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const statusError = diagnostics.find(d => d.message.includes("'Status'"));
    expect(statusError).toBeUndefined();

    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedNewValue'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedNewValue'");
  });

  it('should suppress field arg in SETRANGE regardless of method name casing', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.setrange(Name, 'A', 'Z');
          Rec.Setrange(Name, 'A', 'Z');
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const nameError = diagnostics.find(d => d.message.includes("'Name'"));
    expect(nameError).toBeUndefined();
  });

  it('should still validate all args in non-field-reference record methods like FIND', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.FIND(UndefinedArg);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedArg'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedArg'");
  });

  it('should validate all args in non-member-expression call expressions', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          x : Integer;
        BEGIN
          SomeFunc(x, UndefinedArg);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const someFuncError = diagnostics.find(d => d.message.includes('SomeFunc'));
    expect(someFuncError).toBeDefined();
    expect(someFuncError!.message).toBe("Undefined identifier: 'SomeFunc'");

    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedArg'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedArg'");
  });

  it('should not flag quoted field name in TESTFIELD', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.TESTFIELD("Document Type");
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const docTypeError = diagnostics.find(d => d.message.includes('Document Type') || d.message.includes('"Document Type"'));
    expect(docTypeError).toBeUndefined();
  });

  it('should not flag first arg (field) in FIELDACTIVE', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
          IsActive : Boolean;
        BEGIN
          IsActive := Rec.FIELDACTIVE(Status);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const statusError = diagnostics.find(d => d.message.includes("'Status'"));
    expect(statusError).toBeUndefined();
  });

  it('should not flag quoted field name in FIELDACTIVE', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
          IsActive : Boolean;
        BEGIN
          IsActive := Rec.FIELDACTIVE("Posting Date");
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const postingDateError = diagnostics.find(d => d.message.includes('Posting Date') || d.message.includes('"Posting Date"'));
    expect(postingDateError).toBeUndefined();
  });

  it('should not flag first arg (field) in FIELDNAME', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
          FieldName : Text;
        BEGIN
          FieldName := Rec.FIELDNAME("Primary Key");
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const primaryKeyError = diagnostics.find(d => d.message.includes('Primary Key') || d.message.includes('"Primary Key"'));
    expect(primaryKeyError).toBeUndefined();
  });

  it('should not flag field arguments in COPYFILTER', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE TestProc();
        VAR
          Rec : Record 18;
        BEGIN
          Rec.COPYFILTER(FieldA, FieldB);
        END;
      }
    }`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const fieldAError = diagnostics.find(d => d.message.includes("'FieldA'"));
    expect(fieldAError).toBeUndefined();

    const fieldBError = diagnostics.find(d => d.message.includes("'FieldB'"));
    expect(fieldBError).toBeUndefined();
  });
});

describe('UndefinedIdentifierValidator - Property Trigger Scoping', () => {
  it('should not flag property trigger local variable as undefined within the trigger body', () => {
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=VAR
            myVar@1000 : Integer;
          BEGIN
            myVar := 5;
          END;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const myVarError = diagnostics.find(d => d.message.includes('myVar'));
    expect(myVarError).toBeUndefined();
  });

  it('should flag an unknown identifier used in a property trigger body', () => {
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=BEGIN
            UndefinedVar := 5;
          END;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedVar'");
  });

  it('should not let property trigger local variable pollute the global scope visible from CODE section', () => {
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=VAR
            localVar@1000 : Integer;
          BEGIN
            localVar := 1;
          END;
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      localVar := 2;
    END;

    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    // localVar inside OnRun body should not be flagged (it is declared there)
    // localVar inside TestProc body should be flagged (out of scope)
    const localVarError = diagnostics.find(d => d.message.includes('localVar'));
    expect(localVarError).toBeDefined();
    expect(localVarError!.message).toBe("Undefined identifier: 'localVar'");
  });
});

describe('UndefinedIdentifierValidator - Page Trigger Implicit Parameter Validation', () => {
  describe('OnFindRecord trigger (Which : Text)', () => {
    it('should not flag Which when used in OnFindRecord trigger body', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnFindRecord=BEGIN
                   IF Which = '-' THEN
                     EXIT(FALSE);
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('Which'))).toHaveLength(0);
    });

    it('should flag Which typo (Wich) in OnFindRecord trigger', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnFindRecord=BEGIN
                   IF Wich = '-' THEN
                     EXIT(FALSE);
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const whichError = diagnostics.find(d => d.message.includes('Wich'));
      expect(whichError).toBeDefined();
      expect(whichError!.message).toBe("Undefined identifier: 'Wich'");
    });

    it('should handle Which case-insensitively in OnFindRecord', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnFindRecord=BEGIN
                   IF WHICH = '-' THEN
                     EXIT(FALSE);
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('WHICH'))).toHaveLength(0);
    });
  });

  describe('OnNextRecord trigger (Steps : Integer)', () => {
    it('should not flag Steps when used in OnNextRecord trigger body', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnNextRecord=BEGIN
                   Steps := 1;
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('Steps'))).toHaveLength(0);
    });

    it('should flag Steps typo (Step) in OnNextRecord trigger', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnNextRecord=BEGIN
                   Step := 1;
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const stepError = diagnostics.find(d => d.message.includes('Step'));
      expect(stepError).toBeDefined();
      expect(stepError!.message).toBe("Undefined identifier: 'Step'");
    });

    it('should handle Steps case-insensitively in OnNextRecord', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnNextRecord=BEGIN
                   steps := 1;
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('steps'))).toHaveLength(0);
    });
  });

  describe('OnNewRecord trigger (BelowxRec : Boolean)', () => {
    it('should not flag BelowxRec when used in OnNewRecord trigger body', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnNewRecord=BEGIN
                  IF BelowxRec THEN
                    MESSAGE('Below');
                END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('BelowxRec'))).toHaveLength(0);
    });

    it('should flag BelowxRec typo (BelowRec) in OnNewRecord trigger', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnNewRecord=BEGIN
                  IF BelowRec THEN
                    MESSAGE('Below');
                END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const belowError = diagnostics.find(d => d.message.includes('BelowRec'));
      expect(belowError).toBeDefined();
      expect(belowError!.message).toBe("Undefined identifier: 'BelowRec'");
    });
  });

  describe('OnInsertRecord trigger (BelowxRec : Boolean)', () => {
    it('should not flag BelowxRec when used in OnInsertRecord trigger body', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnInsertRecord=BEGIN
                     IF BelowxRec THEN
                       EXIT(TRUE);
                   END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('BelowxRec'))).toHaveLength(0);
    });
  });

  describe('OnQueryClosePage trigger (CloseAction : Action)', () => {
    it('should not flag CloseAction when used in OnQueryClosePage trigger body', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnQueryClosePage=BEGIN
                       IF CloseAction = ACTION::OK THEN
                         EXIT(TRUE);
                     END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('CloseAction'))).toHaveLength(0);
    });

    it('should flag CloseAction typo (ClosAction) in OnQueryClosePage trigger', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnQueryClosePage=BEGIN
                       IF ClosAction = ACTION::OK THEN
                         EXIT(TRUE);
                     END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const closeError = diagnostics.find(d => d.message.includes('ClosAction'));
      expect(closeError).toBeDefined();
      expect(closeError!.message).toBe("Undefined identifier: 'ClosAction'");
    });
  });

  describe('Cross-cutting scenarios', () => {
    it('should flag Which in wrong object type (Codeunit OnRun)', () => {
      const code = `OBJECT Codeunit 50000 TestCodeunit
{
  PROPERTIES
  {
    OnRun=BEGIN
            IF Which = '-' THEN
              EXIT;
          END;
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const whichError = diagnostics.find(d => d.message.includes('Which'));
      expect(whichError).toBeDefined();
      expect(whichError!.message).toBe("Undefined identifier: 'Which'");
    });

    it('should flag Which in non-parameterized trigger (OnOpenPage)', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnOpenPage=BEGIN
                 IF Which = '-' THEN
                   EXIT;
               END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const whichError = diagnostics.find(d => d.message.includes('Which'));
      expect(whichError).toBeDefined();
      expect(whichError!.message).toBe("Undefined identifier: 'Which'");
    });

    it('should not flag both local VAR and Which in OnFindRecord', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    OnFindRecord=VAR
                   localVar@1000 : Integer;
                 BEGIN
                   IF Which = '-' THEN
                     localVar := 1;
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('Which'))).toHaveLength(0);
      expect(diagnostics.filter(d => d.message.includes('localVar'))).toHaveLength(0);
    });

    it('should not flag global symbols (Rec/xRec) with Which in OnFindRecord', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    SourceTable=Table18;
    OnFindRecord=BEGIN
                   Rec.SETRANGE("No.");
                   IF Which = '-' THEN
                     EXIT(xRec.FINDFIRST);
                 END;
  }
  CONTROLS
  {
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      expect(diagnostics.filter(d => d.message.includes('Rec'))).toHaveLength(0);
      expect(diagnostics.filter(d => d.message.includes('xRec'))).toHaveLength(0);
      expect(diagnostics.filter(d => d.message.includes('Which'))).toHaveLength(0);
    });

    it('should flag Which in CODE section procedure (not in trigger scope)', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      IF Which = '-' THEN
        EXIT;
    END;

    BEGIN
    END.
  }
}`;
      const diagnostics = validateUndefinedIdentifiers(code);
      const whichError = diagnostics.find(d => d.message.includes('Which'));
      expect(whichError).toBeDefined();
      expect(whichError!.message).toBe("Undefined identifier: 'Which'");
    });
  });
});

describe('UndefinedIdentifierValidator - XMLport ELEMENTS validation with table registry', () => {
  it('should not flag table display name references when registry resolves SourceTable', () => {
    // XMLport ELEMENTS contain triggers that reference table display names (e.g., "Data Exch. Def")
    // With table registry: display name is resolved and registered, so no diagnostic expected
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                     "Data Exch. Def".VALIDATE("File Type");
                                                                   END;
                                                                    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const diagnostics = validateUndefinedIdentifiers(code, registry);

    // With registry: table display name is resolved, should produce zero diagnostics
    const dataExchDefError = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefError).toBeUndefined();
    expect(diagnostics).toHaveLength(0);
  });

  it('should still validate CODE section in XMLports', () => {
    // XMLport CODE section should still be validated normally
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      UndefinedVar := 42;
    END;

    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    // CODE section should still be validated
    const undefinedError = diagnostics.find(d => d.message.includes('UndefinedVar'));
    expect(undefinedError).toBeDefined();
    expect(undefinedError!.message).toBe("Undefined identifier: 'UndefinedVar'");
  });

  it('should not flag ELEMENTS triggers without errors when no display names present', () => {
    // Simple ELEMENTS section without complex trigger references
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;Item                ;Element ;Table   ;
                                      SourceTable=Table27 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    // Should produce zero diagnostics (baseline)
    expect(diagnostics).toHaveLength(0);
  });

  it('should suppress ELEMENTS validation for multiple XMLport elements when no registry available', () => {
    // XMLport with multiple elements that have triggers — no registry provided, so ELEMENTS validation is suppressed
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                   END;
                                                                    }
    { [{GHI}];2 ;DataExchLineDef     ;Element ;Table   ;
                                      SourceTable=Table1227;
                                      Export::OnBeforePassField=BEGIN
                                                                  IF "Data Exch. Line Def".Namespace = '' THEN
                                                                    currXMLport.SKIP;
                                                                END;
                                                                 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    // Suppression is all-or-nothing: no registry means zero diagnostics
    expect(diagnostics).toHaveLength(0);
  });

  it('should flag undefined identifier in ELEMENTS trigger when registry provided', () => {
    // With table registry: defined identifiers should NOT be flagged,
    // but truly undefined identifiers should still be caught
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                     UndefinedVar := 42;
                                                                   END;
                                                                    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const diagnostics = validateUndefinedIdentifiers(code, registry);

    // Table display name should NOT be flagged (it's resolved via registry)
    const dataExchDefError = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefError).toBeUndefined();

    // But truly undefined identifier should still be caught
    const undefinedVarError = diagnostics.find(d => d.message.includes('UndefinedVar'));
    expect(undefinedVarError).toBeDefined();
    expect(undefinedVarError!.message).toBe("Undefined identifier: 'UndefinedVar'");
  });

  it('should suppress truly undefined identifiers in ELEMENTS triggers when no registry available', () => {
    // Without registry: entire ELEMENTS validation is suppressed — even truly undefined identifiers are not flagged.
    // Counterpart to the registry test above where UndefinedVar IS caught.
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                     UndefinedVar := 42;
                                                                   END;
                                                                    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    // Display name references are suppressed (same as before)
    const dataExchDefError = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefError).toBeUndefined();

    // Even truly undefined identifiers are suppressed (no registry means no ELEMENTS validation)
    const undefinedVarError = diagnostics.find(d => d.message.includes('UndefinedVar'));
    expect(undefinedVarError).toBeUndefined();
  });

  it('should resolve multiple elements display names with registry', () => {
    // Multiple elements with different SourceTable values, all resolved via registry
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                   END;
                                                                    }
    { [{GHI}];2 ;DataExchLineDef     ;Element ;Table   ;
                                      SourceTable=Table1227;
                                      Export::OnBeforePassField=BEGIN
                                                                  "Data Exch. Line Def".VALIDATE(Code);
                                                                END;
                                                                 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([
      [1222, 'Data Exch. Def'],
      [1227, 'Data Exch. Line Def']
    ]);
    const diagnostics = validateUndefinedIdentifiers(code, registry);

    // Both table display names should be resolved
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle currXMLport implicit variable in ELEMENTS triggers', () => {
    // currXMLport is an implicit builtin variable available in XMLport triggers
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Export::OnBeforePassField=BEGIN
                                                                  IF "Data Exch. Def".Code = '' THEN
                                                                    currXMLport.SKIP;
                                                                END;
                                                                 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const diagnostics = validateUndefinedIdentifiers(code, registry);

    // currXMLport should not be flagged as undefined (it's a builtin)
    const currXMLportError = diagnostics.find(d => d.message.includes('currXMLport'));
    expect(currXMLportError).toBeUndefined();

    // Table display name should not be flagged
    const dataExchDefError = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefError).toBeUndefined();

    expect(diagnostics).toHaveLength(0);
  });
});

describe('UndefinedIdentifierValidator - Page SourceTable Field Integration', () => {
  /**
   * Helper to validate with both table registry and field registry.
   * After implementation, validateUndefinedIdentifiers will need to accept fieldRegistry as well.
   */
  function validateWithFieldRegistry(
    code: string,
    tableRegistry?: ReadonlyMap<number, string>,
    fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>
  ): Diagnostic[] {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast, tableRegistry, fieldRegistry);

    const builtins = new BuiltinRegistry();

    const context: ValidationContext = {
      ast,
      symbolTable,
      builtins,
      documentUri: 'file:///test.cal',
      hasTableRegistry: symbolTable.hadTableRegistry
    };

    const validator = new UndefinedIdentifierValidator();
    return validator.validate(context);
  }

  it('should not flag SourceTable field references when field registry is populated', () => {
    const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      "No." := 'CUST001';
      Name := 'Test Customer';
      VALIDATE(Address);
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    const fieldRegistry = new Map<number, Map<string, string>>();
    const customerFields = new Map<string, string>();
    customerFields.set('No.', 'Code20');
    customerFields.set('Name', 'Text50');
    customerFields.set('Address', 'Text50');
    fieldRegistry.set(18, customerFields);

    const diagnostics = validateWithFieldRegistry(code, tableRegistry, fieldRegistry);

    // No fields should be flagged as undefined
    const noFieldError = diagnostics.find(d => d.message.includes('No.'));
    expect(noFieldError).toBeUndefined();

    const nameFieldError = diagnostics.find(d => d.message.includes('Name'));
    expect(nameFieldError).toBeUndefined();

    const addressFieldError = diagnostics.find(d => d.message.includes('Address'));
    expect(addressFieldError).toBeUndefined();

    expect(diagnostics).toHaveLength(0);
  });

  it('should flag field references when field registry is NOT populated', () => {
    // Same code as above, but without field registry
    const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      "No." := 'CUST001';
      Name := 'Test Customer';
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    // No field registry provided

    const diagnostics = validateUndefinedIdentifiers(code, tableRegistry);

    // Fields SHOULD be flagged as undefined (existing behavior preserved)
    const noFieldError = diagnostics.find(d => d.message.includes('No.'));
    expect(noFieldError).toBeDefined();

    const nameFieldError = diagnostics.find(d => d.message.includes('Name'));
    expect(nameFieldError).toBeDefined();
  });

  it('should handle field references with special characters', () => {
    const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      "E-Mail" := 'test@example.com';
      "Balance (LCY)" := 1000.00;
      "Gen. Bus. Posting Group" := 'DOMESTIC';
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    const fieldRegistry = new Map<number, Map<string, string>>();
    const customerFields = new Map<string, string>();
    customerFields.set('E-Mail', 'Text80');
    customerFields.set('Balance (LCY)', 'Decimal');
    customerFields.set('Gen. Bus. Posting Group', 'Code10');
    fieldRegistry.set(18, customerFields);

    const diagnostics = validateWithFieldRegistry(code, tableRegistry, fieldRegistry);

    expect(diagnostics).toHaveLength(0);
  });

  it('should allow local variable to shadow SourceTable field without warning', () => {
    const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Name : Integer;
    BEGIN
      Name := 5;  // Local variable shadows table field - OK
      Address := 'Main Street';  // Table field - OK
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    const fieldRegistry = new Map<number, Map<string, string>>();
    const customerFields = new Map<string, string>();
    customerFields.set('Name', 'Text50');
    customerFields.set('Address', 'Text50');
    fieldRegistry.set(18, customerFields);

    const diagnostics = validateWithFieldRegistry(code, tableRegistry, fieldRegistry);

    // Both Name (local var) and Address (field) should be valid
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle pages without SourceTable property', () => {
    const code = `OBJECT Page 21 "General Page"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      Name := 'Test';  // Should be flagged - no SourceTable
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    const fieldRegistry = new Map<number, Map<string, string>>();
    const customerFields = new Map<string, string>();
    customerFields.set('Name', 'Text50');
    fieldRegistry.set(18, customerFields);

    const diagnostics = validateWithFieldRegistry(code, tableRegistry, fieldRegistry);

    // Name should be flagged as undefined
    const nameError = diagnostics.find(d => d.message.includes('Name'));
    expect(nameError).toBeDefined();
  });

  it('should handle case-insensitive field references', () => {
    const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      name := 'Customer 1';  // lowercase
      NAME := 'Customer 2';  // uppercase
      NaMe := 'Customer 3';  // mixed case
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    const fieldRegistry = new Map<number, Map<string, string>>();
    const customerFields = new Map<string, string>();
    customerFields.set('Name', 'Text50');
    fieldRegistry.set(18, customerFields);

    const diagnostics = validateWithFieldRegistry(code, tableRegistry, fieldRegistry);

    // All case variations should resolve to the same field
    expect(diagnostics).toHaveLength(0);
  });

  it('should not inject fields for non-page objects', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      Name := 'Test';  // Should be flagged - not a page
    END;
  }
}`;

    const tableRegistry = new Map<number, string>([[18, 'Customer']]);
    const fieldRegistry = new Map<number, Map<string, string>>();
    const customerFields = new Map<string, string>();
    customerFields.set('Name', 'Text50');
    fieldRegistry.set(18, customerFields);

    const diagnostics = validateWithFieldRegistry(code, tableRegistry, fieldRegistry);

    // Name should be flagged as undefined (not a page)
    const nameError = diagnostics.find(d => d.message.includes('Name'));
    expect(nameError).toBeDefined();
  });
});
