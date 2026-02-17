/**
 * Lexer Tests - Fields/Keys/Controls Downgrade in CODE_BLOCK Context
 *
 * Tests for issue #505: Fields, Keys, and Controls keywords should be downgraded
 * to Identifier when they appear in CODE_BLOCK context (inside BEGIN...END blocks).
 *
 * ROOT CAUSE:
 * Fields, Keys, and Controls are NOT in the SECTION_KEYWORDS set (lexer.ts lines 92-105),
 * so they are not downgraded when in CODE_BLOCK context. This causes them to be tokenized
 * as their keyword types instead of Identifier when used in expressions like:
 * - WordDocument.MailMerge.Fields.Count
 * - Rec.Keys.GET()
 * - CurrPage.Controls.Count
 *
 * EXPECTED BEHAVIOR:
 * When in CODE_BLOCK context (inside BEGIN...END), these keywords should be downgraded
 * to Identifier type, just like other section keywords (Code, Properties, Actions, etc.)
 * that are already in the SECTION_KEYWORDS set.
 *
 * TEST PATTERNS FROM REAL NAV FILES:
 * - Fields in member expression: WordDocument.MailMerge.Fields.Count
 * - Keys in method call: Rec.Keys.GET()
 * - Controls in member expression: CurrPage.Controls.Count
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Fields/Keys/Controls Downgrade in CODE_BLOCK Context', () => {
  describe('Fields keyword in CODE_BLOCK', () => {
    it('should downgrade Fields to Identifier in member expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      WordDocument : Automation;
      Count : Integer;
    BEGIN
      Count := WordDocument.MailMerge.Fields.Count;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the "Fields" token after MailMerge
      const mailMergeIndex = tokens.findIndex(t => t.value === 'MailMerge');
      expect(mailMergeIndex).toBeGreaterThan(-1);

      // Next should be DOT, then Fields (as Identifier)
      const fieldsToken = tokens[mailMergeIndex + 2];
      expect(fieldsToken.value).toBe('Fields');
      expect(fieldsToken.type).toBe(TokenType.Identifier);
    });

    it('should downgrade Fields to Identifier when used in CODE_BLOCK body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
    BEGIN
      IF Fields > 0 THEN;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the "Fields" token in IF expression (inside BEGIN...END = CODE_BLOCK)
      const ifIndex = tokens.findIndex(t => t.type === TokenType.If);
      const fieldsInIf = tokens.slice(ifIndex).find(t => t.value === 'Fields');
      expect(fieldsInIf).toBeDefined();
      expect(fieldsInIf!.type).toBe(TokenType.Identifier);
    });
  });

  describe('Keys keyword in CODE_BLOCK', () => {
    it('should downgrade Keys to Identifier in method call', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec : Record Customer;
    BEGIN
      Rec.Keys.GET();
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find "Keys" token after Rec DOT
      const recTokens = tokens.filter(t => t.value === 'Rec');
      expect(recTokens.length).toBeGreaterThan(0);

      // Find the Keys token in the expression (not in VAR declaration)
      let foundKeysInExpression = false;
      for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].value === 'Rec' &&
            tokens[i + 1].type === TokenType.Dot &&
            tokens[i + 2].value === 'Keys') {
          expect(tokens[i + 2].type).toBe(TokenType.Identifier);
          foundKeysInExpression = true;
          break;
        }
      }
      expect(foundKeysInExpression).toBe(true);
    });

    it('should downgrade Keys to Identifier when used in CODE_BLOCK body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Text;
    BEGIN
      x := Keys;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the "Keys" token in assignment (inside BEGIN...END = CODE_BLOCK)
      const beginIndex = tokens.findIndex(t => t.type === TokenType.Begin);
      const keysInBody = tokens.slice(beginIndex).find(t => t.value === 'Keys');
      expect(keysInBody).toBeDefined();
      expect(keysInBody!.type).toBe(TokenType.Identifier);
    });
  });

  describe('Controls keyword in CODE_BLOCK', () => {
    it('should downgrade Controls to Identifier in member expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      CurrPage : Page;
      Count : Integer;
    BEGIN
      Count := CurrPage.Controls.Count;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find "Controls" token after CurrPage DOT
      let foundControlsInExpression = false;
      for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].value === 'CurrPage' &&
            tokens[i + 1].type === TokenType.Dot &&
            tokens[i + 2].value === 'Controls') {
          expect(tokens[i + 2].type).toBe(TokenType.Identifier);
          foundControlsInExpression = true;
          break;
        }
      }
      expect(foundControlsInExpression).toBe(true);
    });

    it('should downgrade Controls to Identifier when used in CODE_BLOCK body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Boolean;
    BEGIN
      x := Controls;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the "Controls" token in assignment (inside BEGIN...END = CODE_BLOCK)
      const beginIndex = tokens.findIndex(t => t.type === TokenType.Begin);
      const controlsInBody = tokens.slice(beginIndex).find(t => t.value === 'Controls');
      expect(controlsInBody).toBeDefined();
      expect(controlsInBody!.type).toBe(TokenType.Identifier);
    });
  });

  describe('Mixed section keywords in CODE_BLOCK', () => {
    it('should downgrade Fields, Keys, and Controls to Identifier in CODE_BLOCK body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
    BEGIN
      x := Fields;
      x := Keys;
      x := Controls;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find tokens inside BEGIN...END (CODE_BLOCK context)
      const beginIndex = tokens.findIndex(t => t.type === TokenType.Begin);
      const bodyTokens = tokens.slice(beginIndex);

      const fieldsToken = bodyTokens.find(t => t.value === 'Fields');
      const keysToken = bodyTokens.find(t => t.value === 'Keys');
      const controlsToken = bodyTokens.find(t => t.value === 'Controls');

      expect(fieldsToken).toBeDefined();
      expect(keysToken).toBeDefined();
      expect(controlsToken).toBeDefined();

      expect(fieldsToken!.type).toBe(TokenType.Identifier);
      expect(keysToken!.type).toBe(TokenType.Identifier);
      expect(controlsToken!.type).toBe(TokenType.Identifier);
    });
  });

  describe('Regression: Section keywords at OBJECT_LEVEL should still work', () => {
    it('should not downgrade Fields keyword in FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.   ;Code20 }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const fieldsToken = tokens.find(t => t.type === TokenType.Fields);
      expect(fieldsToken).toBeDefined();
      expect(fieldsToken!.value).toBe('FIELDS');
    });

    it('should not downgrade Keys keyword in KEYS section', () => {
      const code = `OBJECT Table 18 Customer
{
  KEYS
  {
    { ;No. ;Clustered=Yes }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const keysToken = tokens.find(t => t.type === TokenType.Keys);
      expect(keysToken).toBeDefined();
      expect(keysToken!.value).toBe('KEYS');
    });

    it('should not downgrade Controls keyword in CONTROLS section', () => {
      const code = `OBJECT Page 50000 Test
{
  CONTROLS
  {
    { 1   ;   ;Control1 ;Container }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const controlsToken = tokens.find(t => t.type === TokenType.Controls);
      expect(controlsToken).toBeDefined();
      expect(controlsToken!.value).toBe('CONTROLS');
    });
  });
});
