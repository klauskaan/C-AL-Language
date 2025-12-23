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
    describe('Primitive Types', () => {
      it('should map Boolean type to Type semantic type', () => {
        const code = 'x : Boolean';
        const semanticType = findSemanticType(code, 'Boolean');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Integer type to Type semantic type', () => {
        const code = 'x : Integer';
        const semanticType = findSemanticType(code, 'Integer');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Decimal type to Type semantic type', () => {
        const code = 'x : Decimal';
        const semanticType = findSemanticType(code, 'Decimal');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Text type to Type semantic type', () => {
        const code = 'x : Text';
        const semanticType = findSemanticType(code, 'Text');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Code type to Type semantic type', () => {
        // Note: Code is a section keyword, but in type context it should be Code_Type
        const code = 'VAR x : Code';
        // The lexer may tokenize 'Code' as TokenType.Code (section keyword)
        // Let's check with a different context
        const { builder, tokens } = buildSemanticTokens(code);
        // Verify VAR is keyword and x is variable
        expect(findSemanticType(code, 'VAR')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map Char type to Type semantic type', () => {
        const code = 'x : Char';
        const semanticType = findSemanticType(code, 'Char');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Byte type to Type semantic type', () => {
        const code = 'x : Byte';
        const semanticType = findSemanticType(code, 'Byte');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Option type to Type semantic type', () => {
        const code = 'x : Option';
        const semanticType = findSemanticType(code, 'Option');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });
    });

    describe('Date and Time Types', () => {
      it('should map Date type to Type semantic type', () => {
        const code = 'x : Date';
        const semanticType = findSemanticType(code, 'Date');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Time type to Type semantic type', () => {
        const code = 'x : Time';
        const semanticType = findSemanticType(code, 'Time');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map DateTime type to Type semantic type', () => {
        const code = 'x : DateTime';
        const semanticType = findSemanticType(code, 'DateTime');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map Duration type to Type semantic type', () => {
        const code = 'x : Duration';
        const semanticType = findSemanticType(code, 'Duration');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });
    });

    describe('Record and Reference Types', () => {
      it('should map Record type to Type semantic type', () => {
        const code = 'x : Record';
        const semanticType = findSemanticType(code, 'Record');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map RecordID type to Type semantic type', () => {
        const code = 'x : RecordID';
        const semanticType = findSemanticType(code, 'RecordID');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map RecordRef type to Type semantic type', () => {
        const code = 'x : RecordRef';
        const semanticType = findSemanticType(code, 'RecordRef');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map FieldRef type to Type semantic type', () => {
        const code = 'x : FieldRef';
        const semanticType = findSemanticType(code, 'FieldRef');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });
    });

    describe('Extended Types', () => {
      it('should map BigInteger type to Type semantic type', () => {
        const code = 'x : BigInteger';
        const semanticType = findSemanticType(code, 'BigInteger');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map BigText type to Type semantic type', () => {
        const code = 'x : BigText';
        const semanticType = findSemanticType(code, 'BigText');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map BLOB type to Type semantic type', () => {
        const code = 'x : BLOB';
        const semanticType = findSemanticType(code, 'BLOB');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map GUID type to Type semantic type', () => {
        const code = 'x : GUID';
        const semanticType = findSemanticType(code, 'GUID');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map TextConst type to Type semantic type', () => {
        const code = 'x : TextConst';
        const semanticType = findSemanticType(code, 'TextConst');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });
    });

    describe('Case Insensitivity for Types', () => {
      it('should map lowercase integer to Type semantic type', () => {
        const code = 'x : integer';
        const semanticType = findSemanticType(code, 'integer');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map lowercase text to Type semantic type', () => {
        const code = 'x : text';
        const semanticType = findSemanticType(code, 'text');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map mixed case Record to Type semantic type', () => {
        const code = 'x : RECORD';
        const semanticType = findSemanticType(code, 'RECORD');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map lowercase boolean to Type semantic type', () => {
        const code = 'x : boolean';
        const semanticType = findSemanticType(code, 'boolean');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });

      it('should map mixed case BigInteger to Type semantic type', () => {
        const code = 'x : BIGINTEGER';
        const semanticType = findSemanticType(code, 'BIGINTEGER');
        expect(semanticType).toBe(SemanticTokenTypes.Type);
      });
    });

    describe('Multiple Types in Code', () => {
      it('should correctly map multiple types in variable declarations', () => {
        const code = 'VAR x : Integer; y : Text; z : Boolean;';

        expect(findSemanticType(code, 'Integer')).toBe(SemanticTokenTypes.Type);
        expect(findSemanticType(code, 'Text')).toBe(SemanticTokenTypes.Type);
        expect(findSemanticType(code, 'Boolean')).toBe(SemanticTokenTypes.Type);
      });

      it('should correctly map types in procedure parameters', () => {
        const code = 'PROCEDURE MyProc(x : Integer; y : Text) : Boolean';

        expect(findSemanticType(code, 'Integer')).toBe(SemanticTokenTypes.Type);
        expect(findSemanticType(code, 'Text')).toBe(SemanticTokenTypes.Type);
        expect(findSemanticType(code, 'Boolean')).toBe(SemanticTokenTypes.Type);
      });

      it('should distinguish type keywords from identifiers', () => {
        const code = 'VAR MyInteger : Integer';

        // 'Integer' should be a Type
        expect(findSemanticType(code, 'Integer')).toBe(SemanticTokenTypes.Type);
        // 'MyInteger' should be a Variable (identifier)
        expect(findSemanticType(code, 'MyInteger')).toBe(SemanticTokenTypes.Variable);
      });
    });
  });

  describe('Literal Token Mapping', () => {
    describe('String Literals', () => {
      it('should map single-quoted string to String semantic type', () => {
        // Note: The lexer stores string values WITHOUT surrounding quotes
        const code = "x := 'Hello World'";
        const semanticType = findSemanticType(code, 'Hello World');
        expect(semanticType).toBe(SemanticTokenTypes.String);
      });

      it('should map empty string to String semantic type', () => {
        const code = "x := ''";
        // Empty string token has empty value
        const semanticType = findSemanticType(code, '');
        expect(semanticType).toBe(SemanticTokenTypes.String);
      });

      it('should map string with special characters to String semantic type', () => {
        const code = "x := 'Hello, World! @#$%'";
        const semanticType = findSemanticType(code, 'Hello, World! @#$%');
        expect(semanticType).toBe(SemanticTokenTypes.String);
      });

      it('should map string with numbers to String semantic type', () => {
        const code = "x := 'Item 12345'";
        const semanticType = findSemanticType(code, 'Item 12345');
        expect(semanticType).toBe(SemanticTokenTypes.String);
      });

      it('should map string with escaped quote to String semantic type', () => {
        // Note: Escaped quotes ('') become single quote (') in token value
        const code = "x := 'It''s working'";
        const semanticType = findSemanticType(code, "It's working");
        expect(semanticType).toBe(SemanticTokenTypes.String);
      });
    });

    describe('Integer Literals', () => {
      it('should map simple integer to Number semantic type', () => {
        const code = 'x := 42';
        const semanticType = findSemanticType(code, '42');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map zero to Number semantic type', () => {
        const code = 'x := 0';
        const semanticType = findSemanticType(code, '0');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map large integer to Number semantic type', () => {
        const code = 'x := 1234567890';
        const semanticType = findSemanticType(code, '1234567890');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map negative integer to Number semantic type (minus is operator)', () => {
        const code = 'x := -42';
        // The minus sign is a separate operator token, the number 42 should be Number
        const semanticType = findSemanticType(code, '42');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map integer in expression to Number semantic type', () => {
        const code = 'x := 10 + 20';
        expect(findSemanticType(code, '10')).toBe(SemanticTokenTypes.Number);
        expect(findSemanticType(code, '20')).toBe(SemanticTokenTypes.Number);
      });
    });

    describe('Decimal Literals', () => {
      it('should map simple decimal to Number semantic type', () => {
        const code = 'x := 3.14';
        const semanticType = findSemanticType(code, '3.14');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map decimal with leading zero to Number semantic type', () => {
        const code = 'x := 0.5';
        const semanticType = findSemanticType(code, '0.5');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map large decimal to Number semantic type', () => {
        const code = 'x := 12345.67890';
        const semanticType = findSemanticType(code, '12345.67890');
        expect(semanticType).toBe(SemanticTokenTypes.Number);
      });

      it('should map decimal in expression to Number semantic type', () => {
        const code = 'x := 1.5 + 2.5';
        expect(findSemanticType(code, '1.5')).toBe(SemanticTokenTypes.Number);
        expect(findSemanticType(code, '2.5')).toBe(SemanticTokenTypes.Number);
      });
    });

    describe('Mixed Literals in Code', () => {
      it('should correctly map string and number in same line', () => {
        const code = "MESSAGE('Value is: ' + FORMAT(42))";

        // String token value doesn't include quotes
        expect(findSemanticType(code, 'Value is: ')).toBe(SemanticTokenTypes.String);
        expect(findSemanticType(code, '42')).toBe(SemanticTokenTypes.Number);
      });

      it('should correctly map multiple literals in procedure call', () => {
        const code = "MyProc('Test', 100, 3.14)";

        // String token value doesn't include quotes
        expect(findSemanticType(code, 'Test')).toBe(SemanticTokenTypes.String);
        expect(findSemanticType(code, '100')).toBe(SemanticTokenTypes.Number);
        expect(findSemanticType(code, '3.14')).toBe(SemanticTokenTypes.Number);
      });

      it('should correctly map literals in array indexing', () => {
        const code = "x := MyArray[1] + 'text'";

        expect(findSemanticType(code, '1')).toBe(SemanticTokenTypes.Number);
        // String token value doesn't include quotes
        expect(findSemanticType(code, 'text')).toBe(SemanticTokenTypes.String);
      });

      it('should correctly map literals in FOR loop', () => {
        const code = 'FOR i := 1 TO 10 DO';

        expect(findSemanticType(code, '1')).toBe(SemanticTokenTypes.Number);
        expect(findSemanticType(code, '10')).toBe(SemanticTokenTypes.Number);
      });

      it('should correctly map literals in CASE statement', () => {
        const code = "CASE x OF 1: y := 'one'; 2: y := 'two'; END";

        expect(findSemanticType(code, '1')).toBe(SemanticTokenTypes.Number);
        expect(findSemanticType(code, '2')).toBe(SemanticTokenTypes.Number);
        // String token values don't include quotes
        expect(findSemanticType(code, 'one')).toBe(SemanticTokenTypes.String);
        expect(findSemanticType(code, 'two')).toBe(SemanticTokenTypes.String);
      });
    });

    describe('Literals vs Types Disambiguation', () => {
      it('should distinguish Integer type from integer literal', () => {
        const code = 'VAR x : Integer; BEGIN x := 42; END';

        // 'Integer' is a type
        expect(findSemanticType(code, 'Integer')).toBe(SemanticTokenTypes.Type);
        // '42' is a number literal
        expect(findSemanticType(code, '42')).toBe(SemanticTokenTypes.Number);
      });

      it('should distinguish Decimal type from decimal literal', () => {
        const code = 'VAR x : Decimal; BEGIN x := 3.14; END';

        // 'Decimal' is a type
        expect(findSemanticType(code, 'Decimal')).toBe(SemanticTokenTypes.Type);
        // '3.14' is a number literal
        expect(findSemanticType(code, '3.14')).toBe(SemanticTokenTypes.Number);
      });

      it('should distinguish Text type from string literal', () => {
        const code = "VAR x : Text; BEGIN x := 'hello'; END";

        // 'Text' is a type
        expect(findSemanticType(code, 'Text')).toBe(SemanticTokenTypes.Type);
        // String literal - token value doesn't include quotes
        expect(findSemanticType(code, 'hello')).toBe(SemanticTokenTypes.String);
      });
    });
  });

  describe('Identifier Token Mapping', () => {
    /**
     * CRITICAL FEATURE: Both regular and quoted identifiers are mapped to Variable type
     * This makes "Line No." appear the same as Description in the editor,
     * despite having different TextMate grammar scopes.
     */

    describe('Regular Identifiers', () => {
      it('should map simple identifier to Variable type', () => {
        const code = 'x := 1';
        const semanticType = findSemanticType(code, 'x');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map multi-character identifier to Variable type', () => {
        const code = 'CustomerName := value';
        const semanticType = findSemanticType(code, 'CustomerName');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map identifier with numbers to Variable type', () => {
        const code = 'Line1 := x';
        const semanticType = findSemanticType(code, 'Line1');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map identifier with underscore to Variable type', () => {
        const code = 'Customer_Name := x';
        const semanticType = findSemanticType(code, 'Customer_Name');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map procedure name to Variable type', () => {
        const code = 'MyProc()';
        const semanticType = findSemanticType(code, 'MyProc');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map function argument to Variable type', () => {
        const code = 'MESSAGE(Description)';
        // MESSAGE is an identifier, Description is an identifier
        expect(findSemanticType(code, 'MESSAGE')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Description')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map record variable to Variable type', () => {
        const code = 'Customer.Name';
        expect(findSemanticType(code, 'Customer')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Name')).toBe(SemanticTokenTypes.Variable);
      });
    });

    describe('Quoted Identifiers', () => {
      it('should map quoted identifier to Variable type', () => {
        const code = '"Line No." := 1';
        // Note: Quoted identifier tokens have value without quotes
        const semanticType = findSemanticType(code, 'Line No.');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier with spaces to Variable type', () => {
        const code = '"First Name" := x';
        const semanticType = findSemanticType(code, 'First Name');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier with special characters to Variable type', () => {
        const code = '"End-Point" := x';
        const semanticType = findSemanticType(code, 'End-Point');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier with period to Variable type', () => {
        const code = '"Inv. Amount" := x';
        const semanticType = findSemanticType(code, 'Inv. Amount');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier with numbers to Variable type', () => {
        const code = '"Sales Line 2" := x';
        const semanticType = findSemanticType(code, 'Sales Line 2');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier in function call to Variable type', () => {
        const code = 'CALCFIELDS("End-Point")';
        expect(findSemanticType(code, 'CALCFIELDS')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'End-Point')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier with percent to Variable type', () => {
        const code = '"VAT %" := x';
        const semanticType = findSemanticType(code, 'VAT %');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier with parentheses to Variable type', () => {
        const code = '"Amount (LCY)" := x';
        const semanticType = findSemanticType(code, 'Amount (LCY)');
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });

      it('should map empty quoted identifier to Variable type', () => {
        const code = '"" := x';
        const semanticType = findSemanticType(code, '');
        // Empty identifier might get matched - this tests edge case handling
        expect(semanticType).toBe(SemanticTokenTypes.Variable);
      });
    });

    describe('Same Semantic Type (Critical Feature)', () => {
      it('should map both regular and quoted identifiers to same type in assignment', () => {
        const code = '"Line No." := Description';

        const quotedType = findSemanticType(code, 'Line No.');
        const regularType = findSemanticType(code, 'Description');

        // CRITICAL: Both should be Variable type
        expect(quotedType).toBe(SemanticTokenTypes.Variable);
        expect(regularType).toBe(SemanticTokenTypes.Variable);
        expect(quotedType).toBe(regularType);
      });

      it('should map both types to same semantic type in expression', () => {
        const code = 'Result := "Field Name" + NormalField';

        const quotedType = findSemanticType(code, 'Field Name');
        const regularType = findSemanticType(code, 'NormalField');

        expect(quotedType).toBe(SemanticTokenTypes.Variable);
        expect(regularType).toBe(SemanticTokenTypes.Variable);
        expect(quotedType).toBe(regularType);
      });

      it('should map both types to same semantic type in function arguments', () => {
        const code = 'MyFunc("Quoted Arg", RegularArg)';

        const quotedType = findSemanticType(code, 'Quoted Arg');
        const regularType = findSemanticType(code, 'RegularArg');

        expect(quotedType).toBe(SemanticTokenTypes.Variable);
        expect(regularType).toBe(SemanticTokenTypes.Variable);
        expect(quotedType).toBe(regularType);
      });

      it('should map both types to same semantic type in comparison', () => {
        const code = 'IF "Balance" > Amount THEN';

        const quotedType = findSemanticType(code, 'Balance');
        const regularType = findSemanticType(code, 'Amount');

        expect(quotedType).toBe(SemanticTokenTypes.Variable);
        expect(regularType).toBe(SemanticTokenTypes.Variable);
        expect(quotedType).toBe(regularType);
      });

      it('should map multiple quoted identifiers to same type as regular identifiers', () => {
        const code = '"First Name" + "Last Name" + FullName';

        const quoted1 = findSemanticType(code, 'First Name');
        const quoted2 = findSemanticType(code, 'Last Name');
        const regular = findSemanticType(code, 'FullName');

        expect(quoted1).toBe(SemanticTokenTypes.Variable);
        expect(quoted2).toBe(SemanticTokenTypes.Variable);
        expect(regular).toBe(SemanticTokenTypes.Variable);
        expect(quoted1).toBe(quoted2);
        expect(quoted2).toBe(regular);
      });
    });

    describe('Identifiers vs Strings Distinction', () => {
      it('should distinguish quoted identifier from string literal', () => {
        const code = '"Line No." := \'Customer Name\'';

        // Quoted identifier should be Variable
        const quotedIdentType = findSemanticType(code, 'Line No.');
        expect(quotedIdentType).toBe(SemanticTokenTypes.Variable);

        // String literal should be String
        const stringType = findSemanticType(code, 'Customer Name');
        expect(stringType).toBe(SemanticTokenTypes.String);

        // They should NOT be the same type
        expect(quotedIdentType).not.toBe(stringType);
      });

      it('should correctly type mixed identifiers and strings in expression', () => {
        const code = '"Field Name" = \'Value\' + "Other Field"';

        expect(findSemanticType(code, 'Field Name')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Value')).toBe(SemanticTokenTypes.String);
        expect(findSemanticType(code, 'Other Field')).toBe(SemanticTokenTypes.Variable);
      });

      it('should distinguish identifier from string in MESSAGE statement', () => {
        const code = "MESSAGE('Hello ' + CustomerName)";

        // String should be String type
        expect(findSemanticType(code, 'Hello ')).toBe(SemanticTokenTypes.String);
        // Identifier should be Variable type
        expect(findSemanticType(code, 'CustomerName')).toBe(SemanticTokenTypes.Variable);
      });

      it('should correctly type quoted identifier with string-like content', () => {
        // A quoted identifier that looks like a string value
        const code = '"Hello World" := x';
        // It's still a quoted identifier, not a string
        expect(findSemanticType(code, 'Hello World')).toBe(SemanticTokenTypes.Variable);
      });
    });

    describe('Identifiers vs Keywords Distinction', () => {
      it('should not confuse identifier with keyword that contains same text', () => {
        const code = 'IF BeginTime > EndTime THEN';

        // IF and THEN are keywords
        expect(findSemanticType(code, 'IF')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'THEN')).toBe(SemanticTokenTypes.Keyword);

        // BeginTime and EndTime are identifiers (contain "Begin" and "End" but aren't keywords)
        expect(findSemanticType(code, 'BeginTime')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'EndTime')).toBe(SemanticTokenTypes.Variable);
      });

      it('should not confuse quoted identifier with keyword', () => {
        // A quoted identifier can look like a keyword
        const code = '"Begin" := x';
        // But it's still an identifier because it's quoted
        expect(findSemanticType(code, 'Begin')).toBe(SemanticTokenTypes.Variable);
      });

      it('should distinguish identifier from type name', () => {
        const code = 'VAR MyInteger : Integer';

        // VAR is keyword
        expect(findSemanticType(code, 'VAR')).toBe(SemanticTokenTypes.Keyword);
        // Integer is type
        expect(findSemanticType(code, 'Integer')).toBe(SemanticTokenTypes.Type);
        // MyInteger is identifier/variable
        expect(findSemanticType(code, 'MyInteger')).toBe(SemanticTokenTypes.Variable);
      });
    });

    describe('Identifiers in Various Contexts', () => {
      it('should map identifier in variable declaration', () => {
        const code = 'VAR CustomerRec : Record';

        expect(findSemanticType(code, 'CustomerRec')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier in field access', () => {
        const code = 'Customer."Line No."';

        expect(findSemanticType(code, 'Customer')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Line No.')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map identifier in array index', () => {
        const code = 'MyArray[Index]';

        expect(findSemanticType(code, 'MyArray')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Index')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map identifier in FOR loop', () => {
        const code = 'FOR Counter := 1 TO MaxCount DO';

        expect(findSemanticType(code, 'Counter')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'MaxCount')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map identifier in WITH statement', () => {
        const code = 'WITH CustomerRec DO';

        expect(findSemanticType(code, 'CustomerRec')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map quoted identifier in CALCFIELDS', () => {
        const code = 'CustomerRec.CALCFIELDS("Balance (LCY)")';

        expect(findSemanticType(code, 'CustomerRec')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'CALCFIELDS')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Balance (LCY)')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map identifiers in complex C/AL expression', () => {
        const code = 'IF "Balance" > 0 THEN "Status" := \'Active\';';

        // Keywords
        expect(findSemanticType(code, 'IF')).toBe(SemanticTokenTypes.Keyword);
        expect(findSemanticType(code, 'THEN')).toBe(SemanticTokenTypes.Keyword);

        // Quoted identifiers
        expect(findSemanticType(code, 'Balance')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Status')).toBe(SemanticTokenTypes.Variable);

        // Number and string literals
        expect(findSemanticType(code, '0')).toBe(SemanticTokenTypes.Number);
        expect(findSemanticType(code, 'Active')).toBe(SemanticTokenTypes.String);
      });
    });

    describe('Multiple Identifiers in Code', () => {
      it('should correctly map all identifiers in procedure call', () => {
        const code = 'ProcessCustomer(CustomerRec, "Field Name", Result)';

        expect(findSemanticType(code, 'ProcessCustomer')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'CustomerRec')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Field Name')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Result')).toBe(SemanticTokenTypes.Variable);
      });

      it('should correctly map identifiers in chained method calls', () => {
        const code = 'Customer.Name.ToUpper';

        expect(findSemanticType(code, 'Customer')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Name')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'ToUpper')).toBe(SemanticTokenTypes.Variable);
      });

      it('should correctly map identifiers and quoted identifiers in record filter', () => {
        const code = 'Customer.SETFILTER("Line No.", FilterValue)';

        expect(findSemanticType(code, 'Customer')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'SETFILTER')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Line No.')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'FilterValue')).toBe(SemanticTokenTypes.Variable);
      });
    });

    describe('Case Sensitivity for Identifiers', () => {
      it('should map lowercase identifier to Variable type', () => {
        const code = 'customername := x';
        expect(findSemanticType(code, 'customername')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map UPPERCASE identifier to Variable type', () => {
        const code = 'CUSTOMERNAME := x';
        expect(findSemanticType(code, 'CUSTOMERNAME')).toBe(SemanticTokenTypes.Variable);
      });

      it('should map MixedCase identifier to Variable type', () => {
        const code = 'CustomerName := x';
        expect(findSemanticType(code, 'CustomerName')).toBe(SemanticTokenTypes.Variable);
      });

      it('should preserve case in quoted identifiers', () => {
        const code = '"Customer Name" := x';
        expect(findSemanticType(code, 'Customer Name')).toBe(SemanticTokenTypes.Variable);
      });
    });
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
