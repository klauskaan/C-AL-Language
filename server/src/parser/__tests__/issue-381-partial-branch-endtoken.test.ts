/**
 * Issue #381: Partial CaseBranch endToken doesn't reflect where recovery stopped
 *
 * When error recovery creates a partial CaseBranch (from a CaseBranchParseError),
 * its endToken should point to where recovery actually stopped, not just to the
 * last case value token.
 *
 * Before fix: endToken points to the last case value token (e.g., the '1' literal)
 * After fix: endToken points to where recovery stopped (e.g., the semicolon after MESSAGE)
 *
 * This ensures the CaseBranch's token range accurately reflects the content that was
 * parsed/skipped during recovery.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { CaseStatement, CaseBranch, Literal } from '../ast';

describe('Issue #381 - Partial CaseBranch endToken reflects recovery stop point', () => {
  describe('Recovery that skips content (semicolon case)', () => {
    it('should set endToken to semicolon after statement, not case value', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
        2: MESSAGE('Two');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect missing colon error
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Get the partial branch
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;
      const partialBranch = caseStmt.branches[0] as CaseBranch;

      // Verify it's the partial branch with value 1
      expect(partialBranch.values.length).toBe(1);
      expect(partialBranch.values[0].type).toBe('Literal');
      expect((partialBranch.values[0] as Literal).value).toBe(1);
      expect(partialBranch.statements.length).toBe(0);

      // CORE TEST: endToken should NOT be the '1' literal token
      // It should point to the semicolon where recovery stopped
      const valueToken = partialBranch.values[0].startToken;
      expect(partialBranch.endToken).not.toBe(valueToken);

      // endToken should be AFTER the value token (recovery advances past content)
      expect(partialBranch.endToken.startOffset).toBeGreaterThan(valueToken.startOffset);

      // Sanity check: endToken should be >= startToken
      expect(partialBranch.endToken.startOffset).toBeGreaterThanOrEqual(partialBranch.startToken.startOffset);
    });

    it('should include MESSAGE call in partial branch token range', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
        2: MESSAGE('Two');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;
      const partialBranch = caseStmt.branches[0] as CaseBranch;

      // Calculate the range of the partial branch
      const branchStart = partialBranch.startToken.startOffset;
      const branchEnd = partialBranch.endToken.startOffset + partialBranch.endToken.value.length;
      const branchLength = branchEnd - branchStart;

      // The range should be more than just "1" (the case value)
      // It should include the MESSAGE('Error'); part
      expect(branchLength).toBeGreaterThan(10);

      // Find the position of MESSAGE in the code
      const messagePos = code.indexOf("MESSAGE('Error')");
      expect(messagePos).toBeGreaterThan(-1);

      // The branch range should extend at least to where MESSAGE starts
      expect(branchEnd).toBeGreaterThan(messagePos);
    });
  });

  describe('Recovery that finds next case value immediately (zero-iteration case)', () => {
    it('should set endToken correctly when next token is already a case value', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1
        2: MESSAGE('Two');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect missing colon error
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Get the partial branch
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;
      const partialBranch = caseStmt.branches[0] as CaseBranch;

      // Verify it's the partial branch with value 1
      expect(partialBranch.values.length).toBe(1);
      expect((partialBranch.values[0] as Literal).value).toBe(1);
      expect(partialBranch.statements.length).toBe(0);

      // Even in zero-iteration case, endToken should be >= startToken
      expect(partialBranch.endToken.startOffset).toBeGreaterThanOrEqual(partialBranch.startToken.startOffset);

      // The value token should be the startToken (the '1')
      const valueToken = partialBranch.values[0].startToken;
      expect(partialBranch.startToken).toBe(valueToken);

      // In this case, recovery stops immediately (finds '2' as next case value)
      // endToken should point to the last token before recovery stopped
      // which could be the same as the value token in zero-iteration case
      // BUT if recovery advances even once (to check the next token), endToken should reflect that
      // The key invariant: endToken >= startToken
      expect(partialBranch.endToken.startOffset).toBeGreaterThanOrEqual(valueToken.startOffset);
    });
  });

  describe('Multiple error recovery scenarios', () => {
    it('should set endToken correctly for first partial branch when multiple branches follow', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('First');
        2: MESSAGE('Second');
        3: MESSAGE('Third');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      // Should have 3 branches
      expect(caseStmt.branches.length).toBe(3);

      const partialBranch = caseStmt.branches[0] as CaseBranch;
      const secondBranch = caseStmt.branches[1] as CaseBranch;

      // Partial branch should not overlap with second branch
      const firstEnd = partialBranch.endToken.startOffset + partialBranch.endToken.value.length;
      const secondStart = secondBranch.startToken.startOffset;

      // First branch should end before second branch starts
      expect(firstEnd).toBeLessThanOrEqual(secondStart);

      // Verify ranges are reasonable
      expect(partialBranch.endToken.startOffset).toBeGreaterThanOrEqual(partialBranch.startToken.startOffset);
      expect(secondBranch.endToken.startOffset).toBeGreaterThanOrEqual(secondBranch.startToken.startOffset);
    });

    it('should set endToken correctly when recovery skips function with arguments', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      a@1001 : Integer;
      b@1002 : Integer;
    BEGIN
      CASE x OF
        1 SomeFunc(a, b);
        2: MESSAGE('Two');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;
      const partialBranch = caseStmt.branches[0] as CaseBranch;

      // Should have skipped the entire SomeFunc(a, b); call
      const branchStart = partialBranch.startToken.startOffset;
      const branchEnd = partialBranch.endToken.startOffset + partialBranch.endToken.value.length;
      const branchLength = branchEnd - branchStart;

      // Range should include more than just "1"
      expect(branchLength).toBeGreaterThan(10);

      // Should have stopped at semicolon, then advanced past it
      // endToken should be after the function call
      const funcPos = code.indexOf('SomeFunc');
      expect(funcPos).toBeGreaterThan(-1);
      expect(branchEnd).toBeGreaterThan(funcPos);
    });
  });

  describe('Recovery stops at ELSE', () => {
    it('should set endToken correctly when recovery stops at ELSE keyword', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
        ELSE
          MESSAGE('Default');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;
      const partialBranch = caseStmt.branches[0] as CaseBranch;

      // Should have skipped to just before ELSE
      expect(partialBranch.endToken.startOffset).toBeGreaterThanOrEqual(partialBranch.startToken.startOffset);

      // The partial branch should end before the ELSE keyword
      const elsePos = code.indexOf('ELSE');
      const branchEnd = partialBranch.endToken.startOffset + partialBranch.endToken.value.length;

      expect(branchEnd).toBeLessThanOrEqual(elsePos);
    });
  });
});
