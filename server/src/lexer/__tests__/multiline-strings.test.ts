/**
 * Lexer Tests - Multi-line String Literals
 *
 * Tests multi-line string support for C/AL TextConst declarations.
 * Real NAV export files contain TextConst with multi-line string literals
 * spanning 2-3 lines, which are valid in C/AL.
 *
 * EXPECTED BEHAVIOR: These tests MUST FAIL initially to validate TDD approach.
 * The current lexer treats newlines as string terminators, producing UNKNOWN tokens
 * instead of STRING tokens for multi-line strings.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Multi-line String Literals', () => {
  describe('Basic multi-line strings', () => {
    it('should tokenize multi-line string with LF separator', () => {
      const code = "'Line 1\nLine 2'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // string + EOF
      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Line 1\nLine 2');
    });

    it('should tokenize multi-line string with CRLF separator', () => {
      const code = "'Line 1\r\nLine 2'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // string + EOF
      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Line 1\r\nLine 2');
    });

    it('should tokenize multi-line string spanning 3+ lines', () => {
      const code = "'Line 1\nLine 2\nLine 3'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // string + EOF
      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should tokenize multi-line string with blank lines', () => {
      const code = "'Line 1\n\nLine 3'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // string + EOF
      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Line 1\n\nLine 3');
    });
  });

  describe('Line number tracking', () => {
    it('should track line numbers correctly after multi-line string', () => {
      const code = "'Line 1\nLine 2'\nVAR";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // String token should start on line 1
      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].line).toBe(1);

      // VAR keyword should be on line 3 (after 2-line string)
      expect(tokens[1].type).toBe(TokenType.Var);
      expect(tokens[1].line).toBe(3);
    });

    it('should track line numbers correctly with 3-line string', () => {
      const code = "'Line 1\nLine 2\nLine 3'\nBEGIN";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].line).toBe(1);

      // BEGIN keyword should be on line 4 (after 3-line string)
      expect(tokens[1].type).toBe(TokenType.Begin);
      expect(tokens[1].line).toBe(4);
    });
  });

  describe('Escaped quotes in multi-line strings', () => {
    it('should handle escaped quotes at line boundary', () => {
      const code = "'It''s a test\nacross lines'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("It's a test\nacross lines");
    });

    it('should handle escaped quotes on both sides of newline', () => {
      const code = "'Line 1''\nLine 2''continues'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("Line 1'\nLine 2'continues");
    });
  });

  describe('TextConst declaration patterns', () => {
    it('should handle realistic TextConst multi-line pattern', () => {
      // Pattern from real NAV export (PAG1001.TXT, PAG1002.TXT)
      const code = "Text0001@1160030000 : TextConst 'DAN=First line.\n\nSecond line after blank.;ENU=English text';";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Text0001@1160030000
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Text0001');
      expect(tokens[1].type).toBe(TokenType.Unknown); // @ symbol
      expect(tokens[2].type).toBe(TokenType.Integer);

      // :
      expect(tokens[3].type).toBe(TokenType.Colon);

      // TextConst
      expect(tokens[4].type).toBe(TokenType.TextConst);
      expect(tokens[4].value).toBe('TextConst');

      // Multi-line string literal
      expect(tokens[5].type).toBe(TokenType.String);
      expect(tokens[5].value).toBe('DAN=First line.\n\nSecond line after blank.;ENU=English text');

      // ;
      expect(tokens[6].type).toBe(TokenType.Semicolon);
    });

    it('should handle complete VAR section with multi-line TextConst', () => {
      const code = `VAR
  Text0001@1160030000 : TextConst 'DAN=First line text.

Continuation line.;ENU=English version';`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // VAR keyword
      expect(tokens[0].type).toBe(TokenType.Var);

      // Variable declaration
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('Text0001');

      // Multi-line string
      const stringToken = tokens.find(t => t.type === TokenType.String);
      expect(stringToken).toBeDefined();
      expect(stringToken!.value).toContain('DAN=First line text.\n\nContinuation line.;ENU=English version');
    });
  });

  describe('Edge case: truly unclosed strings', () => {
    it('should still produce UNKNOWN for string reaching EOF without close quote', () => {
      const code = "'Unclosed string\nspanning lines";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should produce UNKNOWN since there's no closing quote at all
      expect(tokens[0].type).toBe(TokenType.Unknown);
      // Value should include content up to EOF
      expect(tokens[0].value).toContain('Unclosed string');
    });

    it('should distinguish unclosed from properly closed multi-line', () => {
      const codeClosed = "'Multi\nLine'";
      const codeUnclosed = "'Multi\nLine";

      const lexerClosed = new Lexer(codeClosed);
      const tokensClosed = lexerClosed.tokenize();
      expect(tokensClosed[0].type).toBe(TokenType.String);

      const lexerUnclosed = new Lexer(codeUnclosed);
      const tokensUnclosed = lexerUnclosed.tokenize();
      expect(tokensUnclosed[0].type).toBe(TokenType.Unknown);
    });
  });

  describe('Position tracking for multi-line strings', () => {
    it('should track start and end offsets correctly', () => {
      const code = "'Line 1\nLine 2'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(code.length);
    });

    it('should track column position correctly after multi-line string', () => {
      const code = "'Multi\nLine' VAR";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // String token starts at column 1
      expect(tokens[0].column).toBe(1);

      // VAR should be on line 2, column 7 (after "Line' ")
      expect(tokens[1].line).toBe(2);
      expect(tokens[1].column).toBe(7);
    });
  });

  describe('Multiple multi-line strings in sequence', () => {
    it('should handle consecutive multi-line strings', () => {
      const code = "'First\nString' 'Second\nString'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('First\nString');

      expect(tokens[1].type).toBe(TokenType.String);
      expect(tokens[1].value).toBe('Second\nString');
    });

    it('should handle multi-line strings in expression', () => {
      const code = "MESSAGE('Line 1\nLine 2' + 'Line 3\nLine 4');";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // MESSAGE
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MESSAGE');

      // (
      expect(tokens[1].type).toBe(TokenType.LeftParen);

      // 'Line 1\nLine 2'
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Line 1\nLine 2');

      // +
      expect(tokens[3].type).toBe(TokenType.Plus);

      // 'Line 3\nLine 4'
      expect(tokens[4].type).toBe(TokenType.String);
      expect(tokens[4].value).toBe('Line 3\nLine 4');
    });
  });
});
