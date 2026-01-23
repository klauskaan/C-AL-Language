/**
 * Tests for C/AL Option type scope operator (::)
 *
 * The :: operator is used to access Option field values:
 * - FieldName::OptionValue
 * - Example: Status::Open, "Document Type"::Order
 *
 * This is a REGRESSION TEST for bug where parser fails with:
 * "Expected THEN at line X, column Y" when using :: in IF conditions
 *
 * Issue: Parser doesn't handle :: as a valid operator in expressions
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { TokenType } from '../../lexer/tokens';

describe('Parser - Option Type Scope Operator (::)', () => {
  describe('Lexer tokenization of ::', () => {
    it('should tokenize :: as DoubleColon token', () => {
      const code = 'Status::Open';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4); // Status, ::, Open, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Status');
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[1].value).toBe('::');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Open');
    });

    it('should tokenize :: with quoted identifiers', () => {
      const code = '"Job Task Type"::"End-Total"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4); // "Job Task Type", ::, "End-Total", EOF
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Job Task Type');
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[1].value).toBe('::');
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('End-Total');
    });

    it('should distinguish :: from : and :=', () => {
      const code = 'x : y := Status::Open';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.Colon);       // :
      expect(tokens[3].type).toBe(TokenType.Assign);      // :=
      expect(tokens[5].type).toBe(TokenType.DoubleColon); // ::
    });
  });

  describe('REGRESSION TEST: :: in IF conditions', () => {
    it('should parse simple IF with :: operator', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status = Status::Open THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // This test currently FAILS with: "Expected THEN at line 5, column 38"
      // Parser doesn't recognize :: as valid operator in expressions
      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
      expect(_ast.object?.code).toBeDefined();
    });

    it('should parse IF with quoted field and :: operator (COD1003 regression)', () => {
      // This is the EXACT pattern from COD1003.TXT line 52 that fails
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF "Job Task Type" = "Job Task Type"::"End-Total" THEN BEGIN
              EXIT;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // This test currently FAILS with: "Expected THEN at line 5, column 49"
      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse nested IF statements with multiple :: operators', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Customer.Blocked = Customer.Blocked::" " THEN
              IF SalesHeader.Status = SalesHeader.Status::Released THEN
                EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse IF with :: in complex member expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF SalesLine."Document Type" = SalesLine."Document Type"::Order THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('REGRESSION TEST: :: in assignment statements', () => {
    it('should parse simple assignment with :: operator', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            Status := Status::Posted;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse assignment with quoted identifiers and ::', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            "Document Type" := "Document Type"::Invoice;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse assignment with member access and ::', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            GenJournalLine."Account Type" := GenJournalLine."Account Type"::"G/L Account";
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('REGRESSION TEST: :: in CASE statements', () => {
    it('should parse CASE with :: in branch values', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            CASE Status OF
              Status::Open:
                EXIT;
              Status::Posted:
                EXIT;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse CASE with quoted identifiers and ::', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            CASE "Document Type" OF
              "Document Type"::Quote:
                EXIT;
              "Document Type"::Order:
                EXIT;
              "Document Type"::Invoice:
                EXIT;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse CASE with multiple :: values in same branch', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            CASE Status OF
              Status::Open, Status::Pending:
                EXIT;
              Status::Posted, Status::Cancelled:
                EXIT;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('REGRESSION TEST: :: in complex expressions', () => {
    it('should parse :: in boolean AND expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF (Status = Status::Open) AND (Type = Type::Item) THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: in boolean OR expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF (Status = Status::Posted) OR (Status = Status::Cancelled) THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: in IN expression with set literal', () => {
      // Now supported: Set literals [val1, val2] are parsed as part of set literal support
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status IN [Status::Shipped, Status::Invoiced] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: with multiple member accesses', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF GenJnlLine."Account Type" = GenJnlLine."Account Type"::"G/L Account" THEN
              ValidateDefaultDimensions(DATABASE::"G/L Account", GenJnlLine."Account No.");
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: in function call arguments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            SetRange("Document Type", "Document Type"::Order);
            SetFilter(Status, '%1|%2', Status::Open, Status::Released);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('REGRESSION TEST: :: with special option values', () => {
    it('should parse :: with empty string option value', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Customer.Blocked = Customer.Blocked::" " THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: with numeric option value', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Priority = Priority::0 THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: with DATABASE constant', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            ValidateDefaultDimensions(DATABASE::Customer, CustomerNo);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: with CODEUNIT constant', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF CODEUNIT.RUN(CODEUNIT::"Process 1") THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse :: with REPORT/PAGE constants', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            REPORT.RUN(REPORT::"Sales Analysis");
            PAGE.RUN(PAGE::"Customer Card", Customer);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('REGRESSION TEST: :: error recovery', () => {
    it('should recover from trailing :: without value', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            Status := Status::;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should record error but not crash
      expect(_ast.object).toBeDefined();
      // Parser should generate an error for incomplete expression
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle multiple :: in a row', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            BadCode := Status:::Value;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should record error but not crash
      expect(_ast.object).toBeDefined();
    });
  });

  describe('Integration: Real NAV code patterns', () => {
    it('should parse real NAV pattern: blocked customer check', () => {
      const code = `OBJECT Codeunit 80 "Sales-Post" {
        CODE {
          PROCEDURE CheckCustomer(Customer : Record 18);
          BEGIN
            IF Customer.Blocked <> Customer.Blocked::" " THEN
              ERROR('Customer is blocked');
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
      expect(_ast.object?.objectKind).toBe('Codeunit');
    });

    it('should parse real NAV pattern: journal line account type', () => {
      const code = `OBJECT Codeunit 12 "Gen. Jnl.-Post Line" {
        CODE {
          PROCEDURE PostGenJnlLine(VAR GenJnlLine : Record 81);
          BEGIN
            CASE GenJnlLine."Account Type" OF
              GenJnlLine."Account Type"::"G/L Account":
                PostGLAcc();
              GenJnlLine."Account Type"::Customer:
                PostCustomer();
              GenJnlLine."Account Type"::Vendor:
                PostVendor();
              GenJnlLine."Account Type"::Item:
                PostItem();
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse real NAV pattern: document status filtering', () => {
      const code = `OBJECT Codeunit 5063 "Warehouse Management" {
        CODE {
          PROCEDURE FilterOpenDocuments(VAR SalesHeader : Record 36);
          BEGIN
            SalesHeader.SETRANGE("Document Type", SalesHeader."Document Type"::Order);
            SalesHeader.SETFILTER(Status, '%1|%2',
              SalesHeader.Status::Open,
              SalesHeader.Status::Released);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse CASE with unquoted identifier after ::', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            ColumnLayout : Record 334;
          BEGIN
            CASE ColumnLayout."Ledger Entry Type" OF
              ColumnLayout."Ledger Entry Type"::Entries:
                EXIT;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse CASE with quoted identifier value after ::', () => {
      const code = `OBJECT Codeunit 9 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Col : Record 334;
          BEGIN
            CASE Col.Type OF
              Col.Type::"Value 1":
                EXIT;
              Col.Type::"Value 2":
                EXIT;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse CASE with multiple qualified enum branches', () => {
      const code = `OBJECT Codeunit 9 Test {
        CODE {
          PROCEDURE Test();
          VAR
            ColumnLayout : Record 334;
            AmountType : Option;
          BEGIN
            CASE ColumnLayout."Ledger Entry Type" OF
              ColumnLayout."Ledger Entry Type"::Entries:
                EXIT;
              ColumnLayout."Ledger Entry Type"::"Budget Entries":
                BEGIN
                  CASE AmountType OF
                    AmountType::"Net Amount":
                      EXIT;
                    AmountType::"Credit Amount":
                      EXIT;
                  END;
                END;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('SECURITYFILTER enum patterns (NAV 2013 R2+)', () => {
    // These tests verify the dual usage of SECURITYFILTERING:
    // 1. As a variable modifier (tested in variable-modifiers.test.ts)
    // 2. As a property/method with SECURITYFILTER enum (tested here)

    it('should parse SECURITYFILTER::Filtered enum access', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            FilterValue : Integer;
          BEGIN
            FilterValue := SECURITYFILTER::Filtered;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse SECURITYFILTER::Ignored enum access', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            FilterValue : Integer;
          BEGIN
            FilterValue := SECURITYFILTER::Ignored;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse RecRef."SECURITYFILTERING" property assignment', () => {
      // Pattern from COD703.TXT: RecRef."SECURITYFILTERING" := SECURITYFILTER::Filtered;
      const code = `OBJECT Codeunit 703 Test {
        CODE {
          PROCEDURE Test();
          VAR
            RecRef : RecordRef;
          BEGIN
            RecRef."SECURITYFILTERING" := SECURITYFILTER::Filtered;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse Record."SECURITYFILTERING" method call', () => {
      // Pattern from TAB18.TXT: CustomerSalesYTD."SECURITYFILTERING"("SECURITYFILTERING");
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            CustomerSalesYTD : Query 21;
          BEGIN
            CustomerSalesYTD."SECURITYFILTERING"(SECURITYFILTER::Filtered);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse xRecRef."SECURITYFILTERING" pattern', () => {
      // Pattern from COD423.TXT: xRecRef."SECURITYFILTERING" := SECURITYFILTER::Filtered;
      const code = `OBJECT Codeunit 423 Test {
        CODE {
          PROCEDURE Test();
          VAR
            xRecRef : RecordRef;
          BEGIN
            xRecRef."SECURITYFILTERING" := SECURITYFILTER::Filtered;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();
      expect(parser.getErrors()).toHaveLength(0);
    });
  });
});
