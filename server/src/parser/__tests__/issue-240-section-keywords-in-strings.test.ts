/**
 * Regression tests for issue #240
 * Test: section keywords inside string literal property values
 *
 * Verifies that section keywords (ACTIONS, CONTROLS, ELEMENTS, etc.) appearing
 * inside string literal property values don't trigger incorrect section keyword
 * lookahead behavior.
 *
 * Defense-in-depth validation: The lexer tokenizes string literals as TokenType.String
 * (not as keyword tokens), and the parser checks token types (not string content) when
 * detecting section boundaries. This test verifies that the implementation correctly
 * handles this edge case.
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #240: Section keywords in string literals', () => {
  describe('ACTIONS keyword in property values', () => {
    it('should parse ACTIONS section correctly after PROPERTIES with "Actions" in CaptionML', () => {
      const code = `
        OBJECT Page 50000 "Test Page"
        {
          PROPERTIES
          {
            CaptionML=ENU='Please visit the Actions page';
          }
          ACTIONS
          {
            { 1   ;0   ;ActionContainer;
                        ActionContainerType=ActionItems }
            { 2   ;1   ;Action  ;
                        CaptionML=ENU=Run;
                        Promoted=Yes }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.properties?.properties).toHaveLength(1);
      expect(result.ast?.object?.properties?.properties[0].name).toBe('CaptionML');
      expect(result.ast?.object?.actions).toBeDefined();
      expect(result.ast?.object?.actions?.actions).toHaveLength(1);
      const actionContainer = result.ast?.object?.actions?.actions[0];
      expect(actionContainer?.children).toHaveLength(1);
    });

    it('should handle multiple instances of "Actions" in CaptionML across languages', () => {
      const code = `
        OBJECT Page 50001 "Multi-Language Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Actions Menu',
                      DEU='Aktionen Men\u00fc',
                      FRA='Menu Actions';
          }
          ACTIONS
          {
            { 1   ;0   ;Action  ;
                        CaptionML=ENU=Test }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.actions).toBeDefined();
    });

    it('should handle "Actions" in PromotedActionCategoriesML', () => {
      const code = `
        OBJECT Page 50002 "Promoted Actions Test"
        {
          PROPERTIES
          {
            PromotedActionCategoriesML=ENU='New,Process,Report,Actions,Navigate';
          }
          ACTIONS
          {
            { 1   ;0   ;Action  ;
                        CaptionML=ENU=Process }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.properties?.properties[0].name).toBe('PromotedActionCategoriesML');
      expect(result.ast?.object?.actions).toBeDefined();
    });
  });

  describe('CONTROLS keyword in property values', () => {
    it('should parse CONTROLS section correctly after PROPERTIES with "Controls" in CaptionML', () => {
      const code = `
        OBJECT Page 50003 "Controls Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Manage your Controls here';
          }
          CONTROLS
          {
            { 1   ;0   ;Container ;
                        ContainerType=ContentArea }
            { 2   ;1   ;Field     ;
                        SourceExpr="No." }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.controls).toBeDefined();
      expect(result.ast?.object?.controls?.controls).toHaveLength(1);
      const container = result.ast?.object?.controls?.controls[0];
      expect(container?.children).toHaveLength(1);
    });

    it('should handle "Controls" in multi-language properties', () => {
      const code = `
        OBJECT Page 50004 "ML Controls Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Controls Panel',
                      DEU='Steuerelemente';
          }
          CONTROLS
          {
            { 1   ;0   ;Field     ;
                        SourceExpr=Name }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.controls).toBeDefined();
    });
  });

  describe('ELEMENTS keyword in property values', () => {
    it('should parse ELEMENTS section correctly after PROPERTIES with "Elements" in CaptionML', () => {
      const code = `
        OBJECT XMLport 50005 "Elements Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Configure Elements in this XMLport';
          }
          ELEMENTS
          {
            { [{5CDBAF06-C7E1-4222-9633-B90B6840C9FC}];  ;Customer            ;Element ;Table   ;
                                                          SourceTable=Table18 }
            { [{DAE9B066-1422-4AE9-945C-77B8CC451316}];1 ;No                  ;Element ;Field   ;
                                                          SourceField=Customer::No. }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.elements).toBeDefined();
      expect(result.ast?.object?.elements?.elements).toHaveLength(1);
      const customer = result.ast?.object?.elements?.elements[0];
      expect(customer?.children).toHaveLength(1);
    });

    it('should handle "Elements" in ToolTipML', () => {
      const code = `
        OBJECT XMLport 50006 "Tooltip Elements"
        {
          PROPERTIES
          {
            CaptionML=ENU=Export;
            ToolTipML=ENU='Export data elements to XML';
          }
          ELEMENTS
          {
            { [{7CF8DF04-94D5-4C34-B4A3-D7EC243A1385}];  ;Data                ;Element ;Text     }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.elements).toBeDefined();
    });
  });

  describe('CODE keyword in property values', () => {
    it('should parse CODE section correctly after PROPERTIES with "Code" in CaptionML (Table)', () => {
      const code = `
        OBJECT Table 50007 "Code Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Code Management Table';
          }
          FIELDS
          {
            { 1   ;Code10      ;Code                ;CaptionML=ENU=Code }
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

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.code).toBeDefined();
      expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    });

    it('should parse CODE section correctly after PROPERTIES with "Code" in CaptionML (Codeunit)', () => {
      const code = `
        OBJECT Codeunit 50008 "Code Functions"
        {
          PROPERTIES
          {
            CaptionML=ENU='Code Utilities';
          }
          CODE
          {
            PROCEDURE Run@1();
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.code).toBeDefined();
    });
  });

  describe('DATASET keyword in property values', () => {
    it('should handle "Dataset" in Report CaptionML before DATASET section', () => {
      const code = `
        OBJECT Report 50009 "Dataset Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Dataset Export Report';
          }
          DATASET
          {
            { 1000 ;DataItem;               ;DataItemTable=Customer }
          }
        }
      `;

      const result = parseCode(code);

      // DATASET is skipped by parser but should not cause errors
      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
    });
  });

  describe('Multiple section keywords in same PROPERTIES', () => {
    it('should handle multiple section keywords in the same CaptionML value', () => {
      const code = `
        OBJECT Page 50010 "Multi-Keyword Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Actions, Controls, and Elements Configuration';
          }
          ACTIONS
          {
            { 1   ;0   ;Action  ;
                        CaptionML=ENU=Test }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.actions).toBeDefined();
    });

    it('should handle section keywords across multiple properties', () => {
      const code = `
        OBJECT Page 50011 "Multi-Property Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Actions Manager';
            ToolTipML=ENU='Manage controls and elements';
            InstructionalTextML=ENU='Configure dataset properties';
          }
          CONTROLS
          {
            { 1   ;0   ;Field     ;
                        SourceExpr=Name }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.properties?.properties).toHaveLength(3);
      expect(result.ast?.object?.controls).toBeDefined();
    });
  });

  describe('FIELDS and KEYS keywords in property values', () => {
    it('should handle "Fields" keyword in CaptionML', () => {
      const code = `
        OBJECT Table 50012 "Fields Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Table with Fields';
          }
          FIELDS
          {
            { 1   ;Code10      ;Code                ;CaptionML=ENU=Code }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.fields).toBeDefined();
    });

    it('should handle "Keys" keyword in CaptionML', () => {
      const code = `
        OBJECT Table 50013 "Keys Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Table Keys Definition';
          }
          FIELDS
          {
            { 1   ;Code10      ;Code                ;CaptionML=ENU=Code }
          }
          KEYS
          {
            {    ;Code                                ;Clustered=Yes }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.keys).toBeDefined();
    });

    it('should handle "Properties" keyword in CaptionML', () => {
      const code = `
        OBJECT Table 50014 "Properties Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Configure Properties here';
          }
          FIELDS
          {
            { 1   ;Code10      ;Code                ;CaptionML=ENU=Code }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
    });
  });

  describe('Integration: Complete objects with section keywords in strings', () => {
    it('should parse complete PAGE with all sections after keywords in strings', () => {
      const code = `
        OBJECT Page 50015 "Complete Page"
        {
          PROPERTIES
          {
            CaptionML=ENU='Page with Actions and Controls';
          }
          CONTROLS
          {
            { 1   ;0   ;Container ;
                        ContainerType=ContentArea }
            { 2   ;1   ;Field     ;
                        CaptionML=ENU='Fields and Keys';
                        SourceExpr="No." }
          }
          ACTIONS
          {
            { 1   ;0   ;ActionContainer;
                        ActionContainerType=ActionItems }
            { 2   ;1   ;Action  ;
                        CaptionML=ENU='Run Code';
                        Promoted=Yes }
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

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.controls).toBeDefined();
      expect(result.ast?.object?.actions).toBeDefined();
      expect(result.ast?.object?.code).toBeDefined();
    });

    it('should parse complete XMLPORT with keywords in properties', () => {
      const code = `
        OBJECT XMLport 50016 "Complete XMLport"
        {
          PROPERTIES
          {
            CaptionML=ENU='XMLport with Elements and Dataset';
          }
          ELEMENTS
          {
            { [{0538A0EB-2372-43D4-B37C-BFDEA0F605CE}];  ;Root                ;Element ;Text     }
            { [{A75DC6DE-02B6-4719-B43E-3C90D19B3BE5}];1 ;Customer            ;Element ;Table   ;
                                                          SourceTable=Table18 }
            { [{DAE9B066-1422-4AE9-945C-77B8CC451316}];2 ;Code                ;Attribute;Field  ;
                                                          SourceField=Customer::Code }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties).toBeDefined();
      expect(result.ast?.object?.elements).toBeDefined();
      expect(result.ast?.object?.elements?.elements).toHaveLength(1);
      const root = result.ast?.object?.elements?.elements[0];
      expect(root?.children).toHaveLength(1);
      const customer = root?.children?.[0];
      expect(customer?.children).toHaveLength(1);
    });
  });

  describe('Real-world patterns from NAV codebase', () => {
    it('should handle PromotedActionCategoriesML pattern (similar to PAG6213182)', () => {
      const code = `
        OBJECT Page 50017 "Action Categories"
        {
          PROPERTIES
          {
            PromotedActionCategoriesML=ENU='New,Process,Report,Navigate,Actions';
            InstructionalTextML=ENU='Use the Actions menu to perform tasks';
          }
          ACTIONS
          {
            { 1   ;0   ;ActionGroup;
                        CaptionML=ENU=Actions }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.actions).toBeDefined();
    });

    it('should handle field with "Code" in name and CaptionML (similar to TAB5218)', () => {
      const code = `
        OBJECT Table 50018 "SWIFT Code Table"
        {
          PROPERTIES
          {
            CaptionML=ENU='SWIFT Code Configuration';
          }
          FIELDS
          {
            { 1   ;Code20      ;SWIFT Code          ;CaptionML=ENU='SWIFT Code' }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.fields).toBeDefined();
      expect(result.ast?.object?.code).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle section keyword as the entire property value', () => {
      const code = `
        OBJECT Page 50019 "Edge Case Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Actions';
          }
          ACTIONS
          {
            { 1   ;0   ;Action  ;
                        CaptionML=ENU=Test }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.properties?.properties[0].value).toContain('Actions');
      expect(result.ast?.object?.actions).toBeDefined();
    });

    it('should handle consecutive section keywords in property value', () => {
      const code = `
        OBJECT Page 50020 "Consecutive Keywords"
        {
          PROPERTIES
          {
            CaptionML=ENU='Actions Controls Elements Code';
          }
          ACTIONS
          {
            { 1   ;0   ;Action  ;
                        CaptionML=ENU=Test }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.actions).toBeDefined();
    });

    it('should handle section keywords at property value boundaries', () => {
      const code = `
        OBJECT Page 50021 "Boundary Test"
        {
          PROPERTIES
          {
            CaptionML=ENU='Actions',
                      DEU='Controls',
                      FRA='Elements';
          }
          CONTROLS
          {
            { 1   ;0   ;Field     ;
                        SourceExpr=Name }
          }
        }
      `;

      const result = parseCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast?.object?.controls).toBeDefined();
    });
  });
});
