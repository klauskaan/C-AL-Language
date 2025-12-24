/**
 * Tests for Find All References Provider
 */

import { ReferenceProvider } from '../referenceProvider';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver';

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string, uri: string = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse content into AST
 */
function parseContent(content: string): { ast: any } {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return { ast };
}

describe('ReferenceProvider', () => {
  let provider: ReferenceProvider;

  beforeEach(() => {
    provider = new ReferenceProvider();
  });

  describe('Basic Reference Finding', () => {
    it('should find all references to a variable', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Counter : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Counter := 1;
    Counter := Counter + 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on 'Counter' in the VAR section
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Counter : Integer'));
      const counterCol = lines[defLineIndex].indexOf('Counter');

      const result = provider.getReferences(doc, Position.create(defLineIndex, counterCol + 3), ast, true);

      // Should find: 1 definition + 3 usages (one in assignment target, two in assignment value)
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should find references to a procedure', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  PROCEDURE MyProcedure();
  BEGIN
  END;

  PROCEDURE CallIt();
  BEGIN
    MyProcedure;
  END;

  PROCEDURE CallItTwice();
  BEGIN
    MyProcedure;
    MyProcedure;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on MyProcedure definition
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('PROCEDURE MyProcedure'));
      const procCol = lines[defLineIndex].indexOf('MyProcedure');

      const result = provider.getReferences(doc, Position.create(defLineIndex, procCol + 5), ast, true);

      // Should find: 1 definition + 3 calls
      expect(result.length).toBe(4);
    });

    it('should find references to a field', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 }
}
CODE
  PROCEDURE DoSomething();
  BEGIN
    Name := 'Test';
    Name := Name + ' More';
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on 'Name' field definition
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Name ; Text50'));

      // Find the column of 'Name' within that line
      const nameCol = lines[defLineIndex].indexOf('Name');

      const result = provider.getReferences(doc, Position.create(defLineIndex, nameCol + 2), ast, true);

      // Should find: 1 definition + 3 usages
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Include/Exclude Declaration', () => {
    it('should include declaration when includeDeclaration is true', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    MyVar : Integer;

  PROCEDURE DoSomething();
  BEGIN
    MyVar := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const usageLineIndex = lines.findIndex(l => l.includes('MyVar := 1'));
      const varCol = lines[usageLineIndex].indexOf('MyVar');

      const withDecl = provider.getReferences(doc, Position.create(usageLineIndex, varCol + 2), ast, true);
      const withoutDecl = provider.getReferences(doc, Position.create(usageLineIndex, varCol + 2), ast, false);

      expect(withDecl.length).toBeGreaterThan(withoutDecl.length);
    });

    it('should exclude declaration when includeDeclaration is false', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Counter : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Counter := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const usageLineIndex = lines.findIndex(l => l.includes('Counter := 1'));
      const varCol = lines[usageLineIndex].indexOf('Counter');

      const result = provider.getReferences(doc, Position.create(usageLineIndex, varCol + 3), ast, false);

      // Find the definition line
      const defLineIndex = lines.findIndex(l => l.includes('Counter : Integer'));

      // None of the results should be on the definition line
      const defResults = result.filter(loc => loc.range.start.line === defLineIndex);
      expect(defResults.length).toBe(0);
    });
  });

  describe('Case Insensitivity', () => {
    it('should find references regardless of case', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    MyVariable : Integer;

  PROCEDURE DoSomething();
  BEGIN
    myvariable := 1;
    MYVARIABLE := 2;
    MyVariable := 3;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('MyVariable : Integer'));
      const varCol = lines[defLineIndex].indexOf('MyVariable');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 3), ast, true);

      // Should find all 4 references (1 definition + 3 usages with different cases)
      expect(result.length).toBe(4);
    });
  });

  describe('Expression Contexts', () => {
    it('should find references in binary expressions', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    A : Integer;
    B : Integer;

  PROCEDURE DoSomething();
  BEGIN
    A := A + B;
    B := A - B;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('A : Integer'));
      const aCol = lines[defLineIndex].indexOf('A');

      const result = provider.getReferences(doc, Position.create(defLineIndex, aCol), ast, true);

      // A is used: 1 definition + multiple usages in expressions
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should find references in IF conditions', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Flag : Boolean;

  PROCEDURE DoSomething();
  BEGIN
    IF Flag THEN
      Flag := FALSE;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Flag : Boolean'));
      const flagCol = lines[defLineIndex].indexOf('Flag');

      const result = provider.getReferences(doc, Position.create(defLineIndex, flagCol + 2), ast, true);

      // Flag: 1 definition + 2 usages (condition + assignment)
      expect(result.length).toBe(3);
    });

    it('should find references in WHILE loops', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Counter : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Counter := 0;
    WHILE Counter < 10 DO
      Counter := Counter + 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Counter : Integer'));
      const counterCol = lines[defLineIndex].indexOf('Counter');

      const result = provider.getReferences(doc, Position.create(defLineIndex, counterCol + 3), ast, true);

      // Counter: 1 definition + 4 usages
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should find references in REPEAT loops', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    I : Integer;

  PROCEDURE DoSomething();
  BEGIN
    I := 0;
    REPEAT
      I := I + 1;
    UNTIL I >= 10;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('I : Integer'));
      const iCol = lines[defLineIndex].indexOf('I');

      const result = provider.getReferences(doc, Position.create(defLineIndex, iCol), ast, true);

      // I: 1 definition + multiple usages
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should find references in FOR loops including loop variable', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    I : Integer;
    Sum : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Sum := 0;
    FOR I := 1 TO 10 DO
      Sum := Sum + I;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('I : Integer'));
      const iCol = lines[defLineIndex].indexOf('I');

      const result = provider.getReferences(doc, Position.create(defLineIndex, iCol), ast, true);

      // I: 1 definition + 2 usages (FOR I := and Sum + I)
      expect(result.length).toBe(3);
    });

    it('should find references in CASE statements', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Status : Integer;

  PROCEDURE DoSomething();
  BEGIN
    CASE Status OF
      1: Status := 2;
      2: Status := 3;
    END;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Status : Integer'));
      const statusCol = lines[defLineIndex].indexOf('Status');

      const result = provider.getReferences(doc, Position.create(defLineIndex, statusCol + 3), ast, true);

      // Status: 1 definition + 3 usages (case expression + 2 assignments)
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should find references in function call arguments', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Value : Integer;

  PROCEDURE ProcessValue(P : Integer);
  BEGIN
  END;

  PROCEDURE DoSomething();
  BEGIN
    ProcessValue(Value);
    ProcessValue(Value + 1);
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Value : Integer'));
      const valueCol = lines[defLineIndex].indexOf('Value');

      const result = provider.getReferences(doc, Position.create(defLineIndex, valueCol + 2), ast, true);

      // Value: 1 definition + 2 usages in function calls
      expect(result.length).toBe(3);
    });
  });

  describe('Member Expressions', () => {
    it('should find references to fields accessed via member expression', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; CustomerName ; Text100 }
}
CODE
  PROCEDURE DoSomething();
  VAR
    Rec : Record 50000;
  BEGIN
    Rec.CustomerName := 'Test';
    Rec.CustomerName := Rec.CustomerName + ' More';
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('CustomerName ; Text100'));
      const nameCol = lines[defLineIndex].indexOf('CustomerName');

      const result = provider.getReferences(doc, Position.create(defLineIndex, nameCol + 5), ast, true);

      // CustomerName: 1 definition + 3 usages (2 assignments + 1 read)
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Local Variables and Parameters', () => {
    it('should find references to local variables', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  PROCEDURE DoSomething();
  VAR
    LocalVar : Integer;
  BEGIN
    LocalVar := 1;
    LocalVar := LocalVar + 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('LocalVar : Integer'));
      const varCol = lines[defLineIndex].indexOf('LocalVar');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 3), ast, true);

      // LocalVar: 1 definition + 3 usages
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should find references to procedure parameters', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  PROCEDURE DoSomething(Param : Integer);
  BEGIN
    Param := Param + 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Param : Integer'));
      const paramCol = lines[defLineIndex].indexOf('Param');

      const result = provider.getReferences(doc, Position.create(defLineIndex, paramCol + 2), ast, true);

      // Param: 1 definition + 2 usages
      expect(result.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for unknown symbol', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on 'Unknown' which doesn't exist
      const testDoc = createDocument('UnknownSymbol');
      const result = provider.getReferences(testDoc, Position.create(0, 5), ast, true);

      expect(result.length).toBe(0);
    });

    it('should return empty array for empty document', () => {
      const doc = createDocument('');
      const { ast } = parseContent('');

      const result = provider.getReferences(doc, Position.create(0, 0), ast, true);

      expect(result.length).toBe(0);
    });

    it('should return empty array when cursor not on identifier', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    MyVar : Integer;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on whitespace
      const result = provider.getReferences(doc, Position.create(0, 0), ast, true);

      expect(result.length).toBe(0);
    });

    it('should handle identifiers with underscores', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    My_Var_Name : Integer;

  PROCEDURE DoSomething();
  BEGIN
    My_Var_Name := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('My_Var_Name : Integer'));
      const varCol = lines[defLineIndex].indexOf('My_Var_Name');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 5), ast, true);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle identifiers with numbers', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Var123 : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Var123 := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Var123 : Integer'));
      const varCol = lines[defLineIndex].indexOf('Var123');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 3), ast, true);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Location Accuracy', () => {
    it('should return correct line and character positions', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    TestVar : Integer;

  PROCEDURE DoSomething();
  BEGIN
    TestVar := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('TestVar : Integer'));
      const varCol = lines[defLineIndex].indexOf('TestVar');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 3), ast, true);

      // All locations should have valid positions
      for (const loc of result) {
        expect(loc.range.start.line).toBeGreaterThanOrEqual(0);
        expect(loc.range.start.character).toBeGreaterThanOrEqual(0);
        expect(loc.range.end.line).toBeGreaterThanOrEqual(loc.range.start.line);
        expect(loc.range.end.character).toBeGreaterThan(loc.range.start.character);
      }
    });

    it('should return correct URI', () => {
      const uri = 'file:///home/user/project/test.cal';
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    MyVar : Integer;

  PROCEDURE DoSomething();
  BEGIN
    MyVar := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code, uri);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('MyVar : Integer'));
      const varCol = lines[defLineIndex].indexOf('MyVar');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 2), ast, true);

      for (const loc of result) {
        expect(loc.uri).toBe(uri);
      }
    });
  });

  describe('Trigger References', () => {
    it('should find references in trigger bodies', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 }
}
CODE
  VAR
    GlobalVar : Integer;

  TRIGGER OnInsert();
  BEGIN
    GlobalVar := 1;
  END;

  TRIGGER OnModify();
  BEGIN
    GlobalVar := GlobalVar + 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('GlobalVar : Integer'));
      const varCol = lines[defLineIndex].indexOf('GlobalVar');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 5), ast, true);

      // GlobalVar: 1 definition + 3 usages in triggers
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('EXIT Statement References', () => {
    it('should find references in EXIT statements', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Result : Integer;

  PROCEDURE GetResult() : Integer;
  BEGIN
    Result := 42;
    EXIT(Result);
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Result : Integer'));
      const varCol = lines[defLineIndex].indexOf('Result');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 3), ast, true);

      // Result: 1 definition + 2 usages (assignment + EXIT)
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Array Access References', () => {
    it('should find references in array access expressions', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Index : Integer;
    Values : ARRAY[10] OF Integer;

  PROCEDURE DoSomething();
  BEGIN
    Index := 1;
    Values[Index] := 42;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Index : Integer'));
      const varCol = lines[defLineIndex].indexOf('Index');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 2), ast, true);

      // Index: 1 definition + 2 usages
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('field trigger references', () => {
    it('should find variable references inside OnValidate trigger', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 ;
                           OnValidate=BEGIN
                                        Name := 'Validated';
                                      END; }
}
CODE
  VAR
    Counter : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Name := 'Test';
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on 'Name' field definition
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Name ; Text50'));
      const nameCol = lines[defLineIndex].indexOf('Name');

      const result = provider.getReferences(doc, Position.create(defLineIndex, nameCol + 2), ast, true);

      // Name: 1 definition + usage in OnValidate + usage in procedure
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should find global variable references inside field trigger', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Amount ; Decimal ;
                              OnValidate=BEGIN
                                           Counter := Counter + 1;
                                         END; }
}
CODE
  VAR
    Counter : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Counter := 0;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Counter : Integer'));
      const varCol = lines[defLineIndex].indexOf('Counter');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 3), ast, true);

      // Counter: 1 definition + 2 usages in field trigger + 1 in procedure
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should find references inside OnLookup trigger', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; CustomerNo ; Code20 ;
                                 OnLookup=BEGIN
                                            SearchValue := CustomerNo;
                                          END; }
}
CODE
  VAR
    SearchValue : Code[20];

  PROCEDURE DoSomething();
  BEGIN
    SearchValue := '';
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('SearchValue : Code'));
      const varCol = lines[defLineIndex].indexOf('SearchValue');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 5), ast, true);

      // SearchValue: 1 definition + 1 in OnLookup + 1 in procedure
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should find references across multiple field triggers', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 ;
                           OnValidate=BEGIN
                                        GlobalVar := 1;
                                      END; }
  { 3 ;   ; Amount ; Decimal ;
                              OnValidate=BEGIN
                                           GlobalVar := GlobalVar + 1;
                                         END; }
}
CODE
  VAR
    GlobalVar : Integer;

  PROCEDURE DoSomething();
  BEGIN
    GlobalVar := 0;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('GlobalVar : Integer'));
      const varCol = lines[defLineIndex].indexOf('GlobalVar');

      const result = provider.getReferences(doc, Position.create(defLineIndex, varCol + 5), ast, true);

      // GlobalVar: 1 definition + 1 in first trigger + 2 in second trigger + 1 in procedure
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should find references with local variables in field trigger', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 ;
                           OnValidate=VAR
                                        LocalVar@1000 : Integer;
                                      BEGIN
                                        LocalVar := 1;
                                        LocalVar := LocalVar + 1;
                                      END; }
}
CODE
  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const localVarLineIndex = lines.findIndex(l => l.includes('LocalVar@1000'));

      if (localVarLineIndex >= 0) {
        const varCol = lines[localVarLineIndex].indexOf('LocalVar');

        const result = provider.getReferences(doc, Position.create(localVarLineIndex, varCol + 3), ast, true);

        // LocalVar: 1 definition + 2 usages in trigger body
        expect(result.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should find field references from usage inside field trigger', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Amount ; Decimal ;
                              OnValidate=BEGIN
                                           Amount := Amount * 2;
                                         END; }
}
CODE
  PROCEDURE DoSomething();
  BEGIN
    Amount := 100;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Find from usage inside trigger
      const lines = code.split('\n');
      const triggerLineIndex = lines.findIndex(l => l.includes('Amount := Amount * 2'));

      if (triggerLineIndex >= 0) {
        const amountCol = lines[triggerLineIndex].indexOf('Amount');

        const result = provider.getReferences(doc, Position.create(triggerLineIndex, amountCol + 3), ast, true);

        // Amount: 1 definition + 2 in trigger + 1 in procedure
        expect(result.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should find references in nested statements inside field trigger', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Status ; Option ;
                             OnValidate=BEGIN
                                          IF Status = 1 THEN
                                            Status := 2;
                                        END; }
}
CODE
  PROCEDURE DoSomething();
  BEGIN
    Status := 0;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on 'Status' field definition
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('Status ; Option'));
      const statusCol = lines[defLineIndex].indexOf('Status');

      const result = provider.getReferences(doc, Position.create(defLineIndex, statusCol + 3), ast, true);

      // Status: 1 definition + 2 in trigger (IF condition + assignment) + 1 in procedure
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle field trigger with procedure call', () => {
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 ;
                           OnValidate=BEGIN
                                        ValidateName(Name);
                                      END; }
}
CODE
  PROCEDURE ValidateName(Value : Text[50]);
  BEGIN
  END;

  PROCEDURE DoSomething();
  BEGIN
    ValidateName('Test');
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('PROCEDURE ValidateName'));
      const procCol = lines[defLineIndex].indexOf('ValidateName');

      const result = provider.getReferences(doc, Position.create(defLineIndex, procCol + 5), ast, true);

      // ValidateName: 1 definition + 1 in field trigger + 1 in procedure
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });
});
