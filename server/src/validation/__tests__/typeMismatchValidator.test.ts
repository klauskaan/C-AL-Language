/**
 * Type Mismatch Validator Tests
 *
 * Integration tests for semantic validator that detects type mismatches in assignments.
 *
 * Phase 1 scope: Simple assignments of literals and variables to local/global variables.
 *
 * The validator detects:
 * - Assignments of incompatible literal types to variables (e.g., IntVar := 'hello')
 * - Assignments of incompatible variable types to variables (e.g., DateVar := IntVar)
 * - Narrowing assignments that lose precision (e.g., IntVar := DecimalVar)
 *
 * The validator skips (Phase 2+):
 * - Complex expressions (operators, function calls)
 * - Member expressions (record field access)
 * - Array access expressions
 * - Unknown types (DotNet, Automation, Variant, TextConst)
 * - Assignments where target is not in symbol table
 *
 * Diagnostic:
 * - Message: "Type mismatch: cannot assign {sourceType} to {targetType}"
 * - Severity: Warning
 * - Source: 'cal'
 * - Range: The assignment operator position
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TypeMismatchValidator } from '../typeMismatchValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run type mismatch validation
 */
function validateTypeMismatch(code: string): Diagnostic[] {
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

  const validator = new TypeMismatchValidator();
  return validator.validate(context);
}

describe('TypeMismatchValidator - Incompatible Literal Assignments', () => {
  describe('Should produce diagnostic (type mismatch)', () => {
    it('should detect string literal assigned to Integer variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
          BEGIN
            IntVar := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.severity).toBe(DiagnosticSeverity.Warning);
      expect(mismatch!.source).toBe('cal');
    });

    it('should detect integer literal assigned to Text variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TextVar : Text;
          BEGIN
            TextVar := 42;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.message).toContain('Text');
    });

    it('should detect integer literal assigned to Date variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            DateVar : Date;
          BEGIN
            DateVar := 5;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.message).toContain('Date');
    });

    it('should detect integer literal assigned to Boolean variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            BoolVar : Boolean;
          BEGIN
            BoolVar := 42;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.message).toContain('Boolean');
    });

    it('should detect boolean literal assigned to Integer variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
          BEGIN
            IntVar := TRUE;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Boolean');
      expect(mismatch!.message).toContain('Integer');
    });
  });
});

describe('TypeMismatchValidator - Incompatible Variable Assignments', () => {
  describe('Should produce diagnostic (variable type mismatch)', () => {
    it('should detect Date variable assigned to Integer variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            DateVar : Date;
            IntVar : Integer;
          BEGIN
            DateVar := IntVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.message).toContain('Date');
    });

    it('should detect Boolean variable assigned to Text variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            BoolVar : Boolean;
            TextVar : Text;
          BEGIN
            BoolVar := TextVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Boolean');
    });

    it('should detect Decimal variable assigned to Text variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            DecimalVar : Decimal;
            TextVar : Text;
          BEGIN
            DecimalVar := TextVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Decimal');
    });

    it('should detect Integer variable assigned to Decimal (narrowing)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
            DecVar : Decimal;
          BEGIN
            IntVar := DecVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Decimal');
      expect(mismatch!.message).toContain('Integer');
    });

    it('should detect type mismatch with different Record types', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer : Record 18;
            Item : Record 27;
          BEGIN
            Customer := Item;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Record');
    });
  });
});

describe('TypeMismatchValidator - Compatible Assignments', () => {
  describe('Should NOT produce diagnostic (compatible assignments)', () => {
    it('should allow Integer literal to Integer variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
          BEGIN
            IntVar := 5;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow Integer variable to Decimal (widening)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
            DecVar : Decimal;
          BEGIN
            DecVar := IntVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow string literal to Text variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TextVar : Text;
          BEGIN
            TextVar := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow boolean literal to Boolean variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            BoolVar : Boolean;
          BEGIN
            BoolVar := TRUE;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow Text variable to Code variable (compatible)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TextVar : Text;
            CodeVar : Code[20];
          BEGIN
            TextVar := CodeVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow Code variable to Text variable (compatible)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TextVar : Text;
            CodeVar : Code[20];
          BEGIN
            CodeVar := TextVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow Integer variable to Option (ordinal)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
            OptionVar : Option;
          BEGIN
            IntVar := OptionVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow integer literal to Option (ordinal)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            OptionVar : Option;
          BEGIN
            OptionVar := 0;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow Char variable to Integer (ordinal)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            CharVar : Char;
            IntVar : Integer;
          BEGIN
            IntVar := CharVar;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow date literal to Date variable', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            DateVar : Date;
          BEGIN
            DateVar := 010125D;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow same Record type assignment', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Customer1 : Record 18;
            Customer2 : Record 18;
          BEGIN
            Customer1 := Customer2;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should allow TEMPORARY record to non-TEMPORARY record (isTemporary ignored)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            TEMPORARY TempCustomer : Record 18;
            Customer : Record 18;
          BEGIN
            Customer := TempCustomer;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });
  });
});

describe('TypeMismatchValidator - Phase 2 Skipped Cases', () => {
  describe('Should skip validation (not in Phase 1 scope)', () => {
    it('should skip complex expression assignments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            a : Integer;
            b : Integer;
          BEGIN
            x := a + b;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No diagnostic expected - complex expressions are Phase 2
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should skip function call assignments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := SomeFunc();
          END;

          PROCEDURE SomeFunc() : Text;
          BEGIN
            EXIT('result');
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No diagnostic expected - function calls are Phase 2
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should skip MemberExpression target (record field assignment)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            Rec : Record 18;
          BEGIN
            Rec.Field := 42;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No diagnostic expected - member expressions are Phase 2
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should skip ArrayAccessExpression target', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            MyArray : ARRAY[10] OF Integer;
          BEGIN
            MyArray[1] := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No diagnostic expected - array access is Phase 2
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should skip MemberExpression value (record field access)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            Rec : Record 18;
          BEGIN
            x := Rec.Field;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No diagnostic expected - member expressions are Phase 2
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should skip when target is not in symbol table', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            UndefinedVar := 5;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No type mismatch diagnostic expected - undefined identifier is handled by other validator
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });
  });
});

describe('TypeMismatchValidator - Edge Cases', () => {
  describe('Edge case handling', () => {
    it('should handle multiple assignments with some errors', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            IntVar : Integer;
            TextVar : Text;
            BoolVar : Boolean;
          BEGIN
            IntVar := 5;
            TextVar := 'hello';
            BoolVar := 42;
            IntVar := 'error';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // Should have exactly 2 type mismatch errors
      const mismatches = diagnostics.filter(d => d.message.includes('Type mismatch'));
      expect(mismatches.length).toBe(2);

      // Check specific errors
      const boolError = mismatches.find(d => d.message.includes('Boolean'));
      const intError = mismatches.find(d => d.message.includes('Integer'));
      expect(boolError).toBeDefined();
      expect(intError).toBeDefined();
    });

    // TODO: Fix - table triggers are not being visited properly
    it.skip('should handle assignments in triggers', () => {
      const code = `OBJECT Table 50000 MyTable {
        PROPERTIES {
        }
        FIELDS {
          { 1 ; ; MyField ; Integer }
        }
        CODE {
          OnInsert();
          VAR
            x : Integer;
          BEGIN
            x := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Integer');
    });

    it('should handle assignments in nested blocks', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
            flag : Boolean;
          BEGIN
            IF flag THEN BEGIN
              x := 'nested error';
            END;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Integer');
    });

    it('should handle case-insensitive variable lookup', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            myVar : Integer;
          BEGIN
            MYVAR := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Integer');
    });

    it('should handle empty procedure body', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // No diagnostics expected
      expect(diagnostics).toHaveLength(0);
    });

    it('should handle global variable assignments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            GlobalInt : Integer;

          PROCEDURE TestProc();
          BEGIN
            GlobalInt := 'error';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Integer');
    });

    it('should handle parameter assignments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc(VAR param : Integer);
          BEGIN
            param := 'error';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Text');
      expect(mismatch!.message).toContain('Integer');
    });

    it('should handle malformed AST gracefully (null target)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          BEGIN
            := 5;
          END;
        }
      }`;

      // Should not throw even with malformed AST
      expect(() => validateTypeMismatch(code)).not.toThrow();
    });

    it('should handle malformed AST gracefully (null value)', () => {
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

      // Should not throw even with malformed AST
      expect(() => validateTypeMismatch(code)).not.toThrow();
    });
  });
});

describe('TypeMismatchValidator - Diagnostic Properties', () => {
  describe('Diagnostic format and properties', () => {
    it('should have correct diagnostic severity', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should have correct diagnostic source', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.source).toBe('cal');
    });

    it('should have valid range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.range).toBeDefined();
      expect(mismatch!.range.start.line).toBeGreaterThanOrEqual(0);
      expect(mismatch!.range.start.character).toBeGreaterThanOrEqual(0);
      expect(mismatch!.range.end.line).toBeGreaterThanOrEqual(mismatch!.range.start.line);
    });

    it('should include both source and target types in message', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            x : Integer;
          BEGIN
            x := 'hello';
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toMatch(/Type mismatch.*Text.*Integer/);
    });
  });
});

describe('TypeMismatchValidator - Real-World Patterns', () => {
  describe('Common C/AL patterns', () => {
    it('should allow common numeric widening pattern', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE CalcTotal();
          VAR
            LineCount : Integer;
            TotalAmount : Decimal;
          BEGIN
            LineCount := 10;
            TotalAmount := LineCount * 99.95;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // Second assignment has complex expression, should be skipped in Phase 1
      // First assignment is compatible
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });

    it('should detect common mistake: boolean flag as integer', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessRecord();
          VAR
            IsPosted : Boolean;
          BEGIN
            IsPosted := 1;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.message).toContain('Boolean');
    });

    it('should detect common mistake: date as integer', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE GetDate();
          VAR
            PostingDate : Date;
            DayOfMonth : Integer;
          BEGIN
            PostingDate := DayOfMonth;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeDefined();
      expect(mismatch!.message).toContain('Integer');
      expect(mismatch!.message).toContain('Date');
    });

    it('should allow option-integer interoperability', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE SetDocumentType();
          VAR
            DocType : Option Quote,Order,Invoice;
            TypeValue : Integer;
          BEGIN
            DocType := 0;
            TypeValue := DocType;
          END;
        }
      }`;

      const diagnostics = validateTypeMismatch(code);

      // Both assignments should be allowed (Option <-> Integer)
      const mismatch = diagnostics.find(d => d.message.includes('Type mismatch'));
      expect(mismatch).toBeUndefined();
    });
  });
});
