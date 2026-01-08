/**
 * Tests for skipUnsupportedSection() method
 *
 * This tests the parser's ability to skip unsupported sections (CONTROLS, ACTIONS)
 * that contain complex nested structures including BEGIN...END blocks in property triggers.
 *
 * Regression test for issue #50: Parser was using brace counting which failed when
 * property triggers contained BEGIN...END blocks (lexer tokenizes braces differently
 * in CODE_BLOCK context).
 */

import { parseCode } from '../parser';

describe('Parser - skipUnsupportedSection with BEGIN...END blocks', () => {
  it('should skip CONTROLS section with simple properties', () => {
    const code = `
      OBJECT Page 50000 Test
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }
        }
        CODE
        {
          VAR
            MyVar@1001 : Integer;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('MyVar');
  });

  it('should skip CONTROLS section with BEGIN...END in property trigger', () => {
    const code = `
      OBJECT Page 50001 TestWithTrigger
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }

          { 2   ;1   ;Field     ;
                      SourceExpr=MyField;
                      OnValidate=BEGIN
                        Message('Validated');
                      END;
                       }
        }
        CODE
        {
          VAR
            TotalAmount@1003 : Decimal;
            Customer@1001 : Record 18;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(2);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('TotalAmount');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('Customer');
  });

  it('should skip CONTROLS section with multiple BEGIN...END blocks', () => {
    const code = `
      OBJECT Page 50002 TestMultipleTriggers
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }

          { 2   ;1   ;Field     ;
                      SourceExpr=Field1;
                      OnValidate=BEGIN
                        DoSomething;
                      END;

                      OnLookup=BEGIN
                        DoLookup;
                      END;

                      OnDrillDown=BEGIN
                        DoDrillDown;
                      END;
                       }
        }
        CODE
        {
          VAR
            ItemTrackingLine@1009 : TEMPORARY Record 336;
            Item@1004 : Record 27;
            NoSeriesMgt@1030 : Codeunit 396;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(3);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('ItemTrackingLine');
    expect(result.ast?.object?.code?.variables?.[0].isTemporary).toBe(true);
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('Item');
    expect(result.ast?.object?.code?.variables?.[2].name).toBe('NoSeriesMgt');
  });

  it('should skip CONTROLS section with nested braces in expressions', () => {
    const code = `
      OBJECT Page 50003 TestNestedBraces
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }

          { 2   ;1   ;Field     ;
                      SourceExpr=Amount;
                      OnValidate=BEGIN
                        IF Quantity <> 0 THEN BEGIN
                          Amount := Price * Quantity;
                        END;
                      END;
                       }
        }
        CODE
        {
          VAR
            Price@1001 : Decimal;
            Quantity@1002 : Decimal;
            Amount@1003 : Decimal;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(3);
  });

  it('should skip ACTIONS section with BEGIN...END blocks', () => {
    const code = `
      OBJECT Page 50004 TestActions
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }
        }
        ACTIONS
        {
          { 2   ;0   ;ActionContainer;
                      ActionContainerType=ActionItems }

          { 3   ;1   ;Action    ;
                      Name=MyAction;
                      CaptionML=ENU=Run Action;
                      OnAction=BEGIN
                        Message('Action executed');
                      END;
                       }
        }
        CODE
        {
          VAR
            ActionResult@1001 : Boolean;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('ActionResult');
  });

  it('should skip multiple unsupported sections in sequence', () => {
    const code = `
      OBJECT Page 50005 TestMultipleSections
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea;
                      OnInit=BEGIN
                        InitControls;
                      END;
                       }
        }
        ACTIONS
        {
          { 2   ;0   ;ActionContainer;
                      ActionContainerType=ActionItems }

          { 3   ;1   ;Action    ;
                      OnAction=BEGIN
                        DoAction;
                      END;
                       }
        }
        CODE
        {
          VAR
            ControlInitialized@1001 : Boolean;
            ActionExecuted@1002 : Boolean;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(2);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('ControlInitialized');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('ActionExecuted');
  });

  it('should handle TEMPORARY keyword with @ numbering after skipped sections', () => {
    const code = `
      OBJECT Page 50006 TestTemporary
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea;
                      OnValidate=BEGIN
                        Validate;
                      END;
                       }
        }
        CODE
        {
          VAR
            xTempItemTrackingLine@1009 : TEMPORARY Record 336;
            TempItemTrackLineInsert@1054 : TEMPORARY Record 336;
            TempItemTrackLineModify@1055 : TEMPORARY Record 336;
            Item@1004 : Record 27;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(4);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('xTempItemTrackingLine');
    expect(result.ast?.object?.code?.variables?.[0].isTemporary).toBe(true);
    expect(result.ast?.object?.code?.variables?.[1].isTemporary).toBe(true);
    expect(result.ast?.object?.code?.variables?.[2].isTemporary).toBe(true);
    expect(result.ast?.object?.code?.variables?.[3].isTemporary).toBe(false);
  });

  it('should handle INDATASET modifier with @ numbering after skipped sections', () => {
    const code = `
      OBJECT Page 50007 TestInDataSet
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Page;
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
        }
        CODE
        {
          VAR
            DescriptionIndent@1001 : Integer INDATASET;
            StyleIsStrong@1000 : Boolean INDATASET;
            Amount@1002 : Decimal;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(3);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('DescriptionIndent');
    expect(result.ast?.object?.code?.variables?.[0].isInDataSet).toBe(true);
    expect(result.ast?.object?.code?.variables?.[1].isInDataSet).toBe(true);
    expect(result.ast?.object?.code?.variables?.[2].isInDataSet).toBe(false);
  });

  it('should handle TABLE objects with CODE section', () => {
    const code = `
      OBJECT Table 50000 TestTable
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Test Table;
        }
        FIELDS
        {
          { 1   ;   ;No.                 ;Code20        }
          { 2   ;   ;Description         ;Text50        }
        }
        KEYS
        {
          { ;No.                                        ;Clustered=Yes }
        }
        CODE
        {
          VAR
            CannotDeleteErr@1000 : TextConst 'ENU=Cannot delete';
            Job@1003 : Record 167;
            DimMgt@1001 : Codeunit 408;
        }
      }
    `;

    const result = parseCode(code);
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(3);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('CannotDeleteErr');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('Job');
    expect(result.ast?.object?.code?.variables?.[2].name).toBe('DimMgt');
  });

  it('should parse real-world pattern from PAG6510 reproduction', () => {
    // Simplified reproduction of the actual failing case from PAG6510.TXT
    const code = `
      OBJECT Page 6510 ItemTrackingLines
      {
        OBJECT-PROPERTIES
        {
          Date=01/01/24;
          Time=12:00:00;
        }
        PROPERTIES
        {
          CaptionML=ENU=Item Tracking Lines;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }

          { 2   ;1   ;Field     ;
                      SourceExpr="Serial No.";
                      OnValidate=BEGIN
                        SerialNoOnAfterValidate;
                      END;
                       }

          { 3   ;2   ;Field     ;
                      SourceExpr="Lot No.";
                      OnValidate=BEGIN
                        LotNoOnAfterValidate;
                      END;
                       }
        }
        CODE
        {
          VAR
            xTempItemTrackingLine@1009 : TEMPORARY Record 336;
            TotalItemTrackingLine@1003 : Record 336;
            TempItemTrackLineInsert@1054 : TEMPORARY Record 336;
            TempItemTrackLineModify@1055 : TEMPORARY Record 336;
            TempItemTrackLineDelete@1056 : TEMPORARY Record 336;
            TempItemTrackLineReserv@1060 : TEMPORARY Record 336;
            Item@1004 : Record 27;
            ItemTrackingCode@1005 : Record 6502;
            TempReservEntry@1015 : TEMPORARY Record 337;
            NoSeriesMgt@1030 : Codeunit 396;
            ItemTrackingMgt@1020 : Codeunit 6500;
        }
      }
    `;

    const result = parseCode(code);

    // The key assertion: no "Expected =" errors
    expect(result.errors).toHaveLength(0);

    // Verify all variables parsed correctly
    expect(result.ast?.object?.code?.variables).toHaveLength(11);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('xTempItemTrackingLine');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('TotalItemTrackingLine');
    expect(result.ast?.object?.code?.variables?.[10].name).toBe('ItemTrackingMgt');
  });

  it('should skip CONTROLS and detect CODE section with "Code" false positives inside', () => {
    // REGRESSION TEST for Issue #50
    // This reproduces the exact PAG6510 pattern that was failing:
    // - CONTROLS section has "Code" in field names/captions (false positives)
    // - Real CODE section follows CONTROLS
    // - The bug: skipUnsupportedSection() was not detecting the real CODE section
    //   because isSectionKeyword() had a broken while loop searching for non-existent
    //   Whitespace/NewLine tokens
    const code = `OBJECT Page 6510 Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test;
    DataCaptionFields=Item No.,Variant Code,Description;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                  ContainerType=ContentArea;
                  Variant Code=FIELD(Variant Code) }

    { 2   ;1   ;Field     ;
                  CaptionML=[ENU=Variant Code];
                  ToolTipML=[ENU=Item Tracking Code];
                  SourceExpr="Variant Code" }

    { 3   ;1   ;Field     ;
                  CaptionML=[ENU=Item Tracking Code];
                  SourceExpr=ItemTrackingCode.Code;
                  Editable=FALSE }
  }
  CODE
  {
    VAR
      MyVar@1000 : Integer;
      ForBinCode@1043 : Code[20];

    PROCEDURE Test@1();
    BEGIN
    END;
  }
}`;

    const result = parseCode(code);

    // Should detect CODE section (this was failing before the fix!)
    expect(result.ast?.object?.code).toBeDefined();

    // Should have no "Expected =" errors from trying to parse CONTROLS content as CODE
    const expectedEqualErrors = result.errors.filter(e => e.message.includes('Expected ='));
    expect(expectedEqualErrors).toHaveLength(0);

    // Should have the variables from CODE section
    expect(result.ast?.object?.code?.variables).toBeDefined();
    expect(result.ast?.object?.code?.variables).toHaveLength(2);
    expect(result.ast?.object?.code?.variables?.[0]?.name).toBe('MyVar');
    expect(result.ast?.object?.code?.variables?.[1]?.name).toBe('ForBinCode');

    // Should have the procedure
    expect(result.ast?.object?.code?.procedures).toBeDefined();
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0]?.name).toBe('Test');
  });
});
