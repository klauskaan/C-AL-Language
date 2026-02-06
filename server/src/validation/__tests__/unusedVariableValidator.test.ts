/**
 * Unused Variable Validator Tests
 *
 * Tests for semantic validator that detects unused local variables.
 *
 * The validator detects:
 * - Local variables declared but never read
 * - Write-only variables (assigned but never read)
 * - Variables in empty procedure bodies
 *
 * The validator suppresses:
 * - Parameters (even if unused)
 * - Global variables (even if unused)
 * - FOR loop control variables (implicitly read by loop)
 *
 * Read contexts include:
 * - Variable in expression RHS (x + 5)
 * - Variable in function arguments (MESSAGE(x))
 * - Variable in IF/WHILE/REPEAT conditions
 * - Variable as object in member expressions (Customer.Field)
 * - Variable in EXIT statements (EXIT(x))
 * - Variable in array index (arr[i])
 * - Variable in CASE expressions
 * - Self-referencing assignments (x := x + 1)
 *
 * Write-only contexts (should warn):
 * - Plain identifier in assignment LHS (x := 5)
 *
 * Diagnostic:
 * - Message: "Variable '{name}' is declared but never used"
 * - Severity: Warning
 * - Source: 'cal'
 * - Code: 'unused-variable'
 * - Range: The declaration token position
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { UnusedVariableValidator } from '../unusedVariableValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run unused variable validation
 */
function validateUnusedVariables(code: string): Diagnostic[] {
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

  const validator = new UnusedVariableValidator();
  return validator.validate(context);
}

describe('UnusedVariableValidator - Basic Detection', () => {
  describe('Should produce diagnostic (unused variables)', () => {
    it('should detect unused local variable in procedure', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            UnusedVar : Integer;
          BEGIN
            MESSAGE('Hello');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedVar'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.message).toBe("Variable 'UnusedVar' is declared but never used");
      expect(unusedError!.severity).toBe(DiagnosticSeverity.Warning);
      expect(unusedError!.source).toBe('cal');
      expect(unusedError!.code).toBe('unused-variable');
    });

    it('should detect multiple unused variables, report only unused ones', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            UsedVar : Integer;
            UnusedVar1 : Integer;
            UnusedVar2 : Text;
          BEGIN
            MESSAGE(FORMAT(UsedVar));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError1 = diagnostics.find(d => d.message.includes('UnusedVar1'));
      const unusedError2 = diagnostics.find(d => d.message.includes('UnusedVar2'));
      const usedError = diagnostics.find(d => d.message.includes('UsedVar'));

      expect(unusedError1).toBeDefined();
      expect(unusedError2).toBeDefined();
      expect(usedError).toBeUndefined();
    });

    it('should detect write-only variable (assigned but never read)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            WriteOnlyVar : Integer;
          BEGIN
            WriteOnlyVar := 42;
            MESSAGE('Done');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const writeOnlyError = diagnostics.find(d => d.message.includes('WriteOnlyVar'));
      expect(writeOnlyError).toBeDefined();
      expect(writeOnlyError!.message).toBe("Variable 'WriteOnlyVar' is declared but never used");
    });

    it('should detect unused variable in empty procedure body', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE EmptyProc();
          VAR
            UnusedInEmpty : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedInEmpty'));
      expect(unusedError).toBeDefined();
    });
  });
});

describe('UnusedVariableValidator - Should NOT Warn', () => {
  describe('Variables that are considered used', () => {
    it('should not warn for variable used in expression RHS', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            result : Integer;
          BEGIN
            result := x + 5;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const xError = diagnostics.find(d => d.message.includes("'x'"));
      expect(xError).toBeUndefined();
    });

    it('should not warn for variable used in function argument', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            myVar : Integer;
          BEGIN
            MESSAGE(FORMAT(myVar));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const myVarError = diagnostics.find(d => d.message.includes('myVar'));
      expect(myVarError).toBeUndefined();
    });

    it('should not warn for variable used in IF condition', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            condition : Boolean;
          BEGIN
            IF condition THEN
              MESSAGE('True');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const conditionError = diagnostics.find(d => d.message.includes('condition'));
      expect(conditionError).toBeUndefined();
    });

    it('should not warn for variable used in WHILE condition', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            counter : Integer;
          BEGIN
            WHILE counter < 10 DO
              counter := counter + 1;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const counterError = diagnostics.find(d => d.message.includes('counter'));
      expect(counterError).toBeUndefined();
    });

    it('should not warn for variable used in REPEAT-UNTIL condition', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            counter : Integer;
          BEGIN
            REPEAT
              counter := counter + 1;
            UNTIL counter = 10;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const counterError = diagnostics.find(d => d.message.includes('counter'));
      expect(counterError).toBeUndefined();
    });

    it('should not warn for variable as record object in member expression', () => {
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

      const diagnostics = validateUnusedVariables(code);

      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      expect(customerError).toBeUndefined();
    });

    it('should not warn for variable used in EXIT statement', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE GetValue() : Integer;
          VAR
            result : Integer;
          BEGIN
            result := 42;
            EXIT(result);
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const resultError = diagnostics.find(d => d.message.includes('result'));
      expect(resultError).toBeUndefined();
    });

    it('should not warn for variable used in array index', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyArray : ARRAY[10] OF Integer;
            i : Integer;
          BEGIN
            MESSAGE(FORMAT(MyArray[i]));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const iError = diagnostics.find(d => d.message.includes("'i'"));
      expect(iError).toBeUndefined();
    });

    it('should not warn for variable used as array itself', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyArray : ARRAY[10] OF Integer;
          BEGIN
            MESSAGE(FORMAT(MyArray[1]));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const arrayError = diagnostics.find(d => d.message.includes('MyArray'));
      expect(arrayError).toBeUndefined();
    });

    it('should not warn for FOR loop control variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            i : Integer;
          BEGIN
            FOR i := 1 TO 10 DO
              MESSAGE(FORMAT(i));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const iError = diagnostics.find(d => d.message.includes("'i'"));
      expect(iError).toBeUndefined();
    });

    it('should not warn for self-referencing assignment', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            counter : Integer;
          BEGIN
            counter := counter + 1;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const counterError = diagnostics.find(d => d.message.includes('counter'));
      expect(counterError).toBeUndefined();
    });

    it('should not warn for variable used in CASE expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            CASE x OF
              1: MESSAGE('One');
              2: MESSAGE('Two');
            END;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const xError = diagnostics.find(d => d.message.includes("'x'"));
      expect(xError).toBeUndefined();
    });
  });
});

describe('UnusedVariableValidator - MemberExpression Property Skipping', () => {
  describe('Critical: properties in member expressions should not mark variables as used', () => {
    it('should warn when variable shares name with record field in member expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
            Name : Text;
          BEGIN
            MESSAGE(Customer.Name);
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // Local variable "Name" is NOT used (Customer.Name uses the field, not the variable)
      const nameError = diagnostics.find(d => d.message.includes("'Name'"));
      expect(nameError).toBeDefined();
      expect(nameError!.message).toBe("Variable 'Name' is declared but never used");

      // Customer IS used (object of member expression)
      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      expect(customerError).toBeUndefined();
    });

    it('should not warn for variable used as object in chained member expression', () => {
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

      const diagnostics = validateUnusedVariables(code);

      // SalesHeader is used (root object), "Document Type" is just the property
      const salesHeaderError = diagnostics.find(d => d.message.includes('SalesHeader'));
      expect(salesHeaderError).toBeUndefined();
    });

    it('should track member expression LHS as read', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.Name := 'Test';
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // Customer is read (object of member expression, even on LHS)
      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      expect(customerError).toBeUndefined();
    });
  });
});

describe('UnusedVariableValidator - Excluded from Checking', () => {
  describe('Parameters and global variables should NOT be checked', () => {
    it('should not warn for unused parameters', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc(UnusedParam : Integer);
          BEGIN
            MESSAGE('Hello');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const paramError = diagnostics.find(d => d.message.includes('UnusedParam'));
      expect(paramError).toBeUndefined();
    });

    it('should not warn for unused VAR parameters', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc(VAR UnusedVarParam : Integer);
          BEGIN
            MESSAGE('Hello');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const paramError = diagnostics.find(d => d.message.includes('UnusedVarParam'));
      expect(paramError).toBeUndefined();
    });

    it('should not warn for unused global variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            UnusedGlobal : Integer;

          PROCEDURE TestProc();
          BEGIN
            MESSAGE('Hello');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const globalError = diagnostics.find(d => d.message.includes('UnusedGlobal'));
      expect(globalError).toBeUndefined();
    });
  });
});

describe('UnusedVariableValidator - Assignment Semantics', () => {
  describe('Different assignment target types and their read semantics', () => {
    it('should treat plain identifier LHS as write-only', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := 5;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const xError = diagnostics.find(d => d.message.includes("'x'"));
      expect(xError).toBeDefined();
      expect(xError!.message).toBe("Variable 'x' is declared but never used");
    });

    it('should treat MemberExpression LHS object as read', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
          BEGIN
            Customer.Name := 'Test';
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // Customer is read (accessed to set field)
      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      expect(customerError).toBeUndefined();
    });

    it('should treat ArrayAccess LHS array and index as read', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyArray : ARRAY[10] OF Integer;
            i : Integer;
          BEGIN
            MyArray[i] := 42;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // Both array and index are read (array accessed, index evaluated)
      const arrayError = diagnostics.find(d => d.message.includes('MyArray'));
      const iError = diagnostics.find(d => d.message.includes("'i'"));
      expect(arrayError).toBeUndefined();
      expect(iError).toBeUndefined();
    });

    it('should detect unused variable when only RHS of compound assignment is used', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            y : Integer;
          BEGIN
            x := y + 5;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // x is write-only (unused), y is read
      const xError = diagnostics.find(d => d.message.includes("'x'"));
      const yError = diagnostics.find(d => d.message.includes("'y'"));
      expect(xError).toBeDefined();
      expect(yError).toBeUndefined();
    });
  });
});

describe('UnusedVariableValidator - Scope Isolation', () => {
  describe('Same variable name in different scopes analyzed independently', () => {
    it('should analyze same variable name in different procedures independently', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Proc1();
          VAR
            x : Integer;
          BEGIN
            MESSAGE(FORMAT(x));
          END;

          PROCEDURE Proc2();
          VAR
            x : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // Proc1's x is used, Proc2's x is unused
      // Should only get one warning for Proc2's x
      const xErrors = diagnostics.filter(d => d.message.includes("'x'"));
      expect(xErrors).toHaveLength(1);
    });

    it('should check trigger local variables', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1   ;   ;"No."           ;Code20        }
        }
        CODE {
          PROCEDURE OnInsert();
          VAR
            UnusedInTrigger : Integer;
          BEGIN
            MESSAGE('Inserting');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedInTrigger'));
      expect(unusedError).toBeDefined();
    });

    // NOTE: EVENT handler syntax like "EVENT OnSomethingHappened();" is not yet
    // supported by the parser. Event handlers in C/AL use the trigger syntax
    // with the event name as the trigger type (e.g., OnSomethingHappened()).
  });
});

describe('UnusedVariableValidator - Case Insensitivity', () => {
  describe('Variable declaration and usage case insensitivity', () => {
    it('should not warn when variable declared as myVar, used as MYVAR', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            myVar : Integer;
          BEGIN
            MESSAGE(FORMAT(MYVAR));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const myVarError = diagnostics.find(d => d.message.includes('myVar'));
      expect(myVarError).toBeUndefined();
    });

    it('should not warn when variable used in mixed case', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyVariable : Integer;
          BEGIN
            myvariable := 5;
            MESSAGE(FORMAT(MYVARIABLE));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const varError = diagnostics.find(d => d.message.includes('MyVariable'));
      expect(varError).toBeUndefined();
    });
  });
});

describe('UnusedVariableValidator - Edge Cases', () => {
  describe('Edge case handling', () => {
    it('should handle procedure with no variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE NoVars();
          BEGIN
            MESSAGE('Hello');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      expect(diagnostics).toHaveLength(0);
    });

    it('should handle empty document', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      expect(diagnostics).toHaveLength(0);
    });

    it('should handle code with parse errors gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x :=
          END;
        }
      }`;

      // Should not throw even with parse errors
      expect(() => validateUnusedVariables(code)).not.toThrow();
    });

    it('should handle nested procedures (if supported)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE OuterProc();
          VAR
            outerVar : Integer;

            PROCEDURE InnerProc();
            VAR
              innerVar : Integer;
            BEGIN
              MESSAGE(FORMAT(innerVar));
            END;

          BEGIN
            InnerProc();
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // outerVar is unused, innerVar is used
      const outerError = diagnostics.find(d => d.message.includes('outerVar'));
      const innerError = diagnostics.find(d => d.message.includes('innerVar'));
      expect(outerError).toBeDefined();
      expect(innerError).toBeUndefined();
    });

    it('should handle TEMPORARY keyword in variable declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TempCustomer : TEMPORARY Record 18;
          BEGIN
            TempCustomer.INIT;
          END;
        }
      }`;

      // Inline setup to access both diagnostics and symbol table
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

      const validator = new UnusedVariableValidator();
      const diagnostics = validator.validate(context);

      // Verify the variable was created in the symbol table
      const rootScope = symbolTable.getRootScope();
      const procScope = rootScope.children.find(
        child => child.getOwnSymbol('TempCustomer') !== undefined
      );
      expect(procScope).toBeDefined();
      const tempCustomer = procScope!.getSymbol('TempCustomer');
      expect(tempCustomer).toBeDefined();
      expect(tempCustomer!.name).toBe('TempCustomer');

      // Verify no unused variable diagnostic
      const tempError = diagnostics.find(d => d.message.includes('TempCustomer'));
      expect(tempError).toBeUndefined();
    });

    it('should handle quoted identifiers', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            "My Variable" : Integer;
          BEGIN
            MESSAGE(FORMAT("My Variable"));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const quotedError = diagnostics.find(d => d.message.includes('My Variable'));
      expect(quotedError).toBeUndefined();
    });

    it('should handle complex expressions with multiple variable references', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            a : Integer;
            b : Integer;
            c : Integer;
            unused : Integer;
          BEGIN
            MESSAGE(FORMAT((a + b) * c));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // a, b, c should not be flagged
      const aError = diagnostics.find(d => d.message.includes("'a'"));
      const bError = diagnostics.find(d => d.message.includes("'b'"));
      const cError = diagnostics.find(d => d.message.includes("'c'"));
      expect(aError).toBeUndefined();
      expect(bError).toBeUndefined();
      expect(cError).toBeUndefined();

      // unused should be flagged
      const unusedError = diagnostics.find(d => d.message.includes('unused'));
      expect(unusedError).toBeDefined();
    });

    it('should handle variable used in binary operation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            y : Integer;
          BEGIN
            IF x > y THEN
              MESSAGE('x is greater');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const xError = diagnostics.find(d => d.message.includes("'x'"));
      const yError = diagnostics.find(d => d.message.includes("'y'"));
      expect(xError).toBeUndefined();
      expect(yError).toBeUndefined();
    });

    it('should handle variable used in unary operation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            flag : Boolean;
          BEGIN
            IF NOT flag THEN
              MESSAGE('flag is false');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const flagError = diagnostics.find(d => d.message.includes('flag'));
      expect(flagError).toBeUndefined();
    });
  });
});

describe('UnusedVariableValidator - Diagnostic Properties', () => {
  describe('Diagnostic message format and properties', () => {
    it('should have correct diagnostic severity', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            unused : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('unused'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should have correct diagnostic source', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            unused : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('unused'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.source).toBe('cal');
    });

    it('should have correct diagnostic code', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            unused : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('unused'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.code).toBe('unused-variable');
    });

    it('should have correct message format', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyUnusedVar : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('MyUnusedVar'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.message).toBe("Variable 'MyUnusedVar' is declared but never used");
    });

    it('should have valid range pointing to declaration', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            unused : Integer;
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('unused'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.range).toBeDefined();
      expect(unusedError!.range.start.line).toBeGreaterThanOrEqual(0);
      expect(unusedError!.range.start.character).toBeGreaterThanOrEqual(0);
      expect(unusedError!.range.end.character).toBeGreaterThan(unusedError!.range.start.character);
    });
  });
});

describe('UnusedVariableValidator - Field Triggers', () => {
  describe('Variables in field trigger scopes', () => {
    it('should detect unused variable in OnValidate trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1   ;   ;"No."           ;Code20
                                       OnValidate=VAR
                                                    UnusedInValidate : Integer;
                                                  BEGIN
                                                    MESSAGE('Validating');
                                                  END;
                                                   }
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedInValidate'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.message).toBe("Variable 'UnusedInValidate' is declared but never used");
    });

    it('should not warn for used variable in OnValidate trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1   ;   ;"No."           ;Code20
                                       OnValidate=VAR
                                                    UsedInValidate : Integer;
                                                  BEGIN
                                                    UsedInValidate := 10;
                                                    MESSAGE(FORMAT(UsedInValidate));
                                                  END;
                                                   }
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const usedError = diagnostics.find(d => d.message.includes('UsedInValidate'));
      expect(usedError).toBeUndefined();
    });

    it('should detect unused variable in OnLookup trigger', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1   ;   ;"No."           ;Code20
                                       OnLookup=VAR
                                                  UnusedInLookup : Text;
                                                BEGIN
                                                  MESSAGE('Looking up');
                                                END;
                                                 }
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedInLookup'));
      expect(unusedError).toBeDefined();
    });

    it('should isolate scopes: unused in field trigger, used in CODE procedure', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 1   ;   ;"No."           ;Code20
                                       OnValidate=VAR
                                                    x : Integer;
                                                  BEGIN
                                                  END;
                                                   }
        }
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            MESSAGE(FORMAT(x));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      // Should warn only about field trigger's x, not procedure's x
      const xErrors = diagnostics.filter(d => d.message.includes("'x'"));
      expect(xErrors).toHaveLength(1);
    });
  });
});

describe('UnusedVariableValidator - Property Triggers', () => {
  describe('Variables in property trigger scopes', () => {
    it('should detect unused variable in OnRun property trigger (Codeunit)', () => {
      const code = `OBJECT Codeunit 1 Test {
        PROPERTIES {
          OnRun=VAR
                  UnusedInOnRun : Integer;
                BEGIN
                  MESSAGE('Running');
                END;
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedInOnRun'));
      expect(unusedError).toBeDefined();
      expect(unusedError!.message).toBe("Variable 'UnusedInOnRun' is declared but never used");
    });

    it('should not warn for used variable in OnRun property trigger', () => {
      const code = `OBJECT Codeunit 1 Test {
        PROPERTIES {
          OnRun=VAR
                  UsedInOnRun : Text;
                BEGIN
                  UsedInOnRun := 'Hello';
                  MESSAGE(UsedInOnRun);
                END;
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const usedError = diagnostics.find(d => d.message.includes('UsedInOnRun'));
      expect(usedError).toBeUndefined();
    });

    it('should handle property trigger with no variables', () => {
      const code = `OBJECT Codeunit 1 Test {
        PROPERTIES {
          OnRun=BEGIN MESSAGE('Hello'); END;
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      expect(diagnostics).toHaveLength(0);
    });

    it('should detect unused variable in property trigger with empty body', () => {
      const code = `OBJECT Codeunit 1 Test {
        PROPERTIES {
          OnRun=VAR
                  UnusedInEmpty : Integer;
                BEGIN
                END;
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedInEmpty'));
      expect(unusedError).toBeDefined();
    });
  });
});

describe('UnusedVariableValidator - Combined Field and Property Triggers', () => {
  describe('Mixed trigger types in same object', () => {
    it('should detect unused variables in both field trigger and property trigger independently', () => {
      const code = `OBJECT Table 18 Customer {
        PROPERTIES {
          OnInsert=VAR
                     UnusedInProperty : Integer;
                   BEGIN
                     MESSAGE('Inserting');
                   END;
        }
        FIELDS {
          { 1   ;   ;"No."           ;Code20
                                       OnValidate=VAR
                                                    UnusedInField : Text;
                                                  BEGIN
                                                    MESSAGE('Validating');
                                                  END;
                                                   }
        }
        CODE {
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const propertyError = diagnostics.find(d => d.message.includes('UnusedInProperty'));
      const fieldError = diagnostics.find(d => d.message.includes('UnusedInField'));

      expect(propertyError).toBeDefined();
      expect(propertyError!.message).toBe("Variable 'UnusedInProperty' is declared but never used");
      expect(fieldError).toBeDefined();
      expect(fieldError!.message).toBe("Variable 'UnusedInField' is declared but never used");
    });
  });
});

describe('UnusedVariableValidator - Real-World Patterns', () => {
  describe('Common C/AL patterns', () => {
    it('should not warn for record looping pattern', () => {
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

      const diagnostics = validateUnusedVariables(code);

      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      expect(customerError).toBeUndefined();
    });

    it('should not warn for WITH record pattern', () => {
      const code = `OBJECT Codeunit 80 "Sales-Post" {
        CODE {
          PROCEDURE PostHeader(VAR SalesHeader : Record 36);
          VAR
            PostingDate : Date;
          BEGIN
            WITH SalesHeader DO BEGIN
              PostingDate := "Posting Date";
              TESTFIELD("Document Type");
            END;
            MESSAGE(FORMAT(PostingDate));
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const postingDateError = diagnostics.find(d => d.message.includes('PostingDate'));
      expect(postingDateError).toBeUndefined();
    });

    it('should not warn for error checking pattern', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE CheckValue();
          VAR
            Value : Decimal;
          BEGIN
            IF Value < 0 THEN
              ERROR('Value must be positive');
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const valueError = diagnostics.find(d => d.message.includes('Value'));
      expect(valueError).toBeUndefined();
    });

    it('should not warn for accumulator pattern', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE CalculateTotal();
          VAR
            Total : Decimal;
            Item : Record 27;
          BEGIN
            Total := 0;
            IF Item.FINDSET THEN
              REPEAT
                Total := Total + Item."Unit Price";
              UNTIL Item.NEXT = 0;
            EXIT(Total);
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const totalError = diagnostics.find(d => d.message.includes('Total'));
      const itemError = diagnostics.find(d => d.message.includes('Item'));
      expect(totalError).toBeUndefined();
      expect(itemError).toBeUndefined();
    });

    it('should warn for truly unused variables in complex code', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ComplexProc();
          VAR
            Customer : Record 18;
            UnusedVar : Integer;
            UsedVar : Text;
          BEGIN
            IF Customer.FINDSET THEN
              REPEAT
                UsedVar := Customer."No.";
                MESSAGE(UsedVar);
              UNTIL Customer.NEXT = 0;
          END;
        }
      }`;

      const diagnostics = validateUnusedVariables(code);

      const unusedError = diagnostics.find(d => d.message.includes('UnusedVar'));
      const customerError = diagnostics.find(d => d.message.includes('Customer'));
      const usedError = diagnostics.find(d => d.message.includes('UsedVar'));

      expect(unusedError).toBeDefined();
      expect(customerError).toBeUndefined();
      expect(usedError).toBeUndefined();
    });
  });
});
