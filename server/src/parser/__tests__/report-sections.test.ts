/**
 * Tests for DATASET, REQUESTPAGE, and LABELS section keywords in Report objects
 *
 * The lexer should tokenize:
 * - DATASET → TokenType.Dataset (not IDENTIFIER)
 * - REQUESTPAGE → TokenType.RequestPage (not IDENTIFIER)
 * - LABELS → TokenType.Labels (not IDENTIFIER)
 *
 * Report structure:
 * ```
 * OBJECT Report 50000 "Test Report"
 * {
 *   PROPERTIES { ... }
 *   DATASET { ... }        // Complex nested structure - should be skipped
 *   REQUESTPAGE { ... }    // Request page controls - should be skipped
 *   LABELS { ... }         // Label definitions - should be skipped
 *   CODE { ... }           // Should be parsed normally
 * }
 * ```
 */

import { Lexer } from '../../lexer/lexer';
import { TokenType } from '../../lexer/tokens';
import { parseCode } from '../../parser';

describe('Lexer - Report section keywords', () => {
  describe('DATASET keyword tokenization', () => {
    it('should tokenize DATASET as TokenType.Dataset, not IDENTIFIER', () => {
      const code = 'DATASET';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // This test MUST fail first - DATASET is not yet recognized as a keyword
      expect(tokens[0].type).toBe(TokenType.Dataset);
      expect(tokens[0].value).toBe('DATASET');
    });

    it('should tokenize dataset in lowercase', () => {
      const code = 'dataset';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // C/AL keywords are case-insensitive
      expect(tokens[0].type).toBe(TokenType.Dataset);
      expect(tokens[0].value).toBe('dataset');
    });

    it('should tokenize Dataset in mixed case', () => {
      const code = 'DataSet';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Dataset);
      expect(tokens[0].value).toBe('DataSet');
    });
  });

  describe('REQUESTPAGE keyword tokenization', () => {
    it('should tokenize REQUESTPAGE as TokenType.RequestPage, not IDENTIFIER', () => {
      const code = 'REQUESTPAGE';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // This test MUST fail first - REQUESTPAGE is not yet recognized as a keyword
      expect(tokens[0].type).toBe(TokenType.RequestPage);
      expect(tokens[0].value).toBe('REQUESTPAGE');
    });

    it('should tokenize requestpage in lowercase', () => {
      const code = 'requestpage';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.RequestPage);
      expect(tokens[0].value).toBe('requestpage');
    });

    it('should tokenize RequestPage in mixed case', () => {
      const code = 'RequestPage';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.RequestPage);
      expect(tokens[0].value).toBe('RequestPage');
    });
  });

  describe('LABELS keyword tokenization', () => {
    it('should tokenize LABELS as TokenType.Labels, not IDENTIFIER', () => {
      const code = 'LABELS';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // This test MUST fail first - LABELS is not yet recognized as a keyword
      expect(tokens[0].type).toBe(TokenType.Labels);
      expect(tokens[0].value).toBe('LABELS');
    });

    it('should tokenize labels in lowercase', () => {
      const code = 'labels';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Labels);
      expect(tokens[0].value).toBe('labels');
    });

    it('should tokenize Labels in mixed case', () => {
      const code = 'Labels';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Labels);
      expect(tokens[0].value).toBe('Labels');
    });
  });

  describe('Distinguish keywords from identifiers', () => {
    it('should distinguish DATASET from similar identifiers', () => {
      const code = 'DATASET MyDataset DatasetName';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Dataset);
      expect(tokens[0].value).toBe('DATASET');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('MyDataset');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('DatasetName');
    });

    it('should distinguish REQUESTPAGE from similar identifiers', () => {
      const code = 'REQUESTPAGE MyRequestPage';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.RequestPage);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('MyRequestPage');
    });

    it('should distinguish LABELS from similar identifiers', () => {
      const code = 'LABELS MyLabel LabelText';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Labels);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('MyLabel');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('LabelText');
    });
  });
});

describe('Parser - Report with DATASET section', () => {
  it('should skip DATASET section and parse CODE section correctly', () => {
    const code = `
      OBJECT Report 50000 "Test Report"
      {
        PROPERTIES
        {
          CaptionML=ENU=Test Report;
        }
        DATASET
        {
          { 1000 ;DataItem;               ;DataItemTable=Customer;
                                           DataItemTableView=SORTING(No.) }

          { 1001 ;Column ;No              ;SourceExpr="No." }
          { 1002 ;Column ;Name            ;SourceExpr=Name }
        }
        CODE
        {
          VAR
            MyVar@1000 : Integer;

          PROCEDURE TestProc@1();
          BEGIN
            MESSAGE('Hello from report');
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should successfully parse CODE section after skipping DATASET
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('MyVar');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('TestProc');
  });

  it('should handle DATASET with complex nested structure', () => {
    const code = `
      OBJECT Report 50001 "Complex Report"
      {
        PROPERTIES
        {
          CaptionML=ENU=Complex Report;
        }
        DATASET
        {
          { 1000 ;DataItem;               ;DataItemTable=Sales Header;
                                           DataItemTableView=SORTING(Document Type,No.)
                                                             WHERE(Document Type=CONST(Order));
                                           OnPreDataItem=BEGIN
                                             SetFilter("No.",'ORDER001');
                                           END;
                                            }

          { 1001 ;DataItem;               ;DataItemTable=Sales Line;
                                           DataItemLink=Document Type=FIELD(Document Type),
                                                        Document No.=FIELD(No.);
                                           OnAfterGetRecord=BEGIN
                                             TotalAmount += Amount;
                                           END;
                                            }

          { 1002 ;Column ;Order_No        ;SourceExpr="No." }
          { 1003 ;Column ;Line_Amount     ;SourceExpr=Amount }
        }
        CODE
        {
          VAR
            TotalAmount@1000 : Decimal;

          PROCEDURE CalculateTotal@1();
          BEGIN
            // Calculate logic
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should skip the complex DATASET with BEGIN...END blocks in triggers
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('TotalAmount');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('CalculateTotal');
  });
});

describe('Parser - Report with REQUESTPAGE section', () => {
  it('should skip REQUESTPAGE section and parse CODE section correctly', () => {
    const code = `
      OBJECT Report 50010 "Report with Request Page"
      {
        PROPERTIES
        {
          CaptionML=ENU=Report with Request Page;
        }
        DATASET
        {
          { 1000 ;DataItem;               ;DataItemTable=Customer }
        }
        REQUESTPAGE
        {
          PROPERTIES
          {
            CaptionML=ENU=Request Page;
          }
          CONTROLS
          {
            { 1   ;0   ;Container ;
                        ContainerType=ContentArea }

            { 2   ;1   ;Group     ;
                        CaptionML=ENU=Options;
                        GroupType=Group }

            { 3   ;2   ;Field     ;
                        Name=ShowDetails;
                        CaptionML=ENU=Show Details;
                        SourceExpr=ShowDetailsOption }
          }
        }
        CODE
        {
          VAR
            ShowDetailsOption@1000 : Boolean;

          PROCEDURE InitRequestPage@1();
          BEGIN
            ShowDetailsOption := TRUE;
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should skip REQUESTPAGE section and parse CODE correctly
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('ShowDetailsOption');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('InitRequestPage');
  });

  it('should handle REQUESTPAGE with BEGIN...END in control triggers', () => {
    const code = `
      OBJECT Report 50011 "Report with Triggers"
      {
        PROPERTIES
        {
          CaptionML=ENU=Report;
        }
        REQUESTPAGE
        {
          CONTROLS
          {
            { 1   ;0   ;Container }

            { 2   ;1   ;Field     ;
                        SourceExpr=StartDate;
                        OnValidate=BEGIN
                          IF StartDate > EndDate THEN
                            ERROR('Invalid date range');
                        END;
                         }

            { 3   ;1   ;Field     ;
                        SourceExpr=EndDate;
                        OnValidate=BEGIN
                          ValidateDateRange;
                        END;
                         }
          }
        }
        CODE
        {
          VAR
            StartDate@1000 : Date;
            EndDate@1001 : Date;

          PROCEDURE ValidateDateRange@1();
          BEGIN
            // Validation logic
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should skip REQUESTPAGE with BEGIN...END triggers
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(2);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('StartDate');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('EndDate');
  });
});

describe('Parser - Report with LABELS section', () => {
  it('should skip LABELS section and parse CODE section correctly', () => {
    const code = `
      OBJECT Report 50020 "Report with Labels"
      {
        PROPERTIES
        {
          CaptionML=ENU=Report with Labels;
        }
        DATASET
        {
          { 1000 ;DataItem;               ;DataItemTable=Item }
        }
        LABELS
        {
          { 1000 ;Label        ;Report_Title_Lbl;
                                 CaptionML=ENU=Sales Report }
          { 1001 ;Label        ;Company_Name_Lbl;
                                 CaptionML=ENU=Company Name }
          { 1002 ;Label        ;Total_Lbl;
                                 CaptionML=ENU=Total }
        }
        CODE
        {
          VAR
            CompanyInfo@1000 : Record 79;

          PROCEDURE InitReport@1();
          BEGIN
            CompanyInfo.GET;
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should skip LABELS section and parse CODE correctly
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('CompanyInfo');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('InitReport');
  });
});

describe('Parser - Report with all sections', () => {
  it('should skip DATASET, REQUESTPAGE, and LABELS, then parse CODE', () => {
    const code = `
      OBJECT Report 50030 "Complete Report"
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
          { 1002 ;Column ;Customer_Name   ;SourceExpr=Name }
        }
        REQUESTPAGE
        {
          PROPERTIES
          {
            CaptionML=ENU=Options;
          }
          CONTROLS
          {
            { 1   ;0   ;Container ;
                        ContainerType=ContentArea }

            { 2   ;1   ;Field     ;
                        SourceExpr=IncludeInactive;
                        OnValidate=BEGIN
                          UpdateFilters;
                        END;
                         }
          }
        }
        LABELS
        {
          { 1000 ;Label        ;Title_Lbl;
                                 CaptionML=ENU=Customer Report }
          { 1001 ;Label        ;Page_Lbl;
                                 CaptionML=ENU=Page }
        }
        CODE
        {
          VAR
            IncludeInactive@1000 : Boolean;
            FilterText@1001 : Text[250];

          PROCEDURE UpdateFilters@1();
          BEGIN
            IF IncludeInactive THEN
              FilterText := ''
            ELSE
              FilterText := 'Active=1';
          END;

          PROCEDURE PrintReport@2();
          BEGIN
            MESSAGE('Printing report...');
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should skip all three report-specific sections and parse CODE correctly
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(2);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('IncludeInactive');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('FilterText');
    expect(result.ast?.object?.code?.procedures).toHaveLength(2);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('UpdateFilters');
    expect(result.ast?.object?.code?.procedures?.[1].name).toBe('PrintReport');
  });

  it('should handle sections in different order', () => {
    const code = `
      OBJECT Report 50031 "Reordered Report"
      {
        PROPERTIES
        {
          CaptionML=ENU=Test;
        }
        LABELS
        {
          { 1000 ;Label        ;Lbl1;CaptionML=ENU=Label1 }
        }
        DATASET
        {
          { 1000 ;DataItem;               ;DataItemTable=Item }
        }
        REQUESTPAGE
        {
          CONTROLS
          {
            { 1   ;0   ;Container }
          }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          PROCEDURE Test@1();
          BEGIN
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should handle sections regardless of order
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('TestVar');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
  });
});

describe('Lexer - Context guards for keywords', () => {
  describe('Keywords as variable names in CODE blocks', () => {
    it('should tokenize DATASET as IDENTIFIER when used as variable name', () => {
      const code = `
        PROCEDURE Test@1();
        VAR
          Dataset@1000 : Integer;
        BEGIN
          Dataset := 10;
        END;
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find 'Dataset' tokens - should be IDENTIFIER in CODE context
      const datasetTokens = tokens.filter(t => t.value.toUpperCase() === 'DATASET');
      expect(datasetTokens.length).toBeGreaterThan(0);
      datasetTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });
    });

    it('should tokenize REQUESTPAGE as IDENTIFIER when used as variable name', () => {
      const code = `
        PROCEDURE Test@1();
        VAR
          RequestPage@1001 : Boolean;
        BEGIN
          IF RequestPage THEN
            MESSAGE('Test');
        END;
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find 'RequestPage' tokens - should be IDENTIFIER in CODE context
      const requestPageTokens = tokens.filter(t => t.value.toUpperCase() === 'REQUESTPAGE');
      expect(requestPageTokens.length).toBeGreaterThan(0);
      requestPageTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });
    });

    it('should tokenize LABELS as IDENTIFIER when used as variable name', () => {
      const code = `
        PROCEDURE Test@1();
        VAR
          Labels@1002 : Text;
        BEGIN
          Labels := 'Test';
        END;
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find 'Labels' tokens - should be IDENTIFIER in CODE context
      const labelsTokens = tokens.filter(t => t.value.toUpperCase() === 'LABELS');
      expect(labelsTokens.length).toBeGreaterThan(0);
      labelsTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });
    });

    it('should handle all three keywords as variables in same procedure', () => {
      const code = `
        PROCEDURE ProcessData@1();
        VAR
          Dataset@1000 : Integer;
          RequestPage@1001 : Boolean;
          Labels@1002 : Text[50];
        BEGIN
          Dataset := 10;
          IF RequestPage THEN
            Labels := 'Active';
        END;
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // All three should be IDENTIFIER in CODE context
      const datasetTokens = tokens.filter(t => t.value.toUpperCase() === 'DATASET');
      const requestPageTokens = tokens.filter(t => t.value.toUpperCase() === 'REQUESTPAGE');
      const labelsTokens = tokens.filter(t => t.value.toUpperCase() === 'LABELS');

      datasetTokens.forEach(t => expect(t.type).toBe(TokenType.Identifier));
      requestPageTokens.forEach(t => expect(t.type).toBe(TokenType.Identifier));
      labelsTokens.forEach(t => expect(t.type).toBe(TokenType.Identifier));
    });
  });
});

describe('Parser - Keywords in property values', () => {
  it('should parse report with DATASET in CaptionML property', () => {
    const code = `
      OBJECT Report 50100 "Dataset Report"
      {
        PROPERTIES
        {
          CaptionML=ENU=Dataset Report;
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

    // Should parse without errors
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('Test');
  });

  it('should parse report with REQUESTPAGE in CaptionML property', () => {
    const code = `
      OBJECT Report 50101 "RequestPage Test"
      {
        PROPERTIES
        {
          CaptionML=ENU=RequestPage Configuration;
        }
        CODE
        {
          VAR
            Setting@1000 : Boolean;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should parse without errors
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.variables).toHaveLength(1);
  });

  it('should parse report with LABELS in CaptionML property', () => {
    const code = `
      OBJECT Report 50102 "Labels Manager"
      {
        PROPERTIES
        {
          CaptionML=ENU=Labels Management Report;
          Description=Manages labels and captions;
        }
        CODE
        {
          PROCEDURE Init@1();
          BEGIN
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should parse without errors
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
  });

  it('should parse report with all keywords in various property values', () => {
    const code = `
      OBJECT Report 50103 "Multi Keyword Report"
      {
        PROPERTIES
        {
          CaptionML=ENU=Dataset and RequestPage with Labels;
          Description=This report uses Dataset, RequestPage, and Labels sections;
        }
        CODE
        {
          VAR
            MyVar@1000 : Integer;

          PROCEDURE Process@1();
          BEGIN
            // Dataset processing
            // RequestPage handling
            // Labels management
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Should parse without errors - keywords in comments and strings
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code).not.toBeNull();
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
  });
});

describe('Parser - Real-world report patterns', () => {
  it('should parse report similar to standard NAV reports', () => {
    const code = `
      OBJECT Report 111 "Customer - Top 10 List"
      {
        PROPERTIES
        {
          CaptionML=ENU=Customer - Top 10 List;
        }
        DATASET
        {
          { 1000 ;DataItem;               ;DataItemTable=Customer;
                                           DataItemTableView=SORTING(Sales (LCY)) ORDER(Descending);
                                           OnAfterGetRecord=BEGIN
                                             TotalSales += "Sales (LCY)";
                                             IF Counter = 10 THEN
                                               CurrReport.BREAK;
                                             Counter += 1;
                                           END;
                                            }

          { 1001 ;Column ;No              ;SourceExpr="No." }
          { 1002 ;Column ;Name            ;SourceExpr=Name }
          { 1003 ;Column ;Sales_LCY       ;SourceExpr="Sales (LCY)" }
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

            { 2   ;1   ;Group     ;
                        CaptionML=ENU=Options }

            { 3   ;2   ;Field     ;
                        Name=Show;
                        CaptionML=ENU=Show;
                        OptionCaptionML=ENU=Sales (LCY),Balance (LCY);
                        SourceExpr=Show }
          }
        }
        LABELS
        {
          { 1000 ;Label        ;Customer_Caption_Lbl;
                                 CaptionML=ENU=Customer }
          { 1001 ;Label        ;Report_Title_Lbl;
                                 CaptionML=ENU=Top 10 Customer List }
          { 1002 ;Label        ;PageCaption_Lbl;
                                 CaptionML=ENU=Page }
        }
        CODE
        {
          VAR
            TotalSales@1000 : Decimal;
            Counter@1001 : Integer;
            Show@1002 : 'Sales (LCY),Balance (LCY)';

          PROCEDURE InitializeReport@1();
          BEGIN
            TotalSales := 0;
            Counter := 0;
          END;

          BEGIN
          END.
        }
      }
    `;

    const result = parseCode(code);

    // Real-world report should parse successfully
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.object?.code?.variables).toHaveLength(3);
    expect(result.ast?.object?.code?.variables?.[0].name).toBe('TotalSales');
    expect(result.ast?.object?.code?.variables?.[1].name).toBe('Counter');
    expect(result.ast?.object?.code?.variables?.[2].name).toBe('Show');
    expect(result.ast?.object?.code?.procedures).toHaveLength(1);
    expect(result.ast?.object?.code?.procedures?.[0].name).toBe('InitializeReport');
  });
});
