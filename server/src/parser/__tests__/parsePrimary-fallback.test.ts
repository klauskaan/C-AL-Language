/**
 * parsePrimary() Fallback Behavior Tests (Issue #361)
 *
 * Tests the fallback behavior in parsePrimary() when encountering unexpected tokens.
 * The fallback currently treats ANY unhandled token as an identifier, which leads to
 * misleading errors for clearly invalid tokens.
 *
 * Bug: parsePrimary() fallback lacks validation - it treats structural delimiters,
 * statement keywords, and operators as identifiers, creating confusing error messages.
 *
 * Examples:
 * - `x := );` reports "Expected ;" instead of "Unexpected ')' in expression"
 * - `x := IF;` treats IF as identifier instead of reporting keyword misuse
 * - `x := +;` treats + as identifier instead of reporting operator at start
 *
 * Test Categories:
 * 1. Data type keywords as identifiers (SHOULD WORK - valid C/AL)
 * 2. Structural delimiters in expression (SHOULD ERROR - invalid syntax)
 * 3. Statement keywords in expression (SHOULD ERROR - invalid syntax)
 * 4. Operators at expression start (SHOULD ERROR - invalid syntax)
 * 5. EOF in incomplete expression (SHOULD ERROR - incomplete)
 * 6. Regression guards (SHOULD CONTINUE WORKING)
 *
 * === Expected Test Results ===
 * All categories now PASS after Issue #361 fix
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { parseCode } from '../parser';

describe('parsePrimary() Fallback Behavior', () => {
  describe('Category 1: Data type keywords as identifiers (valid C/AL)', () => {
    it('should accept BLOB as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      BLOB@1 : Integer;
    BEGIN
      BLOB := 42;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('BLOB');

      const assignStmt = procedure.body[0];
      expect(assignStmt.type).toBe('AssignmentStatement');
    });

    it('should accept BigText as identifier in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      BigText@1 : Integer;
      x@2 : Integer;
    BEGIN
      x := BigText;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(2);
      expect(procedure.variables[0].name).toBe('BigText');
    });

    it('should accept GUID as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      GUID@1 : Text[50];
    BEGIN
      GUID := 'test';
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('GUID');
    });

    it('should accept TextConst as identifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      TextConst@1 : Integer;
      result@2 : Integer;
    BEGIN
      result := TextConst;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(2);
      expect(procedure.variables[0].name).toBe('TextConst');
    });

    it('should accept multiple data type keywords as identifiers in same expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      BLOB@1 : Integer;
      GUID@2 : Integer;
      result@3 : Integer;
    BEGIN
      result := BLOB + GUID;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(3);
    });
  });

  describe('Category 2: Structural delimiters in expression position (invalid)', () => {
    it('should report error for right paren in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := );
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error about unexpected delimiter
      expect(errors.length).toBeGreaterThan(0);
      const delimError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('cannot start') ||
        e.message.includes('invalid')
      );
      expect(delimError).toBeDefined();

      // Should mention the problematic token
      expect(delimError!.message).toMatch(/\)|\[content sanitized/);
    });

    it('should report error for right bracket in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := ];
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const delimError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('cannot start') ||
        e.message.includes('invalid')
      );
      expect(delimError).toBeDefined();
    });

    it('should report error for semicolon in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := ;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const delimError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('expression') ||
        e.message.includes('Expected')
      );
      expect(delimError).toBeDefined();
    });

    it('should report error for right brace in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := };
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const delimError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('cannot start') ||
        e.message.includes('invalid')
      );
      expect(delimError).toBeDefined();
    });
  });

  describe('Category 3: Statement-starting keywords in expression (invalid)', () => {
    it('should report error for IF keyword in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := IF;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('keyword') ||
        e.message.includes('IF')
      );
      expect(keywordError).toBeDefined();
    });

    it('should report error for WHILE keyword in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := WHILE;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('keyword') ||
        e.message.includes('WHILE')
      );
      expect(keywordError).toBeDefined();
    });

    it('should report error for CASE keyword in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := CASE;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('keyword') ||
        e.message.includes('CASE')
      );
      expect(keywordError).toBeDefined();
    });

    it('should report error for REPEAT keyword in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := REPEAT;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('keyword') ||
        e.message.includes('REPEAT')
      );
      expect(keywordError).toBeDefined();
    });

    it('should report error for WITH keyword in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := WITH;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('keyword') ||
        e.message.includes('WITH')
      );
      expect(keywordError).toBeDefined();
    });
  });

  describe('Category 4: Operators at expression start (invalid)', () => {
    it('should report error for plus operator at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := +;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('operator') ||
        e.message.includes('expression')
      );
      expect(opError).toBeDefined();
    });

    it('should report error for multiply operator at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := *;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('operator') ||
        e.message.includes('expression')
      );
      expect(opError).toBeDefined();
    });

    it('should report error for assignment operator in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := :=;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes(':=') ||
        e.message.includes('operator')
      );
      expect(opError).toBeDefined();
    });

    it('should report error for AND keyword operator at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Boolean;
    BEGIN
      x := AND;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('AND') ||
        e.message.includes('operator')
      );
      expect(opError).toBeDefined();
    });

    it('should report error for OR keyword operator at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Boolean;
    BEGIN
      x := OR;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('OR') ||
        e.message.includes('operator')
      );
      expect(opError).toBeDefined();
    });

    it('should report error for DIV keyword operator at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := DIV;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('DIV') ||
        e.message.includes('operator')
      );
      expect(opError).toBeDefined();
    });

    it('should report error for MOD keyword operator at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := MOD;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const opError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('MOD') ||
        e.message.includes('operator')
      );
      expect(opError).toBeDefined();
    });
  });

  describe('Category 5: EOF in incomplete expression (invalid)', () => {
    it('should report error for incomplete assignment at end of procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x :=`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const eofError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('EOF') ||
        e.message.includes('end of file') ||
        e.message.includes('Expected')
      );
      expect(eofError).toBeDefined();
    });

    it('should report error for incomplete expression at end of file', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF TRUE THEN
        x :=`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const eofError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('EOF') ||
        e.message.includes('end of file') ||
        e.message.includes('Expected')
      );
      expect(eofError).toBeDefined();
    });
  });

  describe('Category 6: Regression guards - existing functionality', () => {
    it('should continue accepting CODEUNIT as identifier (Issue #297)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Codeunit@1 : Integer;
    BEGIN
      Codeunit := 42;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('Codeunit');
    });

    it('should continue accepting Table as identifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Table@1 : Integer;
    BEGIN
      Table := 18;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('Table');
    });

    it('should continue accepting Page as identifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Page@1 : Integer;
      result@2 : Integer;
    BEGIN
      result := Page;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(2);
      expect(procedure.variables[0].name).toBe('Page');
    });

    it('should continue accepting Report as identifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Report@1 : Integer;
    BEGIN
      Report := 5;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('Report');
    });

    it('should continue accepting XMLport as identifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      XMLport@1 : Integer;
    BEGIN
      XMLport := 1;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast!.object).toBeDefined();

      const procedure = ast!.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('XMLport');
    });
  });

  describe('Edge cases and mixed scenarios', () => {
    it('should handle multiple invalid tokens in same expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := ) + ];
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report multiple errors
      expect(errors.length).toBeGreaterThan(0);
      const delimErrors = errors.filter(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('cannot start') ||
        e.message.includes('invalid')
      );
      expect(delimErrors.length).toBeGreaterThan(0);
    });

    it('should differentiate between valid NOT operator and invalid IF keyword', () => {
      const code1 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Boolean;
      y@2 : Boolean;
    BEGIN
      x := NOT y;
    END;
  }
}`;
      const { errors: errors1 } = parseCode(code1);
      expect(errors1).toHaveLength(0); // NOT is valid unary operator

      const code2 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := IF;
    END;
  }
}`;
      const { errors: errors2 } = parseCode(code2);
      expect(errors2.length).toBeGreaterThan(0); // IF is invalid in expression
    });

    it('should allow minus as unary operator but reject bare multiply', () => {
      const code1 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
      y@2 : Integer;
    BEGIN
      x := -y;
    END;
  }
}`;
      const { errors: errors1 } = parseCode(code1);
      expect(errors1).toHaveLength(0); // Unary minus is valid

      const code2 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := *;
    END;
  }
}`;
      const { errors: errors2 } = parseCode(code2);
      expect(errors2.length).toBeGreaterThan(0); // Bare * is invalid
    });

    it('should handle control-flow keywords consistently with Issue #301', () => {
      // Issue #301 tests control-flow keywords (THEN, ELSE, DO, etc.)
      // This test ensures parsePrimary fallback aligns with that behavior
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x@1 : Integer;
    BEGIN
      x := THEN;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const keywordError = errors.find(e =>
        e.message.includes('Unexpected') ||
        e.message.includes('keyword') ||
        e.message.includes('THEN')
      );
      expect(keywordError).toBeDefined();
    });
  });
});
