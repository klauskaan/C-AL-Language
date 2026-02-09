/**
 * Tests for MENUNODES section keyword in MenuSuite objects
 *
 * Issue #266: MenuNodes missing from parser's isSectionKeyword()
 *
 * Bug: When a MenuSuite object has a MENUNODES section, any sections appearing
 * AFTER MENUNODES (like CODE) are silently dropped. The parser's section parsing
 * loop breaks when encountering MENUNODES because it's not in the isSectionKeyword()
 * method.
 *
 * MenuSuite structure:
 * ```
 * OBJECT MenuSuite 1 Navigation
 * {
 *   PROPERTIES { ... }
 *   MENUNODES { ... }    // Menu items - should be skipped
 *   CODE { ... }         // Should be parsed normally
 * }
 * ```
 *
 * Expected behavior: MENUNODES should be treated like DATASET/REQUESTPAGE/LABELS
 * - Skip the section content (complex nested structure)
 * - Continue parsing subsequent sections like CODE
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - MenuSuite MENUNODES section', () => {
  describe('CODE section after MENUNODES (PRIMARY BUG)', () => {
    it('should parse CODE section after MENUNODES section', () => {
      const source = `
        OBJECT MenuSuite 1 Navigation
        {
          PROPERTIES
          {
            CaptionML=ENU=Navigation;
          }
          MENUNODES
          {
            { ;1 ;MenuItem ;Root }
            { ;2 ;MenuItem ;Item1 ;1 }
          }
          CODE
          {
            PROCEDURE TestProc@1();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      // Parse
      const { ast, errors } = parseCode(source);

      // Should have zero errors
      expect(errors).toHaveLength(0);

      // CODE section should be parsed (NOT null)
      // BUG: Currently ast.object?.code will be null because parser breaks
      // when encountering MENUNODES (not in isSectionKeyword())
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Multiple sections with MENUNODES', () => {
    it('should handle PROPERTIES, MENUNODES, and CODE in order', () => {
      const source = `
        OBJECT MenuSuite 50000 Test
        {
          PROPERTIES
          {
            CaptionML=ENU=Test Suite;
          }
          MENUNODES
          {
            { ;1 ;Group ;TestGroup }
          }
          CODE
          {
            PROCEDURE Init@1000();
            BEGIN
            END;

            PROCEDURE Cleanup@1001();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors).toHaveLength(0);
      expect(ast.object).not.toBeNull();
      expect(ast.object?.properties).not.toBeNull();
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(2);
    });
  });

  describe('MENUNODES with nested braces', () => {
    it('should correctly skip MENUNODES section with nested braces', () => {
      const source = `
        OBJECT MenuSuite 1 Nav
        {
          MENUNODES
          {
            { ;1 ;MenuItem ;Item1 }
            { ;2 ;Group ;GroupName
                  { PropertyName=PropertyValue }
            }
          }
          CODE
          {
            PROCEDURE Test@1();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors).toHaveLength(0);
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
    });
  });

  describe('Regression test - MenuNodes as identifier (should still work)', () => {
    it('should allow MenuNodes as procedure name', () => {
      const source = `
        OBJECT Codeunit 50000 Test
        {
          CODE
          {
            PROCEDURE MenuNodes@1();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors).toHaveLength(0);
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('MenuNodes');
    });
  });

  describe('Real-world MenuSuite patterns', () => {
    it('should parse MenuSuite with complex menu hierarchy', () => {
      const source = `
        OBJECT MenuSuite 1 "Main Menu"
        {
          PROPERTIES
          {
            CaptionML=ENU=Departments;
          }
          MENUNODES
          {
            { ;     ;MenuItem ;Root }
            { ;1    ;Group    ;Financial Management }
            { ;1000 ;MenuItem ;General Ledger      ;1    ;RunObject=Page 18;
                                                          CaptionML=ENU=General Ledger }
            { ;1100 ;MenuItem ;Receivables         ;1    ;RunObject=Page 22 }
            { ;2    ;Group    ;Sales & Marketing }
            { ;2000 ;MenuItem ;Customers           ;2    ;RunObject=Page 22 }
            { ;2100 ;MenuItem ;Sales Orders        ;2    ;RunObject=Page 9305 }
          }
          CODE
          {
            VAR
              LastUsedMenu@1000 : Integer;

            PROCEDURE GetLastMenu@1() : Integer;
            BEGIN
              EXIT(LastUsedMenu);
            END;

            PROCEDURE SetLastMenu@2(MenuId : Integer);
            BEGIN
              LastUsedMenu := MenuId;
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      // Should parse without errors
      expect(errors).toHaveLength(0);
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.variables).toHaveLength(1);
      expect(ast.object?.code?.variables?.[0].name).toBe('LastUsedMenu');
      expect(ast.object?.code?.procedures).toHaveLength(2);
      expect(ast.object?.code?.procedures?.[0].name).toBe('GetLastMenu');
      expect(ast.object?.code?.procedures?.[1].name).toBe('SetLastMenu');
    });
  });
});
