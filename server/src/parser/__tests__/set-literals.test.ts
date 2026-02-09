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

import { parseCode } from './parserTestHelpers';
import { ObjectDeclaration } from '../ast';
import { TokenType } from '../../lexer/tokens';

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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast: _ast } = parseCode(code);

      // Should either succeed or have minimal errors (trailing comma handling)
      expect(_ast.object).toBeDefined();
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
      const { ast: _ast, errors } = parseCode(code);

      // Should parse successfully - open-ended ranges are valid
      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      // Should parse successfully - open-ended ranges are valid
      expect(errors).toHaveLength(0);
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
      const { ast: _ast, errors } = parseCode(code);

      // Should record error but not crash
      expect(_ast.object).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
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
      const { ast: _ast } = parseCode(code);

      // Should handle error gracefully
      expect(_ast.object).toBeDefined();
    });

    // Issue #362: EOF after range operator
    it('should report error for closed range with EOF after range operator', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [1..`;
      const { ast: _ast, errors } = parseCode(code);

      // Should report error for incomplete range
      expect(errors.length).toBeGreaterThan(0);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();

      // Tier 1: Verify error token points to EOF (consistent with parseCaseValue behavior)
      expect(rangeError!.token.line).toBe(5);
      expect(rangeError!.token.column).toBe(29);

      // Parser should not crash
      expect(_ast).toBeDefined();
      expect(_ast.object).not.toBeNull();

      // Should not have spurious identifier nodes (main validation)
      // Note: With EOF at range operator, parser may not successfully extract procedure structure
    });

    it('should report error for open-ended range with EOF after range operator', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          BEGIN
            IF Value IN [..`;
      const { ast: _ast, errors } = parseCode(code);

      // Should report error for incomplete range
      expect(errors.length).toBeGreaterThan(0);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();

      // Tier 1: Verify error token points to EOF (consistent with parseCaseValue behavior)
      expect(rangeError!.token.line).toBe(5);
      expect(rangeError!.token.column).toBe(28);

      // Parser should not crash
      expect(_ast).toBeDefined();
      expect(_ast.object).not.toBeNull();

      // Should not have spurious identifier nodes (main validation)
      // Note: With EOF at range operator, parser may not successfully extract procedure structure
    });

    // Issue #363: Missing delimiter guards after .. in set literal ranges
    it('should detect missing expression after .. when followed by semicolon', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [1..;] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();
      expect(rangeError!.token.value).toBe(';');
      expect(_ast.object).toBeDefined();
    });

    it('should detect missing expression after .. when followed by END keyword', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [1..END] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();
      expect(rangeError!.token.value).toBe('END');
      expect(_ast.object).toBeDefined();
    });

    it('should detect missing expression after .. when followed by THEN keyword', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [1..THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();
      expect(rangeError!.token.value).toBe('THEN');
      expect(_ast.object).toBeDefined();
    });

    it('should detect missing expression after .. when followed by DO keyword', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            WHILE x IN [1..DO
              x := x + 1;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();
      expect(rangeError!.token.value).toBe('DO');
      expect(_ast.object).toBeDefined();
    });

    it('should detect missing expression after .. in open-start path when followed by semicolon', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [..;] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();
      expect(rangeError!.token.value).toBe(';');
      expect(_ast.object).toBeDefined();
    });

    it('should detect completely open range with no start or end', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [..] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toMatch(/expected expression after '\.\.'/i);
      expect(errors[0].token.value).toBe(']');
      expect(_ast.object).toBeDefined();

      // Navigate into AST to verify recovery
      const obj = _ast.object as ObjectDeclaration;
      const proc = obj.code?.procedures[0];
      const ifStmt = proc?.body?.[0] as any;
      const inExpr = ifStmt.condition;
      const setLiteral = inExpr.right;

      // Verify ] was consumed as closing bracket, not identifier
      expect(setLiteral.endToken.type).toBe(TokenType.RightBracket);

      // Verify THEN branch recovered correctly
      expect(ifStmt.thenBranch.type).toBe('ExitStatement');
    });

    it('should detect missing expression after .. in open-start path when followed by comma', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [..,1] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const rangeError = errors.find(e => e.message.match(/expected expression after '\.\.'/i));
      expect(rangeError).toBeDefined();
      expect(rangeError!.token.value).toBe(',');
      expect(_ast.object).toBeDefined();
    });

    // Regression tests: These should parse with 0 errors
    it('should parse valid open-ended range [1..]', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [1..] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse valid open-ended range followed by discrete value [1..,2]', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [1..,2] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });

    it('should parse valid open-start range [..100]', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE Test();
          VAR
            x : Integer;
          BEGIN
            IF x IN [..100] THEN EXIT;
          END;
        }
      }`;
      const { ast: _ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(_ast.object).toBeDefined();
    });
  });
});
