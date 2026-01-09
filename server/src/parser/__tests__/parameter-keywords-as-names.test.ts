/**
 * Tests for using keywords as parameter names
 * Reproduces validation report errors from COD6223.TXT:
 * "Unexpected token 'Table' in parameter list"
 *
 * In C/AL, keywords like Table, Record, Code, etc. can be used as parameter names.
 * The parser needs to accept these tokens as identifiers in parameter context.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Keywords as Parameter Names', () => {
  it('should parse parameter named "Table" with DotNet type', () => {
    const code = `
      OBJECT Codeunit 6223 Test
      {
        CODE
        {
          PROCEDURE AddColumn(VAR Table@1000 : DotNet "'System'.System.Data.DataTable");
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(parser.getErrors()).toHaveLength(0);
    expect(ast.object).not.toBeNull();
    expect(ast.object?.code).not.toBeNull();

    const procedures = ast.object?.code?.procedures || [];
    expect(procedures).toHaveLength(1);

    const proc = procedures[0];
    expect(proc.name).toBe('AddColumn');
    expect(proc.parameters).toHaveLength(1);

    const param = proc.parameters[0];
    expect(param.name).toBe('Table');
    expect(param.isVar).toBe(true);
    expect(param.dataType.typeName).toBe('DotNet');
    expect(param.dataType.assemblyReference).toBe('System');
    expect(param.dataType.dotNetTypeName).toBe('System.Data.DataTable');
  });

  it('should parse parameter named "Record" with Integer type', () => {
    const code = `
      OBJECT Codeunit 50000 Test
      {
        CODE
        {
          PROCEDURE TestProc(Record@1000 : Integer);
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(parser.getErrors()).toHaveLength(0);

    const procedures = ast.object?.code?.procedures || [];
    expect(procedures).toHaveLength(1);

    const proc = procedures[0];
    expect(proc.parameters).toHaveLength(1);
    expect(proc.parameters[0].name).toBe('Record');
    expect(proc.parameters[0].dataType.typeName).toBe('Integer');
  });

  it('should parse multiple keyword parameters', () => {
    const code = `
      OBJECT Codeunit 50000 Test
      {
        CODE
        {
          PROCEDURE Test(Table@1 : Integer;Record@2 : Code20;Page@3 : Text;Report@4 : Boolean);
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(parser.getErrors()).toHaveLength(0);

    const procedures = ast.object?.code?.procedures || [];
    const proc = procedures[0];
    expect(proc.parameters).toHaveLength(4);

    expect(proc.parameters[0].name).toBe('Table');
    expect(proc.parameters[1].name).toBe('Record');
    expect(proc.parameters[2].name).toBe('Page');
    expect(proc.parameters[3].name).toBe('Report');
  });

  it('should parse complex DotNet parameter from real code', () => {
    // Real example from COD6223.TXT line 63
    const code = `
      OBJECT Codeunit 6223 Test
      {
        CODE
        {
          PROCEDURE AddColumnHeader@23(WorksheetWriter@1001 : DotNet "'Microsoft.Dynamics.Nav.OpenXml, Version=14.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.Microsoft.Dynamics.Nav.OpenXml.Spreadsheet.WorksheetWriter";VAR Table@1000 : DotNet "'DocumentFormat.OpenXml, Version=2.5.5631.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.DocumentFormat.OpenXml.Spreadsheet.Table";ColumnID@1002 : Integer;ColumnName@1003 : Text;VAR TableColumn@1006 : DotNet "'DocumentFormat.OpenXml, Version=2.5.5631.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35'.DocumentFormat.OpenXml.Spreadsheet.TableColumn");
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(parser.getErrors()).toHaveLength(0);

    const procedures = ast.object?.code?.procedures || [];
    expect(procedures).toHaveLength(1);

    const proc = procedures[0];
    expect(proc.name).toBe('AddColumnHeader');
    expect(proc.parameters).toHaveLength(5);

    // First parameter: WorksheetWriter
    expect(proc.parameters[0].name).toBe('WorksheetWriter');
    expect(proc.parameters[0].isVar).toBe(false);
    expect(proc.parameters[0].dataType.typeName).toBe('DotNet');

    // Second parameter: Table (this is the critical one!)
    expect(proc.parameters[1].name).toBe('Table');
    expect(proc.parameters[1].isVar).toBe(true);
    expect(proc.parameters[1].dataType.typeName).toBe('DotNet');
    expect(proc.parameters[1].dataType.assemblyReference).toBe('DocumentFormat.OpenXml, Version=2.5.5631.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35');
    expect(proc.parameters[1].dataType.dotNetTypeName).toBe('DocumentFormat.OpenXml.Spreadsheet.Table');

    // Third parameter: ColumnID
    expect(proc.parameters[2].name).toBe('ColumnID');
    expect(proc.parameters[2].dataType.typeName).toBe('Integer');

    // Fourth parameter: ColumnName
    expect(proc.parameters[3].name).toBe('ColumnName');
    expect(proc.parameters[3].dataType.typeName).toBe('Text');

    // Fifth parameter: TableColumn
    expect(proc.parameters[4].name).toBe('TableColumn');
    expect(proc.parameters[4].isVar).toBe(true);
    expect(proc.parameters[4].dataType.typeName).toBe('DotNet');
  });
});
