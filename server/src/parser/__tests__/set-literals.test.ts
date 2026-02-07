/**
 * Tests for C/AL Set Literals and Range Expressions
 *
 * Set literals are used with the IN operator to test membership:
 * - Discrete values: [1, 2, 5]
 * - Closed ranges: [1..10]
 * - Open-ended ranges: [1..], [..100]
 * - Mixed: [1, 5, 10..20, 50..]
 *
 * Common patterns:
 * - IF x IN [val1, val2] THEN
 * - IF Status IN [Status::Open, Status::Released] THEN
 * - IF Code IN ['A'..'Z'] THEN
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Set Literals and Range Expressions', () => {
  describe('Discrete Values', () => {
    it('should parse set with single discrete value', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status IN [0] THEN
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

    it('should parse set with multiple discrete numeric values', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Priority IN [1, 2, 5, 10] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with string discrete values', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Code IN ['A', 'B', 'C'] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with option value discrete values', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status IN [Status::Open, Status::Released, Status::Pending] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with quoted identifier option values', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF "Document Type" IN ["Document Type"::Order, "Document Type"::Invoice] THEN
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

  describe('Closed Ranges', () => {
    it('should parse set with single closed numeric range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Quantity IN [1..100] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with closed character range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF FirstChar IN ['A'..'Z'] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with closed date range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF OrderDate IN [010124D..123124D] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with multiple closed ranges', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Code IN [1..10, 20..30, 40..50] THEN
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

  describe('Open-Ended Ranges', () => {
    it('should parse set with open-ended upper range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Quantity IN [100..] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with open-ended lower range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Quantity IN [..100] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with multiple open-ended ranges', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Code IN [..10, 90..] THEN
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

  describe('Mixed Ranges and Discrete Values', () => {
    it('should parse set mixing discrete values and closed ranges', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Priority IN [0, 1..5, 10] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set mixing discrete values and open-ended ranges', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Code IN [0, 1..10, 100..] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with all range types and discrete values', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [..0, 1, 5, 10..20, 50, 100..] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with option values and ranges', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status IN [Status::Open, Status::Pending..Status::Released] THEN
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

  describe('Real-World Patterns', () => {
    it('should parse NAV pattern: sales document status check', () => {
      const code = `OBJECT Codeunit 80 "Sales-Post" {
        CODE {
          PROCEDURE CheckStatus(VAR SalesHeader : Record 36);
          BEGIN
            IF SalesHeader.Status IN [SalesHeader.Status::Open, SalesHeader.Status::Released] THEN
              ProcessDocument(SalesHeader);
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

    it('should parse NAV pattern: character validation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ValidateChar(Char : Text[1]);
          BEGIN
            IF Char[1] IN ['A'..'Z', 'a'..'z', '0'..'9'] THEN
              EXIT(TRUE)
            ELSE
              EXIT(FALSE);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse NAV pattern: date range filtering', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE FilterQuarterOrders(VAR SalesHeader : Record 36);
          BEGIN
            SalesHeader.SETFILTER("Order Date", '010124D..033124D');
            IF SalesHeader."Order Date" IN [010124D..033124D] THEN
              ProcessOrder();
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should parse empty set literal', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status IN [] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with negation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF NOT (Status IN [Status::Posted, Status::Cancelled]) THEN
              ProcessDocument();
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set in complex boolean expression', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF (Status IN [Status::Open, Status::Released]) AND
               (Type IN [Type::Item, Type::Resource]) THEN
              Process();
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with member access expressions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF SalesHeader."Document Type" IN [
              SalesHeader."Document Type"::Order,
              SalesHeader."Document Type"::Invoice
            ] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse nested sets in CASE statement', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            CASE TRUE OF
              Status IN [Status::Open, Status::Released]:
                ProcessOpen();
              Status IN [Status::Posted, Status::Cancelled]:
                ProcessClosed();
            END;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set literal in function call', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            ValidateStatus(Status IN [Status::Open, Status::Released]);
            CheckRange(Value, [1..100, 200..300]);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse set with trailing comma (relaxed syntax)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Status IN [Status::Open, Status::Released, ] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should either succeed or have minimal errors (trailing comma handling)
      expect(_ast.object).toBeDefined();
    });
  });

  describe('Malformed Range Expressions (Issue #362, #363)', () => {
    it('should report error for semicolon after .. in closed range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [1..;] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should report error for malformed range
      expect(parser.getErrors().length).toBeGreaterThan(0);
      const rangeError = parser.getErrors().find(e =>
        e.message.includes('Unexpected') &&
        e.message.includes('expected expression')
      );
      expect(rangeError).toBeDefined();
    });

    it('should report error for semicolon after .. in open-start range', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [..;] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should report error for malformed range
      expect(parser.getErrors().length).toBeGreaterThan(0);
      const rangeError = parser.getErrors().find(e =>
        e.message.includes('Unexpected') &&
        e.message.includes('expected expression')
      );
      expect(rangeError).toBeDefined();
    });

    it('should report error for completely open range (no start, no end)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [..] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should report error for malformed range
      expect(parser.getErrors().length).toBeGreaterThan(0);
      const rangeError = parser.getErrors().find(e =>
        e.message.includes('Unexpected') &&
        e.message.includes('expected expression')
      );
      expect(rangeError).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from malformed range (missing end)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [1..] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should parse successfully - open-ended ranges are valid
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should recover from malformed range (missing start)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [..100] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should parse successfully - open-ended ranges are valid
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should handle unclosed set literal gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [1, 2, 3 THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should record error but not crash
      expect(_ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle invalid range operator', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [1...10] THEN
              EXIT;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const _ast = parser.parse();

      // Should handle error gracefully
      expect(_ast.object).toBeDefined();
    });
  });
});
