/**
 * Lexer Tests - Comments and Operators
 *
 * Tests C/AL comment tokenization and operator recognition:
 * - Line comments (double slash)
 * - Block comments (curly braces)
 * - C-style comments (slash-star) - NOT YET IMPLEMENTED
 * - Scope operator (double colon)
 * - Compound assignment operators (plus-equals, etc.) - NOT YET IMPLEMENTED
 * - Operator edge cases and combinations
 * - Comment-operator interactions
 *
 * IMPORTANT: C/AL curly braces are context-dependent:
 * - In FIELDS/KEYS/CONTROLS/FIELDGROUPS sections: structural delimiters
 * - In CODE sections (BEGIN...END blocks): comments
 * The lexer NOW has context awareness and correctly handles both uses.
 * These tests focus on comments in CODE blocks (BEGIN...END).
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Comments and Operators', () => {
  describe('Line comments (//)', () => {
    it('should skip basic single-line comment', () => {
      const code = '// This is a comment';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Comments are skipped, not tokenized
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle comment at end of line with code', () => {
      const code = 'x := 5; // Set x to 5';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: identifier, :=, integer, semicolon, EOF
      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.Semicolon);
      expect(tokens[4].type).toBe(TokenType.EOF);
    });

    it('should handle multiple consecutive line comments', () => {
      const code = `// Comment 1
// Comment 2
// Comment 3`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle empty line comment', () => {
      const code = '//';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle comment with special characters', () => {
      const code = '// TODO: Fix this! @bug #123 $$$';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle comment with C/AL code-like content', () => {
      const code = '// IF x > 0 THEN MESSAGE(\'Test\');';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle line comment with operators', () => {
      const code = 'a + b // := <> <= >= ::';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: identifier, plus, identifier, EOF
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[3].type).toBe(TokenType.EOF);
    });
  });

  describe('Block comments ({ }) in CODE blocks', () => {
    it('should skip single-line block comment in CODE block', () => {
      const code = 'BEGIN { This is a block comment } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should skip multi-line block comment in CODE block', () => {
      const code = `BEGIN
{
  This is a multi-line
  block comment
  spanning several lines
}
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF
      expect(tokens[0].type).toBe(TokenType.Begin);
    });

    it('should skip empty block comment in CODE block', () => {
      const code = 'BEGIN {} END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF
    });

    it('should handle block comment with nested text but no nested braces', () => {
      const code = 'BEGIN { Comment with text and symbols: @ $ % ^ & } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF
    });

    it('should handle block comment at end of file', () => {
      const code = 'BEGIN END. { Documentation trigger }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: BEGIN, END, DOT, {, }, EOF - wait, after END the context is popped
      // But { } after END. are outside CODE_BLOCK context, so they're structural
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
      expect(tokens[2].type).toBe(TokenType.Dot);
    });

    it('should handle unclosed block comment gracefully in CODE block', () => {
      const code = 'BEGIN { Unclosed comment END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should reach EOF without crashing
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should handle multiple block comments in sequence in CODE block', () => {
      const code = 'BEGIN { First } { Second } { Third } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF
    });

    it('should handle block comment between statements in CODE block', () => {
      const code = 'BEGIN x := 5; { Comment } y := 10; END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: BEGIN, x, :=, 5, ;, y, :=, 10, ;, END, EOF
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('x');
      expect(tokens[5].value).toBe('y');
      expect(tokens[9].type).toBe(TokenType.End);
    });

    it('should handle block comment with C/AL keywords in CODE block', () => {
      const code = 'BEGIN { IF THEN ELSE BEGIN END PROCEDURE } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF
    });

    it('should track line numbers correctly through multi-line block comments', () => {
      const code = `BEGIN
x := 1;
{
  Multi-line comment
  Line 4
  Line 5
}
y := 2;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the 'y' identifier token
      const yToken = tokens.find(t => t.value === 'y');
      expect(yToken).toBeDefined();
      expect(yToken!.line).toBe(8); // Should be on line 8
    });
  });

  describe('C-style comments (/* */)', () => {
    // C-style comments /* */ are a NAV 2013+ feature
    // - Similar to { } comments but use /* */ delimiters
    // - Do not nest
    // - Span multiple lines
    // - Available since NAV 2013

    it('should skip basic C-style comment', () => {
      const code = '/* This is a C-style comment */';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should skip C-style single-line comment with code after', () => {
      const code = '/* comment */ x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[2].value).toBe('5');
    });

    it('should skip C-style multi-line comment', () => {
      const code = `/* Comment
        spanning multiple
        lines */`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle unclosed C-style comment gracefully', () => {
      const code = '/* Unclosed comment';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle empty C-style comment', () => {
      const code = '/**/';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle C-style comment with asterisks inside', () => {
      const code = '/* *** Special comment *** */';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle C-style comment between statements', () => {
      const code = 'x := 5; /* Comment */ y := 10;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // x, :=, 5, ;, y, :=, 10, ;, EOF
      expect(tokens[0].value).toBe('x');
      expect(tokens[4].value).toBe('y');
      expect(tokens[6].value).toBe('10');
    });

    it('should handle multiple consecutive C-style comments', () => {
      const code = '/* First */ /* Second */ /* Third */';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should track line numbers correctly through multi-line C-style comments', () => {
      const code = `x := 1;
/* Multi-line comment
   Line 3
   Line 4
   Line 5 */
y := 2;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the 'y' identifier token
      const yToken = tokens.find(t => t.value === 'y');
      expect(yToken).toBeDefined();
      expect(yToken!.line).toBe(6); // Should be on line 6
    });

    it('should handle C-style comment with C/AL keywords inside', () => {
      const code = '/* IF THEN ELSE BEGIN END */ x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should only have: x, :=, 5, ;, EOF
      expect(tokens).toHaveLength(5);
      expect(tokens[0].value).toBe('x');
    });

    it('should handle C-style comment with special characters', () => {
      const code = '/* TODO: @bug #123 $$$ !!! */ x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
    });

    it('should handle C-style comment containing block comment delimiters', () => {
      const code = '/* This has { braces } inside */ x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
    });

    it('should handle C-style comment containing line comment markers', () => {
      const code = '/* This has // inside */ x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
    });

    it('should handle C-style comment at end of file', () => {
      const code = 'x := 5; /* Final comment */';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // x, :=, 5, ;, EOF
      expect(tokens).toHaveLength(5);
      expect(tokens[3].type).toBe(TokenType.Semicolon);
      expect(tokens[4].type).toBe(TokenType.EOF);
    });

    it('should handle C-style comment with almost-closing sequence', () => {
      const code = '/* Comment with * but not closing */ x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
    });

    it('should work with C-style comments in real C/AL code', () => {
      const code = `PROCEDURE Calculate();
/*
   Calculate total amount
   NAV 2013+
*/
BEGIN
  Total := Amount + Tax;
END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Procedure);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('Calculate');
      // Comment should be skipped
      const beginToken = tokens.find(t => t.type === TokenType.Begin);
      expect(beginToken).toBeDefined();
    });
  });

  describe('Scope operator (::) - Edge Cases', () => {
    it('should tokenize object reference syntax', () => {
      const code = 'REPORT::"125"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Report);
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('125');
    });

    it('should tokenize DATABASE object reference', () => {
      const code = 'DATABASE::"18"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // DATABASE is not a reserved keyword in the lexer currently
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('DATABASE');
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('18');
    });

    it('should tokenize option with quoted identifier', () => {
      const code = '"Account Type"::"Begin-Total"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Account Type');
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Begin-Total');
    });

    it('should handle multiple scope operators in expression', () => {
      const code = 'Type1::Value1 AND Type2::Value2';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[3].type).toBe(TokenType.And);
      expect(tokens[4].type).toBe(TokenType.Identifier);
      expect(tokens[5].type).toBe(TokenType.DoubleColon);
      expect(tokens[6].type).toBe(TokenType.Identifier);
    });

    it('should handle scope operator at end of input', () => {
      const code = 'Status::';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should distinguish scope operator from consecutive colons', () => {
      const code = 'a : : b';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // With spaces, should tokenize as separate colons
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Colon);
      expect(tokens[2].type).toBe(TokenType.Colon);
      expect(tokens[3].type).toBe(TokenType.Identifier);
    });

    it('should handle scope operator in CASE statement', () => {
      const code = 'CASE Status OF Status::Open:';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Case);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[2].type).toBe(TokenType.Of);
      expect(tokens[3].type).toBe(TokenType.Identifier);
      expect(tokens[4].type).toBe(TokenType.DoubleColon);
      expect(tokens[5].type).toBe(TokenType.Identifier);
      expect(tokens[6].type).toBe(TokenType.Colon);
    });
  });

  describe('Compound assignment operators (NAV 2018)', () => {
    // Compound assignment operators (+=, -=, *=, /=) are documented
    // in cal.md as C/AL compatible and confirmed in real NAV 2018 code
    // (Microsoft cal-open-library COD9.TXT lines 70, 610, 721)

    it('should tokenize += operator', () => {
      const code = 'x += 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.PlusAssign);
      expect(tokens[1].value).toBe('+=');
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize -= operator', () => {
      const code = 'j -= 1;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.MinusAssign);
      expect(tokens[1].value).toBe('-=');
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should tokenize *= operator', () => {
      const code = 'count *= 2;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.MultiplyAssign);
      expect(tokens[1].value).toBe('*=');
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should tokenize /= operator', () => {
      const code = 'value /= 10;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.DivideAssign);
      expect(tokens[1].value).toBe('/=');
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should handle real-world usage from NAV 2018', () => {
      // Example from Microsoft cal-open-library COD9.TXT line 70
      const code = '"No." += 1;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].type).toBe(TokenType.PlusAssign);
      expect(tokens[1].value).toBe('+=');
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should tokenize all compound assignment operators together', () => {
      const code = 'a += 1; b -= 2; c *= 3; d /= 4;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // a, +=, 1, ;, b, -=, 2, ;, c, *=, 3, ;, d, /=, 4, ;, EOF
      expect(tokens[1].type).toBe(TokenType.PlusAssign);
      expect(tokens[1].value).toBe('+=');
      expect(tokens[5].type).toBe(TokenType.MinusAssign);
      expect(tokens[5].value).toBe('-=');
      expect(tokens[9].type).toBe(TokenType.MultiplyAssign);
      expect(tokens[9].value).toBe('*=');
      expect(tokens[13].type).toBe(TokenType.DivideAssign);
      expect(tokens[13].value).toBe('/=');
    });

    it('should distinguish += from + followed by =', () => {
      const code = 'x += 5; y := x + = z;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // x, +=, 5, ;, y, :=, x, +, =, z, ;, EOF
      expect(tokens[1].type).toBe(TokenType.PlusAssign); // +=
      expect(tokens[7].type).toBe(TokenType.Plus);       // +
      expect(tokens[8].type).toBe(TokenType.Equal);      // =
    });

    it('should handle compound operators without spaces', () => {
      const code = 'x+=5;y-=2;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.PlusAssign);
      expect(tokens[5].type).toBe(TokenType.MinusAssign);
    });

    it('should handle compound operators in expressions', () => {
      const code = 'BEGIN x += y * 2; END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[2].type).toBe(TokenType.PlusAssign);
      expect(tokens[4].type).toBe(TokenType.Multiply);
    });

    it('should handle compound operators with decimal numbers', () => {
      const code = 'total += 3.14;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.PlusAssign);
      expect(tokens[2].type).toBe(TokenType.Decimal);
      expect(tokens[2].value).toBe('3.14');
    });
  });

  describe('Operator edge cases', () => {
    it('should tokenize operators without spaces', () => {
      const code = '1+2*3/4-5';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.Multiply);
      expect(tokens[4].type).toBe(TokenType.Integer);
      expect(tokens[5].type).toBe(TokenType.Divide);
      expect(tokens[6].type).toBe(TokenType.Integer);
      expect(tokens[7].type).toBe(TokenType.Minus);
      expect(tokens[8].type).toBe(TokenType.Integer);
    });

    it('should handle comparison operator <= correctly', () => {
      const code = 'x <= 10';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.LessEqual);
      expect(tokens[1].value).toBe('<=');
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should distinguish < from <=', () => {
      const code = 'a < b <= c';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.Less);
      expect(tokens[1].value).toBe('<');
      expect(tokens[3].type).toBe(TokenType.LessEqual);
      expect(tokens[3].value).toBe('<=');
    });

    it('should distinguish > from >=', () => {
      const code = 'a > b >= c';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.Greater);
      expect(tokens[1].value).toBe('>');
      expect(tokens[3].type).toBe(TokenType.GreaterEqual);
      expect(tokens[3].value).toBe('>=');
    });

    it('should distinguish <> from < and >', () => {
      const code = 'a <> b';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.NotEqual);
      expect(tokens[1].value).toBe('<>');
    });

    it('should handle := assignment operator', () => {
      const code = 'x := y';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[1].value).toBe(':=');
    });

    it('should distinguish : from :=', () => {
      const code = 'CASE x OF 1: y := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[4].type).toBe(TokenType.Colon);
      expect(tokens[4].value).toBe(':');
      expect(tokens[6].type).toBe(TokenType.Assign);
      expect(tokens[6].value).toBe(':=');
    });

    it('should handle . and .. correctly', () => {
      const code = 'Customer."Balance" 1..10';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Customer, ., "Balance", 1, .., 10, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Dot);
      expect(tokens[1].value).toBe('.');
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.DotDot);
      expect(tokens[4].value).toBe('..');
    });

    it('should handle range operator in filter', () => {
      const code = 'SETRANGE(Amount, 100..500)';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // SETRANGE, (, Amount, ,, 100, .., 500, ), EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('SETRANGE');
      expect(tokens[5].type).toBe(TokenType.DotDot);
      expect(tokens[5].value).toBe('..');
    });

    it('should tokenize complex operator combinations', () => {
      const code = 'x := (a + b) * c <> d AND e <= f OR g >= h;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.Assign);      // :=
      expect(tokens[4].type).toBe(TokenType.Plus);        // +
      expect(tokens[7].type).toBe(TokenType.Multiply);    // *
      expect(tokens[9].type).toBe(TokenType.NotEqual);    // <>
      expect(tokens[11].type).toBe(TokenType.And);        // AND
      expect(tokens[13].type).toBe(TokenType.LessEqual);  // <=
      expect(tokens[15].type).toBe(TokenType.Or);         // OR
      expect(tokens[17].type).toBe(TokenType.GreaterEqual); // >=
    });

    it('should handle decimal numbers vs range operator', () => {
      const code = '3.14 1..10';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Decimal);
      expect(tokens[0].value).toBe('3.14');
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[2].type).toBe(TokenType.DotDot);
    });
  });

  describe('Comment-operator interactions', () => {
    it('should handle operator before line comment', () => {
      const code = 'x := 5 + // comment\n10;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].value).toBe('5');
      expect(tokens[3].type).toBe(TokenType.Plus);
      expect(tokens[4].value).toBe('10');
      expect(tokens[5].type).toBe(TokenType.Semicolon);
    });

    it('should handle operator after line comment', () => {
      const code = `x := 5
// comment
+ 10;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].value).toBe('5');
      expect(tokens[3].type).toBe(TokenType.Plus);
      expect(tokens[4].value).toBe('10');
    });

    it('should handle operator before block comment in CODE block', () => {
      const code = 'BEGIN x := 5 + { comment } 10; END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('x');
      expect(tokens[2].type).toBe(TokenType.Assign);
      expect(tokens[3].value).toBe('5');
      expect(tokens[4].type).toBe(TokenType.Plus);
      expect(tokens[5].value).toBe('10');
      expect(tokens[6].type).toBe(TokenType.Semicolon);
    });

    it('should handle multiple comments between operators in CODE block', () => {
      const code = `BEGIN a + // comment 1
{ comment 2 } // comment 3
b; END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('a');
      expect(tokens[2].type).toBe(TokenType.Plus);
      expect(tokens[3].value).toBe('b');
    });

    it('should handle block comment containing operator-like text in CODE block', () => {
      const code = 'BEGIN { Comment with := and :: and += operators } x := 5; END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Comment should be skipped, only x := 5; should be tokenized
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('x');
      expect(tokens[2].type).toBe(TokenType.Assign);
      expect(tokens[3].value).toBe('5');
    });

    it('should handle scope operator with comments', () => {
      const code = 'Status // comment\n:: // another comment\nOpen';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Status');
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Open');
    });

    it('should handle commented-out assignment', () => {
      const code = 'x := 5; // y := 10;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Only x := 5; should be tokenized
      expect(tokens).toHaveLength(5); // x, :=, 5, ;, EOF
      expect(tokens[0].value).toBe('x');
    });

    it('should handle block comment in expression in CODE block', () => {
      const code = 'BEGIN result := (a + b) { multiply } * (c - d); END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // BEGIN, result, :=, (, a, +, b, ), *, (, c, -, d, ), ;, END, EOF
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('result');
      expect(tokens[2].type).toBe(TokenType.Assign);
      expect(tokens[8].type).toBe(TokenType.Multiply);
      expect(tokens[10].value).toBe('c');
    });

    it('should handle line comment with false operator start', () => {
      const code = 'x := 5; // This : is not an operator';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(5); // x, :=, 5, ;, EOF
    });

    it('should handle nested comment-like content in CODE block', () => {
      const code = 'BEGIN { Comment with // inside } x := 5; END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Block comment should consume everything up to }, including //
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('x');
      expect(tokens[2].type).toBe(TokenType.Assign);
    });
  });
});
