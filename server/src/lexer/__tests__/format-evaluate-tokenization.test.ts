import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Format/Evaluate Tokenization', () => {
  it('should tokenize Format/Evaluate as a single identifier token', () => {
    const code = 'Format/Evaluate';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBeGreaterThanOrEqual(1);
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe('Format/Evaluate');
  });

  it('should tokenize Format/Evaluate in XMLport property context', () => {
    const code = `OBJECT XMLport 1225 Test
{
  PROPERTIES
  {
    Format/Evaluate=XML Format/Evaluate;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Find the Format/Evaluate token
    const formatEvalToken = tokens.find(t => t.value === 'Format/Evaluate');
    expect(formatEvalToken).toBeDefined();
    expect(formatEvalToken?.type).toBe(TokenType.Identifier);

    // Verify no Divide token appears between Format and Evaluate
    const hasDivideToken = tokens.some(t => t.type === TokenType.Divide && t.line === 5);
    expect(hasDivideToken).toBe(false);
  });

  it('should handle case-insensitive Format/Evaluate', () => {
    const testCases = [
      'Format/Evaluate',
      'format/evaluate',
      'FORMAT/EVALUATE',
      'FoRmAt/EvAlUaTe'
    ];

    testCases.forEach(testCase => {
      const lexer = new Lexer(testCase);
      const tokens = lexer.tokenize();
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe(testCase);
    });
  });

  it('should not tokenize Format followed by divide operator as Format/Evaluate', () => {
    const code = 'Result := Format / 5';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Should have separate Format identifier and Divide tokens
    const formatToken = tokens.find(t => t.value.toUpperCase() === 'FORMAT');
    const divideToken = tokens.find(t => t.type === TokenType.Divide);

    expect(formatToken).toBeDefined();
    expect(divideToken).toBeDefined();

    // Should NOT have Format/Evaluate compound token
    const formatEvalToken = tokens.find(t => t.value === 'Format/Evaluate');
    expect(formatEvalToken).toBeUndefined();
  });

  it('should handle whitespace around Format/Evaluate', () => {
    const code = `  Format/Evaluate  `;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBeGreaterThanOrEqual(1);
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe('Format/Evaluate');
  });

  it('should tokenize Format/Evaluate followed by equals sign', () => {
    const code = `Format/Evaluate=XML Format/Evaluate;`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // First token should be Format/Evaluate
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe('Format/Evaluate');

    // Second token should be =
    expect(tokens[1].type).toBe(TokenType.Equal);

    // Third token should be XML
    expect(tokens[2].type).toBe(TokenType.Identifier);
    expect(tokens[2].value).toBe('XML');

    // Fourth token should be Format/Evaluate again (in the value)
    expect(tokens[3].type).toBe(TokenType.Identifier);
    expect(tokens[3].value).toBe('Format/Evaluate');
  });

  it('should handle C/SIDE Format/Evaluate value', () => {
    const code = `Format/Evaluate=C/SIDE Format/Evaluate;`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    // Find all Format/Evaluate tokens
    const formatEvalTokens = tokens.filter(t => t.value === 'Format/Evaluate');
    expect(formatEvalTokens.length).toBe(2); // One in property name, one in value

    // Check for C/SIDE (should NOT be tokenized as compound)
    // C should be separate from /SIDE
    const cToken = tokens.find(t => t.value.toUpperCase() === 'C' && t.type === TokenType.Identifier);
    expect(cToken).toBeDefined();
  });

  describe('Edge cases and robustness', () => {
    it('should handle Format/ at end of file', () => {
      const code = 'Format/';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as Format identifier + Divide operator (no Evaluate follows)
      const formatToken = tokens.find(t => t.value.toUpperCase() === 'FORMAT');
      const divideToken = tokens.find(t => t.type === TokenType.Divide);

      expect(formatToken).toBeDefined();
      expect(formatToken?.type).toBe(TokenType.Identifier);
      expect(divideToken).toBeDefined();

      // Should NOT have Format/Evaluate compound token
      const formatEvalToken = tokens.find(t => t.value === 'Format/Evaluate');
      expect(formatEvalToken).toBeUndefined();
    });

    it('should handle Format/Evaluat (truncated second word)', () => {
      const code = 'Format/Evaluat';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as three separate tokens (not compound)
      const formatToken = tokens.find(t => t.value.toUpperCase() === 'FORMAT');
      const divideToken = tokens.find(t => t.type === TokenType.Divide);
      const evaluatToken = tokens.find(t => t.value === 'Evaluat');

      expect(formatToken).toBeDefined();
      expect(divideToken).toBeDefined();
      expect(evaluatToken).toBeDefined();

      // Should NOT have Format/Evaluate compound token
      const formatEvalToken = tokens.find(t => t.value === 'Format/Evaluate');
      expect(formatEvalToken).toBeUndefined();
    });

    it('should handle Format/EvaluateX (extended second word)', () => {
      const code = 'Format/EvaluateX';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as three separate tokens (EvaluateX doesn't match EVALUATE)
      const formatToken = tokens.find(t => t.value.toUpperCase() === 'FORMAT');
      const divideToken = tokens.find(t => t.type === TokenType.Divide);
      const evaluateXToken = tokens.find(t => t.value === 'EvaluateX');

      expect(formatToken).toBeDefined();
      expect(divideToken).toBeDefined();
      expect(evaluateXToken).toBeDefined();

      // Should NOT have Format/Evaluate compound token
      const formatEvalToken = tokens.find(t => t.value === 'Format/Evaluate');
      expect(formatEvalToken).toBeUndefined();
    });

    it('should handle Format followed by division assignment', () => {
      const code = 'Format/=5';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have Format identifier
      const formatToken = tokens.find(t => t.value.toUpperCase() === 'FORMAT');
      expect(formatToken).toBeDefined();

      // Should have DivideAssign operator (not separate Divide)
      const divideAssignToken = tokens.find(t => t.type === TokenType.DivideAssign);
      expect(divideAssignToken).toBeDefined();
    });
  });
});
