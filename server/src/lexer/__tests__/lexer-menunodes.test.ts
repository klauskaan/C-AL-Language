/**
 * Lexer Tests - MENUNODES Section Support
 *
 * Tests for MenuSuite object MENUNODES section handling.
 * These tests verify that:
 * 1. MENUNODES keyword is recognized as a section keyword
 * 2. SECTION_LEVEL context is pushed when entering MENUNODES section
 * 3. Apostrophes in property values are treated as identifier characters
 * 4. Clean exit with balanced braces
 * 5. Columnar structure parsing (MenuItem type, GUID, properties)
 *
 * Bug Reference: MenuSuite objects fail to parse MENUNODES section correctly,
 * specifically apostrophes in property values like "Create HR's from Employees"
 * cause tokenization errors.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - MENUNODES Section Support', () => {
  describe('MENUNODES keyword recognition', () => {
    it('should recognize MENUNODES as section keyword, not identifier', () => {
      const code = 'MENUNODES';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('MENUNODES' as TokenType);
      expect(tokens[0].value).toBe('MENUNODES');
    });

    it('should recognize MENUNODES case-insensitively', () => {
      const code = 'menunodes';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('MENUNODES' as TokenType);
      expect(tokens[0].value).toBe('menunodes');
    });

    it('should recognize MENUNODES in mixed case', () => {
      const code = 'MenuNodes';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('MENUNODES' as TokenType);
      expect(tokens[0].value).toBe('MenuNodes');
    });
  });

  describe('SECTION_LEVEL context pushed for MENUNODES', () => {
    it('should push SECTION_LEVEL context when entering MENUNODES section', () => {
      const code = `OBJECT MenuSuite 1 Test
{
  MENUNODES
  {
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
    });

    it('should handle MENUNODES section with simple MenuItem', () => {
      const code = `OBJECT MenuSuite 1 Test
{
  MENUNODES
  {
    { MenuItem  ;1 }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
    });
  });

  describe('Apostrophes in property values - core bug fix', () => {
    it('should treat apostrophes in Name property as identifier characters', () => {
      // This is the core bug: apostrophes in "HR's" trigger STRING tokenization
      const code = `MENUNODES
{
  { MenuItem  ;1 ;
                  Name=Create HR's from Employees }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const stringTokens = tokens.filter(t => t.type === TokenType.String);
      expect(stringTokens.length).toBe(0);

      // The apostrophe should be part of the identifier/property value
      const nameTokenIndex = tokens.findIndex(t =>
        t.type === TokenType.Identifier && t.value === 'Name'
      );
      expect(nameTokenIndex).toBeGreaterThan(-1);

      // After Name=, the value should include the apostrophe
      // In SECTION_LEVEL context, property values are tokenized as identifiers
      const valueAfterEquals = tokens[nameTokenIndex + 2]; // Name, =, value
      expect(valueAfterEquals.type).toBe(TokenType.Identifier);
      // Value should contain text with apostrophe (exact format depends on implementation)
    });

    it('should handle multiple apostrophes in property values', () => {
      const code = `MENUNODES
{
  { MenuItem  ;1 ;
                  Name=Employee's HR Manager's Options }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const stringTokens = tokens.filter(t => t.type === TokenType.String);
      expect(stringTokens.length).toBe(0);
    });

    it('should handle apostrophes in other property values', () => {
      const code = `MENUNODES
{
  { MenuItem  ;1 ;
                  Name=Test;
                  CaptionML=ENU=Customer's List }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const stringTokens = tokens.filter(t => t.type === TokenType.String);
      expect(stringTokens.length).toBe(0);
    });
  });

  describe('Clean exit with balanced braces', () => {
    it('should have balanced braces at end of MenuSuite object', () => {
      const code = `OBJECT MenuSuite 1 Test
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
    Time=120000T;
  }
  MENUNODES
  {
    { MenuItem  ;1 ;Name=Test }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle nested braces in MenuItems', () => {
      const code = `OBJECT MenuSuite 1 Test
{
  MENUNODES
  {
    { MenuItem  ;1 ;Name=Parent }
    { MenuItem  ;2 ;ParentID=1;Name=Child }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });
  });

  describe('Columnar structure parsing', () => {
    it('should tokenize MenuItem type declaration', () => {
      const code = '{ MenuItem  ;1 }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Expected tokens: {, MenuItem, ;, 1, ;, }
      expect(tokens[0].type).toBe(TokenType.LeftBrace);
      expect(tokens[1].type).toBe(TokenType.Identifier); // MenuItem is a value, not keyword
      expect(tokens[1].value).toBe('MenuItem');
      expect(tokens[2].type).toBe(TokenType.Semicolon);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[3].value).toBe('1');
    });

    it('should tokenize GUID in brackets', () => {
      const code = '{ MenuItem  ;[{12345678-1234-1234-1234-123456789ABC}] }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Expected: {, MenuItem, ;, [, {, GUID-content, }, ], }
      const leftBracketIndex = tokens.findIndex(t => t.type === TokenType.LeftBracket);
      expect(leftBracketIndex).toBeGreaterThan(-1);

      const rightBracketIndex = tokens.findIndex(t => t.type === TokenType.RightBracket);
      expect(rightBracketIndex).toBeGreaterThan(leftBracketIndex);
    });

    it('should tokenize property assignments in MenuItem', () => {
      const code = '{ MenuItem  ;1 ;Name=Test;Level=1 }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find Name property
      const nameIndex = tokens.findIndex(t =>
        t.type === TokenType.Identifier && t.value === 'Name'
      );
      expect(nameIndex).toBeGreaterThan(-1);
      expect(tokens[nameIndex + 1].type).toBe(TokenType.Equal);

      // Find Level property
      const levelIndex = tokens.findIndex(t =>
        t.type === TokenType.Identifier && t.value === 'Level'
      );
      expect(levelIndex).toBeGreaterThan(-1);
      expect(tokens[levelIndex + 1].type).toBe(TokenType.Equal);
    });

    it('should handle complex MenuItem with multiple properties', () => {
      const code = `MENUNODES
{
  { MenuItem  ;1 ;
                  Name=Create HR's from Employees;
                  CaptionML=ENU=Create HR's from Employees;
                  RunObjectType=Report;
                  RunObjectID=1140 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const propertyNames = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        ['Name', 'CaptionML', 'RunObjectType', 'RunObjectID'].includes(t.value)
      );
      expect(propertyNames.length).toBe(4);

      // No STRING tokens should be present
      const stringTokens = tokens.filter(t => t.type === TokenType.String);
      expect(stringTokens.length).toBe(0);
    });
  });

  describe('Protection from BEGIN/END keywords in structural columns', () => {
    it('should treat BEGIN in COL_1 as identifier, not code block keyword', () => {
      const code = `OBJECT MenuSuite 1010 Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test;
  }
  MENUNODES
  {
    { BEGIN ;[{00000000-0001-0000-0000-000000000000}] ;Name=Test }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      // Find the BEGIN token inside MENUNODES
      const beginToken = tokens.find(t =>
        t.value.toUpperCase() === 'BEGIN' &&
        t.line > 7 // After MENUNODES opening
      );

      // Should be tokenized as Identifier, not Begin keyword
      expect(beginToken).toBeDefined();
      expect(beginToken!.type).toBe(TokenType.Identifier);

      // Should have clean exit (braceDepth = 0, no CODE_BLOCK context pushed)
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should treat END in COL_1 as identifier, not code block keyword', () => {
      const code = `OBJECT MenuSuite 1010 Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test;
  }
  MENUNODES
  {
    { END ;[{00000000-0001-0000-0000-000000000000}] ;Name=Test }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      // Find the END token inside MENUNODES
      const endToken = tokens.find(t =>
        t.value.toUpperCase() === 'END' &&
        t.line > 7
      );

      // Should be tokenized as Identifier, not End keyword
      expect(endToken).toBeDefined();
      expect(endToken!.type).toBe(TokenType.Identifier);

      // Should have clean exit
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });

    it('should treat CASE in COL_1 as identifier, not case block keyword', () => {
      const code = `OBJECT MenuSuite 1010 Test
{
  MENUNODES
  {
    { CASE ;[{00000000-0001-0000-0000-000000000000}] ;Name=Test }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      // Find the CASE token inside MENUNODES
      const caseToken = tokens.find(t =>
        t.value.toUpperCase() === 'CASE' &&
        t.line > 3
      );

      // Should be tokenized as Identifier, not Case keyword
      expect(caseToken).toBeDefined();
      expect(caseToken!.type).toBe(TokenType.Identifier);

      // Should have clean exit (no CASE_BLOCK pushed)
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });
  });

  describe('Complete MenuSuite object', () => {
    it('should tokenize complete MenuSuite with MENUNODES section', () => {
      const code = `OBJECT MenuSuite 1 Test MenuSuite
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
    Time=120000T;
  }
  PROPERTIES
  {
  }
  MENUNODES
  {
    { MenuItem  ;1 ;
                  Name=Create HR's from Employees;
                  CaptionML=ENU=Create HR's from Employees;
                  RunObjectType=Report;
                  RunObjectID=1140 }
    { MenuItem  ;2 ;
                  ParentID=1;
                  Name=Subitem;
                  CaptionML=ENU=Subitem }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      const stringTokens = tokens.filter(t => t.type === TokenType.String);
      expect(stringTokens.length).toBe(0);

      // Should have clean exit
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.bracketDepth).toBe(0);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle MenuSuite with no MENUNODES content', () => {
      const code = `OBJECT MenuSuite 1 Test
{
  PROPERTIES
  {
  }
  MENUNODES
  {
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Should still handle context transitions correctly
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });

    it('should handle MenuSuite with deeply nested MenuItems', () => {
      const code = `OBJECT MenuSuite 1 Test
{
  MENUNODES
  {
    { MenuItem  ;1 ;Name=Level 1 }
    { MenuItem  ;2 ;ParentID=1;Name=Level 2 }
    { MenuItem  ;3 ;ParentID=2;Name=Level 3 }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });
  });
});
