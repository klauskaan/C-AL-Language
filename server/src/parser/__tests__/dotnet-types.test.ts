/**
 * REGRESSION TESTS: DotNet Assembly-Qualified Type Declarations
 *
 * Tests comprehensive support for .NET Framework type references in C/AL.
 * DotNet types use assembly-qualified naming with single-quoted assembly references.
 *
 * This is a REGRESSION TEST suite - tests will FAIL until DotNet parsing is implemented.
 *
 * Syntax patterns discovered in real NAV code:
 *
 * 1. Full assembly qualification:
 *    DotNet "'System.Xml, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Xml.XmlNode"
 *
 * 2. Short assembly name:
 *    DotNet "'mscorlib'.System.String"
 *    DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject"
 *
 * 3. Generic types with backtick:
 *    DotNet "'mscorlib'.System.Collections.Generic.Dictionary`2"
 *    DotNet "'mscorlib'.System.Collections.Generic.KeyValuePair`2"
 *
 * 4. Nested types with + separator:
 *    DotNet "'Microsoft.Dynamics.Nav.Ncl'.Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext+StatusCode"
 *
 * 5. Complex assembly with culture and token:
 *    DotNet "'System.Net.Http, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Net.Http.HttpMessageHandler"
 *
 * Real-world sources:
 * - COD6400.TXT: Azure AD Management with JSON parsing
 * - COD2003.TXT: HTTP Client with generic Dictionary
 * - COD6711.TXT: Web service context with nested types
 * - PAG6711.TXT: Generic collections (List, KeyValuePair)
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { DataType } from '../ast';

describe('Parser - DotNet Assembly-Qualified Types', () => {
  describe('DotNet with full assembly qualification', () => {
    it('should parse DotNet with complete version/culture/token', () => {
      // Pattern from COD6400.TXT line 34
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            DotNetString@1 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.String";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Test will FAIL until DotNet parsing implemented
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object?.code).toBeDefined();

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('DotNetString');
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089');
      expect(variable.dataType.dotNetTypeName).toBe('System.String');
    });

    it('should parse DotNet with System.Xml assembly', () => {
      // Pattern from documentation example
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TaxonomyNode@1001 : DotNet "'System.Xml, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Xml.XmlNode";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('System.Xml, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089');
      expect(variable.dataType.dotNetTypeName).toBe('System.Xml.XmlNode');
    });

    it('should parse DotNet with System.Net.Http assembly', () => {
      // Pattern from COD2003.TXT line 79
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MessageHandler@1 : DotNet "'System.Net.Http, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Net.Http.HttpMessageHandler";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('System.Net.Http, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a');
      expect(variable.dataType.dotNetTypeName).toBe('System.Net.Http.HttpMessageHandler');
    });

    it('should parse DotNet with CultureInfo from mscorlib', () => {
      // Pattern from COD6400.TXT line 74
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            CultureInfo@1000 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Globalization.CultureInfo";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.dotNetTypeName).toBe('System.Globalization.CultureInfo');
    });

    it('should parse DotNet with MemoryStream', () => {
      // Pattern from COD5503.TXT line 1021
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MemoryStream@1002 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.IO.MemoryStream";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('MemoryStream');
      expect(variable.dataType.dotNetTypeName).toBe('System.IO.MemoryStream');
    });
  });

  describe('DotNet with short assembly name', () => {
    it('should parse DotNet with short mscorlib reference', () => {
      // Pattern from COD2003.TXT line 267 (Dictionary without full version)
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            LabelDict@1 : DotNet "'mscorlib'.System.Collections.Generic.Dictionary\`2";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('mscorlib');
      expect(variable.dataType.dotNetTypeName).toBe('System.Collections.Generic.Dictionary`2');
    });

    it('should parse DotNet with third-party assembly (Newtonsoft.Json)', () => {
      // Pattern from COD6400.TXT line 47
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            JObject@1028 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('JObject');
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('Newtonsoft.Json');
      expect(variable.dataType.dotNetTypeName).toBe('Newtonsoft.Json.Linq.JObject');
    });

    it('should parse DotNet with System.Drawing assembly', () => {
      // Pattern from COD9655.TXT
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            PrinterSettings@1 : DotNet "'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Drawing.Printing.PrinterSettings";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('System.Drawing.Printing.PrinterSettings');
    });
  });

  describe('DotNet with generic types (backtick notation)', () => {
    it('should parse generic Dictionary`2', () => {
      // Pattern from COD6711.TXT line 18 (variable name changed from Keys to MyDict to avoid keyword conflict)
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyDict@1000 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.Generic.Dictionary\`2";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.dotNetTypeName).toBe('System.Collections.Generic.Dictionary`2');
    });

    it('should parse generic KeyValuePair`2', () => {
      // Pattern from COD6400.TXT line 266
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Current@1002 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.Generic.KeyValuePair\`2";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('System.Collections.Generic.KeyValuePair`2');
    });

    it('should parse generic List`1', () => {
      // Pattern from PAG6711.TXT line 522
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            ColumnList@1017 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.Generic.List\`1";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('System.Collections.Generic.List`1');
    });

    it('should parse generic IReadOnlyList`1', () => {
      // Pattern from COD705.TXT line 48
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            FileList@1006 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.Generic.IReadOnlyList\`1";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('System.Collections.Generic.IReadOnlyList`1');
    });

    it('should parse generic HttpHeaderValueCollection`1', () => {
      // Pattern from COD2020.TXT line 223
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            HttpHeaderValueCollection@1006 : DotNet "'System.Net.Http, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Net.Http.Headers.HttpHeaderValueCollection\`1";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('System.Net.Http.Headers.HttpHeaderValueCollection`1');
    });
  });

  describe('DotNet with nested types (+ separator)', () => {
    it('should parse nested WebServiceActionContext+StatusCode', () => {
      // Pattern from COD6711.TXT line 32
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            ResponseCode@1003 : DotNet "'Microsoft.Dynamics.Nav.Ncl, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext+StatusCode";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('ResponseCode');
      expect(variable.dataType.typeName).toBe('DotNet');
      expect(variable.dataType.assemblyReference).toBe('Microsoft.Dynamics.Nav.Ncl, Culture=neutral, PublicKeyToken=31bf3856ad364e35');
      expect(variable.dataType.dotNetTypeName).toBe('Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext+StatusCode');
    });

    it('should parse nested TransactionDataTable', () => {
      // Pattern from PAG5540.TXT line 461
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            transactionTable@1002 : DotNet "'Microsoft.Dynamics.Framework.UI.WinForms.DataVisualization.Timeline, Version=14.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Framework.UI.WinForms.DataVisualization.TimelineVisualization.DataModel+TransactionDataTable";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('Microsoft.Dynamics.Framework.UI.WinForms.DataVisualization.TimelineVisualization.DataModel+TransactionDataTable');
    });

    it('should parse nested PrinterSettings+StringCollection', () => {
      // Pattern from COD9655.TXT line 25
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            PrinterSettingsCollection@1003 : DotNet "'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Drawing.Printing.PrinterSettings+StringCollection";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.dataType.dotNetTypeName).toBe('System.Drawing.Printing.PrinterSettings+StringCollection');
    });
  });

  describe('DotNet in different declaration contexts', () => {
    it('should parse DotNet in CODE section VAR block', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            JObject@1 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
            JArray@2 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JArray";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('DotNet');
    });

    it('should parse DotNet in procedure parameters', () => {
      // Pattern from COD2003.TXT line 79
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE SetMessageHandler@7(MessageHandler@1000 : DotNet "'System.Net.Http, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Net.Http.HttpMessageHandler");
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.name).toBe('SetMessageHandler');
      expect(procedure.parameters).toHaveLength(1);
      expect(procedure.parameters[0].dataType.typeName).toBe('DotNet');
      expect(procedure.parameters[0].dataType.dotNetTypeName).toBe('System.Net.Http.HttpMessageHandler');
    });

    it('should parse DotNet with VAR modifier in parameters', () => {
      // Pattern from COD6711.TXT line 30
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE SetUpdatedPageResponse@1(VAR ActionContext@1002 : DotNet "'Microsoft.Dynamics.Nav.Ncl, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext";EntityObjectId@1001 : Integer);
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
      expect(procedure.parameters[0].isVar).toBe(true);
      expect(procedure.parameters[0].dataType.typeName).toBe('DotNet');
      expect(procedure.parameters[1].dataType.typeName).toBe('Integer');
    });

    it('should parse DotNet in local procedure VAR section', () => {
      // Pattern from COD2003.TXT line 335
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          LOCAL PROCEDURE CreateLabelDictionary@33(VAR LabelDict@1000 : DotNet "'mscorlib'.System.Collections.Generic.Dictionary\`2");
          VAR
            Type@1001 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Type";
            Activator@1002 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Activator";
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.parameters[0].dataType.typeName).toBe('DotNet');
      expect(procedure.variables).toHaveLength(2);
      expect(procedure.variables[0].dataType.dotNetTypeName).toBe('System.Type');
      expect(procedure.variables[1].dataType.dotNetTypeName).toBe('System.Activator');
    });

    it('should parse DotNet in EVENT parameters', () => {
      // Pattern from PAG6050171.TXT line 115
      const code = `OBJECT Page 1 Test {
        CODE {
          EVENT Chart@-1160030001::DataPointClicked@1(point@1160030000 : DotNet "'Microsoft.Dynamics.Nav.Client.BusinessChart.Model, Version=14.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Nav.Client.BusinessChart.BusinessChartDataPoint");
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      // EVENT parsing may not be fully implemented, but should not crash
      expect(ast.object).toBeDefined();
    });

    it('should parse multiple DotNet variables with mixed patterns', () => {
      // Combining patterns from COD6400.TXT lines 266-273
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Current@1002 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.Generic.KeyValuePair\`2";
            JObj@1005 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
            ObjectEnumerator@1004 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.IEnumerator";
            JArray@1007 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JArray";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(4);
      expect(ast.object!.code!.variables[0].dataType.dotNetTypeName).toBe('System.Collections.Generic.KeyValuePair`2');
      expect(ast.object!.code!.variables[1].dataType.dotNetTypeName).toBe('Newtonsoft.Json.Linq.JObject');
      expect(ast.object!.code!.variables[2].dataType.dotNetTypeName).toBe('System.Collections.IEnumerator');
      expect(ast.object!.code!.variables[3].dataType.dotNetTypeName).toBe('Newtonsoft.Json.Linq.JArray');
    });
  });

  describe('Enum-style single-quoted option strings', () => {
    it('should parse single-quoted option string (not DotNet)', () => {
      // Pattern from PAG213.TXT line 147
      const code = `OBJECT Page 213 Test {
        CODE {
          VAR
            PeriodType@1001 : 'Day,Week,Month,Quarter,Year,Accounting Period';
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('PeriodType');
      // This is an inline option string, not a DotNet type
      // Parser should treat it as an option type with optionString
      expect(variable.dataType.optionString).toBe('Day,Week,Month,Quarter,Year,Accounting Period');
    });

    it('should parse single-quoted option in procedure parameter', () => {
      // Pattern from PAG213.TXT line 156
      const code = `OBJECT Page 213 Test {
        CODE {
          PROCEDURE SetColumns@11(SetWanted@1001 : 'Initial,Previous,Same,Next,PreviousColumn,NextColumn');
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.parameters[0].dataType.optionString).toBe('Initial,Previous,Same,Next,PreviousColumn,NextColumn');
    });

    it('should distinguish DotNet from inline option strings', () => {
      // Both use single quotes but have different structure
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Status@1 : 'Open,Pending,Posted';
            JObject@2 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);

      // First is inline option string (no dot separator)
      expect(ast.object!.code!.variables[0].dataType.optionString).toBe('Open,Pending,Posted');

      // Second is DotNet (has assembly reference with dot separator)
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.variables[1].dataType.dotNetTypeName).toBe('Newtonsoft.Json.Linq.JObject');
    });
  });

  describe('Error recovery and edge cases', () => {
    it('should recover from incomplete DotNet declaration (missing closing quote)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Broken@1 : DotNet "'mscorlib.System.String;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should report error but not crash
      expect(ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should recover from DotNet without type name', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Empty@1 : DotNet "'mscorlib'";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should report error but not crash
      expect(ast.object).toBeDefined();
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle DotNet with extra whitespace', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Spaced@1 : DotNet "'mscorlib'  .  System.String";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser may or may not tolerate whitespace - depends on implementation
      // But should not crash either way
      expect(ast.object).toBeDefined();
    });

    it('should handle DotNet with empty assembly reference', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            NoAsm@1 : DotNet "''.System.String";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should handle gracefully (may report error)
      expect(ast.object).toBeDefined();
    });

    it('should distinguish DotNet keyword from identifier named dotnet', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            dotnet@1 : Integer;
            MyType@2 : DotNet "'mscorlib'.System.String";
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].name).toBe('dotnet');
      expect(ast.object!.code!.variables[0].dataType.typeName).toBe('Integer');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('DotNet');
    });
  });

  describe('Real-world NAV patterns (integration tests)', () => {
    it('should parse Azure AD Management pattern (COD6400)', () => {
      const code = `OBJECT Codeunit 6400 "Azure AD Mgt." {
        CODE {
          VAR
            AzureAdMgt@1012 : Codeunit 6300;
            DotNetString@1013 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.String";
            JObject@1028 : DotNet "'Newtonsoft.Json'.Newtonsoft.Json.Linq.JObject";

          PROCEDURE ToUpper@1(InputString : Text) : Text;
          VAR
            CultureInfo@1000 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Globalization.CultureInfo";
            TextInfo@1001 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Globalization.TextInfo";
          BEGIN
            EXIT(InputString);
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe('Codeunit');
      expect(ast.object!.code!.variables).toHaveLength(3);
      expect(ast.object!.code!.procedures).toHaveLength(1);
      expect(ast.object!.code!.procedures[0].variables).toHaveLength(2);
    });

    it('should parse HTTP client pattern (COD2003)', () => {
      const code = `OBJECT Codeunit 2003 "Http Client" {
        CODE {
          PROCEDURE SetMessageHandler@7(MessageHandler@1000 : DotNet "'System.Net.Http, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'.System.Net.Http.HttpMessageHandler");
          BEGIN
          END;

          LOCAL PROCEDURE CreateLabelDictionary@33(VAR LabelDict@1000 : DotNet "'mscorlib'.System.Collections.Generic.Dictionary\`2");
          VAR
            Type@1001 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Type";
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(2);
      expect(ast.object!.code!.procedures[0].parameters[0].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.procedures[1].parameters[0].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.procedures[1].variables).toHaveLength(1);
    });

    it('should parse Web Service Action Context pattern (COD6711)', () => {
      const code = `OBJECT Codeunit 6711 "Action Context" {
        CODE {
          VAR
            MyDict@1000 : DotNet "'mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Collections.Generic.Dictionary\`2";

          PROCEDURE SetCreatedPageResponse@2(VAR ActionContext@1002 : DotNet "'Microsoft.Dynamics.Nav.Ncl, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext";EntityObjectId@1001 : Integer);
          VAR
            ResponseCode@1003 : DotNet "'Microsoft.Dynamics.Nav.Ncl, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext+StatusCode";
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables[0].dataType.dotNetTypeName).toBe('System.Collections.Generic.Dictionary`2');
      expect(ast.object!.code!.procedures[0].parameters[0].dataType.dotNetTypeName).toBe('Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext');
      expect(ast.object!.code!.procedures[0].variables[0].dataType.dotNetTypeName).toBe('Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext+StatusCode');
    });

    it('should parse Page with mixed types including options and DotNet', () => {
      const code = `OBJECT Page 213 Test {
        CODE {
          VAR
            PeriodType@1001 : 'Day,Week,Month,Quarter,Year';
            Credentials@1002 : DotNet "'System, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Net.NetworkCredential";

          PROCEDURE SetColumns@11(SetWanted@1001 : 'Initial,Previous,Same,Next');
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);
      expect(ast.object!.code!.variables[0].dataType.optionString).toBe('Day,Week,Month,Quarter,Year');
      expect(ast.object!.code!.variables[1].dataType.typeName).toBe('DotNet');
      expect(ast.object!.code!.procedures[0].parameters[0].dataType.optionString).toBe('Initial,Previous,Same,Next');
    });
  });

  describe('AST structure validation', () => {
    it('should include all required fields in DataType node for DotNet', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyType@1 : DotNet "'mscorlib'.System.String";
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

      // DotNet-specific fields
      expect(dataType.typeName).toBe('DotNet');
      expect(dataType.assemblyReference).toBe('mscorlib');
      expect(dataType.dotNetTypeName).toBe('System.String');

      // Should NOT have these fields for DotNet
      expect(dataType.length).toBeUndefined();
      expect(dataType.tableId).toBeUndefined();
      expect(dataType.optionString).toBeUndefined();
    });

    it('should preserve token positions for DotNet type declarations', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyType@1 : DotNet "'mscorlib'.System.String";
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
});
