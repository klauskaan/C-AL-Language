/**
 * Parser Tests - WITH Statement
 *
 * Tests for WITH-DO statement parsing including:
 * - Simple WITH-DO with BEGIN-END blocks
 * - WITH-DO with single statements
 * - Nested WITH statements
 * - WITH-DO with complex expressions
 * - WITH-DO with record variables and field access
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { WithStatement, BlockStatement } from '../ast';

describe('Parser - WITH Statement', () => {
  describe('Basic WITH-DO patterns', () => {
    it('should parse WITH-DO with BEGIN-END block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Customer@1000 : Record 18;
          BEGIN
            WITH Customer DO BEGIN
              "No." := '1000';
              Name := 'Test Customer';
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object?.code).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.record.type).toBe('Identifier');
      expect(withStmt.body.type).toBe('BlockStatement');

      const block = withStmt.body as BlockStatement;
      expect(block.statements).toHaveLength(2);
      expect(block.statements[0].type).toBe('AssignmentStatement');
    });

    it('should parse WITH-DO with single statement (no BEGIN-END)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Item@1000 : Record 27;
          BEGIN
            WITH Item DO
              Quantity := 10;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body.type).toBe('AssignmentStatement');
    });

    it('should parse WITH-DO with IF statement', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            PurchLine@1000 : Record 39;
          BEGIN
            WITH PurchLine DO
              IF Type = Type::Item THEN
                Quantity := 1;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body.type).toBe('IfStatement');
    });
  });

  describe('WITH-DO with method calls', () => {
    it('should parse WITH-DO with SETRANGE calls', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            CustLedgEntry@1000 : Record 21;
          BEGIN
            WITH CustLedgEntry DO BEGIN
              SETCURRENTKEY("Document Type","Customer No.","Posting Date");
              SETRANGE("Customer No.",'1000');
              SETFILTER("Posting Date",'01-01-2020..12-31-2020');
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body.type).toBe('BlockStatement');

      const block = withStmt.body as BlockStatement;
      expect(block.statements).toHaveLength(3);
      expect(block.statements[0].type).toBe('CallStatement');
    });

    it('should parse WITH-DO with REPEAT-UNTIL loop', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Item@1000 : Record 27;
          BEGIN
            WITH Item DO
              IF FIND('-') THEN
                REPEAT
                  Quantity := Quantity + 1;
                UNTIL NEXT = 0;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body.type).toBe('IfStatement');
    });
  });

  describe('Nested WITH statements', () => {
    it('should parse nested WITH-DO statements', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Customer@1000 : Record 18;
            SalesHeader@1001 : Record 36;
          BEGIN
            WITH Customer DO
              WITH SalesHeader DO
                "Sell-to Customer No." := Customer."No.";
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const outerWith = procedure.body[0] as WithStatement;

      expect(outerWith.type).toBe('WithStatement');
      expect(outerWith.body.type).toBe('WithStatement');

      const innerWith = outerWith.body as WithStatement;
      expect(innerWith.type).toBe('WithStatement');
      expect(innerWith.body.type).toBe('AssignmentStatement');
    });

    it('should parse deeply nested WITH statements (5 levels)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            WITH Customer DO
              WITH "Sales Header" DO
                WITH "Sales Line" DO
                  WITH Item DO
                    WITH "Item Ledger Entry" DO
                      Quantity := 10;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      // Verify nested structure
      let currentStmt = ast.object!.code!.procedures[0].body[0];
      let depth = 0;

      while (currentStmt.type === 'WithStatement') {
        depth++;
        currentStmt = (currentStmt as WithStatement).body;
      }

      expect(depth).toBe(5);
      expect(currentStmt.type).toBe('AssignmentStatement');
    });
  });

  describe('WITH-DO with complex patterns', () => {
    it('should parse WITH-DO with CASE statement', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            GenJnlLine@1000 : Record 81;
          BEGIN
            WITH GenJnlLine DO
              CASE "Account Type" OF
                "Account Type"::"G/L Account":
                  TESTFIELD("Gen. Posting Type");
                "Account Type"::Customer:
                  Amount := -Amount;
              END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body.type).toBe('CaseStatement');
    });

    it('should parse WITH-DO with FOR loop', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            CustLedgEntry@1000 : Record 21;
            i@1001 : Integer;
          BEGIN
            WITH CustLedgEntry DO
              FOR i := 1 TO 10 DO
                Amount := Amount + i;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      expect(withStmt.body.type).toBe('ForStatement');
    });

    it('should parse WITH-DO with complex member expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            PurchHeader@1000 : Record 38;
          BEGIN
            WITH PurchHeader DO BEGIN
              SetCurrency("Currency Code","Currency Factor",PurchHeaderExchDate(PurchHeader));
              TESTFIELD("Currency Factor");
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });
  });

  describe('WITH-DO with quoted identifiers', () => {
    it('should parse WITH-DO with quoted field names', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Item@1000 : Record 27;
          BEGIN
            WITH Item DO BEGIN
              "No." := '1000';
              "Description" := 'Test Item';
              "Unit Price" := 10.50;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const withStmt = procedure.body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');

      const block = withStmt.body as BlockStatement;
      expect(block.statements).toHaveLength(3);
    });
  });

  describe('Real-world patterns from validation report', () => {
    it('should parse REP96.TXT pattern: WITH-DO FIND-REPEAT', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            FromGLEntry@1000 : Record 17;
          BEGIN
            WITH FromGLEntry DO BEGIN
              SETCURRENTKEY("G/L Account No.","Posting Date");
              IF FIND('-') THEN BEGIN
                REPEAT
                  ProcessRecord("G/L Account No.","Posting Date",Amount);
                UNTIL NEXT = 0;
              END;
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should parse multiple sequential WITH statements', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            Customer@1000 : Record 18;
            Item@1001 : Record 27;
          BEGIN
            WITH Customer DO
              Name := 'Test';

            WITH Item DO
              Description := 'Test Item';
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.body).toHaveLength(2);
      expect(procedure.body[0].type).toBe('WithStatement');
      expect(procedure.body[1].type).toBe('WithStatement');
    });
  });

  describe('Unsupported syntax (negative tests)', () => {
    it('should report error for multi-variable WITH (not supported in C/AL)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            WITH Customer, Item DO
              field := value;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Multi-variable WITH creates parse error (comma creates ambiguity)
      expect(errors.length).toBeGreaterThan(0);
      expect(ast.object).toBeDefined();
    });
  });
});
