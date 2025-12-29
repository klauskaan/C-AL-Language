/**
 * MODIFY Keyword Tokenization Tests
 *
 * Verifies that MODIFY is tokenized as an IDENTIFIER (not ALOnlyKeyword).
 * This allows MODIFY to function as a Record method in C/AL code.
 *
 * BEFORE FIX:
 * - MODIFY was in AL_ONLY_KEYWORDS map
 * - Tokenized as TokenType.ALOnlyKeyword
 * - Valid C/AL Record method calls were rejected
 *
 * AFTER FIX:
 * - MODIFY removed from AL_ONLY_KEYWORDS map
 * - Tokenized as TokenType.Identifier
 * - Valid C/AL Record method calls are accepted
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

function tokenize(code: string) {
  const lexer = new Lexer(code);
  return lexer.tokenize();
}

describe('MODIFY Keyword Tokenization', () => {
  describe('Basic tokenization', () => {
    it('should tokenize MODIFY as IDENTIFIER', () => {
      const tokens = tokenize('MODIFY');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MODIFY');
    });

    it('should NOT tokenize MODIFY as ALOnlyKeyword', () => {
      const tokens = tokenize('MODIFY');
      expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
    });
  });

  describe('MODIFY in different contexts', () => {
    it('should tokenize MODIFY in method call context', () => {
      const tokens = tokenize('Customer.MODIFY');
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });

    it('should tokenize MODIFY with parameters', () => {
      const tokens = tokenize('MODIFY(TRUE)');
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });

    it('should tokenize MODIFY in explicit record variable context', () => {
      const tokens = tokenize('Customer.MODIFY(TRUE)');
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });

    it('should tokenize MODIFY with FALSE parameter', () => {
      const tokens = tokenize('Customer.MODIFY(FALSE)');
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });
  });

  describe('MODIFY case insensitivity', () => {
    it('should tokenize MODIFY in uppercase', () => {
      const tokens = tokenize('MODIFY');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MODIFY');
    });

    it('should tokenize modify in lowercase', () => {
      const tokens = tokenize('modify');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('modify');
    });

    it('should tokenize Modify in mixed case', () => {
      const tokens = tokenize('Modify');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Modify');
    });

    it('should tokenize mOdIfY in random case', () => {
      const tokens = tokenize('mOdIfY');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('mOdIfY');
    });
  });

  describe('MODIFY vs similar identifiers', () => {
    it('should not confuse MODIFY with MODIFIER', () => {
      const tokens = tokenize('MODIFIER');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MODIFIER');
    });

    it('should not confuse MODIFY with MODIFYING', () => {
      const tokens = tokenize('MODIFYING');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MODIFYING');
    });

    it('should not confuse MODIFY with MODIFIED', () => {
      const tokens = tokenize('MODIFIED');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MODIFIED');
    });

    it('should not confuse MODIFY with MODIFYALL', () => {
      const tokens = tokenize('MODIFYALL');
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MODIFYALL');
    });
  });

  describe('MODIFY as quoted identifier', () => {
    it('should allow MODIFY as quoted identifier', () => {
      const tokens = tokenize('"MODIFY"');
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.QuotedIdentifier);
    });
  });

  describe('MODIFY in record method patterns', () => {
    it('should tokenize MODIFY in simple method call', () => {
      const tokens = tokenize('MODIFY;');
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });

    it('should tokenize MODIFY in record method chain', () => {
      const code = 'Rec.MODIFY';
      const tokens = tokenize(code);
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });

    it('should tokenize multiple MODIFY calls', () => {
      const code = 'Customer.MODIFY(TRUE); Vendor.MODIFY(FALSE);';
      const tokens = tokenize(code);
      const modifyTokens = tokens.filter(t => t.value === 'MODIFY');
      expect(modifyTokens.length).toBe(2);
      modifyTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });
    });

    it('should tokenize MODIFY in REPEAT loop pattern', () => {
      const code = 'REPEAT MODIFY; UNTIL NEXT = 0';
      const tokens = tokenize(code);
      const modifyToken = tokens.find(t => t.value === 'MODIFY');
      expect(modifyToken?.type).toBe(TokenType.Identifier);
    });
  });

  describe('MODIFY is not rejected as AL-only', () => {
    it('should not be marked as AL-only in any case', () => {
      const variants = ['MODIFY', 'modify', 'Modify', 'mOdIfY'];
      for (const variant of variants) {
        const tokens = tokenize(variant);
        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      }
    });
  });
});
