/**
 * Lexer Tests - ML Property Values with Comment-Like Sequences
 *
 * Tests that the lexer correctly handles comment-like sequences (://, /*)
 * inside ML property values like InstructionalTextML=[...].
 *
 * REGRESSION COVERAGE: The lexer previously treated :// and /* as comment starts
 * even when they appeared inside ML property values, causing it to consume closing
 * brackets when they appeared on the same line.
 *
 * These tests verify that:
 * - URLs with :// inside ML brackets are treated as literal text
 * - C-style comment sequences /* inside ML brackets are treated as literal text
 * - Real comments outside brackets continue to work normally
 *
 * Real-world occurrence: PAG1817.TXT line 190-191
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - ML Properties with Comment-Like Sequences', () => {
  describe('URLs with :// inside ML properties', () => {
    it('should tokenize InstructionalTextML with https:// URL and closing bracket on same line', () => {
      // Pattern from PAG1817.TXT line 190-191
      const code = `InstructionalTextML=[DAN=Visit https://example.com for info;
                                     ENU=Visit https://example.com for info]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the property name
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('InstructionalTextML');

      // Find the equals sign
      expect(tokens[1].type).toBe(TokenType.Equal);

      // Find the left bracket
      expect(tokens[2].type).toBe(TokenType.LeftBracket);

      // Find the right bracket - this should exist but currently gets consumed by comment
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(rightBrackets).toHaveLength(1);

      // Should have no Unknown tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should tokenize InstructionalTextML with http:// URL and closing bracket on same line', () => {
      const code = `InstructionalTextML=[DAN=Go to http://example.com;
                                     ENU=Go to http://example.com]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Should have no Unknown tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle exact pattern from PAG1817.TXT', () => {
      // Exact pattern from line 190-191 (simplified)
      const code = `InstructionalTextML=[DAN=URL til din l�sning, f.eks. https://mycrm.crm4.dynamics.com;
                                     ENU=URL to your solution, such as https://mycrm.crm4.dynamics.com]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify clean exit (balanced brackets)
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
      expect(exitResult.violations).toHaveLength(0);

      // Verify right bracket exists
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(rightBrackets.length).toBeGreaterThan(0);
    });

    it('should handle multiple URLs in ML property separated by semicolons', () => {
      const code = `InstructionalTextML=[DAN=Visit https://site1.com or https://site2.com;
                                     ENU=Visit https://site1.com or https://site2.com]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
    });
  });

  describe('C-style comment lookalike /* inside ML properties', () => {
    it('should handle /* sequence inside ML property value', () => {
      const code = `InstructionalTextML=[DAN=Format is /* comment style */;
                                     ENU=Format is /* comment style */]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Should have no Unknown tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle unclosed /* sequence inside ML property value', () => {
      const code = `InstructionalTextML=[DAN=Use /* for comments;
                                     ENU=Use /* for comments]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
    });
  });

  describe('Control: Real comments outside ML brackets', () => {
    it('should still handle real line comments outside ML properties', () => {
      const code = `// This is a comment
InstructionalTextML=[DAN=Text;
                     ENU=Text]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Comment should be skipped, property should be tokenized
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('InstructionalTextML');

      // Should have matching brackets
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(rightBrackets).toHaveLength(1);
    });

    it('should still handle real C-style comments outside ML properties', () => {
      const code = `/* This is a comment */
InstructionalTextML=[DAN=Text;
                     ENU=Text]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Comment should be skipped, property should be tokenized
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('InstructionalTextML');

      // Should have matching brackets
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(rightBrackets).toHaveLength(1);
    });

    it('should handle line comment after ML property closing bracket', () => {
      const code = `InstructionalTextML=[DAN=Text;
                                     ENU=Text] // Comment after`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have right bracket before comment
      const rightBracketIndex = tokens.findIndex(t => t.type === TokenType.RightBracket);
      expect(rightBracketIndex).toBeGreaterThan(-1);

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
    });
  });

  describe('Complete property context with URLs', () => {
    it('should handle complete PROPERTIES section with InstructionalTextML containing URL', () => {
      const code = `OBJECT Page 1817 Test
{
  PROPERTIES
  {
    InstructionalTextML=[DAN=Start med at specificere URL-adressen, f.eks. https://mycrm.crm4.dynamics.com;
                         ENU=Start by specifying the URL, such as https://mycrm.crm4.dynamics.com];
    GroupType=Group;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
      expect(exitResult.violations).toHaveLength(0);

      // Verify no Unknown tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify all brackets are matched
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets.length).toBeGreaterThan(0);
      expect(leftBrackets.length).toBe(rightBrackets.length);
    });

    it('should handle InstructionalTextML with URL in CONTROLS section', () => {
      const code = `CONTROLS
{
  { 21  ;3   ;Group     ;
              GroupType=Group;
              InstructionalTextML=[DAN=Besøg https://docs.microsoft.com;
                                   ENU=Visit https://docs.microsoft.com] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);

      // No Unknown tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Edge cases: Mixed comment-like sequences', () => {
    it('should handle both :// and /* in same ML property', () => {
      const code = `InstructionalTextML=[DAN=Format /* style */ or https://example.com;
                                     ENU=Format /* style */ or https://example.com]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
    });

    it('should handle // (line comment marker) inside ML property', () => {
      const code = `InstructionalTextML=[DAN=Use // for comments in code;
                                     ENU=Use // for comments in code]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
    });

    it('should handle ftp:// protocol inside ML property', () => {
      const code = `InstructionalTextML=[DAN=Download from ftp://ftp.example.com;
                                     ENU=Download from ftp://ftp.example.com]`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have matching brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets).toHaveLength(1);
      expect(rightBrackets).toHaveLength(1);

      // Clean exit
      const exitResult = lexer.isCleanExit();
      expect(exitResult.passed).toBe(true);
    });
  });
});
