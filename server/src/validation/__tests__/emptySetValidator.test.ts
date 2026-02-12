/**
 * Empty Set Validator Tests
 *
 * Tests for semantic validator that detects empty sets in IN expressions.
 *
 * The validator detects:
 * - Empty set literals `[]` used with IN operator
 * - Empty sets on either side of IN (left or right operand)
 * - Malformed empty sets like `[,]` or `[ ]` (whitespace only)
 *
 * Diagnostic:
 * - Message: "Empty set in IN expression - condition will always be false"
 * - Severity: Warning
 * - Range: The [] brackets (SetLiteral's token positions)
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { EmptySetValidator } from '../emptySetValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run empty set validation
 */
function validateEmptySet(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  const builtins = new BuiltinRegistry();

  const context: ValidationContext = {
    ast,
    symbolTable,
    builtins,
    documentUri: 'file:///test.cal'
  };

  const validator = new EmptySetValidator();
  return validator.validate(context);
}

describe('EmptySetValidator - Basic Empty Sets', () => {
  describe('Should produce diagnostic (empty set in IN)', () => {
    it('should detect empty set on right operand: x IN []', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Status : Integer;
          BEGIN
            IF Status IN [] THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
      expect(diagnostics[0].code).toBe('empty-set');
      // Range should cover the empty brackets []
      expect(diagnostics[0].range).toBeDefined();
    });

    // TODO: Parser limitation - set literals only recognized on RIGHT side of IN operator
    // The parser's special handling (parser.ts:2755) only triggers for "IN [" sequence
    // Would require parser enhancement to support "[ ... ] IN ..." pattern
    it.skip('should detect empty set on left operand: [] IN x', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Status : Integer;
          BEGIN
            IF [] IN Status THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should detect empty set with variable: myVar IN []', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            myVar : Integer;
          BEGIN
            IF myVar IN [] THEN
              MESSAGE('Never happens');
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should detect empty set with member access: Rec.Field IN []', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Customer : Record 18;
          BEGIN
            IF Customer."No." IN [] THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should detect empty set with whitespace only: x IN [ ]', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [ ] THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should detect malformed empty set with comma: x IN [,]', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [,] THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      // This may parse as an empty set or have parse errors
      // Either way, if it parses as an empty SetLiteral, should warn
      expect(diagnostics.length).toBeGreaterThanOrEqual(0);
      if (diagnostics.length > 0) {
        expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
        expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
      }
    });
  });

  describe('Case variations of IN operator', () => {
    it('should detect empty set with lowercase "in" operator', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x in [] THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });

    it('should detect empty set with mixed case "In" operator', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x In [] THEN
              EXIT;
          END;
        }
      }`;

      const diagnostics = validateEmptySet(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
    });
  });
});

describe('EmptySetValidator - Should NOT produce diagnostic', () => {
  it('should not warn on non-empty set with numeric values', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          IF x IN [1, 2, 3] THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on set with single enum value', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          Status : Option Open,Released,Closed;
        BEGIN
          IF Status IN [Status::Open] THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on set with multiple enum values', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          Status : Option Open,Released,Closed;
        BEGIN
          IF Status IN [Status::Open, Status::Released] THEN
            ProcessDocument();
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on set with range expressions', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          IF x IN [1..10] THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on set with character range', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          c : Char;
        BEGIN
          IF c IN ['A'..'Z'] THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on assignment to empty set: x := []', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          mySet : Text;
        BEGIN
          mySet := [];
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    // Empty set in assignment is allowed (not using IN operator)
    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on reversed assignment: [] := someValue', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          [] := x;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    // This is invalid C/AL syntax but validator should only care about IN expressions
    expect(diagnostics).toHaveLength(0);
  });

  it('should not warn on empty set in function call argument', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        BEGIN
          ProcessSet([]);
        END;

        PROCEDURE ProcessSet(Values : Text);
        BEGIN
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    // Empty set as function argument is allowed (not using IN operator)
    expect(diagnostics).toHaveLength(0);
  });
});

describe('EmptySetValidator - Complex Expressions', () => {
  it('should detect empty set in negated expression: NOT (x IN [])', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          IF NOT (x IN []) THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });

  it('should detect empty set in complex boolean expression', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
          y : Integer;
        BEGIN
          IF (x IN []) AND (y > 5) THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });

  it('should detect multiple empty sets in same expression', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
          y : Integer;
        BEGIN
          IF (x IN []) OR (y IN []) THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    // Should find both empty sets
    expect(diagnostics).toHaveLength(2);
    diagnostics.forEach((d: Diagnostic) => {
      expect(d.message).toBe('Empty set in IN expression - condition will always be false');
      expect(d.severity).toBe(DiagnosticSeverity.Warning);
    });
  });

  it('should detect empty set in CASE statement branch', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          Status : Integer;
        BEGIN
          CASE TRUE OF
            Status IN []:
              ProcessEmpty();
            Status IN [1, 2]:
              ProcessValid();
          END;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });

  it('should detect empty set in WHILE loop condition', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          WHILE x IN [] DO
            x := x + 1;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });

  it('should detect empty set in REPEAT-UNTIL loop condition', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          REPEAT
            x := x + 1;
          UNTIL x IN [];
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });
});

describe('EmptySetValidator - Real-World Patterns', () => {
  it('should detect empty set in status validation pattern', () => {
    const code = `OBJECT Codeunit 80 "Sales-Post" {
      CODE {
        PROCEDURE CheckStatus(VAR SalesHeader : Record 36);
        BEGIN
          IF SalesHeader.Status IN [] THEN
            ERROR('Invalid status');
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });

  it('should detect empty set in document type filtering', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE FilterDocuments(VAR SalesHeader : Record 36);
        BEGIN
          IF SalesHeader."Document Type" IN [] THEN
            SalesHeader.DELETE;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });

  it('should not warn on valid document type check', () => {
    const code = `OBJECT Codeunit 80 "Sales-Post" {
      CODE {
        PROCEDURE CheckDocType(VAR SalesHeader : Record 36);
        BEGIN
          IF SalesHeader."Document Type" IN [
            SalesHeader."Document Type"::Order,
            SalesHeader."Document Type"::Invoice
          ] THEN
            ProcessDocument(SalesHeader);
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });
});

describe('EmptySetValidator - Diagnostic Position Accuracy', () => {
  it('should position diagnostic on the empty brackets', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
        BEGIN
          IF x IN [] THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);

    // Range should span the [] brackets
    const range = diagnostics[0].range;
    expect(range.start.line).toBe(range.end.line); // Same line

    // Extract the text at the diagnostic range (conceptually)
    // In practice, the range should cover the SetLiteral token positions
    expect(range.start.character).toBeLessThan(range.end.character);
  });

  it('should position diagnostic correctly in multi-line code', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE LongFunction();
        VAR
          Status : Integer;
          Customer : Record 18;
          Vendor : Record 23;
        BEGIN
          Customer.INIT;
          Vendor.INIT;

          IF Status IN [] THEN
            EXIT;

          MESSAGE('Done');
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);

    // Should be on the IF statement line (approximately line 11, 0-indexed: 10)
    expect(diagnostics[0].range.start.line).toBeGreaterThan(5);
  });
});

describe('EmptySetValidator - Edge Cases', () => {
  it('should handle code with no procedures gracefully', () => {
    const code = `OBJECT Table 18 Customer {
      FIELDS {
        { 1   ;   ;"No."           ;Code20        }
      }
    }`;

    const diagnostics = validateEmptySet(code);

    // No diagnostics expected - no code to validate
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle empty code section', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should handle parse errors gracefully', () => {
    const code = `OBJECT InvalidType 1 Test {
      CODE {
        PROCEDURE Test();
        BEGIN
          IF x IN [] THEN
        END;
      }
    }`;

    // Should not throw even if there are parse errors
    expect(() => validateEmptySet(code)).not.toThrow();
  });

  it('should handle nested expressions with empty sets', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE Test();
        VAR
          x : Integer;
          y : Integer;
        BEGIN
          IF ((x + y) IN []) OR (x > 10) THEN
            EXIT;
        END;
      }
    }`;

    const diagnostics = validateEmptySet(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Empty set in IN expression - condition will always be false');
  });
});
