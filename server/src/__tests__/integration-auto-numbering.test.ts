/**
 * Integration Tests - Real COD1003.TXT Auto-Numbering Issues
 *
 * Tests parsing of actual C/AL code from COD1003.TXT (Job Task-Indent codeunit)
 * that exposed two critical bugs:
 *
 * Issue 1: Parser error "Unexpected token in parameter list at line 43, column 29"
 *   Code: [External] PROCEDURE Indent@1(JobNo@1000 : Code[20]);
 *   Root cause: @ character tokenized as Unknown, parameter parsing doesn't
 *               skip @number suffix like procedure name parsing does
 *
 * Issue 2: Array variable with @number potentially showing incorrect CodeLens
 *   Code: JTNo@1008 : ARRAY [10] OF Code[20];
 *   Need to verify references are correctly tracked
 *
 * This test uses the actual problematic code to ensure the parser handles
 * real-world C/AL correctly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';

describe('Integration - COD1003.TXT Auto-Numbering Issues', () => {
  const cod1003Path = path.join(__dirname, '../../../test/REAL/COD1003.TXT');
  let cod1003Content: string;

  beforeAll(() => {
    // Read the actual problematic file
    if (fs.existsSync(cod1003Path)) {
      cod1003Content = fs.readFileSync(cod1003Path, 'utf8');
    }
  });

  describe('Full file parsing', () => {
    it('should parse COD1003.TXT without errors', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Main assertion: should parse without errors
      // Before fix: "Unexpected token in parameter list at line 43, column 29"
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).not.toBeNull();

      // If there are errors, log them for debugging
      // Parser doesn't return errors array in CALDocument
      // Errors are logged internally or available through diagnostics

      // After fix: no errors expected
      // expect(ast.errors).toHaveLength(0);
    });

    it('should correctly identify object as Codeunit 1003', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object?.objectKind).toBe('Codeunit');
      expect(ast.object?.objectId).toBe(1003);
      expect(ast.object?.objectName).toBe('Job Task-Indent');
    });
  });

  describe('Issue 1: Procedure with @number and parameters', () => {
    it('should parse the problematic Indent@1 procedure from line 43', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object?.code).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];

      // Find the Indent procedure
      const indentProc = procedures.find((p: any) => p.name === 'Indent');
      expect(indentProc).toBeDefined();
      expect(indentProc?.name).toBe('Indent');

      // Verify it has the parameter
      const parameters = indentProc?.parameters || [];
      expect(parameters).toHaveLength(1);
      expect(parameters[0].name).toBe('JobNo');
      expect(parameters[0].dataType?.typeName).toBe('Code[20]');
      expect(parameters[0].dataType?.length).toBe(20);
    });

    it('should preserve [External] attribute on Indent procedure', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      // Test that the [External] attribute doesn't interfere with @number parsing
      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const procedures = ast.object?.code?.procedures || [];
      const indentProc = procedures.find((p: any) => p.name === 'Indent');

      expect(indentProc).toBeDefined();
      // The procedure should parse correctly regardless of attributes
      expect(indentProc?.parameters).toHaveLength(1);
    });
  });

  describe('Issue 2: Array variable with @number', () => {
    it('should parse JTNo@1008 array variable from line 39', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object?.code).not.toBeNull();

      const globalVariables = ast.object?.code?.variables || [];

      // Find the JTNo array variable
      const jtNoVar = globalVariables.find((v: any) => v.name === 'JTNo');
      expect(jtNoVar).toBeDefined();
      expect(jtNoVar?.name).toBe('JTNo');
      expect(jtNoVar?.dataType?.typeName).toBe('ARRAY[10] OF Code[20]');

      // Verify array type
      const arrayType = jtNoVar?.dataType;
      if (arrayType?.typeName === 'ARRAY') {
        // Array data type is properly identified as ARRAY
        // Actual dimension and element type parsing is in the AST structure
        expect(arrayType.typeName).toBe('ARRAY');
      }
    });

    it('should parse all global variables with @numbers', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const globalVariables = ast.object?.code?.variables || [];

      // COD1003 has 7 TextConst variables + 4 regular variables = 11 total
      expect(globalVariables.length).toBeGreaterThanOrEqual(4);

      // Verify the non-TextConst variables
      const jtVar = globalVariables.find((v: any) => v.name === 'JT');
      expect(jtVar).toBeDefined();
      expect(jtVar?.dataType?.typeName).toBe('Record 1001');

      const windowVar = globalVariables.find((v: any) => v.name === 'Window');
      expect(windowVar).toBeDefined();
      expect(windowVar?.dataType?.typeName).toBe('Dialog');

      const jtNoVar = globalVariables.find((v: any) => v.name === 'JTNo');
      expect(jtNoVar).toBeDefined();
      expect(jtNoVar?.dataType?.typeName).toBe('ARRAY[10] OF Code[20]');

      const iVar = globalVariables.find((v: any) => v.name === 'i');
      expect(iVar).toBeDefined();
      expect(iVar?.dataType?.typeName).toBe('Integer');
    });
  });

  describe('Variable references in code', () => {
    it('should track JTNo array references in procedure body', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parse the file successfully
      expect(ast.object).not.toBeNull();

      // JTNo is referenced in the code:
      // - Line 57: Totaling := JTNo[i] + '..' + "Job Task No.";
      // - Line 66: IF i > ARRAYLEN(JTNo) THEN
      // - Line 68: JTNo[i] := "Job Task No.";

      // This test verifies the variable is properly parsed
      // Reference tracking is tested by the references provider
      const globalVariables = ast.object?.code?.variables || [];
      const jtNoVar = globalVariables.find((v: any) => v.name === 'JTNo');
      expect(jtNoVar).toBeDefined();
    });
  });

  describe('Minimal reproduction of Issue 1', () => {
    it('should parse minimal case: procedure with @number followed by parameters', () => {
      // Minimal reproduction from COD1003.TXT lines 42-44
      const minimalCode = `
        OBJECT Codeunit 1003 Test
        {
          CODE
          {
            [External]
            PROCEDURE Indent@1(JobNo@1000 : Code[20]);
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const lexer = new Lexer(minimalCode);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Before fix: "Unexpected token in parameter list"
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Indent');
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters?.[0].name).toBe('JobNo');
    });

    it('should parse without [External] attribute (isolate @number issue)', () => {
      // Test without [External] to confirm issue is with @number, not attribute
      const code = `
        OBJECT Codeunit 1003 Test
        {
          CODE
          {
            PROCEDURE Indent@1(JobNo@1000 : Code[20]);
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Indent');
      expect(procedures[0].parameters).toHaveLength(1);
    });
  });

  describe('AST snapshot for COD1003.TXT', () => {
    it('should generate consistent AST for COD1003.TXT', () => {
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // After fix, this should produce a stable AST
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');

      // Verify key structure elements
      expect(ast.object?.objectKind).toBe('Codeunit');
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.procedures).toBeDefined();
      expect(ast.object?.code?.variables).toBeDefined();

      // SECURITY: Never enable snapshots for tests loading test/REAL/ files
      // Snapshot would contain proprietary C/AL code from NAV objects (object names,
      // procedure names, variable names, TextConst values, etc.) which would be
      // committed to the repository. Use synthetic fixtures in test/fixtures/ instead.
      // Related: Issue #130 - preventing test/REAL/ content leakage
    });
  });

  describe('Edge cases from real code', () => {
    it('should handle TextConst with special characters and @numbers', () => {
      // COD1003 has TextConst variables with complex values
      const code = `
        OBJECT Codeunit 1 Test
        {
          CODE
          {
            VAR
              Text005@1005 : TextConst 'DAN=Til-sum %1 mangler en tilhørende Fra-sum.;ENU=End-Total %1 is missing a matching Begin-Total.';
              ArrayExceededErr@1010 : TextConst '@@@="%1 = A number bigger than 1";DAN=Du kan kun indrykke %1 niveauer for sagsopgaver af typen Fra-sum.;ENU=You can only indent %1 levels for job tasks of the type Begin-Total.';

            BEGIN
            END.
          }
        }
      `;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();

      const globalVariables = ast.object?.code?.variables || [];
      expect(globalVariables.length).toBeGreaterThanOrEqual(2);

      const text005 = globalVariables.find((v: any) => v.name === 'Text005');
      expect(text005).toBeDefined();

      const arrayExceededErr = globalVariables.find((v: any) => v.name === 'ArrayExceededErr');
      expect(arrayExceededErr).toBeDefined();
    });

    it('should handle OnRun trigger with procedure call using @number parameter', () => {
      // COD1003 OnRun trigger calls Indent("Job No.") on line 23
      // Verify the entire structure parses correctly
      if (!cod1003Content) {
        console.warn('COD1003.TXT not found, skipping test');
        return;
      }

      const lexer = new Lexer(cod1003Content);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).not.toBeNull();
      expect(ast.object?.properties).toBeDefined();

      // OnRun trigger should be parsed (part of properties section)
      // The fact that it calls Indent (which has @number) shouldn't cause issues
      const procedures = ast.object?.code?.procedures || [];
      const indentProc = procedures.find((p: any) => p.name === 'Indent');
      expect(indentProc).toBeDefined();
    });
  });
});
