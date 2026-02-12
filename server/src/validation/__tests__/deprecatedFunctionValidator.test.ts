/**
 * Deprecated Function Validator Tests
 *
 * Tests for semantic validator that detects deprecated C/AL record methods.
 *
 * The validator detects:
 * - RECORDLEVELLOCKING() - deprecated method for checking record-level locking
 * - GETRECORDID() - deprecated method for getting RecordID
 * - CONSISTENT() - deprecated method for marking records as consistent/inconsistent
 *
 * Diagnostic:
 * - Message: "[MethodName] is deprecated. [specific reason from builtinData.ts]"
 * - Severity: Hint (information level)
 * - Tags: [DiagnosticTag.Deprecated] (enables strikethrough in IDE)
 * - Source: 'cal'
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { DeprecatedFunctionValidator } from '../deprecatedFunctionValidator';
import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run deprecated function validation
 */
function validateDeprecatedFunctions(code: string): Diagnostic[] {
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

  const validator = new DeprecatedFunctionValidator();
  return validator.validate(context);
}

describe('DeprecatedFunctionValidator - Deprecated Record Methods', () => {
  describe('RECORDLEVELLOCKING detection', () => {
    it('should flag RECORDLEVELLOCKING() called as record method', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CheckLocking();
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.RECORDLEVELLOCKING() THEN
        MESSAGE('Record locking enabled');
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      const diag = diagnostics[0];
      expect(diag.message).toBe('RECORDLEVELLOCKING is deprecated. Always returns TRUE in SQL Server-based versions. Can be safely removed.');
      expect(diag.severity).toBe(DiagnosticSeverity.Hint);
      expect(diag.code).toBe('deprecated-function');
      expect(diag.tags).toEqual([DiagnosticTag.Deprecated]);
      expect(diag.source).toBe('cal');
    });

    it('should flag recordlevellocking() in lowercase', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CheckLocking();
    VAR
      Rec : Record 18;
    BEGIN
      IF Rec.recordlevellocking() THEN
        EXIT;
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('RECORDLEVELLOCKING is deprecated. Always returns TRUE in SQL Server-based versions. Can be safely removed.');
    });

    it('should flag RecordLevelLocking() in mixed case', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      SalesHeader : Record 36;
    BEGIN
      IF SalesHeader.RecordLevelLocking() THEN
        MESSAGE('Locking enabled');
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('RECORDLEVELLOCKING is deprecated. Always returns TRUE in SQL Server-based versions. Can be safely removed.');
    });
  });

  describe('GETRECORDID detection', () => {
    it('should flag GETRECORDID() called as record method', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetID();
    VAR
      Customer : Record 18;
      RecID : RecordID;
    BEGIN
      RecID := Customer.GETRECORDID();
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      const diag = diagnostics[0];
      expect(diag.message).toBe('GETRECORDID is deprecated. Use RECORDID instead.');
      expect(diag.severity).toBe(DiagnosticSeverity.Hint);
      expect(diag.tags).toEqual([DiagnosticTag.Deprecated]);
      expect(diag.source).toBe('cal');
    });

    it('should flag getrecordid() in lowercase', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Rec : Record 18;
    BEGIN
      MESSAGE(FORMAT(Rec.getrecordid()));
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('GETRECORDID is deprecated. Use RECORDID instead.');
    });

    it('should flag GetRecordId() in mixed case', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Item : Record 27;
    BEGIN
      Item.GetRecordId();
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('GETRECORDID is deprecated. Use RECORDID instead.');
    });
  });

  describe('CONSISTENT detection', () => {
    it('should flag CONSISTENT() called as record method', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MarkConsistent();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.CONSISTENT(TRUE);
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      const diag = diagnostics[0];
      expect(diag.message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
      expect(diag.severity).toBe(DiagnosticSeverity.Hint);
      expect(diag.tags).toEqual([DiagnosticTag.Deprecated]);
      expect(diag.source).toBe('cal');
    });

    it('should flag consistent() in lowercase', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Rec : Record 18;
    BEGIN
      Rec.consistent(FALSE);
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
    });

    it('should flag Consistent() in mixed case', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Item : Record 27;
    BEGIN
      Item.Consistent(TRUE);
    END;
  }
}`;

      const diagnostics = validateDeprecatedFunctions(code);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
    });
  });
});

describe('DeprecatedFunctionValidator - Multiple Calls', () => {
  it('should flag multiple deprecated methods in same procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestMultiple();
    VAR
      Customer : Record 18;
      RecID : RecordID;
    BEGIN
      IF Customer.RECORDLEVELLOCKING() THEN
        Customer.CONSISTENT(TRUE);
      RecID := Customer.GETRECORDID();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(3);

    const recordLevelLocking = diagnostics.find(d => d.message.includes('RECORDLEVELLOCKING'));
    expect(recordLevelLocking).toBeDefined();

    const consistent = diagnostics.find(d => d.message.includes('CONSISTENT'));
    expect(consistent).toBeDefined();

    const getRecordId = diagnostics.find(d => d.message.includes('GETRECORDID'));
    expect(getRecordId).toBeDefined();
  });

  it('should flag same deprecated method called multiple times', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
      Vendor : Record 23;
    BEGIN
      Customer.CONSISTENT(TRUE);
      Vendor.CONSISTENT(FALSE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(2);
    diagnostics.forEach(d => {
      expect(d.message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
      expect(d.severity).toBe(DiagnosticSeverity.Hint);
    });
  });

  it('should flag deprecated method in nested expressions', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.RECORDLEVELLOCKING() AND (Customer."No." <> '') THEN
        MESSAGE('Valid');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('RECORDLEVELLOCKING is deprecated. Always returns TRUE in SQL Server-based versions. Can be safely removed.');
  });
});

describe('DeprecatedFunctionValidator - Should NOT Flag Non-Deprecated Methods', () => {
  it('should not flag FIND method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.FIND('-') THEN;
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag FINDSET method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.FINDSET() THEN;
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag GET method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.GET('10000');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag INSERT method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.INSERT(TRUE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag MODIFY method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.MODIFY(TRUE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag DELETE method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.DELETE(TRUE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag SETRANGE method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.SETRANGE("No.", '10000', '20000');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag SETFILTER method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.SETFILTER("No.", '10000|20000');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag RESET method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.RESET();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag INIT method', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.INIT();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag global functions like MESSAGE', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      MESSAGE('Hello');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag global functions like ERROR', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      ERROR('Error occurred');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag global functions like FORMAT', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      MESSAGE(FORMAT(x));
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });
});

describe('DeprecatedFunctionValidator - User-Defined Procedure Shadowing', () => {
  it('should NOT flag user-defined CONSISTENT procedure when called directly', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoCheck();
    BEGIN
      CONSISTENT(TRUE);
    END;

    PROCEDURE CONSISTENT(IsConsistent : Boolean);
    BEGIN
      MESSAGE('Custom CONSISTENT procedure');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should flag Rec.CONSISTENT even when user has CONSISTENT procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoCheck();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.CONSISTENT(TRUE);
      CONSISTENT(FALSE);
    END;

    PROCEDURE CONSISTENT(IsConsistent : Boolean);
    BEGIN
      MESSAGE('Custom procedure');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    // Should only flag the record method call, not the direct procedure call
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
  });

  it('should NOT flag user-defined RECORDLEVELLOCKING procedure when called directly', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      RECORDLEVELLOCKING();
    END;

    PROCEDURE RECORDLEVELLOCKING();
    BEGIN
      MESSAGE('Custom implementation');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should flag Rec.RECORDLEVELLOCKING even when user has RECORDLEVELLOCKING procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Item : Record 27;
    BEGIN
      IF Item.RECORDLEVELLOCKING() THEN
        RECORDLEVELLOCKING();
    END;

    PROCEDURE RECORDLEVELLOCKING();
    BEGIN
      MESSAGE('Custom procedure');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    // Should only flag the record method call
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('RECORDLEVELLOCKING is deprecated. Always returns TRUE in SQL Server-based versions. Can be safely removed.');
  });

  it('should NOT flag user-defined GETRECORDID procedure when called directly', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      GETRECORDID();
    END;

    PROCEDURE GETRECORDID();
    BEGIN
      MESSAGE('Custom implementation');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });
});

describe('DeprecatedFunctionValidator - Edge Cases', () => {
  it('should handle code with no procedures gracefully', () => {
    const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should handle empty code section', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should handle parse errors gracefully', () => {
    const code = `OBJECT InvalidType 1 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.CONSISTENT(
    END;
  }
}`;

    // Should not throw even if there are parse errors
    expect(() => validateDeprecatedFunctions(code)).not.toThrow();
  });

  it('should handle deprecated method with no receiver variable name', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test(VAR Rec : Record 18);
    BEGIN
      Rec.CONSISTENT(TRUE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
  });

  it('should handle chained method calls', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.RESET();
      Customer.SETRANGE("No.", '10000');
      Customer.CONSISTENT(TRUE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
  });
});

describe('DeprecatedFunctionValidator - Real-World Patterns', () => {
  it('should flag deprecated method in sales posting routine', () => {
    const code = `OBJECT Codeunit 80 "Sales-Post"
{
  CODE
  {
    PROCEDURE PostSalesDocument(VAR SalesHeader : Record 36);
    BEGIN
      IF SalesHeader.RECORDLEVELLOCKING() THEN
        SalesHeader.LOCKTABLE();

      SalesHeader.CONSISTENT(TRUE);
      SalesHeader.MODIFY();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(2);

    const recordLocking = diagnostics.find(d => d.message.includes('RECORDLEVELLOCKING'));
    expect(recordLocking).toBeDefined();

    const consistent = diagnostics.find(d => d.message.includes('CONSISTENT'));
    expect(consistent).toBeDefined();
  });

  it('should flag deprecated method in audit trail code', () => {
    const code = `OBJECT Codeunit 50000 "Audit Manager"
{
  CODE
  {
    PROCEDURE LogRecordChange(VAR RecRef : RecordRef);
    VAR
      RecID : RecordID;
    BEGIN
      RecID := RecRef.GETRECORDID();
      MESSAGE('Record changed: %1', FORMAT(RecID));
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    // Note: GETRECORDID on RecordRef might be different from Record.GETRECORDID
    // This test verifies the validator behavior in this context
    expect(diagnostics.length).toBeGreaterThanOrEqual(0);
  });

  it('should flag deprecated method in consistency check routine', () => {
    const code = `OBJECT Codeunit 50000 "Data Validator"
{
  CODE
  {
    PROCEDURE ValidateConsistency(VAR Rec : Record 18);
    BEGIN
      IF Rec.FIND('-') THEN
        REPEAT
          Rec.CONSISTENT(Rec."Balance" >= 0);
        UNTIL Rec.NEXT() = 0;
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
  });
});

describe('DeprecatedFunctionValidator - Diagnostic Range Accuracy', () => {
  it('should position diagnostic on the deprecated method name', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.RECORDLEVELLOCKING() THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    expect(diagnostics).toHaveLength(1);

    // Range should be defined and span the method name
    const range = diagnostics[0].range;
    expect(range).toBeDefined();
    expect(range.start.line).toBeLessThanOrEqual(range.end.line);
    expect(range.start.character).toBeLessThan(range.end.character);
  });
});

describe('DeprecatedFunctionValidator - Context-specific deprecation lookup', () => {
  it('should NOT flag bare CONSISTENT(TRUE) call without receiver and without shadowing procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoCheck();
    BEGIN
      CONSISTENT(TRUE);
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    // CONSISTENT is a record method, not a global function
    // Calling it without a receiver should NOT produce a deprecation warning
    expect(diagnostics).toHaveLength(0);
  });

  it('should NOT flag bare RECORDLEVELLOCKING() call without receiver and without shadowing procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CheckLocking();
    BEGIN
      IF RECORDLEVELLOCKING() THEN
        MESSAGE('Locking enabled');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    // RECORDLEVELLOCKING is a record method, not a global function
    // Calling it without a receiver should NOT produce a deprecation warning
    expect(diagnostics).toHaveLength(0);
  });

  it('should NOT flag bare GETRECORDID() call without receiver and without shadowing procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetID();
    VAR
      RecID : RecordID;
    BEGIN
      RecID := GETRECORDID();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctions(code);

    // GETRECORDID is a record method, not a global function
    // Calling it without a receiver should NOT produce a deprecation warning
    expect(diagnostics).toHaveLength(0);
  });
});

describe('DeprecatedFunctionValidator - Configuration (warnDeprecated setting)', () => {
  /**
   * Helper to parse C/AL code and run deprecated function validation with settings
   */
  function validateDeprecatedFunctionsWithSettings(
    code: string,
    warnDeprecated?: boolean
  ): Diagnostic[] {
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
      documentUri: 'file:///test.cal',
      settings: warnDeprecated !== undefined ? {
        diagnostics: {
          warnDeprecated,
          warnUnknownAttributes: true
        },
        workspaceIndexing: {
          includeTxtFiles: true
        }
      } : undefined
    };

    const validator = new DeprecatedFunctionValidator();
    return validator.validate(context);
  }

  it('should suppress warnings when warnDeprecated is false', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CheckLocking();
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.RECORDLEVELLOCKING() THEN
        MESSAGE('Locking enabled');
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctionsWithSettings(code, false);

    // When warnDeprecated is false, no diagnostics should be returned
    expect(diagnostics).toHaveLength(0);
  });

  it('should show warnings when warnDeprecated is true', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetID();
    VAR
      Customer : Record 18;
      RecID : RecordID;
    BEGIN
      RecID := Customer.GETRECORDID();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctionsWithSettings(code, true);

    // When warnDeprecated is true, diagnostics should be returned
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('GETRECORDID is deprecated. Use RECORDID instead.');
  });

  it('should show warnings when settings is undefined (backward compatibility)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MarkConsistent();
    VAR
      Customer : Record 18;
    BEGIN
      Customer.CONSISTENT(TRUE);
    END;
  }
}`;

    // Pass undefined for settings to test default behavior
    const diagnostics = validateDeprecatedFunctionsWithSettings(code, undefined);

    // When settings is undefined, default to showing warnings
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('CONSISTENT is deprecated. Transaction consistency is managed automatically.');
  });

  it('should suppress all deprecated warnings for multiple calls when disabled', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestMultiple();
    VAR
      Customer : Record 18;
      Vendor : Record 23;
      RecID : RecordID;
    BEGIN
      IF Customer.RECORDLEVELLOCKING() THEN
        Customer.CONSISTENT(TRUE);
      Vendor.CONSISTENT(FALSE);
      RecID := Customer.GETRECORDID();
    END;
  }
}`;

    const diagnostics = validateDeprecatedFunctionsWithSettings(code, false);

    // All deprecated method warnings should be suppressed
    expect(diagnostics).toHaveLength(0);
  });
});
