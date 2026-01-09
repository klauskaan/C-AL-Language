/**
 * Lexer Tests - Date/Time Literals
 *
 * Tests C/AL date, time, and datetime literal tokenization:
 * - Date literals (MMDDYY[YY]D format)
 * - Time literals (HHMMSS[ms]T format)
 * - DateTime literals (combination)
 * - Edge cases and validation
 *
 * Date format: MMDDYY or MMDDYYYY + D
 * Time format: HHMMSS or HHMMSSms + T
 * DateTime format: date digits + D + time digits + T
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Date/Time/DateTime Literals', () => {
  describe('Date literals (MMDDYY[YY]D)', () => {
    it('should tokenize 6-digit date literal (MMDDYY)', () => {
      const code = '060120D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // Date literal + EOF
      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('060120D');
    });

    it('should tokenize 8-digit date literal (MMDDYYYY)', () => {
      const code = '06012020D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('06012020D');
    });

    it('should tokenize undefined date (0D)', () => {
      const code = '0D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('0D');
    });

    it('should tokenize date literal in assignment', () => {
      const code = 'MyDate := 123125D;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // MyDate, :=, date, ;, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Date);
      expect(tokens[2].value).toBe('123125D');
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize date literal at year boundary', () => {
      const code = '12312023D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('12312023D');
    });

    it('should NOT tokenize 5-digit number + D as date', () => {
      const code = '12345D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should be: integer + identifier
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('12345');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('D');
    });

    it('should NOT tokenize 7-digit number + D as date', () => {
      const code = '1234567D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should be: integer + identifier (invalid date format)
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('1234567');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('D');
    });

    it('should handle multiple date literals', () => {
      const code = '010125D 063020D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('010125D');
      expect(tokens[1].type).toBe(TokenType.Date);
      expect(tokens[1].value).toBe('063020D');
    });
  });

  describe('Time literals (HHMMSS[ms]T)', () => {
    it('should tokenize 6-digit time literal (HHMMSS)', () => {
      const code = '120000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // Time literal + EOF
      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('120000T');
    });

    it('should tokenize time literal with milliseconds', () => {
      const code = '120000000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('120000000T');
    });

    it('should tokenize time literal in assignment', () => {
      const code = 'MyTime := 235959T;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // MyTime, :=, time, ;, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Time);
      expect(tokens[2].value).toBe('235959T');
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize midnight time', () => {
      const code = '000000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('000000T');
    });

    it('should tokenize undefined time (0T)', () => {
      const code = '0T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // Time literal + EOF
      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('0T');
    });

    it('should tokenize 0T in IF statement', () => {
      const code = 'IF "Starting Time" <> 0T THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // IF, quoted identifier, <>, 0T, THEN, EOF
      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Starting Time');
      expect(tokens[2].type).toBe(TokenType.NotEqual);
      expect(tokens[3].type).toBe(TokenType.Time);
      expect(tokens[3].value).toBe('0T');
      expect(tokens[4].type).toBe(TokenType.Then);
    });

    it('should NOT tokenize 5-digit number + T as time', () => {
      const code = '12345T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should be: integer + identifier (too short for time)
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('12345');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('T');
    });

    it('should handle multiple time literals', () => {
      const code = '000000T 120000T 235959T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('000000T');
      expect(tokens[1].type).toBe(TokenType.Time);
      expect(tokens[1].value).toBe('120000T');
      expect(tokens[2].type).toBe(TokenType.Time);
      expect(tokens[2].value).toBe('235959T');
    });
  });

  describe('DateTime literals (MMDDYY[YY]DHHMMSS[ms]T)', () => {
    it('should tokenize datetime literal', () => {
      const code = '060120D120000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // DateTime literal + EOF
      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('060120D120000T');
    });

    it('should tokenize datetime literal with 8-digit date', () => {
      const code = '06012020D235959T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('06012020D235959T');
    });

    it('should tokenize datetime literal in assignment', () => {
      const code = 'MyDateTime := 123125D120000T;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // MyDateTime, :=, datetime, ;, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.DateTime);
      expect(tokens[2].value).toBe('123125D120000T');
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize datetime literal with milliseconds', () => {
      const code = '060120D120000999T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('060120D120000999T');
    });

    it('should handle datetime at midnight', () => {
      const code = '060120D000000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('060120D000000T');
    });

    it('should tokenize undefined datetime literal (0DT)', () => {
      const code = '0DT';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // DateTime literal + EOF
      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('0DT');
    });

    it('should tokenize undefined datetime in comparison', () => {
      const code = 'IF MyDateTime = 0DT THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // IF, MyDateTime, =, 0DT, THEN, EOF
      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[2].type).toBe(TokenType.Equal);
      expect(tokens[3].type).toBe(TokenType.DateTime);
      expect(tokens[3].value).toBe('0DT');
      expect(tokens[4].type).toBe(TokenType.Then);
    });

    it('should not consume digits after 0DT', () => {
      const code = '0DT123';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // 0DT, 123, EOF
      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('0DT');
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[1].value).toBe('123');
    });
  });

  describe('Edge cases and validation', () => {
    it('should distinguish date literal from identifier starting with D', () => {
      const code = '060120D + Database';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('060120D');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Database');
    });

    it('should distinguish time literal from identifier starting with T', () => {
      const code = '120000T + Total';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('120000T');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Total');
    });

    it('should handle date literal in function call', () => {
      const code = 'SETRANGE(Date, 010125D, 123125D);';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // SETRANGE, (, Date, ,, date1, ,, date2, ), ;, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('SETRANGE');
      expect(tokens[4].type).toBe(TokenType.Date);
      expect(tokens[4].value).toBe('010125D');
      expect(tokens[6].type).toBe(TokenType.Date);
      expect(tokens[6].value).toBe('123125D');
    });

    it('should handle time literal in comparison', () => {
      const code = 'IF CurrentTime > 120000T THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('CurrentTime');
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Time);
      expect(tokens[3].value).toBe('120000T');
      expect(tokens[4].type).toBe(TokenType.Then);
    });

    it('should handle mixed date and time literals', () => {
      const code = 'StartDate := 010125D; EndTime := 235959T;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // StartDate, :=, 010125D, ;, EndTime, :=, 235959T, ;, EOF
      expect(tokens[2].type).toBe(TokenType.Date);
      expect(tokens[2].value).toBe('010125D');
      expect(tokens[6].type).toBe(TokenType.Time);
      expect(tokens[6].value).toBe('235959T');
    });

    it('should NOT tokenize decimal + D as date', () => {
      const code = '123.45D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should be: decimal + identifier
      expect(tokens[0].type).toBe(TokenType.Decimal);
      expect(tokens[0].value).toBe('123.45');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('D');
    });

    it('should handle lowercase d and t as identifiers, not literals', () => {
      const code = '060120d 120000t';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // C/AL literals use uppercase D and T
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('d');
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.Identifier);
      expect(tokens[3].value).toBe('t');
    });

    it('should handle date/time literals with comments', () => {
      const code = '// New Year\n010125D // Date comment\n120000T // Time comment';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('010125D');
      expect(tokens[1].type).toBe(TokenType.Time);
      expect(tokens[1].value).toBe('120000T');
    });

    it('should tokenize date literals in real C/AL code', () => {
      const code = `PROCEDURE CheckDate();
VAR
  StartDate : Date;
BEGIN
  StartDate := 010125D;
  IF StartDate > 123125D THEN
    ERROR('Invalid date');
END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const dateTokens = tokens.filter(t => t.type === TokenType.Date);
      expect(dateTokens).toHaveLength(2);
      expect(dateTokens[0].value).toBe('010125D');
      expect(dateTokens[1].value).toBe('123125D');
    });
  });
});
