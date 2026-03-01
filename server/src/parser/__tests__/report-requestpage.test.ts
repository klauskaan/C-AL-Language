/**
 * Tests for REQUESTPAGE SourceTable extraction in Report objects (Issue #669)
 *
 * When a Report has a REQUESTPAGE section with a SourceTable property in
 * its PROPERTIES sub-section, the parser should extract the table ID and
 * store it on the ObjectDeclaration as `requestPageSourceTableId`.
 *
 * Real NAV REQUESTPAGE structure:
 * ```
 * REQUESTPAGE
 * {
 *   PROPERTIES
 *   {
 *     SourceTable=Table18;
 *   }
 *   CONTROLS
 *   {
 *     ...
 *   }
 * }
 * ```
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - Report REQUESTPAGE SourceTable extraction', () => {
  it('should extract requestPageSourceTableId when REQUESTPAGE has SourceTable', () => {
    const code = `OBJECT Report 50000 "Test Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Test Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table5767;
    }
    CONTROLS
    {
      { 1   ;0   ;Container ;
                  ContainerType=ContentArea }
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const result = parseCode(code);

    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.requestPageSourceTableId).toBe(5767);
  });

  it('should return undefined requestPageSourceTableId when REQUESTPAGE has no SourceTable', () => {
    const code = `OBJECT Report 50001 "Report No SourceTable"
{
  PROPERTIES
  {
    CaptionML=ENU=Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SaveValues=Yes;
    }
    CONTROLS
    {
      { 1   ;0   ;Container ;
                  ContainerType=ContentArea }
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const result = parseCode(code);

    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.requestPageSourceTableId).toBeUndefined();
  });

  it('should return undefined requestPageSourceTableId when there is no REQUESTPAGE section', () => {
    const code = `OBJECT Report 50002 "Report No RequestPage"
{
  PROPERTIES
  {
    CaptionML=ENU=Report;
  }
  DATASET
  {
    { 1000 ;DataItem;               ;DataItemTable=Customer }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const result = parseCode(code);

    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.requestPageSourceTableId).toBeUndefined();
  });

  it('should still extract SourceTable when REQUESTPAGE has trigger properties before SourceTable', () => {
    const code = `OBJECT Report 50003 "Report With Triggers"
{
  PROPERTIES
  {
    CaptionML=ENU=Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      OnOpenPage=BEGIN
                   SetDefaultFilters;
                 END;
      SourceTable=Table18;
    }
    CONTROLS
    {
      { 1   ;0   ;Container ;
                  ContainerType=ContentArea }
    }
  }
  CODE
  {
    PROCEDURE SetDefaultFilters@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

    const result = parseCode(code);

    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.requestPageSourceTableId).toBe(18);
  });

  it('should parse report with REQUESTPAGE, DATASET, and CODE sections together and set requestPageSourceTableId', () => {
    const code = `OBJECT Report 50004 "Complete Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Complete Report;
  }
  DATASET
  {
    { 1000 ;DataItem;               ;DataItemTable=Customer;
                                     OnPreDataItem=BEGIN
                                       SetFilter("No.",'C*');
                                     END;
                                      }
    { 1001 ;Column ;Customer_No     ;SourceExpr="No." }
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table79;
    }
    CONTROLS
    {
      { 1   ;0   ;Container ;
                  ContainerType=ContentArea }

      { 2   ;1   ;Field     ;
                  Name=ShowAll;
                  CaptionML=ENU=Show All;
                  SourceExpr=ShowAll }
    }
  }
  CODE
  {
    VAR
      ShowAll@1000 : Boolean;

    PROCEDURE Init@1();
    BEGIN
      ShowAll := FALSE;
    END;

    BEGIN
    END.
  }
}`;

    const result = parseCode(code);

    expect(result.errors).toHaveLength(0);
    // REQUESTPAGE SourceTable is extracted
    expect(result.ast?.object?.requestPageSourceTableId).toBe(79);
    // DATASET and CODE sections still parse correctly
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('ShowAll');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('Init');
  });

  it('should gracefully handle REQUESTPAGE SourceTable with space variant (Table 79)', () => {
    // NAV standard format uses Table79 (no space), but handle space variant defensively.
    // Acceptable outcomes: returns 79 (parsed) or undefined (graceful degradation).
    const code = `OBJECT Report 50005 "Space Variant Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table 79;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const result = parseCode(code);

    // Should not crash and should not produce errors from this property
    expect(result.ast?.object).not.toBeNull();
    // requestPageSourceTableId is either 79 (parsed) or undefined (graceful degradation)
    const id = result.ast?.object?.requestPageSourceTableId;
    expect(id === 79 || id === undefined).toBe(true);
  });
});
