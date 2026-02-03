/**
 * Orphaned Control-Flow Keywords Detection Tests (Issue #327)
 *
 * Tests that the parser reports errors for orphaned control-flow keywords
 * (DO, OF, THEN, TO, DOWNTO, UNTIL) appearing as standalone statements without
 * their required control structures.
 *
 * These keywords are ONLY valid when attached to specific control structures:
 * - DO: WHILE...DO, FOR...DO, WITH...DO
 * - OF: CASE...OF
 * - THEN: IF...THEN
 * - TO: FOR...TO
 * - DOWNTO: FOR...DOWNTO
 * - UNTIL: REPEAT...UNTIL
 *
 * When they appear as standalone statements, the parser should report
 * context-specific errors explaining where each keyword is valid.
 *
 * Note: BEGIN and END are intentionally EXCLUDED from orphan detection:
 * - BEGIN can start a new compound statement block
 * - END closes blocks and is valid in multiple contexts
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { parseCode } from '../parser';

describe('Orphaned Control-Flow Keywords Detection', () => {
  describe('Basic orphaned keyword detection', () => {
    it('should report error for orphaned DO keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      DO;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e =>
        e.message.includes('Unexpected DO') &&
        (e.message.includes('WHILE') || e.message.includes('FOR') || e.message.includes('WITH'))
      );
      expect(doError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned OF keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      OF;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const ofError = errors.find(e =>
        e.message.includes('Unexpected OF') &&
        e.message.includes('CASE')
      );
      expect(ofError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned THEN keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      THEN;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const thenError = errors.find(e =>
        e.message.includes('Unexpected THEN') &&
        e.message.includes('IF')
      );
      expect(thenError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned TO keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      TO;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const toError = errors.find(e =>
        e.message.includes('Unexpected TO') &&
        e.message.includes('FOR')
      );
      expect(toError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned DOWNTO keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      DOWNTO;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const downtoError = errors.find(e =>
        e.message.includes('Unexpected DOWNTO') &&
        e.message.includes('FOR')
      );
      expect(downtoError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned UNTIL keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      UNTIL;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const untilError = errors.find(e =>
        e.message.includes('Unexpected UNTIL') &&
        e.message.includes('REPEAT')
      );
      expect(untilError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });

  describe('Multiple consecutive orphaned keywords', () => {
    it('should report separate errors for each orphaned keyword', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      THEN;
      DO;
      OF;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report at least 3 errors (one per orphaned keyword)
      expect(errors.length).toBeGreaterThanOrEqual(3);

      // Verify each keyword has its own error
      const thenError = errors.find(e => e.message.includes('Unexpected THEN'));
      const doError = errors.find(e => e.message.includes('Unexpected DO'));
      const ofError = errors.find(e => e.message.includes('Unexpected OF'));

      expect(thenError).toBeDefined();
      expect(doError).toBeDefined();
      expect(ofError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });

  describe('Orphaned keywords inside control structure bodies', () => {
    it('should report error for orphaned THEN inside IF body', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Boolean;
    BEGIN
      IF TRUE THEN BEGIN
        THEN;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const thenError = errors.find(e =>
        e.message.includes('Unexpected THEN')
      );
      expect(thenError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned DO inside WHILE body', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      WHILE TRUE DO BEGIN
        DO;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e =>
        e.message.includes('Unexpected DO')
      );
      expect(doError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned OF inside CASE branch', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: OF;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const ofError = errors.find(e =>
        e.message.includes('Unexpected OF')
      );
      expect(ofError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });

  describe('Interaction with empty statements', () => {
    it('should report error for orphaned keyword after empty statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      ;
      THEN;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const thenError = errors.find(e =>
        e.message.includes('Unexpected THEN')
      );
      expect(thenError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned keyword between empty statements', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      ;
      ;
      DO;
      ;
      ;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const doError = errors.find(e =>
        e.message.includes('Unexpected DO')
      );
      expect(doError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });

  describe('Orphaned keywords in CASE branches', () => {
    it('should report error for orphaned UNTIL in numeric branch body', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: UNTIL;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const untilError = errors.find(e =>
        e.message.includes('Unexpected UNTIL')
      );
      expect(untilError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });

    it('should report error for orphaned TO in ELSE branch', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: EXIT;
        ELSE TO;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const toError = errors.find(e =>
        e.message.includes('Unexpected TO')
      );
      expect(toError).toBeDefined();

      // AST should still parse (graceful recovery)
      expect(ast).toBeDefined();
    });
  });

  describe('Error recovery continuation', () => {
    it('should recover and parse subsequent valid statements after orphaned keywords', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      DO;
      x := 1;
      OF;
      y := 2;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report errors for DO and OF
      expect(errors.length).toBeGreaterThanOrEqual(2);
      const doError = errors.find(e => e.message.includes('Unexpected DO'));
      const ofError = errors.find(e => e.message.includes('Unexpected OF'));
      expect(doError).toBeDefined();
      expect(ofError).toBeDefined();

      // AST should still parse the valid assignments
      expect(ast).toBeDefined();
      if (!ast) return;
      expect(ast.object).toBeDefined();

      // Verify that the codeunit structure is intact
      const codeunit = ast.object;
      if (!codeunit) return;
      expect(codeunit.type).toBe('ObjectDeclaration');
      expect(codeunit.objectKind).toBe('Codeunit');
    });
  });

  describe('BEGIN and END validation (must NOT report errors)', () => {
    it('should allow BEGIN as statement starter', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      x := 1;
      BEGIN
        x := 2;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error - BEGIN is valid as statement starter
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
      expect(ast.object).toBeDefined();
    });

    it('should allow END as block terminator', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      BEGIN
        EXIT;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error - END is valid as block terminator
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
      expect(ast.object).toBeDefined();
    });
  });

  describe('Valid control-flow keyword usage (regression guards)', () => {
    it('should not report error for DO in WHILE loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      WHILE TRUE DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should not report error for DO in FOR loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should not report error for OF in CASE statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: EXIT;
        2: EXIT;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should not report error for THEN in IF statement', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
        EXIT;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should not report error for TO in FOR loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should not report error for DOWNTO in FOR loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO
        EXIT;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });

    it('should not report error for UNTIL in REPEAT loop', () => {
      const code = `
OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Boolean;
    BEGIN
      REPEAT
        EXIT;
      UNTIL x;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without error
      expect(errors).toHaveLength(0);
      expect(ast).toBeDefined();
    });
  });
});
