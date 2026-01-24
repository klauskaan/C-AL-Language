/**
 * REGRESSION TESTS: Automation Type Declarations
 *
 * Tests comprehensive support for COM Automation type references in C/AL (NAV 2009+).
 * Automation types use GUID-based type library references for COM interop.
 *
 * This is a REGRESSION TEST suite - tests will FAIL until Automation parsing is implemented.
 *
 * Syntax pattern (from real NAV exports):
 * Automation "{TypeLibGUID} Version:{ClassGUID}:'TypeLibName'.ClassName"
 *
 * Real-world examples:
 * 1. Windows Script Host FileSystemObject:
 *    Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject"
 *
 * 2. Microsoft XML with version 3.0:
 *    Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode"
 *
 * Differences from DotNet:
 * - DotNet: Uses .NET assembly references → "'AssemblyName'.TypeName"
 * - Automation: Uses COM GUID references → "{GUID} Version:{GUID}:'TypeLib'.ClassName"
 *
 * Context:
 * - Automation types are legacy COM interop (NAV 2009-2018)
 * - Modern NAV versions prefer DotNet for .NET Framework integration
 * - Both can coexist in same codebase
 * - Automation types commonly use WITHEVENTS modifier for COM events
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Automation Type Declarations', () => {
  describe('Basic Automation variable declarations', () => {
    it('should parse Automation with Windows Script Host FileSystemObject', () => {
      // Real NAV pattern for COM FileSystemObject access
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FileSystemObject@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Test will FAIL until Automation parsing implemented
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object?.code).toBeDefined();

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('FileSystemObject');
      expect(variable.dataType.typeName).toBe('Automation');
      expect(variable.dataType.automationTypeLibGuid).toBe('F935DC20-1CF0-11D0-ADB9-00C04FD58A0B');
      expect(variable.dataType.automationVersion).toBe('1.0');
      expect(variable.dataType.automationClassGuid).toBe('0D43FE01-F093-11CF-8940-00A0C9054228');
      expect(variable.dataType.automationTypeLibName).toBe('Windows Script Host Object Model');
      expect(variable.dataType.automationClassName).toBe('FileSystemObject');
    });

    it('should parse Automation with Microsoft XML v3.0', () => {
      // Real NAV pattern for XML DOM manipulation
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            XMLDoc@1 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('XMLDoc');
      expect(variable.dataType.typeName).toBe('Automation');
      expect(variable.dataType.automationTypeLibGuid).toBe('F5078F18-C551-11D3-89B9-0000F81FE221');
      expect(variable.dataType.automationVersion).toBe('3.0');
      expect(variable.dataType.automationClassGuid).toBe('2933BF80-7B36-11D2-B20E-00C04F983E60');
      expect(variable.dataType.automationTypeLibName).toBe('Microsoft XML, v3.0');
      expect(variable.dataType.automationClassName).toBe('IXMLDOMNode');
    });

    it('should parse Automation with TypeLibName containing spaces', () => {
      // TypeLib names often contain spaces and descriptive text
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.automationTypeLibName).toBe('Windows Script Host Object Model');
    });

    it('should parse Automation with TypeLibName containing commas', () => {
      // XML TypeLib includes version with comma separator
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            XMLNode@1 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.automationTypeLibName).toBe('Microsoft XML, v3.0');
    });

    it('should parse multiple Automation variables in VAR block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
            XMLDoc@2 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('Automation');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('Automation');
    });
  });

  describe('Automation with WITHEVENTS modifier', () => {
    it('should parse Automation with WITHEVENTS for COM event handling', () => {
      // WITHEVENTS enables event handler declarations for COM objects
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            XMLDoc@1 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode" WITHEVENTS;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('Automation');
      expect(variable.withEvents).toBe(true);
      expect(variable.runOnClient).toBeUndefined();
    });

    it('should parse Automation without WITHEVENTS', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.withEvents).toBeUndefined();
    });

    it('should parse multiple Automation variables with mixed WITHEVENTS', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
            XMLDoc@2 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode" WITHEVENTS;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables[0].withEvents).toBeUndefined();
      expect(ast.object!.code!.variables[1].withEvents).toBe(true);
    });
  });

  describe('Automation in different declaration contexts', () => {
    it('should parse Automation in procedure parameter', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessXML@1(VAR XMLDoc@1000 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode");
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.name).toBe('ProcessXML');
      expect(procedure.parameters).toHaveLength(1);
      expect(procedure.parameters[0].isVar).toBe(true);
      expect(procedure.parameters[0].dataType.typeName).toBe('Automation');
      expect(procedure.parameters[0].dataType.automationClassName).toBe('IXMLDOMNode');
    });

    it('should parse Automation in local procedure VAR section', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          LOCAL PROCEDURE ProcessFiles@1();
          VAR
            FSO@1000 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].dataType.typeName).toBe('Automation');
      expect(procedure.variables[0].dataType.automationClassName).toBe('FileSystemObject');
    });

    it('should parse Automation in CODE section VAR block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
            XMLDoc@2 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('Automation');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('Automation');
    });

    it('should parse Automation parameter with WITHEVENTS', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE InitXML@1(XMLDoc@1000 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode" WITHEVENTS);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.parameters[0].dataType.typeName).toBe('Automation');
      expect(procedure.parameters[0].withEvents).toBe(true);
    });

    it('should parse multiple Automation parameters', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessData@1(FSO@1000 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";XMLDoc@1001 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode");
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.parameters).toHaveLength(2);
      expect(procedure.parameters[0].dataType.automationClassName).toBe('FileSystemObject');
      expect(procedure.parameters[1].dataType.automationClassName).toBe('IXMLDOMNode');
    });
  });

  describe('DotNet regression (ensure DotNet still works)', () => {
    it('should not confuse DotNet with Automation types', () => {
      // DotNet and Automation have different quote patterns
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            JObject@1 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
            FSO@2 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);

      // First is DotNet
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.variables[0].dataType.assemblyReference).toBe('Newtonsoft.Json');
      expect(ast.object!.code!.variables[0].dataType.dotNetTypeName).toBe('Newtonsoft.Json.Linq.JObject');
      expect(ast.object!.code!.variables[0].dataType.automationTypeLibGuid).toBeUndefined();

      // Second is Automation
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('Automation');
      expect(ast.object!.code!.variables[1].dataType.automationTypeLibGuid).toBe('F935DC20-1CF0-11D0-ADB9-00C04FD58A0B');
      expect(ast.object!.code!.variables[1].dataType.assemblyReference).toBeUndefined();
    });

    it('should parse DotNet types correctly after Automation implementation', () => {
      // Regression test to ensure DotNet parsing is not broken
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            DotNetString@1 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.String";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089');
      expect(variable.dataType.dotNetTypeName).toBe('System.String');
    });

    it('should handle mixed DotNet, Automation, and simple types', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyInt@1 : Integer;
            JObject@2 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
            FSO@3 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
            MyText@4 : Text[100];
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(4);
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('Integer');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.variables[2].dataType.typeName).toBe('Automation');
      expect(ast.object!.code!.variables[3].dataType.typeName).toBe('Text[100]');
    });
  });

  describe('Error recovery and edge cases', () => {
    it('should recover from malformed Automation (missing closing brace)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Broken@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should report error but not crash
      expect(ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should recover from Automation missing class GUID', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Incomplete@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should report error but not crash
      expect(ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should recover from Automation missing version', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            NoVer@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B}:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should report error but not crash
      expect(ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle Automation with invalid GUID format', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            BadGuid@1 : Automation "{INVALID-GUID} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should handle gracefully (may report error or accept lenient format)
      expect(ast.object).toBeDefined();
    });

    it('should handle Automation with empty TypeLibName', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            NoName@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:''.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should handle gracefully but may report error for empty TypeLibName
      expect(ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle extra whitespace in Automation declaration', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Spaced@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B}  1.0  :  {0D43FE01-F093-11CF-8940-00A0C9054228}  :  'Windows Script Host Object Model'  .  FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser may or may not tolerate extra whitespace - but should not crash
      expect(ast.object).toBeDefined();
    });

    it('should distinguish Automation keyword from identifier named automation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            automation@1 : Integer;
            MyAuto@2 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].name).toBe('automation');
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('Integer');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('Automation');
    });
  });

  describe('AST structure validation', () => {
    it('should include all required fields in DataType node for Automation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const dataType = ast.object!.code!.variables[0].dataType;

      // Required base AST fields
      expect(dataType.type).toBe('DataType');
      expect(dataType.startToken).toBeDefined();
      expect(dataType.endToken).toBeDefined();

      // Automation-specific fields
      expect(dataType.typeName).toBe('Automation');
      expect(dataType.automationTypeLibGuid).toBe('F935DC20-1CF0-11D0-ADB9-00C04FD58A0B');
      expect(dataType.automationVersion).toBe('1.0');
      expect(dataType.automationClassGuid).toBe('0D43FE01-F093-11CF-8940-00A0C9054228');
      expect(dataType.automationTypeLibName).toBe('Windows Script Host Object Model');
      expect(dataType.automationClassName).toBe('FileSystemObject');

      // Should NOT have these fields for Automation
      expect(dataType.length).toBeUndefined();
      expect(dataType.tableId).toBeUndefined();
      expect(dataType.optionString).toBeUndefined();
      expect(dataType.assemblyReference).toBeUndefined();
      expect(dataType.dotNetTypeName).toBeUndefined();
    });

    it('should preserve token positions for Automation type declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FSO@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const variable = ast.object!.code!.variables[0];

      expect(variable.startToken).toBeDefined();
      expect(variable.endToken).toBeDefined();
      expect(variable.dataType.startToken).toBeDefined();
      expect(variable.dataType.endToken).toBeDefined();

      // Token positions should be in valid range
      expect(variable.startToken.line).toBeGreaterThan(0);
      expect(variable.startToken.column).toBeGreaterThan(0);
    });
  });

  describe('Automation with escaped quotes in TypeLibName (Issue #175)', () => {
    it('should parse Automation with escaped single quote in TypeLibName', () => {
      // TypeLibName contains apostrophe, escaped as '' in C/AL
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Component@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'O''Reilly''s Library'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('Automation');
      // IMPORTANT: Verify unescaped value (single quote, not doubled)
      expect(variable.dataType.automationTypeLibName).toBe("O'Reilly's Library");
      expect(variable.dataType.automationClassName).toBe('FileSystemObject');
    });

    it('should parse Automation with multiple escaped quotes in TypeLibName', () => {
      // Multiple '' sequences in TypeLibName
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Component@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'It''s O''Reilly''s Library'.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('Automation');
      // All '' sequences should be unescaped to single '
      expect(variable.dataType.automationTypeLibName).toBe("It's O'Reilly's Library");
    });

    it('should parse Automation with TypeLibName containing only escaped quote', () => {
      // Edge case: '''' becomes '
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Component@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:''''.FileSystemObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('Automation');
      expect(variable.dataType.automationTypeLibName).toBe("'");
    });

    it('should handle ClassName if it contains escaped quote', () => {
      // Defensive test: COM class names are identifiers, shouldn't contain quotes
      // But parser should not crash if it encounters this edge case
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Component@1 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Library'.File''System''Object";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser may or may not accept this, but should not crash
      expect(ast.object).toBeDefined();
      // Document the behavior: COM class names are identifiers, not string literals
      // This test verifies graceful handling of unusual input
    });
  });

  describe('Real-world NAV patterns', () => {
    it('should parse FileSystemObject pattern for file operations', () => {
      // Common pattern for file system manipulation in NAV
      const code = `OBJECT Codeunit 1 FileUtils {
        CODE {
          VAR
            FSO@1000 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";

          PROCEDURE FileExists@1(FileName : Text[1024]) : Boolean;
          BEGIN
            EXIT(FSO.FileExists(FileName));
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.objectKind).toBe('Codeunit');
      expect(ast.object!.code!.variables[0].dataType.automationClassName).toBe('FileSystemObject');
      expect(ast.object!.code!.procedures).toHaveLength(1);
    });

    it('should parse XML DOM pattern for XML processing', () => {
      // Common pattern for XML manipulation in NAV
      const code = `OBJECT Codeunit 1 XMLHandler {
        CODE {
          VAR
            XMLDoc@1000 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode" WITHEVENTS;

          PROCEDURE LoadXML@1(XMLText : Text);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables[0].dataType.automationClassName).toBe('IXMLDOMNode');
      expect(ast.object!.code!.variables[0].withEvents).toBe(true);
    });

    it('should parse mixed Automation types in production codeunit', () => {
      const code = `OBJECT Codeunit 1 Integration {
        CODE {
          VAR
            FSO@1000 : Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject";
            XMLDoc@1001 : Automation "{F5078F18-C551-11D3-89B9-0000F81FE221} 3.0:{2933BF80-7B36-11D2-B20E-00C04F983E60}:'Microsoft XML, v3.0'.IXMLDOMNode" WITHEVENTS;
            Customer@1002 : Record 18;

          PROCEDURE Process@1();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(3);
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('Automation');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('Automation');
      expect(ast.object!.code!.variables[2].dataType.typeName).toBe('Record 18');
    });
  });
});
