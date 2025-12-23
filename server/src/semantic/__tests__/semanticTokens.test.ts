/**
 * SemanticTokens Tests
 *
 * Tests for the SemanticTokensProvider class which maps lexer tokens
 * to semantic token types for syntax highlighting. This is the key feature
 * that makes quoted identifiers (like "Line No.") appear the same as
 * regular identifiers (like Description) in the editor.
 *
 * Covers:
 * - Token type mapping (keywords, types, identifiers, operators, comments)
 * - Quoted identifier handling (critical feature)
 * - Position calculation (line, character, length)
 * - Edge cases (empty input, skipped tokens)
 */

import { Lexer } from '../../lexer/lexer';
import { Token, TokenType } from '../../lexer/tokens';
import { Parser } from '../../parser/parser';
import { CALDocument } from '../../parser/ast';
import {
  SemanticTokensProvider,
  SemanticTokenTypes,
  SemanticTokenModifiers,
  getSemanticTokensLegend
} from '../semanticTokens';

/**
 * Mock SemanticTokensBuilder that records all pushed tokens
 * for testing purposes without requiring vscode-languageserver
 */
interface MockSemanticToken {
  line: number;
  char: number;
  length: number;
  tokenType: number;
  tokenModifiers: number;
}

class MockSemanticTokensBuilder {
  public tokens: MockSemanticToken[] = [];

  push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
    this.tokens.push({ line, char, length, tokenType, tokenModifiers });
  }

  /**
   * Get all tokens of a specific semantic type
   */
  getTokensOfType(type: SemanticTokenTypes): MockSemanticToken[] {
    return this.tokens.filter(t => t.tokenType === type);
  }

  /**
   * Find a token at a specific position
   */
  getTokenAt(line: number, char: number): MockSemanticToken | undefined {
    return this.tokens.find(t => t.line === line && t.char === char);
  }

  /**
   * Clear all recorded tokens
   */
  clear(): void {
    this.tokens = [];
  }
}

/**
 * Helper to tokenize C/AL code using the Lexer
 */
function tokenizeCode(code: string): Token[] {
  const lexer = new Lexer(code);
  return lexer.tokenize();
}

/**
 * Helper to parse C/AL code and return the AST
 */
function parseCode(code: string): CALDocument {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Helper to build semantic tokens from code and return the mock builder
 * with all recorded tokens for assertion
 */
function buildSemanticTokens(code: string): { builder: MockSemanticTokensBuilder; tokens: Token[] } {
  const tokens = tokenizeCode(code);
  const ast = parseCode(code);
  const provider = new SemanticTokensProvider();
  const builder = new MockSemanticTokensBuilder();

  provider.buildSemanticTokens(tokens, ast, builder as any);

  return { builder, tokens };
}

/**
 * Helper to find the semantic token type for a specific lexer token
 * Returns null if the token is not found or was skipped
 */
function findSemanticType(code: string, tokenValue: string): SemanticTokenTypes | null {
  const { builder, tokens } = buildSemanticTokens(code);

  // Find the lexer token
  const lexerToken = tokens.find(t => t.value === tokenValue);
  if (!lexerToken) {
    return null;
  }

  // Find the corresponding semantic token (0-indexed positions)
  const semanticToken = builder.getTokenAt(lexerToken.line - 1, lexerToken.column - 1);
  if (!semanticToken) {
    return null;
  }

  return semanticToken.tokenType;
}

describe('SemanticTokensProvider', () => {
  describe('Test Scaffolding', () => {
    it('should have a working mock builder', () => {
      const builder = new MockSemanticTokensBuilder();
      builder.push(0, 0, 5, SemanticTokenTypes.Keyword, 0);

      expect(builder.tokens.length).toBe(1);
      expect(builder.tokens[0].line).toBe(0);
      expect(builder.tokens[0].char).toBe(0);
      expect(builder.tokens[0].length).toBe(5);
      expect(builder.tokens[0].tokenType).toBe(SemanticTokenTypes.Keyword);
    });

    it('should properly tokenize code using helper', () => {
      const code = 'BEGIN END';
      const tokens = tokenizeCode(code);

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.find(t => t.type === TokenType.Begin)).toBeDefined();
      expect(tokens.find(t => t.type === TokenType.End)).toBeDefined();
    });

    it('should build semantic tokens using helper', () => {
      const code = 'BEGIN';
      const { builder } = buildSemanticTokens(code);

      expect(builder.tokens.length).toBeGreaterThan(0);
    });

    it('should find semantic type using helper', () => {
      const code = 'BEGIN';
      const semanticType = findSemanticType(code, 'BEGIN');

      expect(semanticType).toBe(SemanticTokenTypes.Keyword);
    });
  });

  describe('buildSemanticTokens', () => {
    it('should process all tokens in the input', () => {
      const code = 'OBJECT Table 18 Customer { }';
      const { builder, tokens } = buildSemanticTokens(code);

      // Should have processed tokens (not all tokens result in semantic tokens)
      expect(builder.tokens.length).toBeGreaterThan(0);
    });

    it('should skip whitespace tokens', () => {
      const code = 'BEGIN   END';
      const { builder } = buildSemanticTokens(code);

      // Should only have semantic tokens for BEGIN and END, not whitespace
      expect(builder.tokens.length).toBe(2);
    });

    it('should skip punctuation tokens', () => {
      const code = '{ }';
      const { builder } = buildSemanticTokens(code);

      // Braces should be skipped
      expect(builder.tokens.length).toBe(0);
    });

    it('should handle empty token array', () => {
      const code = '';
      const { builder } = buildSemanticTokens(code);

      // Only EOF token which should be skipped
      expect(builder.tokens.length).toBe(0);
    });
  });

  describe('Keyword Token Mapping', () => {
    // Tests will be added in subtask 2.2
  });

  describe('Type Token Mapping', () => {
    // Tests will be added in subtask 2.3
  });

  describe('Literal Token Mapping', () => {
    // Tests will be added in subtask 2.3
  });

  describe('Identifier Token Mapping', () => {
    // Tests will be added in subtask 2.4
    // This is the CRITICAL feature - quoted identifiers should have the same
    // semantic type as regular identifiers
  });

  describe('Operator Token Mapping', () => {
    // Tests will be added in subtask 2.5
  });

  describe('Comment Token Mapping', () => {
    // Tests will be added in subtask 2.5
  });

  describe('Position Calculation', () => {
    // Tests will be added in subtask 2.6
  });

  describe('Edge Cases', () => {
    // Tests will be added in subtask 2.7
  });
});

describe('getSemanticTokensLegend', () => {
  it('should return an object with tokenTypes and tokenModifiers', () => {
    const legend = getSemanticTokensLegend();

    expect(legend).toHaveProperty('tokenTypes');
    expect(legend).toHaveProperty('tokenModifiers');
    expect(Array.isArray(legend.tokenTypes)).toBe(true);
    expect(Array.isArray(legend.tokenModifiers)).toBe(true);
  });

  it('should include all expected token types', () => {
    const legend = getSemanticTokensLegend();

    expect(legend.tokenTypes).toContain('keyword');
    expect(legend.tokenTypes).toContain('string');
    expect(legend.tokenTypes).toContain('number');
    expect(legend.tokenTypes).toContain('operator');
    expect(legend.tokenTypes).toContain('variable');
    expect(legend.tokenTypes).toContain('function');
    expect(legend.tokenTypes).toContain('parameter');
    expect(legend.tokenTypes).toContain('property');
    expect(legend.tokenTypes).toContain('type');
    expect(legend.tokenTypes).toContain('comment');
  });

  it('should include all expected token modifiers', () => {
    const legend = getSemanticTokensLegend();

    expect(legend.tokenModifiers).toContain('declaration');
    expect(legend.tokenModifiers).toContain('definition');
    expect(legend.tokenModifiers).toContain('readonly');
    expect(legend.tokenModifiers).toContain('static');
  });

  it('should have token types in correct order matching SemanticTokenTypes enum', () => {
    const legend = getSemanticTokensLegend();

    // The order must match the enum values for proper LSP communication
    expect(legend.tokenTypes[SemanticTokenTypes.Keyword]).toBe('keyword');
    expect(legend.tokenTypes[SemanticTokenTypes.String]).toBe('string');
    expect(legend.tokenTypes[SemanticTokenTypes.Number]).toBe('number');
    expect(legend.tokenTypes[SemanticTokenTypes.Operator]).toBe('operator');
    expect(legend.tokenTypes[SemanticTokenTypes.Variable]).toBe('variable');
    expect(legend.tokenTypes[SemanticTokenTypes.Function]).toBe('function');
    expect(legend.tokenTypes[SemanticTokenTypes.Parameter]).toBe('parameter');
    expect(legend.tokenTypes[SemanticTokenTypes.Property]).toBe('property');
    expect(legend.tokenTypes[SemanticTokenTypes.Type]).toBe('type');
    expect(legend.tokenTypes[SemanticTokenTypes.Comment]).toBe('comment');
  });

  it('should have token modifiers in correct order matching SemanticTokenModifiers enum', () => {
    const legend = getSemanticTokensLegend();

    // The order must match the enum values for proper LSP communication
    expect(legend.tokenModifiers[SemanticTokenModifiers.Declaration]).toBe('declaration');
    expect(legend.tokenModifiers[SemanticTokenModifiers.Definition]).toBe('definition');
    expect(legend.tokenModifiers[SemanticTokenModifiers.Readonly]).toBe('readonly');
    expect(legend.tokenModifiers[SemanticTokenModifiers.Static]).toBe('static');
  });
});

describe('SemanticTokenTypes Enum', () => {
  it('should have sequential values starting from 0', () => {
    expect(SemanticTokenTypes.Keyword).toBe(0);
    expect(SemanticTokenTypes.String).toBe(1);
    expect(SemanticTokenTypes.Number).toBe(2);
    expect(SemanticTokenTypes.Operator).toBe(3);
    expect(SemanticTokenTypes.Variable).toBe(4);
    expect(SemanticTokenTypes.Function).toBe(5);
    expect(SemanticTokenTypes.Parameter).toBe(6);
    expect(SemanticTokenTypes.Property).toBe(7);
    expect(SemanticTokenTypes.Type).toBe(8);
    expect(SemanticTokenTypes.Comment).toBe(9);
  });
});

describe('SemanticTokenModifiers Enum', () => {
  it('should have sequential values starting from 0', () => {
    expect(SemanticTokenModifiers.Declaration).toBe(0);
    expect(SemanticTokenModifiers.Definition).toBe(1);
    expect(SemanticTokenModifiers.Readonly).toBe(2);
    expect(SemanticTokenModifiers.Static).toBe(3);
  });
});
