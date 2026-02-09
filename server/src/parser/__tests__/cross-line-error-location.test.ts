/**
 * Cross-Line Error Location Tests (Issue #364)
 *
 * Tests that parser errors are reported on the correct line when:
 * - An expected token is missing at end-of-line
 * - The next token is on a different line
 *
 * The old consume() method used peek() for error location, pointing to the next token.
 * The new consumeExpected() method uses previous() to point where the missing token should be.
 *
 * All tests in this file are Tier 1 (exact location assertions) because the issue
 * is specifically about error line/column accuracy.
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - Cross-Line Error Location (Issue #364)', () => {
  describe('Missing semicolon after variable declaration', () => {
    it('should report error on line with type, not next line with BEGIN', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer
    BEGIN
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const semicolonError = errors.find(e => e.message.includes('Expected ; after'));
      expect(semicolonError).toBeDefined();

      // BEFORE FIX: error.token.line is 8 (BEGIN line)
      // AFTER FIX: error.token.line should be 7 (Integer line - where semicolon belongs)
      expect(semicolonError!.token.line).toBe(7);
      expect(semicolonError!.token.column).toBe(11); // After "Integer"
    });
  });

  describe('Missing THEN after IF condition', () => {
    it('should report error on line with condition, not next line with body', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      IF x > 10
        x := 0;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const thenError = errors.find(e => e.message.includes('Expected THEN'));
      expect(thenError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (x := 0 line)
      // AFTER FIX: error.token.line should be 9 (condition line - where THEN belongs)
      expect(thenError!.token.line).toBe(9);
      expect(thenError!.token.column).toBe(14); // After "10"
    });

    it('should report error on line with condition when body is BEGIN block', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      IF x > 10
      BEGIN
        x := 0;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const thenError = errors.find(e => e.message.includes('Expected THEN'));
      expect(thenError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (BEGIN line)
      // AFTER FIX: error.token.line should be 9 (condition line)
      expect(thenError!.token.line).toBe(9);
      expect(thenError!.token.column).toBe(14); // After "10"
    });
  });

  describe('Missing DO after WHILE condition', () => {
    it('should report error on line with condition, not next line with body', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10
        i := i + 1;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e => e.message.includes('Expected DO after WHILE'));
      expect(doError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (i := i + 1 line)
      // AFTER FIX: error.token.line should be 9 (condition line - where DO belongs)
      expect(doError!.token.line).toBe(9);
      expect(doError!.token.column).toBe(17); // After "10"
    });
  });

  describe('Missing DO after FOR-TO range', () => {
    it('should report error on line with TO expression, not next line with body', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10
        i := i + 1;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e => e.message.includes('Expected DO after FOR'));
      expect(doError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (i := i + 1 line)
      // AFTER FIX: error.token.line should be 9 (TO 10 line - where DO belongs)
      expect(doError!.token.line).toBe(9);
      expect(doError!.token.column).toBe(21); // After "10"
    });

    it('should report error on line with DOWNTO expression', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1
        i := i - 1;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e => e.message.includes('Expected DO after FOR'));
      expect(doError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (i := i - 1 line)
      // AFTER FIX: error.token.line should be 9 (DOWNTO 1 line)
      expect(doError!.token.line).toBe(9);
      expect(doError!.token.column).toBe(26); // After "1"
    });
  });

  describe('Missing DO after WITH record', () => {
    it('should report error on line with record expression, not next line with body', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer
        Customer.Name := 'Test';
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e => e.message.includes('Expected DO after WITH'));
      expect(doError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (Customer.Name := line)
      // AFTER FIX: error.token.line should be 9 (WITH Customer line - where DO belongs)
      expect(doError!.token.line).toBe(9);
      expect(doError!.token.column).toBe(12); // After "Customer"
    });
  });

  describe('Missing OF after CASE expression', () => {
    it('should report error on line with expression, not next line with first branch', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x
        1: MESSAGE('One');
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const ofError = errors.find(e => e.message.includes('Expected OF after CASE'));
      expect(ofError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (1: MESSAGE line)
      // AFTER FIX: error.token.line should be 9 (CASE x line - where OF belongs)
      expect(ofError!.token.line).toBe(9);
      expect(ofError!.token.column).toBe(12); // After "x"
    });
  });

  describe('Missing END after BEGIN block', () => {
    it('should report error on line with last statement, not line with next construct', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN BEGIN
        MESSAGE('Test');
      END

    PROCEDURE AnotherProc();
    BEGIN
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const endError = errors.find(e => e.message.includes('Expected END to close BEGIN'));
      expect(endError).toBeDefined();

      // BEFORE FIX: error.token.line is 11 (PROCEDURE AnotherProc line)
      // AFTER FIX: error.token.line should be 9 (END line of inner block - where outer END belongs)
      expect(endError!.token.line).toBe(9);
      expect(endError!.token.column).toBe(7); // After "END"
    });
  });

  describe('Missing ) after EXIT value', () => {
    it('should report error on line with expression, not next line with statement', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFunc() : Integer;
    VAR
      x : Integer;
    BEGIN
      EXIT(x
      MESSAGE('After EXIT');
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const parenError = errors.find(e => e.message.includes('Expected ) after EXIT'));
      expect(parenError).toBeDefined();

      // BEFORE FIX: error.token.line is 10 (MESSAGE line)
      // AFTER FIX: error.token.line should be 9 (EXIT(x line - where ) belongs)
      expect(parenError!.token.line).toBe(9);
      expect(parenError!.token.column).toBe(12); // After "x"
    });
  });

  describe('Additional high-priority Tier 1 scenarios', () => {
    it('should report missing colon after case branch value on correct line', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1
        MESSAGE('One');
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch'));
      expect(colonError).toBeDefined();

      // BEFORE FIX: error.token.line is 11 (MESSAGE line)
      // AFTER FIX: error.token.line should be 10 (1 line - where : belongs)
      expect(colonError!.token.line).toBe(10);
      expect(colonError!.token.column).toBe(9); // After "1"
    });

    it('should report missing semicolon after trigger body on correct line', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=BEGIN END
  }
}`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const semicolonError = errors.find(e => e.message.includes('Expected ; after trigger'));
      expect(semicolonError).toBeDefined();

      // BEFORE FIX: error.token.line is 6 (closing brace line)
      // AFTER FIX: error.token.line is 5 (OnRun line - at END token)
      expect(semicolonError!.token.line).toBe(5);
      expect(semicolonError!.token.column).toBe(17); // At "END"
    });
  });
});
