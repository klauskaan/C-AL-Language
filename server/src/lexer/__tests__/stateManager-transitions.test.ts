/**
 * Tests for LexerStateManager ContextTransition feature (Issue #225)
 *
 * These tests verify that StateManager methods return ContextTransition objects
 * that the Lexer can use to emit trace events for context changes.
 */

import { LexerStateManager, LexerContext } from '../stateManager';

/**
 * ContextTransition interface - to be implemented in stateManager.ts
 */
export interface ContextTransition {
  type: 'push' | 'pop';
  from: LexerContext;
  to: LexerContext;
}

describe('LexerStateManager - ContextTransition feature', () => {
  describe('onObjectKeyword() - returns push transition', () => {
    it('should return push transition from NORMAL to OBJECT_LEVEL', () => {
      const manager = new LexerStateManager();

      // Expected: onObjectKeyword() now returns ContextTransition | null
      const transition = manager.onObjectKeyword(0);

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.NORMAL,
        to: LexerContext.OBJECT_LEVEL,
      });

      // Verify context actually changed
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);
    });

    it('should return null when called in OBJECT_LEVEL context (no transition)', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // First call pushes OBJECT_LEVEL

      // Second OBJECT keyword doesn't change context (stays in OBJECT_LEVEL)
      const transition = manager.onObjectKeyword(5);

      // No context transition occurred (already in OBJECT_LEVEL)
      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);
    });
  });

  describe('onOpenBrace() - returns push transition for section braces', () => {
    it('should return push transition when opening section after section keyword', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onSectionKeyword('FIELDS');

      // Opening brace after FIELDS keyword pushes SECTION_LEVEL
      const transition = manager.onOpenBrace();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.OBJECT_LEVEL,
        to: LexerContext.SECTION_LEVEL,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null for non-section braces (field definitions)', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Section opening - returns transition

      // Field definition brace - doesn't change context
      const transition = manager.onOpenBrace();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null for object-level braces', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);

      // OBJECT { ... } opening brace - doesn't change context
      const transition = manager.onOpenBrace();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);
    });
  });

  describe('onCloseBrace() - returns pop transition at section boundaries', () => {
    it('should return pop transition when closing section at entry depth', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();          // braceDepth: 1
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();          // braceDepth: 2, sectionEntryDepth: 2

      // Close section brace
      const transition = manager.onCloseBrace();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'pop',
        from: LexerContext.SECTION_LEVEL,
        to: LexerContext.OBJECT_LEVEL,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);
    });

    it('should return null for nested field braces inside section', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();          // braceDepth: 1
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();          // braceDepth: 2, sectionEntryDepth: 2
      manager.onOpenBrace();          // braceDepth: 3, field definition

      // Close field definition brace (braceDepth 3→2)
      const transition = manager.onCloseBrace();

      expect(transition).toBeNull(); // Not closing section, just closing field
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should handle section closure scenario from reviewer', () => {
      // OBJECT Table 1 {        // braceDepth: 1
      //   FIELDS {              // braceDepth: 2, sectionEntryDepth = 2
      //     { 1;;Name;Code20 }  // braceDepth: 3, then 2
      //   }                     // braceDepth: 1, section closes
      // }

      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();          // braceDepth: 1 (OBJECT)
      expect(manager.getState().braceDepth).toBe(1);

      manager.onSectionKeyword('FIELDS');
      const sectionTransition = manager.onOpenBrace(); // braceDepth: 2 (SECTION)
      expect(sectionTransition).not.toBeNull();
      expect(sectionTransition?.type).toBe('push');
      expect(manager.getState().braceDepth).toBe(2);
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);

      manager.onOpenBrace();          // braceDepth: 3 (field)
      expect(manager.getState().braceDepth).toBe(3);

      const fieldCloseTransition = manager.onCloseBrace(); // braceDepth: 2
      expect(fieldCloseTransition).toBeNull();
      expect(manager.getState().braceDepth).toBe(2);
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);

      const sectionCloseTransition = manager.onCloseBrace(); // braceDepth: 1
      expect(sectionCloseTransition).not.toBeNull();
      expect(sectionCloseTransition).toEqual({
        type: 'pop',
        from: LexerContext.SECTION_LEVEL,
        to: LexerContext.OBJECT_LEVEL,
      });
      expect(manager.getState().braceDepth).toBe(1);
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);
    });
  });

  describe('onBeginKeyword() - returns push transition', () => {
    it('should return push transition from NORMAL to CODE_BLOCK', () => {
      const manager = new LexerStateManager();

      const transition = manager.onBeginKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.NORMAL,
        to: LexerContext.CODE_BLOCK,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should return push transition from SECTION_LEVEL to CODE_BLOCK', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onSectionKeyword('LABELS'); // Use LABELS section (no structural columns)
      manager.onOpenBrace(); // Pushes SECTION_LEVEL

      // In LABELS section, BEGIN is valid (no column protection)
      const transition = manager.onBeginKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.SECTION_LEVEL,
        to: LexerContext.CODE_BLOCK,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should return push transition for nested BEGIN blocks', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      const transition = manager.onBeginKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.CODE_BLOCK,
        to: LexerContext.CODE_BLOCK,
      });
    });

    it('should return push transition for trigger property BEGIN', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Now pushes SECTION_LEVEL, enters COL_1

      // Simulate field structure: { 1 ; ; Name ; Code20 ; ...properties...
      // Need to advance through structural columns to reach PROPERTIES
      manager.onSemicolon(); // COL_1 → COL_2
      manager.onSemicolon(); // COL_2 → COL_3
      manager.onSemicolon(); // COL_3 → COL_4
      manager.onSemicolon(); // COL_4 → PROPERTIES

      // Now we're in PROPERTIES, can use trigger property
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      manager.onEquals();

      const transition = manager.onBeginKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.SECTION_LEVEL,
        to: LexerContext.CODE_BLOCK,
      });
    });

    it('should return null when BEGIN is protected (structural columns)', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Now pushes SECTION_LEVEL
      manager.onOpenBrace(); // Field definition - COL_1

      // BEGIN in COL_1 is protected (field name could be "BEGIN")
      const transition = manager.onBeginKeyword();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null when BEGIN is in non-trigger property value', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Now pushes SECTION_LEVEL
      manager.onIdentifier('InitValue', LexerContext.SECTION_LEVEL);
      manager.onEquals();

      // BEGIN in non-trigger property is just a value, not code
      const transition = manager.onBeginKeyword();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null when BEGIN is inside brackets', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Test', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onOpenBracket();

      // BEGIN inside brackets is text
      const transition = manager.onBeginKeyword();

      expect(transition).toBeNull();
    });
  });

  describe('onEndKeyword() - returns pop transition', () => {
    it('should return pop transition from CODE_BLOCK to NORMAL', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      const transition = manager.onEndKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'pop',
        from: LexerContext.CODE_BLOCK,
        to: LexerContext.NORMAL,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });

    it('should return pop transition from nested CODE_BLOCK', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      const transition = manager.onEndKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'pop',
        from: LexerContext.CODE_BLOCK,
        to: LexerContext.CODE_BLOCK,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should return pop transition from CASE_BLOCK to CODE_BLOCK', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      manager.onCaseKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CASE_BLOCK);

      const transition = manager.onEndKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'pop',
        from: LexerContext.CASE_BLOCK,
        to: LexerContext.CODE_BLOCK,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should return null when END is protected (structural columns)', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Now pushes SECTION_LEVEL
      manager.onOpenBrace(); // Field definition - COL_1

      // END in COL_1 is protected (field name could be "END")
      const transition = manager.onEndKeyword();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null when END is in non-trigger property value', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Now pushes SECTION_LEVEL
      manager.onIdentifier('InitValue', LexerContext.SECTION_LEVEL);
      manager.onEquals();

      // END in non-trigger property is just a value
      const transition = manager.onEndKeyword();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null when END is inside brackets', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Test', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onOpenBracket();

      // END inside brackets is text
      const transition = manager.onEndKeyword();

      expect(transition).toBeNull();
    });

    it('should handle context underflow detection on malformed END', () => {
      const manager = new LexerStateManager();

      // Attempt to pop from NORMAL (underflow)
      const transition = manager.onEndKeyword();

      // Should attempt to pop and set underflow flag
      expect(manager.getState().contextUnderflowDetected).toBe(true);
      // But return null because no actual pop occurred
      expect(transition).toBeNull();
    });
  });

  describe('onCaseKeyword() - returns push transition', () => {
    it('should return push transition from CODE_BLOCK to CASE_BLOCK', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      const transition = manager.onCaseKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.CODE_BLOCK,
        to: LexerContext.CASE_BLOCK,
      });

      expect(manager.getCurrentContext()).toBe(LexerContext.CASE_BLOCK);
    });

    it('should return push transition for nested CASE in CASE_BLOCK', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      manager.onCaseKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CASE_BLOCK);

      const transition = manager.onCaseKeyword();

      expect(transition).not.toBeNull();
      expect(transition).toEqual({
        type: 'push',
        from: LexerContext.CASE_BLOCK,
        to: LexerContext.CASE_BLOCK,
      });
    });

    it('should return null when CASE is called from non-code context', () => {
      const manager = new LexerStateManager();

      // CASE outside code blocks is malformed, guard prevents push
      const transition = manager.onCaseKeyword();

      expect(transition).toBeNull();
      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });
  });

  describe('cleanupContextStack() - returns array of transitions', () => {
    it('should return array of pop transitions when cleaning up', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();

      // Stack: [NORMAL, OBJECT_LEVEL, SECTION_LEVEL]
      // At braceDepth: 2

      // Simulate end of file parsing - braceDepth becomes 0
      manager.onCloseBrace(); // braceDepth: 1
      manager.onCloseBrace(); // braceDepth: 0

      // Now cleanup at braceDepth === 0
      const transitions = manager.cleanupContextStack();

      expect(transitions).toEqual([
        {
          type: 'pop',
          from: LexerContext.OBJECT_LEVEL,
          to: LexerContext.NORMAL,
        },
      ]);

      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });

    it('should return multiple transitions for deeply nested contexts', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();              // braceDepth: 1
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();              // braceDepth: 2

      // Close braces back to 0
      manager.onCloseBrace();             // braceDepth: 1
      manager.onCloseBrace();             // braceDepth: 0

      // Stack: [NORMAL, OBJECT_LEVEL]
      const transitions = manager.cleanupContextStack();

      expect(transitions).toEqual([
        {
          type: 'pop',
          from: LexerContext.OBJECT_LEVEL,
          to: LexerContext.NORMAL,
        },
      ]);
    });

    it('should return empty array when cleanup is not needed', () => {
      const manager = new LexerStateManager();

      // Already at NORMAL context
      const transitions = manager.cleanupContextStack();

      expect(transitions).toEqual([]);
      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });

    it('should leave malformed inner SECTION_LEVELs for isCleanExit detection', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();              // braceDepth: 1
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();              // braceDepth: 2

      // Missing closing braces - malformed
      // braceDepth still at 2

      const transitions = manager.cleanupContextStack();

      // Should NOT pop SECTION_LEVEL when braceDepth !== 0
      // Only pops well-formed outer sections at braceDepth === 0
      expect(transitions).toEqual([]);

      // Stack should still have SECTION_LEVEL (malformed)
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should only pop OBJECT_LEVEL and well-formed SECTION_LEVELs', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace();              // braceDepth: 1
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();              // braceDepth: 2
      manager.onOpenBrace();              // braceDepth: 3 (field def)

      // Close field and section properly
      manager.onCloseBrace();             // braceDepth: 2
      manager.onCloseBrace();             // braceDepth: 1

      // SECTION_LEVEL already popped by onCloseBrace()
      // Stack: [NORMAL, OBJECT_LEVEL]

      // Close object brace
      manager.onCloseBrace();             // braceDepth: 0

      const transitions = manager.cleanupContextStack();

      expect(transitions).toEqual([
        {
          type: 'pop',
          from: LexerContext.OBJECT_LEVEL,
          to: LexerContext.NORMAL,
        },
      ]);

      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });
  });

  describe('Edge cases and complex scenarios', () => {
    it('should handle complete object with multiple sections', () => {
      const manager = new LexerStateManager();

      const objectTransition = manager.onObjectKeyword(0);
      expect(objectTransition?.type).toBe('push');
      expect(objectTransition?.to).toBe(LexerContext.OBJECT_LEVEL);

      manager.onOpenBrace();

      // FIELDS section
      manager.onSectionKeyword('FIELDS');
      const fieldsTransition = manager.onOpenBrace();
      expect(fieldsTransition?.type).toBe('push');
      expect(fieldsTransition?.to).toBe(LexerContext.SECTION_LEVEL);

      const fieldsCloseTransition = manager.onCloseBrace();
      expect(fieldsCloseTransition?.type).toBe('pop');
      expect(fieldsCloseTransition?.from).toBe(LexerContext.SECTION_LEVEL);

      // KEYS section
      manager.onSectionKeyword('KEYS');
      const keysTransition = manager.onOpenBrace();
      expect(keysTransition?.type).toBe('push');
      expect(keysTransition?.to).toBe(LexerContext.SECTION_LEVEL);

      const keysCloseTransition = manager.onCloseBrace();
      expect(keysCloseTransition?.type).toBe('pop');

      manager.onCloseBrace(); // Close object

      const cleanupTransitions = manager.cleanupContextStack();
      expect(cleanupTransitions.length).toBeGreaterThan(0);
    });

    it('should handle trigger with nested code blocks', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Push OBJECT_LEVEL first
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Now pushes SECTION_LEVEL, enters COL_1

      // Advance through structural columns to PROPERTIES
      manager.onSemicolon(); // COL_1 → COL_2
      manager.onSemicolon(); // COL_2 → COL_3
      manager.onSemicolon(); // COL_3 → COL_4
      manager.onSemicolon(); // COL_4 → PROPERTIES

      // Now in PROPERTIES, set up trigger
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      manager.onEquals();

      const beginTransition = manager.onBeginKeyword();
      expect(beginTransition?.to).toBe(LexerContext.CODE_BLOCK);

      const caseTransition = manager.onCaseKeyword();
      expect(caseTransition?.to).toBe(LexerContext.CASE_BLOCK);

      const caseEndTransition = manager.onEndKeyword();
      expect(caseEndTransition?.from).toBe(LexerContext.CASE_BLOCK);
      expect(caseEndTransition?.to).toBe(LexerContext.CODE_BLOCK);

      const blockEndTransition = manager.onEndKeyword();
      expect(blockEndTransition?.from).toBe(LexerContext.CODE_BLOCK);
      expect(blockEndTransition?.to).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should return null for all no-op operations', () => {
      const manager = new LexerStateManager();

      // Operations that don't change context
      expect(manager.onOpenBrace()).toBeNull(); // No section keyword
      expect(manager.onCloseBrace()).toBeNull(); // No context to pop
      expect(manager.onCaseKeyword()).toBeNull(); // Not in code
    });

    it('should maintain transition consistency with context changes', () => {
      const manager = new LexerStateManager();

      const transition1 = manager.onObjectKeyword(0);
      expect(transition1?.to).toBe(manager.getCurrentContext());

      manager.onOpenBrace(); // Object brace
      manager.onSectionKeyword('LABELS'); // Use LABELS section (no structural columns)
      const transition2 = manager.onOpenBrace();
      expect(transition2?.to).toBe(manager.getCurrentContext());

      const transition3 = manager.onBeginKeyword();
      expect(transition3?.to).toBe(manager.getCurrentContext());

      const transition4 = manager.onEndKeyword();
      expect(transition4?.to).toBe(manager.getCurrentContext());
    });
  });
});
