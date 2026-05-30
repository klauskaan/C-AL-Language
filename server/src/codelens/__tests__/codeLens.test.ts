import { CodeLensProvider } from '../codeLensProvider';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../../symbols/symbolTable';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Helper to create a TextDocument from C/AL code
 */
function createDocument(content: string, uri = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse C/AL code into AST, symbolTable, and tokens.
 * Existing callers that destructure only { ast } keep working — extra fields are ignored.
 */
function parseContent(content: string) {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const ast = new Parser(tokens).parse();
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return { ast, symbolTable, tokens };
}

describe('CodeLensProvider', () => {
  let provider: CodeLensProvider;

  beforeEach(() => {
    provider = new CodeLensProvider();
  });

  describe('Basic Functionality', () => {
    it('should return empty array for empty file', () => {
      const code = '';
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses).toEqual([]);
    });

    it('should return empty array for file with no declarations', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses).toEqual([]);
    });

    it('should show CodeLens for procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command).toBeDefined();
      expect(lenses[0].command?.title).toMatch(/\d+ references?/);
    });

    it('should show CodeLens for trigger', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    TRIGGER OnRun@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toMatch(/\d+ references?/);
    });

    it('should show CodeLens for global variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      MyVar@1000 : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toMatch(/\d+ references?/);
    });

    it('should show CodeLens for procedure parameter', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Param@1000 : Integer);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Should have CodeLens for both procedure and parameter
      expect(lenses.length).toBe(2);
    });

    it('should show CodeLens for table field', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toMatch(/\d+ references?/);
    });

    it('should show CodeLens for table with multiple fields', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
    { 2   ;   ;Name            ;Text50        }
    { 10  ;   ;Balance         ;Decimal       }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(3);
      // Verify each lens has the reference command
      lenses.forEach(lens => {
        expect(lens.command?.title).toMatch(/\d+ references?/);
      });
    });
  });

  describe('Reference Counting', () => {
    it('should show "0 references" for unused procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE UnusedProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toBe('0 references');
    });

    it('should show "1 reference" for procedure called once', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CalledOnce@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      CalledOnce;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Find the CodeLens for CalledOnce
      const calledOnceLens = lenses.find(lens =>
        lens.command?.arguments?.[1]?.line === 4  // CalledOnce is on line 5 (0-based: 4)
      );
      expect(calledOnceLens?.command?.title).toBe('1 reference');
    });

    it('should show "N references" for procedure called multiple times', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CalledMultiple@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      CalledMultiple;
      CalledMultiple;
      CalledMultiple;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Find the CodeLens for CalledMultiple
      const calledMultipleLens = lenses.find(lens =>
        lens.command?.arguments?.[1]?.line === 4  // CalledMultiple is on line 5 (0-based: 4)
      );
      expect(calledMultipleLens?.command?.title).toBe('3 references');
    });

    it('should count self-reference in recursive procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Recursive@1(N@1000 : Integer);
    BEGIN
      IF N > 0 THEN
        Recursive(N - 1);
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Find the CodeLens for Recursive (should count the self-call)
      const recursiveLens = lenses.find(lens =>
        lens.command?.arguments?.[1]?.line === 4  // Recursive is on line 5 (0-based: 4)
      );
      expect(recursiveLens?.command?.title).toBe('1 reference');
    });

    it('should show "0 references" for unused field', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toBe('0 references');
    });

    it('should show "1 reference" for field used once', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
  }
  CODE
  {
    PROCEDURE DoSomething@1();
    BEGIN
      No := 'ABC';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Find the CodeLens for field No (on line 5, 0-based: 4)
      const noFieldLens = lenses.find(lens =>
        lens.command?.arguments?.[1]?.line === 4
      );
      expect(noFieldLens?.command?.title).toBe('1 reference');
    });

    it('should show "N references" for field used multiple times', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
  }
  CODE
  {
    PROCEDURE DoSomething@1();
    BEGIN
      No := 'ABC';
      IF No = '' THEN
        No := 'DEF';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Find the CodeLens for field No (on line 5, 0-based: 4)
      const noFieldLens = lenses.find(lens =>
        lens.command?.arguments?.[1]?.line === 4
      );
      expect(noFieldLens?.command?.title).toBe('3 references');
    });
  });

  describe('Declaration vs Usage', () => {
    it('should not count declaration itself in reference count', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toBe('0 references');
    });
  });

  describe('Multiple Symbols', () => {
    it('should show independent CodeLens for each procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Proc1@1();
    BEGIN
    END;

    PROCEDURE Proc2@2();
    BEGIN
      Proc1;
    END;

    PROCEDURE Proc3@3();
    BEGIN
      Proc1;
      Proc2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(3);

      // Proc1 called by Proc2 and Proc3
      const proc1Lens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 4);
      expect(proc1Lens?.command?.title).toBe('2 references');

      // Proc2 called by Proc3
      const proc2Lens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 8);
      expect(proc2Lens?.command?.title).toBe('1 reference');

      // Proc3 not called
      const proc3Lens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 13);
      expect(proc3Lens?.command?.title).toBe('0 references');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive references', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      MYPROC;
      myproc;
      MyProc;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      const myProcLens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 4);
      expect(myProcLens?.command?.title).toBe('3 references');
    });

    it('should handle quoted procedure names', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE "No."@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      "No.";
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      const quotedLens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 4);
      expect(quotedLens?.command?.title).toBe('1 reference');
    });

    it('should handle local variables in procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Main@1();
    VAR
      LocalVar@1000 : Integer;
    BEGIN
      LocalVar := 5;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Should have CodeLens for both procedure and local variable
      expect(lenses.length).toBe(2);

      // LocalVar should have 1 reference (the assignment)
      const localVarLens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 6);
      expect(localVarLens?.command?.title).toBe('1 reference');
    });
  });

  describe('Command Structure', () => {
    it('should have correct command name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses[0].command?.command).toBe('editor.action.showReferences');
    });

    it('should have three arguments: uri, position, locations', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses[0].command?.arguments).toBeDefined();
      expect(lenses[0].command?.arguments?.length).toBe(3);
      expect(typeof lenses[0].command?.arguments?.[0]).toBe('string');  // URI
      expect(lenses[0].command?.arguments?.[1]).toHaveProperty('line');  // Position
      expect(lenses[0].command?.arguments?.[1]).toHaveProperty('character');
      expect(Array.isArray(lenses[0].command?.arguments?.[2])).toBe(true);  // Locations
    });

    it('should have properly structured command arguments for VS Code showReferences', () => {
      // REGRESSION TEST for CodeLens clicking issue
      //
      // BUG: Clicking CodeLens references throws:
      //   "argument does not match one of these constraints: arg instanceof Constraint,
      //   arg.constructor === constraint, nor constraint(arg) === true"
      //
      // ROOT CAUSE:
      //   VS Code's editor.action.showReferences command expects VS Code API types:
      //     - vscode.Uri (not string)
      //     - vscode.Position (not plain Position object)
      //     - vscode.Location[] (not plain Location objects)
      //
      //   However, LSP protocol types are plain objects and strings.
      //   The LanguageClient middleware should convert these types automatically,
      //   but this conversion is not happening for CodeLens command arguments.
      //
      // FIX LOCATION:
      //   The fix must be in the CLIENT (extension.ts), not the server.
      //   Add middleware to LanguageClient that converts command arguments
      //   from LSP protocol types to VS Code API types.
      //
      // TEST LIMITATION:
      //   This test runs in the SERVER context (Jest/Node.js) and validates that
      //   the server sends correct LSP protocol types. It CANNOT test the actual
      //   VS Code command execution or middleware conversion.
      //
      // MANUAL VERIFICATION REQUIRED:
      //   After implementing the middleware fix in extension.ts:
      //   1. Open a .cal file with procedures
      //   2. Click on a CodeLens "X references" label
      //   3. Verify the references peek panel opens correctly
      //   4. Verify no console errors
      //
      // This test validates SERVER-SIDE structure only (baseline for the fix).
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CalledProc@1();
    BEGIN
    END;

    PROCEDURE Caller@2();
    BEGIN
      CalledProc;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // Find the CodeLens for CalledProc (which has 1 reference)
      const calledProcLens = lenses.find(lens =>
        lens.command?.arguments?.[1]?.line === 4  // CalledProc is on line 5 (0-based: 4)
      );

      expect(calledProcLens).toBeDefined();
      expect(calledProcLens?.command).toBeDefined();
      expect(calledProcLens?.command?.command).toBe('editor.action.showReferences');

      const args = calledProcLens?.command?.arguments;
      expect(args).toBeDefined();
      expect(args?.length).toBe(3);

      // Argument 1: URI (string) - will be converted by middleware to vscode.Uri
      expect(typeof args?.[0]).toBe('string');
      expect(args?.[0]).toBe('file:///test.cal');

      // Argument 2: Position (plain object) - will be converted by middleware to vscode.Position
      const position = args?.[1];
      expect(position).toEqual({
        line: expect.any(Number),
        character: expect.any(Number)
      });
      expect(position?.line).toBe(4);  // 0-based line number
      expect(typeof position?.character).toBe('number');

      // Argument 3: Locations array (plain objects) - will be converted by middleware to vscode.Location[]
      const locations = args?.[2];
      expect(Array.isArray(locations)).toBe(true);
      expect(locations?.length).toBe(1);  // CalledProc has 1 reference

      // Each location should have the LSP Location structure:
      // { uri: string, range: { start: Position, end: Position } }
      const location = locations?.[0];
      expect(location).toBeDefined();
      expect(typeof location?.uri).toBe('string');
      expect(location?.uri).toBe('file:///test.cal');

      // Validate range structure
      expect(location?.range).toBeDefined();
      expect(location?.range).toHaveProperty('start');
      expect(location?.range).toHaveProperty('end');

      // Validate start and end positions
      expect(location?.range?.start).toEqual({
        line: expect.any(Number),
        character: expect.any(Number)
      });
      expect(location?.range?.end).toEqual({
        line: expect.any(Number),
        character: expect.any(Number)
      });

      // The reference should be on line 11 (0-based: 10) where CalledProc is called
      expect(location?.range?.start.line).toBe(10);
    });
  });

  describe('Range Calculation', () => {
    it('should place CodeLens on correct line (0-based)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      // PROCEDURE is on line 5 (1-based), so range should be line 4 (0-based)
      expect(lenses[0].range.start.line).toBe(4);
      expect(lenses[0].range.end.line).toBe(4);
    });

    it('should have character position 0', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses[0].range.start.character).toBe(0);
      expect(lenses[0].range.end.character).toBe(0);
    });

    it('should be single-line range', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses[0].range.start.line).toBe(lenses[0].range.end.line);
    });
  });

  describe('Pluralization', () => {
    it('should use singular "reference" for 1 reference', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Called@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      Called;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      const calledLens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 4);
      expect(calledLens?.command?.title).toBe('1 reference');
    });

    it('should use plural "references" for 0 references', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Unused@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses[0].command?.title).toBe('0 references');
    });

    it('should use plural "references" for 2+ references', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Called@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      Called;
      Called;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      const calledLens = lenses.find(lens => lens.command?.arguments?.[1]?.line === 4);
      expect(calledLens?.command?.title).toBe('2 references');
    });
  });

  // ---------------------------------------------------------------------------
  // Scope-isolation tests for CodeLens (issue #786)
  // All tests in this block pass symbolTable and tokens to getCodeLenses().
  // ---------------------------------------------------------------------------
  describe('Scope-Isolation (identity-aware, #786)', () => {
    it('should show each procedure its own Counter count, not the summed name-match count', () => {
      // Sibling same-named locals: ProcA and ProcB each have a local Counter.
      // Each CodeLens should show only its own scope's usage count.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 SiblingCounterTest
{
  CODE
  {
    PROCEDURE ProcA@1();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 10;
      Counter := Counter + 1;
    END;

    PROCEDURE ProcB@2();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 20;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      // Find the Counter CodeLens for ProcA (line with first "Counter@1000")
      const lines = code.split('\n');
      const procACounterLine = lines.findIndex(l => l.includes('Counter@1000 : Integer'));
      expect(procACounterLine).toBeGreaterThan(-1);

      // ProcA's Counter has 3 usages: "Counter := 10", "Counter :=" and "Counter + 1"
      const procACounterLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === procACounterLine
      );
      expect(procACounterLens).toBeDefined();
      // ProcA's Counter has 3 usages: "Counter := 10", "Counter :=", and "Counter + 1"
      // Without scoping, the name-only result would include ProcB's "Counter := 20" too (4+).
      const procACount = parseInt(procACounterLens!.command!.title!, 10);
      // Scoped: ProcA's Counter should show exactly 3 (its own usages only)
      expect(procACount).toBe(3);

      // Find ProcB's Counter CodeLens (second "Counter@1000" line)
      const allCounterLines = lines
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.includes('Counter@1000 : Integer'));
      expect(allCounterLines.length).toBe(2);
      const procBCounterLine = allCounterLines[1].i;

      const procBCounterLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === procBCounterLine
      );
      expect(procBCounterLens).toBeDefined();
      const procBCount = parseInt(procBCounterLens!.command!.title!, 10);

      // ProcB's Counter has 1 usage: "Counter := 20"
      expect(procBCount).toBe(1);

      // Sum of scoped counts must be strictly less than the name-only total
      // (name-only would count all Counter tokens = 4+, scoped sum = 3+1 = 4 < 4+2 declaration tokens)
      // The key isolation assertion: each count is strictly its own scope, not the combined total
      expect(procACount).not.toBe(procACount + procBCount);
    });

    it('should show distinct counts for global Counter vs local Counter', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 ShadowCountTest
{
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE ProcA@1();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 99;
    END;

    PROCEDURE ProcB@2();
    BEGIN
      Counter := 1;
      Counter := Counter + 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      const lines = code.split('\n');

      // Global Counter declaration line (no @ number)
      const globalDeclLine = lines.findIndex(l => l.includes('Counter : Integer') && !l.includes('@'));
      expect(globalDeclLine).toBeGreaterThan(-1);
      const globalLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === globalDeclLine
      );
      expect(globalLens).toBeDefined();

      // Local Counter declaration line (has @)
      const localDeclLine = lines.findIndex(l => l.includes('Counter@1000 : Integer'));
      expect(localDeclLine).toBeGreaterThan(-1);
      const localLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === localDeclLine
      );
      expect(localLens).toBeDefined();

      // The two counts must be distinct (they count different symbols)
      const globalCount = parseInt(globalLens!.command!.title!, 10);
      const localCount = parseInt(localLens!.command!.title!, 10);

      // Global has 3 usages (ProcB: Counter := 1, Counter :=, Counter + 2)
      // Local has 1 usage (ProcA: Counter := 99)
      expect(globalCount).not.toBe(localCount);
    });

    it('should populate navigation array with only in-scope locations', () => {
      // For a sibling-collision fixture, ProcB Counter's CodeLens arguments[2] (Location[])
      // must contain ONLY in-scope locations, not cross-scope ones.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 NavArrayTest
{
  CODE
  {
    PROCEDURE ProcA@1();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 10;
    END;

    PROCEDURE ProcB@2();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 20;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      const lines = code.split('\n');

      // ProcB's Counter lens
      const allCounterLines = lines
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.includes('Counter@1000 : Integer'));
      expect(allCounterLines.length).toBe(2);
      const procBCounterLine = allCounterLines[1].i;

      const procBLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === procBCounterLine
      );
      expect(procBLens).toBeDefined();

      const navLocations: any[] = procBLens!.command!.arguments![2];
      expect(Array.isArray(navLocations)).toBe(true);

      // The title count must match the actual locations array length
      const titleCount = parseInt(procBLens!.command!.title!, 10);
      expect(navLocations.length).toBe(titleCount);

      // None of the navigation locations should be inside ProcA (Counter := 10)
      const procAUseLine = lines.findIndex(l => l.includes('Counter := 10'));
      expect(procAUseLine).toBeGreaterThan(-1);
      const crossScopeLocations = navLocations.filter(
        (loc: any) => loc.range.start.line === procAUseLine
      );
      expect(crossScopeLocations.length).toBe(0);
    });

    it('should count bare procedure call in CodeLens for DoWork', () => {
      const code = `OBJECT Codeunit 50000 BareCallLensTest
{
  CODE
  {
    PROCEDURE DoWork@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      DoWork;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      const lines = code.split('\n');
      const doWorkLine = lines.findIndex(l => l.includes('PROCEDURE DoWork@1'));
      expect(doWorkLine).toBeGreaterThan(-1);

      const doWorkLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === doWorkLine
      );
      expect(doWorkLens).toBeDefined();
      // The bare "DoWork;" call must be counted
      expect(doWorkLens!.command!.title).toBe('1 reference');
    });

    it('should count Foo parameter uses in ProcA separately from Foo local var uses in ProcB', () => {
      // Parameter Foo in ProcA and local var Foo in ProcB are different symbols.
      // Each CodeLens must count only its own scope's usages.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 ParamVsLocalTest
{
  CODE
  {
    PROCEDURE ProcA@1(Foo@1000 : Integer);
    BEGIN
      Foo := Foo + 1;
    END;

    PROCEDURE ProcB@2();
    VAR
      Foo@1000 : Integer;
    BEGIN
      Foo := 99;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      const lines = code.split('\n');

      // ProcA's Foo parameter CodeLens
      // Parameter is on the PROCEDURE line itself, not a separate line.
      // Find by the procedure declaration line instead.
      const procALine = lines.findIndex(l => l.includes('PROCEDURE ProcA@1'));
      expect(procALine).toBeGreaterThan(-1);

      // Two lenses share procALine: one for ProcA (procedure) and one for Foo (parameter).
      // Foo appears after ProcA in the source, so the Foo lens has a larger character value.
      const procALineLenses = lenses.filter(
        lens => lens.command?.arguments?.[1]?.line === procALine
      );
      const paramFooLens = procALineLenses.reduce((a, b) =>
        (a.command?.arguments?.[1]?.character ?? 0) > (b.command?.arguments?.[1]?.character ?? 0) ? a : b
      );
      // ProcA's Foo parameter has 2 usages: Foo := Foo + 1 (both sides)
      expect(paramFooLens.command!.title).toBe('2 references');

      // ProcB's Foo local var CodeLens
      // The PROCEDURE line also contains "Foo@1000 : Integer" inline, so we exclude it.
      const localDeclLine = lines.findIndex(l => l.includes('Foo@1000 : Integer') && !l.includes('PROCEDURE'));
      expect(localDeclLine).toBeGreaterThan(-1);

      const localFooLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === localDeclLine
      );
      expect(localFooLens).toBeDefined();
      // ProcB's Foo has 1 usage: Foo := 99
      expect(localFooLens!.command!.title).toBe('1 reference');
    });

    it('should isolate trigger-local Bar from global Bar', () => {
      // Global Bar and a trigger-local Bar (in OnRun) are different symbols.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TriggerLocalTest
{
  CODE
  {
    VAR
      Bar : Integer;

    TRIGGER OnRun@1();
    VAR
      Bar@1000 : Integer;
    BEGIN
      Bar := 42;
    END;

    PROCEDURE UseGlobal@2();
    BEGIN
      Bar := 1;
      Bar := Bar + 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      const lines = code.split('\n');

      // Global Bar declaration (no @ suffix)
      const globalBarLine = lines.findIndex(l => l.includes('Bar : Integer') && !l.includes('@'));
      expect(globalBarLine).toBeGreaterThan(-1);
      const globalBarLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === globalBarLine
      );
      expect(globalBarLens).toBeDefined();

      // Trigger-local Bar declaration
      const localBarLine = lines.findIndex(l => l.includes('Bar@1000 : Integer'));
      expect(localBarLine).toBeGreaterThan(-1);
      const localBarLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === localBarLine
      );
      expect(localBarLens).toBeDefined();

      const globalCount = parseInt(globalBarLens!.command!.title!, 10);
      const localCount = parseInt(localBarLens!.command!.title!, 10);

      // Global Bar has usages in UseGlobal (Bar := 1, Bar :=, Bar + 1) = 3
      // Trigger-local Bar has usage (Bar := 42) = 1
      // The counts must be different, confirming isolation
      expect(globalCount).not.toBe(localCount);

      // Global Bar must NOT include the trigger-local usage (Bar := 42)
      const globalLocations: any[] = globalBarLens!.command!.arguments![2];
      const triggerUseLines = lines.findIndex(l => l.includes('Bar := 42'));
      expect(triggerUseLines).toBeGreaterThan(-1);
      const crossScopeInGlobal = globalLocations.filter(
        (loc: any) => loc.range.start.line === triggerUseLines
      );
      expect(crossScopeInGlobal.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // #791: member-property scope-awareness for CodeLens
  // ---------------------------------------------------------------------------
  describe('#791 CodeLens member-property parity', () => {
    it('C-scoped: unused local Employee with SomeRec.Employee member shows "0 references" (4-arg path)', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 C791Test
{
  CODE
  {
    VAR
      SomeRec@1000 : Record 50000;

    PROCEDURE ProcA@1();
    VAR
      Employee@1000 : Record 18;
    BEGIN
      SomeRec.Employee := 0;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      // ALL FOUR args: exercises the scope-aware path
      const lenses = provider.getCodeLenses(doc, ast, symbolTable, tokens);

      const lines = code.split('\n');
      const employeeDeclLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(employeeDeclLine).toBeGreaterThan(-1);

      // Find the CodeLens for the local Employee variable
      const employeeLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === employeeDeclLine
      );
      expect(employeeLens).toBeDefined();

      // After #791 fix: SomeRec.Employee must NOT count as a reference to the local.
      // The local is unused, so the count should be 0.
      expect(employeeLens!.command!.title).toBe('0 references');
    });

    it('C-legacy: unused local Employee with SomeRec.Employee member shows legacy count (2-arg path)', () => {
      // The 2-arg path (no symbolTable/tokens) must be unchanged by the #791 fix.
      // Currently it returns 1 reference (the member-property over-count).
      // This test pins the legacy behavior so we can verify it stays intact.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 C791LegacyTest
{
  CODE
  {
    VAR
      SomeRec@1000 : Record 50000;

    PROCEDURE ProcA@1();
    VAR
      Employee@1000 : Record 18;
    BEGIN
      SomeRec.Employee := 0;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      // TWO args only: legacy name-only path
      const lenses = provider.getCodeLenses(doc, ast);

      const lines = code.split('\n');
      const employeeDeclLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(employeeDeclLine).toBeGreaterThan(-1);

      const employeeLens = lenses.find(
        lens => lens.command?.arguments?.[1]?.line === employeeDeclLine
      );
      expect(employeeLens).toBeDefined();

      // Legacy path: name-only match includes the member-property.
      // This currently counts SomeRec.Employee as 1 reference.
      // Pin: the legacy count must remain ≥ 1 (the member over-count is preserved on legacy path).
      const legacyCount = parseInt(employeeLens!.command!.title!, 10);
      expect(legacyCount).toBeGreaterThanOrEqual(1);
    });
  });
});
