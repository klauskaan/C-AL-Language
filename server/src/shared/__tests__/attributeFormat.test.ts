/**
 * Unit tests for formatAttributeTokenValue() utility function
 *
 * Context: Formats token values for display in procedure attribute parameters.
 * The lexer has already unescaped token values (e.g., '' → '), so this function
 * must RE-escape them for display (e.g., ' → '').
 *
 * Used by: hover and documentSymbol providers to display attribute parameters.
 */

import { Token, TokenType } from '../../lexer/tokens';
import { formatAttributeTokenValue } from '../attributeFormat';

/**
 * Helper to create a minimal test token
 * (Only type and value are relevant for formatting)
 */
function createToken(type: TokenType, value: string): Token {
  return {
    type,
    value,
    line: 1,
    column: 1,
    startOffset: 0,
    endOffset: value.length
  };
}

describe('formatAttributeTokenValue()', () => {
  describe('String tokens', () => {
    it('should wrap simple string with no embedded quotes in single quotes', () => {
      const token = createToken(TokenType.String, 'hello');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe("'hello'");
    });

    it('should re-escape single embedded quote', () => {
      // Lexer already unescaped '' to '
      const token = createToken(TokenType.String, "O'Brien");
      const result = formatAttributeTokenValue(token);
      // Re-escape for display: ' → ''
      expect(result).toBe("'O''Brien'");
    });

    it('should re-escape multiple embedded quotes', () => {
      // Lexer already unescaped all '' to '
      const token = createToken(TokenType.String, "it's a 'test'");
      const result = formatAttributeTokenValue(token);
      // Re-escape all ' → '' for display
      expect(result).toBe("'it''s a ''test'''");
    });

    it('should handle empty string', () => {
      const token = createToken(TokenType.String, '');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe("''");
    });

    it('should handle string with only a single quote', () => {
      // Lexer unescaped '''''' (6 quotes) to ''' (3 quotes)
      // which represents a string containing a single quote character
      const token = createToken(TokenType.String, "'");
      const result = formatAttributeTokenValue(token);
      // Re-escape: ' → ''
      expect(result).toBe("''''");
    });

    it('should handle string with consecutive quotes', () => {
      // Lexer unescaped: 'can''t won''t' → can't won't
      const token = createToken(TokenType.String, "can't won't");
      const result = formatAttributeTokenValue(token);
      // Re-escape for display
      expect(result).toBe("'can''t won''t'");
    });
  });

  describe('QuotedIdentifier tokens', () => {
    it('should wrap identifier with spaces in double quotes', () => {
      // Lexer stripped surrounding quotes from "My Field"
      const token = createToken(TokenType.QuotedIdentifier, 'My Field');
      const result = formatAttributeTokenValue(token);
      // Re-wrap in double quotes
      expect(result).toBe('"My Field"');
    });

    it('should wrap simple quoted identifier', () => {
      const token = createToken(TokenType.QuotedIdentifier, 'Name');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('"Name"');
    });

    it('should handle empty quoted identifier', () => {
      const token = createToken(TokenType.QuotedIdentifier, '');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('""');
    });

    it('should wrap identifier with special characters', () => {
      const token = createToken(TokenType.QuotedIdentifier, 'My-Field@123');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('"My-Field@123"');
    });
  });

  describe('Default case - other token types', () => {
    it('should return raw value for Integer', () => {
      const token = createToken(TokenType.Integer, '42');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('42');
    });

    it('should return raw value for Identifier', () => {
      const token = createToken(TokenType.Identifier, 'TRUE');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('TRUE');
    });

    it('should return raw value for Boolean keyword', () => {
      const token = createToken(TokenType.True, 'TRUE');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('TRUE');
    });

    it('should return raw value for Decimal', () => {
      const token = createToken(TokenType.Decimal, '3.14');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('3.14');
    });

    it('should return raw value for Date', () => {
      const token = createToken(TokenType.Date, '010125D');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('010125D');
    });

    it('should return raw value for Time', () => {
      const token = createToken(TokenType.Time, '120000T');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('120000T');
    });

    it('should return raw value for unknown tokens', () => {
      const token = createToken(TokenType.Unknown, 'something');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('something');
    });
  });

  describe('Edge cases', () => {
    it('should handle string with leading/trailing spaces', () => {
      const token = createToken(TokenType.String, '  hello  ');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe("'  hello  '");
    });

    it('should handle quoted identifier with leading/trailing spaces', () => {
      const token = createToken(TokenType.QuotedIdentifier, '  Field  ');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('"  Field  "');
    });

    it('should handle very long string', () => {
      const longValue = 'a'.repeat(1000);
      const token = createToken(TokenType.String, longValue);
      const result = formatAttributeTokenValue(token);
      expect(result).toBe(`'${longValue}'`);
      expect(result.length).toBe(1002); // 1000 + 2 quotes
    });

    it('should handle string with newline characters', () => {
      // C/AL strings can technically contain escaped newlines
      const token = createToken(TokenType.String, 'line1\nline2');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe("'line1\nline2'");
    });
  });

  describe('Real-world attribute parameter patterns', () => {
    it('should format attribute with string parameter', () => {
      // [External('Microsoft.Dynamics.Nav.Client.ErrorInfo')]
      const token = createToken(
        TokenType.String,
        'Microsoft.Dynamics.Nav.Client.ErrorInfo'
      );
      const result = formatAttributeTokenValue(token);
      expect(result).toBe("'Microsoft.Dynamics.Nav.Client.ErrorInfo'");
    });

    it('should format attribute with boolean parameter', () => {
      // [Scope(Personalization)]
      const token = createToken(TokenType.Identifier, 'Personalization');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('Personalization');
    });

    it('should format attribute with integer parameter', () => {
      // [RunTrigger(1)]
      const token = createToken(TokenType.Integer, '1');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('1');
    });

    it('should format attribute with quoted field name', () => {
      // [TableRelation("My Table"."My Field")]
      const token = createToken(TokenType.QuotedIdentifier, 'My Table');
      const result = formatAttributeTokenValue(token);
      expect(result).toBe('"My Table"');
    });
  });
});
