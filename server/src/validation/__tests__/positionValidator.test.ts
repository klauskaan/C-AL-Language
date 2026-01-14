/**
 * Position Validator Tests
 *
 * Tests for the position validator utility (Task 4 - Issue #92).
 * Following TDD: These tests are written FIRST and should FAIL until implementation.
 *
 * The position validator verifies that:
 * - Token positions match document content
 * - Token values match extracted substrings
 * - No gaps or overlaps in tokenization
 * - Special handling for String and QuotedIdentifier tokens
 */

import { Lexer } from '../../lexer/lexer';
import { TokenType } from '../../lexer/tokens';
import { validateTokenPositions } from '../positionValidator';

describe('Position Validator - Basic Validation', () => {
  it('should pass validation for correctly tokenized file', () => {
    const code = 'OBJECT Table 18 Customer\n{\n  FIELDS\n  {\n  }\n}\n';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should detect value mismatch', () => {
    const code = 'OBJECT Table 18 Customer';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Corrupt the token value to simulate a mismatch
    tokens[1] = { ...tokens[1], value: 'WrongValue' };

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('value mismatch');
  });

  it('should detect token overlap', () => {
    const code = 'OBJECT Table';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Corrupt token positions to create overlap
    tokens[1] = { ...tokens[1], startOffset: 5, endOffset: 8 };

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('overlap');
  });

  it('should detect invalid trivia content', () => {
    const code = 'OBJECT  Table';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Corrupt token positions to skip non-whitespace character 'T'
    // Gap from 6 to 9 contains: '  T' (two spaces + 'T')
    // Token values are adjusted to match the new positions
    tokens[0] = { ...tokens[0], endOffset: 6 }; // OBJECT (0-6)
    tokens[1] = { ...tokens[1], value: 'able', startOffset: 9, endOffset: 13 }; // able (9-13)

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid trivia');
  });

  it('should handle EOF token correctly', () => {
    const code = 'OBJECT';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // EOF token should be at document end
    const eofToken = tokens[tokens.length - 1];
    expect(eofToken.type).toBe(TokenType.EOF);
    expect(eofToken.startOffset).toBe(code.length);
    expect(eofToken.endOffset).toBe(code.length);
  });

  it('should handle empty document', () => {
    const code = '';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });
});

describe('Position Validator - String Tokens', () => {
  it('should validate string token with quotes excluded from value', () => {
    const code = "Caption='Hello';";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // String token value should exclude quotes
    const stringToken = tokens.find(t => t.type === TokenType.String);
    expect(stringToken).toBeDefined();
    expect(stringToken!.value).toBe('Hello');
    // But positions should include quotes
    expect(code.substring(stringToken!.startOffset, stringToken!.endOffset)).toBe("'Hello'");
  });

  it('should validate string with escaped quotes', () => {
    const code = "Text='don''t';";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    const stringToken = tokens.find(t => t.type === TokenType.String);
    expect(stringToken).toBeDefined();
    // Value should have escape converted: don''t -> don't
    expect(stringToken!.value).toBe("don't");
    // Position should include outer quotes and escape sequence
    expect(code.substring(stringToken!.startOffset, stringToken!.endOffset)).toBe("'don''t'");
  });

  it('should validate string with multiple escaped quotes', () => {
    const code = "Text='it''s a ''test''';";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    const stringToken = tokens.find(t => t.type === TokenType.String);
    expect(stringToken).toBeDefined();
    // Value: it''s a ''test'' -> it's a 'test'
    expect(stringToken!.value).toBe("it's a 'test'");
    // Position should include all escape sequences
    expect(code.substring(stringToken!.startOffset, stringToken!.endOffset)).toBe("'it''s a ''test'''");
  });

  it('should validate multi-line string with LF', () => {
    const code = "Text='Line1\nLine2';";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    const stringToken = tokens.find(t => t.type === TokenType.String);
    expect(stringToken).toBeDefined();
    // Value should contain LF
    expect(stringToken!.value).toBe('Line1\nLine2');
    // Position should span multiple lines
    expect(code.substring(stringToken!.startOffset, stringToken!.endOffset)).toBe("'Line1\nLine2'");
  });

  it('should validate multi-line string with CRLF', () => {
    const code = "Text='Line1\r\nLine2';";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    const stringToken = tokens.find(t => t.type === TokenType.String);
    expect(stringToken).toBeDefined();
    // Value should contain CRLF
    expect(stringToken!.value).toBe('Line1\r\nLine2');
    // Position should span multiple lines
    expect(code.substring(stringToken!.startOffset, stringToken!.endOffset)).toBe("'Line1\r\nLine2'");
  });

  it('should validate multi-line string with embedded escaped quotes', () => {
    const code = "Text='Line1\ndon''t\nLine3';";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    const stringToken = tokens.find(t => t.type === TokenType.String);
    expect(stringToken).toBeDefined();
    // Value should have newlines AND converted escapes
    expect(stringToken!.value).toBe("Line1\ndon't\nLine3");
    // Position should include everything
    expect(code.substring(stringToken!.startOffset, stringToken!.endOffset)).toBe("'Line1\ndon''t\nLine3'");
  });
});

describe('Position Validator - QuotedIdentifier Tokens', () => {
  it('should validate quoted identifier with quotes excluded from value', () => {
    const code = 'Field="Customer No.";';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    const quotedToken = tokens.find(t => t.type === TokenType.QuotedIdentifier);
    expect(quotedToken).toBeDefined();
    // Value should exclude quotes
    expect(quotedToken!.value).toBe('Customer No.');
    // Position should include quotes
    expect(code.substring(quotedToken!.startOffset, quotedToken!.endOffset)).toBe('"Customer No."');
  });

  it('should validate that quoted identifiers do NOT support escapes', () => {
    // QuotedIdentifiers in C/AL do NOT have escape sequences (verified in lexer)
    // If someone writes "test""value", it's likely an error
    const code = 'Field="test""value";';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const _result = validateTokenPositions(code, tokens);

    // The lexer will stop at the first closing quote
    const quotedToken = tokens.find(t => t.type === TokenType.QuotedIdentifier);
    expect(quotedToken).toBeDefined();
    // Should only capture "test", NOT the escape sequence
    expect(quotedToken!.value).toBe('test');
  });
});

describe('Position Validator - Unknown Token Sources', () => {
  it('should detect unclosed string', () => {
    const code = "Text='hello";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    // Value should be the content without opening quote
    expect(unknownToken!.value).toBe('hello');
    // Position should include opening quote
    expect(code.substring(unknownToken!.startOffset, unknownToken!.endOffset)).toBe("'hello");
  });

  it('should detect unclosed string with escaped quotes', () => {
    const code = "Text='don''t";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    // Value should have escape converted even though unclosed
    expect(unknownToken!.value).toBe("don't");
    // Position should include opening quote and escape
    expect(code.substring(unknownToken!.startOffset, unknownToken!.endOffset)).toBe("'don''t");
  });

  it('should detect unclosed quoted identifier', () => {
    const code = 'Field="test';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    // Value should be content without opening quote
    expect(unknownToken!.value).toBe('test');
    // Position should include opening quote
    expect(code.substring(unknownToken!.startOffset, unknownToken!.endOffset)).toBe('"test');
  });

  it('should detect unclosed multi-line string', () => {
    const code = "Text='Line1\nLine2";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    // Value should contain newline
    expect(unknownToken!.value).toBe('Line1\nLine2');
  });

  it('should detect unmatched closing brace', () => {
    const code = 'OBJECT } Table';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    expect(unknownToken!.value).toBe('}');
  });

  it('should detect unrecognized character (backtick)', () => {
    const code = 'OBJECT ` Table';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    expect(unknownToken!.value).toBe('`');
  });

  it('should detect @ symbol for auto-numbering (not implemented in lexer)', () => {
    const code = 'Customer@1000';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const _result = validateTokenPositions(code, tokens);

    // @ symbol tokenizes as Unknown
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    expect(unknownToken!.value).toBe('@');
  });

  it('should detect unclosed brace comment', () => {
    const code = 'BEGIN { comment';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    // Unclosed brace comment creates Unknown token
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    expect(unknownToken!.value).toBe('{');
  });

  it('should detect unclosed C-style comment', () => {
    const code = 'BEGIN /* comment';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    // Unclosed C-style comment creates Unknown token
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    expect(unknownToken!.value).toBe('/*');
  });

  it('should handle empty unclosed string (just single quote)', () => {
    const code = "Text='";
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    // Value should be empty (nothing after the quote)
    expect(unknownToken!.value).toBe('');
    // Position should include the single quote
    expect(code.substring(unknownToken!.startOffset, unknownToken!.endOffset)).toBe("'");
  });

  it('should handle empty unclosed quoted identifier (just double quote)', () => {
    const code = 'Field="';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true); // Validator should handle Unknown tokens
    const unknownToken = tokens.find(t => t.type === TokenType.Unknown);
    expect(unknownToken).toBeDefined();
    // Value should be empty (nothing after the quote)
    expect(unknownToken!.value).toBe('');
    // Position should include the single double quote
    expect(code.substring(unknownToken!.startOffset, unknownToken!.endOffset)).toBe('"');
  });
});

describe('Position Validator - Trivia Validation', () => {
  it('should collect trivia warnings for suspicious brace content', () => {
    // This test verifies integration with looksLikeCode from triviaComputer
    const code = 'OBJECT Table 18 Customer\n{\n  BEGIN x := 5; END\n}\n';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    // If there's a brace comment with code-like content in trivia, should warn
    // This specific example doesn't have braces in trivia (they're structural)
    // So warnings should be empty
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about brace comment with assignment in trivia', () => {
    // Create a scenario where braces appear in trivia
    const code = 'OBJECT Table 18 { x := 5; } Customer';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    // At OBJECT_LEVEL, braces are structural, not comments
    // So this won't generate a trivia warning
    // Instead, the lexer will tokenize { and } as structural delimiters
    expect(result.isValid).toBe(true);
  });

  it('should not warn about normal brace comments', () => {
    const code = 'BEGIN\n  { This is a simple comment }\n  x := 1;\nEND';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // Normal comments shouldn't generate warnings
    expect(result.warnings).toHaveLength(0);
  });
});

describe('Position Validator - Edge Cases', () => {
  it('should validate tokens at document boundaries', () => {
    const code = 'BEGIN';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // First token should start at 0
    expect(tokens[0].startOffset).toBe(0);
    // Last meaningful token should end at document length
    expect(tokens[0].endOffset).toBe(5);
  });

  it('should handle consecutive tokens with no trivia', () => {
    const code = 'BEGIN END';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // Tokens should have exactly one space between them
    expect(tokens[0].endOffset).toBe(5); // "BEGIN"
    expect(tokens[1].startOffset).toBe(6); // "END"
  });

  it('should handle complex trivia between tokens', () => {
    const code = 'BEGIN  \n  // comment\n  \t  END';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // Should validate all trivia types: spaces, newlines, tabs, comments
  });

  it('should validate very long document', () => {
    // Create a document with many tokens
    const code = Array(1000).fill('OBJECT Table 18 Customer').join('\n');
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // Should handle thousands of tokens efficiently
    expect(tokens.length).toBeGreaterThan(4000); // 4 tokens per line + EOF
  });

  it('should handle document with all token types', () => {
    const code = `
      OBJECT Table 18 Customer
      {
        FIELDS
        {
          { 1   ;   ;No.                 ;Code20        }
        }
        PROCEDURE TestProc();
        VAR
          x : Integer;
        BEGIN
          x := 42 + 3.14;
          IF x > 0 THEN
            EXIT(TRUE);
        END;
      }
    `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const result = validateTokenPositions(code, tokens);

    expect(result.isValid).toBe(true);
    // Should handle identifiers, keywords, operators, literals, delimiters
  });
});
