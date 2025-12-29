import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('OBJECT-PROPERTIES Tokenization', () => {
  it('should tokenize OBJECT-PROPERTIES as a single token', () => {
    const code = 'OBJECT-PROPERTIES';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBeGreaterThanOrEqual(1);
    expect(tokens[0].type).toBe(TokenType.ObjectProperties);
    expect(tokens[0].value).toBe('OBJECT-PROPERTIES');
  });

  it('should tokenize OBJECT-PROPERTIES in a complete object structure', () => {
    const code = `OBJECT Codeunit 1003 Test
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Find the OBJECT-PROPERTIES token
    const objPropsToken = tokens.find(t => t.type === TokenType.ObjectProperties);
    expect(objPropsToken).toBeDefined();
    expect(objPropsToken?.value).toBe('OBJECT-PROPERTIES');

    // Verify no Minus token appears between OBJECT and PROPERTIES
    const hasMinusToken = tokens.some(t => t.type === TokenType.Minus && t.line === 3);
    expect(hasMinusToken).toBe(false);
  });

  it('should handle case-insensitive OBJECT-PROPERTIES', () => {
    const testCases = [
      'OBJECT-PROPERTIES',
      'Object-Properties',
      'object-properties',
      'OBject-PROperties'
    ];

    testCases.forEach(testCase => {
      const lexer = new Lexer(testCase);
      const tokens = lexer.tokenize();
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      expect(tokens[0].type).toBe(TokenType.ObjectProperties);
      expect(tokens[0].value).toBe(testCase);
    });
  });

  it('should not tokenize OBJECT followed by minus operator as OBJECT-PROPERTIES', () => {
    const code = 'Result := OBJECT - 5';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Should have separate OBJECT and Minus tokens
    const objectToken = tokens.find(t => t.type === TokenType.Object || t.value.toUpperCase() === 'OBJECT');
    const minusToken = tokens.find(t => t.type === TokenType.Minus);

    expect(objectToken).toBeDefined();
    expect(minusToken).toBeDefined();

    // Should NOT have OBJECT-PROPERTIES token
    const objPropsToken = tokens.find(t => t.type === TokenType.ObjectProperties);
    expect(objPropsToken).toBeUndefined();
  });

  it('should handle whitespace around OBJECT-PROPERTIES', () => {
    const code = `  OBJECT-PROPERTIES  `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBeGreaterThanOrEqual(1);
    expect(tokens[0].type).toBe(TokenType.ObjectProperties);
  });

  it('should tokenize OBJECT-PROPERTIES followed by brace', () => {
    const code = `OBJECT-PROPERTIES
{`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.ObjectProperties);
    expect(tokens[0].value).toBe('OBJECT-PROPERTIES');
    expect(tokens[1].type).toBe(TokenType.LeftBrace);
  });
});
