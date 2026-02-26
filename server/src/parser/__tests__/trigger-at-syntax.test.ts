/**
 * Parser Tests: Trigger @number Syntax
 *
 * Tests parsing of trigger declarations with @number suffix for auto-numbering.
 *
 * Issue #580: Parser fails to handle @number suffix in TRIGGER declarations.
 * Triggers like `TRIGGER OnInsert@1()` should parse identically to procedures
 * with @number syntax (e.g., `PROCEDURE MyProc@1()`).
 *
 * Real NAV pattern: Triggers can have @number suffixes just like procedures.
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - Trigger @number Syntax', () => {
  describe('Basic trigger with @number suffix', () => {
    it('should parse trigger with @1 suffix and extract name without suffix', () => {
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnInsert@1();
          VAR
            x : Integer;
          BEGIN
            x := 5;
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const table = ast.object as any;
      expect(table.code).toBeDefined();
      expect(table.code.triggers).toHaveLength(1);

      const trigger = table.code.triggers[0];
      expect(trigger.type).toBe('TriggerDeclaration');
      expect(trigger.name).toBe('OnInsert');  // Name should NOT include @1

      // Verify trigger has VAR section
      expect(trigger.variables).toHaveLength(1);
      expect(trigger.variables[0].name).toBe('x');
      expect(trigger.variables[0].dataType.typeName).toBe('Integer');

      // Verify trigger has body with statements
      expect(trigger.body).toBeDefined();
      expect(trigger.body.length).toBeGreaterThan(0);
    });

    it('should parse trigger with @1000 suffix (higher number)', () => {
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnModify@1000();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      expect(table.code.triggers).toHaveLength(1);
      expect(table.code.triggers[0].name).toBe('OnModify');
    });

    it('should parse trigger with @number and no parentheses', () => {
      // Some C/AL code omits parentheses on triggers without parameters
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnDelete@5;
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      expect(table.code.triggers).toHaveLength(1);
      expect(table.code.triggers[0].name).toBe('OnDelete');
    });
  });

  describe('Field triggers with @number suffix', () => {
    it('should parse field trigger OnValidate with @number', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; MyField ; Integer }
        }
        CODE {
          TRIGGER OnValidate@100();
          VAR
            isValid : Boolean;
          BEGIN
            isValid := TRUE;
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      expect(table.code.triggers).toHaveLength(1);

      const trigger = table.code.triggers[0];
      expect(trigger.name).toBe('OnValidate');
      expect(trigger.variables).toHaveLength(1);
      expect(trigger.variables[0].name).toBe('isValid');
      expect(trigger.body.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple triggers with @number suffixes', () => {
    it('should parse multiple triggers each with different @numbers', () => {
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnInsert@1();
          BEGIN
          END;

          TRIGGER OnModify@2();
          BEGIN
          END;

          TRIGGER OnDelete@3();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      expect(table.code.triggers).toHaveLength(3);

      expect(table.code.triggers[0].name).toBe('OnInsert');
      expect(table.code.triggers[1].name).toBe('OnModify');
      expect(table.code.triggers[2].name).toBe('OnDelete');
    });
  });

  describe('Triggers without @number suffix (baseline)', () => {
    it('should still parse trigger without @number suffix', () => {
      // Ensure we don't break existing syntax
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnInsert();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      expect(table.code.triggers).toHaveLength(1);
      expect(table.code.triggers[0].name).toBe('OnInsert');
    });
  });

  describe('Edge cases', () => {
    it('should parse trigger with @number followed by semicolon (no parentheses)', () => {
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnRename@999;
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      expect(table.code.triggers).toHaveLength(1);
      expect(table.code.triggers[0].name).toBe('OnRename');
    });

    it('should parse trigger @number with complex body', () => {
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnInsert@1();
          VAR
            a : Integer;
            b : Text[50];
            c : Boolean;
          BEGIN
            a := 10;
            b := 'Test';
            c := TRUE;
            IF a > 5 THEN
              MESSAGE('Value is %1', a);
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;
      const trigger = table.code.triggers[0];

      expect(trigger.name).toBe('OnInsert');
      expect(trigger.variables).toHaveLength(3);
      expect(trigger.body.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed triggers and procedures with @number', () => {
    it('should parse both triggers and procedures with @number syntax', () => {
      const code = `OBJECT Table 50000 Test {
        CODE {
          TRIGGER OnInsert@1();
          BEGIN
          END;

          PROCEDURE MyProc@10();
          BEGIN
          END;

          TRIGGER OnModify@2();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const table = ast.object as any;

      expect(table.code.triggers).toHaveLength(2);
      expect(table.code.triggers[0].name).toBe('OnInsert');
      expect(table.code.triggers[1].name).toBe('OnModify');

      expect(table.code.procedures).toHaveLength(1);
      expect(table.code.procedures[0].name).toBe('MyProc');
    });
  });
});
