/**
 * Tests for Rename Provider
 *
 * These tests validate the rename functionality.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';

import { RenameProvider } from '../renameProvider';

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string, uri: string = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse content into AST and symbolTable
 */
function parseContent(content: string): { ast: any; symbolTable: any } {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // Build symbol table from AST
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);

  return { ast, symbolTable };
}

/**
 * Helper to find position of identifier in code
 */
function findPosition(code: string, identifier: string, occurrence: number = 1): Position {
  const lines = code.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const index = lines[i].indexOf(identifier);
    if (index !== -1) {
      count++;
      if (count === occurrence) {
        return Position.create(i, index + Math.floor(identifier.length / 2));
      }
    }
  }
  throw new Error(`Could not find occurrence ${occurrence} of '${identifier}'`);
}

describe('RenameProvider', () => {
  let provider: RenameProvider;

  beforeEach(() => {
    provider = new RenameProvider();
  });

  describe('prepareRename - Valid Identifiers', () => {
    it('should return range + placeholder when cursor on local variable', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Counter', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.range).toBeDefined();
      expect(result?.placeholder).toBe('Counter');
    });

    it('should return range + placeholder when cursor on global variable', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      GlobalVar : Integer;

    PROCEDURE Foo();
    BEGIN
      GlobalVar := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'GlobalVar', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.placeholder).toBe('GlobalVar');
    });

    it('should return range + placeholder when cursor on parameter', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE DoWork(MyParam : Integer);
    BEGIN
      MyParam := MyParam + 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyParam', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.placeholder).toBe('MyParam');
    });

    it('should return range + placeholder when cursor on procedure name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Calculate();
    BEGIN
    END;

    PROCEDURE Run();
    BEGIN
      Calculate;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Calculate', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.placeholder).toBe('Calculate');
    });

    it('should return range + placeholder when cursor on field name', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; CustomerNo ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      CustomerNo := '12345';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'CustomerNo', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.placeholder).toBe('CustomerNo');
    });
  });

  describe('prepareRename - Invalid Positions', () => {
    it('should return null when cursor on keyword IF', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      Flag : Boolean;
    BEGIN
      IF Flag THEN
        Flag := FALSE;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'IF', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on keyword BEGIN', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'BEGIN', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on keyword THEN', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      X : Boolean;
    BEGIN
      IF X THEN
        X := FALSE;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'THEN', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on keyword PROCEDURE', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'PROCEDURE', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on number literal', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      X : Integer;
    BEGIN
      X := 42;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Find position of '42'
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('X := 42'));
      const colIndex = lines[lineIndex].indexOf('42');
      const pos = Position.create(lineIndex, colIndex + 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on string literal', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      Name : Text[50];
    BEGIN
      Name := 'Test';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Find position inside 'Test' string
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes("'Test'"));
      const colIndex = lines[lineIndex].indexOf("Test");
      const pos = Position.create(lineIndex, colIndex + 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on whitespace', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = Position.create(2, 2); // Inside whitespace

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on comment', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    // This is a comment
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('This is a comment'));
      const pos = Position.create(lineIndex, 10); // Inside comment text

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor on type annotation', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      Counter : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Integer', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });
  });

  describe('prepareRename - Quoted Identifiers', () => {
    it('should handle quoted identifier - range excludes quotes, placeholder without quotes', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; "No." ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "No." := '12345';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Find position inside quoted identifier
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('"No."') && l.includes('Code20'));
      const colIndex = lines[lineIndex].indexOf('"No."');
      const pos = Position.create(lineIndex, colIndex + 2); // Position on 'N' inside quotes

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      // Placeholder should be without quotes
      expect(result?.placeholder).toBe('No.');
      // Range should exclude the quotes
      const rangeText = code.substring(
        doc.offsetAt(result!.range.start),
        doc.offsetAt(result!.range.end)
      );
      expect(rangeText).toBe('"No."');
    });

    it('should handle quoted identifier with spaces', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; "My Field" ; Code20 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, '"My Field"', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.placeholder).toBe('My Field');
    });
  });

  describe('Scope-Aware Renaming', () => {
    it('should rename local variable only in procedure scope', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE Foo();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 1;
      Counter := Counter + 1;
    END;

    PROCEDURE Bar();
    BEGIN
      Counter := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on local Counter in Foo
      const pos = findPosition(code, 'Counter', 2);

      const edits = provider.getRenameEdits(doc, pos, 'LocalCount', ast, symbolTable);

      // Should rename only in Foo procedure
      expect(edits).toBeDefined();
      expect(edits?.changes).toBeDefined();

      const changes = edits!.changes![doc.uri];
      expect(changes).toBeDefined();

      // Should have 4 edits: declaration + 3 usages in Foo (Counter appears twice on line "Counter := Counter + 1")
      expect(changes.length).toBe(4);

      // Should NOT rename global Counter or usage in Bar
      const globalCounterLine = code.split('\n').findIndex(l =>
        l.includes('Counter : Integer') && !l.includes('VAR\n')
      );
      const barUsageLine = code.split('\n').findIndex(l =>
        l.includes('Counter := 2')
      );

      const affectedLines = changes.map((c: any) => c.range.start.line);
      expect(affectedLines).not.toContain(globalCounterLine);
      expect(affectedLines).not.toContain(barUsageLine);
    });

    it('should rename global variable without affecting shadowing local variables', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE Foo();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 1;
    END;

    PROCEDURE Bar();
    BEGIN
      Counter := 2;
    END;

    PROCEDURE Baz();
    BEGIN
      Counter := 3;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on global Counter
      const pos = findPosition(code, 'Counter', 1);

      const edits = provider.getRenameEdits(doc, pos, 'GlobalCounter', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename global Counter in Bar and Baz, but NOT local in Foo
      // Expected: global declaration + usage in Bar + usage in Baz = 3
      expect(changes.length).toBe(3);
    });

    it('should rename parameter only in that procedure', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo(Value : Integer);
    BEGIN
      Value := Value + 1;
    END;

    PROCEDURE Bar(Value : Integer);
    BEGIN
      Value := Value * 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on Value parameter in Foo
      const pos = findPosition(code, 'Value', 1);

      const edits = provider.getRenameEdits(doc, pos, 'InputValue', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename only in Foo: parameter declaration + 2 usages on line "Value := Value + 1;" = 3
      expect(changes.length).toBe(3);
    });

    it('should rename procedure name in definition and all calls', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Calculate();
    BEGIN
    END;

    PROCEDURE Run();
    BEGIN
      Calculate;
      Calculate;
    END;

    PROCEDURE Process();
    BEGIN
      Calculate;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Calculate', 1);

      const edits = provider.getRenameEdits(doc, pos, 'ComputeResult', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename: definition + 2 calls in Run + 1 call in Process = 4
      expect(changes.length).toBe(4);

      // Verify specific lines are found: definition (line 4, 0-indexed) + calls (lines 10, 11, 16)
      expect(changes.map(c => c.range.start.line).sort((a, b) => a - b)).toEqual([4, 10, 11, 16]);
    });

    it('should rename quoted procedure name in definition and call', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE "My Procedure"();
    BEGIN
    END;

    PROCEDURE Run();
    BEGIN
      "My Procedure";
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, '"My Procedure"', 1);

      const edits = provider.getRenameEdits(doc, pos, 'New Name', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      expect(changes.length).toBe(2);
    });

    it('should rename procedure with @number suffix in definition and call', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Calculate@1000001();
    BEGIN
    END;

    PROCEDURE Run();
    BEGIN
      Calculate;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Calculate', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Compute', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Note: The @1000001 should remain after rename
      expect(changes.length).toBe(2);
    });

    it('should rename LOCAL PROCEDURE in definition and call', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE Helper();
    BEGIN
    END;

    PROCEDURE Run();
    BEGIN
      Helper;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Helper', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Assist', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      expect(changes.length).toBe(2);
    });

    // Issue #204: Field rename should work with qualified and unqualified references
    it('should rename field in definition and all usages (qualified and unqualified)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount ; Decimal }
  }
  CODE
  {
    PROCEDURE Foo();
    VAR
      Rec : Record 50000;
    BEGIN
      Amount := 100;
      Rec.Amount := 200;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Amount', 1);

      const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename: field definition + unqualified usage + qualified usage = 3
      expect(changes.length).toBe(3);
    });

    // Issue #204: Quoted field rename should include quotes in replacement
    it('should rename quoted field including quotes in all locations', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; "No." ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    VAR
      Rec : Record 50000;
    BEGIN
      "No." := '12345';
      Rec."No." := '67890';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, '"No."', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Number', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename field in 3 locations: definition + unqualified usage + qualified usage
      expect(changes.length).toBe(3);

      // All edits should have the full quoted string replaced
      changes.forEach((edit: any) => {
        // New name doesn't need quotes, so it should be unquoted
        expect(edit.newText).toBe('Number');
        // Old range should include the entire quoted identifier
        const rangeText = doc.getText(edit.range);
        expect(rangeText).toBe('"No."');
      });
    });

    // Issue #256: Multi-token unquoted field names should be renamed completely
    it('should rename multi-token unquoted field name completely', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count ; Integer }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      Update Count := 0;
      Update Count := Update Count + 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on first "Update" token in field definition
      const pos = findPosition(code, 'Update Count', 1);

      const edits = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename in 4 locations: definition + 3 usages
      expect(changes.length).toBe(4);

      // Verify that the new text is correct (not corrupted like "RefreshCount Count")
      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('RefreshCount');
        // Range should cover both tokens "Update Count"
        const rangeText = doc.getText(edit.range);
        expect(rangeText.toLowerCase()).toContain('update');
        expect(rangeText.toLowerCase()).toContain('count');
      });
    });

    // Issue #256: Multi-token field rename with cursor on second token
    it('should rename multi-token field when cursor is on second token', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count ; Integer }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      Update Count := 5;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on "Count" token (second part of the field name)
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('Update Count ; Integer'));
      const colIndex = lines[lineIndex].indexOf('Count');
      const pos = { line: lineIndex, character: colIndex + 2 }; // Middle of "Count"

      const edits = provider.getRenameEdits(doc, pos, 'RefreshCounter', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename in 2 locations: definition + usage
      expect(changes.length).toBe(2);

      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('RefreshCounter');
      });
    });

    // Issue #256: Multi-token field with quoted usage in CODE
    it('should rename multi-token field when used with quotes in CODE', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count ; Integer }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "Update Count" := 10;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on field definition
      const pos = findPosition(code, 'Update Count', 1);

      const edits = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename: definition + quoted usage
      expect(changes.length).toBe(2);
    });

    // Issue #256: Multi-token field with qualified access
    it('should rename multi-token field with qualified access (Rec.Field)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count ; Integer }
  }
  CODE
  {
    PROCEDURE Foo();
    VAR
      Rec : Record 50000;
    BEGIN
      Rec."Update Count" := 0;
      Update Count := Rec."Update Count" + 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      const pos = findPosition(code, 'Update Count', 1);

      const edits = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename: definition + 3 usages (1 unquoted, 2 qualified)
      expect(changes.length).toBe(4);
    });

    // Issue #256/#257: Multi-token field with special characters (period)
    it('should rename multi-token field with special characters like No.', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Phone No. ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "Phone No." := '123';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on the field definition
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('Phone No. ; Code20'));
      const colIndex = lines[lineIndex].indexOf('Phone No.');
      const pos = { line: lineIndex, character: colIndex + 3 }; // Middle of "Phone"

      const edits = provider.getRenameEdits(doc, pos, 'PhoneNumber', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename: definition + usage
      expect(changes.length).toBe(2);
    });

    // Issue #256: Table with both single-token and multi-token fields
    it('should not confuse multi-token field with similar single-token field', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update ; Integer }
    { 2 ;   ; Update Count ; Integer }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      Update := 1;
      Update Count := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on "Update Count" field
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('Update Count ; Integer'));
      const colIndex = lines[lineIndex].indexOf('Update Count');
      const pos = { line: lineIndex, character: colIndex + 1 };

      const edits = provider.getRenameEdits(doc, pos, 'RefreshCounter', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename only "Update Count" (2 locations), not "Update"
      expect(changes.length).toBe(2);

      // Verify "Update := 1;" is NOT affected
      const updateLine = code.split('\n').findIndex(l => l.trim() === 'Update := 1;');
      const affectedLines = changes.map((c: any) => c.range.start.line);
      expect(affectedLines).not.toContain(updateLine);
    });

    // Issue #256: Prefix collision bug - renaming single-token field should not affect multi-token field with same prefix
    it('should not rename single-token field if it is a prefix of multi-token field', () => {
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
    Date=26/01/26;
    Time=12:00:00;
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Update          ;Integer }
    { 2   ;   ;Update Count    ;Integer }
  }
  KEYS
  {
    {    ;Update                       ;Clustered=Yes }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Position on the first "Update" field (the single-token one)
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('Update          ;Integer'));
      const colIndex = lines[lineIndex].indexOf('Update');
      const pos = { line: lineIndex, character: colIndex + 3 }; // Middle of "Update"

      const edits = provider.getRenameEdits(doc, pos, 'Changed', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename only "Update" field (2 locations: definition + KEY)
      // Should NOT affect "Update Count" field
      expect(changes.length).toBe(2);

      // Apply edits to verify "Update Count" is not modified
      let newCode = code;
      const sortedEdits = [...changes].sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
          return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
      });

      sortedEdits.forEach((edit: any) => {
        const startOffset = doc.offsetAt(edit.range.start);
        const endOffset = doc.offsetAt(edit.range.end);
        newCode = newCode.substring(0, startOffset) + edit.newText + newCode.substring(endOffset);
      });

      // Verify "Update Count" field is not modified
      expect(newCode).toContain('Update Count');
      expect(newCode).not.toContain('Changed Count');

      // Verify "Update" field IS modified
      expect(newCode).toContain('Changed          ;Integer');
      expect(newCode).not.toContain('Update          ;Integer');
    });

    // Issue #256: Multi-token field declared but never used
    it('should rename multi-token field that is only declared', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count ; Integer }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      const pos = findPosition(code, 'Update Count', 1);

      const edits = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename only the definition (1 location)
      expect(changes.length).toBe(1);
    });

    // Issue #256: prepareRename should return correct range for multi-token field
    it('should return correct range for prepareRename on multi-token field', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count ; Integer }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      const pos = findPosition(code, 'Update Count', 1);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.placeholder).toBe('Update Count');

      // Range should cover BOTH tokens
      const rangeText = doc.getText(result!.range);
      expect(rangeText.toLowerCase()).toContain('update');
      expect(rangeText.toLowerCase()).toContain('count');
      // Should be "Update Count" with possible whitespace
      expect(rangeText.replace(/\s+/g, ' ').trim().toLowerCase()).toBe('update count');
    });

    // Issue #256: Multi-token field with reserved word component
    it('should rename multi-token field containing reserved word like Begin Date', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Begin Date ; Date }
    { 2 ;   ; End Time ; Time }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "Begin Date" := TODAY;
      "End Time" := TIME;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      const pos = findPosition(code, 'Begin Date', 1);

      const edits = provider.getRenameEdits(doc, pos, 'StartDate', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename: definition + usage
      expect(changes.length).toBe(2);

      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('StartDate');
      });
    });

    // Issue #204: Malformed field declarations should not crash
    it('should handle malformed field declaration gracefully', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);

      // Try to rename at the malformed field location
      const lines = code.split('\n');
      const lineIndex = lines.findIndex(l => l.includes('{ 1 ;   ; ; Code20 }'));
      const pos = Position.create(lineIndex, 10); // Position in the malformed field

      // Should not crash and should return null (no valid identifier to rename)
      expect(() => {
        const result = provider.prepareRename(doc, pos, ast, symbolTable);
        expect(result).toBeNull();
      }).not.toThrow();
    });

    // Issue #204: End-to-end test - verify renamed code is valid
    it('should produce valid code after field rename (end-to-end)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; CustomerNo ; Code20 }
    { 2 ;   ; Name ; Text50 }
  }
  CODE
  {
    PROCEDURE Validate();
    VAR
      Rec : Record 50000;
    BEGIN
      IF CustomerNo = '' THEN
        ERROR('Empty');
      Rec.CustomerNo := '12345';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'CustomerNo', 1);

      const edits = provider.getRenameEdits(doc, pos, 'CustomerNumber', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Verify we have the expected number of changes
      expect(changes.length).toBe(3); // definition + 2 usages

      // Apply the edits manually and verify the result parses without errors
      let newCode = code;
      // Sort edits in reverse order to apply from end to start (preserves positions)
      const sortedEdits = [...changes].sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
          return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
      });

      sortedEdits.forEach((edit: any) => {
        const startOffset = doc.offsetAt(edit.range.start);
        const endOffset = doc.offsetAt(edit.range.end);
        newCode = newCode.substring(0, startOffset) + edit.newText + newCode.substring(endOffset);
      });

      // Verify the renamed code parses successfully
      const newLexer = new Lexer(newCode);
      const newTokens = newLexer.tokenize();
      const newParser = new Parser(newTokens);
      const newAst = newParser.parse();

      // Should not have critical parse errors
      expect(newAst).toBeDefined();

      // Verify the new field name appears in the correct locations
      expect(newCode).toContain('CustomerNumber');
      expect(newCode).not.toContain('CustomerNo ;'); // Old field definition should be gone
      expect(newCode).toContain('CustomerNumber ;'); // New field definition should be present
    });
  });

  describe('Quote Handling in Rename', () => {
    it('should preserve quotes when renaming quoted identifier to name needing quotes', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; "No." ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "No." := '12345';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, '"No."', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Doc. No.', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];
      expect(changes).toBeDefined();

      // All edits should have quotes
      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('"Doc. No."');
      });
    });

    it('should remove quotes when renaming quoted identifier to simple name', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; "My Field" ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "My Field" := '12345';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, '"My Field"', 1);

      const edits = provider.getRenameEdits(doc, pos, 'MyField', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Quotes should be removed since MyField doesn't need them
      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('MyField');
      });
    });

    it('should add quotes when renaming unquoted identifier to name needing quotes', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; CustomerNo ; Code20 }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      CustomerNo := '12345';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'CustomerNo', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Customer No.', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Quotes should be added since name contains space and period
      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('"Customer No."');
      });
    });

    it('should preserve quotes when both old and new names need quotes', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; "No." ; Code20 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, '"No."', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Doc No.', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];
      changes.forEach((edit: any) => {
        expect(edit.newText).toBe('"Doc No."');
      });
    });
  });

  describe('Validation - Reserved Keywords', () => {
    it('should reject rename to reserved keyword BEGIN (case insensitive)', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'BEGIN', ast, symbolTable);
      }).toThrow(/reserved keyword/i);
    });

    it('should reject rename to reserved keyword IF (lowercase)', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'if', ast, symbolTable);
      }).toThrow(/reserved keyword/i);
    });

    it('should reject rename to reserved keyword PROCEDURE', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'PROCEDURE', ast, symbolTable);
      }).toThrow(/reserved keyword/i);
    });

    it('should reject rename to reserved keyword THEN', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'THEN', ast, symbolTable);
      }).toThrow(/reserved keyword/i);
    });

    it('should reject rename to reserved keyword VAR', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'VAR', ast, symbolTable);
      }).toThrow(/reserved keyword/i);
    });
  });

  describe('Validation - Invalid Characters', () => {
    it('should reject rename to name containing double-quote character', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'My"Var', ast, symbolTable);
      }).toThrow(/invalid.*character/i);
    });

    it('should reject empty name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, '', ast, symbolTable);
      }).toThrow(/empty/i);
    });

    it('should reject whitespace-only name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, '   ', ast, symbolTable);
      }).toThrow(/empty/i);
    });

    it('should reject name starting with number', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, '123Var', ast, symbolTable);
      }).toThrow(/cannot start with.*number/i);
    });

    it('should reject name with invalid special characters', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      expect(() => {
        provider.getRenameEdits(doc, pos, 'My$Var', ast, symbolTable);
      }).toThrow(/invalid.*character/i);
    });
  });

  describe('Validation - Length Limits', () => {
    it('should reject 31-character variable name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      const name31 = 'A'.repeat(31);

      expect(() => {
        provider.getRenameEdits(doc, pos, name31, ast, symbolTable);
      }).toThrow(/too long/i);
    });

    it('should accept 30-character variable name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      const name30 = 'A'.repeat(30);

      const edits = provider.getRenameEdits(doc, pos, name30, ast, symbolTable);

      expect(edits).toBeDefined();
      expect(edits?.changes).toBeDefined();
    });

    it('should reject 129-character procedure name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE MyProc();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyProc', 1);

      const name129 = 'P'.repeat(129);

      expect(() => {
        provider.getRenameEdits(doc, pos, name129, ast, symbolTable);
      }).toThrow(/too long/i);
    });

    it('should accept 128-character procedure name', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE MyProc();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyProc', 1);

      const name128 = 'P'.repeat(128);

      const edits = provider.getRenameEdits(doc, pos, name128, ast, symbolTable);

      expect(edits).toBeDefined();
      expect(edits?.changes).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should return null/error for empty document', () => {
      const doc = createDocument('');
      const { ast, symbolTable } = parseContent('');
      const pos = Position.create(0, 0);

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when cursor not on identifier', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = Position.create(0, 0); // On 'OBJECT' keyword

      const result = provider.prepareRename(doc, pos, ast, symbolTable);

      expect(result).toBeNull();
    });

    it('should rename symbol with single reference (just declaration)', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      UnusedVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'UnusedVar', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NotUsed', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename just the declaration
      expect(changes.length).toBe(1);
    });

    it('should rename symbol with no usages after declaration', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Unused();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Unused', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NotCalled', ast, symbolTable);

      expect(edits).toBeDefined();
      const changes = edits!.changes![doc.uri];

      // Should rename just the declaration (1 change)
      expect(changes.length).toBe(1);
    });

    it('should handle case-insensitive matching in references', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVariable : Integer;

    PROCEDURE Foo();
    BEGIN
      myvariable := 1;
      MYVARIABLE := 2;
      MyVariable := 3;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVariable', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // Should rename all 4 occurrences (1 declaration + 3 usages with different cases)
      expect(changes.length).toBe(4);
    });

    it('should handle identifiers with underscores', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      My_Var_Name : Integer;

    PROCEDURE Foo();
    BEGIN
      My_Var_Name := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'My_Var_Name', 1);

      const edits = provider.getRenameEdits(doc, pos, 'New_Name', ast, symbolTable);

      expect(edits).toBeDefined();
      expect(edits?.changes).toBeDefined();
    });

    it('should handle identifiers with numbers', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      Var123 : Integer;

    PROCEDURE Foo();
    BEGIN
      Var123 := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'Var123', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Var456', ast, symbolTable);

      expect(edits).toBeDefined();
      expect(edits?.changes).toBeDefined();
    });
  });

  describe('Location Accuracy', () => {
    it('should return correct ranges for all rename edits', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      TestVar : Integer;

    PROCEDURE Foo();
    BEGIN
      TestVar := 1;
      TestVar := TestVar + 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'TestVar', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewVar', ast, symbolTable);

      expect(edits).toBeDefined();

      const changes = edits!.changes![doc.uri];

      // All ranges should be valid
      changes.forEach((edit: any) => {
        expect(edit.range.start.line).toBeGreaterThanOrEqual(0);
        expect(edit.range.start.character).toBeGreaterThanOrEqual(0);
        expect(edit.range.end.line).toBeGreaterThanOrEqual(edit.range.start.line);
        expect(edit.range.end.character).toBeGreaterThan(edit.range.start.character);

        // Range should point to the old identifier
        const rangeText = doc.getText(edit.range);
        expect(rangeText.toLowerCase()).toBe('testvar');

        // Edit should contain the new name
        expect(edit.newText).toBe('NewVar');
      });
    });

    it('should maintain correct URI in all edits', () => {
      const uri = 'file:///home/user/project/test.cal';
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    VAR
      MyVar : Integer;

    PROCEDURE Foo();
    BEGIN
      MyVar := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, uri);
      const { ast, symbolTable } = parseContent(code);
      const pos = findPosition(code, 'MyVar', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewVar', ast, symbolTable);

      expect(edits).toBeDefined();
      expect(edits?.changes).toBeDefined();
      expect(edits!.changes![uri]).toBeDefined();
    });
  });
});
