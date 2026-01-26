/**
 * REGRESSION TESTS: Keywords as Procedure Names
 *
 * Tests support for using certain C/AL keywords as procedure names.
 * This is a valid pattern in C/AL where keywords are contextually recognized.
 *
 * Issue #258: Parser rejects `PROCEDURE Break@17();` but real NAV code uses it
 * Example from REP6005597.TXT line 835: PROCEDURE Break@17();
 * Example call from REP6005597.TXT lines 354, 371: "Break"; (quoted syntax)
 *
 * Context: C/AL allows some keywords to be reused as procedure names when called
 * using quoted syntax ("Break" instead of Break). The parser must:
 * 1. Allow the keyword in procedure declarations
 * 2. Parse quoted calls correctly as procedure calls
 * 3. Maintain unquoted keyword behavior (e.g., Break = BREAK statement)
 *
 * TDD EXPECTATION:
 * - Tests 1-2 SHOULD FAIL initially (Break not in ALLOWED_KEYWORDS_AS_IDENTIFIERS)
 * - Tests 3-5 SHOULD PASS (regression guards for existing behavior)
 * - Tests will pass after adding TokenType.Break to ALLOWED_KEYWORDS_AS_IDENTIFIERS
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import {
  BreakStatement,
  CallStatement,
  IfStatement,
  RepeatStatement,
} from '../ast';

describe('Parser - Keywords as Procedure Names', () => {
  describe('Break keyword as procedure name', () => {
    it('should parse PROCEDURE Break@1() declaration', () => {
      // Test that Break can be used as a procedure name
      // Reference: REP6005597.TXT line 835
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Break@1();
    BEGIN
      ERROR('Break procedure called');
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const proc = procedures[0];
      expect(proc.name).toBe('Break');
      // Procedure ID is embedded in the name via nameToken, not a separate field
      expect(proc.type).toBe('ProcedureDeclaration');
    });

    it('should parse quoted "Break" as procedure call', () => {
      // Test that quoted syntax calls the Break procedure
      // Reference: REP6005597.TXT lines 354, 371
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Break@1();
    BEGIN
    END;

    PROCEDURE Test@2();
    BEGIN
      "Break";
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(2);

      // Verify Break procedure declaration
      expect(procedures[0].name).toBe('Break');

      // Verify Test procedure contains call to Break
      expect(procedures[1].name).toBe('Test');
      const testBody = procedures[1].body;
      expect(testBody).toHaveLength(1);

      const callStmt = testBody[0] as CallStatement;
      expect(callStmt.type).toBe('CallStatement');

      // The call expression should be a quoted identifier
      expect(callStmt.expression.type).toBe('Identifier');
      const identifier = callStmt.expression as any;
      expect(identifier.name).toBe('Break');
      expect(identifier.isQuoted).toBe(true);
    });
  });

  describe('Regression guards - existing behavior', () => {
    it('should parse unquoted Break as BREAK statement, not procedure call', () => {
      // Verify that unquoted Break remains a BREAK statement keyword
      // This ensures we don't break existing control flow parsing
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    BEGIN
      REPEAT
        IF TRUE THEN
          Break;
      UNTIL FALSE;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // SHOULD PASS: Existing BREAK statement parsing
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const proc = procedures[0];
      const procBody = proc.body;
      expect(procBody).toHaveLength(1);

      const repeatStmt = procBody[0] as RepeatStatement;
      expect(repeatStmt.type).toBe('RepeatStatement');
      expect(repeatStmt.body).toHaveLength(1);

      const ifStmt = repeatStmt.body[0] as IfStatement;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch as BreakStatement;
      expect(breakStmt.type).toBe('BreakStatement');
      // Critical: BREAK statement has NO value field (unlike EXIT)
      expect((breakStmt as any).value).toBeUndefined();
    });

    it('should reject IF as variable name', () => {
      // Control flow keywords should remain disallowed as identifiers
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      If@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // SHOULD PASS: IF remains reserved
      expect(errors.length).toBeGreaterThan(0);
      // Error should indicate reserved keyword cannot be used
      const errorMessages = errors.map(e => e.message.toLowerCase()).join(' ');
      expect(errorMessages).toMatch(/cannot use reserved keyword|expected|unexpected|invalid/);
    });

    it('should reject WHILE as procedure name', () => {
      // Control flow keywords should remain disallowed as procedure names
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE While@1();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // SHOULD PASS: WHILE remains reserved
      expect(errors.length).toBeGreaterThan(0);
      // Error should mention procedure name or identifier expected
      const errorMessages = errors.map(e => e.message.toLowerCase()).join(' ');
      expect(errorMessages).toMatch(/expected.*procedure name|expected.*identifier|unexpected/);
    });
  });
});
