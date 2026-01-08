/**
 * Regression test for PAG files with CONTROLS + CODE sections
 *
 * Issue: Parser fails to parse Page CODE sections that follow CONTROLS sections.
 * Validation report shows 99,410 errors in PAG files, most being "Expected =" errors
 * at the first variable declaration in the CODE section.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Page with CONTROLS and CODE sections', () => {
  it('should parse minimal page with CONTROLS followed by CODE with global VAR', () => {
    const code = `OBJECT Page 6510 Test {
      PROPERTIES {
        CaptionML=ENU=Test Page;
      }
      CONTROLS {
        { 1 ; Container ; ContentArea }
      }
      CODE {
        VAR
          TotalItemTrackingLine@1003 : Record 336;
          ItemTrackingCode@1005 : Record 6502;
      }
    }`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    // Should parse without errors
    expect(parser.getErrors()).toEqual([]);
    expect(ast).toBeDefined();
    expect(ast.object).toBeDefined();
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectId).toBe(6510);
  });

  it('should parse page with empty CONTROLS followed by CODE with VAR', () => {
    const code = `OBJECT Page 1 Test {
      CONTROLS {
      }
      CODE {
        VAR
          x@1 : Integer;
      }
    }`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    expect(parser.getErrors()).toEqual([]);
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
  });

  it('should parse page with CONTROLS, CODE VAR, and PROCEDURE', () => {
    const code = `OBJECT Page 1 Test {
      CONTROLS {
        { 1 ; Container ; ContentArea }
      }
      CODE {
        VAR
          GlobalVar@1000 : Integer;

        PROCEDURE TestProc@1();
        BEGIN
        END;
      }
    }`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    expect(parser.getErrors()).toEqual([]);
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
  });
});
