/**
 * FAILING TESTS: Procedure Attributes (Issue #10, Task 3)
 *
 * Tests AST capture for procedure attributes like:
 * - [External] - External visibility modifier
 * - [EventSubscriber(...)] - Event subscriber registration
 * - [TryFunction] - Error-handling procedure marker
 *
 * Real NAV patterns from test/REAL/:
 * - PAG47.TXT: [External] PROCEDURE ApproveCalcInvDisc@1();
 * - COD6400.TXT: [EventSubscriber(Page,6302,OnOAuthAccessDenied)]
 * - COD5333.TXT: [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]
 *
 * Current behavior: Parser skips attributes without errors but doesn't capture them
 * Expected behavior: Capture attributes in AST with rawTokens for complex arguments
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ProcedureDeclaration } from '../ast';

describe('Parser - Procedure Attributes', () => {
  describe('Simple attributes without arguments', () => {
    it('should parse [External] attribute on procedure', () => {
      // Pattern from PAG47.TXT line 1031
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External]
          PROCEDURE ApproveCalcInvDisc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toBeDefined();
      expect(proc.attributes).toHaveLength(1);

      const attr = proc.attributes![0];
      expect(attr.type).toBe('ProcedureAttribute');
      expect(attr.name).toBe('External');
      expect(attr.hasArguments).toBe(false);
      expect(attr.rawTokens).toEqual([]);
    });

    it('should parse [TryFunction] attribute on procedure', () => {
      // Pattern from COD6400.TXT line 387
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [TryFunction]
          LOCAL PROCEDURE TryGetFlowUrl@19(VAR FlowUrl@1001 : Text);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(1);
      expect(proc.attributes![0].name).toBe('TryFunction');
      expect(proc.attributes![0].hasArguments).toBe(false);
    });

    it('should handle case-insensitive attribute names', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [external]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toBeDefined();
      expect(proc.attributes![0].name).toBe('external');
    });
  });

  describe('Attributes with simple arguments', () => {
    // Note: [Scope('OnPrem')] is AL-only and not supported in C/AL (NAV 2013-2018)
    // See issue #195 for verification of other attribute patterns

    it('should parse [Integration(TRUE)] attribute', () => {
      // TODO: Verify this pattern exists in real NAV files (issue #194)
      // Real NAV files show [Integration] without arguments
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [Integration(TRUE)]
          PROCEDURE IntegrationEvent@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes![0].name).toBe('Integration');
      expect(proc.attributes![0].hasArguments).toBe(true);
    });
  });

  describe('Attributes with complex arguments', () => {
    it('should parse [EventSubscriber(Page,6302,OnOAuthAccessDenied)] attribute', () => {
      // Pattern from COD6400.TXT line 378
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [EventSubscriber(Page,6302,OnOAuthAccessDenied)]
          LOCAL PROCEDURE CheckOAuthAccessDenied@3(description@1000 : Text;resourceFriendlyName@1001 : Text);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(1);

      const attr = proc.attributes![0];
      expect(attr.name).toBe('EventSubscriber');
      expect(attr.hasArguments).toBe(true);

      // Verify rawTokens captures all argument complexity
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues).toContain('Page');
      expect(tokenValues).toContain('6302');
      expect(tokenValues.some(v => v.includes('OnOAuthAccessDenied'))).toBe(true);
    });

    it('should parse [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]', () => {
      // Pattern from COD5333.TXT line 159 - complex with quoted strings and Skip identifiers
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]
          LOCAL PROCEDURE ScheduleCRMIntTelemetryAfterIntegrationEnabled@4();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes![0].name).toBe('EventSubscriber');
      expect(proc.attributes![0].hasArguments).toBe(true);

      // Verify complex arguments are captured
      const attr = proc.attributes![0];
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues).toContain('Codeunit');
      expect(tokenValues).toContain('5330');
      expect(tokenValues).toContain('Skip');
    });

    it('should parse [EventSubscriber(ObjectType::Codeunit, Codeunit::"CU Name", \'OnEvent\', \'\', true)]', () => {
      // Complex case with qualified names, quoted identifiers, and literals
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnBeforePost', '', true)]
          LOCAL PROCEDURE OnBeforeSalesPost@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes![0].name).toBe('EventSubscriber');

      // Verify complex tokens captured
      const attr = proc.attributes![0];
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues).toContain('ObjectType');
      expect(tokenValues).toContain('::');
      expect(tokenValues).toContain('Codeunit');
    });
  });

  describe('Multiple consecutive attributes', () => {
    it('should parse multiple attributes on same procedure', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External]
          [Scope('OnPrem')]
          PROCEDURE MultiAttributeProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(2);

      // Verify order preserved
      expect(proc.attributes![0].name).toBe('External');
      expect(proc.attributes![1].name).toBe('Scope');
    });

    it('should parse three attributes on same procedure', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External]
          [TryFunction]
          [Scope('OnPrem')]
          PROCEDURE TripleAttributeProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(3);

      expect(proc.attributes![0].name).toBe('External');
      expect(proc.attributes![1].name).toBe('TryFunction');
      expect(proc.attributes![2].name).toBe('Scope');
    });
  });

  describe('Procedures without attributes', () => {
    it('should handle procedure without attributes', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE PlainProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;

      // Attributes should be undefined or empty array
      expect(proc.attributes === undefined || proc.attributes.length === 0).toBe(true);
    });

    it('should handle LOCAL procedure without attributes', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          LOCAL PROCEDURE LocalPlainProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes === undefined || proc.attributes.length === 0).toBe(true);
    });
  });

  describe('Position tracking', () => {
    it('should track startToken and endToken for attribute', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const attr = ast.object!.code!.procedures[0].attributes![0];
      expect(attr.startToken).toBeDefined();
      expect(attr.endToken).toBeDefined();

      // StartToken should be '['
      expect(attr.startToken.value).toBe('[');
      expect(attr.startToken.type).toBe('LEFT_BRACKET');

      // EndToken should be ']'
      expect(attr.endToken.value).toBe(']');
      expect(attr.endToken.type).toBe('RIGHT_BRACKET');
    });

    it('should track position for attribute with arguments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [Scope('OnPrem')]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const attr = ast.object!.code!.procedures[0].attributes![0];
      expect(attr.startToken.value).toBe('[');
      expect(attr.endToken.value).toBe(']');
    });
  });

  describe('Error recovery', () => {
    it('should recover from unclosed attribute bracket', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should report error but continue
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Should still find the procedure
      expect(ast.object?.code?.procedures).toBeDefined();
    });

    it('should recover from unclosed attribute parenthesis', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [Integration(
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should report error but continue
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Should still find the procedure
      expect(ast.object?.code?.procedures).toBeDefined();
    });

    it('should handle attribute on LOCAL procedure', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [TryFunction]
          LOCAL PROCEDURE TryProc@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.isLocal).toBe(true);
      expect(proc.attributes).toHaveLength(1);
      expect(proc.attributes![0].name).toBe('TryFunction');
    });
  });

  describe('Mixed procedures with and without attributes', () => {
    it('should parse multiple procedures with mixed attributes', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External]
          PROCEDURE Proc1@1();
          BEGIN
          END;

          PROCEDURE Proc2@2();
          BEGIN
          END;

          [TryFunction]
          LOCAL PROCEDURE Proc3@3();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedures = ast.object!.code!.procedures;
      expect(procedures).toHaveLength(3);

      // Proc1 has [External]
      expect(procedures[0].attributes).toHaveLength(1);
      expect(procedures[0].attributes![0].name).toBe('External');

      // Proc2 has no attributes
      expect(procedures[1].attributes === undefined || procedures[1].attributes.length === 0).toBe(true);

      // Proc3 has [TryFunction]
      expect(procedures[2].attributes).toHaveLength(1);
      expect(procedures[2].attributes![0].name).toBe('TryFunction');
    });
  });

  describe('Real-world NAV patterns', () => {
    it('should parse PAG47 pattern with [External] procedures', () => {
      // Simplified from PAG47.TXT
      const code = `OBJECT Page 47 "Sales Order Subform" {
        CODE {
          [External]
          PROCEDURE ApproveCalcInvDisc@1();
          BEGIN
          END;

          [External]
          PROCEDURE CalcInvDisc@8();
          BEGIN
          END;

          [External]
          PROCEDURE ExplodeBOM@3();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedures = ast.object!.code!.procedures;
      expect(procedures).toHaveLength(3);

      procedures.forEach(proc => {
        expect(proc.attributes).toHaveLength(1);
        expect(proc.attributes![0].name).toBe('External');
      });
    });

    it('should parse event subscriber with complex arguments', () => {
      // Pattern from COD5333.TXT
      const code = `OBJECT Codeunit 5333 "CRM Integration Telemetry" {
        CODE {
          [EventSubscriber(Table,5330,OnAfterInsertEvent)]
          LOCAL PROCEDURE SendConnectionTelemetryAfterInsert@1(VAR Rec@1000 : Record 5330);
          BEGIN
          END;

          [EventSubscriber(Table,5330,OnAfterModifyEvent)]
          LOCAL PROCEDURE SendConnectionTelemetryAfterModify@2(VAR Rec@1000 : Record 5330);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedures = ast.object!.code!.procedures;
      expect(procedures).toHaveLength(2);

      procedures.forEach(proc => {
        expect(proc.attributes).toHaveLength(1);
        expect(proc.attributes![0].name).toBe('EventSubscriber');
        expect(proc.attributes![0].hasArguments).toBe(true);
      });
    });
  });
});
