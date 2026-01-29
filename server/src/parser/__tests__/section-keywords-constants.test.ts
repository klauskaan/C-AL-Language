/**
 * Unit tests for SECTION_KEYWORDS and UNSUPPORTED_SECTIONS constants (Issue #272)
 *
 * IMPORTANT: Lexer vs Parser SECTION_KEYWORDS Distinction
 * ========================================================
 * The C/AL parser maintains its own SECTION_KEYWORDS set that is distinct from the
 * lexer's SECTION_KEYWORDS set, serving different purposes:
 *
 * Lexer SECTION_KEYWORDS (11 keywords):
 *   - Purpose: Identifier downgrading - determines when to treat section keywords as identifiers
 *   - Context: Field names, key names, control names, ML properties, code blocks
 *   - Keywords: Properties, FieldGroups, Code, MenuNodes, Actions, DataItems, Dataset,
 *               RequestPage, Labels, Elements, RequestForm
 *
 * Parser SECTION_KEYWORDS (14 keywords):
 *   - Purpose: Error recovery and synchronization in parseObject()
 *   - Context: Object-level section recognition
 *   - Keywords: All 11 from lexer PLUS 3 additional:
 *     - Fields: Table field definitions section
 *     - Keys: Table key definitions section
 *     - Controls: Page/Form control definitions section
 *
 * Why the 3 additional keywords in the parser?
 *   These keywords (Fields, Keys, Controls) define sections at the object level but
 *   cannot appear as identifiers in contexts where the lexer performs downgrading
 *   (e.g., you can't have a field named "Fields" in a FIELDS section). Therefore,
 *   they are excluded from lexer downgrading but included in parser error recovery.
 *
 * This test file validates ONLY the parser.ts constants.
 * For lexer SECTION_KEYWORDS tests, see server/src/lexer/__tests__/lexer.test.ts.
 */

import { SECTION_KEYWORDS, UNSUPPORTED_SECTIONS } from '../parser';
import { TokenType } from '../../lexer/tokens';

describe('SECTION_KEYWORDS (error recovery)', () => {
  // Regression guard: ensure count doesn't drift unexpectedly
  it('should contain exactly 14 keywords', () => {
    expect(SECTION_KEYWORDS.size).toBe(14);
  });

  // Test each keyword individually for clarity
  it('should include Properties', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Properties)).toBe(true);
  });

  it('should include Fields (parser-only)', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Fields)).toBe(true);
  });

  it('should include Keys (parser-only)', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Keys)).toBe(true);
  });

  it('should include FieldGroups', () => {
    expect(SECTION_KEYWORDS.has(TokenType.FieldGroups)).toBe(true);
  });

  it('should include Code', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Code)).toBe(true);
  });

  it('should include Controls (parser-only)', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Controls)).toBe(true);
  });

  it('should include MenuNodes', () => {
    expect(SECTION_KEYWORDS.has(TokenType.MenuNodes)).toBe(true);
  });

  it('should include Actions', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Actions)).toBe(true);
  });

  it('should include DataItems', () => {
    expect(SECTION_KEYWORDS.has(TokenType.DataItems)).toBe(true);
  });

  it('should include Dataset', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Dataset)).toBe(true);
  });

  it('should include RequestPage', () => {
    expect(SECTION_KEYWORDS.has(TokenType.RequestPage)).toBe(true);
  });

  it('should include Labels', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Labels)).toBe(true);
  });

  it('should include Elements', () => {
    expect(SECTION_KEYWORDS.has(TokenType.Elements)).toBe(true);
  });

  it('should include RequestForm', () => {
    expect(SECTION_KEYWORDS.has(TokenType.RequestForm)).toBe(true);
  });

  // Test exclusions
  it('should NOT include ObjectProperties', () => {
    expect(SECTION_KEYWORDS.has(TokenType.ObjectProperties)).toBe(false);
  });
});

describe('UNSUPPORTED_SECTIONS (always skipped)', () => {
  // Regression guard: ensure count doesn't drift unexpectedly
  it('should contain exactly 6 keywords', () => {
    expect(UNSUPPORTED_SECTIONS.size).toBe(6);
  });

  // Test each keyword individually
  it('should include MenuNodes', () => {
    expect(UNSUPPORTED_SECTIONS.has(TokenType.MenuNodes)).toBe(true);
  });

  it('should include DataItems', () => {
    expect(UNSUPPORTED_SECTIONS.has(TokenType.DataItems)).toBe(true);
  });

  it('should include Dataset', () => {
    expect(UNSUPPORTED_SECTIONS.has(TokenType.Dataset)).toBe(true);
  });

  it('should include RequestPage', () => {
    expect(UNSUPPORTED_SECTIONS.has(TokenType.RequestPage)).toBe(true);
  });

  it('should include Labels', () => {
    expect(UNSUPPORTED_SECTIONS.has(TokenType.Labels)).toBe(true);
  });

  it('should include RequestForm', () => {
    expect(UNSUPPORTED_SECTIONS.has(TokenType.RequestForm)).toBe(true);
  });

  // Test dedicated parser exclusions
  describe('dedicated parser exclusions', () => {
    it('should NOT include Actions (has parseActionSection)', () => {
      expect(UNSUPPORTED_SECTIONS.has(TokenType.Actions)).toBe(false);
    });

    it('should NOT include Controls (has parseControlSection)', () => {
      expect(UNSUPPORTED_SECTIONS.has(TokenType.Controls)).toBe(false);
    });

    it('should NOT include Elements (has parseElementsSection)', () => {
      expect(UNSUPPORTED_SECTIONS.has(TokenType.Elements)).toBe(false);
    });
  });
});

describe('Relationship between constants', () => {
  it('UNSUPPORTED_SECTIONS should be a strict subset of SECTION_KEYWORDS', () => {
    for (const keyword of UNSUPPORTED_SECTIONS) {
      expect(SECTION_KEYWORDS.has(keyword)).toBe(true);
    }
  });

  it('all SECTION_KEYWORDS entries should be valid TokenTypes', () => {
    for (const keyword of SECTION_KEYWORDS) {
      // TokenType is an enum, so valid values are strings
      expect(typeof keyword).toBe('string');
      // Should be a valid TokenType enum value
      expect(Object.values(TokenType)).toContain(keyword);
    }
  });

  it('all UNSUPPORTED_SECTIONS entries should be valid TokenTypes', () => {
    for (const keyword of UNSUPPORTED_SECTIONS) {
      // TokenType is an enum, so valid values are strings
      expect(typeof keyword).toBe('string');
      // Should be a valid TokenType enum value
      expect(Object.values(TokenType)).toContain(keyword);
    }
  });
});
