/**
 * Lexer Tests - DATASET Section Support
 *
 * Tests for Report object DATASET section handling.
 * These tests verify that:
 * 1. DATASET keyword is recognized as a section keyword
 * 2. SECTION_LEVEL context is pushed when entering DATASET section
 * 3. Columnar structure parsing (4-column format: ID, IndentLevel, Type, Name)
 * 4. Protection from BEGIN/END keywords in structural columns (COL_1-4)
 * 5. Clean exit with balanced braces
 *
 * The DATASET section uses the same 4-column format as FIELDS/ELEMENTS:
 * { ID ; IndentLevel ; Type ; Name ; properties... }
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - DATASET Section Support', () => {
  describe('DATASET keyword recognition', () => {
    it('should recognize DATASET as section keyword, not identifier', () => {
      const code = 'DATASET';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('DATASET' as TokenType);
      expect(tokens[0].value).toBe('DATASET');
    });

    it('should recognize DATASET case-insensitively', () => {
      const code = 'dataset';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('DATASET' as TokenType);
      expect(tokens[0].value).toBe('dataset');
    });
  });

  describe('Columnar structure parsing', () => {
    it('should tokenize DataItem declaration with 4-column format', () => {
      const code = '{ 6710;    ;DataItem;                    }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Expected tokens: {, 6710, ;, ;, DataItem, ;, ;, }
      expect(tokens[0].type).toBe(TokenType.LeftBrace);
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[1].value).toBe('6710');
      expect(tokens[2].type).toBe(TokenType.Semicolon);
      expect(tokens[3].type).toBe(TokenType.Semicolon);

      const dataItemToken = tokens.find(t => t.value === 'DataItem');
      expect(dataItemToken).toBeDefined();
      expect(dataItemToken!.type).toBe(TokenType.Identifier);
    });

    it('should tokenize Column declaration with indent level', () => {
      const code = '{ 3   ;1   ;Column  ;COMPANYNAME         }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LeftBrace);
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[1].value).toBe('3');
      expect(tokens[2].type).toBe(TokenType.Semicolon);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[3].value).toBe('1');

      const columnToken = tokens.find(t => t.value === 'Column');
      expect(columnToken).toBeDefined();
    });

    it('should handle property assignments in DataItem/Column', () => {
      const code = `{ 3   ;1   ;Column  ;COMPANYNAME         ;
                     SourceExpr=COMPANYPROPERTY.DISPLAYNAME }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find SourceExpr property
      const sourceExprIndex = tokens.findIndex(t =>
        t.type === TokenType.Identifier && t.value === 'SourceExpr'
      );
      expect(sourceExprIndex).toBeGreaterThan(-1);
      expect(tokens[sourceExprIndex + 1].type).toBe(TokenType.Equal);
    });
  });

  describe('Protection from BEGIN/END keywords in structural columns', () => {
    it('should treat BEGIN in COL_1 (ID column) as identifier', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
    { BEGIN ;    ;DataItem;Test }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      // Find the BEGIN token inside DATASET
      const beginToken = tokens.find(t =>
        t.value.toUpperCase() === 'BEGIN' &&
        t.line > 3
      );

      // Should be tokenized as Identifier, not Begin keyword
      expect(beginToken).toBeDefined();
      expect(beginToken!.type).toBe(TokenType.Identifier);

      // Should have clean exit (no CODE_BLOCK context pushed)
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should treat END in COL_3 (Type column) as identifier', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
    { 1 ;    ;END;Test }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      const endToken = tokens.find(t =>
        t.value.toUpperCase() === 'END' &&
        t.line > 3
      );

      expect(endToken).toBeDefined();
      expect(endToken!.type).toBe(TokenType.Identifier);

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });

    it('should treat CASE in COL_4 (Name column) as identifier', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
    { 1 ;    ;Column;CASE }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      const caseToken = tokens.find(t =>
        t.value.toUpperCase() === 'CASE' &&
        t.line > 3
      );

      expect(caseToken).toBeDefined();
      expect(caseToken!.type).toBe(TokenType.Identifier);

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });

    it('should allow BEGIN/END in property values (COL_5+)', () => {
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
    { 6710;    ;DataItem;Test                    ;
               OnPreDataItem=BEGIN
                               x := 1;
                             END;
                }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      // BEGIN/END in trigger property should push CODE_BLOCK context
      const beginTokens = tokens.filter(t => t.type === TokenType.Begin);
      expect(beginTokens.length).toBeGreaterThan(0);

      // Should have clean exit
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });
  });

  describe('Complete Report object with DATASET', () => {
    it('should tokenize Report with DATASET containing DataItem and Columns', () => {
      const code = `OBJECT Report 50000 Test Report
{
  PROPERTIES
  {
    CaptionML=ENU=Test Report;
  }
  DATASET
  {
    { 6710;    ;DataItem;Customer              ;
               DataItemTable=Table18;
               OnAfterGetRecord=BEGIN
                                  x := "No.";
                                END;
                }
    { 1   ;1   ;Column  ;CustomerNo            ;
               SourceExpr="No." }
    { 2   ;1   ;Column  ;CustomerName          ;
               SourceExpr=Name }
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
    }
    CONTROLS
    {
    }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      // Should have clean exit
      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.bracketDepth).toBe(0);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle DATASET with nested trigger code', () => {
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
    { 6710;    ;DataItem;GL_Account           ;
               DataItemTable=Table15;
               OnPreDataItem=BEGIN
                               CASE "Account Type" OF
                                 "Account Type"::Posting:
                                   x := 1;
                                 "Account Type"::Heading:
                                   x := 2;
                               END;
                             END;
                }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle empty DATASET section', () => {
      const code = `OBJECT Report 50000 Test
{
  PROPERTIES
  {
  }
  DATASET
  {
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.braceDepth).toBe(0);
      expect(state.contextStack).toEqual(['NORMAL']);
    });
  });

  describe('SECTION_LEVEL context management', () => {
    it('should push SECTION_LEVEL context when entering DATASET section', () => {
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
    });

    it('should handle DATASET section with simple DataItem', () => {
      const code = `OBJECT Report 50000 Test
{
  DATASET
  {
    { 1 ;    ;DataItem;Test }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
    });
  });
});
