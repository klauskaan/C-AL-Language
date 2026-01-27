/**
 * Lexer Tests - Section Keyword State Contamination in CODE Sections
 *
 * Tests for issue #260: Section keywords used as procedure names inside CODE
 * sections incorrectly set lastWasSectionKeyword=true and corrupt lexer state.
 *
 * TDD VALIDATION:
 * - Group A and B tests MUST FAIL before the fix
 * - Group C regression tests MUST PASS both before and after
 *
 * ROOT CAUSE:
 * When a section keyword (Fields, Keys, Controls, etc.) is used as a procedure name
 * inside a CODE section, the lexer:
 * 1. Sets lastWasSectionKeyword = true (incorrectly)
 * 2. May reset currentSectionType = null (incorrectly for CODE)
 * 3. Leaves this state set at end of tokenization (state contamination)
 *
 * CORRECT BEHAVIOR:
 * - Section keywords used as procedure names → treated as identifiers, NO state change
 * - After tokenization completes: currentSectionType=null, contextStack=['NORMAL']
 * - Context stack should be clean (no SECTION_LEVEL contamination)
 * - Internal flag lastWasSectionKeyword should be false (not directly testable via public API)
 *
 * Test Structure:
 * - Group A: Individual section keyword tests (state contamination validation)
 * - Group B: Integration test (multiple keywords in one CODE section)
 * - Group C: Regression tests (existing functionality must still work)
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Section Keyword State Contamination in CODE Sections', () => {
  /**
   * GROUP A: State Contamination Tests
   * These tests SHOULD FAIL initially, demonstrating the bug where section keywords
   * used as procedure names contaminate lexer state.
   */
  describe('Group A: State contamination for individual section keywords as procedure names', () => {
    /**
     * Helper function to test a single section keyword as a procedure name.
     * Verifies clean exit: currentSectionType=null, contextStack=['NORMAL']
     */
    function testSectionKeywordAsProcedureName(keyword: string): void {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ${keyword}@1();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const _tokens = lexer.tokenize();

      // Verify tokenization completed without errors
      const eofToken = _tokens.find(t => t.type === TokenType.EOF);
      expect(eofToken).toBeDefined();

      // Get final state after tokenization
      const state = lexer.getContextState();

      // CRITICAL ASSERTION: currentSectionType should be null after clean exit
      // This test WILL FAIL before the fix is applied if cleanup doesn't run
      expect(state.currentSectionType).toBe(null);

      // Verify context stack is clean (no SECTION_LEVEL contamination)
      // This test WILL FAIL before the fix if state cleanup doesn't pop contexts correctly
      expect(state.contextStack).toEqual(['NORMAL']);

      // Verify balanced braces
      expect(state.braceDepth).toBe(0);

      // Verify no context underflow detected
      expect(state.contextUnderflowDetected).toBe(false);
    }

    it('should clean state after Fields used as procedure name', () => {
      testSectionKeywordAsProcedureName('Fields');
    });

    it('should clean state after Keys used as procedure name', () => {
      testSectionKeywordAsProcedureName('Keys');
    });

    it('should clean state after Controls used as procedure name', () => {
      testSectionKeywordAsProcedureName('Controls');
    });

    it('should clean state after Elements used as procedure name', () => {
      testSectionKeywordAsProcedureName('Elements');
    });

    it('should clean state after DataItems used as procedure name', () => {
      testSectionKeywordAsProcedureName('DataItems');
    });

    it('should clean state after Actions used as procedure name', () => {
      testSectionKeywordAsProcedureName('Actions');
    });

    it('should clean state after Dataset used as procedure name', () => {
      testSectionKeywordAsProcedureName('Dataset');
    });

    it('should clean state after RequestPage used as procedure name', () => {
      testSectionKeywordAsProcedureName('RequestPage');
    });

    it('should clean state after Labels used as procedure name', () => {
      testSectionKeywordAsProcedureName('Labels');
    });

    it('should clean state after MenuNodes used as procedure name', () => {
      testSectionKeywordAsProcedureName('MenuNodes');
    });

    it('should clean state after Properties used as procedure name', () => {
      testSectionKeywordAsProcedureName('Properties');
    });

    it('should clean state after FieldGroups used as procedure name', () => {
      testSectionKeywordAsProcedureName('FieldGroups');
    });

    it('should clean state after RequestForm used as procedure name', () => {
      testSectionKeywordAsProcedureName('RequestForm');
    });

    it('should clean state after Code used as procedure name', () => {
      testSectionKeywordAsProcedureName('Code');
    });
  });

  /**
   * GROUP B: Integration Test
   * Tests multiple section keywords as procedure names in a single CODE section.
   * This test SHOULD FAIL initially, demonstrating cumulative state contamination.
   */
  describe('Group B: Integration test with multiple section keywords', () => {
    it('should clean state after multiple section keywords used as procedure names', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Fields@1();
    BEGIN
    END;

    PROCEDURE Controls@2();
    BEGIN
    END;

    PROCEDURE Properties@3();
    BEGIN
    END;

    PROCEDURE Code@4();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const _tokens = lexer.tokenize();

      // Verify tokenization completed
      const eofToken = _tokens.find(t => t.type === TokenType.EOF);
      expect(eofToken).toBeDefined();

      // Get final state
      const state = lexer.getContextState();

      // CRITICAL ASSERTIONS: State should be completely clean after tokenization
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.contextUnderflowDetected).toBe(false);

      // Verify all procedures were tokenized correctly
      const procedureTokens = _tokens.filter(t => t.type === TokenType.Procedure);
      expect(procedureTokens).toHaveLength(4);

      // Verify no UNKNOWN tokens (@ is allowed as UNKNOWN per auto-numbering.test.ts)
      const unknownTokens = _tokens.filter(t => t.type === TokenType.Unknown && t.value !== '@');
      expect(unknownTokens).toHaveLength(0);
    });
  });

  /**
   * GROUP C: Regression Tests
   * These tests MUST PASS both before and after the fix.
   * They verify that fixing the bug doesn't break existing functionality.
   */
  describe('Group C: Regression tests for existing section keyword functionality', () => {
    it('should still tokenize REQUESTPAGE with nested CONTROLS and PROPERTIES sections', () => {
      const code = `OBJECT Report 50000 Test
{
  REQUESTPAGE
  {
    CONTROLS
    {
      { 1   ;   ;Control1 ;Container }
    }
    PROPERTIES
    {
      CaptionML=ENU=Test;
    }
  }
}`;

      const lexer = new Lexer(code);
      const _tokens = lexer.tokenize();

      // Verify all section keywords are recognized
      const requestPageToken = _tokens.find(t => t.type === TokenType.RequestPage);
      expect(requestPageToken).toBeDefined();

      const controlsToken = _tokens.find(t => t.type === TokenType.Controls);
      expect(controlsToken).toBeDefined();

      const propertiesToken = _tokens.find(t => t.type === TokenType.Properties);
      expect(propertiesToken).toBeDefined();

      // Verify clean exit
      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should still tokenize normal section keywords at OBJECT_LEVEL', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.   ;Code20 }
  }
  KEYS
  {
    { ;No. ;Clustered=Yes }
  }
  CODE
  {
    PROCEDURE Test@1();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const _tokens = lexer.tokenize();

      // Verify section keywords are recognized
      const fieldsToken = _tokens.find(t => t.type === TokenType.Fields);
      expect(fieldsToken).toBeDefined();

      const keysToken = _tokens.find(t => t.type === TokenType.Keys);
      expect(keysToken).toBeDefined();

      const codeToken = _tokens.find(t => t.type === TokenType.Code);
      expect(codeToken).toBeDefined();

      // Verify clean exit
      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.contextUnderflowDetected).toBe(false);

      // Verify no UNKNOWN tokens (@ is allowed as UNKNOWN per auto-numbering.test.ts)
      const unknownTokens = _tokens.filter(t => t.type === TokenType.Unknown && t.value !== '@');
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle section keywords as procedure names mixed with normal sections', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.   ;Code20 }
  }
  CODE
  {
    PROCEDURE Fields@1();
    BEGIN
    END;

    PROCEDURE Keys@2();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const _tokens = lexer.tokenize();

      // Verify FIELDS section keyword (structural)
      const fieldsSectionTokens = _tokens.filter(t => t.type === TokenType.Fields);
      expect(fieldsSectionTokens.length).toBeGreaterThanOrEqual(1);

      // Find CODE section keyword
      const codeToken = _tokens.find(t => t.type === TokenType.Code);
      expect(codeToken).toBeDefined();

      // Verify procedures exist
      const procedureTokens = _tokens.filter(t => t.type === TokenType.Procedure);
      expect(procedureTokens).toHaveLength(2);

      // Verify clean exit
      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.contextUnderflowDetected).toBe(false);
    });
  });

  /**
   * EDGE CASES
   * Additional edge case scenarios to ensure robustness
   */
  describe('Edge cases', () => {
    it('should handle section keyword as procedure name immediately after CODE section start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Fields@1();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      lexer.tokenize();

      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle section keyword procedure with no parameters or body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Controls@1();
  }
}`;

      const lexer = new Lexer(code);
      lexer.tokenize();

      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle section keyword as local procedure name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE Actions@1();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      lexer.tokenize();

      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle multiple section keyword procedures in nested BEGIN...END blocks', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Main@1();
    BEGIN
      IF TRUE THEN BEGIN
        Fields();
        Controls();
      END;
    END;

    PROCEDURE Fields@2();
    BEGIN
    END;

    PROCEDURE Controls@3();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      lexer.tokenize();

      const state = lexer.getContextState();
      expect(state.currentSectionType).toBe(null);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
      expect(state.braceDepth).toBe(0);
    });
  });
});
