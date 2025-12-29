import { CodeLensProvider } from '../codeLensProvider';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Helper to create a TextDocument from C/AL code
 */
function createDocument(content: string, uri = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse C/AL code into AST
 */
function parseContent(content: string) {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return { ast: parser.parse() };
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
FIELDS
{
}
CODE
  BEGIN
  END.`;
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

    it.skip('should show CodeLens for table field', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1   ;   ;No              ;Code20        }
}
CODE
  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const lenses = provider.getCodeLenses(doc, ast);

      expect(lenses.length).toBe(1);
      expect(lenses[0].command?.title).toMatch(/\d+ references?/);
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
});
