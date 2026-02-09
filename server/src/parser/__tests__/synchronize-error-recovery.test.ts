/**
 * Tests for synchronize() error recovery at unsupported section boundaries
 *
 * Issue #268: synchronize() missing 8 unsupported section keywords as recovery points
 *
 * Bug: The synchronize() method (error recovery) only recognizes 6 section keywords:
 * - Properties, Fields, Keys, FieldGroups, Code, Controls
 *
 * Missing 8 unsupported section keywords:
 * - MenuNodes, Actions, DataItems, Dataset, RequestPage, Labels, Elements, RequestForm
 *
 * Impact: When a parse error occurs before an unsupported section, synchronize()
 * doesn't recognize it as a recovery point and may skip past it, consuming
 * subsequent sections.
 *
 * Test Strategy:
 * 1. Create intentional parse error (missing = in property assignment)
 * 2. Place error BEFORE an unsupported section keyword
 * 3. Follow with a CODE section
 * 4. Verify CODE section is still parsed (proves synchronize() stopped correctly)
 *
 * Note: Using "PropertyName" (missing =) as error pattern because:
 * - "PropertyName=;" is VALID (empty value with whitespace)
 * - "PropertyName" is INVALID (missing = operator)
 * - Consistently triggers parse error and invokes synchronize()
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - synchronize() error recovery at section boundaries', () => {
  describe('Regression test - Issue #268', () => {
    it('should stop at MENUNODES boundary instead of consuming to CODE', () => {
      // Minimal regression test demonstrating the original bug
      // Before fix: synchronize() would skip past MENUNODES and stop at CODE
      // After fix: synchronize() stops at MENUNODES, allowing normal parsing
      const source = `
        OBJECT MenuSuite 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          MENUNODES
          {
            { ;1 ;MenuItem ;TestItem }
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

      const { ast, errors } = parseCode(source);

      // Error should occur in PROPERTIES (missing =)
      expect(errors.length).toBeGreaterThan(0);

      // Before fix: CODE section would be lost/malformed
      // After fix: CODE section is parsed correctly
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('MenuNodes section as recovery point', () => {
    it('should stop error recovery at MENUNODES section boundary', () => {
      const source = `
        OBJECT MenuSuite 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          MENUNODES
          {
            { ;1 ;MenuItem ;TestItem }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at MENUNODES, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Actions section as recovery point', () => {
    it('should stop error recovery at ACTIONS section boundary', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          ACTIONS
          {
            { 1;0;ActionContainer;
              ActionContainerType=NewDocumentItems }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at ACTIONS, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Dataset section as recovery point', () => {
    it('should stop error recovery at DATASET section boundary', () => {
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          DATASET
          {
            { 1000;DataItem;               ;DataItemTable=Customer }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at DATASET, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('RequestPage section as recovery point', () => {
    it('should stop error recovery at REQUESTPAGE section boundary', () => {
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          REQUESTPAGE
          {
            CONTROLS
            {
              { 1;0;Container }
            }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at REQUESTPAGE, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Labels section as recovery point', () => {
    it('should stop error recovery at LABELS section boundary', () => {
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          LABELS
          {
            { 1000;Label;Test_Lbl;
              CaptionML=ENU=Test }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at LABELS, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Elements section as recovery point', () => {
    it('should stop error recovery at ELEMENTS section boundary', () => {
      const source = `
        OBJECT XMLport 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          ELEMENTS
          {
            { 1;Element;Root }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at ELEMENTS, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('RequestForm section as recovery point', () => {
    it('should stop error recovery at REQUESTFORM section boundary', () => {
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            InvalidProperty
          }
          REQUESTFORM
          {
            PROPERTIES
            {
              Width=9020;
              Height=3410;
            }
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

      const { ast, errors } = parseCode(source);

      // Should have errors (the PROPERTIES syntax error - missing =)
      expect(errors.length).toBeGreaterThan(0);

      // CODE section should still be parsed (synchronize stopped at REQUESTFORM, not CODE)
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Multiple unsupported sections in sequence', () => {
    it('should stop at first unsupported section when multiple are in sequence', () => {
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            CaptionML
          }
          LABELS
          {
            { 1;Label1;CaptionML=ENU=Test }
          }
          DATASET
          {
            { 1;Column1 }
          }
          REQUESTPAGE
          {
          }
          CODE
          {
            PROCEDURE GetData@1();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
    });
  });

  describe('Error recovery with mixed section types', () => {
    it('should recover through both supported and unsupported sections', () => {
      // Error before PROPERTIES (supported), followed by DATASET (unsupported), then CODE
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            InvalidSyntax
          }
          DATASET
          {
            { 1000;DataItem;               ;DataItemTable=Customer }
          }
          CODE
          {
            VAR
              TestVar@1000 : Integer;

            PROCEDURE Process@1();
            BEGIN
              TestVar := 1;
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.variables).toHaveLength(1);
      expect(ast.object?.code?.procedures).toHaveLength(1);
    });
  });

  describe('skipUnsupportedSection() - errors within unsupported sections', () => {
    // These tests verify skipUnsupportedSection() functionality, not synchronize()
    // They parse objects WITHOUT errors before the unsupported section

    it('should skip DATASET section with malformed content and continue to CODE', () => {
      // Malformed entry within DATASET - skipUnsupportedSection should handle it
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            CaptionML=ENU=Test;
          }
          DATASET
          {
            { 1000;INVALID_TYPE;               ;DataItemTable=Customer }
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

      const { ast } = parseCode(source);

      // Should skip DATASET section (even if malformed) and parse CODE
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });

    it('should skip REQUESTPAGE section with malformed content and continue to CODE', () => {
      // Malformed control within REQUESTPAGE
      const source = `
        OBJECT Report 50000 Test
        {
          PROPERTIES
          {
            CaptionML=ENU=Test;
          }
          REQUESTPAGE
          {
            CONTROLS
            {
              { INVALID;0;Container }
            }
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

      const { ast } = parseCode(source);

      // Should skip REQUESTPAGE section (even if malformed) and parse CODE
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });
  });

  describe('Real-world error scenarios', () => {
    it('should handle complex report with error before all report sections', () => {
      // Simulates a real-world report with incomplete/malformed property (missing =)
      const source = `
        OBJECT Report 50001 "Sales Report"
        {
          PROPERTIES
          {
            CaptionML=ENU=Sales Report;
            ProcessingOnly
          }
          DATASET
          {
            { 1000;DataItem;Customer         ;DataItemTable=Customer }
            { 1001;Column;No                 ;SourceExpr="No." }
          }
          REQUESTPAGE
          {
            PROPERTIES
            {
              CaptionML=ENU=Options;
            }
            CONTROLS
            {
              { 1;0;Container;
                ContainerType=ContentArea }
            }
          }
          LABELS
          {
            { 1000;Label;Report_Title_Lbl;
              CaptionML=ENU=Sales Report }
          }
          CODE
          {
            VAR
              TotalSales@1000 : Decimal;

            PROCEDURE CalculateTotal@1();
            BEGIN
              TotalSales := 0;
            END;

            PROCEDURE PrintReport@2();
            BEGIN
              MESSAGE('Printing...');
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      // Should have error about the malformed property (missing =)
      expect(errors.length).toBeGreaterThan(0);

      // Should still parse CODE section successfully
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.variables).toHaveLength(1);
      expect(ast.object?.code?.variables?.[0].name).toBe('TotalSales');
      expect(ast.object?.code?.procedures).toHaveLength(2);
      expect(ast.object?.code?.procedures?.[0].name).toBe('CalculateTotal');
      expect(ast.object?.code?.procedures?.[1].name).toBe('PrintReport');
    });

    it('should handle Page with error before ACTIONS and CODE', () => {
      // Malformed property in page (missing =)
      const source = `
        OBJECT Page 50000 "Customer Card"
        {
          PROPERTIES
          {
            CaptionML=ENU=Customer Card;
            SourceTable
          }
          ACTIONS
          {
            { 1;0;ActionContainer;
              ActionContainerType=ActionItems }
            { 2;1;Action;
              Name=PostAction;
              CaptionML=ENU=Post }
          }
          CODE
          {
            VAR
              RecRef@1000 : RecordRef;

            PROCEDURE OnOpenPage@1();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.variables).toHaveLength(1);
      expect(ast.object?.code?.procedures).toHaveLength(1);
    });

    it('should handle MenuSuite with error before MENUNODES', () => {
      // Invalid property in MenuSuite (missing =)
      const source = `
        OBJECT MenuSuite 1 Navigation
        {
          PROPERTIES
          {
            CaptionML=ENU=Navigation;
            InvalidProp
          }
          MENUNODES
          {
            { ;1 ;MenuItem ;Root }
            { ;1000 ;Group ;Sales }
            { ;1001 ;MenuItem ;Customers ;1000 ;RunObject=Page 22 }
          }
          CODE
          {
            PROCEDURE GetMenuState@1() : Integer;
            BEGIN
              EXIT(1);
            END;

            BEGIN
            END.
          }
        }
      `;

      const { ast, errors } = parseCode(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('GetMenuState');
    });
  });
});
