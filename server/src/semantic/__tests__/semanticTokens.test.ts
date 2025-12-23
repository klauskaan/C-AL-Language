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
    describe('Object Type Keywords', () => {
      it('should map OBJECT keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { }';
        const semanticType = findSemanticType(code, 'OBJECT');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map TABLE keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { }';
        const semanticType = findSemanticType(code, 'Table');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map PAGE keyword to Keyword type', () => {
        const code = 'OBJECT Page 50000 MyPage { }';
        const semanticType = findSemanticType(code, 'Page');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map REPORT keyword to Keyword type', () => {
        const code = 'OBJECT Report 50000 MyReport { }';
        const semanticType = findSemanticType(code, 'Report');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map CODEUNIT keyword to Keyword type', () => {
        const code = 'OBJECT Codeunit 50000 MyCodeunit { }';
        const semanticType = findSemanticType(code, 'Codeunit');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map QUERY keyword to Keyword type', () => {
        const code = 'OBJECT Query 50000 MyQuery { }';
        const semanticType = findSemanticType(code, 'Query');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map XMLPORT keyword to Keyword type', () => {
        const code = 'OBJECT XMLport 50000 MyXMLport { }';
        const semanticType = findSemanticType(code, 'XMLport');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map MENUSUITE keyword to Keyword type', () => {
        const code = 'OBJECT MenuSuite 50000 MyMenuSuite { }';
        const semanticType = findSemanticType(code, 'MenuSuite');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Section Keywords', () => {
      it('should map PROPERTIES keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { PROPERTIES { } }';
        const semanticType = findSemanticType(code, 'PROPERTIES');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map FIELDS keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { FIELDS { } }';
        const semanticType = findSemanticType(code, 'FIELDS');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map KEYS keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { KEYS { } }';
        const semanticType = findSemanticType(code, 'KEYS');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map FIELDGROUPS keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { FIELDGROUPS { } }';
        const semanticType = findSemanticType(code, 'FIELDGROUPS');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map CODE keyword to Keyword type', () => {
        const code = 'OBJECT Table 18 Customer { CODE { } }';
        const semanticType = findSemanticType(code, 'CODE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Control Flow Keywords', () => {
      it('should map IF keyword to Keyword type', () => {
        const code = 'IF x THEN y';
        const semanticType = findSemanticType(code, 'IF');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map THEN keyword to Keyword type', () => {
        const code = 'IF x THEN y';
        const semanticType = findSemanticType(code, 'THEN');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map ELSE keyword to Keyword type', () => {
        const code = 'IF x THEN y ELSE z';
        const semanticType = findSemanticType(code, 'ELSE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map CASE keyword to Keyword type', () => {
        const code = 'CASE x OF END';
        const semanticType = findSemanticType(code, 'CASE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map OF keyword to Keyword type', () => {
        const code = 'CASE x OF END';
        const semanticType = findSemanticType(code, 'OF');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map WHILE keyword to Keyword type', () => {
        const code = 'WHILE x DO y';
        const semanticType = findSemanticType(code, 'WHILE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map DO keyword to Keyword type', () => {
        const code = 'WHILE x DO y';
        const semanticType = findSemanticType(code, 'DO');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map REPEAT keyword to Keyword type', () => {
        const code = 'REPEAT x UNTIL y';
        const semanticType = findSemanticType(code, 'REPEAT');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map UNTIL keyword to Keyword type', () => {
        const code = 'REPEAT x UNTIL y';
        const semanticType = findSemanticType(code, 'UNTIL');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map FOR keyword to Keyword type', () => {
        const code = 'FOR i := 1 TO 10 DO x';
        const semanticType = findSemanticType(code, 'FOR');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map TO keyword to Keyword type', () => {
        const code = 'FOR i := 1 TO 10 DO x';
        const semanticType = findSemanticType(code, 'TO');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map DOWNTO keyword to Keyword type', () => {
        const code = 'FOR i := 10 DOWNTO 1 DO x';
        const semanticType = findSemanticType(code, 'DOWNTO');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map EXIT keyword to Keyword type', () => {
        const code = 'EXIT';
        const semanticType = findSemanticType(code, 'EXIT');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map BREAK keyword to Keyword type', () => {
        const code = 'BREAK';
        const semanticType = findSemanticType(code, 'BREAK');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Procedure/Function Keywords', () => {
      it('should map PROCEDURE keyword to Keyword type', () => {
        const code = 'PROCEDURE MyProc() BEGIN END';
        const semanticType = findSemanticType(code, 'PROCEDURE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map FUNCTION keyword to Keyword type', () => {
        const code = 'FUNCTION MyFunc()';
        const semanticType = findSemanticType(code, 'FUNCTION');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map LOCAL keyword to Keyword type', () => {
        const code = 'LOCAL PROCEDURE MyProc() BEGIN END';
        const semanticType = findSemanticType(code, 'LOCAL');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map VAR keyword to Keyword type', () => {
        const code = 'VAR x : Integer';
        const semanticType = findSemanticType(code, 'VAR');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map TRIGGER keyword to Keyword type', () => {
        const code = 'TRIGGER OnValidate() BEGIN END';
        const semanticType = findSemanticType(code, 'TRIGGER');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Block Keywords', () => {
      it('should map BEGIN keyword to Keyword type', () => {
        const code = 'BEGIN END';
        const semanticType = findSemanticType(code, 'BEGIN');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map END keyword to Keyword type', () => {
        const code = 'BEGIN END';
        const semanticType = findSemanticType(code, 'END');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Boolean Keywords', () => {
      it('should map TRUE keyword to Keyword type', () => {
        const code = 'x := TRUE';
        const semanticType = findSemanticType(code, 'TRUE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map FALSE keyword to Keyword type', () => {
        const code = 'x := FALSE';
        const semanticType = findSemanticType(code, 'FALSE');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Operator Keywords', () => {
      it('should map DIV keyword to Keyword type', () => {
        const code = 'x DIV y';
        const semanticType = findSemanticType(code, 'DIV');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map MOD keyword to Keyword type', () => {
        const code = 'x MOD y';
        const semanticType = findSemanticType(code, 'MOD');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map AND keyword to Keyword type', () => {
        const code = 'x AND y';
        const semanticType = findSemanticType(code, 'AND');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map OR keyword to Keyword type', () => {
        const code = 'x OR y';
        const semanticType = findSemanticType(code, 'OR');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map NOT keyword to Keyword type', () => {
        const code = 'NOT x';
        const semanticType = findSemanticType(code, 'NOT');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map XOR keyword to Keyword type', () => {
        const code = 'x XOR y';
        const semanticType = findSemanticType(code, 'XOR');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map IN keyword to Keyword type', () => {
        const code = 'x IN [1, 2, 3]';
        const semanticType = findSemanticType(code, 'IN');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Other Keywords', () => {
      it('should map WITH keyword to Keyword type', () => {
        const code = 'WITH Customer DO';
        const semanticType = findSemanticType(code, 'WITH');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map ARRAY keyword to Keyword type', () => {
        const code = 'x : ARRAY [1..10] OF Integer';
        const semanticType = findSemanticType(code, 'ARRAY');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map TEMPORARY keyword to Keyword type', () => {
        const code = 'Customer : Record Customer TEMPORARY';
        const semanticType = findSemanticType(code, 'TEMPORARY');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Case Insensitivity', () => {
      it('should map lowercase begin to Keyword type', () => {
        const code = 'begin end';
        const semanticType = findSemanticType(code, 'begin');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map mixed case BeGiN to Keyword type', () => {
        const code = 'BeGiN EnD';
        const semanticType = findSemanticType(code, 'BeGiN');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map lowercase if to Keyword type', () => {
        const code = 'if x then y';
        const semanticType = findSemanticType(code, 'if');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map lowercase procedure to Keyword type', () => {
        const code = 'procedure MyProc()';
        const semanticType = findSemanticType(code, 'procedure');
        expect(semanticType).toBe(SemanticTokenTypes.Keyword);
      });
    });

    describe('Multiple Keywords in Code', () => {
      it('should correctly map multiple keywords in a single line', () => {
        const code = 'IF x THEN BEGIN y END';

        expect(findSemanticType(code, 'IF')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'THEN')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'BEGIN')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'END')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should correctly map all keywords in a procedure', () => {
        const code = 'PROCEDURE MyProc() VAR x : Integer; BEGIN IF TRUE THEN EXIT; END';

        expect(findSemanticType(code, 'PROCEDURE')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'VAR')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'BEGIN')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'IF')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'TRUE')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'THEN')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'EXIT')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'END')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should correctly map all keywords in a FOR loop', () => {
        const code = 'FOR i := 1 TO 10 DO BEGIN BREAK; END';

        expect(findSemanticType(code, 'FOR')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'TO')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'DO')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'BEGIN')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'BREAK')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'END')).toBe(SemanticTokenTypes.Keyword);
      });
    });
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
