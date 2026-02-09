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

import { parseCode, tokenize } from './parserTestHelpers';

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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters).toHaveLength(1);
      expect(proc.parameters[0].runOnClient).toBe(true);
    });
  });

  describe('WITHEVENTS modifier', () => {
    // Automation type uses real NAV GUID format
    it('should parse Automation variable with WITHEVENTS modifier', () => {
      // Real NAV format with GUIDs for Automation types
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject" WITHEVENTS;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('FSO');
      expect(variable.dataType.typeName).toBe('Automation');
      expect(variable.withEvents).toBe(true);
      expect(variable.runOnClient).toBeUndefined();
    });

    it('should parse Automation variable without WITHEVENTS', () => {
      // Real NAV format with GUIDs for Automation types
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            XMLDoc@1 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode";
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('Automation');
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.isInDataSet).toBeUndefined();
    });
  });

  describe('SECURITYFILTERING modifier', () => {
    it('should parse Record variable with SECURITYFILTERING(Filtered)', () => {
      // Pattern from COD40.TXT line 31
      const code = `OBJECT Codeunit 40 Test {
        CODE {
          VAR
            User@1003 : Record 2000000120 SECURITYFILTERING(Filtered);
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('User');
      expect(variable.dataType.typeName).toBe('Record 2000000120');
      expect(variable.securityFiltering).toBe('Filtered');
    });

    it('should parse Record variable with SECURITYFILTERING(Ignored)', () => {
      // Pattern from COD5051.TXT
      const code = `OBJECT Codeunit 5051 Test {
        CODE {
          VAR
            InteractionLogEntry@1000 : Record 5065 SECURITYFILTERING(Ignored);
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.securityFiltering).toBe('Ignored');
    });

    it('should parse Query variable with SECURITYFILTERING', () => {
      // Pattern from TAB18.TXT
      const code = `OBJECT Table 18 Customer {
        CODE {
          VAR
            CustLedgEntryRemainAmtQuery@1000 : Query 21 SECURITYFILTERING(Filtered);
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('Query 21');
      expect(variable.securityFiltering).toBe('Filtered');
    });

    it('should parse multiple Record variables with SECURITYFILTERING', () => {
      // Pattern from PAG344.TXT
      const code = `OBJECT Page 344 Test {
        CODE {
          VAR
            Cust@1023 : Record 18 SECURITYFILTERING(Filtered);
            Vend@1024 : Record 23 SECURITYFILTERING(Filtered);
            SalesShptHeader@1025 : Record 110 SECURITYFILTERING(Filtered);
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(3);
      expect(ast.object!.code!.variables[0].securityFiltering).toBe('Filtered');
      expect(ast.object!.code!.variables[1].securityFiltering).toBe('Filtered');
      expect(ast.object!.code!.variables[2].securityFiltering).toBe('Filtered');
    });

    it('should parse Record variable without SECURITYFILTERING', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Customer@1 : Record 18;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.securityFiltering).toBeUndefined();
    });

    it('should parse TEMPORARY Record with SECURITYFILTERING', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TempCust@1 : TEMPORARY Record 18 SECURITYFILTERING(Filtered);
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.isTemporary).toBe(true);
      expect(variable.securityFiltering).toBe('Filtered');
    });

    it('should recognize SECURITYFILTERING keyword case-insensitively', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            User@1 : Record 18 SecurityFiltering(Filtered);
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.securityFiltering).toBe('Filtered');
    });

    it('should accept any identifier as SECURITYFILTERING value (lenient parsing)', () => {
      // Parser accepts any value - semantic validation is C/SIDE's responsibility
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Customer@1 : Record 18 SECURITYFILTERING(InvalidValue);
        }
      }`;
      const { ast, errors } = parseCode(code);

      // Parser should not reject invalid values - that's C/SIDE's job
      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.securityFiltering).toBe('InvalidValue');
    });

    it('should report error for SECURITYFILTERING without parentheses', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Customer@1 : Record 18 SECURITYFILTERING;
        }
      }`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Expected ( after SECURITYFILTERING');
    });

    it('should report error for SECURITYFILTERING with missing closing paren', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Customer@1 : Record 18 SECURITYFILTERING(Filtered;
        }
      }`;
      const { errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast } = parseCode(code);

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
      const { ast } = parseCode(code);

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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
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
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.variables[0].runOnClient).toBe(true);
      expect(ast.object!.code!.procedures).toHaveLength(1);
    });
  });

  describe('Lexer token recognition', () => {
    it('should recognize RUNONCLIENT as keyword token', () => {
      const code = 'RUNONCLIENT';
      const tokens = tokenize(code);

      expect(tokens).toHaveLength(2); // RUNONCLIENT + EOF
      expect(tokens[0].type).toBe('RUNONCLIENT');
      expect(tokens[0].value).toBe('RUNONCLIENT');
    });

    it('should recognize WITHEVENTS as keyword token', () => {
      const code = 'WITHEVENTS';
      const tokens = tokenize(code);

      expect(tokens).toHaveLength(2); // WITHEVENTS + EOF
      expect(tokens[0].type).toBe('WITHEVENTS');
      expect(tokens[0].value).toBe('WITHEVENTS');
    });

    it('should recognize SECURITYFILTERING as keyword token', () => {
      const code = 'SECURITYFILTERING';
      const tokens = tokenize(code);

      expect(tokens).toHaveLength(2); // SECURITYFILTERING + EOF
      expect(tokens[0].type).toBe('SECURITYFILTERING');
      expect(tokens[0].value).toBe('SECURITYFILTERING');
    });

    it('should recognize keywords case-insensitively', () => {
      const code1 = 'runonclient';
      const code2 = 'RunOnClient';
      const code3 = 'RUNONCLIENT';

      expect(tokenize(code1)[0].type).toBe('RUNONCLIENT');
      expect(tokenize(code2)[0].type).toBe('RUNONCLIENT');
      expect(tokenize(code3)[0].type).toBe('RUNONCLIENT');
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
      const { ast } = parseCode(code);

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
      const { ast } = parseCode(code);

      const variable = ast.object!.code!.variables[0];
      expect(variable.isTemporary).toBe(true);
      expect(variable.runOnClient).toBe(true);
      expect(variable.withEvents).toBeUndefined();
      expect(variable.isInDataSet).toBeUndefined();
    });
  });

  describe('Parameter modifiers', () => {
    it('should parse VAR parameter with RUNONCLIENT', () => {
      // Pattern from COD3021.TXT line 38
      const code = `OBJECT Codeunit 3021 Test {
        CODE {
          PROCEDURE GetAppSource@1(VAR DotNetAppSource2@1000 : DotNet "'Microsoft.Dynamics.Nav.ClientExtensions'.AppSource" RUNONCLIENT);
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters[0].isVar).toBe(true);
      expect(proc.parameters[0].runOnClient).toBe(true);
    });

    it('should parse non-VAR parameter with RUNONCLIENT', () => {
      // Pattern from COD3021.TXT line 43
      const code = `OBJECT Codeunit 3021 Test {
        CODE {
          PROCEDURE SetAppSource@5(DotNetAppSource2@1000 : DotNet "'Microsoft.Dynamics.Nav.ClientExtensions'.AppSource" RUNONCLIENT);
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters[0].isVar).toBe(false);
      expect(proc.parameters[0].runOnClient).toBe(true);
    });

    it('should parse parameter with WITHEVENTS RUNONCLIENT combined', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc@1(MyParam@1000 : DotNet "'Test'.TestClass" WITHEVENTS RUNONCLIENT);
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters[0].withEvents).toBe(true);
      expect(proc.parameters[0].runOnClient).toBe(true);
    });

    it('should parse multiple parameters with different modifiers', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc@1(Param1@1000 : DotNet "'Test'.Class1" RUNONCLIENT;Param2@1001 : Integer;Param3@1002 : DotNet "'Test'.Class2" WITHEVENTS);
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters).toHaveLength(3);
      expect(proc.parameters[0].runOnClient).toBe(true);
      expect(proc.parameters[0].withEvents).toBeUndefined();
      expect(proc.parameters[1].runOnClient).toBeUndefined();
      expect(proc.parameters[2].withEvents).toBe(true);
    });

    it('should parse parameter with SECURITYFILTERING', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc@1(VAR Cust@1000 : Record 18 SECURITYFILTERING(Filtered));
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters[0].securityFiltering).toBe('Filtered');
    });

    it('should parse parameter without modifiers', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc@1(MyParam@1000 : DotNet "'Test'.TestClass");
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters[0].runOnClient).toBeUndefined();
      expect(proc.parameters[0].withEvents).toBeUndefined();
    });
  });

  describe('WITHEVENTS RUNONCLIENT combined (variable order)', () => {
    it('should parse WITHEVENTS followed by RUNONCLIENT on variable', () => {
      // Pattern from PAG1306.TXT, PAG1310.TXT - real-world order is always WITHEVENTS RUNONCLIENT
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            UserTours@1019 : DotNet "'Microsoft.Dynamics.Nav.ClientExtensions'.UserTours" WITHEVENTS RUNONCLIENT;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.withEvents).toBe(true);
      expect(variable.runOnClient).toBe(true);
    });

    it('should handle CameraProvider pattern from real NAV files', () => {
      // Pattern from PAG1310.TXT line 541
      const code = `OBJECT Page 1310 Test {
        CODE {
          VAR
            CameraProvider@1007 : DotNet "'Microsoft.Dynamics.Nav.ClientExtensions, Version=14.0.0.0'.CameraProvider" WITHEVENTS RUNONCLIENT;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('CameraProvider');
      expect(variable.withEvents).toBe(true);
      expect(variable.runOnClient).toBe(true);
    });

    it('should accept reversed order RUNONCLIENT WITHEVENTS (lenient parsing)', () => {
      // Parser is lenient and accepts both orders, though NAV only exports WITHEVENTS RUNONCLIENT.
      // This tests that the parser doesn't crash or reject reversed order.
      // Semantic validation (if needed) is C/SIDE's responsibility.
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyVar@1 : DotNet "'Test'.TestClass" RUNONCLIENT WITHEVENTS;
        }
      }`;
      const { ast, errors } = parseCode(code);

      // Parser accepts both modifiers regardless of order
      expect(errors).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.runOnClient).toBe(true);
      expect(variable.withEvents).toBe(true);
    });

    it('should accept reversed order on parameters (lenient parsing)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE TestProc@1(MyParam@1000 : DotNet "'Test'.TestClass" RUNONCLIENT WITHEVENTS);
          BEGIN
          END;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const proc = ast.object!.code!.procedures[0];
      expect(proc.parameters[0].runOnClient).toBe(true);
      expect(proc.parameters[0].withEvents).toBe(true);
    });
  });
});
