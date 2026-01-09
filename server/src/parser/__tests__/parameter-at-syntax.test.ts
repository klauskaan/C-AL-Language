/**
 * Tests for @ syntax in function parameters
 * Reproduces validation report errors: "Unexpected token in parameter list"
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Parameter @ Syntax', () => {
  it('should parse parameter with @number suffix', () => {
    const code = `
      OBJECT Codeunit 50000 Test
      {
        CODE
        {
          PROCEDURE TestProc(RecordID@1000 : RecordID);
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.code).not.toBeNull();

    const procedures = ast.object?.code?.procedures || [];
    expect(procedures).toHaveLength(1);

    const proc = procedures[0];
    expect(proc.name).toBe('TestProc');
    expect(proc.parameters).toHaveLength(1);
    expect(proc.parameters[0].name).toBe('RecordID');
    expect(proc.parameters[0].dataType.typeName).toBe('RecordID');
  });

  it('should parse multiple parameters with @number suffix', () => {
    const code = `
      OBJECT Codeunit 50000 Test
      {
        CODE
        {
          PROCEDURE FindEntry(VAR ApprovalEntry@1002 : Record 454;RecordID@1000 : RecordID) : Boolean;
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.code).not.toBeNull();

    const procedures = ast.object?.code?.procedures || [];
    expect(procedures).toHaveLength(1);

    const proc = procedures[0];
    expect(proc.parameters).toHaveLength(2);

    expect(proc.parameters[0].name).toBe('ApprovalEntry');
    expect(proc.parameters[0].isVar).toBe(true);
    expect(proc.parameters[0].dataType.typeName).toBe('Record 454');

    expect(proc.parameters[1].name).toBe('RecordID');
    expect(proc.parameters[1].isVar).toBe(false);
    expect(proc.parameters[1].dataType.typeName).toBe('RecordID');
  });

  it('should parse procedure with @ syntax in name and parameters', () => {
    const code = `
      OBJECT Codeunit 50000 Test
      {
        CODE
        {
          PROCEDURE ApproveRecordApprovalRequest@48(RecordID@1000 : RecordID);
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.code).not.toBeNull();

    const procedures = ast.object?.code?.procedures || [];
    expect(procedures).toHaveLength(1);

    const proc = procedures[0];
    expect(proc.name).toBe('ApproveRecordApprovalRequest');
    expect(proc.parameters).toHaveLength(1);
    expect(proc.parameters[0].name).toBe('RecordID');
  });

  it('should handle variable declarations with @ syntax', () => {
    const code = `
      OBJECT Codeunit 50000 Test
      {
        VAR
          MyVar@1000 : Integer;
          MyRecord@1001 : Record 18;

        CODE
        {
          PROCEDURE Test;
          BEGIN
          END;
        }
      }
    `;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.code).not.toBeNull();

    const vars = ast.object?.code?.variables || [];
    expect(vars).toHaveLength(2);
    expect(vars[0].name).toBe('MyVar');
    expect(vars[1].name).toBe('MyRecord');
  });
});
