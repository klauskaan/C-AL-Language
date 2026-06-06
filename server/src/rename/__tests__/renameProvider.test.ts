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

  describe('Token reuse optimization', () => {
    describe('Regular identifiers (non-field path)', () => {
      it('should produce identical prepareRename results with and without tokens for local variable', () => {
        const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 1;
      Counter := Counter + 1;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Counter', 1);

        // Test without tokens (current behavior)
        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);

        // Test with tokens (optimized behavior)
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        // Results should be identical
        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).not.toBeNull();
        expect(resultWith?.placeholder).toBe('Counter');
      });

      it('should produce identical prepareRename results with and without tokens for global variable', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'GlobalVar', 1);

        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).not.toBeNull();
        expect(resultWith?.placeholder).toBe('GlobalVar');
      });

      it('should produce identical prepareRename results with and without tokens for procedure', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Calculate', 1);

        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).not.toBeNull();
        expect(resultWith?.placeholder).toBe('Calculate');
      });

      it('should produce identical getRenameEdits results with and without tokens for local variable', () => {
        const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 1;
      Counter := Counter + 1;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Counter', 1);

        // Test without tokens (current behavior)
        const editsWithout = provider.getRenameEdits(doc, pos, 'LocalCount', ast, symbolTable);

        // Test with tokens (optimized behavior)
        const editsWith = provider.getRenameEdits(doc, pos, 'LocalCount', ast, symbolTable, tokens);

        // Results should be identical
        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();
        expect(editsWith?.changes).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(4); // declaration + 3 usages
      });

      it('should produce identical getRenameEdits results with and without tokens for procedure', () => {
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

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Calculate', 1);

        const editsWithout = provider.getRenameEdits(doc, pos, 'Compute', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'Compute', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();
        expect(editsWith?.changes).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(3); // definition + 2 calls
      });

      it('should produce identical getRenameEdits results with and without tokens for quoted identifier', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, '"No."', 1);

        const editsWithout = provider.getRenameEdits(doc, pos, 'Number', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'Number', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(2); // definition + usage
      });
    });

    describe('Multi-token fields (field path)', () => {
      it('should produce identical prepareRename results with and without tokens for multi-token field', () => {
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
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Update Count', 1);

        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).not.toBeNull();
        expect(resultWith?.placeholder).toBe('Update Count');

        // Verify range covers both tokens
        const rangeText = doc.getText(resultWith!.range);
        expect(rangeText.replace(/\s+/g, ' ').trim().toLowerCase()).toBe('update count');
      });

      it('should produce identical prepareRename results with and without tokens when cursor on second token', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        // Position on "Count" token (second part of the field name)
        const lines = code.split('\n');
        const lineIndex = lines.findIndex(l => l.includes('Update Count ; Integer'));
        const colIndex = lines[lineIndex].indexOf('Count');
        const pos = { line: lineIndex, character: colIndex + 2 };

        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).not.toBeNull();
        expect(resultWith?.placeholder).toBe('Update Count');
      });

      it('should produce identical getRenameEdits results with and without tokens for multi-token field', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Update Count', 1);

        const editsWithout = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(4); // definition + 3 usages
      });

      it('should produce identical getRenameEdits results with and without tokens for multi-token field with qualified access', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Update Count', 1);

        const editsWithout = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'RefreshCount', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(4); // definition + 3 usages (1 unquoted, 2 qualified)
      });

      it('should produce identical getRenameEdits results with and without tokens for multi-token field with reserved word', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Begin Date ; Date }
  }
  CODE
  {
    PROCEDURE Foo();
    BEGIN
      "Begin Date" := TODAY;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'Begin Date', 1);

        const editsWithout = provider.getRenameEdits(doc, pos, 'StartDate', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'StartDate', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(2); // definition + usage
      });

      it('should produce identical getRenameEdits results with and without tokens for field with special characters', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const lines = code.split('\n');
        const lineIndex = lines.findIndex(l => l.includes('Phone No. ; Code20'));
        const colIndex = lines[lineIndex].indexOf('Phone No.');
        const pos = { line: lineIndex, character: colIndex + 3 };

        const editsWithout = provider.getRenameEdits(doc, pos, 'PhoneNumber', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'PhoneNumber', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(2); // definition + usage
      });
    });

    describe('Edge cases', () => {
      it('should return null with and without tokens when cursor on keyword', () => {
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
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'BEGIN', 1);

        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).toBeNull();
      });

      it('should handle empty document with and without tokens', () => {
        const code = '';
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = Position.create(0, 0);

        const resultWithout = provider.prepareRename(doc, pos, ast, symbolTable);
        const resultWith = provider.prepareRename(doc, pos, ast, symbolTable, tokens);

        expect(resultWith).toEqual(resultWithout);
        expect(resultWith).toBeNull();
      });

      it('should handle case-insensitive variable references with and without tokens', () => {
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
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const text = doc.getText();
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const pos = findPosition(code, 'MyVariable', 1);

        const editsWithout = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
        const editsWith = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable, tokens);

        expect(editsWith).toEqual(editsWithout);
        expect(editsWith).toBeDefined();

        const changes = editsWith!.changes![doc.uri];
        expect(changes.length).toBe(3); // declaration + 2 usages
      });
    });
  });

  describe('#794 rename is member-aware (anti-corruption)', () => {
    // Helper: collect start-offsets of all rename edits, sorted ascending
    function changeStartOffsets(edits: any, doc: any): number[] {
      const list = edits?.changes?.[doc.uri] ?? [];
      return list.map((e: any) => doc.offsetAt(e.range.start)).sort((a: number, b: number) => a - b);
    }

    // Helper: find the nth (1-based) occurrence of substr in code, return its start offset
    function nthOffset(code: string, substr: string, n: number): number {
      let idx = -1;
      for (let i = 0; i < n; i++) idx = code.indexOf(substr, idx + 1);
      if (idx < 0) throw new Error(`occurrence ${n} of '${substr}' not found`);
      return idx;
    }

    // T1: Local variable shadows a same-named field-member — member-property edit must be absent
    it('should not rename SomeRec.Employee when renaming local variable Employee (T1)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      SomeRec : Record 18;
    PROCEDURE Foo();
    VAR
      Employee : Integer;
    BEGIN
      Employee := 1;
      SomeRec.Employee := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on local Employee declaration (occurrence 1)
      const pos = findPosition(code, 'Employee', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The member-property 'Employee' after 'SomeRec.' must NOT be renamed
      const memberOffset = nthOffset(code, 'SomeRec.Employee', 1) + 'SomeRec.'.length;
      expect(offsets).not.toContain(memberOffset);

      // The local declaration and the bare use 'Employee := 1' MUST be renamed
      const declOffset = nthOffset(code, 'Employee', 1);
      const useOffset = nthOffset(code, 'Employee', 2); // 'Employee := 1'
      expect(offsets).toContain(declOffset);
      expect(offsets).toContain(useOffset);
      expect(offsets.length).toBe(2);
    });

    // T2: Global variable with same name as a member-property — member-property edit must be absent
    it('should not rename OtherRec.Foo when renaming global variable Foo (T2)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Foo : Integer;
      OtherRec : Record 18;
    PROCEDURE Bar();
    BEGIN
      Foo := 1;
      OtherRec.Foo := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on global Foo declaration (occurrence 1)
      const pos = findPosition(code, 'Foo', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The member-property 'Foo' after 'OtherRec.' must NOT be renamed
      const memberOffset = nthOffset(code, 'OtherRec.Foo', 1) + 'OtherRec.'.length;
      expect(offsets).not.toContain(memberOffset);

      // The global declaration and the bare use 'Foo := 1' MUST be renamed
      const declOffset = nthOffset(code, 'Foo', 1);
      const useOffset = nthOffset(code, 'Foo := 1', 1);
      expect(offsets).toContain(declOffset);
      expect(offsets).toContain(useOffset);
      expect(offsets.length).toBe(2);
    });

    // T3: Parameter with same name as a member-property — member-property edit must be absent
    it('should not rename SomeRec.Employee when renaming parameter Employee (T3)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      SomeRec : Record 18;
    PROCEDURE Foo(Employee : Integer);
    BEGIN
      Employee := 1;
      SomeRec.Employee := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on parameter Employee (occurrence 1 = the param decl in the signature)
      const pos = findPosition(code, 'Employee', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The member-property 'Employee' after 'SomeRec.' must NOT be renamed
      const memberOffset = nthOffset(code, 'SomeRec.Employee', 1) + 'SomeRec.'.length;
      expect(offsets).not.toContain(memberOffset);

      // The param declaration and the bare use 'Employee := 1' MUST be renamed
      const declOffset = nthOffset(code, 'Employee', 1);
      const useOffset = nthOffset(code, 'Employee := 1', 1);
      expect(offsets).toContain(declOffset);
      expect(offsets).toContain(useOffset);
      expect(offsets.length).toBe(2);
    });

    // T6: Option literal MyStatus::Open — the ::Open identifier must not be renamed when renaming local Open
    it('should not rename MyStatus::Open when renaming local variable Open (T6)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      MyStatus : Option;
    PROCEDURE Foo();
    VAR
      Open : Integer;
    BEGIN
      Open := 1;
      IF MyStatus = MyStatus::Open THEN
        Open := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on local Open declaration (occurrence 1)
      const pos = findPosition(code, 'Open', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The 'Open' identifier inside 'MyStatus::Open' must NOT be renamed
      const memberOffset = nthOffset(code, 'MyStatus::Open', 1) + 'MyStatus::'.length;
      expect(offsets).not.toContain(memberOffset);

      // The local declaration and the two 'Open :=' uses MUST be renamed
      const declOffset = nthOffset(code, 'Open', 1);
      const use1Offset = nthOffset(code, 'Open := 1', 1);
      const use2Offset = nthOffset(code, 'Open := 2', 1);
      expect(offsets).toContain(declOffset);
      expect(offsets).toContain(use1Offset);
      expect(offsets).toContain(use2Offset);
      expect(offsets.length).toBe(3);
    });

    // T8: WITH-implicit field — renaming a local must not rewrite a WITH-implicit field with the same name
    it('should not rename WITH-implicit Status when renaming local variable Status in different procedure (T8)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Rec : Record 18;
    PROCEDURE Foo();
    VAR
      Status : Integer;
    BEGIN
      Status := 1;
    END;

    PROCEDURE Bar();
    BEGIN
      WITH Rec DO BEGIN
        Status := 2;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on local Status declaration in Foo (occurrence 1)
      const pos = findPosition(code, 'Status', 1);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The 'Status := 2' inside the WITH block must NOT be renamed (it is a WITH-implicit field)
      const withStatusOffset = nthOffset(code, 'Status := 2', 1);
      expect(offsets).not.toContain(withStatusOffset);

      // The local declaration and 'Status := 1' use MUST be renamed
      const declOffset = nthOffset(code, 'Status', 1);
      const use1Offset = nthOffset(code, 'Status := 1', 1);
      expect(offsets).toContain(declOffset);
      expect(offsets).toContain(use1Offset);
      expect(offsets.length).toBeGreaterThanOrEqual(2);
    });

    // T4: Field origin — renaming from the BARE field use keeps Rec.Field (inverse-keep, must PASS pre-fix)
    it('should keep Rec.Amount when renaming table field Amount from its bare use (T4)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo();
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on the bare 'Amount := 1' use (occurrence 2: first is field decl, second is bare use)
      const pos = findPosition(code, 'Amount', 2);

      const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The bare Amount := 1 use
      const bareOffset = nthOffset(code, 'Amount := 1', 1);
      // The Rec.Amount qualified use
      const qualifiedOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;

      expect(offsets).toContain(bareOffset);
      expect(offsets).toContain(qualifiedOffset);
    });

    // T7: Procedure member-call — renaming a procedure keeps the SomeCdu.DoIt call (inverse-keep, must PASS pre-fix)
    it('should keep SomeCdu.DoIt when renaming procedure DoIt from its definition (T7)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      SomeCdu : Codeunit 50001;
    PROCEDURE DoIt();
    BEGIN
    END;

    PROCEDURE Main();
    BEGIN
      SomeCdu.DoIt;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor on the PROCEDURE DoIt declaration (occurrence 1)
      const pos = findPosition(code, 'DoIt', 1);

      const edits = provider.getRenameEdits(doc, pos, 'Execute', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The proc declaration MUST be renamed
      const declOffset = nthOffset(code, 'DoIt', 1);
      expect(offsets).toContain(declOffset);

      // The SomeCdu.DoIt member-call MUST also be renamed
      const memberCallOffset = nthOffset(code, 'SomeCdu.DoIt', 1) + 'SomeCdu.'.length;
      expect(offsets).toContain(memberCallOffset);
    });

    // T5b: Quoted LOCAL variable — member-property with same quoted name must be excluded
    it('should not rename SomeRec."My Status" when renaming quoted local "My Status" (T5b)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      SomeRec : Record 18;
    PROCEDURE Foo();
    VAR
      "My Status" : Integer;
    BEGIN
      "My Status" := 1;
      SomeRec."My Status" := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor inside the local declaration's quotes (occurrence 1 of '"My Status"')
      const pos = doc.positionAt(nthOffset(code, '"My Status"', 1) + 5);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The member-property '"My Status"' after 'SomeRec.' must NOT be renamed
      const memberOffset = nthOffset(code, 'SomeRec."My Status"', 1) + 'SomeRec.'.length;
      expect(offsets).not.toContain(memberOffset);

      // The local declaration and the bare use '"My Status" := 1' MUST be renamed
      const declOffset = nthOffset(code, '"My Status"', 1);
      const useOffset = nthOffset(code, '"My Status"', 2);
      expect(offsets).toContain(declOffset);
      expect(offsets).toContain(useOffset);
      expect(offsets.length).toBe(2);
    });

    // T5a: Quoted table FIELD — member-property access must be kept (guard test, passes pre and post fix)
    it('should keep Rec."Total Amount" when renaming quoted field from its bare use (T5a)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Total Amount        ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo();
    BEGIN
      "Total Amount" := 1;
      Rec."Total Amount" := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseContent(code);
      // Cursor inside the bare quoted use '"Total Amount" := 1' (inside the quotes)
      const pos = doc.positionAt(nthOffset(code, '"Total Amount" := 1', 1) + 5);

      const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
      const offsets = changeStartOffsets(edits, doc);

      // The member-property '"Total Amount"' after 'Rec.' MUST be kept (field member uses must be renamed too)
      const memberOffset = nthOffset(code, 'Rec."Total Amount"', 1) + 'Rec.'.length;
      expect(offsets).toContain(memberOffset);

      // The bare use '"Total Amount" := 1' MUST be renamed
      const bareUseOffset = nthOffset(code, '"Total Amount" := 1', 1);
      expect(offsets).toContain(bareUseOffset);
      expect(offsets.length).toBeGreaterThanOrEqual(2);
    });

    describe('#797 cursor-on-member-property refuses unifying with a shadowing local', () => {
      // T9: cursor on Rec.Amount property token — local Amount shadows the field, must refuse
      it('should return null when cursor is on Rec.Amount member-property and a local Amount shadows the field (T9)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo();
    VAR
      Amount : Integer;
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the 'Amount' token that is the property of 'Rec.Amount'
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        const pos = doc.positionAt(memberOffset);

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).toBeNull();
      });

      // T9b: cursor inside quoted member-property whose name is shadowed by a local
      it('should return null when cursor is inside quoted member-property "My Status" and a local "My Status" shadows (T9b)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      SomeRec : Record 18;
    PROCEDURE Foo();
    VAR
      "My Status" : Integer;
    BEGIN
      "My Status" := 1;
      SomeRec."My Status" := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor placed 3 characters inside the '"My Status"' token that is the property of SomeRec
        const memberOffset = nthOffset(code, 'SomeRec."My Status"', 1) + 'SomeRec.'.length;
        const pos = doc.positionAt(memberOffset + 3);

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).toBeNull();
      });

      // T9c: parameter shadow — cursor on Rec.Amount member-property, parameter Amount shadows
      it('should return null when cursor is on Rec.Amount member-property and a parameter Amount shadows the field (T9c)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo(Amount : Integer);
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the 'Amount' token that is the property of 'Rec.Amount'
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        const pos = doc.positionAt(memberOffset);

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).toBeNull();
      });

      // T9d: prepareRename should also return null for the same cursor position (UI greys out)
      it('should return null from prepareRename when cursor is on Rec.Amount member-property and a local Amount shadows (T9d)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo();
    VAR
      Amount : Integer;
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Same cursor position as T9
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        const pos = doc.positionAt(memberOffset);

        const result = provider.prepareRename(doc, pos, ast, symbolTable);
        expect(result).toBeNull();
      });

      // T9e: nested member expression — cursor on inner property segment shadowed by a local
      // Uses a FOR loop with a.b.c which parses as nested MemberExpression (see for-member-expression.test.ts:573-617)
      // Cursor is on 'b' (the inner property of a.b.c), and a local 'b' exists in the same scope.
      // The guard must refuse: 'b' here is a property token, not the local variable.
      it('should return null when cursor is on inner property b of a.b.c nested member and a local b shadows (T9e)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      a : Record 50000;
      b : Integer;
    BEGIN
      FOR a.b.c := 1 TO 10 DO
        b := b + 1;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // The nested member expression is a.b.c; 'b' appears as the property of the inner MemberExpression a.b
        // We want the 'b' inside 'a.b.c' (not the standalone 'b' uses)
        // nthOffset finds the first 'a.b' occurrence inside 'FOR a.b.c', then add 'a.'.length to land on 'b'
        const memberOffset = nthOffset(code, 'a.b.c', 1) + 'a.'.length;
        const pos = doc.positionAt(memberOffset);

        const edits = provider.getRenameEdits(doc, pos, 'NewName', ast, symbolTable);
        expect(edits).toBeNull();
      });

      // T10: REGRESSION ANCHOR — no shadowing local, cursor on Rec.Amount member-property
      // Must NOT be blocked: the field rename should include the member-property occurrence
      it('should rename field Amount including Rec.Amount member-property when no local shadows it (T10)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo();
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the 'Amount' token that is the property of 'Rec.Amount'
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        const pos = doc.positionAt(memberOffset);

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration (occurrence 1) must be included
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The member-property usage Rec.Amount must be included
        const qualifiedOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(qualifiedOffset);

        // At least 3 edits: field decl + bare 'Amount := 1' + Rec.Amount
        expect(offsets.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('#800 field rename cursor-on-declaration drops shadowing locals/parameters', () => {
      // T11: cursor on field declaration — local variable shadows the field.
      // Pre-fix: collectFieldReferences is text-only, so the local decl and its bare use are
      // both renamed → the two NOT-renamed assertions FAIL (demonstrating the bug).
      it('should rename field declaration and Rec.Amount member use but NOT a same-named local variable and its uses (T11)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo@1();
    VAR
      Amount : Integer;
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration 'Amount' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration MUST be renamed
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The member-property 'Rec.Amount' MUST be renamed
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // The local variable DECLARATION 'Amount : Integer' must NOT be renamed
        const localDeclOffset = nthOffset(code, 'Amount : Integer', 1);
        expect(offsets).not.toContain(localDeclOffset);

        // The bare local USE 'Amount := 1' must NOT be renamed
        const localUseOffset = nthOffset(code, 'Amount := 1', 1);
        expect(offsets).not.toContain(localUseOffset);

        // Exactly 2 edits: field declaration + Rec.Amount member use
        expect(offsets.length).toBe(2);
      });

      // T11b: cursor on field declaration — PARAMETER shadows the field.
      // Pre-fix: the parameter declaration and its bare uses are also renamed → bug.
      it('should rename field declaration and Rec.Amount member use but NOT a same-named parameter and its uses (T11b)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo@1(Amount : Integer);
    BEGIN
      Amount := Amount + 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration 'Amount' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration MUST be renamed
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The member-property 'Rec.Amount' MUST be renamed
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // The parameter DECLARATION 'Amount : Integer' in the procedure signature must NOT be renamed
        const paramDeclOffset = nthOffset(code, 'Amount : Integer', 1);
        expect(offsets).not.toContain(paramDeclOffset);

        // The parameter USES in the body must NOT be renamed: 'Amount := Amount + 1'
        const paramUse1Offset = nthOffset(code, 'Amount := Amount + 1', 1);
        expect(offsets).not.toContain(paramUse1Offset);
        const paramUse2Offset = nthOffset(code, 'Amount + 1', 1);
        expect(offsets).not.toContain(paramUse2Offset);

        // Exactly 2 edits: field declaration + Rec.Amount member use
        expect(offsets.length).toBe(2);
      });

      // T11c: case-insensitivity of the shadow drop.
      // The local is declared as 'Amount' but used as 'AMOUNT := 1' (all-caps).
      // C/AL identifiers are case-insensitive so this is the same local — must NOT be renamed.
      // Pre-fix: the text scan matches case-insensitively but has no scope awareness, so
      // 'AMOUNT := 1' is still renamed → the NOT-renamed assertion FAILS.
      it('should not rename case-variant local use AMOUNT when field Amount is renamed (T11c)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo@1();
    VAR
      Amount : Integer;
    BEGIN
      AMOUNT := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration 'Amount' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration MUST be renamed
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The member-property 'Rec.Amount' MUST be renamed
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // The case-variant local use 'AMOUNT := 1' must NOT be renamed (same local, different case)
        const caseVariantOffset = nthOffset(code, 'AMOUNT := 1', 1);
        expect(offsets).not.toContain(caseVariantOffset);

        // Exactly 2 edits: field declaration + Rec.Amount member use
        expect(offsets.length).toBe(2);
      });

      // T11d: no-shadow positive control — field Amount, NO local of that name.
      // All three tokens (field declaration, bare field use, Rec.Amount) MUST be renamed.
      // This MUST pass both pre- and post-fix — it verifies the fix does not over-drop.
      it('should rename field declaration, bare field use, and Rec.Amount when no local shadows (T11d)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo@1();
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
        // Cursor on the field declaration 'Amount' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration MUST be renamed
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The bare field use 'Amount := 100' MUST be renamed
        const bareUseOffset = nthOffset(code, 'Amount := 100', 1);
        expect(offsets).toContain(bareUseOffset);

        // The member-property 'Rec.Amount' MUST be renamed
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // Exactly 3 edits: field declaration + bare use + Rec.Amount member use
        expect(offsets.length).toBe(3);
      });

      // T11e: shadow in one procedure, legitimate bare use in another.
      // PROCEDURE A has a local Amount (must NOT rename its decl/use).
      // PROCEDURE B has no local Amount (MUST rename its bare use + member use).
      // Pre-fix: text-only scan renames all occurrences regardless of procedure → FAILS.
      it('should rename bare field use in unshadowed procedure but not the shadowing local in another procedure (T11e)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE ProcA@1();
    VAR
      Amount : Integer;
    BEGIN
      Amount := 1;
    END;

    PROCEDURE ProcB@2();
    BEGIN
      Amount := 2;
      Rec.Amount := 3;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration 'Amount' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration MUST be renamed
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // ProcA's local declaration 'Amount : Integer' must NOT be renamed
        const localDeclOffset = nthOffset(code, 'Amount : Integer', 1);
        expect(offsets).not.toContain(localDeclOffset);

        // ProcA's local use 'Amount := 1' must NOT be renamed
        const localUseOffset = nthOffset(code, 'Amount := 1', 1);
        expect(offsets).not.toContain(localUseOffset);

        // ProcB's bare field use 'Amount := 2' MUST be renamed (no local shadows it there)
        const procBBareOffset = nthOffset(code, 'Amount := 2', 1);
        expect(offsets).toContain(procBBareOffset);

        // ProcB's member use 'Rec.Amount' MUST be renamed
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // Exactly 3 edits: field declaration + ProcB bare use + ProcB Rec.Amount
        expect(offsets.length).toBe(3);
      });

      // T11f: unquoted multi-token field shadowed by a quoted local.
      // Field 'Update Count' (Integer). A procedure has VAR "Update Count" : Integer; (the only
      // legal way to shadow a multi-token field name). Cursor on field declaration.
      // Pre-fix: collectFieldReferences matches all text occurrences of the name span/quoted token,
      // so the local declaration and its use are also renamed → the NOT-renamed assertions FAIL.
      // Location assertions depend on fixture structure - do not reformat
      it('should rename multi-token field declaration and Rec."Update Count" but NOT the same-named quoted local (T11f)', () => {
        // prettier-ignore
        // Location assertions depend on fixture structure - do not reformat
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Update Count        ; Integer       }
  }
  CODE
  {
    VAR
      Rec : Record 50000;
    PROCEDURE Foo@1();
    VAR
      "Update Count" : Integer;
    BEGIN
      "Update Count" := 1;
      Rec."Update Count" := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the first token of the field declaration 'Update Count' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Update Count', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedUpdateCount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The field declaration 'Update Count' in FIELDS MUST be renamed
        const fieldDeclOffset = nthOffset(code, 'Update Count', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The member-property 'Rec."Update Count"' MUST be renamed
        const memberOffset = nthOffset(code, 'Rec."Update Count"', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // The quoted local DECLARATION '"Update Count" : Integer' must NOT be renamed
        const localDeclOffset = nthOffset(code, '"Update Count" : Integer', 1);
        expect(offsets).not.toContain(localDeclOffset);

        // The quoted local USE '"Update Count" := 1' must NOT be renamed
        const localUseOffset = nthOffset(code, '"Update Count" := 1', 1);
        expect(offsets).not.toContain(localUseOffset);

        // Exactly 2 edits: field declaration + Rec."Update Count" member use
        expect(offsets.length).toBe(2);
      });

      // T11g: REGRESSION for #800 fix — global CODE-section VAR with same name as field.
      // The symbol-table root scope is last-write-wins. FIELDS is traversed before CODE VAR, so
      // a global VAR Amount overwrites the field (kind:'field') with kind:'variable' in root scope.
      // At the field declaration offset, getSymbolAtOffset returns kind:'variable', so
      // keepFieldReferenceToken returns false — DROPPING the field declaration itself → 0 edits.
      // The declaration-rescue guard (`anchorOffset === field.nameToken?.startOffset → return true`)
      // must fire BEFORE the kind check to prevent this silent no-op.
      it('should rename field declaration (and Rec.Amount) even when a same-named global VAR overwrites field in root scope (T11g)', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Amount : Integer;
      Rec : Record 50000;
    PROCEDURE Foo@1();
    BEGIN
      Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration 'Amount' in FIELDS (occurrence 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'RenamedAmount', ast, symbolTable);

        // Pre-fix: the field declaration is DROPPED (kind='variable' from root-scope overwrite),
        // so edits is null or has 0 edits. This assertion FAILS before the fix.
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // The FIELD DECLARATION offset MUST be in the edits (the invariant being fixed)
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // The member-property 'Rec.Amount' MUST be in the edits (rescued by isCursorOnMemberProperty)
        const memberOffset = nthOffset(code, 'Rec.Amount', 1) + 'Rec.'.length;
        expect(offsets).toContain(memberOffset);

        // The global VAR declaration 'Amount : Integer' must NOT be in the edits
        const globalVarDeclOffset = nthOffset(code, 'Amount : Integer', 1);
        expect(offsets).not.toContain(globalVarDeclOffset);

        // The global bare use 'Amount := 1' must NOT be in the edits
        // (global var shadows field for bare refs → a var use, not a field use)
        const globalBareUseOffset = nthOffset(code, 'Amount := 1', 1);
        expect(offsets).not.toContain(globalBareUseOffset);

        // Exactly 2 edits: field declaration + Rec.Amount member use
        expect(offsets.length).toBe(2);
      });
    });

    describe('#801 field–procedure name collision is discriminated by AST role', () => {
      // Core shared fixture for T-801a / T-801b / T-801c / T-801d / T-801g / T-801l.
      //
      // Amount occurrences (all named 'Amount'):
      //   occ 1  → FIELDS section field declaration           (field decl)
      //   occ 2  → PROCEDURE Amount@1 declaration token       (proc decl)
      //   occ 3  → Amount(5);  — standalone bare call         (proc call, parens)
      //   occ 4  → Rec2.Amount := 1  — member field access    (field member access, no parens)
      //   occ 5  → Rec2.Amount(5)    — member proc call       (proc member call, parens)
      //   occ 6  → WITH Rec2 DO BEGIN Amount := 2             (WITH-block bare field use)
      const coreFixture = `OBJECT Table 50000 CollisionTbl
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    PROCEDURE Amount@1(X : Decimal) : Decimal;
    BEGIN
    END;

    PROCEDURE Foo@2();
    VAR
      Rec2 : Record 50000;
    BEGIN
      Amount(5);
      Rec2.Amount := 1;
      Rec2.Amount(5);
      WITH Rec2 DO BEGIN
        Amount := 2;
      END;
    END;

    BEGIN
    END.
  }
}`;

      // T-801a: FIELD rename must include field decl, Rec2.Amount member access, and WITH-block bare
      // use; and EXCLUDE the procedure declaration token and the bare call Amount(5).
      // EXPECTED: FAIL before fix (proc decl and bare call are over-renamed today).
      it('should rename field decl + member access + WITH-bare but NOT proc decl or bare call when renaming field Amount (T-801a)', () => {
        const doc = createDocument(coreFixture);
        const { ast, symbolTable } = parseContent(coreFixture);
        // Cursor on the FIELD declaration (occ 1)
        const pos = doc.positionAt(nthOffset(coreFixture, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Field declaration (occ 1) MUST be in the edits
        const fieldDeclOffset = nthOffset(coreFixture, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // Rec2.Amount := 1 member ACCESS MUST be in the edits (occ 4)
        const memberAccessOffset = nthOffset(coreFixture, 'Rec2.Amount := 1', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberAccessOffset);

        // WITH-block bare field use Amount := 2 MUST be in the edits (occ 6)
        const withBareOffset = nthOffset(coreFixture, 'Amount := 2', 1);
        expect(offsets).toContain(withBareOffset);

        // Procedure declaration (occ 2) MUST NOT be in the edits
        const procDeclOffset = nthOffset(coreFixture, 'Amount', 2);
        expect(offsets).not.toContain(procDeclOffset);

        // Bare call Amount(5) (occ 3) MUST NOT be in the edits
        const bareCallOffset = nthOffset(coreFixture, 'Amount(5)', 1);
        expect(offsets).not.toContain(bareCallOffset);
      });

      // T-801b: GUARDRAIL — WITH-block bare field use must NOT be dropped by the fix.
      // The WITH Rec2 DO block makes Amount resolve as a field use.
      // This guards against a naive fix that under-renames.
      // EXPECTED: may PASS before fix (rename currently over-renames, not under-renames).
      it('should keep WITH-block bare field use Amount := 2 in edits when renaming field Amount (T-801b)', () => {
        const doc = createDocument(coreFixture);
        const { ast, symbolTable } = parseContent(coreFixture);
        // Cursor on the FIELD declaration (occ 1)
        const pos = doc.positionAt(nthOffset(coreFixture, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // WITH-block bare field use Amount := 2 MUST be in the edits
        const withBareOffset = nthOffset(coreFixture, 'Amount := 2', 1);
        expect(offsets).toContain(withBareOffset);
      });

      // T-801c: FIELD rename — Rec2.Amount(5) member CALL must be EXCLUDED (proc context),
      // while Rec2.Amount := 1 member ACCESS must be INCLUDED (field context).
      // EXPECTED: FAIL before fix (member call over-renamed today).
      it('should exclude Rec2.Amount(5) member call but include Rec2.Amount member access when renaming field Amount (T-801c)', () => {
        const doc = createDocument(coreFixture);
        const { ast, symbolTable } = parseContent(coreFixture);
        // Cursor on the FIELD declaration (occ 1)
        const pos = doc.positionAt(nthOffset(coreFixture, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Rec2.Amount(5) member CALL MUST NOT be in the edits (proc reference via parens)
        const memberCallOffset = nthOffset(coreFixture, 'Rec2.Amount(5)', 1) + 'Rec2.'.length;
        expect(offsets).not.toContain(memberCallOffset);

        // Rec2.Amount := 1 member ACCESS MUST be in the edits (field access)
        const memberAccessOffset = nthOffset(coreFixture, 'Rec2.Amount := 1', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberAccessOffset);
      });

      // T-801d: PROCEDURE rename must include proc decl + bare call Amount(5) + member call
      // Rec2.Amount(5); and EXCLUDE the FIELDS-section field declaration.
      // The member ACCESS Rec2.Amount := 1 is a documented residual (included, not excluded).
      // EXPECTED: FAIL before fix (field decl over-renamed today).
      it('should rename proc decl + bare call + member call but NOT field decl when renaming procedure Amount (T-801d)', () => {
        const doc = createDocument(coreFixture);
        const { ast, symbolTable } = parseContent(coreFixture);
        // Cursor on the PROCEDURE Amount declaration (occ 2)
        const pos = doc.positionAt(nthOffset(coreFixture, 'Amount', 2));

        const edits = provider.getRenameEdits(doc, pos, 'CalcAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Procedure declaration (occ 2) MUST be in the edits
        const procDeclOffset = nthOffset(coreFixture, 'Amount', 2);
        expect(offsets).toContain(procDeclOffset);

        // Bare call Amount(5) MUST be in the edits (occ 3 — parenthesized → proc reference)
        const bareCallOffset = nthOffset(coreFixture, 'Amount(5)', 1);
        expect(offsets).toContain(bareCallOffset);

        // Member call Rec2.Amount(5) MUST be in the edits (parens → proc reference)
        const memberCallOffset = nthOffset(coreFixture, 'Rec2.Amount(5)', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberCallOffset);

        // Field declaration (occ 1) MUST NOT be in the edits
        const fieldDeclOffset = nthOffset(coreFixture, 'Amount', 1);
        expect(offsets).not.toContain(fieldDeclOffset);

        // Rec2.Amount := 1 member access: documented residual — currently INCLUDED (known gap, tracked in #802)
        const memberAccessOffset = nthOffset(coreFixture, 'Rec2.Amount := 1', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberAccessOffset);
      });

      // T-801e: Quoted field "Total Amount" + PROCEDURE "Total Amount"@1().
      // Renaming the FIELD must EXCLUDE the quoted procedure declaration and INCLUDE field decl
      // and Rec2."Total Amount" member access.
      // EXPECTED: FAIL before fix (proc decl over-renamed today).
      it('should rename quoted field decl + member access but NOT quoted proc decl when renaming quoted field "Total Amount" (T-801e)', () => {
        const code = `OBJECT Table 50000 TotalAmountTest
{
  FIELDS
  {
    { 1 ;   ; Total Amount        ; Decimal       }
  }
  CODE
  {
    PROCEDURE "Total Amount"@1() : Decimal;
    BEGIN
    END;

    PROCEDURE Foo@2();
    VAR
      Rec2 : Record 50000;
    BEGIN
      Rec2."Total Amount" := 1;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration 'Total Amount' in FIELDS (occ 1 of 'Total Amount')
        const pos = doc.positionAt(nthOffset(code, 'Total Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'GrandTotal', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Field declaration 'Total Amount' in FIELDS MUST be in the edits
        const fieldDeclOffset = nthOffset(code, 'Total Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // Rec2."Total Amount" member access MUST be in the edits (occ 2 of '"Total Amount"' with quotes)
        const memberAccessOffset = nthOffset(code, 'Rec2."Total Amount"', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberAccessOffset);

        // Quoted PROCEDURE declaration '"Total Amount"' MUST NOT be in the edits
        // The proc decl is occ 1 of '"Total Amount"' (with quotes); FIELDS uses unquoted 'Total Amount'
        const procDeclOffset = nthOffset(code, '"Total Amount"', 1);
        expect(offsets).not.toContain(procDeclOffset);
      });

      // T-801f: NEGATIVE CONTROL — field Amount with NO procedure or var collision.
      // Rename the field; assert edits are exactly the field decl + its bare/member uses.
      // Guards the new drop logic from over-firing when there is no collision.
      // EXPECTED: PASS before and after fix.
      it('should rename field decl + bare use + member use normally when no procedure collision exists (T-801f)', () => {
        const code = `OBJECT Table 50000 NoCollisionTest
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    VAR
      Rec2 : Record 50000;
    PROCEDURE Foo@1();
    BEGIN
      Amount := 10;
      Rec2.Amount := 20;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the field declaration (occ 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Field declaration MUST be in the edits
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // Bare field use 'Amount := 10' MUST be in the edits
        const bareUseOffset = nthOffset(code, 'Amount := 10', 1);
        expect(offsets).toContain(bareUseOffset);

        // Rec2.Amount member access MUST be in the edits
        const memberOffset = nthOffset(code, 'Rec2.Amount', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberOffset);

        // Exactly 3 edits: field decl + bare use + member use
        expect(offsets.length).toBe(3);
      });

      // T-801g: Renaming the PROCEDURE should NOT rename the WITH-block bare field use.
      // First asserts procedure decl and a real call ARE in the edits (parse sanity).
      // Then asserts the WITH-block bare-field offset is NOT in the edits (desired behavior).
      // WITH-field resolution provided by #790 ensures Amount := 2 resolves to the field, not the proc.
      it('should NOT rename WITH-block bare field use Amount := 2 when renaming procedure Amount (T-801g)', () => {
        const doc = createDocument(coreFixture);
        const { ast, symbolTable } = parseContent(coreFixture);
        // Cursor on the PROCEDURE Amount declaration (occ 2)
        const pos = doc.positionAt(nthOffset(coreFixture, 'Amount', 2));

        const edits = provider.getRenameEdits(doc, pos, 'CalcAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Sanity: procedure decl MUST be in the edits
        const procDeclOffset = nthOffset(coreFixture, 'Amount', 2);
        expect(offsets).toContain(procDeclOffset);

        // Sanity: bare call Amount(5) MUST be in the edits
        const bareCallOffset = nthOffset(coreFixture, 'Amount(5)', 1);
        expect(offsets).toContain(bareCallOffset);

        // WITH-block bare field use MUST NOT be in the edits (it's a field use, not a proc call)
        const withBareOffset = nthOffset(coreFixture, 'Amount := 2', 1);
        expect(offsets).not.toContain(withBareOffset);
      });

      // T-801h: Triple collision — field Amount + LOCAL VAR Amount inside Foo + PROCEDURE Amount.
      // Renaming the FIELD: proc decl + its call + local var decl + local var bare use MUST be
      // excluded; field decl + field member access MUST be included.
      // The local var resolves to kind:'variable' (child scope) → dropped by guard 4 (var/param
      // kind drop). The proc decl + bare call are dropped by guard 2 (proc-ref set).
      // EXPECTED: FAIL before fix (proc decl and local var tokens over-renamed today).
      it('should rename only field decl + member access; exclude proc decl + call + local var when triple collision on Amount (T-801h)', () => {
        // Amount occurrences in this fixture:
        //   occ 1  → FIELDS section field declaration
        //   occ 2  → PROCEDURE Amount@1 declaration
        //   occ 3  → local VAR Amount : Integer declaration (inside Foo, above BEGIN)
        //   occ 4  → Amount(5); bare call in Foo (proc call)
        //   occ 5  → Rec2.Amount := 1; member field access
        //   occ 6  → Amount := 99; local var bare use
        const code = `OBJECT Table 50000 TripleCollisionTest
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    PROCEDURE Amount@1(X : Decimal) : Decimal;
    BEGIN
    END;

    PROCEDURE Foo@2();
    VAR
      Amount : Integer;
      Rec2 : Record 50000;
    BEGIN
      Amount(5);
      Rec2.Amount := 1;
      Amount := 99;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the FIELD declaration (occ 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Field declaration (occ 1) MUST be in the edits
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // Rec2.Amount member access MUST be in the edits (occ 4)
        const memberAccessOffset = nthOffset(code, 'Rec2.Amount := 1', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberAccessOffset);

        // Procedure declaration (occ 2) MUST NOT be in the edits
        const procDeclOffset = nthOffset(code, 'Amount', 2);
        expect(offsets).not.toContain(procDeclOffset);

        // Bare call 'Amount(5)' (occ 3) MUST NOT be in the edits
        const bareCallOffset = nthOffset(code, 'Amount(5)', 1);
        expect(offsets).not.toContain(bareCallOffset);

        // Local VAR declaration 'Amount : Integer' (occ 5) MUST NOT be in the edits
        const localVarDeclOffset = nthOffset(code, 'Amount : Integer', 1);
        expect(offsets).not.toContain(localVarDeclOffset);

        // Local VAR bare use 'Amount := 99' (occ 6) MUST NOT be in the edits
        const localVarUseOffset = nthOffset(code, 'Amount := 99', 1);
        expect(offsets).not.toContain(localVarUseOffset);
      });

      // T-801i: Call before declaration — the bare call Amount(5) appears in source BEFORE the
      // PROCEDURE Amount declaration. Rename the FIELD. Assert the early call is still EXCLUDED
      // (proc-ref collection must be whole-AST, order-independent).
      // EXPECTED: FAIL before fix (call over-renamed today regardless of source order).
      it('should exclude a bare call Amount(5) that appears before the PROCEDURE declaration when renaming field Amount (T-801i)', () => {
        // Amount occurrences:
        //   occ 1  → FIELDS section field declaration
        //   occ 2  → Amount(5); bare call in Foo (BEFORE the proc declaration)
        //   occ 3  → PROCEDURE Amount@1 declaration (comes AFTER the call in source)
        const code = `OBJECT Table 50000 CallBeforeDeclTest
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      Amount(5);
    END;

    PROCEDURE Amount@2(X : Decimal) : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the FIELD declaration (occ 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Field declaration (occ 1) MUST be in the edits
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // Bare call Amount(5) appearing BEFORE the proc declaration MUST NOT be in the edits
        const earlyCallOffset = nthOffset(code, 'Amount(5)', 1);
        expect(offsets).not.toContain(earlyCallOffset);

        // Procedure declaration MUST NOT be in the edits
        const procDeclOffset = nthOffset(code, 'Amount', 3);
        expect(offsets).not.toContain(procDeclOffset);
      });

      // T-801j: GUARDRAIL — parameterless member calls preserved on procedure rename.
      // A procedure DoIt with a same-named FIELD DoIt present.
      // Called parameterless as 'SomeRec.DoIt;' (statement) and 'X := SomeRec.DoIt;' (expression).
      // Rename the PROCEDURE; assert both parameterless call offsets ARE in the edits (kept).
      // Locks the T7-class behavior with a field collision present.
      // EXPECTED: PASS before and after fix.
      it('should keep both parameterless member calls SomeRec.DoIt in edits when renaming procedure DoIt with a same-named field (T-801j)', () => {
        const code = `OBJECT Table 50000 ExecCollisionTbl
{
  FIELDS
  {
    { 1 ;   ; DoIt                ; Boolean       }
  }
  CODE
  {
    VAR
      SomeRec : Record 50000;
    PROCEDURE DoIt@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    VAR
      X : Boolean;
    BEGIN
      SomeRec.DoIt;
      X := SomeRec.DoIt;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the PROCEDURE DoIt declaration (occ 2 of 'DoIt': occ 1 is field decl)
        const pos = doc.positionAt(nthOffset(code, 'DoIt', 2));

        const edits = provider.getRenameEdits(doc, pos, 'Execute', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Procedure declaration (occ 2) MUST be in the edits
        const procDeclOffset = nthOffset(code, 'DoIt', 2);
        expect(offsets).toContain(procDeclOffset);

        // First parameterless call 'SomeRec.DoIt;' MUST be in the edits
        const call1Offset = nthOffset(code, 'SomeRec.DoIt', 1) + 'SomeRec.'.length;
        expect(offsets).toContain(call1Offset);

        // Second parameterless call 'X := SomeRec.DoIt' MUST be in the edits
        const call2Offset = nthOffset(code, 'SomeRec.DoIt', 2) + 'SomeRec.'.length;
        expect(offsets).toContain(call2Offset);
      });

      // T-801k (it.failing): Renaming the FIELD should NOT rename a parameterless procedure call.
      // Cover BOTH Amount; (statement) and X := Amount; (expression, no parens).
      // First asserts field decl + a real field use ARE in the edits (parse sanity).
      // Then asserts the parameterless-call offsets are NOT in the edits (desired).
      // Known residual (AC4 partial) — tracked in #802; remove .failing when #802 lands.
      // EXPECTED: xfail (parameterless bare calls indistinguishable from field uses without parens today).
      it.failing('should NOT rename parameterless call Amount; and X := Amount; when renaming field Amount (T-801k)', () => {
        // Amount occurrences:
        //   occ 1  → FIELDS section field declaration
        //   occ 2  → PROCEDURE Amount@1 declaration (parameterless)
        //   occ 3  → Amount; — parameterless call statement
        //   occ 4  → X := Amount; — parameterless call in expression
        //   occ 5  → Rec2.Amount := 1; — member field access (the real field use)
        const code = `OBJECT Table 50000 ParamlessCallTest
{
  FIELDS
  {
    { 1 ;   ; Amount              ; Decimal       }
  }
  CODE
  {
    PROCEDURE Amount@1() : Decimal;
    BEGIN
    END;

    PROCEDURE Foo@2();
    VAR
      Rec2 : Record 50000;
      X : Decimal;
    BEGIN
      Amount;
      X := Amount;
      Rec2.Amount := 1;
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, symbolTable } = parseContent(code);
        // Cursor on the FIELD declaration (occ 1)
        const pos = doc.positionAt(nthOffset(code, 'Amount', 1));

        const edits = provider.getRenameEdits(doc, pos, 'TotalAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Sanity: field declaration MUST be in the edits
        const fieldDeclOffset = nthOffset(code, 'Amount', 1);
        expect(offsets).toContain(fieldDeclOffset);

        // Sanity: Rec2.Amount member ACCESS MUST be in the edits (the real field use)
        const memberAccessOffset = nthOffset(code, 'Rec2.Amount := 1', 1) + 'Rec2.'.length;
        expect(offsets).toContain(memberAccessOffset);

        // Known residual (AC4 partial) — tracked in #802; remove .failing when #802 lands.
        // Parameterless call 'Amount;' (statement) MUST NOT be in the edits
        const paramlessStmtOffset = nthOffset(code, 'Amount', 3);
        expect(offsets).not.toContain(paramlessStmtOffset);

        // Parameterless call 'X := Amount;' (expression) MUST NOT be in the edits
        const paramlessExprOffset = nthOffset(code, 'Amount', 4);
        expect(offsets).not.toContain(paramlessExprOffset);
      });

      // T-801l (it.failing): Renaming the PROCEDURE should NOT rename a Rec.Field member access.
      // First asserts procedure decl + a real call ARE in the edits (parse sanity).
      // Then asserts the Rec2.Amount member ACCESS offset is NOT in the edits (desired).
      // Known residual (AC4 partial) — tracked in #802; remove .failing when #802 lands.
      // EXPECTED: xfail (member access indistinguishable from member call without parens today).
      it.failing('should NOT rename Rec2.Amount member access when renaming procedure Amount (T-801l)', () => {
        const doc = createDocument(coreFixture);
        const { ast, symbolTable } = parseContent(coreFixture);
        // Cursor on the PROCEDURE Amount declaration (occ 2)
        const pos = doc.positionAt(nthOffset(coreFixture, 'Amount', 2));

        const edits = provider.getRenameEdits(doc, pos, 'CalcAmount', ast, symbolTable);
        expect(edits).not.toBeNull();

        const offsets = changeStartOffsets(edits, doc);

        // Sanity: procedure decl MUST be in the edits
        const procDeclOffset = nthOffset(coreFixture, 'Amount', 2);
        expect(offsets).toContain(procDeclOffset);

        // Sanity: bare call Amount(5) MUST be in the edits (real proc call)
        const bareCallOffset = nthOffset(coreFixture, 'Amount(5)', 1);
        expect(offsets).toContain(bareCallOffset);

        // Known residual (AC4 partial) — tracked in #802; remove .failing when #802 lands.
        // Rec2.Amount := 1 member ACCESS MUST NOT be in the edits (it's a field access, not a proc call)
        const memberAccessOffset = nthOffset(coreFixture, 'Rec2.Amount := 1', 1) + 'Rec2.'.length;
        expect(offsets).not.toContain(memberAccessOffset);
      });
    });
  });
});
