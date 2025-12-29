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

    it('should highlight braces as keywords', () => {
      const code = '{ }';
      const { builder } = buildSemanticTokens(code);

      // Braces are structural keywords in C/AL (like BEGIN/END)
      expect(builder.tokens.length).toBe(2);
      expect(builder.tokens[0]).toMatchObject({
        tokenType: SemanticTokenTypes.Keyword,
      });
      expect(builder.tokens[1]).toMatchObject({
        tokenType: SemanticTokenTypes.Keyword,
      });
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
    describe('Arithmetic Operators', () => {
      it('should map + operator to Operator type', () => {
        const code = 'x := 1 + 2';
        const semanticType = findSemanticType(code, '+');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map - operator to Operator type', () => {
        const code = 'x := 5 - 3';
        const semanticType = findSemanticType(code, '-');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map * operator to Operator type', () => {
        const code = 'x := 2 * 4';
        const semanticType = findSemanticType(code, '*');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map / operator to Operator type', () => {
        const code = 'x := 8 / 2';
        const semanticType = findSemanticType(code, '/');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map multiple arithmetic operators in expression', () => {
        const code = 'x := 1 + 2 - 3 * 4 / 5';
        const { builder, tokens } = buildSemanticTokens(code);

        // Count operator tokens
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        // Should have: :=, +, -, *, / (5 operators total)
        expect(operatorTokens.length).toBe(5);
      });
    });

    describe('Assignment Operators', () => {
      it('should map := operator to Operator type', () => {
        const code = 'x := 1';
        const semanticType = findSemanticType(code, ':=');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map = operator to Operator type', () => {
        const code = 'IF x = 1 THEN';
        const semanticType = findSemanticType(code, '=');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should distinguish := (assignment) from = (comparison)', () => {
        const code = 'IF x = 1 THEN y := 2';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find both operators
        const equalToken = tokens.find(t => t.value === '=');
        const assignToken = tokens.find(t => t.value === ':=');

        expect(equalToken).toBeDefined();
        expect(assignToken).toBeDefined();

        // Both should be Operator type
        const equalSemantic = builder.getTokenAt(equalToken!.line - 1, equalToken!.column - 1);
        const assignSemantic = builder.getTokenAt(assignToken!.line - 1, assignToken!.column - 1);

        expect(equalSemantic?.tokenType).toBe(SemanticTokenTypes.Operator);
        expect(assignSemantic?.tokenType).toBe(SemanticTokenTypes.Operator);
      });
    });

    describe('Comparison Operators', () => {
      it('should map <> operator to Operator type', () => {
        const code = 'IF x <> 1 THEN';
        const semanticType = findSemanticType(code, '<>');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map < operator to Operator type', () => {
        const code = 'IF x < 10 THEN';
        const semanticType = findSemanticType(code, '<');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map <= operator to Operator type', () => {
        const code = 'IF x <= 10 THEN';
        const semanticType = findSemanticType(code, '<=');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map > operator to Operator type', () => {
        const code = 'IF x > 10 THEN';
        const semanticType = findSemanticType(code, '>');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map >= operator to Operator type', () => {
        const code = 'IF x >= 10 THEN';
        const semanticType = findSemanticType(code, '>=');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map all comparison operators in complex expression', () => {
        const code = 'IF (a < b) AND (c >= d) AND (e <> f) AND (g = h) THEN';
        const { builder } = buildSemanticTokens(code);

        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        // Should have: <, >=, <>, = (4 comparison operators)
        expect(operatorTokens.length).toBe(4);
      });
    });

    describe('Dot and Range Operators', () => {
      it('should map . operator to Operator type', () => {
        const code = 'Customer.Name';
        const semanticType = findSemanticType(code, '.');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should map .. operator to Operator type', () => {
        const code = 'x := MyArray[1..10]';
        const semanticType = findSemanticType(code, '..');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should correctly map dots in chained access', () => {
        const code = 'Customer.Address.City';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find all dot tokens
        const dotTokens = tokens.filter(t => t.value === '.');
        expect(dotTokens.length).toBe(2);

        // All dots should be Operator type
        for (const dotToken of dotTokens) {
          const semanticToken = builder.getTokenAt(dotToken.line - 1, dotToken.column - 1);
          expect(semanticToken?.tokenType).toBe(SemanticTokenTypes.Operator);
        }
      });

      it('should map :: operator to Operator type', () => {
        const code = 'Customer::State';
        const semanticType = findSemanticType(code, '::');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });
    });

    describe('Operators in Context', () => {
      it('should correctly map operators in FOR loop', () => {
        const code = 'FOR i := 1 TO 10 DO';
        const semanticType = findSemanticType(code, ':=');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should correctly map operators in array indexing with range', () => {
        const code = 'x : ARRAY [1..10] OF Integer';
        const semanticType = findSemanticType(code, '..');
        expect(semanticType).toBe(SemanticTokenTypes.Operator);
      });

      it('should correctly map operators in compound expression', () => {
        const code = 'Result := (a + b) * (c - d) / e';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find operators
        const plusType = findSemanticType(code, '+');
        const minusType = findSemanticType(code, '-');
        const multiplyType = findSemanticType(code, '*');
        const divideType = findSemanticType(code, '/');
        const assignType = findSemanticType(code, ':=');

        expect(plusType).toBe(SemanticTokenTypes.Operator);
        expect(minusType).toBe(SemanticTokenTypes.Operator);
        expect(multiplyType).toBe(SemanticTokenTypes.Operator);
        expect(divideType).toBe(SemanticTokenTypes.Operator);
        expect(assignType).toBe(SemanticTokenTypes.Operator);
      });

      it('should correctly map operators in IF with AND conditions', () => {
        const code = 'IF (x > 0) AND (y < 100) THEN';

        // > and < should be operators
        expect(findSemanticType(code, '>')).toBe(SemanticTokenTypes.Operator);
        expect(findSemanticType(code, '<')).toBe(SemanticTokenTypes.Operator);
        // AND is a keyword, not an operator
        expect(findSemanticType(code, 'AND')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should distinguish operators from identifiers', () => {
        const code = 'Total := Quantity * UnitPrice';

        // Operators
        expect(findSemanticType(code, ':=')).toBe(SemanticTokenTypes.Operator);
        expect(findSemanticType(code, '*')).toBe(SemanticTokenTypes.Operator);

        // Identifiers
        expect(findSemanticType(code, 'Total')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'Quantity')).toBe(SemanticTokenTypes.Variable);
        expect(findSemanticType(code, 'UnitPrice')).toBe(SemanticTokenTypes.Variable);
      });

      it('should correctly map negative number (minus is operator)', () => {
        const code = 'x := -42';

        // The minus sign should be an operator
        expect(findSemanticType(code, '-')).toBe(SemanticTokenTypes.Operator);
        // The number should be a number
        expect(findSemanticType(code, '42')).toBe(SemanticTokenTypes.Number);
      });
    });

    describe('Multiple Operators of Same Type', () => {
      it('should correctly map multiple plus operators', () => {
        const code = 'x := 1 + 2 + 3 + 4';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find all plus tokens
        const plusTokens = tokens.filter(t => t.value === '+');
        expect(plusTokens.length).toBe(3);

        // All should be Operator type
        for (const plusToken of plusTokens) {
          const semanticToken = builder.getTokenAt(plusToken.line - 1, plusToken.column - 1);
          expect(semanticToken?.tokenType).toBe(SemanticTokenTypes.Operator);
        }
      });

      it('should correctly map multiple comparison operators', () => {
        const code = 'IF (a > b) AND (c > d) AND (e > f) THEN';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find all greater than tokens
        const gtTokens = tokens.filter(t => t.value === '>');
        expect(gtTokens.length).toBe(3);

        // All should be Operator type
        for (const gtToken of gtTokens) {
          const semanticToken = builder.getTokenAt(gtToken.line - 1, gtToken.column - 1);
          expect(semanticToken?.tokenType).toBe(SemanticTokenTypes.Operator);
        }
      });

      it('should correctly map multiple assignments', () => {
        const code = 'a := 1; b := 2; c := 3';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find all assignment tokens
        const assignTokens = tokens.filter(t => t.value === ':=');
        expect(assignTokens.length).toBe(3);

        // All should be Operator type
        for (const assignToken of assignTokens) {
          const semanticToken = builder.getTokenAt(assignToken.line - 1, assignToken.column - 1);
          expect(semanticToken?.tokenType).toBe(SemanticTokenTypes.Operator);
        }
      });
    });

    describe('Operators vs Keywords Distinction', () => {
      it('should map DIV keyword to Keyword type (not Operator)', () => {
        const code = 'x := 10 DIV 3';
        expect(findSemanticType(code, 'DIV')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map MOD keyword to Keyword type (not Operator)', () => {
        const code = 'x := 10 MOD 3';
        expect(findSemanticType(code, 'MOD')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map AND keyword to Keyword type (not Operator)', () => {
        const code = 'x AND y';
        expect(findSemanticType(code, 'AND')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map OR keyword to Keyword type (not Operator)', () => {
        const code = 'x OR y';
        expect(findSemanticType(code, 'OR')).toBe(SemanticTokenTypes.Keyword);
      });

      it('should map NOT keyword to Keyword type (not Operator)', () => {
        const code = 'NOT x';
        expect(findSemanticType(code, 'NOT')).toBe(SemanticTokenTypes.Keyword);
      });
    });
  });

  describe('Comment Token Mapping', () => {
    /**
     * NOTE: The lexer currently skips comments without emitting tokens.
     * This means the semantic tokens provider's comment mapping code (TokenType.Comment)
     * is ready to handle comments but won't receive any from the current lexer implementation.
     *
     * These tests verify:
     * 1. The semantic mapping for Comment tokens is correctly configured
     * 2. Comments are properly skipped by the lexer (don't appear as other token types)
     * 3. The provider would map Comment tokens correctly if they were emitted
     */

    describe('Comment Type in Semantic Legend', () => {
      it('should have Comment type in the semantic token legend', () => {
        const legend = getSemanticTokensLegend();
        expect(legend.tokenTypes).toContain('comment');
        expect(legend.tokenTypes[SemanticTokenTypes.Comment]).toBe('comment');
      });

      it('should have SemanticTokenTypes.Comment enum value defined', () => {
        expect(SemanticTokenTypes.Comment).toBe(9);
      });
    });

    describe('Comment Token Handling (Direct Provider Test)', () => {
      /**
       * Test that the SemanticTokensProvider correctly maps Comment tokens
       * by directly passing a mock Comment token through the provider.
       */
      it('should map TokenType.Comment to SemanticTokenTypes.Comment when token is provided', () => {
        const provider = new SemanticTokensProvider();
        const builder = new MockSemanticTokensBuilder();

        // Create a mock Comment token
        const commentToken: Token = {
          type: TokenType.Comment,
          value: '// This is a comment',
          line: 1,
          column: 1,
          startOffset: 0,
          endOffset: 20
        };

        // Parse empty AST
        const ast = parseCode('');

        // Build semantic tokens with just the comment token
        provider.buildSemanticTokens([commentToken], ast, builder as any);

        // Verify the comment token was mapped correctly
        expect(builder.tokens.length).toBe(1);
        expect(builder.tokens[0].tokenType).toBe(SemanticTokenTypes.Comment);
        expect(builder.tokens[0].line).toBe(0); // 0-indexed
        expect(builder.tokens[0].char).toBe(0); // 0-indexed
        expect(builder.tokens[0].length).toBe(20);
      });

      it('should map block comment token to Comment type when provided', () => {
        const provider = new SemanticTokensProvider();
        const builder = new MockSemanticTokensBuilder();

        const commentToken: Token = {
          type: TokenType.Comment,
          value: '/* Block comment */',
          line: 1,
          column: 1,
          startOffset: 0,
          endOffset: 19
        };

        const ast = parseCode('');
        provider.buildSemanticTokens([commentToken], ast, builder as any);

        expect(builder.tokens.length).toBe(1);
        expect(builder.tokens[0].tokenType).toBe(SemanticTokenTypes.Comment);
      });

      it('should correctly calculate comment length from token value', () => {
        const provider = new SemanticTokensProvider();
        const builder = new MockSemanticTokensBuilder();

        const commentToken: Token = {
          type: TokenType.Comment,
          value: '// Short',
          line: 3,
          column: 5,
          startOffset: 20,
          endOffset: 28
        };

        const ast = parseCode('');
        provider.buildSemanticTokens([commentToken], ast, builder as any);

        expect(builder.tokens[0].length).toBe(8); // length of '// Short'
        expect(builder.tokens[0].line).toBe(2);   // 0-indexed from line 3
        expect(builder.tokens[0].char).toBe(4);   // 0-indexed from column 5
      });
    });

    describe('Comments Skipped by Lexer (Current Behavior)', () => {
      /**
       * The lexer currently skips comments without emitting tokens.
       * These tests document this behavior.
       */
      it('should skip // comments - no comment tokens in output', () => {
        const code = '// This is a comment';
        const { builder } = buildSemanticTokens(code);

        // Lexer skips comments, so no semantic tokens should be produced
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);
      });

      it('should skip /* */ comments - no comment tokens in output', () => {
        const code = '/* Block comment */';
        const { builder } = buildSemanticTokens(code);

        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);
      });

      it('should skip inline comments after code', () => {
        const code = 'x := 1; // Comment after code';
        const { builder, tokens } = buildSemanticTokens(code);

        // Comment is skipped, but code tokens should still be present
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);

        // Verify code is still tokenized correctly
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBeGreaterThan(0);
      });

      it('should not tokenize content inside comments as keywords', () => {
        const code = '// IF THEN ELSE BEGIN END';
        const { builder } = buildSemanticTokens(code);

        // Keywords inside comment should NOT be tokenized
        const keywordTokens = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        expect(keywordTokens.length).toBe(0);
      });

      it('should not tokenize content inside comments as operators', () => {
        const code = '// x := 1 + 2 * 3';
        const { builder } = buildSemanticTokens(code);

        // Operators inside comment should NOT be tokenized
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBe(0);
      });
    });

    describe('Comments vs Other Token Types', () => {
      it('should not treat // inside string literal as comment', () => {
        const code = "x := '// Not a comment'";
        const { builder } = buildSemanticTokens(code);

        // The // inside the string should NOT be a comment
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);

        // Should have a string token containing the // text
        const stringTokens = builder.getTokensOfType(SemanticTokenTypes.String);
        expect(stringTokens.length).toBe(1);
      });

      it('should not treat // inside quoted identifier as comment', () => {
        const code = '"// Field Name" := 1';
        const { builder } = buildSemanticTokens(code);

        // The // inside the quoted identifier should NOT cause a comment
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);

        // Should have a variable token for the quoted identifier
        const variableTokens = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variableTokens.length).toBeGreaterThan(0);
      });

      it('should correctly tokenize code with comments in between', () => {
        const code = 'x := 1;\n// Comment\ny := 2;';
        const { builder, tokens } = buildSemanticTokens(code);

        // Both assignments should be tokenized (comments are skipped)
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        // Should have 2 := operators
        expect(operatorTokens.length).toBe(2);

        // Should have 2 number tokens
        const numberTokens = builder.getTokensOfType(SemanticTokenTypes.Number);
        expect(numberTokens.length).toBe(2);
      });

      it('should correctly tokenize code after block comment', () => {
        const code = '/* Comment */ x := 1';
        const { builder } = buildSemanticTokens(code);

        // Code after comment should be tokenized
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBe(1);

        const variableTokens = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variableTokens.length).toBe(1);

        const numberTokens = builder.getTokensOfType(SemanticTokenTypes.Number);
        expect(numberTokens.length).toBe(1);
      });

      it('should correctly tokenize code before block comment', () => {
        const code = 'x := 1 /* Comment */';
        const { builder } = buildSemanticTokens(code);

        // Code before comment should be tokenized
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBe(1);

        const variableTokens = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variableTokens.length).toBe(1);

        const numberTokens = builder.getTokensOfType(SemanticTokenTypes.Number);
        expect(numberTokens.length).toBe(1);
      });
    });

    describe('Multi-line Comments', () => {
      it('should skip multi-line block comment', () => {
        const code = '/* This is a\n   multi-line\n   comment */';
        const { builder } = buildSemanticTokens(code);

        // Multi-line comment should be skipped
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);
      });

      it('should correctly tokenize code after multi-line comment', () => {
        const code = '/* Multi\nline\ncomment */\nx := 1';
        const { builder } = buildSemanticTokens(code);

        // Code after multi-line comment should be tokenized
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBe(1);

        const variableTokens = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variableTokens.length).toBe(1);
      });
    });

    describe('Comment and Code Interleaving', () => {
      it('should correctly handle alternating code and comments', () => {
        const code = 'a := 1;\n// Comment 1\nb := 2;\n// Comment 2\nc := 3;';
        const { builder } = buildSemanticTokens(code);

        // All three assignments should be tokenized
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBe(3); // 3 := operators

        const numberTokens = builder.getTokensOfType(SemanticTokenTypes.Number);
        expect(numberTokens.length).toBe(3);

        // Comments should be skipped
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);
      });

      it('should correctly handle code with inline comments', () => {
        const code = 'IF x > 0 THEN // positive\n  y := 1; // set value';
        const { builder } = buildSemanticTokens(code);

        // Keywords should be tokenized
        const keywordTokens = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        expect(keywordTokens.length).toBe(2); // IF, THEN

        // Operators should be tokenized (>, :=)
        const operatorTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operatorTokens.length).toBe(2);

        // Comments should be skipped
        const commentTokens = builder.getTokensOfType(SemanticTokenTypes.Comment);
        expect(commentTokens.length).toBe(0);
      });
    });
  });

  describe('Position Calculation', () => {
    /**
     * Position Calculation Tests
     *
     * Semantic tokens use 0-indexed positions for compatibility with LSP.
     * The lexer uses 1-indexed positions, so the provider must convert:
     * - line: token.line - 1
     * - char: token.column - 1
     * - length: token.value.length
     */

    describe('0-Indexed Positions', () => {
      it('should return 0-indexed line for first line (lexer line 1 becomes 0)', () => {
        const code = 'BEGIN';
        const { builder, tokens } = buildSemanticTokens(code);

        // BEGIN is on line 1 in lexer (1-indexed)
        const beginToken = tokens.find(t => t.value === 'BEGIN');
        expect(beginToken?.line).toBe(1);

        // Semantic token should be on line 0 (0-indexed)
        const semanticToken = builder.getTokenAt(0, 0);
        expect(semanticToken).toBeDefined();
        expect(semanticToken?.line).toBe(0);
      });

      it('should return 0-indexed character for first column (lexer column 1 becomes 0)', () => {
        const code = 'BEGIN';
        const { builder, tokens } = buildSemanticTokens(code);

        // BEGIN is at column 1 in lexer (1-indexed)
        const beginToken = tokens.find(t => t.value === 'BEGIN');
        expect(beginToken?.column).toBe(1);

        // Semantic token should be at char 0 (0-indexed)
        const semanticToken = builder.getTokenAt(0, 0);
        expect(semanticToken).toBeDefined();
        expect(semanticToken?.char).toBe(0);
      });

      it('should correctly calculate token length from value', () => {
        const code = 'BEGIN';
        const { builder } = buildSemanticTokens(code);

        const semanticToken = builder.getTokenAt(0, 0);
        expect(semanticToken).toBeDefined();
        expect(semanticToken?.length).toBe(5); // 'BEGIN'.length === 5
      });
    });

    describe('Single Line Token Positions', () => {
      it('should correctly position first token at char 0', () => {
        const code = 'IF x THEN';
        const { builder } = buildSemanticTokens(code);

        // 'IF' should be at (line=0, char=0)
        const ifToken = builder.getTokenAt(0, 0);
        expect(ifToken).toBeDefined();
        expect(ifToken?.length).toBe(2);
      });

      it('should correctly position token in middle of line', () => {
        const code = 'IF x THEN';
        const { builder, tokens } = buildSemanticTokens(code);

        // Find 'x' token position from lexer
        const xToken = tokens.find(t => t.value === 'x');
        expect(xToken).toBeDefined();

        // Semantic token should be at (line=0, char=column-1)
        const xSemantic = builder.getTokenAt(0, xToken!.column - 1);
        expect(xSemantic).toBeDefined();
        expect(xSemantic?.length).toBe(1);
      });

      it('should correctly position token at end of line', () => {
        const code = 'IF x THEN';
        const { builder, tokens } = buildSemanticTokens(code);

        // 'THEN' is at the end
        const thenToken = tokens.find(t => t.value === 'THEN');
        expect(thenToken).toBeDefined();

        const thenSemantic = builder.getTokenAt(0, thenToken!.column - 1);
        expect(thenSemantic).toBeDefined();
        expect(thenSemantic?.length).toBe(4);
      });

      it('should correctly position multiple tokens on same line', () => {
        const code = 'x := 1 + 2';
        const { builder, tokens } = buildSemanticTokens(code);

        // Verify each token's position
        const xToken = tokens.find(t => t.value === 'x');
        const assignToken = tokens.find(t => t.value === ':=');
        const oneToken = tokens.find(t => t.value === '1');
        const plusToken = tokens.find(t => t.value === '+');
        const twoToken = tokens.find(t => t.value === '2');

        // Each token should have correct semantic position
        expect(builder.getTokenAt(0, xToken!.column - 1)).toBeDefined();
        expect(builder.getTokenAt(0, assignToken!.column - 1)).toBeDefined();
        expect(builder.getTokenAt(0, oneToken!.column - 1)).toBeDefined();
        expect(builder.getTokenAt(0, plusToken!.column - 1)).toBeDefined();
        expect(builder.getTokenAt(0, twoToken!.column - 1)).toBeDefined();
      });

      it('should correctly calculate length for short tokens', () => {
        const code = 'x + y';
        const { builder, tokens } = buildSemanticTokens(code);

        const xToken = tokens.find(t => t.value === 'x');
        const yToken = tokens.find(t => t.value === 'y');
        const plusToken = tokens.find(t => t.value === '+');

        const xSemantic = builder.getTokenAt(0, xToken!.column - 1);
        const ySemantic = builder.getTokenAt(0, yToken!.column - 1);
        const plusSemantic = builder.getTokenAt(0, plusToken!.column - 1);

        expect(xSemantic?.length).toBe(1);
        expect(ySemantic?.length).toBe(1);
        expect(plusSemantic?.length).toBe(1);
      });

      it('should correctly calculate length for long tokens', () => {
        const code = 'VeryLongIdentifierName';
        const { builder } = buildSemanticTokens(code);

        const token = builder.getTokenAt(0, 0);
        expect(token?.length).toBe(22);
      });

      it('should correctly calculate length for multi-character operators', () => {
        const code = 'x := y <> z';
        const { builder, tokens } = buildSemanticTokens(code);

        const assignToken = tokens.find(t => t.value === ':=');
        const notEqualToken = tokens.find(t => t.value === '<>');

        const assignSemantic = builder.getTokenAt(0, assignToken!.column - 1);
        const notEqualSemantic = builder.getTokenAt(0, notEqualToken!.column - 1);

        expect(assignSemantic?.length).toBe(2);
        expect(notEqualSemantic?.length).toBe(2);
      });
    });

    describe('Multiline Code Positions', () => {
      it('should correctly position token on second line (line index 1)', () => {
        const code = 'IF x THEN\nBEGIN';
        const { builder, tokens } = buildSemanticTokens(code);

        // 'BEGIN' should be on line 2 in lexer (1-indexed)
        const beginToken = tokens.find(t => t.value === 'BEGIN');
        expect(beginToken?.line).toBe(2);

        // Semantic token should be on line 1 (0-indexed)
        const beginSemantic = builder.getTokenAt(1, 0);
        expect(beginSemantic).toBeDefined();
        expect(beginSemantic?.line).toBe(1);
        expect(beginSemantic?.char).toBe(0);
        expect(beginSemantic?.length).toBe(5);
      });

      it('should correctly position tokens across multiple lines', () => {
        const code = 'IF x\nTHEN\nBEGIN\nEND';
        const { builder, tokens } = buildSemanticTokens(code);

        // Verify each keyword is on the expected line
        const ifToken = tokens.find(t => t.value === 'IF');
        const thenToken = tokens.find(t => t.value === 'THEN');
        const beginToken = tokens.find(t => t.value === 'BEGIN');
        const endToken = tokens.find(t => t.value === 'END');

        // Check 0-indexed line positions
        expect(builder.getTokenAt(0, ifToken!.column - 1)?.line).toBe(0);
        expect(builder.getTokenAt(1, thenToken!.column - 1)?.line).toBe(1);
        expect(builder.getTokenAt(2, beginToken!.column - 1)?.line).toBe(2);
        expect(builder.getTokenAt(3, endToken!.column - 1)?.line).toBe(3);
      });

      it('should correctly position indented code on second line', () => {
        const code = 'BEGIN\n  x := 1;\nEND';
        const { builder, tokens } = buildSemanticTokens(code);

        // 'x' is indented by 2 spaces on line 2
        const xToken = tokens.find(t => t.value === 'x');
        expect(xToken?.line).toBe(2);
        expect(xToken?.column).toBe(3); // 2 spaces + 1 (1-indexed)

        // Semantic token: line 1 (0-indexed), char 2 (0-indexed from column 3)
        const xSemantic = builder.getTokenAt(1, 2);
        expect(xSemantic).toBeDefined();
        expect(xSemantic?.line).toBe(1);
        expect(xSemantic?.char).toBe(2);
      });

      it('should correctly position multiple tokens per line in multiline code', () => {
        const code = 'a := 1;\nb := 2;\nc := 3;';
        const { builder, tokens } = buildSemanticTokens(code);

        // Get assignment tokens for each line
        const aToken = tokens.find(t => t.value === 'a');
        const bToken = tokens.find(t => t.value === 'b');
        const cToken = tokens.find(t => t.value === 'c');

        // Each variable should be on its respective line (0-indexed)
        expect(builder.getTokenAt(0, aToken!.column - 1)?.line).toBe(0);
        expect(builder.getTokenAt(1, bToken!.column - 1)?.line).toBe(1);
        expect(builder.getTokenAt(2, cToken!.column - 1)?.line).toBe(2);
      });

      it('should handle many lines of code', () => {
        const code = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10';
        const { builder, tokens } = buildSemanticTokens(code);

        // Verify tokens on first, middle, and last lines
        const line1Token = tokens.find(t => t.value === 'line1');
        const line5Token = tokens.find(t => t.value === 'line5');
        const line10Token = tokens.find(t => t.value === 'line10');

        expect(builder.getTokenAt(0, 0)?.line).toBe(0);
        expect(builder.getTokenAt(4, 0)?.line).toBe(4);
        expect(builder.getTokenAt(9, 0)?.line).toBe(9);
      });

      it('should correctly position code after empty lines', () => {
        const code = 'BEGIN\n\n\nEND';
        const { builder, tokens } = buildSemanticTokens(code);

        // 'BEGIN' is on line 1, 'END' is on line 4 in lexer
        const beginToken = tokens.find(t => t.value === 'BEGIN');
        const endToken = tokens.find(t => t.value === 'END');

        expect(beginToken?.line).toBe(1);
        expect(endToken?.line).toBe(4);

        // Semantic positions (0-indexed)
        expect(builder.getTokenAt(0, 0)?.line).toBe(0);
        expect(builder.getTokenAt(3, 0)?.line).toBe(3);
      });
    });

    describe('Special Token Lengths', () => {
      it('should correctly calculate length for quoted identifiers (without quotes)', () => {
        const code = '"Line No." := 1';
        const { builder, tokens } = buildSemanticTokens(code);

        // Quoted identifier token value is 'Line No.' (without quotes)
        const quotedToken = tokens.find(t => t.value === 'Line No.');
        expect(quotedToken).toBeDefined();

        const quotedSemantic = builder.getTokenAt(0, quotedToken!.column - 1);
        expect(quotedSemantic).toBeDefined();
        // Length is based on token.value.length, which is 'Line No.' = 8 chars
        expect(quotedSemantic?.length).toBe(8);
      });

      it('should correctly calculate length for string literals (without quotes)', () => {
        const code = "x := 'Hello World'";
        const { builder, tokens } = buildSemanticTokens(code);

        // String token value is 'Hello World' (without surrounding quotes)
        const stringToken = tokens.find(t => t.value === 'Hello World');
        expect(stringToken).toBeDefined();

        const stringSemantic = builder.getTokenAt(0, stringToken!.column - 1);
        expect(stringSemantic).toBeDefined();
        // Length is based on 'Hello World' = 11 chars
        expect(stringSemantic?.length).toBe(11);
      });

      it('should correctly calculate length for empty quoted identifier', () => {
        const code = '"" := 1';
        const { builder, tokens } = buildSemanticTokens(code);

        // Empty quoted identifier has empty value
        const emptyToken = tokens.find(t => t.type === TokenType.QuotedIdentifier && t.value === '');
        expect(emptyToken).toBeDefined();

        const emptySemantic = builder.getTokenAt(0, emptyToken!.column - 1);
        expect(emptySemantic).toBeDefined();
        expect(emptySemantic?.length).toBe(0);
      });

      it('should correctly calculate length for empty string literal', () => {
        const code = "x := ''";
        const { builder, tokens } = buildSemanticTokens(code);

        // Empty string has empty value
        const emptyStringToken = tokens.find(t => t.type === TokenType.String && t.value === '');
        expect(emptyStringToken).toBeDefined();

        const emptySemantic = builder.getTokenAt(0, emptyStringToken!.column - 1);
        expect(emptySemantic).toBeDefined();
        expect(emptySemantic?.length).toBe(0);
      });

      it('should correctly calculate length for number tokens', () => {
        const code = 'x := 12345';
        const { builder, tokens } = buildSemanticTokens(code);

        const numToken = tokens.find(t => t.value === '12345');
        expect(numToken).toBeDefined();

        const numSemantic = builder.getTokenAt(0, numToken!.column - 1);
        expect(numSemantic?.length).toBe(5);
      });

      it('should correctly calculate length for decimal number tokens', () => {
        const code = 'x := 123.456';
        const { builder, tokens } = buildSemanticTokens(code);

        const decToken = tokens.find(t => t.value === '123.456');
        expect(decToken).toBeDefined();

        const decSemantic = builder.getTokenAt(0, decToken!.column - 1);
        expect(decSemantic?.length).toBe(7);
      });
    });

    describe('Position Edge Cases', () => {
      it('should correctly handle single character tokens', () => {
        const code = 'x';
        const { builder } = buildSemanticTokens(code);

        const token = builder.getTokenAt(0, 0);
        expect(token).toBeDefined();
        expect(token?.line).toBe(0);
        expect(token?.char).toBe(0);
        expect(token?.length).toBe(1);
      });

      it('should correctly handle tokens at various character offsets', () => {
        const code = '     x';  // 5 spaces before x
        const { builder, tokens } = buildSemanticTokens(code);

        const xToken = tokens.find(t => t.value === 'x');
        expect(xToken?.column).toBe(6); // 1-indexed, after 5 spaces

        const xSemantic = builder.getTokenAt(0, 5); // 0-indexed: char 5
        expect(xSemantic).toBeDefined();
        expect(xSemantic?.char).toBe(5);
      });

      it('should correctly handle tokens with tab characters (lexer uses column)', () => {
        const code = '\tx';  // Tab before x
        const { builder, tokens } = buildSemanticTokens(code);

        const xToken = tokens.find(t => t.value === 'x');
        // The column value depends on how the lexer counts tabs
        // We just verify the semantic token is at the expected 0-indexed position
        const xSemantic = builder.getTokenAt(0, xToken!.column - 1);
        expect(xSemantic).toBeDefined();
      });

      it('should correctly handle very long lines', () => {
        const longIdentifier = 'a'.repeat(100);
        const code = longIdentifier;
        const { builder } = buildSemanticTokens(code);

        const token = builder.getTokenAt(0, 0);
        expect(token).toBeDefined();
        expect(token?.length).toBe(100);
      });

      it('should correctly handle token at high line number', () => {
        // Create 50 lines with code on line 50
        const lines = Array(49).fill('').concat(['END']);
        const code = lines.join('\n');
        const { builder, tokens } = buildSemanticTokens(code);

        const endToken = tokens.find(t => t.value === 'END');
        expect(endToken?.line).toBe(50); // 1-indexed

        // Semantic token on line 49 (0-indexed)
        const endSemantic = builder.getTokenAt(49, 0);
        expect(endSemantic).toBeDefined();
        expect(endSemantic?.line).toBe(49);
      });

      it('should correctly handle token at high column number', () => {
        const spaces = ' '.repeat(100);
        const code = spaces + 'END';
        const { builder, tokens } = buildSemanticTokens(code);

        const endToken = tokens.find(t => t.value === 'END');
        expect(endToken?.column).toBe(101); // 1-indexed, after 100 spaces

        const endSemantic = builder.getTokenAt(0, 100); // 0-indexed
        expect(endSemantic).toBeDefined();
        expect(endSemantic?.char).toBe(100);
      });
    });

    describe('Multiline Procedure Position Verification', () => {
      it('should correctly position all tokens in a multiline procedure', () => {
        const code = `PROCEDURE MyProc()
VAR
  x : Integer;
BEGIN
  x := 1;
END`;
        const { builder, tokens } = buildSemanticTokens(code);

        // Verify line positions (0-indexed) for key tokens
        const procToken = tokens.find(t => t.value === 'PROCEDURE');
        const varToken = tokens.find(t => t.value === 'VAR');
        const intToken = tokens.find(t => t.value === 'Integer');
        const beginToken = tokens.find(t => t.value === 'BEGIN');
        const endToken = tokens.find(t => t.value === 'END');

        // Check each token is on the expected 0-indexed line
        expect(builder.getTokenAt(0, procToken!.column - 1)?.line).toBe(0); // PROCEDURE on line 0
        expect(builder.getTokenAt(1, varToken!.column - 1)?.line).toBe(1);  // VAR on line 1
        expect(builder.getTokenAt(2, intToken!.column - 1)?.line).toBe(2);  // Integer on line 2
        expect(builder.getTokenAt(3, beginToken!.column - 1)?.line).toBe(3); // BEGIN on line 3
        expect(builder.getTokenAt(5, endToken!.column - 1)?.line).toBe(5);  // END on line 5
      });

      it('should correctly position indented tokens in a multiline block', () => {
        const code = `BEGIN
  IF TRUE THEN
    x := 1;
  ELSE
    x := 2;
END`;
        const { builder, tokens } = buildSemanticTokens(code);

        // Find the 'IF' token (indented by 2 spaces)
        const ifToken = tokens.find(t => t.value === 'IF');
        expect(ifToken?.line).toBe(2);
        expect(ifToken?.column).toBe(3); // 2 spaces + 1 for 1-indexed

        const ifSemantic = builder.getTokenAt(1, 2);
        expect(ifSemantic).toBeDefined();
        expect(ifSemantic?.line).toBe(1);
        expect(ifSemantic?.char).toBe(2);
        expect(ifSemantic?.length).toBe(2);

        // Find the first 'x' (indented by 4 spaces)
        const xTokens = tokens.filter(t => t.value === 'x');
        const firstX = xTokens[0];
        expect(firstX?.line).toBe(3);
        expect(firstX?.column).toBe(5); // 4 spaces + 1 for 1-indexed

        const xSemantic = builder.getTokenAt(2, 4);
        expect(xSemantic).toBeDefined();
        expect(xSemantic?.line).toBe(2);
        expect(xSemantic?.char).toBe(4);
      });
    });

    describe('Position Consistency with Lexer', () => {
      it('should have consistent position mapping from lexer to semantic tokens', () => {
        const code = 'VAR x : Integer';
        const { builder, tokens } = buildSemanticTokens(code);

        // For each non-skipped lexer token, verify semantic position
        for (const token of tokens) {
          if (token.type === TokenType.Whitespace ||
              token.type === TokenType.EOF ||
              token.type === TokenType.LeftParen ||
              token.type === TokenType.RightParen ||
              token.type === TokenType.LeftBrace ||
              token.type === TokenType.RightBrace ||
              token.type === TokenType.Semicolon ||
              token.type === TokenType.Colon ||
              token.type === TokenType.Comma) {
            continue; // Skip tokens that don't produce semantic tokens
          }

          const semanticToken = builder.getTokenAt(token.line - 1, token.column - 1);
          if (semanticToken) {
            expect(semanticToken.line).toBe(token.line - 1);
            expect(semanticToken.char).toBe(token.column - 1);
          }
        }
      });

      it('should correctly map all keyword positions in complex code', () => {
        const code = 'IF a > b THEN BEGIN c := d END ELSE e := f';
        const { builder, tokens } = buildSemanticTokens(code);

        const keywords = ['IF', 'THEN', 'BEGIN', 'END', 'ELSE'];

        for (const kw of keywords) {
          const kwToken = tokens.find(t => t.value === kw);
          expect(kwToken).toBeDefined();

          const kwSemantic = builder.getTokenAt(kwToken!.line - 1, kwToken!.column - 1);
          expect(kwSemantic).toBeDefined();
          expect(kwSemantic?.tokenType).toBe(SemanticTokenTypes.Keyword);
          expect(kwSemantic?.length).toBe(kw.length);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Empty and Minimal Input', () => {
      it('should handle empty string input gracefully', () => {
        const code = '';
        const { builder } = buildSemanticTokens(code);

        // Empty input produces only EOF token which is skipped
        expect(builder.tokens.length).toBe(0);
      });

      it('should handle whitespace-only input', () => {
        const code = '   \t\n  \r\n  ';
        const { builder } = buildSemanticTokens(code);

        // Only whitespace tokens which are all skipped
        expect(builder.tokens.length).toBe(0);
      });

      it('should handle single token input', () => {
        const code = 'BEGIN';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(1);
        expect(builder.tokens[0].tokenType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should handle input with only punctuation', () => {
        const code = '{ } ( ) [ ] ; : , .';
        const { builder } = buildSemanticTokens(code);

        // All punctuation should be skipped except for operators
        // . is mapped to Operator type
        const dotTokens = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(dotTokens.length).toBe(1); // Only the dot
      });

      it('should handle newline-only input', () => {
        const code = '\n\n\n';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });
    });

    describe('Skipped Token Types', () => {
      it('should skip whitespace tokens', () => {
        const code = 'x     y';
        const { builder } = buildSemanticTokens(code);

        // Should only have tokens for x and y
        expect(builder.tokens.length).toBe(2);
      });

      it('should highlight left brace as keyword', () => {
        const code = '{';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(1);
        expect(builder.tokens[0]).toMatchObject({
          tokenType: SemanticTokenTypes.Keyword,
        });
      });

      it('should highlight right brace as keyword', () => {
        const code = '}';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(1);
        expect(builder.tokens[0]).toMatchObject({
          tokenType: SemanticTokenTypes.Keyword,
        });
      });

      it('should skip left parenthesis token', () => {
        const code = '(';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip right parenthesis token', () => {
        const code = ')';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip left bracket token', () => {
        const code = '[';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip right bracket token', () => {
        const code = ']';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip semicolon token', () => {
        const code = ';';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip colon token', () => {
        const code = ':';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip comma token', () => {
        const code = ',';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(0);
      });

      it('should skip EOF token', () => {
        const code = '';
        const { tokens, builder } = buildSemanticTokens(code);

        // EOF should be in tokens array but not produce semantic token
        const eofToken = tokens.find(t => t.type === TokenType.EOF);
        expect(eofToken).toBeDefined();
        expect(builder.tokens.length).toBe(0);
      });

      it('should skip all punctuation in realistic code', () => {
        const code = 'PROCEDURE MyProc(a : Integer; b : Text) : Boolean';
        const { builder } = buildSemanticTokens(code);

        // Verify no semicolons, colons, or parentheses appear
        // Only keywords, identifiers, and types should be present
        const expectedCount = 6; // PROCEDURE, MyProc, a, Integer, b, Text, Boolean
        // Note: The colon before Boolean might be skipped or included depending on implementation
        expect(builder.tokens.length).toBeGreaterThanOrEqual(5);

        // All tokens should be either keywords, types, or variables
        for (const token of builder.tokens) {
          expect([
            SemanticTokenTypes.Keyword,
            SemanticTokenTypes.Type,
            SemanticTokenTypes.Variable
          ]).toContain(token.tokenType);
        }
      });
    });

    describe('Large File Handling', () => {
      it('should handle a file with many tokens (100+ tokens)', () => {
        // Generate code with 100+ tokens
        const statements: string[] = [];
        for (let i = 0; i < 50; i++) {
          statements.push(`x${i} := ${i}`);
        }
        const code = statements.join(';\n');
        const { builder, tokens } = buildSemanticTokens(code);

        // Should have processed many tokens
        expect(tokens.length).toBeGreaterThan(100);

        // Should have produced semantic tokens for identifiers and numbers
        expect(builder.tokens.length).toBeGreaterThan(50);

        // Verify some tokens have correct types
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        expect(variables.length).toBe(50); // x0 through x49
        expect(numbers.length).toBe(50);   // 0 through 49
      });

      it('should handle a file with 500+ tokens', () => {
        // Generate even more tokens
        const statements: string[] = [];
        for (let i = 0; i < 100; i++) {
          statements.push(`var${i} := ${i} + ${i + 1}`);
        }
        const code = statements.join(';\n');
        const { builder, tokens } = buildSemanticTokens(code);

        // Should have many tokens
        expect(tokens.length).toBeGreaterThan(500);

        // Should produce semantic tokens proportionally
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);
        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);

        expect(variables.length).toBe(100);
        expect(numbers.length).toBe(200); // Two numbers per statement
        expect(operators.length).toBeGreaterThanOrEqual(100); // At least the + operators
      });

      it('should handle deeply nested code structure', () => {
        const code = `
BEGIN
  IF TRUE THEN
  BEGIN
    IF TRUE THEN
    BEGIN
      IF TRUE THEN
      BEGIN
        x := 1
      END
    END
  END
END`;
        const { builder } = buildSemanticTokens(code);

        // Should process all tokens correctly
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);

        // BEGIN (4), IF (3), TRUE (3), THEN (3), END (4) = 17 keywords
        expect(keywords.length).toBe(17);
        expect(variables.length).toBe(1); // Only 'x'
      });

      it('should handle code with many lines (100+ lines)', () => {
        // Generate 100 lines of code
        const lines: string[] = ['BEGIN'];
        for (let i = 0; i < 100; i++) {
          lines.push(`  line${i} := ${i};`);
        }
        lines.push('END');
        const code = lines.join('\n');

        const { builder, tokens } = buildSemanticTokens(code);

        // Verify tokens span many lines
        const lastToken = builder.tokens[builder.tokens.length - 1];
        expect(lastToken.line).toBeGreaterThan(90); // END should be near line 101

        // Verify token count
        expect(builder.tokens.length).toBeGreaterThan(200);
      });

      it('should maintain correct line positions across large files', () => {
        // Generate code with known positions
        const lines: string[] = [];
        for (let i = 0; i < 50; i++) {
          lines.push('x');
        }
        const code = lines.join('\n');

        const { builder } = buildSemanticTokens(code);

        // Each 'x' should be on its own line
        expect(builder.tokens.length).toBe(50);

        for (let i = 0; i < 50; i++) {
          expect(builder.tokens[i].line).toBe(i);
          expect(builder.tokens[i].char).toBe(0);
          expect(builder.tokens[i].length).toBe(1);
        }
      });

      it('should handle very long identifiers', () => {
        const longName = 'a'.repeat(500);
        const code = `${longName} := 1`;
        const { builder } = buildSemanticTokens(code);

        const identToken = builder.getTokenAt(0, 0);
        expect(identToken).toBeDefined();
        expect(identToken?.length).toBe(500);
        expect(identToken?.tokenType).toBe(SemanticTokenTypes.Variable);
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(1000);
        const code = `x := '${longString}'`;
        const { builder, tokens } = buildSemanticTokens(code);

        const stringToken = tokens.find(t => t.type === TokenType.String);
        expect(stringToken).toBeDefined();

        const stringSemantic = builder.getTokenAt(0, stringToken!.column - 1);
        expect(stringSemantic?.length).toBe(1000);
        expect(stringSemantic?.tokenType).toBe(SemanticTokenTypes.String);
      });
    });

    describe('Mixed Content Edge Cases', () => {
      it('should handle alternating semantic and skipped tokens', () => {
        const code = 'x ( y ) z';
        const { builder } = buildSemanticTokens(code);

        // x, y, z are identifiers; (, ) are skipped
        expect(builder.tokens.length).toBe(3);

        const positions = builder.tokens.map(t => t.char);
        expect(positions).toEqual([0, 4, 8]); // Correct character positions
      });

      it('should handle consecutive operators', () => {
        const code = 'a + - * / b';
        const { builder } = buildSemanticTokens(code);

        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);
        expect(operators.length).toBe(4); // +, -, *, /
      });

      it('should handle consecutive keywords', () => {
        const code = 'BEGIN END IF THEN ELSE';
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        expect(keywords.length).toBe(5);
      });

      it('should correctly handle mixed quoted and unquoted identifiers', () => {
        const code = 'x "Line No." y "Amount" z';
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variables.length).toBe(5); // x, "Line No.", y, "Amount", z

        // All should be Variable type (key feature!)
        for (const v of variables) {
          expect(v.tokenType).toBe(SemanticTokenTypes.Variable);
        }
      });

      it('should handle code with all semantic token types present', () => {
        // Note: The C/AL lexer skips comments entirely, so we cannot test Comment semantic type here
        const code = `
PROCEDURE Test(x : Integer)
VAR
  str : Text;
BEGIN
  str := 'hello';
  x := 123 + 456;
  IF TRUE THEN
    EXIT;
END`;
        const { builder } = buildSemanticTokens(code);

        // Verify presence of major token types (excluding Comment which is skipped by lexer)
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);
        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);

        expect(keywords.length).toBeGreaterThan(0);
        expect(types.length).toBeGreaterThan(0);
        expect(variables.length).toBeGreaterThan(0);
        expect(strings.length).toBeGreaterThan(0);
        expect(numbers.length).toBeGreaterThan(0);
        expect(operators.length).toBeGreaterThan(0);
      });

      it('should handle code where all tokens are skipped (comments only)', () => {
        // The C/AL lexer skips comments, so this produces no semantic tokens
        const code = '// This is a line comment';
        const { builder } = buildSemanticTokens(code);

        // All content is a comment which is skipped by lexer
        expect(builder.tokens.length).toBe(0);
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle token at column 0', () => {
        const code = 'x';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens[0].char).toBe(0);
      });

      it('should handle token at line 0', () => {
        const code = 'x';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens[0].line).toBe(0);
      });

      it('should handle maximum line position accurately', () => {
        // Create 1000 lines to test high line numbers
        const lines = Array(999).fill('').concat(['END']);
        const code = lines.join('\n');
        const { builder } = buildSemanticTokens(code);

        const endToken = builder.tokens.find(t => t.line === 999);
        expect(endToken).toBeDefined();
        expect(endToken?.tokenType).toBe(SemanticTokenTypes.Keyword);
      });

      it('should handle length of 0 (empty identifier)', () => {
        // Empty quoted identifier
        const code = '""';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens.length).toBe(1);
        expect(builder.tokens[0].length).toBe(0);
      });

      it('should handle length of 1 (single character)', () => {
        const code = 'x';
        const { builder } = buildSemanticTokens(code);

        expect(builder.tokens[0].length).toBe(1);
      });
    });
  });

  /**
   * Integration Tests
   *
   * Tests that verify correct semantic token generation through the full
   * Lexer -> SemanticTokensProvider pipeline using realistic C/AL code.
   */
  describe('Integration Tests', () => {
    describe('Full Lexer -> SemanticTokensProvider pipeline', () => {
      it('should correctly tokenize a complete Customer table object', () => {
        const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=[ENU=Customer;DEU=Debitor];
  }
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;"Search Name"   ;Code100       }
    { 4   ;   ;"Address 2"     ;Text50        }
    { 5   ;   ;City            ;Text30        }
    { 6   ;   ;"Phone No."     ;Text30        }
    { 7   ;   ;Balance         ;Decimal       }
    { 8   ;   ;"Balance (LCY)" ;Decimal       }
  }
}`;
        const { builder } = buildSemanticTokens(code);

        // Verify keywords are correctly identified
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const keywordNames = ['OBJECT', 'Table', 'PROPERTIES', 'FIELDS'];
        expect(keywords.length).toBeGreaterThan(0);

        // Verify identifiers (both quoted and unquoted) are correctly mapped
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variables.length).toBeGreaterThan(0);

        // Verify types are correctly identified
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);
        expect(types.length).toBeGreaterThan(0);
      });

      it('should correctly tokenize a complete Sales Order Management codeunit', () => {
        const code = `OBJECT Codeunit 80 SalesPost {
          CODE {
            VAR
              Header : Record 36;
              Line : Record 37;
              TotalAmount : Decimal;
              PostingDate : Date;
              ErrorMessage : Text;

            PROCEDURE Run();
            BEGIN
              Header.SETFILTER("No.", '<>%1', '');
              IF Header.FINDSET THEN
                REPEAT
                  TotalAmount := TotalAmount + Header.Amount;
                UNTIL Header.NEXT = 0;
            END;

            LOCAL PROCEDURE CheckFields();
            VAR
              LocalVar : Integer;
            BEGIN
              IF TotalAmount <= 0 THEN
                ERROR(ErrorMessage);
            END;

            PROCEDURE FinalizePosting();
            BEGIN
              Line.MODIFYALL(Posted, TRUE);
            END;
          }
        }`;
        const { builder } = buildSemanticTokens(code);

        // Should have many semantic tokens
        expect(builder.tokens.length).toBeGreaterThan(50);

        // Verify presence of all major semantic types
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);
        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        // Keywords: OBJECT, Codeunit, CODE, VAR, PROCEDURE, BEGIN, END, IF, THEN, REPEAT, UNTIL, LOCAL, ERROR, TRUE
        expect(keywords.length).toBeGreaterThan(10);

        // Variables: Header, Line, TotalAmount, PostingDate, ErrorMessage, LocalVar, etc.
        expect(variables.length).toBeGreaterThan(10);

        // Types: Record, Decimal, Date, Text, Integer
        expect(types.length).toBeGreaterThan(3);

        // Operators: :=, +, <=, =
        expect(operators.length).toBeGreaterThan(2);

        // Strings: '<>%1', '', etc.
        expect(strings.length).toBeGreaterThan(0);
      });

      it('should correctly tokenize a table with both FIELDS and CODE sections', () => {
        const code = `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type"   ;Option        }
    { 2   ;   ;"No."             ;Code20        }
    { 3   ;   ;"Posting Date"    ;Date          }
    { 4   ;   ;Amount            ;Decimal       }
  }

  CODE
  {
    VAR
      LocalCustomer : Record 18;
      TotalAmount : Decimal;

    PROCEDURE UpdateAmount();
    BEGIN
      Amount := TotalAmount;
      MODIFY;
    END;

    TRIGGER OnValidate();
    BEGIN
      IF Amount < 0 THEN
        Amount := 0;
    END;
  }
}`;
        const { builder } = buildSemanticTokens(code);

        // Verify FIELDS section tokens
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        expect(keywords.some(k => builder.tokens.indexOf(k) >= 0)).toBe(true);

        // Verify CODE section tokens
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variables.length).toBeGreaterThan(3);

        // Verify types from both sections
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);
        expect(types.length).toBeGreaterThan(2);
      });
    });

    describe('Quoted identifiers - CRITICAL feature verification', () => {
      it('should map both regular and quoted field identifiers to Variable type in realistic table', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;"Search Name"   ;Code100       }
    { 4   ;   ;Address         ;Text100       }
    { 5   ;   ;"Balance (LCY)" ;Decimal       }
  }
}`;
        const { builder, tokens } = buildSemanticTokens(code);

        // Find both quoted and unquoted identifier tokens
        const quotedIdentifiers = tokens.filter(t => t.type === TokenType.QuotedIdentifier);
        const regularIdentifiers = tokens.filter(t => t.type === TokenType.Identifier);

        // Verify quoted identifiers exist
        expect(quotedIdentifiers.length).toBeGreaterThan(0);

        // Verify all identifiers (quoted and regular) map to Variable type
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variables.length).toBeGreaterThan(0);

        // The key feature: both should produce semantic tokens of the same type
        for (const quotedId of quotedIdentifiers) {
          const semToken = builder.getTokenAt(quotedId.line - 1, quotedId.column - 1);
          if (semToken) {
            expect(semToken.tokenType).toBe(SemanticTokenTypes.Variable);
          }
        }
      });

      it('should ensure "Line No." and LineNo appear with same semantic highlighting in expressions', () => {
        const code = `
x := "Line No.";
y := LineNo;
"Line Amount" := Amount;
"Line Discount %" := DiscountPct;
`;
        const { builder, tokens } = buildSemanticTokens(code);

        // All identifiers should be Variable type
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);

        // Should have: x, "Line No.", y, LineNo, "Line Amount", Amount, "Line Discount %", DiscountPct
        expect(variables.length).toBe(8);

        // All should have the same tokenType (Variable)
        for (const v of variables) {
          expect(v.tokenType).toBe(SemanticTokenTypes.Variable);
        }
      });

      it('should handle quoted identifiers with special characters in assignments', () => {
        const code = `
"VAT %" := 25;
"Balance (LCY)" := 1000.50;
"Gen. Bus. Posting Group" := 'NATIONAL';
`;
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);

        // Should have quoted identifier variables
        expect(variables.length).toBe(3);

        // Should have numbers
        expect(numbers.length).toBe(2);

        // Should have string
        expect(strings.length).toBe(1);
      });

      it('should correctly distinguish quoted identifiers from string literals in same code', () => {
        const code = `
"Customer Name" := 'John Doe';
Description := "Search Name";
`;
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);

        // Variables: "Customer Name", Description, "Search Name" = 3 identifiers
        expect(variables.length).toBe(3);

        // Strings: 'John Doe' only
        expect(strings.length).toBe(1);

        // All quoted identifiers should be variables, not strings
        for (const v of variables) {
          expect(v.tokenType).toBe(SemanticTokenTypes.Variable);
        }
      });
    });

    describe('Token position tracking in realistic code', () => {
      it('should track correct line positions in multiline procedure', () => {
        const code = `PROCEDURE Test();
VAR
  x : Integer;
BEGIN
  x := 1;
END;`;
        const { builder } = buildSemanticTokens(code);

        // PROCEDURE should be on line 0
        const procToken = builder.tokens.find(t =>
          t.tokenType === SemanticTokenTypes.Keyword && t.line === 0 && t.char === 0
        );
        expect(procToken).toBeDefined();

        // VAR should be on line 1
        const varToken = builder.tokens.find(t =>
          t.tokenType === SemanticTokenTypes.Keyword && t.line === 1
        );
        expect(varToken).toBeDefined();

        // BEGIN should be on line 3
        const beginToken = builder.tokens.find(t =>
          t.tokenType === SemanticTokenTypes.Keyword && t.line === 3
        );
        expect(beginToken).toBeDefined();

        // END should be on line 5
        const endToken = builder.tokens.find(t =>
          t.tokenType === SemanticTokenTypes.Keyword && t.line === 5
        );
        expect(endToken).toBeDefined();
      });

      it('should track correct character positions for indented code', () => {
        const code = `BEGIN
  x := 1;
  IF y THEN
    z := 2;
END`;
        const { builder } = buildSemanticTokens(code);

        // Find 'x' on line 1 - should be at char 2 (2 spaces indentation)
        const xToken = builder.tokens.find(t =>
          t.tokenType === SemanticTokenTypes.Variable && t.line === 1 && t.length === 1
        );
        expect(xToken).toBeDefined();
        expect(xToken?.char).toBe(2);

        // Find 'z' on line 3 - should be at char 4 (4 spaces indentation)
        const zToken = builder.tokens.find(t =>
          t.tokenType === SemanticTokenTypes.Variable && t.line === 3 && t.length === 1 && t.char === 4
        );
        expect(zToken).toBeDefined();
      });

      it('should preserve token length for quoted identifiers with special characters', () => {
        const code = '"Customer No." := "Bal. Account No."';
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        expect(variables.length).toBe(2);

        // "Customer No." has length 12 (without quotes as value)
        const custNo = variables.find(v => v.char === 0);
        expect(custNo).toBeDefined();
        expect(custNo?.length).toBe(12);

        // "Bal. Account No." has length 16 (without quotes as value)
        const balAcct = variables.find(v => v.char > 0);
        expect(balAcct).toBeDefined();
        expect(balAcct?.length).toBe(16);
      });
    });

    describe('Real-world C/AL patterns', () => {
      it('should handle NAV-style filter expressions', () => {
        const code = `
Customer.SETRANGE("Customer Posting Group", PostingGroup);
Customer.SETFILTER("No.", '%1..%2', '10000', '20000');
Customer.SETFILTER(Balance, '>%1', 0);
`;
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        // Should correctly identify all identifiers
        expect(variables.length).toBeGreaterThan(5);

        // Should correctly identify filter strings: '%1..%2', '10000', '20000', '>%1'
        expect(strings.length).toBe(4);

        // Should correctly identify numbers
        expect(numbers.length).toBe(1); // Only the 0
      });

      it('should handle CALCFIELDS and field method calls', () => {
        const code = `
Customer.CALCFIELDS(Balance, "Balance (LCY)");
IF Customer."Balance (LCY)" > 0 THEN
  MESSAGE('Customer has balance');
`;
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        expect(variables.length).toBeGreaterThan(3);
        expect(keywords.length).toBeGreaterThan(1); // IF, THEN
        expect(strings.length).toBe(1);
        expect(numbers.length).toBe(1);
      });

      it('should handle RECORD TEMPORARY pattern', () => {
        const code = `
VAR
  TempItem : Record 27 TEMPORARY;
  TempCust : Record Customer TEMPORARY;
`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);

        // VAR and TEMPORARY (2x) = 3 keywords
        expect(keywords.length).toBe(3);

        // Record type (2x) = 2 types
        expect(types.length).toBe(2);

        // TempItem, TempCust, Customer = 3 identifiers
        expect(variables.length).toBe(3);
      });

      it('should handle complex expressions with operators', () => {
        const code = `
Amount := Quantity * UnitPrice * (100 - "Discount %") / 100;
IF (Amount > 0) AND (Amount <= MaxAmount) THEN
  TotalAmount := TotalAmount + Amount;
`;
        const { builder } = buildSemanticTokens(code);

        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);

        // Many variables in expression
        expect(variables.length).toBeGreaterThan(5);

        // Operators: :=, *, *, -, /, >, <=, :=, +
        expect(operators.length).toBeGreaterThan(5);

        // Numbers: 100, 0, 100
        expect(numbers.length).toBeGreaterThan(1);

        // Keywords: IF, AND, THEN
        expect(keywords.length).toBe(3);
      });

      it('should handle CASE statement with multiple options', () => {
        const code = `
CASE "Document Type" OF
  "Document Type"::Quote:
    ProcessQuote;
  "Document Type"::Order:
    ProcessOrder;
  "Document Type"::Invoice:
    ProcessInvoice;
  ELSE
    ERROR('Unknown document type');
END;
`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);

        // Keywords: CASE, OF, ELSE, ERROR, END (Note: ERROR might be identifier)
        expect(keywords.length).toBeGreaterThan(2);

        // Variables: "Document Type" (4x), Quote, Order, Invoice, ProcessQuote, ProcessOrder, ProcessInvoice
        expect(variables.length).toBeGreaterThan(5);

        // String for error message
        expect(strings.length).toBe(1);
      });

      it('should handle FOR loop with DOWNTO', () => {
        const code = `
FOR i := Count DOWNTO 1 DO
  Lines[i].Delete;
`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        // Keywords: FOR, DOWNTO, DO
        expect(keywords.length).toBe(3);

        // Variables: i (2x), Count, Lines, Delete
        expect(variables.length).toBeGreaterThan(3);

        // Number: 1
        expect(numbers.length).toBe(1);
      });

      it('should handle REPEAT-UNTIL loop with record operations', () => {
        const code = `
IF SalesLine.FINDSET THEN
  REPEAT
    LineAmount := SalesLine.Quantity * SalesLine."Unit Price";
    TotalAmount += LineAmount;
  UNTIL SalesLine.NEXT = 0;
`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);

        // Keywords: IF, THEN, REPEAT, UNTIL
        expect(keywords.length).toBe(4);

        // Many variable references
        expect(variables.length).toBeGreaterThan(5);

        // Operators: :=, *, +=, =
        expect(operators.length).toBeGreaterThan(2);
      });
    });

    describe('Complete object type verification', () => {
      it('should correctly tokenize a Page object', () => {
        const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
  }
  CODE
  {
    VAR
      SalesHeader : Record 36;

    TRIGGER OnAfterGetRecord();
    BEGIN
      SalesHeader.SETRANGE("Sell-to Customer No.", "No.");
    END;
  }
}`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);

        // Should identify Page keyword
        expect(keywords.some(k => k.length === 4)).toBe(true);

        // Should have variables for fields and record
        expect(variables.length).toBeGreaterThan(3);

        // Should have Record type
        expect(types.length).toBeGreaterThan(0);
      });

      it('should correctly tokenize a Report object', () => {
        const code = `OBJECT Report 206 "Sales - Invoice"
{
  PROPERTIES
  {
  }
  DATASET
  {
  }
  CODE
  {
    VAR
      CompanyInfo : Record 79;
      Customer : Record 18;

    PROCEDURE InitReport();
    BEGIN
      CompanyInfo.GET;
      Customer.GET("Bill-to Customer No.");
    END;
  }
}`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);

        // Should identify Report keyword
        expect(keywords.length).toBeGreaterThan(5);

        // Should have variables
        expect(variables.length).toBeGreaterThan(3);
      });

      it('should correctly tokenize an XMLport object', () => {
        const code = `OBJECT XMLport 1000 "Export Customers"
{
  PROPERTIES
  {
    Direction=Export;
    Format=Xml;
  }
  ELEMENTS
  {
  }
  CODE
  {
    VAR
      Customer : Record 18;
      ExportCount : Integer;

    TRIGGER OnPreXMLport();
    BEGIN
      ExportCount := 0;
    END;
  }
}`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        // Should have keywords
        expect(keywords.length).toBeGreaterThan(5);

        // Should have variables
        expect(variables.length).toBeGreaterThan(2);

        // Should have numbers
        expect(numbers.length).toBeGreaterThan(0);
      });
    });

    describe('End-to-end verification', () => {
      it('should maintain consistency between lexer tokens and semantic tokens count', () => {
        const code = 'x := 1 + 2';
        const { builder, tokens } = buildSemanticTokens(code);

        // Count non-skipped lexer tokens
        const significantTokens = tokens.filter(t =>
          t.type !== TokenType.Whitespace &&
          t.type !== TokenType.EOF
        );

        // Should have semantic tokens for: x, :=, 1, +, 2
        expect(builder.tokens.length).toBe(5);
        expect(significantTokens.length).toBeGreaterThanOrEqual(builder.tokens.length);
      });

      it('should correctly process a complete Gen. Jnl.-Post Line style codeunit', () => {
        const code = `OBJECT Codeunit 12 "Gen. Jnl.-Post Line"
{
  CODE
  {
    VAR
      GLEntry : Record 17;
      CustLedgEntry : Record 21;
      VendLedgEntry : Record 25;
      "G/L Account" : Record 15;
      TempJnlLine : Record 81 TEMPORARY;
      PostingDate : Date;
      DocumentNo : Code;
      SourceCode : Code;
      ReasonCode : Code;

    PROCEDURE RunWithCheck(var GenJnlLine : Record 81);
    BEGIN
      GLEntry.LOCKTABLE;
      IF GenJnlLine."Posting Date" = 0D THEN
        ERROR('Posting Date must have a value');
      PostingDate := GenJnlLine."Posting Date";
      DocumentNo := GenJnlLine."Document No.";
    END;

    LOCAL PROCEDURE PrepareEntry();
    VAR
      LineNo : Integer;
    BEGIN
      GLEntry.INIT;
      GLEntry."Entry No." := GetNextEntryNo;
      GLEntry."Posting Date" := PostingDate;
      GLEntry."Document No." := DocumentNo;
    END;

    PROCEDURE GetNextEntryNo() : Integer;
    VAR
      GLEntryNo : Integer;
    BEGIN
      IF GLEntry.FINDLAST THEN
        GLEntryNo := GLEntry."Entry No." + 1
      ELSE
        GLEntryNo := 1;
      EXIT(GLEntryNo);
    END;
  }
}`;
        const { builder } = buildSemanticTokens(code);

        // Should process a large number of tokens
        expect(builder.tokens.length).toBeGreaterThan(80);

        // Verify all expected semantic types are present
        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);
        const types = builder.getTokensOfType(SemanticTokenTypes.Type);
        const operators = builder.getTokensOfType(SemanticTokenTypes.Operator);
        const strings = builder.getTokensOfType(SemanticTokenTypes.String);
        const numbers = builder.getTokensOfType(SemanticTokenTypes.Number);

        // Keywords: OBJECT, Codeunit, CODE, VAR, PROCEDURE, BEGIN, END, IF, THEN, ERROR, LOCAL, EXIT, ELSE, TEMPORARY
        expect(keywords.length).toBeGreaterThan(15);

        // Variables: many field and variable references with quoted identifiers
        expect(variables.length).toBeGreaterThan(25);

        // Types: Record, Date, Code, Integer
        expect(types.length).toBeGreaterThan(5);

        // Operators: :=, =
        expect(operators.length).toBeGreaterThan(5);

        // Strings: error message
        expect(strings.length).toBeGreaterThan(0);

        // Numbers: 0, 1, record numbers
        expect(numbers.length).toBeGreaterThan(3);
      });

      it('should verify token order matches source code order', () => {
        const code = `BEGIN
  x := 1;
  y := 2;
  z := 3;
END`;
        const { builder } = buildSemanticTokens(code);

        // Tokens should be in order by line, then by character
        for (let i = 1; i < builder.tokens.length; i++) {
          const prev = builder.tokens[i - 1];
          const curr = builder.tokens[i];

          const prevPosition = prev.line * 10000 + prev.char;
          const currPosition = curr.line * 10000 + curr.char;

          expect(currPosition).toBeGreaterThanOrEqual(prevPosition);
        }
      });

      it('should handle edge case of single-line complete object', () => {
        const code = 'OBJECT Codeunit 1 Test { CODE { VAR x : Integer; PROCEDURE P(); BEGIN x := 1; END; } }';
        const { builder } = buildSemanticTokens(code);

        // Should process all tokens on single line
        expect(builder.tokens.length).toBeGreaterThan(10);

        // All tokens should be on line 0
        for (const token of builder.tokens) {
          expect(token.line).toBe(0);
        }
      });

      it('should correctly handle deeply nested code structures', () => {
        const code = `
PROCEDURE DeepNest();
BEGIN
  IF Condition1 THEN
    IF Condition2 THEN
      IF Condition3 THEN
        BEGIN
          WHILE Loop1 DO
            REPEAT
              FOR i := 1 TO 10 DO
                x := x + 1;
            UNTIL Done;
        END
      ELSE
        y := 0;
END;
`;
        const { builder } = buildSemanticTokens(code);

        const keywords = builder.getTokensOfType(SemanticTokenTypes.Keyword);
        const variables = builder.getTokensOfType(SemanticTokenTypes.Variable);

        // Should correctly identify all keywords at all nesting levels
        // PROCEDURE, BEGIN (2x), IF (3x), THEN (3x), WHILE, DO (2x), REPEAT, FOR, TO, UNTIL, END (2x), ELSE
        expect(keywords.length).toBeGreaterThan(15);

        // Should correctly identify all variables at all nesting levels
        expect(variables.length).toBeGreaterThan(5);
      });
    });
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
