/**
 * Tests for LexerStateManager
 *
 * Validates state management for the lexer including context tracking,
 * brace/bracket depth, property value mode, and section type handling.
 */

import { LexerStateManager, LexerContext, FieldDefColumn } from '../stateManager';

// Import types from stateManager
import type { SectionType } from '../stateManager';

describe('LexerStateManager', () => {
  describe('Initial state', () => {
    it('should initialize with correct default values', () => {
      const manager = new LexerStateManager();
      const state = manager.getState();

      expect(state.contextStack).toEqual([LexerContext.NORMAL]);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.lastPropertyName).toBe('');
      expect(state.lastWasSectionKeyword).toBe(false);
      expect(state.currentSectionType).toBe(null);
      expect(state.fieldDefColumn).toBe(FieldDefColumn.NONE);
      expect(state.contextUnderflowDetected).toBe(false);
      expect(state.objectTokenIndex).toBe(-1);
    });

    it('should have NORMAL context as initial context', () => {
      const manager = new LexerStateManager();
      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });
  });

  describe('reset()', () => {
    it('should return all state to initial values', () => {
      const manager = new LexerStateManager();

      // Modify state
      manager.onOpenBrace();
      manager.onObjectKeyword(5);
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      manager.onEquals();

      // Reset
      manager.reset();

      const state = manager.getState();
      expect(state.contextStack).toEqual([LexerContext.NORMAL]);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.lastPropertyName).toBe('');
      expect(state.lastWasSectionKeyword).toBe(false);
      expect(state.currentSectionType).toBe(null);
      expect(state.fieldDefColumn).toBe(FieldDefColumn.NONE);
      expect(state.contextUnderflowDetected).toBe(false);
      expect(state.objectTokenIndex).toBe(-1);
    });
  });

  describe('Brace depth tracking', () => {
    it('should increment braceDepth on onOpenBrace()', () => {
      const manager = new LexerStateManager();
      manager.onOpenBrace();

      expect(manager.getState().braceDepth).toBe(1);
    });

    it('should decrement braceDepth on onCloseBrace()', () => {
      const manager = new LexerStateManager();
      manager.onOpenBrace();
      manager.onOpenBrace();
      manager.onCloseBrace();

      expect(manager.getState().braceDepth).toBe(1);
    });

    it('should maintain braceDepth >= 0 invariant', () => {
      const manager = new LexerStateManager();
      manager.onCloseBrace(); // Attempt to go negative

      expect(manager.getState().braceDepth).toBe(0);
    });

    it('should handle deep nesting correctly', () => {
      const manager = new LexerStateManager();

      for (let i = 0; i < 10; i++) {
        manager.onOpenBrace();
      }

      expect(manager.getState().braceDepth).toBe(10);

      for (let i = 0; i < 10; i++) {
        manager.onCloseBrace();
      }

      expect(manager.getState().braceDepth).toBe(0);
    });
  });

  describe('Bracket depth tracking', () => {
    it('should increment bracketDepth regardless of property value mode', () => {
      const manager = new LexerStateManager();
      manager.onOpenBracket();

      // Brackets are now tracked globally to support comment-like sequences (://, /*) inside any brackets
      expect(manager.getState().bracketDepth).toBe(1);
    });

    it('should increment bracketDepth in property value mode', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Name', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onOpenBracket();

      expect(manager.getState().bracketDepth).toBe(1);
    });

    it('should decrement bracketDepth on onCloseBracket()', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OptionCaptionML', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onOpenBracket();
      manager.onOpenBracket();
      manager.onCloseBracket();

      expect(manager.getState().bracketDepth).toBe(1);
    });

    it('should maintain bracketDepth >= 0 invariant', () => {
      const manager = new LexerStateManager();
      manager.onCloseBracket(); // Attempt to go negative

      expect(manager.getState().bracketDepth).toBe(0);
    });

    it('should track brackets globally to support comment-like sequences in any bracket context', () => {
      const manager = new LexerStateManager();
      // Brackets are now tracked globally (not just in property value context)
      manager.onOpenBracket();
      manager.onOpenBracket();
      expect(manager.getState().bracketDepth).toBe(2);

      // Enter property value
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OptionString', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onOpenBracket();
      expect(manager.getState().bracketDepth).toBe(3);

      // Exit property value with semicolon
      manager.onSemicolon();
      expect(manager.getState().bracketDepth).toBe(3); // Bracket depth is independent of inPropertyValue

      // Close brackets
      manager.onCloseBracket();
      manager.onCloseBracket();
      manager.onCloseBracket();
      expect(manager.getState().bracketDepth).toBe(0);
    });
  });

  describe('Property value tracking', () => {
    it('should enter property value mode on onEquals() at SECTION_LEVEL', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Editable', LexerContext.SECTION_LEVEL);
      manager.onEquals();

      expect(manager.getState().inPropertyValue).toBe(true);
    });

    it('should NOT enter property value mode on onEquals() in CODE_BLOCK', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      manager.onEquals(); // Comparison operator, not property assignment

      expect(manager.getState().inPropertyValue).toBe(false);
    });

    it('should exit property value mode on onSemicolon()', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Editable', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);

      manager.onSemicolon();
      expect(manager.getState().inPropertyValue).toBe(false);
    });

    it('should exit property value mode on onCloseBrace()', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Editable', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);

      manager.onCloseBrace();
      expect(manager.getState().inPropertyValue).toBe(false);
    });

    it('should track lastPropertyName from onIdentifier()', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);

      expect(manager.getState().lastPropertyName).toBe('OnValidate');
    });

    it('should NOT track lastPropertyName outside SECTION_LEVEL', () => {
      const manager = new LexerStateManager();
      manager.onIdentifier('Customer', LexerContext.NORMAL);

      expect(manager.getState().lastPropertyName).toBe('');
    });

    it('should clear lastPropertyName on onCloseBrace()', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      expect(manager.getState().lastPropertyName).toBe('OnValidate');

      manager.onCloseBrace();
      expect(manager.getState().lastPropertyName).toBe('');
    });
  });

  describe('Section keyword tracking', () => {
    const sections: SectionType[] = [
      'CODE', 'FIELDS', 'KEYS', 'CONTROLS', 'ELEMENTS',
      'ACTIONS', 'DATASET', 'REQUESTPAGE', 'LABELS', 'MENUNODES'
    ];

    sections.forEach(sectionType => {
      it(`should set lastWasSectionKeyword and currentSectionType for ${sectionType}`, () => {
        const manager = new LexerStateManager();
        manager.onSectionKeyword(sectionType);

        const state = manager.getState();
        expect(state.lastWasSectionKeyword).toBe(true);
        expect(state.currentSectionType).toBe(sectionType);
      });
    });

    it('should update currentSectionType when switching sections', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      expect(manager.getState().currentSectionType).toBe('FIELDS');

      manager.onSectionKeyword('KEYS');
      expect(manager.getState().currentSectionType).toBe('KEYS');
    });

    it('should reset lastWasSectionKeyword after onOpenBrace()', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      expect(manager.getState().lastWasSectionKeyword).toBe(true);

      manager.onOpenBrace();
      expect(manager.getState().lastWasSectionKeyword).toBe(false);
    });
  });

  describe('Context stack operations', () => {
    it('should maintain minimum stack size of 1', () => {
      const manager = new LexerStateManager();
      expect(manager.getState().contextStack.length).toBeGreaterThanOrEqual(1);
    });

    it('should push OBJECT_LEVEL on onObjectKeyword()', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(5);

      const state = manager.getState();
      expect(state.contextStack).toEqual([LexerContext.NORMAL, LexerContext.OBJECT_LEVEL]);
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);
    });

    it('should set objectTokenIndex on onObjectKeyword()', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(42);

      expect(manager.getState().objectTokenIndex).toBe(42);
    });

    it('should push SECTION_LEVEL after section keyword and open brace', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();

      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should push CASE_BLOCK on onCaseKeyword()', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      manager.onCaseKeyword();

      expect(manager.getCurrentContext()).toBe(LexerContext.CASE_BLOCK);
    });

    it('should NOT push CASE_BLOCK if not in CODE_BLOCK context', () => {
      const manager = new LexerStateManager();
      manager.onCaseKeyword();

      // Should stay in NORMAL
      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });

    it('should pop context on onEndKeyword()', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      manager.onEndKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });

    it('should detect context underflow on excessive pops', () => {
      const manager = new LexerStateManager();
      // Try to pop below minimum stack size
      manager.onEndKeyword();

      expect(manager.getState().contextUnderflowDetected).toBe(true);
      // Stack should still have minimum size
      expect(manager.getState().contextStack.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('BEGIN/END keyword handling', () => {
    it('should push CODE_BLOCK on onBeginKeyword() from NORMAL context', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should push CODE_BLOCK on onBeginKeyword() from SECTION_LEVEL', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      // Use markSectionKeyword for non-columnar section (e.g., PROPERTIES)
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL
      // We're now in SECTION_LEVEL but not in any columnar tracking
      manager.onBeginKeyword();

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should push CODE_BLOCK on onBeginKeyword() inside trigger property', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onBeginKeyword();

      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should NOT push CODE_BLOCK on onBeginKeyword() in non-trigger property', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace();  // Enter SECTION_LEVEL
      manager.onIdentifier('InitValue', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onBeginKeyword();

      // BEGIN in non-trigger property value is just an identifier
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should pop CODE_BLOCK on onEndKeyword()', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      manager.onEndKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });

    it('should handle nested BEGIN/END blocks', () => {
      const manager = new LexerStateManager();
      manager.onBeginKeyword();
      manager.onBeginKeyword();
      manager.onBeginKeyword();

      expect(manager.getState().contextStack).toEqual([
        LexerContext.NORMAL,
        LexerContext.CODE_BLOCK,
        LexerContext.CODE_BLOCK,
        LexerContext.CODE_BLOCK,
      ]);

      manager.onEndKeyword();
      manager.onEndKeyword();
      manager.onEndKeyword();

      expect(manager.getCurrentContext()).toBe(LexerContext.NORMAL);
    });
  });

  describe('Field definition column tracking', () => {
    it('should advance to COL_1 after section keyword and open brace', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
      manager.onOpenBrace(); // Open object brace
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Open section brace
      manager.onOpenBrace(); // Field definition start

      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_1);
    });

    it('should advance through columns on semicolons', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
      manager.onOpenBrace(); // Open object brace
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Open section brace
      manager.onOpenBrace(); // Start field def
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_1);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_2);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_3);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_4);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.PROPERTIES);
    });

    it('should reset to NONE on closing brace', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
      manager.onOpenBrace(); // Open object brace
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Open section brace
      manager.onOpenBrace(); // Field definition start
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_1);

      manager.onCloseBrace();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.NONE);
    });

    it('should stay in PROPERTIES after reaching it', () => {
      const manager = new LexerStateManager();
      manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
      manager.onOpenBrace(); // Open object brace
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Open section brace
      manager.onOpenBrace(); // Field definition start

      // Advance to PROPERTIES
      for (let i = 0; i < 4; i++) {
        manager.onSemicolon();
      }
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.PROPERTIES);

      // Additional semicolons should keep it in PROPERTIES
      manager.onSemicolon();
      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.PROPERTIES);
    });
  });

  describe('Protection guards', () => {
    describe('shouldProtectFromBeginEnd()', () => {
      it('should protect structural columns in FIELDS section', () => {
        const manager = new LexerStateManager();
        manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
        manager.onOpenBrace(); // Open object brace
        manager.onSectionKeyword('FIELDS');
        manager.onOpenBrace(); // Open section brace
        manager.onOpenBrace(); // Field definition start

        // COL_1 through COL_4 should be protected
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_2
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_3
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_4
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // PROPERTIES
        expect(manager.shouldProtectFromBeginEnd()).toBe(false);
      });

      it('should protect structural columns in KEYS section', () => {
        const manager = new LexerStateManager();
        manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
        manager.onOpenBrace(); // Open object brace
        manager.onSectionKeyword('KEYS');
        manager.onOpenBrace(); // Open section brace
        manager.onOpenBrace(); // Key definition start

        // COL_1 and COL_2 should be protected in KEYS
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_2
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_3 - not protected in KEYS
        expect(manager.shouldProtectFromBeginEnd()).toBe(false);
      });

      it('should protect structural columns in CONTROLS section', () => {
        const manager = new LexerStateManager();
        manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
        manager.onOpenBrace(); // Open object brace
        manager.onSectionKeyword('CONTROLS');
        manager.onOpenBrace(); // Open section brace
        manager.onOpenBrace(); // Control definition start

        // COL_1 through COL_3 should be protected
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_2
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_3
        expect(manager.shouldProtectFromBeginEnd()).toBe(true);

        manager.onSemicolon(); // COL_4 - not protected in CONTROLS
        expect(manager.shouldProtectFromBeginEnd()).toBe(false);
      });

      it('should not protect when not in field definition', () => {
        const manager = new LexerStateManager();
        expect(manager.shouldProtectFromBeginEnd()).toBe(false);
      });

      it('should return false when in property value mode regardless of column', () => {
        const manager = new LexerStateManager();

        // Set up structural column tracking
        manager.onObjectKeyword(0);
        manager.onOpenBrace();
        manager.markSectionKeyword();
        manager.onOpenBrace();

        // Simulate property name followed by equals
        manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
        manager.onEquals();

        // Now in property value mode at structural column
        const state = manager.getState();
        expect(state.inPropertyValue).toBe(true);

        // shouldProtectFromBeginEnd should return false
        expect((manager as any).shouldProtectFromBeginEnd()).toBe(false);
      });
    });

    describe('shouldProtectFromSectionKeyword()', () => {
      it('should protect structural columns in FIELDS section', () => {
        const manager = new LexerStateManager();
        manager.onObjectKeyword(0); // Establish OBJECT_LEVEL context
        manager.onOpenBrace(); // Open object brace
        manager.onSectionKeyword('FIELDS');
        manager.onOpenBrace(); // Open section brace
        manager.onOpenBrace(); // Field definition start

        expect(manager.shouldProtectFromSectionKeyword()).toBe(true);

        manager.onSemicolon(); // COL_2
        expect(manager.shouldProtectFromSectionKeyword()).toBe(true);

        manager.onSemicolon(); // COL_3
        expect(manager.shouldProtectFromSectionKeyword()).toBe(true);

        manager.onSemicolon(); // COL_4
        expect(manager.shouldProtectFromSectionKeyword()).toBe(true);

        manager.onSemicolon(); // PROPERTIES
        expect(manager.shouldProtectFromSectionKeyword()).toBe(false);
      });

      it('should not protect when not in field definition', () => {
        const manager = new LexerStateManager();
        expect(manager.shouldProtectFromSectionKeyword()).toBe(false);
      });
    });

    describe('isTriggerProperty()', () => {
      const triggerProperties = [
        'OnInsert', 'OnModify', 'OnDelete', 'OnRename',
        'OnValidate', 'OnLookup',
        'OnRun',
        'OnInit', 'OnOpenPage', 'OnClosePage',
        'OnAction', 'OnDrillDown', 'OnAssistEdit',
        'OnInitReport', 'OnPreReport', 'OnPostReport',
        'OnPreDataItem', 'OnPostDataItem',
      ];

      triggerProperties.forEach(prop => {
        it(`should recognize ${prop} as trigger property`, () => {
          const manager = new LexerStateManager();
          manager.onIdentifier(prop, LexerContext.SECTION_LEVEL);

          expect(manager.isTriggerProperty()).toBe(true);
        });

        it(`should recognize ${prop.toLowerCase()} as trigger property (case insensitive)`, () => {
          const manager = new LexerStateManager();
          manager.onIdentifier(prop.toLowerCase(), LexerContext.SECTION_LEVEL);

          expect(manager.isTriggerProperty()).toBe(true);
        });

        it(`should recognize ${prop.toUpperCase()} as trigger property (case insensitive)`, () => {
          const manager = new LexerStateManager();
          manager.onIdentifier(prop.toUpperCase(), LexerContext.SECTION_LEVEL);

          expect(manager.isTriggerProperty()).toBe(true);
        });
      });

      const nonTriggerProperties = [
        'Editable', 'Visible', 'InitValue', 'OptionString',
        'TableRelation', 'Name', 'Caption', 'Description'
      ];

      nonTriggerProperties.forEach(prop => {
        it(`should NOT recognize ${prop} as trigger property`, () => {
          const manager = new LexerStateManager();
          manager.onIdentifier(prop, LexerContext.SECTION_LEVEL);

          expect(manager.isTriggerProperty()).toBe(false);
        });
      });

      it('should return false when no property name is set', () => {
        const manager = new LexerStateManager();
        expect(manager.isTriggerProperty()).toBe(false);
      });
    });
  });

  describe('Complex state transitions', () => {
    it('should handle complete object structure', () => {
      const manager = new LexerStateManager();

      // OBJECT Table 18 Customer
      manager.onObjectKeyword(0);
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);

      // {
      manager.onOpenBrace();
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);

      // FIELDS
      manager.onSectionKeyword('FIELDS');
      expect(manager.getState().currentSectionType).toBe('FIELDS');

      // {
      manager.onOpenBrace();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);

      // { 1 ; ; No. ; Code20 }
      manager.onOpenBrace();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_1);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_2);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_3);

      manager.onSemicolon();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.COL_4);

      manager.onCloseBrace();
      expect(manager.getState().fieldDefColumn).toBe(FieldDefColumn.NONE);

      // Close FIELDS section
      manager.onCloseBrace();
      expect(manager.getCurrentContext()).toBe(LexerContext.OBJECT_LEVEL);

      // Close object
      manager.onCloseBrace();
      expect(manager.getState().braceDepth).toBe(0);
    });

    it('should handle trigger property with code', () => {
      const manager = new LexerStateManager();

      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      // Use markSectionKeyword to avoid column tracking
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // Trigger property
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      expect(manager.getState().lastPropertyName).toBe('OnValidate');

      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);
      expect(manager.isTriggerProperty()).toBe(true);

      // BEGIN
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      // Code inside trigger...

      // END
      manager.onEndKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);

      manager.onSemicolon();
      expect(manager.getState().inPropertyValue).toBe(false);
    });

    it('should handle non-trigger property with BEGIN as value', () => {
      const manager = new LexerStateManager();

      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      // Use markSectionKeyword to avoid column tracking
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // Non-trigger property
      manager.onIdentifier('InitValue', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);
      expect(manager.isTriggerProperty()).toBe(false);

      // BEGIN is just a value, not a code block start
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);

      manager.onSemicolon();
      expect(manager.getState().inPropertyValue).toBe(false);
    });

    it('should handle CASE block inside code', () => {
      const manager = new LexerStateManager();

      // Set up SECTION_LEVEL context first
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      // Use markSectionKeyword to avoid column tracking
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      manager.onCaseKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CASE_BLOCK);

      // CASE blocks end with END, not END;
      manager.onEndKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      manager.onEndKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should handle brackets in property values', () => {
      const manager = new LexerStateManager();

      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('OptionCaptionML', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);

      // Brackets only tracked in property value mode
      manager.onOpenBracket();
      expect(manager.getState().bracketDepth).toBe(1);

      manager.onOpenBracket();
      expect(manager.getState().bracketDepth).toBe(2);

      manager.onCloseBracket();
      expect(manager.getState().bracketDepth).toBe(1);

      manager.onCloseBracket();
      expect(manager.getState().bracketDepth).toBe(0);

      manager.onSemicolon();
      expect(manager.getState().inPropertyValue).toBe(false);
    });
  });

  describe('Invariants', () => {
    it('should never allow braceDepth < 0', () => {
      const manager = new LexerStateManager();
      for (let i = 0; i < 5; i++) {
        manager.onCloseBrace();
        expect(manager.getState().braceDepth).toBeGreaterThanOrEqual(0);
      }
    });

    it('should never allow bracketDepth < 0', () => {
      const manager = new LexerStateManager();
      for (let i = 0; i < 5; i++) {
        manager.onCloseBracket();
        expect(manager.getState().bracketDepth).toBeGreaterThanOrEqual(0);
      }
    });

    it('should never allow contextStack.length < 1', () => {
      const manager = new LexerStateManager();

      // Try to pop many times
      for (let i = 0; i < 10; i++) {
        manager.onEndKeyword();
        expect(manager.getState().contextStack.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should maintain contextStack consistency after many operations', () => {
      const manager = new LexerStateManager();

      // Push contexts
      manager.onObjectKeyword(0);
      manager.onOpenBrace();  // OBJECT open brace
      // Use markSectionKeyword to avoid column tracking
      manager.markSectionKeyword();
      manager.onOpenBrace();  // SECTION open brace
      manager.onBeginKeyword();
      manager.onCaseKeyword();

      const depth = manager.getState().contextStack.length;
      expect(depth).toBeGreaterThan(1);

      // Pop all the way back
      manager.onEndKeyword();
      manager.onEndKeyword();
      manager.onCloseBrace();  // Close SECTION

      // Should be back to OBJECT_LEVEL
      expect(manager.getState().contextStack).toEqual([LexerContext.NORMAL, LexerContext.OBJECT_LEVEL]);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty property name', () => {
      const manager = new LexerStateManager();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('', LexerContext.SECTION_LEVEL);

      expect(manager.getState().lastPropertyName).toBe('');
      expect(manager.isTriggerProperty()).toBe(false);
    });

    it('should handle multiple consecutive section keywords', () => {
      const manager = new LexerStateManager();

      manager.onSectionKeyword('FIELDS');
      expect(manager.getState().currentSectionType).toBe('FIELDS');

      manager.onSectionKeyword('KEYS');
      expect(manager.getState().currentSectionType).toBe('KEYS');

      manager.onSectionKeyword('CONTROLS');
      expect(manager.getState().currentSectionType).toBe('CONTROLS');
    });

    it('should handle multiple OBJECT keywords', () => {
      const manager = new LexerStateManager();

      manager.onObjectKeyword(10);
      expect(manager.getState().objectTokenIndex).toBe(10);

      manager.onObjectKeyword(25);
      expect(manager.getState().objectTokenIndex).toBe(25);
    });

    it('should handle interleaved braces and brackets', () => {
      const manager = new LexerStateManager();

      manager.onOpenBrace();
      manager.onSectionKeyword('FIELDS');
      manager.onIdentifier('Test', LexerContext.SECTION_LEVEL);
      manager.onEquals();
      manager.onOpenBracket();
      manager.onOpenBrace(); // Comment brace inside property value
      manager.onCloseBrace();
      manager.onCloseBracket();
      manager.onSemicolon();
      manager.onCloseBrace();

      expect(manager.getState().braceDepth).toBe(0);
      expect(manager.getState().bracketDepth).toBe(0);
    });
  });

  describe('BEGIN property name tracking bug (issue #221)', () => {
    it('should clear lastPropertyName when BEGIN transitions to CODE_BLOCK', () => {
      const manager = new LexerStateManager();

      // Set up state at SECTION_LEVEL
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // BEGIN is encountered at SECTION_LEVEL
      // onIdentifier sets lastPropertyName = "BEGIN"
      manager.onIdentifier('BEGIN', LexerContext.SECTION_LEVEL);
      expect(manager.getState().lastPropertyName).toBe('BEGIN');

      // onBeginKeyword transitions to CODE_BLOCK
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      // lastPropertyName should be cleared (not a property context)
      expect(manager.getState().lastPropertyName).toBe('');
    });

    it('should NOT set inPropertyValue for equals inside CODE_BLOCK after BEGIN', () => {
      const manager = new LexerStateManager();

      // Set up CODE_BLOCK entered from SECTION_LEVEL via BEGIN
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // Enter CODE_BLOCK via BEGIN from SECTION_LEVEL
      manager.onIdentifier('BEGIN', LexerContext.SECTION_LEVEL);
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      // Equals inside CODE_BLOCK is an assignment operator
      manager.onEquals();

      // Should NOT trigger property value mode
      expect(manager.getState().inPropertyValue).toBe(false);
    });

    it('should allow END to pop CODE_BLOCK after assignments', () => {
      const manager = new LexerStateManager();

      // Set up CODE_BLOCK
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // Enter CODE_BLOCK via BEGIN
      manager.onIdentifier('BEGIN', LexerContext.SECTION_LEVEL);
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      // Simulate assignment
      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(false);

      // END should pop CODE_BLOCK
      manager.onEndKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });

    it('should NOT clear lastPropertyName for trigger properties - REGRESSION TEST', () => {
      const manager = new LexerStateManager();

      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // OnValidate=BEGIN sequence (trigger property)
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      expect(manager.getState().lastPropertyName).toBe('OnValidate');

      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);
      expect(manager.isTriggerProperty()).toBe(true);

      // BEGIN in trigger context
      manager.onBeginKeyword();
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);

      // lastPropertyName should NOT be cleared in trigger context
      expect(manager.getState().lastPropertyName).toBe('OnValidate');

      // inPropertyValue should remain true
      expect(manager.getState().inPropertyValue).toBe(true);
    });

    it('should not pollute property tracking when CASE keyword appears at SECTION_LEVEL', () => {
      const manager = new LexerStateManager();

      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Open section brace - now in SECTION_LEVEL

      // CASE keyword at SECTION_LEVEL (unusual but possible)
      manager.onIdentifier('CASE', LexerContext.SECTION_LEVEL);
      expect(manager.getState().lastPropertyName).toBe('CASE');

      // Next identifier should overwrite
      manager.onIdentifier('SomeProperty', LexerContext.SECTION_LEVEL);
      expect(manager.getState().lastPropertyName).toBe('SomeProperty');

      // Should not have any lingering CASE pollution
      manager.onEquals();
      expect(manager.getState().inPropertyValue).toBe(true);

      manager.onSemicolon();
      expect(manager.getState().inPropertyValue).toBe(false);
    });
  });

  describe('lastWasSectionKeyword flag reset at boundaries (issue #262)', () => {
    it('should reset lastWasSectionKeyword when onCloseBrace() pops SECTION_LEVEL', () => {
      const manager = new LexerStateManager();

      // Setup: Enter OBJECT_LEVEL
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // Open object brace (braceDepth=1)

      // Simulate section keyword and enter SECTION_LEVEL
      manager.markSectionKeyword();
      manager.onOpenBrace(); // Enter SECTION_LEVEL (braceDepth=2)

      // Set stale flag within section
      manager.markSectionKeyword();
      expect(manager.getState().lastWasSectionKeyword).toBe(true);

      // Close section - should reset flag
      manager.onCloseBrace(); // Pop SECTION_LEVEL (braceDepth=1)

      // Assert flag is cleared (WILL FAIL before fix)
      expect(manager.getState().lastWasSectionKeyword).toBe(false);
    });

    it('should reset lastWasSectionKeyword when onBeginKeyword() enters CODE_BLOCK from trigger property', () => {
      const manager = new LexerStateManager();

      // Setup: Enter SECTION_LEVEL in FIELDS section
      manager.onObjectKeyword(0);
      manager.onOpenBrace();
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // Enter SECTION_LEVEL

      // Trigger property setup
      manager.onIdentifier('OnValidate', LexerContext.SECTION_LEVEL);
      manager.onEquals(); // Enter property value mode

      // Set stale flag
      manager.markSectionKeyword();
      expect(manager.getState().lastWasSectionKeyword).toBe(true);

      // BEGIN should enter CODE_BLOCK
      manager.onBeginKeyword();

      // Assert flag is cleared (WILL FAIL before fix)
      expect(manager.getState().lastWasSectionKeyword).toBe(false);
      // Also verify context transition worked
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should reset lastWasSectionKeyword when onBeginKeyword() enters CODE_BLOCK from non-property context', () => {
      const manager = new LexerStateManager();

      // Setup: Enter SECTION_LEVEL (use markSectionKeyword to avoid column tracking)
      manager.onObjectKeyword(0);
      manager.onOpenBrace();
      manager.markSectionKeyword(); // Non-columnar section (e.g., PROPERTIES)
      manager.onOpenBrace(); // Enter SECTION_LEVEL

      // Set stale flag
      manager.markSectionKeyword();
      expect(manager.getState().lastWasSectionKeyword).toBe(true);

      // BEGIN at SECTION_LEVEL (non-property context) should enter CODE_BLOCK
      manager.onBeginKeyword();

      // Assert flag is cleared (WILL FAIL before fix)
      expect(manager.getState().lastWasSectionKeyword).toBe(false);
      // Also verify context transition worked
      expect(manager.getCurrentContext()).toBe(LexerContext.CODE_BLOCK);
    });

    it('should reset lastWasSectionKeyword on field-level close brace (not just section pop)', () => {
      const manager = new LexerStateManager();

      // Setup: Enter SECTION_LEVEL with field definition
      manager.onObjectKeyword(0);
      manager.onOpenBrace(); // braceDepth=1
      manager.onSectionKeyword('FIELDS');
      manager.onOpenBrace(); // braceDepth=2, enter SECTION_LEVEL

      // Open field definition
      manager.onOpenBrace(); // braceDepth=3

      // Set stale flag mid-field
      manager.markSectionKeyword();
      expect(manager.getState().lastWasSectionKeyword).toBe(true);

      // Close field brace (not section pop)
      manager.onCloseBrace(); // braceDepth=2, still in SECTION_LEVEL

      // Assert flag is cleared (WILL FAIL before fix)
      expect(manager.getState().lastWasSectionKeyword).toBe(false);
      // Verify we're still in SECTION_LEVEL (didn't pop section)
      expect(manager.getCurrentContext()).toBe(LexerContext.SECTION_LEVEL);
    });
  });

  describe('Accessor methods (issue #239 optimization)', () => {
    describe('getBracketDepth()', () => {
      it('should return same value as getState().bracketDepth', () => {
        const manager = new LexerStateManager();

        expect(manager.getBracketDepth()).toBe(manager.getState().bracketDepth);

        manager.onOpenBracket();
        expect(manager.getBracketDepth()).toBe(manager.getState().bracketDepth);
        expect(manager.getBracketDepth()).toBe(1);

        manager.onOpenBracket();
        expect(manager.getBracketDepth()).toBe(manager.getState().bracketDepth);
        expect(manager.getBracketDepth()).toBe(2);

        manager.onCloseBracket();
        expect(manager.getBracketDepth()).toBe(manager.getState().bracketDepth);
        expect(manager.getBracketDepth()).toBe(1);
      });
    });

    describe('getBraceDepth()', () => {
      it('should return same value as getState().braceDepth', () => {
        const manager = new LexerStateManager();

        expect(manager.getBraceDepth()).toBe(manager.getState().braceDepth);

        manager.onOpenBrace();
        expect(manager.getBraceDepth()).toBe(manager.getState().braceDepth);
        expect(manager.getBraceDepth()).toBe(1);

        manager.onOpenBrace();
        expect(manager.getBraceDepth()).toBe(manager.getState().braceDepth);
        expect(manager.getBraceDepth()).toBe(2);

        manager.onCloseBrace();
        expect(manager.getBraceDepth()).toBe(manager.getState().braceDepth);
        expect(manager.getBraceDepth()).toBe(1);
      });
    });

    describe('getInPropertyValue()', () => {
      it('should return same value as getState().inPropertyValue', () => {
        const manager = new LexerStateManager();

        expect(manager.getInPropertyValue()).toBe(manager.getState().inPropertyValue);
        expect(manager.getInPropertyValue()).toBe(false);

        manager.onIdentifier('Editable', LexerContext.SECTION_LEVEL);
        manager.onEquals();
        expect(manager.getInPropertyValue()).toBe(manager.getState().inPropertyValue);
        expect(manager.getInPropertyValue()).toBe(true);

        manager.onSemicolon();
        expect(manager.getInPropertyValue()).toBe(manager.getState().inPropertyValue);
        expect(manager.getInPropertyValue()).toBe(false);
      });
    });

    describe('getFieldDefColumn()', () => {
      it('should return same value as getState().fieldDefColumn', () => {
        const manager = new LexerStateManager();

        expect(manager.getFieldDefColumn()).toBe(manager.getState().fieldDefColumn);
        expect(manager.getFieldDefColumn()).toBe(FieldDefColumn.NONE);

        manager.onSectionKeyword('FIELDS');
        manager.onOpenBrace();
        manager.onOpenBrace(); // Start field definition
        expect(manager.getFieldDefColumn()).toBe(manager.getState().fieldDefColumn);
        expect(manager.getFieldDefColumn()).toBe(FieldDefColumn.COL_1);

        manager.onSemicolon();
        expect(manager.getFieldDefColumn()).toBe(manager.getState().fieldDefColumn);
        expect(manager.getFieldDefColumn()).toBe(FieldDefColumn.COL_2);
      });
    });

    describe('getCurrentSectionType()', () => {
      it('should return same value as getState().currentSectionType', () => {
        const manager = new LexerStateManager();

        expect(manager.getCurrentSectionType()).toBe(manager.getState().currentSectionType);
        expect(manager.getCurrentSectionType()).toBe(null);

        manager.onSectionKeyword('FIELDS');
        expect(manager.getCurrentSectionType()).toBe(manager.getState().currentSectionType);
        expect(manager.getCurrentSectionType()).toBe('FIELDS');

        manager.onOpenBrace();
        manager.onOpenBrace();
        manager.onCloseBrace();
        manager.onCloseBrace(); // Exit section
        expect(manager.getCurrentSectionType()).toBe(manager.getState().currentSectionType);
        expect(manager.getCurrentSectionType()).toBe(null);
      });
    });

    describe('getLastPropertyName()', () => {
      it('should return same value as getState().lastPropertyName', () => {
        const manager = new LexerStateManager();

        expect(manager.getLastPropertyName()).toBe(manager.getState().lastPropertyName);
        expect(manager.getLastPropertyName()).toBe('');

        manager.onIdentifier('Editable', LexerContext.SECTION_LEVEL);
        expect(manager.getLastPropertyName()).toBe(manager.getState().lastPropertyName);
        expect(manager.getLastPropertyName()).toBe('Editable');

        manager.onEquals();
        manager.onSemicolon();
        expect(manager.getLastPropertyName()).toBe(manager.getState().lastPropertyName);
        expect(manager.getLastPropertyName()).toBe('');
      });
    });

    describe('getLastWasSectionKeyword()', () => {
      it('should return same value as getState().lastWasSectionKeyword', () => {
        const manager = new LexerStateManager();

        expect(manager.getLastWasSectionKeyword()).toBe(manager.getState().lastWasSectionKeyword);
        expect(manager.getLastWasSectionKeyword()).toBe(false);

        manager.onSectionKeyword('FIELDS');
        expect(manager.getLastWasSectionKeyword()).toBe(manager.getState().lastWasSectionKeyword);
        expect(manager.getLastWasSectionKeyword()).toBe(true);

        manager.onOpenBrace();
        expect(manager.getLastWasSectionKeyword()).toBe(manager.getState().lastWasSectionKeyword);
        expect(manager.getLastWasSectionKeyword()).toBe(false);
      });
    });

    describe('getObjectTokenIndex()', () => {
      it('should return same value as getState().objectTokenIndex', () => {
        const manager = new LexerStateManager();

        expect(manager.getObjectTokenIndex()).toBe(manager.getState().objectTokenIndex);
        expect(manager.getObjectTokenIndex()).toBe(-1);

        manager.onObjectKeyword(5);
        expect(manager.getObjectTokenIndex()).toBe(manager.getState().objectTokenIndex);
        expect(manager.getObjectTokenIndex()).toBe(5);
      });
    });
  });
});
