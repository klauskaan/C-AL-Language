/**
 * Package Exports Test
 *
 * Verifies that the clean exit criteria types from #91 are properly exported
 * from the package root entry point (server/src/index.ts).
 *
 * This test validates the public API surface without testing functionality
 * (which is already covered in lexer tests).
 */

import {
  ExitCategory,
  ExitViolation,
  CleanExitResult,
  CleanExitOptions
} from '../index';

describe('Package Exports', () => {
  describe('ExitCategory enum', () => {
    it('should be importable from package root', () => {
      expect(ExitCategory).toBeDefined();
    });

    it('should have STACK_MISMATCH value', () => {
      expect(ExitCategory.STACK_MISMATCH).toBe('stack-mismatch');
    });

    it('should have UNBALANCED_BRACES value', () => {
      expect(ExitCategory.UNBALANCED_BRACES).toBe('unbalanced-braces');
    });

    it('should have UNBALANCED_BRACKETS value', () => {
      expect(ExitCategory.UNBALANCED_BRACKETS).toBe('unbalanced-brackets');
    });

    it('should have INCOMPLETE_PROPERTY value', () => {
      expect(ExitCategory.INCOMPLETE_PROPERTY).toBe('incomplete-property');
    });

    it('should have INCOMPLETE_FIELD value', () => {
      expect(ExitCategory.INCOMPLETE_FIELD).toBe('incomplete-field');
    });

    it('should have CONTEXT_UNDERFLOW value', () => {
      expect(ExitCategory.CONTEXT_UNDERFLOW).toBe('context-underflow');
    });

    it('should have exactly 6 enum values (prevent scope creep)', () => {
      expect(Object.keys(ExitCategory).length).toBe(6);
    });
  });

  describe('ExitViolation interface', () => {
    it('should be usable as a type annotation', () => {
      // If this compiles, the interface is properly exported
      const violation: ExitViolation = {
        category: ExitCategory.STACK_MISMATCH,
        message: 'Test violation',
        expected: 'NORMAL',
        actual: 'OBJECT_LEVEL'
      };

      expect(violation.category).toBe(ExitCategory.STACK_MISMATCH);
      expect(violation.message).toBe('Test violation');
      expect(violation.expected).toBe('NORMAL');
      expect(violation.actual).toBe('OBJECT_LEVEL');
    });
  });

  describe('CleanExitResult interface', () => {
    it('should be usable as a type annotation for passing result', () => {
      // If this compiles, the interface is properly exported
      const result: CleanExitResult = {
        passed: true,
        violations: [],
        categories: new Set()
      };

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.categories.size).toBe(0);
    });

    it('should be usable as a type annotation for failing result', () => {
      const result: CleanExitResult = {
        passed: false,
        violations: [
          {
            category: ExitCategory.UNBALANCED_BRACES,
            message: 'Brace depth not zero',
            expected: 0,
            actual: 1
          }
        ],
        categories: new Set([ExitCategory.UNBALANCED_BRACES])
      };

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.categories.has(ExitCategory.UNBALANCED_BRACES)).toBe(true);
    });
  });

  describe('CleanExitOptions interface', () => {
    it('should be usable as a type annotation with no options', () => {
      // If this compiles, the interface is properly exported
      const options: CleanExitOptions = {};

      expect(options).toBeDefined();
      expect(options.allowRdldataUnderflow).toBeUndefined();
    });

    it('should be usable as a type annotation with allowRdldataUnderflow', () => {
      const options: CleanExitOptions = {
        allowRdldataUnderflow: true
      };

      expect(options.allowRdldataUnderflow).toBe(true);
    });
  });

  describe('combined import', () => {
    it('should allow all 4 types to be imported in a single statement', () => {
      // This test file itself proves this works (see import at top)
      // Just verify all are defined
      expect(ExitCategory).toBeDefined();
      expect(typeof ExitCategory).toBe('object');

      // For interfaces, we can only verify they compile (which they do above)
      // Create instances to prove they're usable
      const violation: ExitViolation = {
        category: ExitCategory.STACK_MISMATCH,
        message: 'test',
        expected: 0,
        actual: 1
      };
      const result: CleanExitResult = {
        passed: false,
        violations: [violation],
        categories: new Set([ExitCategory.STACK_MISMATCH])
      };
      const options: CleanExitOptions = {
        allowRdldataUnderflow: false
      };

      expect(violation).toBeDefined();
      expect(result).toBeDefined();
      expect(options).toBeDefined();
    });
  });
});
