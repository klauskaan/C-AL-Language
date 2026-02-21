/**
 * Unknown Attribute Validator Tests
 *
 * Tests for semantic validator that detects unknown procedure attributes in C/AL code.
 *
 * The validator detects:
 * - Unknown attribute names (e.g., [Extrnal], [TryFuncion])
 * - AL-only attributes (e.g., [Scope], [IntegrationEvent])
 * - Typos in valid C/AL attributes
 *
 * Valid C/AL attributes (9 total):
 * - [External] - NAV 2016+
 * - [TryFunction] - All C/AL versions
 * - [Integration(Include)] - NAV 2016+
 * - [EventSubscriber(...)] - NAV 2016+
 * - [Test] - NAV 2016+
 * - [CheckPrecondition] - NAV 2016+
 * - [TableSyncSetup] - NAV 2016+
 * - [Internal] - NAV 2017+
 * - [ServiceEnabled] - NAV 2017+
 *
 * AL-only attributes (not valid in C/AL):
 * - [Business] - AL-only
 * - [InternalEvent] - AL-only
 * - [Scope] - AL-only
 * - [BusinessEvent] - AL-only
 *
 * Diagnostic:
 * - Message: "Unknown attribute '[AttributeName]'"
 * - Message with suggestion: "Unknown attribute '[AttributeName]'. Did you mean '[SuggestedName]'?"
 * - Severity: Warning
 * - Source: 'cal'
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { UnknownAttributeValidator } from '../unknownAttributeValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run unknown attribute validation
 */
function validateUnknownAttributes(
  code: string,
  warnUnknownAttributes?: boolean
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
    settings: warnUnknownAttributes !== undefined ? {
      diagnostics: {
        warnDeprecated: true,
        warnUnknownAttributes,
        warnActionNesting: true
      },
      workspaceIndexing: {
        includeTxtFiles: true
      }
    } : undefined
  };

  const validator = new UnknownAttributeValidator();
  return validator.validate(context);
}

describe('UnknownAttributeValidator - Valid C/AL Attributes', () => {
  it('should not flag [External] attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [TryFunction] attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [TryFunction]
    PROCEDURE TryDoSomething() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [Integration(TRUE)] attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integration(TRUE)]
    PROCEDURE OnBeforePost(VAR Rec : Record 18);
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [Integration(FALSE)] attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integration(FALSE)]
    PROCEDURE OnAfterPost(VAR Rec : Record 18);
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [EventSubscriber] attribute with all parameters', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscriber(Table,5330,OnAfterInsertEvent)]
    PROCEDURE HandleItemInsert(VAR Rec : Record 5330);
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [Test] attribute', () => {
    const code = `OBJECT Codeunit 50000 TestCodeunit
{
  PROPERTIES
  {
    Subtype=Test;
  }
  CODE
  {
    [Test]
    PROCEDURE RunTest();
    BEGIN
    END;
  }
}`;
    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [CheckPrecondition] attribute', () => {
    const code = `OBJECT Codeunit 50000 UpgradeCodeunit
{
  PROPERTIES
  {
    Subtype=Upgrade;
  }
  CODE
  {
    [CheckPrecondition]
    PROCEDURE CheckPreconditions();
    BEGIN
    END;
  }
}`;
    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [TableSyncSetup] attribute', () => {
    const code = `OBJECT Codeunit 50000 UpgradeCodeunit
{
  PROPERTIES
  {
    Subtype=Upgrade;
  }
  CODE
  {
    [TableSyncSetup]
    PROCEDURE GetTableSyncSetup(VAR TableSynchSetup : Record 2000000135);
    BEGIN
    END;
  }
}`;
    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

});

describe('UnknownAttributeValidator - Case Insensitivity', () => {
  it('should not flag [external] in lowercase', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [external]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [EXTERNAL] in uppercase', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EXTERNAL]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [tryfunction] in lowercase', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [tryfunction]
    PROCEDURE TryIt() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [EVENTSUBSCRIBER] in uppercase', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EVENTSUBSCRIBER(Table,18,OnAfterModifyEvent)]
    PROCEDURE HandleModify(VAR Rec : Record 18);
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag [Integration] in mixed case', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integration(TRUE)]
    PROCEDURE OnEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });
});

describe('UnknownAttributeValidator - Unknown Attributes with Suggestions', () => {
  it('should flag [Extrnal] with suggestion "External"', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Extrnal]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[Extrnal]'. Did you mean 'External'?");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.code).toBe('unknown-attribute');
    expect(diag.source).toBe('cal');
  });

  it('should flag [Exteranl] with suggestion "External"', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Exteranl]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[Exteranl]'. Did you mean 'External'?");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [TryFuncion] with suggestion "TryFunction"', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [TryFuncion]
    PROCEDURE TryIt() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[TryFuncion]'. Did you mean 'TryFunction'?");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [Integraton] with suggestion "Integration"', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integraton(TRUE)]
    PROCEDURE OnEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[Integraton]'. Did you mean 'Integration'?");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [EventSubscribers] with suggestion "EventSubscriber"', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscribers]
    PROCEDURE HandleEvent(VAR Rec : Record 18);
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[EventSubscribers]'. Did you mean 'EventSubscriber'?");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });
});

describe('UnknownAttributeValidator - Unknown Attributes without Suggestions', () => {
  it('should flag [FooBar] without suggestion (no close match)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [FooBar]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[FooBar]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [CustomAttribute] without suggestion', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [CustomAttribute]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[CustomAttribute]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });
});

describe('UnknownAttributeValidator - AL-Only Attributes', () => {
  it('should produce no diagnostics for [Internal] (valid C/AL attribute, NAV 2017+)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Internal]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should flag [Business] as unknown attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Business]
    PROCEDURE DoBusinessLogic();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[Business]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [InternalEvent] as AL-only attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [InternalEvent]
    PROCEDURE OnCustomEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[InternalEvent]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should produce no diagnostics for [ServiceEnabled] (valid C/AL attribute, NAV 2017+)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [ServiceEnabled]
    PROCEDURE WebServiceMethod();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should flag [Scope] as AL-only attribute', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Scope]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[Scope]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [IntegrationEvent] as not valid in C/AL', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [IntegrationEvent]
    PROCEDURE OnCustomEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toContain("Unknown attribute '[IntegrationEvent]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [BusinessEvent] as AL-only', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [BusinessEvent]
    PROCEDURE OnBusinessEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[BusinessEvent]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });

  it('should flag [Obsolete] as AL-only', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Obsolete]
    PROCEDURE OldMethod();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[Obsolete]'");
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.source).toBe('cal');
  });
});

describe('UnknownAttributeValidator - Multiple Attributes', () => {
  it('should flag only the unknown attribute when mixed with valid ones', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    [FooBar]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe("Unknown attribute '[FooBar]'");
  });

  it('should flag multiple unknown attributes on same procedure', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [FooBar]
    [Extrnal]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(2);

    const fooBar = diagnostics.find(d => d.message.includes('FooBar'));
    expect(fooBar).toBeDefined();
    expect(fooBar!.message).toBe("Unknown attribute '[FooBar]'");

    const extrnal = diagnostics.find(d => d.message.includes('Extrnal'));
    expect(extrnal).toBeDefined();
    expect(extrnal!.message).toBe("Unknown attribute '[Extrnal]'. Did you mean 'External'?");
  });

  it('should not flag valid attributes when multiple are present', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    [TryFunction]
    PROCEDURE TryDoSomething() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });
});

describe('UnknownAttributeValidator - Multiple Procedures', () => {
  it('should flag unknown attributes across multiple procedures', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Extrnal]
    PROCEDURE First();
    BEGIN
    END;

    [External]
    PROCEDURE Second();
    BEGIN
    END;

    [TryFuncion]
    PROCEDURE Third() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(2);

    const extrnal = diagnostics.find(d => d.message.includes('Extrnal'));
    expect(extrnal).toBeDefined();

    const tryFuncion = diagnostics.find(d => d.message.includes('TryFuncion'));
    expect(tryFuncion).toBeDefined();
  });
});

describe('UnknownAttributeValidator - Diagnostic Range Accuracy', () => {
  it('should position diagnostic on the attribute name', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Extrnal]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);

    expect(diagnostics).toHaveLength(1);

    // Range should be defined and span the attribute
    const range = diagnostics[0].range;
    expect(range).toBeDefined();
    expect(range.start.line).toBeLessThanOrEqual(range.end.line);
    expect(range.start.character).toBeLessThan(range.end.character);
  });
});

describe('UnknownAttributeValidator - Configuration (warnUnknownAttributes setting)', () => {
  it('should suppress warnings when warnUnknownAttributes is false', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Extrnal]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code, false);

    // When warnUnknownAttributes is false, no diagnostics should be returned
    expect(diagnostics).toHaveLength(0);
  });

  it('should show warnings when warnUnknownAttributes is true', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [FooBar]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code, true);

    // When warnUnknownAttributes is true, diagnostics should be returned
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Unknown attribute '[FooBar]'");
  });

  it('should show warnings when settings is undefined (default behavior)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [CustomAttr]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    // Pass undefined for settings to test default behavior
    const diagnostics = validateUnknownAttributes(code, undefined);

    // When settings is undefined, default to showing warnings
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Unknown attribute '[CustomAttr]'");
  });

  it('should suppress all unknown attribute warnings when disabled', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [FooBar]
    PROCEDURE First();
    BEGIN
    END;

    [Extrnal]
    PROCEDURE Second();
    BEGIN
    END;

    [CustomAttr]
    PROCEDURE Third();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code, false);

    // All unknown attribute warnings should be suppressed
    expect(diagnostics).toHaveLength(0);
  });
});

describe('UnknownAttributeValidator - Edge Cases', () => {
  it('should handle code with no procedures gracefully', () => {
    const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle empty code section', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle procedure without attributes', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
      MESSAGE('No attributes');
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle parse errors gracefully', () => {
    const code = `OBJECT InvalidType 1 Test
{
  CODE
  {
    [External]
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x :=
    END;
  }
}`;

    // Should not throw even if there are parse errors
    expect(() => validateUnknownAttributes(code)).not.toThrow();
  });
});

describe('UnknownAttributeValidator - Levenshtein Distance Calculations', () => {
  /**
   * These tests verify the suggestion algorithm behavior.
   * Suggestions should appear when edit distance <= 2.
   */

  it('should suggest "External" for "Extrnal" (distance 1: missing e)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Extrnal]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("Did you mean 'External'?");
  });

  it('should suggest "TryFunction" for "TryFuncion" (distance 1: wrong letter)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [TryFuncion]
    PROCEDURE TryIt() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("Did you mean 'TryFunction'?");
  });

  it('should suggest "Integration" for "Integraton" (distance 1: missing i)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integraton]
    PROCEDURE OnEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("Did you mean 'Integration'?");
  });

  it('should suggest "EventSubscriber" for "EventSubscriber" (distance 1: extra letter)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscribers]
    PROCEDURE HandleEvent();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("Did you mean 'EventSubscriber'?");
  });

  it('should NOT suggest for "FooBar" (distance too large)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [FooBar]
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Unknown attribute '[FooBar]'");
    expect(diagnostics[0].message).not.toContain("Did you mean");
  });
});

describe('UnknownAttributeValidator - Real-World Patterns', () => {
  it('should flag typo in event subscriber pattern', () => {
    const code = `OBJECT Codeunit 50000 "Sales Event Handler"
{
  CODE
  {
    [EventSubscribr(Table,36,OnAfterValidateEvent)]
    PROCEDURE HandleSalesHeaderValidation(VAR Rec : Record 36;VAR xRec : Record 36;CurrFieldNo : Integer);
    BEGIN
      // Custom validation logic
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("EventSubscriber");
  });

  it('should flag typo in integration event pattern', () => {
    const code = `OBJECT Codeunit 50000 "Custom Events"
{
  CODE
  {
    [Integraton(TRUE)]
    PROCEDURE OnBeforeCustomAction(VAR AllowAction : Boolean);
    BEGIN
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("Did you mean 'Integration'?");
  });

  it('should flag typo in try function pattern', () => {
    const code = `OBJECT Codeunit 50000 "Error Handler"
{
  CODE
  {
    [TryFuncion]
    PROCEDURE TrySaveRecord(VAR Rec : Record 18) : Boolean;
    BEGIN
      EXIT(Rec.INSERT(TRUE));
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("Did you mean 'TryFunction'?");
  });

  it('should handle external procedure with valid attribute', () => {
    const code = `OBJECT Codeunit 50000 "API Handler"
{
  CODE
  {
    [External]
    PROCEDURE GetCustomerData(CustomerNo : Code[20]) : Text;
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.GET(CustomerNo) THEN
        EXIT(Customer.Name);
      EXIT('');
    END;
  }
}`;

    const diagnostics = validateUnknownAttributes(code);
    expect(diagnostics).toHaveLength(0);
  });
});
