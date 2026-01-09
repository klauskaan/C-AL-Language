/**
 * REGRESSION TESTS: Variable Modifiers (RUNONCLIENT, WITHEVENTS, INDATASET)
 *
 * Tests support for variable modifiers that appear after data type declarations.
 *
 * Modifier usage patterns from real NAV code:
 *
 * 1. RUNONCLIENT - For DotNet variables that execute on the client:
 *    SystemDiagnosticsProcess@1 : DotNet "'System'.System.Diagnostics.Process" RUNONCLIENT;
 *
 * 2. WITHEVENTS - For Automation variables with event handlers:
 *    WordApplication@1 : Automation "'Microsoft Word 15.0 Object Library'.Application" WITHEVENTS;
 *
 * 3. INDATASET - For page variables bound to dataset fields:
 *    Amount@1 : Decimal INDATASET;
 *
 * Real-world sources:
 * - REP6049738.TXT: DotNet variables with RUNONCLIENT (194 occurrences)
 * - Various automation objects: WITHEVENTS modifier (6 occurrences)
 * - Page objects: INDATASET modifier for data-bound variables
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Variable Modifiers', () => {
  describe('RUNONCLIENT modifier', () => {
    it('should parse DotNet variable with RUNONCLIENT modifier', () => {
      // Pattern from REP6049738.TXT line 35
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            SystemDiagnosticsProcess@1 : DotNet "'System, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Diagnostics.Process" RUNONCLIENT;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('SystemDiagnosticsProcess');
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.runOnClient).toBe(true);
      expect(variable.withEvents).toBeUndefined();
    });

    it('should parse multiple DotNet variables with RUNONCLIENT', () => {
      // Pattern from COD397.TXT
      const code = `OBJECT Codeunit 397 Test {
        CODE {
          VAR
            OutlookMessageHelper@1001 : DotNet "'Microsoft.Dynamics.Nav.Integration.Office'.Microsoft.Dynamics.Nav.Integration.Office.Outlook.IOutlookMessage" RUNONCLIENT;
            MailHelpers@1002 : DotNet "'Microsoft.Dynamics.Nav.SMTP'.Microsoft.Dynamics.Nav.SMTP.MailHelpers" RUNONCLIENT;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].runOnClient).toBe(true);
      expect(ast.object!.code!.variables[1].runOnClient).toBe(true);
    });

    it('should parse DotNet variable without RUNONCLIENT modifier', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            JObject@1 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.runOnClient).toBeUndefined();
    });

    it('should parse RUNONCLIENT in procedure parameter', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc@1(SystemProcess@1000 : DotNet "'System'.System.Diagnostics.Process" RUNONCLIENT);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parameters don't support modifiers in the same way, but shouldn't crash
      expect(ast.object).toBeDefined();
    });
  });

  describe('WITHEVENTS modifier', () => {
    // TODO: Automation type parsing not yet implemented - skip these tests for now
    it.skip('should parse Automation variable with WITHEVENTS modifier', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            WordApplication@1 : Automation "'Microsoft Word 15.0 Object Library'.Application" WITHEVENTS;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('WordApplication');
      expect(variable.withEvents).toBe(true);
      expect(variable.runOnClient).toBeUndefined();
    });

    it.skip('should parse Automation variable without WITHEVENTS', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            ExcelApp@1 : Automation "'Microsoft Excel 15.0 Object Library'.Application";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.withEvents).toBeUndefined();
    });

    // Test WITHEVENTS with simple identifier types (works without Automation parsing)
    it('should recognize WITHEVENTS keyword on simple types', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyVar@1 : Text WITHEVENTS;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.withEvents).toBe(true);
    });
  });

  describe('INDATASET modifier', () => {
    it('should parse page variable with INDATASET modifier', () => {
      const code = `OBJECT Page 1 Test {
        CODE {
          VAR
            Amount@1 : Decimal INDATASET;
            Quantity@2 : Integer INDATASET;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].isInDataSet).toBe(true);
      expect(ast.object!.code!.variables[1].isInDataSet).toBe(true);
    });

    it('should parse variable without INDATASET', () => {
      const code = `OBJECT Page 1 Test {
        CODE {
          VAR
            TempAmount@1 : Decimal;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.isInDataSet).toBeUndefined();
    });
  });

  describe('Combined modifiers', () => {
    it('should parse TEMPORARY and RUNONCLIENT together', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TempProcess@1 : TEMPORARY DotNet "'System'.System.Diagnostics.Process" RUNONCLIENT;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.isTemporary).toBe(true);
      expect(variable.runOnClient).toBe(true);
    });

    it('should parse mixed variables with different modifiers', () => {
      // Skip Automation for now since it's not implemented
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Process@1 : DotNet "'System'.System.Diagnostics.Process" RUNONCLIENT;
            Amount@2 : Decimal INDATASET;
            TempRec@3 : TEMPORARY Record 18;
            NormalVar@4 : Integer;
            TextWithEvents@5 : Text WITHEVENTS;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(5);

      expect(ast.object!.code!.variables[0].runOnClient).toBe(true);
      expect(ast.object!.code!.variables[1].isInDataSet).toBe(true);
      expect(ast.object!.code!.variables[2].isTemporary).toBe(true);
      expect(ast.object!.code!.variables[3].isTemporary).toBeUndefined();
      expect(ast.object!.code!.variables[3].runOnClient).toBeUndefined();
      expect(ast.object!.code!.variables[4].withEvents).toBe(true);
    });
  });

  describe('Error recovery', () => {
    it('should handle RUNONCLIENT on non-DotNet variable gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyInt@1 : Integer RUNONCLIENT;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse but may be semantically invalid
      // Parser doesn't validate type compatibility
      expect(ast.object).toBeDefined();
      const variable = ast.object!.code!.variables[0];
      expect(variable.runOnClient).toBe(true);
    });

    it('should handle WITHEVENTS on non-Automation variable gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyText@1 : Text WITHEVENTS;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should parse but may be semantically invalid
      expect(ast.object).toBeDefined();
      const variable = ast.object!.code!.variables[0];
      expect(variable.withEvents).toBe(true);
    });
  });

  describe('Real-world NAV patterns', () => {
    // TODO: Complex trigger parsing with inline VAR may need improvements
    it.skip('should parse Report 6049738 pattern with multiple RUNONCLIENT variables', () => {
      // Simplified from REP6049738.TXT
      const code = `OBJECT Report 6049738 "Org Chart Export" {
        CODE {
          OnPostReport=VAR
                         FileMgt@1160030004 : Codeunit 419;
                         SystemDiagnosticsProcess@1160030003 : DotNet "'System, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Diagnostics.Process" RUNONCLIENT;
                         FileNameOnClient@1160030002 : Text[1024];
                       BEGIN
                       END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.objectKind).toBe('Report');

      // Find the OnPostReport trigger
      const trigger = ast.object!.code!.triggers.find(t => t.name === 'OnPostReport');
      expect(trigger).toBeDefined();
      expect(trigger!.variables).toHaveLength(3);

      const dotNetVar = trigger!.variables.find(v => v.name === 'SystemDiagnosticsProcess');
      expect(dotNetVar).toBeDefined();
      expect(dotNetVar!.dataType.typeName).toBe('DotNet');
      expect(dotNetVar!.runOnClient).toBe(true);
    });

    it('should parse COD397 pattern with Office integration', () => {
      const code = `OBJECT Codeunit 397 "Mail Management" {
        CODE {
          VAR
            OutlookMessageHelper@1001 : DotNet "'Microsoft.Dynamics.Nav.Integration.Office'.Microsoft.Dynamics.Nav.Integration.Office.Outlook.IOutlookMessage" RUNONCLIENT;

          PROCEDURE SendEmail@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables[0].runOnClient).toBe(true);
      expect(ast.object!.code!.procedures).toHaveLength(1);
    });
  });

  describe('Lexer token recognition', () => {
    it('should recognize RUNONCLIENT as keyword token', () => {
      const code = 'RUNONCLIENT';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // RUNONCLIENT + EOF
      expect(tokens[0].type).toBe('RUNONCLIENT');
      expect(tokens[0].value).toBe('RUNONCLIENT');
    });

    it('should recognize WITHEVENTS as keyword token', () => {
      const code = 'WITHEVENTS';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // WITHEVENTS + EOF
      expect(tokens[0].type).toBe('WITHEVENTS');
      expect(tokens[0].value).toBe('WITHEVENTS');
    });

    it('should recognize keywords case-insensitively', () => {
      const code1 = 'runonclient';
      const code2 = 'RunOnClient';
      const code3 = 'RUNONCLIENT';

      const lexer1 = new Lexer(code1);
      const lexer2 = new Lexer(code2);
      const lexer3 = new Lexer(code3);

      expect(lexer1.tokenize()[0].type).toBe('RUNONCLIENT');
      expect(lexer2.tokenize()[0].type).toBe('RUNONCLIENT');
      expect(lexer3.tokenize()[0].type).toBe('RUNONCLIENT');
    });
  });

  describe('AST structure validation', () => {
    it('should include modifier flags in AST node', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Process@1 : DotNet "'System'.System.Diagnostics.Process" RUNONCLIENT;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const variable = ast.object!.code!.variables[0];

      // Verify AST node structure
      expect(variable.type).toBe('VariableDeclaration');
      expect(variable.startToken).toBeDefined();
      expect(variable.endToken).toBeDefined();
      expect(variable.runOnClient).toBe(true);

      // Verify other modifiers are undefined when not present
      expect(variable.withEvents).toBeUndefined();
      expect(variable.isInDataSet).toBeUndefined();
    });

    it('should preserve all modifiers in AST', () => {
      const code = `OBJECT Page 1 Test {
        CODE {
          VAR
            TempProcess@1 : TEMPORARY DotNet "'System'.System.Diagnostics.Process" RUNONCLIENT;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const variable = ast.object!.code!.variables[0];
      expect(variable.isTemporary).toBe(true);
      expect(variable.runOnClient).toBe(true);
      expect(variable.withEvents).toBeUndefined();
      expect(variable.isInDataSet).toBeUndefined();
    });
  });
});
