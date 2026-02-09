/**
 * Unit tests for section boundary detection when BOTH braces are missing (Issue #289)
 *
 * Context: When malformed code has BOTH the current section's closing } missing
 * AND the next section's opening { missing, the parser's isSectionKeyword() fails
 * to detect the boundary because it requires CODE/CONTROLS/ELEMENTS to be followed by {.
 *
 * Root Cause: isSectionKeyword() uses isFollowedByLeftBrace() to distinguish
 * CODE/CONTROLS/ELEMENTS as section keywords vs identifiers. When the opening brace
 * is missing, the lookahead check fails, and the section isn't recognized as a boundary.
 *
 * Expected Behavior: Parser should detect CODE/CONTROLS/ELEMENTS as section boundaries
 * even when the opening brace is missing, report appropriate errors about missing braces,
 * but still preserve the CODE section in the AST.
 *
 * Each test creates malformed C/AL with specific missing braces and verifies:
 * 1. CODE section is detected in AST (ast.object?.code exists)
 * 2. Errors are reported about missing braces
 */

import { parseCode } from './parserTestHelpers';

describe('Section Boundary Detection - Missing Braces (Issue #289)', () => {
  describe('CONTROLS section missing } and CODE section missing {', () => {
    it('should detect CODE boundary when CONTROLS missing } and CODE missing {', () => {
      // Scenario: Page with CONTROLS items but missing closing }
      // followed immediately by CODE without opening {
      const code = `OBJECT Page 21 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;ContentArea ;ContainerType=ContentArea }
    { 2   ;1   ;Group     ;General     ;GroupType=Group }

  CODE
    VAR
      Text001@1000 : TextConst 'ENU=Hello';

    PROCEDURE TestProc();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // CRITICAL: CODE section MUST be detected despite missing braces
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');

      // Should have variables and procedures from CODE section
      expect(ast.object?.code?.variables).toBeDefined();
      expect(ast.object?.code?.variables?.length).toBeGreaterThan(0);
      expect(ast.object?.code?.procedures).toBeDefined();
      expect(ast.object?.code?.procedures?.length).toBeGreaterThan(0);

      // Errors expected about missing braces
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle CONTROLS with multiple items, missing }, CODE missing {', () => {
      // More realistic scenario with several control declarations
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
    CaptionML=ENU=Test Page;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;ContentArea ;ContainerType=ContentArea }
    { 2   ;1   ;Group     ;General     ;GroupType=Group }
    { 3   ;2   ;Field     ;MyField     ;SourceExpr=Name }
    { 4   ;2   ;Field     ;AnotherField;SourceExpr=Code }

  CODE
    VAR
      MyVar@1000 : Integer;

    PROCEDURE Initialize();
    BEGIN
      MyVar := 0;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // CODE section MUST be detected
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');
      expect(ast.object?.code?.procedures).toBeDefined();
      expect(ast.object?.code?.procedures?.length).toBe(1);

      // Errors expected
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ELEMENTS section missing } and CODE section missing {', () => {
    it('should detect CODE boundary when ELEMENTS missing } and CODE missing {', () => {
      // Scenario: XMLport with ELEMENTS items but missing closing }
      // followed immediately by CODE without opening {
      const code = `OBJECT XMLport 50000 "Test XMLport"
{
  PROPERTIES
  {
    Format=Variable Text;
  }
  ELEMENTS
  {
    { [{12345678-1234-1234-1234-123456789012}];0 ;Root        ;Element ;Text }
    { [{22345678-1234-1234-1234-123456789012}];1 ;Customer    ;Element ;Text }
    { [{32345678-1234-1234-1234-123456789012}];2 ;Name        ;Element ;Text }

  CODE
    VAR
      RecordCount@1000 : Integer;

    PROCEDURE GetCount() : Integer;
    BEGIN
      EXIT(RecordCount);
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // CRITICAL: CODE section MUST be detected despite missing braces
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');

      // Should have variables and procedures from CODE section
      expect(ast.object?.code?.variables).toBeDefined();
      expect(ast.object?.code?.variables?.length).toBeGreaterThan(0);
      expect(ast.object?.code?.procedures).toBeDefined();
      expect(ast.object?.code?.procedures?.length).toBeGreaterThan(0);

      // Errors expected about missing braces
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle ELEMENTS with nested structure, missing }, CODE missing {', () => {
      // More complex ELEMENTS structure
      const code = `OBJECT XMLport 50001 "Complex XMLport"
{
  PROPERTIES
  {
    Format=Variable Text;
  }
  ELEMENTS
  {
    { [{12345678-1234-1234-1234-123456789012}];0 ;Document    ;Element ;Text }
    { [{22345678-1234-1234-1234-123456789012}];1 ;Customers   ;Element ;Text }
    { [{32345678-1234-1234-1234-123456789012}];2 ;Customer    ;Element ;Table ;SourceTable=Customer }
    { [{42345678-1234-1234-1234-123456789012}];3 ;Name        ;Element ;Field ;SourceField=Name }
    { [{52345678-1234-1234-1234-123456789012}];3 ;Address     ;Element ;Field ;SourceField=Address }

  CODE
    VAR
      ProcessedCount@1000 : Integer;

    PROCEDURE OnAfterImport();
    BEGIN
      ProcessedCount := ProcessedCount + 1;
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // CODE section MUST be detected
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');
      expect(ast.object?.code?.procedures).toBeDefined();
      expect(ast.object?.code?.procedures?.length).toBe(1);

      // Errors expected
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Regression tests - Normal cases should still work', () => {
    it('should parse normal CONTROLS → CODE transition (both braces present)', () => {
      // This test should PASS even before fix (regression prevention)
      const code = `OBJECT Page 21 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;ContainerType=ContentArea }
    { 2   ;1   ;Group     ;GroupType=Group }
  }
  CODE
  {
    VAR
      Text001@1000 : TextConst 'ENU=Hello';

    PROCEDURE TestProc();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should parse cleanly
      expect(errors).toHaveLength(0);
      expect(ast.object?.controls).toBeDefined();
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');
    });

    it('should parse normal ELEMENTS → CODE transition (both braces present)', () => {
      // This test should PASS even before fix (regression prevention)
      const code = `OBJECT XMLport 50000 "Test XMLport"
{
  PROPERTIES
  {
    Format=Variable Text;
  }
  ELEMENTS
  {
    { [{12345678-1234-1234-1234-123456789012}];0 ;Root        ;Element ;Text }
    { [{22345678-1234-1234-1234-123456789012}];1 ;Customer    ;Element ;Text }
  }
  CODE
  {
    VAR
      RecordCount@1000 : Integer;

    PROCEDURE GetCount() : Integer;
    BEGIN
      EXIT(RecordCount);
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should parse cleanly
      expect(errors).toHaveLength(0);
      expect(ast.object?.elements).toBeDefined();
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');
    });

    it('should parse normal PROPERTIES → CODE transition (both braces present)', () => {
      // Normal codeunit - no CONTROLS/ELEMENTS involved
      const code = `OBJECT Codeunit 50000 "Test Codeunit"
{
  PROPERTIES
  {
    OnRun=BEGIN END;
  }
  CODE
  {
    VAR
      GlobalVar@1000 : Integer;

    PROCEDURE MyProc();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should parse cleanly
      expect(errors).toHaveLength(0);
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');
    });
  });

  describe('Edge cases', () => {
    it('should handle CODE missing { when it is the only section', () => {
      // Edge case: Malformed codeunit with CODE missing opening brace
      const code = `OBJECT Codeunit 50000 "Test"
{
  CODE
    VAR
      MyVar@1000 : Integer;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // CODE section should still be detected
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');

      // Error expected about missing opening brace
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle multiple sections with cascading missing braces', () => {
      // Pathological case: Multiple sections all missing braces
      const code = `OBJECT Page 50000 "Test"
{
  PROPERTIES
  {
    CaptionML=ENU=Test;

  CONTROLS
  {
    { 1   ;0   ;Container ;ContentArea ;ContainerType=ContentArea }

  CODE
    VAR
      MyVar@1000 : Integer;

    BEGIN
    END.
  }
}`;

      const { ast, errors } = parseCode(code);

      // Despite multiple errors, CODE section should be detected
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.type).toBe('CodeSection');

      // Multiple errors expected
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
