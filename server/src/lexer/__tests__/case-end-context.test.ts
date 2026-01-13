/**
 * Lexer Tests - CASE/END Context Tracking
 *
 * Tests the lexer's ability to correctly track CASE statements and their
 * corresponding END keywords, particularly when braces appear in CASE branches.
 *
 * BUG: When braces (comments) appear in a CASE branch, the lexer can lose track
 * of the CASE context, causing the CASE's END keyword to be mis-tokenized as
 * an IDENTIFIER instead of TokenType.End. This breaks parsing of subsequent code.
 *
 * These tests SHOULD FAIL initially, demonstrating that the bug exists.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - CASE/END Context Tracking', () => {
  describe('Simple CASE statements without BEGIN blocks', () => {
    it('should tokenize END as keyword after simple CASE statement', () => {
      const code = `BEGIN
  CASE x OF
    1: DoA;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find all END tokens - should be 2 (CASE END and procedure END)
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // First END should close the CASE, second END should close the BEGIN
      expect(endTokens[0].type).toBe(TokenType.End);
      expect(endTokens[1].type).toBe(TokenType.End);

      // Verify none of the ENDs were tokenized as identifiers
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should tokenize END as keyword with multiple CASE branches', () => {
      const code = `BEGIN
  CASE AccountType OF
    1: DoOne;
    2: DoTwo;
    3: DoThree;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have exactly 2 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should tokenize END as keyword with ELSE branch', () => {
      const code = `BEGIN
  CASE x OF
    1: DoA;
  ELSE
    DoElse;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords (CASE and procedure)
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // Verify no END was tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });
  });

  describe('CASE statements with BEGIN blocks in branches', () => {
    it('should tokenize both ENDs as keywords when branch has BEGIN block', () => {
      const code = `BEGIN
  CASE x OF
    1:
      BEGIN
        DoA;
      END;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords: branch BEGIN, CASE, procedure BEGIN
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should handle multiple branches with BEGIN blocks', () => {
      const code = `BEGIN
  CASE x OF
    1:
      BEGIN
        DoA;
      END;
    2:
      BEGIN
        DoB;
      END;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 4 END keywords: 2 branch BEGINs, 1 CASE, 1 outer procedure BEGIN
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(4);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });
  });

  describe('CASE statements with braces (comments) in branches', () => {
    it('should tokenize END as keyword when brace comment appears in CASE branch', () => {
      // CRITICAL TEST: This is the exact pattern that triggers the bug
      const code = `BEGIN
  CASE x OF
    1: y := 1; { comment }
    2: z := 2;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find all END tokens - should be 2 (CASE END and BEGIN END)
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // Verify the CASE's END was correctly tokenized
      // (not mis-tokenized as IDENTIFIER)
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // Verify braces were treated as comments (not structural tokens)
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });

    it('should handle comment in first branch of CASE', () => {
      const code = `BEGIN
  CASE Status OF
    1:
      { First option }
      DoFirst;
    2:
      DoSecond;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should handle multiple comments in CASE branches', () => {
      const code = `BEGIN
  CASE Type OF
    1:
      { Comment A }
      x := 1;
    2:
      { Comment B }
      y := 2;
    3:
      { Comment C }
      z := 3;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords (CASE and procedure)
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // All braces should be treated as comments
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });

    it('should handle inline comment after statement in CASE branch', () => {
      const code = `BEGIN
  CASE Value OF
    1: x := 1; { set to one }
    2: x := 2; { set to two }
  END;
  x := x + 1;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // Verify code after CASE statement is tokenized correctly
      // (this would fail if CASE's END was mis-tokenized)
      const assignTokens = tokens.filter(t => t.type === TokenType.Assign);
      expect(assignTokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Nested CASE statements', () => {
    it('should handle nested CASE without BEGIN blocks', () => {
      const code = `BEGIN
  CASE a OF
    1:
      CASE b OF
        1: x := 1;
        2: x := 2;
      END;
    2:
      y := 3;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords: inner CASE, outer CASE, procedure
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should handle nested CASE with braces in inner CASE', () => {
      const code = `BEGIN
  CASE Outer OF
    1:
      CASE Inner OF
        1: x := 1; { inner comment }
        2: y := 2;
      END;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should handle nested CASE with braces in outer CASE', () => {
      const code = `BEGIN
  CASE Outer OF
    1: x := 1; { outer comment }
    2:
      CASE Inner OF
        1: y := 2;
      END;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should treat braces as comments after nested CASE ends', () => {
      const code = `PROCEDURE Test();
BEGIN
  CASE a OF
    1:
      CASE b OF
        2: x := 1;
      END;
  END;
  { This should be a comment after nested CASE }
  y := 2;
END;`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The braces should be treated as a comment, not structural tokens
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens).toHaveLength(0);

      // All END keywords should remain END, not become IDENTIFIER
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier && t.value === 'END'
      );

      expect(endTokens.length).toBeGreaterThan(0);
      expect(endIdentifiers).toHaveLength(0);
    });
  });

  describe('Real-world pattern from COD1255.TXT', () => {
    it('should handle CASE followed by IF with comparison operator', () => {
      // This is the exact pattern from COD1255.TXT that reveals the bug:
      // - CASE statement with EXIT in branch
      // - Followed by IF statement with comparison
      // - The comparison uses = which can be confused with property assignment
      const code = `PROCEDURE Test();
BEGIN
  CASE AccountType OF
    1: EXIT;
  END;

  IF NoOfEntries = 1 THEN
    Value := Option::"Option Value"
END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find all END tokens - should be 2 (CASE END and procedure END)
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // Verify CASE's END was correctly tokenized as keyword
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // Verify IF statement was correctly parsed
      const ifToken = tokens.find(t => t.type === TokenType.If);
      expect(ifToken).toBeDefined();

      // Verify comparison operator was correctly tokenized
      const equalToken = tokens.find(t => t.type === TokenType.Equal);
      expect(equalToken).toBeDefined();

      // Verify THEN was correctly tokenized (would fail if context is broken)
      const thenToken = tokens.find(t => t.type === TokenType.Then);
      expect(thenToken).toBeDefined();
    });

    it('should handle CASE with single EXIT followed by complex expression', () => {
      const code = `BEGIN
  CASE Type OF
    1: EXIT;
  END;

  Result := (Value1 = Value2) AND (Status <> 0);
END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // Verify operators after CASE are correctly parsed
      const andToken = tokens.find(t => t.type === TokenType.And);
      expect(andToken).toBeDefined();
    });
  });

  describe('CASE with mixed branch types', () => {
    it('should handle CASE with simple statement, BEGIN block, and comment', () => {
      const code = `BEGIN
  CASE Action OF
    1:
      DoSimple;
    2:
      BEGIN
        DoComplex;
        DoMore;
      END;
    3:
      { Just a comment }
      DoWithComment;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords: branch BEGIN, CASE, outer procedure BEGIN
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should handle CASE ELSE with comment', () => {
      const code = `BEGIN
  CASE Value OF
    1: x := 1;
  ELSE BEGIN
    { Default case }
    x := 0;
  END;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords: ELSE BEGIN, CASE, procedure
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // Comment should not produce brace tokens
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });
  });

  describe('Edge cases and context recovery', () => {
    it('should handle empty CASE branches', () => {
      const code = `BEGIN
  CASE x OF
    1:;
    2:;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });

    it('should handle CASE with range values', () => {
      const code = `BEGIN
  CASE Value OF
    1..5: { range comment } DoLow;
    6..10: DoHigh;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 2 END keywords
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(2);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);

      // Verify range operator is tokenized
      const rangeTokens = tokens.filter(t => t.type === TokenType.DotDot);
      expect(rangeTokens.length).toBe(2);
    });

    it('should handle multiple CASE statements in sequence', () => {
      const code = `BEGIN
  CASE x OF
    1: a := 1; { comment }
  END;

  CASE y OF
    2: b := 2; { another comment }
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 END keywords (2 CASEs and 1 procedure)
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(endTokens.length).toBe(3);

      // No END should be tokenized as identifier
      const endIdentifiers = tokens.filter(t =>
        t.type === TokenType.Identifier &&
        t.value.toUpperCase() === 'END'
      );
      expect(endIdentifiers.length).toBe(0);
    });
  });
});
