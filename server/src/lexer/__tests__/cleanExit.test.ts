/**
 * Lexer Tests - Clean Exit Criteria
 *
 * Tests the isCleanExit() method that validates lexer state after tokenization.
 * This feature detects incomplete or malformed C/AL input by checking:
 * - Context stack state (should be [NORMAL] at exit)
 * - Brace balance (braceDepth should be 0)
 * - Bracket balance (bracketDepth should be 0)
 * - Property value completeness (inPropertyValue should be false)
 * - Field definition completeness (fieldDefColumn should be NONE)
 */

import { Lexer, ExitCategory } from '../lexer';

describe('Lexer - Clean Exit Criteria', () => {
  describe('ExitCategory enum', () => {
    it('should have all expected category values', () => {
      // Verify enum exists and has the right values (kebab-case)
      expect(ExitCategory.STACK_MISMATCH).toBe('stack-mismatch');
      expect(ExitCategory.UNBALANCED_BRACES).toBe('unbalanced-braces');
      expect(ExitCategory.UNBALANCED_BRACKETS).toBe('unbalanced-brackets');
      expect(ExitCategory.INCOMPLETE_PROPERTY).toBe('incomplete-property');
      expect(ExitCategory.INCOMPLETE_FIELD).toBe('incomplete-field');
      expect(ExitCategory.CONTEXT_UNDERFLOW).toBe('context-underflow');
    });
  });

  describe('Passing cases - Well-formed input', () => {
    it('should pass for empty input', () => {
      const lexer = new Lexer('');
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.categories.size).toBe(0);
    });

    it('should pass for minimal complete object', () => {
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.categories.size).toBe(0);
    });

    it('should pass for complete object with CODE section', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
  }
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
      MESSAGE('Hello');
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.categories.size).toBe(0);
    });

    it('should pass for object with nested BEGIN/END blocks', () => {
      const code = `BEGIN
  IF condition THEN BEGIN
    DoSomething();
  END;
END`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.categories.size).toBe(0);
    });
  });

  describe('Failing cases - Context stack mismatch', () => {
    it('should fail when context stack is not [NORMAL] at exit', () => {
      // Missing closing brace for PROPERTIES section
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test;
`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.categories.has(ExitCategory.STACK_MISMATCH)).toBe(true);

      const stackViolation = result.violations.find(v => v.category === ExitCategory.STACK_MISMATCH);
      expect(stackViolation).toBeDefined();
      expect(stackViolation!.message).toContain('Context stack');
      expect(stackViolation!.expected).toContain('NORMAL');
    });

    it('should fail when multiple contexts remain on stack', () => {
      // Missing closing braces for both OBJECT and PROPERTIES
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.STACK_MISMATCH)).toBe(true);

      const stackViolation = result.violations.find(v => v.category === ExitCategory.STACK_MISMATCH);
      expect(stackViolation).toBeDefined();
      // Should indicate the actual stack depth/state
      expect(typeof stackViolation!.actual).toBe('string');
    });
  });

  describe('Failing cases - Unbalanced braces', () => {
    it('should fail when braceDepth > 0 (missing closing brace)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ; ; No. ; Code20
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.UNBALANCED_BRACES)).toBe(true);

      const braceViolation = result.violations.find(v => v.category === ExitCategory.UNBALANCED_BRACES);
      expect(braceViolation).toBeDefined();
      expect(braceViolation!.expected).toBe(0);
      expect(braceViolation!.actual).toBeGreaterThan(0);
    });

    it('should fail when braceDepth < 0 (extra closing brace)', () => {
      // Note: Current lexer prevents negative braceDepth in scanRightBrace,
      // so we mock the state directly to test the validation logic
      const lexer = new Lexer('');
      lexer.tokenize();

      // Mock impossible state: negative braceDepth
      // Access the state manager and set braceDepth directly
      (lexer as any).state.braceDepth = -1;

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.UNBALANCED_BRACES)).toBe(true);
    });
  });

  describe('Failing cases - Unbalanced brackets', () => {
    it('should fail when bracketDepth > 0 (missing closing bracket)', () => {
      // Note: Current lexer resets bracketDepth in certain contexts,
      // so we mock the state directly to test the validation logic
      const lexer = new Lexer('');
      lexer.tokenize();

      // Mock impossible state: unclosed bracket
      // Access the state manager and set bracketDepth directly
      (lexer as any).state.bracketDepth = 1;

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.UNBALANCED_BRACKETS)).toBe(true);

      const bracketViolation = result.violations.find(v => v.category === ExitCategory.UNBALANCED_BRACKETS);
      expect(bracketViolation).toBeDefined();
      expect(bracketViolation!.expected).toBe(0);
      expect(bracketViolation!.actual).toBeGreaterThan(0);
    });
  });

  describe('Failing cases - Incomplete property value', () => {
    it('should fail when inPropertyValue is true at exit', () => {
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    Caption=
`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.INCOMPLETE_PROPERTY)).toBe(true);

      const propertyViolation = result.violations.find(v => v.category === ExitCategory.INCOMPLETE_PROPERTY);
      expect(propertyViolation).toBeDefined();
      expect(propertyViolation!.expected).toBe(false);
      expect(propertyViolation!.actual).toBe(true);
    });
  });

  describe('Failing cases - Incomplete field definition', () => {
    it('should fail when fieldDefColumn is not NONE at exit', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ; ; No.
`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.INCOMPLETE_FIELD)).toBe(true);

      const fieldViolation = result.violations.find(v => v.category === ExitCategory.INCOMPLETE_FIELD);
      expect(fieldViolation).toBeDefined();
      expect(fieldViolation!.expected).toBe('NONE');
      expect(typeof fieldViolation!.actual).toBe('string');
      expect(fieldViolation!.actual).not.toBe('NONE');
    });
  });

  describe('Failing cases - Context underflow', () => {
    it('should fail when contextUnderflowDetected is true', () => {
      // Too many END keywords cause context underflow
      const code = `BEGIN
  x := 5;
END
END`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.CONTEXT_UNDERFLOW)).toBe(true);

      const underflowViolation = result.violations.find(v => v.category === ExitCategory.CONTEXT_UNDERFLOW);
      expect(underflowViolation).toBeDefined();
      expect(underflowViolation!.message).toContain('underflow');
    });
  });

  describe('Multiple failures', () => {
    it('should return ALL violations and categories when multiple issues exist', () => {
      // This input has multiple problems:
      // 1. Missing closing brace (unbalanced braces)
      // 2. Incomplete property value
      // 3. Context stack mismatch
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    Caption=Test
    Date=
`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
      expect(result.categories.size).toBeGreaterThan(1);

      // Should include multiple categories
      expect(result.categories.has(ExitCategory.STACK_MISMATCH)).toBe(true);
      expect(result.categories.has(ExitCategory.UNBALANCED_BRACES)).toBe(true);

      // Each violation should be present
      const stackViolation = result.violations.find(v => v.category === ExitCategory.STACK_MISMATCH);
      const braceViolation = result.violations.find(v => v.category === ExitCategory.UNBALANCED_BRACES);

      expect(stackViolation).toBeDefined();
      expect(braceViolation).toBeDefined();
    });
  });

  describe('Lenient mode - allowRdldataUnderflow', () => {
    it('should ignore context underflow when allowRdldataUnderflow is true', () => {
      // Code with context underflow
      const code = `BEGIN
  x := 5;
END
END`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit({ allowRdldataUnderflow: true });

      // Should pass because underflow is allowed
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.categories).not.toContain(ExitCategory.CONTEXT_UNDERFLOW);
    });

    it('should still fail for other issues even when allowRdldataUnderflow is true', () => {
      // Code with braceDepth mismatch (not underflow)
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ; ; No. ; Code20
`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit({ allowRdldataUnderflow: true });

      // Should STILL fail for brace mismatch
      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.UNBALANCED_BRACES)).toBe(true);
    });

    it('should use strict mode by default (allowRdldataUnderflow=false)', () => {
      const code = `BEGIN
END
END`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      // No options = strict mode
      const result = lexer.isCleanExit();

      expect(result.passed).toBe(false);
      expect(result.categories.has(ExitCategory.CONTEXT_UNDERFLOW)).toBe(true);
    });
  });

  describe('CleanExitResult interface structure', () => {
    it('should return result with correct structure', () => {
      const lexer = new Lexer('');
      lexer.tokenize();

      const result = lexer.isCleanExit();

      // Verify all required properties exist
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('categories');

      // Verify types
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(result.categories instanceof Set).toBe(true);
    });

    it('should include violation details in failed result', () => {
      const code = `OBJECT Table 50000 Test {`;
      const lexer = new Lexer(code);
      lexer.tokenize();

      const result = lexer.isCleanExit();

      expect(result.violations.length).toBeGreaterThan(0);

      const violation = result.violations[0];
      expect(violation).toHaveProperty('category');
      expect(violation).toHaveProperty('message');
      expect(violation).toHaveProperty('expected');
      expect(violation).toHaveProperty('actual');

      // Verify types
      expect(typeof violation.category).toBe('string');
      expect(typeof violation.message).toBe('string');
      expect(violation.message.length).toBeGreaterThan(0);
    });
  });
});
