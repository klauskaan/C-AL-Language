/**
 * Parser Tests: Procedure Attributes
 *
 * Tests AST capture for procedure attributes:
 * - [External] - External visibility modifier
 * - [EventSubscriber(...)] - Event subscriber registration
 * - [TryFunction] - Error-handling procedure marker
 *
 * Real NAV patterns from test/REAL/:
 * - PAG47.TXT: [External] PROCEDURE ApproveCalcInvDisc@1();
 * - COD6400.TXT: [EventSubscriber(Page,6302,OnOAuthAccessDenied)]
 * - COD5333.TXT: [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]
 */

import { parseCode, tokenize } from './parserTestHelpers';
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toBeDefined();
      expect(proc.attributes![0].name).toBe('external');
    });
  });

  describe('Attributes with simple arguments', () => {
    // Note: [Scope('OnPrem')] is AL-only and not supported in C/AL (NAV 2013-2018)
    // See issue #195 for verification of other attribute patterns

    it('should parse [Integration(TRUE)] attribute', () => {
      // Pattern verified in test/REAL/ (issue #194)
      // Found 117 occurrences: COD12.TXT, COD1061.TXT, COD1410.TXT, TAB36.TXT, etc.
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [Integration(TRUE)]
          PROCEDURE IntegrationEvent@1();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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

    it('should parse [EventSubscriber(Codeunit,80,OnBeforePost,"",Skip,Skip)] with quoted identifier', () => {
      // Real C/AL pattern uses plain keywords (Codeunit, not ObjectType::Codeunit)
      // Complex case with Codeunit::"Name" pattern, quoted strings, Skip identifiers
      // Pattern based on COD5333.TXT line 159 and similar
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [EventSubscriber(Codeunit,80,OnBeforePost,"",Skip,Skip)]
          LOCAL PROCEDURE OnBeforeSalesPost@1(VAR Rec@1000 : Record 80);
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes![0].name).toBe('EventSubscriber');

      // Verify complex tokens captured (plain Codeunit keyword, not ObjectType::)
      const attr = proc.attributes![0];
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues).toContain('Codeunit');
      expect(tokenValues).toContain('80');
      expect(tokenValues).toContain('Skip');
      // Should NOT contain ObjectType or :: (AL-only syntax)
      expect(tokenValues).not.toContain('ObjectType');
      expect(tokenValues).not.toContain('::');
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;

      // Attributes should be undefined when not present
      expect(proc.attributes).toBeUndefined();
    });

    it('should handle LOCAL procedure without attributes', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          LOCAL PROCEDURE LocalPlainProc@1();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toBeUndefined();
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
      const { ast } = parseCode(code);

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
      const { ast } = parseCode(code);

      const attr = ast.object!.code!.procedures[0].attributes![0];
      expect(attr.startToken.value).toBe('[');
      expect(attr.endToken.value).toBe(']');
    });

    it('should track nameToken for attribute name', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const { ast } = parseCode(code);

      const attr = ast.object!.code!.procedures[0].attributes![0];
      expect(attr.nameToken).toBeDefined();
      expect(attr.nameToken.value).toBe('External');
      expect(attr.nameToken.type).toBe('IDENTIFIER');
    });

    it('should track nameToken for attribute with arguments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [EventSubscriber(Page,6302,OnEvent)]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const { ast } = parseCode(code);

      const attr = ast.object!.code!.procedures[0].attributes![0];
      expect(attr.nameToken).toBeDefined();
      expect(attr.nameToken.value).toBe('EventSubscriber');
      expect(attr.nameToken.type).toBe('IDENTIFIER');
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
      const { ast, errors } = parseCode(code);

      // Parser should report error but continue
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
      const { ast, errors } = parseCode(code);

      // Parser should report error but continue
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.isLocal).toBe(true);
      expect(proc.attributes).toHaveLength(1);
      expect(proc.attributes![0].name).toBe('TryFunction');
    });

    // Issue #252: Warn when attributes are discarded during error recovery
    describe('Attribute discard warnings', () => {
      it('should warn when single attribute is discarded on invalid procedure', () => {
        const code = `OBJECT Codeunit 1 Test {
          CODE {
            [External]
            PROCEDURE BEGIN;
          }
        }`;
        const { errors } = parseCode(code);
        // Expect 2 errors: parse error + attribute discard warning
        expect(errors.length).toBe(2);

        // Find the attribute discard warning
        const attrWarning = errors.find(e => e.message.includes('1 attribute discarded'));
        expect(attrWarning).toBeDefined();
        expect(attrWarning!.message).toContain('1 attribute discarded');
      });

      it('should warn when multiple attributes are discarded on invalid procedure', () => {
        const code = `OBJECT Codeunit 1 Test {
          CODE {
            [External] [TryFunction]
            PROCEDURE BEGIN;
          }
        }`;
        const { errors } = parseCode(code);
        // Expect 2 errors: parse error + attribute discard warning
        expect(errors.length).toBe(2);

        // Find the attribute discard warning
        const attrWarning = errors.find(e => e.message.includes('2 attributes discarded'));
        expect(attrWarning).toBeDefined();
        expect(attrWarning!.message).toContain('2 attributes discarded');
      });

      it('should NOT warn when no attributes present on invalid procedure', () => {
        const code = `OBJECT Codeunit 1 Test {
          CODE {
            PROCEDURE BEGIN;
          }
        }`;
        const { errors } = parseCode(code);
        // Expect only 1 error: parse error, NO attribute warning
        expect(errors.length).toBe(1);

        // Verify no attribute discard warning
        const attrWarning = errors.find(e => e.message.includes('attribute'));
        expect(attrWarning).toBeUndefined();
      });

      it('should point warning location to first attribute startToken', () => {
        const code = `OBJECT Codeunit 1 Test {
          CODE {
            [External]
            PROCEDURE BEGIN;
          }
        }`;
        const { errors } = parseCode(code);
        const tokens = tokenize(code);
        const attrWarning = errors.find(e => e.message.includes('attribute discarded'));
        expect(attrWarning).toBeDefined();

        // Find the first '[' token (start of attribute)
        const leftBracket = tokens.find(t => t.value === '[' && t.type === 'LEFT_BRACKET');
        expect(leftBracket).toBeDefined();

        // Warning should point to the '[' token
        expect(attrWarning!.token).toEqual(leftBracket);
      });

      it('should NOT warn when malformed attribute recovery allows procedure to parse', () => {
        const code = `OBJECT Codeunit 1 Test {
          CODE {
            [Malformed PROCEDURE BEGIN;
          }
        }`;
        const { errors } = parseCode(code);
        // Malformed attribute produces one error during attribute parsing
        // The attribute recovery stops at PROCEDURE, which is then parsed normally
        // (BEGIN becomes the procedure name, which is weird but syntactically valid)
        expect(errors.length).toBe(1);
        expect(errors[0].message).toContain('Expected ] to close attribute');
      });

      it('should warn when attribute precedes TRIGGER declaration', () => {
        // Issue #253: C/AL triggers don't support attributes
        // Parser now warns when attributes appear before TRIGGER declarations
        // This helps users understand why their attributes are being ignored
        const code = `OBJECT Table 1 Test {
          CODE {
            [External]
            TRIGGER OnInsert();
            BEGIN
            END;
          }
        }`;
        const { ast, errors } = parseCode(code);

        // Expect exactly 1 warning
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('1 attribute ignored');
        expect(errors[0].message).toContain('attributes are only supported on PROCEDURE declarations in C/AL');

        // Trigger should still parse successfully
        const table = ast.object as any;
        expect(table.code.triggers).toHaveLength(1);
        expect(table.code.triggers[0].name).toBe('OnInsert');
      });

      it('should warn when multiple attributes precede TRIGGER declaration', () => {
        const code = `OBJECT Table 1 Test {
          CODE {
            [External]
            [TryFunction]
            TRIGGER OnInsert();
            BEGIN
            END;
          }
        }`;
        const { ast, errors } = parseCode(code);

        // Expect exactly 1 warning with correct count
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('2 attributes ignored');
        expect(errors[0].message).toContain('attributes are only supported on PROCEDURE declarations in C/AL');

        // Trigger should still parse successfully
        const table = ast.object as any;
        expect(table.code.triggers).toHaveLength(1);
        expect(table.code.triggers[0].name).toBe('OnInsert');
      });

      it('should warn when attribute precedes EVENT declaration', () => {
        const code = `OBJECT Page 1 Test {
          CODE {
            [External]
            EVENT WebViewer@1::ControlAddInReady@2(sender@1000 : Variant);
            BEGIN
            END;
          }
        }`;
        const { ast, errors } = parseCode(code);

        // Expect exactly 1 warning
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('1 attribute ignored');
        expect(errors[0].message).toContain('attributes are only supported on PROCEDURE declarations in C/AL');

        // Event should still parse successfully
        const page = ast.object as any;
        expect(page.code.events).toHaveLength(1);
        expect(page.code.events[0].subscriberName).toBe('WebViewer@1');
      });

      it('should warn when multiple attributes precede EVENT declaration', () => {
        const code = `OBJECT Page 1 Test {
          CODE {
            [External]
            [Integration]
            EVENT Chart@1::DataPointClicked@2(point@1000 : Integer);
            BEGIN
            END;
          }
        }`;
        const { ast, errors } = parseCode(code);

        // Expect exactly 1 warning with correct count
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('2 attributes ignored');
        expect(errors[0].message).toContain('attributes are only supported on PROCEDURE declarations in C/AL');

        // Event should still parse successfully
        const page = ast.object as any;
        expect(page.code.events).toHaveLength(1);
        expect(page.code.events[0].subscriberName).toBe('Chart@1');
      });

      it('should warn about attributes after error recovery then before trigger', () => {
        const code = `OBJECT Table 1 Test {
          CODE {
            [External]
            PROCEDURE;  // Invalid - missing name

            [Integration]
            TRIGGER OnInsert();
            BEGIN
            END;
          }
        }`;
        const { ast, errors } = parseCode(code);

        // Should have at least 2 errors:
        // 1. Error from malformed procedure ("Expected procedure name")
        // 2. Warning that attribute before malformed procedure was discarded
        // Note: [Integration] is skipped during error recovery, so no warning for it
        expect(errors.length).toBeGreaterThanOrEqual(2);

        // Find the error about the malformed procedure
        const malformedProcError = errors.find(e =>
          e.message.includes('Expected procedure name')
        );
        expect(malformedProcError).toBeDefined();

        // Find the error about discarded attributes
        const discardedAttrError = errors.find(e =>
          e.message.includes('discarded due to invalid declaration')
        );
        expect(discardedAttrError).toBeDefined();

        // Trigger should still parse successfully even after error recovery
        const table = ast.object as any;
        expect(table.code.triggers).toHaveLength(1);
      });
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object!.code!.procedures;
      expect(procedures).toHaveLength(3);

      // Proc1 has [External]
      expect(procedures[0].attributes).toHaveLength(1);
      expect(procedures[0].attributes![0].name).toBe('External');

      // Proc2 has no attributes
      expect(procedures[1].attributes).toBeUndefined();

      // Proc3 has [TryFunction]
      expect(procedures[2].attributes).toHaveLength(1);
      expect(procedures[2].attributes![0].name).toBe('TryFunction');
    });
  });

  describe('Edge cases', () => {
    it('should parse attribute with empty parentheses', () => {
      // Edge case: [External()] - attribute name with empty argument list
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External()]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(1);

      const attr = proc.attributes![0];
      expect(attr.name).toBe('External');
      expect(attr.hasArguments).toBe(true);
      // rawTokens includes delimiters: ['(', ')']
      expect(attr.rawTokens).toHaveLength(2);
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues).toEqual(['(', ')']);
    });

    it('should parse attribute with nested parentheses', () => {
      // Edge case: [Attr((nested))] - parentheses within argument list
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [Attr((nested))]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(1);

      const attr = proc.attributes![0];
      expect(attr.name).toBe('Attr');
      expect(attr.hasArguments).toBe(true);
      // Verify nested parentheses are captured
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues.filter(v => v === '(')).toHaveLength(2); // Two opening parens
      expect(tokenValues.filter(v => v === ')')).toHaveLength(2); // Two closing parens
      expect(tokenValues).toContain('nested');
    });

    it('should parse attribute with escaped quotes in string', () => {
      // Edge case: [Attr('string with ''quotes''')]
      // C/AL convention: single quotes escaped with double single quotes
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [Attr('string with ''quotes''')]
          PROCEDURE TestProc@1();
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.attributes).toHaveLength(1);

      const attr = proc.attributes![0];
      expect(attr.name).toBe('Attr');
      expect(attr.hasArguments).toBe(true);
      // Verify string with escaped quotes is captured
      const tokenValues = attr.rawTokens.map(t => t.value);
      expect(tokenValues.some(v => v.includes("'"))).toBe(true);
    });

    it('should handle EOF during attribute parsing', () => {
      // Edge case: attribute not closed before file ends
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [External`;
      const { ast, errors } = parseCode(code);

      // Should report error about unclosed attribute
      expect(errors.length).toBeGreaterThan(0);
      const unclosedError = errors.find(e =>
        e.message.includes('Expected ] to close attribute') ||
        e.message.includes('Unexpected end of file')
      );
      expect(unclosedError).toBeDefined();

      // AST should still be created (error recovery)
      expect(ast.object).toBeDefined();
    });

    it('should handle EOF during attribute arguments', () => {
      // Edge case: attribute arguments not closed before EOF
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          [EventSubscriber(Page,6302`;
      const { ast, errors } = parseCode(code);

      // Should report error about unclosed arguments
      expect(errors.length).toBeGreaterThan(0);
      const unclosedError = errors.find(e =>
        e.message.includes('Unclosed parenthesis in attribute')
      );
      expect(unclosedError).toBeDefined();

      // AST should still be created (error recovery)
      expect(ast.object).toBeDefined();
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
