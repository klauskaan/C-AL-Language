/**
 * Advisory Builtin Validator Tests
 *
 * Tests for semantic validator that emits INFORMATION-level diagnostics for
 * no-op-on-RTC builtins (builtins that always return a fixed value on NAV 2013+
 * service tier). Seeded with ISSERVICETIER (always TRUE on NAV 2013+).
 *
 * Diagnostic:
 * - Message: "<FunctionName> always returns TRUE on NAV 2013+. [advice]"
 * - Severity: Information
 * - Code: 'advisory-builtin'
 * - Source: 'cal'
 * - Tags: undefined (not deprecated/unnecessary)
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { AdvisoryBuiltinValidator } from '../advisoryBuiltinValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Base helper — lex, parse, build SymbolTable, construct ValidationContext, run validator.
 */
function validateAdvisory(code: string): Diagnostic[] {
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

  const validator = new AdvisoryBuiltinValidator();
  return validator.validate(context);
}

/**
 * Settings-aware helper — mirrors the pattern in deprecatedFunctionValidator.test.ts.
 * warnAdvisory is optional; when undefined, no settings object is passed → default-on.
 */
function validateAdvisoryWithSettings(
  code: string,
  warnAdvisory?: boolean
): Diagnostic[] {
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
    documentUri: 'file:///test.cal',
    settings: warnAdvisory !== undefined ? {
      diagnostics: {
        warnDeprecated: true,
        warnUnknownAttributes: true,
        warnActionNesting: true,
        warnAdvisory
      },
      workspaceIndexing: {
        includeTxtFiles: true
      }
    } : undefined
  };

  const validator = new AdvisoryBuiltinValidator();
  return validator.validate(context);
}

// ---------------------------------------------------------------------------
// Positive — should flag
// ---------------------------------------------------------------------------

describe('AdvisoryBuiltinValidator - Positive (should flag)', () => {
  it('should flag bare parenless ISSERVICETIER in an IF condition', () => {
    // The dominant C/AL idiom: IF ISSERVICETIER THEN ...
    const code = `OBJECT Codeunit 50001 AdvisoryPositiveA
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF ISSERVICETIER THEN
        MESSAGE('Running on service tier');
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should flag ISSERVICETIER() with parentheses (no double-count)', () => {
    const code = `OBJECT Codeunit 50002 AdvisoryPositiveB
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF ISSERVICETIER() THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should flag SYSTEM.ISSERVICETIER (member access, no parens)', () => {
    const code = `OBJECT Codeunit 50003 AdvisoryPositiveC
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF SYSTEM.ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should flag SYSTEM.ISSERVICETIER() (member access, with parens)', () => {
    const code = `OBJECT Codeunit 50004 AdvisoryPositiveD
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF SYSTEM.ISSERVICETIER() THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should flag lowercase isservicetier (case-insensitive)', () => {
    const code = `OBJECT Codeunit 50005 AdvisoryPositiveE
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF isservicetier THEN
        MESSAGE('OK');
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should flag mixed-case IsServiceTier (case-insensitive)', () => {
    const code = `OBJECT Codeunit 50006 AdvisoryPositiveF
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF IsServiceTier THEN
        MESSAGE('OK');
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should produce correct severity, code, source, tags, and range on ISSERVICETIER', () => {
    // prettier-ignore
    // Location assertions depend on fixture structure - do not reformat
    const code = `OBJECT Codeunit 50007 AdvisoryExactAssert
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];

    // Exact message assertion (one test is enough)
    expect(diag.message).toBe('ISSERVICETIER always returns TRUE on NAV 2013+ (RTC); the classic client is gone, so this call is a constant and any conditional logic on it is dead.');

    expect(diag.severity).toBe(DiagnosticSeverity.Information);
    expect(diag.code).toBe('advisory-builtin');
    expect(diag.source).toBe('cal');

    // Tags must be ABSENT — advisory is not deprecated/unnecessary
    expect(diag.tags).toBeUndefined();

    // Range must be a well-formed single-line span over the token
    const range = diag.range;
    expect(range).toBeDefined();
    expect(range.start.line).toBe(range.end.line);
    expect(range.start.character).toBeLessThan(range.end.character);
  });
});

// ---------------------------------------------------------------------------
// Shadowing — the #809/#813 core
// ---------------------------------------------------------------------------

describe('AdvisoryBuiltinValidator - Shadowing', () => {
  it('SYSTEM.ISSERVICETIER is flagged even when a same-named global variable exists', () => {
    // SYSTEM. prefix bypasses any user shadow — must still flag
    const code = `OBJECT Codeunit 50008 AdvisoryShadowA
{
  CODE
  {
    VAR
      ISSERVICETIER : Boolean;

    PROCEDURE CheckTier();
    BEGIN
      IF SYSTEM.ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('bare ISSERVICETIER is NOT flagged when shadowed by a user PROCEDURE named ISSERVICETIER', () => {
    // Unqualified call resolves to the user procedure, not the builtin
    const code = `OBJECT Codeunit 50009 AdvisoryShadowB
{
  CODE
  {
    PROCEDURE DoCheck();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
    END;

    PROCEDURE ISSERVICETIER() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('bare ISSERVICETIER is NOT flagged when shadowed by a global VARIABLE named ISSERVICETIER', () => {
    // Unqualified reference resolves to the variable, not the builtin
    const code = `OBJECT Codeunit 50010 AdvisoryShadowC
{
  CODE
  {
    VAR
      ISSERVICETIER : Boolean;

    PROCEDURE DoCheck();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('combined: shadowing procedure present, SYSTEM. form fires, bare form does not', () => {
    // SYSTEM.ISSERVICETIER must produce exactly 1 diagnostic; bare ISSERVICETIER must not.
    const code = `OBJECT Codeunit 50011 AdvisoryShadowD
{
  CODE
  {
    PROCEDURE DoCheck();
    BEGIN
      IF SYSTEM.ISSERVICETIER THEN
        EXIT;
      IF ISSERVICETIER THEN
        EXIT;
    END;

    PROCEDURE ISSERVICETIER() : Boolean;
    BEGIN
      EXIT(FALSE);
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });
});

// ---------------------------------------------------------------------------
// Controlled-traversal regression — hazards introduced by visitor design
// ---------------------------------------------------------------------------

describe('AdvisoryBuiltinValidator - Controlled-traversal regression', () => {
  it('should produce exactly 2 diagnostics for two distinct bare ISSERVICETIER sites', () => {
    const code = `OBJECT Codeunit 50012 AdvisoryTraversalA
{
  CODE
  {
    PROCEDURE CheckTwice();
    BEGIN
      IF ISSERVICETIER THEN
        MESSAGE('First');
      IF ISSERVICETIER THEN
        MESSAGE('Second');
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(2);
  });

  it('SYSTEM.ISSERVICETIER AND bare ISSERVICETIER in one boolean expression → 2 diagnostics (no dropped sibling)', () => {
    // Validates that visitMemberExpression's return-false does NOT prune the AND sibling
    const code = `OBJECT Codeunit 50013 AdvisoryTraversalB
{
  CODE
  {
    PROCEDURE CheckBoth();
    BEGIN
      IF SYSTEM.ISSERVICETIER AND ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(2);
  });

  it('should flag ISSERVICETIER in argument position (call args are walked)', () => {
    // Advisory in argument position: FOO(ISSERVICETIER) — FOO is a user procedure
    const code = `OBJECT Codeunit 50014 AdvisoryTraversalC
{
  CODE
  {
    PROCEDURE DoWork();
    BEGIN
      LogTier(ISSERVICETIER);
    END;

    PROCEDURE LogTier(IsTier : Boolean);
    BEGIN
      MESSAGE('%1', IsTier);
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('mixed forms across statements: bare + SYSTEM. + parens → exactly 3 diagnostics', () => {
    const code = `OBJECT Codeunit 50015 AdvisoryTraversalD
{
  CODE
  {
    PROCEDURE CheckMixed();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
      IF SYSTEM.ISSERVICETIER THEN
        EXIT;
      IF ISSERVICETIER() THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Negative — must NOT flag
// ---------------------------------------------------------------------------

describe('AdvisoryBuiltinValidator - Negative (must NOT flag)', () => {
  it('should not flag MESSAGE (non-advisory builtin)', () => {
    const code = `OBJECT Codeunit 50016 AdvisoryNegativeA
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      MESSAGE('hi');
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag GUIALLOWED — advisory scope guard: not seeded', () => {
    // GUIALLOWED is NOT in the advisory seed set; must produce 0 advisory diagnostics
    const code = `OBJECT Codeunit 50017 AdvisoryNegativeB
{
  CODE
  {
    PROCEDURE CheckGUI();
    BEGIN
      IF GUIALLOWED THEN
        MESSAGE('GUI available');
      IF GUIALLOWED THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not produce advisory diagnostics for a deprecated record method', () => {
    // CONSISTENT is deprecated-only — the advisory validator must not fire on it
    const code = `OBJECT Codeunit 50018 AdvisoryNegativeC
{
  CODE
  {
    PROCEDURE DoWork();
    VAR
      Cust : Record 18;
    BEGIN
      Cust.CONSISTENT(TRUE);
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    // advisory-builtin diagnostics only — deprecated is a different validator
    const advisoryDiags = diagnostics.filter(d => d.code === 'advisory-builtin');
    expect(advisoryDiags).toHaveLength(0);
  });

  it('should handle empty CODE section gracefully (zero diagnostics)', () => {
    const code = `OBJECT Codeunit 50019 AdvisoryNegativeD
{
  CODE
  {
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('should handle code with no procedures at all (zero diagnostics)', () => {
    // A table object has no CODE section — validator must be graceful
    const code = `OBJECT Table 50020 AdvisoryNegativeE
{
  FIELDS
  {
    { 1   ;   ;No.   ;Code20 }
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('member access on NON-SYSTEM receiver with advisory-named property (no parens) must NOT be flagged', () => {
    // Guards the member-property false-positive: OtherRec.ISSERVICETIER is a field access,
    // not a call to the global builtin. The property name must not route through visitIdentifier.
    const code = `OBJECT Codeunit 50024 AdvisoryNegativeF
{
  CODE
  {
    PROCEDURE DoWork();
    VAR
      OtherRec : Record 18;
    BEGIN
      IF OtherRec.ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });

  it('member CALL on NON-SYSTEM receiver with advisory-named method must NOT be flagged', () => {
    // Guards the member-property false-positive: SomeCu.ISSERVICETIER() is a codeunit
    // method call, not a call to the global builtin. The property must not be walked
    // through visitIdentifier regardless of whether the receiver is a codeunit variable.
    const code = `OBJECT Codeunit 50025 AdvisoryNegativeG
{
  CODE
  {
    PROCEDURE DoWork();
    VAR
      SomeCu : Codeunit 50099;
    BEGIN
      IF SomeCu.ISSERVICETIER() THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisory(code);

    expect(diagnostics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Settings — warnAdvisory flag
// ---------------------------------------------------------------------------

describe('AdvisoryBuiltinValidator - Configuration (warnAdvisory setting)', () => {
  it('should suppress advisory diagnostics when warnAdvisory is false', () => {
    const code = `OBJECT Codeunit 50021 AdvisorySettingsA
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisoryWithSettings(code, false);

    expect(diagnostics).toHaveLength(0);
  });

  it('should emit advisory diagnostics when warnAdvisory is true', () => {
    const code = `OBJECT Codeunit 50022 AdvisorySettingsB
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisoryWithSettings(code, true);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });

  it('should emit advisory diagnostics when settings is undefined (default-on backward-compat)', () => {
    // No settings object at all → advisory warnings are on by default
    const code = `OBJECT Codeunit 50023 AdvisorySettingsC
{
  CODE
  {
    PROCEDURE CheckTier();
    BEGIN
      IF ISSERVICETIER THEN
        EXIT;
    END;
  }
}`;

    const diagnostics = validateAdvisoryWithSettings(code, undefined);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].message).toContain('always returns TRUE on NAV 2013+');
  });
});
