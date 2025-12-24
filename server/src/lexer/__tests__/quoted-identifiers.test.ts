/**
 * Lexer Tests - Quoted Identifiers
 *
 * Tests the critical C/AL distinction between:
 * - Double-quoted identifiers: "Line No." (field names with spaces)
 * - Single-quoted strings: 'Customer Name' (string literals)
 *
 * This distinction is fundamental to C/AL and one of the main reasons
 * for implementing a custom language server.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Quoted Identifiers', () => {
  describe('Double-quoted identifiers', () => {
    it('should tokenize a simple quoted identifier', () => {
      const code = '"Line No."';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // identifier + EOF
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Line No.');
    });

    it('should tokenize quoted identifiers with special characters', () => {
      const code = '"End-Point"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('End-Point');
    });

    it('should tokenize multiple quoted identifiers', () => {
      const code = '"First Name" "Last Name" "Address Line 1"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('First Name');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Last Name');
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Address Line 1');
    });

    it('should handle quoted identifiers with numbers', () => {
      const code = '"Sales Line 2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Sales Line 2');
    });

    it('should handle empty quoted identifiers gracefully', () => {
      const code = '""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('');
    });
  });

  describe('Single-quoted strings', () => {
    it('should tokenize a simple string literal', () => {
      const code = "'Customer Name'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // string + EOF
      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Customer Name');
    });

    it('should tokenize strings with special characters', () => {
      const code = "'Hello, World!'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Hello, World!');
    });

    it('should handle escaped quotes in strings', () => {
      const code = "'It''s a test'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("It's a test");
    });

    it('should handle empty strings', () => {
      const code = "''";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('');
    });

    it('should tokenize multiple string literals', () => {
      const code = "'First' 'Second' 'Third'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('First');
      expect(tokens[1].type).toBe(TokenType.String);
      expect(tokens[1].value).toBe('Second');
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Third');
    });
  });

  describe('Quoted identifiers vs strings distinction', () => {
    it('should distinguish quoted identifiers from strings in assignment', () => {
      const code = '"Line No." := \'Customer Name\';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // "Line No." := 'Customer Name' ;
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Line No.');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Customer Name');
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should handle mixed identifiers and strings in expressions', () => {
      const code = '"Field Name" = \'Value\' + "Other Field"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field Name');
      expect(tokens[1].type).toBe(TokenType.Equal);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Value');
      expect(tokens[3].type).toBe(TokenType.Plus);
      expect(tokens[4].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[4].value).toBe('Other Field');
    });

    it('should handle quoted identifiers in CALCFIELDS statement', () => {
      const code = 'CALCFIELDS("End-Point");';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // CALCFIELDS ( "End-Point" ) ;
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('CALCFIELDS');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('End-Point');
      expect(tokens[3].type).toBe(TokenType.RightParen);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    it('should handle strings in MESSAGE statement', () => {
      const code = "MESSAGE('Hello World');";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // MESSAGE ( 'Hello World' ) ;
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MESSAGE');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Hello World');
      expect(tokens[3].type).toBe(TokenType.RightParen);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle unclosed quoted identifier gracefully', () => {
      const code = '"Unclosed Identifier';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as Unknown (error token) for unclosed identifier
      expect(tokens[0].type).toBe(TokenType.Unknown);
      expect(tokens[0].value).toBe('Unclosed Identifier');
    });

    it('should handle unclosed string gracefully', () => {
      const code = "'Unclosed String";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as Unknown (error token) for unclosed string
      expect(tokens[0].type).toBe(TokenType.Unknown);
      expect(tokens[0].value).toBe('Unclosed String');
    });

    it('should not allow quoted identifiers to span multiple lines', () => {
      const code = '"Multi\nLine"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should stop at newline and emit Unknown (error token)
      expect(tokens[0].type).toBe(TokenType.Unknown);
      expect(tokens[0].value).toBe('Multi');
    });

    it('should not allow strings to span multiple lines', () => {
      const code = "'Multi\nLine'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should stop at newline and emit Unknown (error token)
      expect(tokens[0].type).toBe(TokenType.Unknown);
      expect(tokens[0].value).toBe('Multi');
    });

    it('should handle adjacent quotes correctly', () => {
      const code = '"Field1""Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field2');
    });

    it('should handle complex C/AL field expression', () => {
      const code = 'IF "Balance" > 0 THEN "Status" := \'Active\';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // IF "Balance" > 0 THEN "Status" := 'Active' ;
      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Balance');
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.Then);
      expect(tokens[5].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[5].value).toBe('Status');
      expect(tokens[6].type).toBe(TokenType.Assign);
      expect(tokens[7].type).toBe(TokenType.String);
      expect(tokens[7].value).toBe('Active');
    });
  });

  describe('Position tracking', () => {
    it('should track line and column for quoted identifiers', () => {
      const code = '"Test"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);
      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(6);
    });

    it('should track line and column for strings', () => {
      const code = "'Test'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);
      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(6);
    });

    it('should track positions correctly in multi-token expressions', () => {
      const code = '"A" := \'B\'';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(3);
      expect(tokens[1].startOffset).toBe(4);
      expect(tokens[1].endOffset).toBe(6);
      expect(tokens[2].startOffset).toBe(7);
      expect(tokens[2].endOffset).toBe(10);
    });
  });
});
