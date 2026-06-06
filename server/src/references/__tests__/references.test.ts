/**
 * Tests for Find All References Provider
 */

import { ReferenceProvider } from '../referenceProvider';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../../symbols/symbolTable';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver';

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string, uri: string = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse content into AST, symbolTable, and tokens.
 * Existing callers that destructure only { ast } keep working — extra fields are ignored.
 */
function parseContent(content: string): { ast: any; symbolTable: SymbolTable; tokens: readonly any[] } {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const ast = new Parser(tokens).parse();
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return { ast, symbolTable, tokens };
}

describe('ReferenceProvider', () => {
  let provider: ReferenceProvider;

  beforeEach(() => {
    provider = new ReferenceProvider();
  });

  describe('Basic Reference Finding', () => {
    it('should find all references to a variable', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE DoSomething();
    BEGIN
      Counter := 1;
      Counter := Counter + 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
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
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; Name ; Text50 }
  }
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
      Name := 'Test';
      Name := Name + ' More';
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      MyVar : Integer;

    PROCEDURE DoSomething();
    BEGIN
      MyVar := 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE DoSomething();
    BEGIN
      Counter := 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      MyVariable : Integer;

    PROCEDURE DoSomething();
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      A : Integer;
      B : Integer;

    PROCEDURE DoSomething();
    BEGIN
      A := A + B;
      B := A - B;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Flag : Boolean;

    PROCEDURE DoSomething();
    BEGIN
      IF Flag THEN
        Flag := FALSE;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE DoSomething();
    BEGIN
      Counter := 0;
      WHILE Counter < 10 DO
        Counter := Counter + 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
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
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
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
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
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
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
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
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; CustomerName ; Text100 }
  }
  CODE
  {
    PROCEDURE DoSomething();
    VAR
      Rec : Record 50000;
    BEGIN
      Rec.CustomerName := 'Test';
      Rec.CustomerName := Rec.CustomerName + ' More';
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    PROCEDURE DoSomething();
    VAR
      LocalVar : Integer;
    BEGIN
      LocalVar := 1;
      LocalVar := LocalVar + 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    PROCEDURE DoSomething(Param : Integer);
    BEGIN
      Param := Param + 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      MyVar : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      // Position cursor on whitespace
      const result = provider.getReferences(doc, Position.create(0, 0), ast, true);

      expect(result.length).toBe(0);
    });

    it('should handle identifiers with underscores', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      My_Var_Name : Integer;

    PROCEDURE DoSomething();
    BEGIN
      My_Var_Name := 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Var123 : Integer;

    PROCEDURE DoSomething();
    BEGIN
      Var123 := 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      TestVar : Integer;

    PROCEDURE DoSomething();
    BEGIN
      TestVar := 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      MyVar : Integer;

    PROCEDURE DoSomething();
    BEGIN
      MyVar := 1;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; Name ; Text50 }
  }
  CODE
  {
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
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Result : Integer;

    PROCEDURE GetResult() : Integer;
    BEGIN
      Result := 42;
      EXIT(Result);
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
  }
  CODE
  {
    VAR
      Index : Integer;
      Values : ARRAY[10] OF Integer;

    PROCEDURE DoSomething();
    BEGIN
      Index := 1;
      Values[Index] := 42;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; Name ; Text50 ;
                             OnValidate=BEGIN
                                          Name := 'Validated';
                                        END; }
  }
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE DoSomething();
    BEGIN
      Name := 'Test';
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; Amount ; Decimal ;
                                OnValidate=BEGIN
                                             Counter := Counter + 1;
                                           END; }
  }
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE DoSomething();
    BEGIN
      Counter := 0;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; CustomerNo ; Code20 ;
                                   OnLookup=BEGIN
                                              SearchValue := CustomerNo;
                                            END; }
  }
  CODE
  {
    VAR
      SearchValue : Code[20];

    PROCEDURE DoSomething();
    BEGIN
      SearchValue := '';
    END;

    BEGIN
    END.
  }
}`;
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
{
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
  {
    VAR
      GlobalVar : Integer;

    PROCEDURE DoSomething();
    BEGIN
      GlobalVar := 0;
    END;

    BEGIN
    END.
  }
}`;
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
{
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
  {
    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; Amount ; Decimal ;
                                OnValidate=BEGIN
                                             Amount := Amount * 2;
                                           END; }
  }
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
      Amount := 100;
    END;

    BEGIN
    END.
  }
}`;
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
{
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
  {
    PROCEDURE DoSomething();
    BEGIN
      Status := 0;
    END;

    BEGIN
    END.
  }
}`;
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
{
  FIELDS
  {
    { 1 ;   ; No ; Code10 }
    { 2 ;   ; Name ; Text50 ;
                             OnValidate=BEGIN
                                          ValidateName(Name);
                                        END; }
  }
  CODE
  {
    PROCEDURE ValidateName(Value : Text[50]);
    BEGIN
    END;

    PROCEDURE DoSomething();
    BEGIN
      ValidateName('Test');
    END;

    BEGIN
    END.
  }
}`;
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

  // ---------------------------------------------------------------------------
  // Scope-isolation tests (issue #786)
  // All tests in this block MUST pass symbolTable and tokens to getReferences()
  // to exercise the identity-aware filter path.
  // ---------------------------------------------------------------------------
  describe('Scope-Isolation (identity-aware, #786)', () => {
    it('should return only ProcA occurrences when positioned on ProcA Counter', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 SiblingScopeTest
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

      // Position on ProcA's local Counter declaration
      const lines = code.split('\n');
      const procADeclLine = lines.findIndex(l => l.includes('Counter@1000 : Integer'));
      expect(procADeclLine).toBeGreaterThan(-1);
      const col = lines[procADeclLine].indexOf('Counter');

      const result = provider.getReferences(
        doc, Position.create(procADeclLine, col + 3), ast, true, symbolTable, tokens
      );

      // Must include ProcA declaration + uses; must EXCLUDE ProcB Counter
      expect(result.length).toBeGreaterThanOrEqual(1);

      // ProcB's Counter := 20 is on the line after "Counter@1000" for ProcB
      const procBUseLine = lines.findIndex(l => l.includes('Counter := 20'));
      expect(procBUseLine).toBeGreaterThan(-1);
      const procBUseResults = result.filter(loc => loc.range.start.line === procBUseLine);
      expect(procBUseResults.length).toBe(0);
    });

    it('should return only ProcB occurrences when positioned on ProcB Counter', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 SiblingScopeTest
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
      Counter := Counter + 5;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');
      // The SECOND occurrence of "Counter@1000 : Integer" is ProcB's declaration
      const allDeclLines = lines
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.includes('Counter@1000 : Integer'));
      expect(allDeclLines.length).toBe(2);
      const procBDeclLine = allDeclLines[1].i;
      const col = lines[procBDeclLine].indexOf('Counter');

      const result = provider.getReferences(
        doc, Position.create(procBDeclLine, col + 3), ast, true, symbolTable, tokens
      );

      // ProcA usage must NOT appear
      const procAUseLine = lines.findIndex(l => l.includes('Counter := 10'));
      expect(procAUseLine).toBeGreaterThan(-1);
      const procAResults = result.filter(loc => loc.range.start.line === procAUseLine);
      expect(procAResults.length).toBe(0);

      // ProcB usage must appear
      const procBUseLine = lines.findIndex(l => l.includes('Counter := 20'));
      expect(procBUseLine).toBeGreaterThan(-1);
      const procBResults = result.filter(loc => loc.range.start.line === procBUseLine);
      expect(procBResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should return only local scope occurrences when positioned on shadowing local', () => {
      // Local Counter in ProcA shadows the global Counter.
      // References on the LOCAL returns only the local's scope occurrences.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 ShadowTest
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
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');
      const localDeclLine = lines.findIndex(l => l.includes('Counter@1000 : Integer'));
      expect(localDeclLine).toBeGreaterThan(-1);
      const col = lines[localDeclLine].indexOf('Counter');

      const result = provider.getReferences(
        doc, Position.create(localDeclLine, col + 3), ast, true, symbolTable, tokens
      );

      // ProcB usage (global Counter := 1) must NOT appear
      const procBUseLine = lines.findIndex(l => l.includes('Counter := 1'));
      expect(procBUseLine).toBeGreaterThan(-1);
      const globalInProcB = result.filter(loc => loc.range.start.line === procBUseLine);
      expect(globalInProcB.length).toBe(0);

      // The local usage (Counter := 99) must appear
      const localUseLine = lines.findIndex(l => l.includes('Counter := 99'));
      expect(localUseLine).toBeGreaterThan(-1);
      const localUse = result.filter(loc => loc.range.start.line === localUseLine);
      expect(localUse.length).toBeGreaterThanOrEqual(1);
    });

    it('should exclude shadowed uses when positioned on global Counter (asymmetric)', () => {
      // References on the GLOBAL Counter must EXCLUDE uses inside ProcA that are
      // shadowed by the local. This is the direction most likely to be missed.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 ShadowAsymTest
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
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');
      // Global Counter declaration: "Counter : Integer;" (no @ number)
      const globalDeclLine = lines.findIndex(l => l.includes('Counter : Integer') && !l.includes('@'));
      expect(globalDeclLine).toBeGreaterThan(-1);
      const col = lines[globalDeclLine].indexOf('Counter');

      const result = provider.getReferences(
        doc, Position.create(globalDeclLine, col + 3), ast, true, symbolTable, tokens
      );

      // "Counter := 99" inside ProcA is the SHADOWED use — must be excluded
      const shadowedUseLine = lines.findIndex(l => l.includes('Counter := 99'));
      expect(shadowedUseLine).toBeGreaterThan(-1);
      const shadowedResults = result.filter(loc => loc.range.start.line === shadowedUseLine);
      expect(shadowedResults.length).toBe(0);

      // "Counter := 1" inside ProcB references the GLOBAL — must be included
      const globalUseLine = lines.findIndex(l => l.includes('Counter := 1'));
      expect(globalUseLine).toBeGreaterThan(-1);
      const globalResults = result.filter(loc => loc.range.start.line === globalUseLine);
      expect(globalResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty when includeDeclaration is false and local is never used', () => {
      const code = `OBJECT Codeunit 50000 UnusedLocalTest
{
  CODE
  {
    PROCEDURE ProcB@2();
    VAR
      Employee@1000 : Record 18;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');
      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, false, symbolTable, tokens
      );

      expect(result).toHaveLength(0);
    });

    it('should keep member-access property occurrence for a Record variable', () => {
      // An object with a Record variable Cust and a use Cust."No."
      // References on Cust must keep the Cust."No." member occurrence (the object
      // reference is not a property and must NOT be dropped).
      const code = `OBJECT Codeunit 50000 MemberAccessTest
{
  CODE
  {
    VAR
      Cust@1000 : Record 18;

    PROCEDURE ProcA@1();
    BEGIN
      Cust.FIND;
      IF Cust."No." = '' THEN
        Cust.INIT;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');
      const declLine = lines.findIndex(l => l.includes('Cust@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Cust');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 2), ast, true, symbolTable, tokens
      );

      // The "Cust" in "Cust."No."" must appear in the result set
      const memberLine = lines.findIndex(l => l.includes('Cust."No."'));
      expect(memberLine).toBeGreaterThan(-1);
      const memberOccurrences = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberOccurrences.length).toBeGreaterThanOrEqual(1);
    });

    it('should include bare procedure call in references for a PROCEDURE declaration', () => {
      const code = `OBJECT Codeunit 50000 BareCallTest
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

      const lines = code.split('\n');
      const declLine = lines.findIndex(l => l.includes('PROCEDURE DoWork@1'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('DoWork');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );

      // The bare "DoWork;" call must appear
      const bareCallLine = lines.findIndex(l => l.trim() === 'DoWork;');
      expect(bareCallLine).toBeGreaterThan(-1);
      const bareCallResults = result.filter(loc => loc.range.start.line === bareCallLine);
      expect(bareCallResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should include declaration occurrence when positioned on quoted declaration', () => {
      // A quoted declaration with uses. References positioned on the quoted declaration
      // must return a non-empty set INCLUDING the declaration's own occurrence.
      // This proves the identity is compared as the resolved declaration-token offset,
      // not the inside-quote cursor offset.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 QuotedTest
{
  CODE
  {
    PROCEDURE "My Proc"@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      "My Proc";
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');
      const declLine = lines.findIndex(l => l.includes('PROCEDURE "My Proc"'));
      expect(declLine).toBeGreaterThan(-1);
      // Position cursor inside the quoted identifier (on the 'M')
      const quoteStart = lines[declLine].indexOf('"My Proc"');
      const col = quoteStart + 1; // inside the quotes

      const result = provider.getReferences(
        doc, Position.create(declLine, col), ast, true, symbolTable, tokens
      );

      // Must return at least the declaration and one usage
      expect(result.length).toBeGreaterThanOrEqual(1);

      // The declaration line must be in the result set
      const declResults = result.filter(loc => loc.range.start.line === declLine);
      expect(declResults.length).toBeGreaterThanOrEqual(1);
    });

    it('delta proof: WITH symbolTable result is strictly smaller than WITHOUT (name-only fallback)', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 DeltaProofTest
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

      const lines = code.split('\n');
      // Position on ProcB's Counter declaration
      const allDeclLines = lines
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.includes('Counter@1000 : Integer'));
      expect(allDeclLines.length).toBe(2);
      const procBDeclLine = allDeclLines[1].i;
      const col = lines[procBDeclLine].indexOf('Counter');
      const pos = Position.create(procBDeclLine, col + 3);

      // Legacy name-only (no symbolTable)
      const legacyResult = provider.getReferences(doc, pos, ast, false);

      // Scope-aware (with symbolTable and tokens)
      const scopedResult = provider.getReferences(doc, pos, ast, false, symbolTable, tokens);

      // The scoped result must be strictly smaller than the legacy result
      expect(scopedResult.length).toBeLessThan(legacyResult.length);
    });

    it('no-symbolTable fallback returns legacy name-only (over-count) result', () => {
      // Characterizes the permissive fallback: when no symbolTable is passed,
      // the provider returns ALL name-matches across the document.
      // This intentionally asserts present legacy behavior.
      const code = `OBJECT Codeunit 50000 FallbackTest
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
      const { ast } = parseContent(code);

      const lines = code.split('\n');
      const declLine = lines.findIndex(l => l.includes('Counter@1000 : Integer'));
      const col = lines[declLine].indexOf('Counter');

      // No symbolTable — legacy path
      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, false
      );

      // Both procedures' Counter usages appear (over-count)
      const procAUseLine = lines.findIndex(l => l.includes('Counter := 10'));
      const procBUseLine = lines.findIndex(l => l.includes('Counter := 20'));
      const procAResults = result.filter(loc => loc.range.start.line === procAUseLine);
      const procBResults = result.filter(loc => loc.range.start.line === procBUseLine);
      expect(procAResults.length).toBeGreaterThanOrEqual(1);
      expect(procBResults.length).toBeGreaterThanOrEqual(1);
    });

    it('#791: member property of another record is NOT counted as a same-named local', () => {
      // Asserts the corrected behavior after #791.
      // Scenario: ProcA has an unused local Employee (Record 18) AND SomeRec.Employee is a
      // member-property access on a different record. The member-property must NOT be counted
      // as a reference to the local variable.
      const code = `OBJECT Codeunit 50000 Residual791Test
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

      const lines = code.split('\n');
      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      // includeDeclaration=true so the declaration itself is counted
      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );

      // Anti-vacuous: the declaration line must be in the result (proves getReferences
      // isn't returning [] due to an unrelated failure)
      const declResults = result.filter(loc => loc.range.start.line === declLine);
      expect(declResults.length).toBeGreaterThanOrEqual(1);

      // The member-property "SomeRec.Employee" must NOT be counted as a reference to the local
      const memberLine = lines.findIndex(l => l.includes('SomeRec.Employee'));
      expect(memberLine).toBeGreaterThan(-1);
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBe(0);
    });
  });

  describe('#791 member-property scope-awareness', () => {
    // B1: VARIABLE origin (canonical) — standalone version of the oracle
    it('B1: variable origin: SomeRec.Employee member-property is NOT counted for a same-named local', () => {
      const code = `OBJECT Codeunit 50000 B1Test
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
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );

      // Declaration line must be present (anti-vacuous)
      const declResults = result.filter(loc => loc.range.start.line === declLine);
      expect(declResults.length).toBeGreaterThanOrEqual(1);

      // Member-property line must NOT be counted
      const memberLine = lines.findIndex(l => l.includes('SomeRec.Employee'));
      expect(memberLine).toBeGreaterThan(-1);
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBe(0);
    });

    // B2: PARAMETER origin
    it('B2: parameter origin: SomeRec.Employee member-property is NOT counted for a same-named parameter', () => {
      const code = `OBJECT Codeunit 50000 B2Test
{
  CODE
  {
    VAR
      SomeRec@1000 : Record 50000;

    PROCEDURE ProcA@1(Employee@1000 : Record 18);
    BEGIN
      SomeRec.Employee := 0;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const paramLine = lines.findIndex(l => l.includes('PROCEDURE ProcA@1(Employee@1000'));
      expect(paramLine).toBeGreaterThan(-1);
      const col = lines[paramLine].indexOf('Employee@1000');
      // Position cursor on 'Employee' inside the parameter list
      const result = provider.getReferences(
        doc, Position.create(paramLine, col + 3), ast, true, symbolTable, tokens
      );

      // Anti-vacuous: parameter declaration must be counted
      const paramResults = result.filter(loc => loc.range.start.line === paramLine);
      expect(paramResults.length).toBeGreaterThanOrEqual(1);

      // Member-property line must NOT be counted
      const memberLine = lines.findIndex(l => l.includes('SomeRec.Employee'));
      expect(memberLine).toBeGreaterThan(-1);
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBe(0);
    });

    // B3: FIELD/MEMBER origin (unresolved branch — highest-risk regression)
    // When the origin is itself a member-property (field), the permissive keepUnresolved:true
    // path keeps all member-property occurrences of the same name. This must NOT be broken.
    it('B3: field/member origin: member-property uses are KEPT (permissive unresolved path)', () => {
      const code = `OBJECT Codeunit 50000 B3Test
{
  CODE
  {
    VAR
      Rec@1000 : Record 18;

    PROCEDURE ProcA@1();
    BEGIN
      Rec.Amount := 1;
      Rec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      // Position cursor on 'Amount' in the first Rec.Amount occurrence
      const firstAmountLine = lines.findIndex(l => l.includes('Rec.Amount := 1'));
      expect(firstAmountLine).toBeGreaterThan(-1);
      const lineText = lines[firstAmountLine];
      const dotIdx = lineText.indexOf('Rec.Amount');
      const amountCol = dotIdx + 'Rec.'.length; // column of 'Amount'

      const result = provider.getReferences(
        doc, Position.create(firstAmountLine, amountCol + 2), ast, true, symbolTable, tokens
      );

      // Both Amount member uses should be counted (field/member origin keeps all)
      const secondAmountLine = lines.findIndex(l => l.includes('Rec.Amount := 2'));
      expect(secondAmountLine).toBeGreaterThan(-1);
      const secondAmountResults = result.filter(loc => loc.range.start.line === secondAmountLine);
      expect(secondAmountResults.length).toBeGreaterThanOrEqual(1);
    });

    // B4: PROCEDURE origin (load-bearing inverse — member-call on object must be KEPT)
    it('B4: procedure origin: member-call occurrences are KEPT (not dropped by member-property filter)', () => {
      // SomeCdu.DoIt — the property 'DoIt' shares the name with the procedure declaration.
      // If the property does not resolve to the procedure (single-file), the permissive
      // keepUnresolved:true path keeps it. Either way, it must be counted.
      const code = `OBJECT Codeunit 50000 B4Test
{
  CODE
  {
    VAR
      SomeCdu@1000 : Codeunit 50001;

    PROCEDURE DoIt@1();
    BEGIN
    END;

    PROCEDURE Main@2();
    BEGIN
      SomeCdu.DoIt;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('PROCEDURE DoIt@1'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('DoIt');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 2), ast, true, symbolTable, tokens
      );

      // The member-call SomeCdu.DoIt must be counted for the procedure origin.
      // (Resolution path: either resolves to procedure → counted, or unresolved → kept by permissive path.)
      const memberCallLine = lines.findIndex(l => l.includes('SomeCdu.DoIt'));
      expect(memberCallLine).toBeGreaterThan(-1);
      const memberCallResults = result.filter(loc => loc.range.start.line === memberCallLine);
      expect(memberCallResults.length).toBeGreaterThanOrEqual(1);
    });

    // B5: Object side of member expression — real use of local, must be KEPT
    it('B5: object-side of member expression IS counted for a local variable origin', () => {
      // Employee.Name := 'x' — here Employee is the OBJECT side of the member access.
      // This is a genuine use of the local variable and must NOT be dropped.
      const code = `OBJECT Codeunit 50000 B5Test
{
  CODE
  {
    PROCEDURE ProcA@1();
    VAR
      Employee@1000 : Record 18;
    BEGIN
      Employee.Name := 'x';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );

      // Employee.Name line: Employee is the object, must be counted
      const useLine = lines.findIndex(l => l.includes("Employee.Name := 'x'"));
      expect(useLine).toBeGreaterThan(-1);
      const useResults = result.filter(loc => loc.range.start.line === useLine);
      expect(useResults.length).toBeGreaterThanOrEqual(1);
    });

    // B6: Nested A.B.C — local B must not be counted at its property position
    it('B6: nested A.B.C — local B is NOT counted at the property position, but IS counted at its real use', () => {
      // A is a global Record. Body: A.B.C := 0 (B is a member-property of A) and B := 1 (real local use).
      // Origin = local B (Integer). The A.B.C line should not count B at the property position.
      const code = `OBJECT Codeunit 50000 B6Test
{
  CODE
  {
    VAR
      A@1000 : Record 50000;

    PROCEDURE ProcA@1();
    VAR
      B@1000 : Integer;
    BEGIN
      A.B.C := 0;
      B := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('B@1000 : Integer'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('B');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 1), ast, true, symbolTable, tokens
      );

      // Real local use B := 1 must be counted
      const realUseLine = lines.findIndex(l => l.trim() === 'B := 1;');
      expect(realUseLine).toBeGreaterThan(-1);
      const realUseResults = result.filter(loc => loc.range.start.line === realUseLine);
      expect(realUseResults.length).toBeGreaterThanOrEqual(1);

      // A.B.C line: B at the member-property position must NOT be counted for the local B origin
      const nestedLine = lines.findIndex(l => l.includes('A.B.C := 0'));
      expect(nestedLine).toBeGreaterThan(-1);
      const nestedResults = result.filter(loc => loc.range.start.line === nestedLine);
      expect(nestedResults.length).toBe(0);
    });

    // B7: includeDeclaration=false — unused local + member: total must be 0
    it('B7: includeDeclaration=false — unused local + member-only line yields 0 total results', () => {
      const code = `OBJECT Codeunit 50000 B7Test
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
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, false, symbolTable, tokens
      );

      // No declaration + no member = genuinely unused
      expect(result.length).toBe(0);
    });

    // B8: Cursor ON member-property — must be counted (dual-bug guard)
    it('B8: cursor on member-property: the clicked occurrence IS counted (dual-bug guard)', () => {
      // Both a global SomeRec : Record 50000 and a local Employee : Record 18 exist.
      // Body: SomeRec.Employee := 0.
      // When cursor is ON the "Employee" inside SomeRec.Employee, the result must
      // include that line (clicking a member-property must not return empty).
      const code = `OBJECT Codeunit 50000 B8Test
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
      const lines = code.split('\n');

      const memberLine = lines.findIndex(l => l.includes('SomeRec.Employee'));
      expect(memberLine).toBeGreaterThan(-1);
      const lineText = lines[memberLine];
      const dotIdx = lineText.indexOf('SomeRec.Employee');
      const employeeCol = dotIdx + 'SomeRec.'.length; // cursor on 'Employee' property

      const result = provider.getReferences(
        doc, Position.create(memberLine, employeeCol + 3), ast, true, symbolTable, tokens
      );

      // The clicked member-property occurrence must be in the result
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBeGreaterThanOrEqual(1);
    });

    // B9: local-shadows-field collision — local Amount, SomeRec.Amount member
    it('B9: local Amount with SomeRec.Amount member — local real use counted, member-property NOT counted', () => {
      const code = `OBJECT Codeunit 50000 B9Test
{
  CODE
  {
    VAR
      SomeRec@1000 : Record 18;

    PROCEDURE ProcA@1();
    VAR
      Amount@1000 : Decimal;
    BEGIN
      Amount := 1;
      SomeRec.Amount := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Amount@1000 : Decimal'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Amount');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );

      // Real local use must be counted
      const realUseLine = lines.findIndex(l => l.trim() === 'Amount := 1;');
      expect(realUseLine).toBeGreaterThan(-1);
      const realUseResults = result.filter(loc => loc.range.start.line === realUseLine);
      expect(realUseResults.length).toBeGreaterThanOrEqual(1);

      // Member-property use must NOT be counted for the local origin
      const memberLine = lines.findIndex(l => l.includes('SomeRec.Amount := 2'));
      expect(memberLine).toBeGreaterThan(-1);
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBe(0);
    });

    // B10: Option value collision — local Open, Status::Open option value
    it('B10: local Open with Status::Open option value — real local use counted, option member NOT counted', () => {
      // Status::Open — "Open" is a member-property of the option set literal (MemberExpression.property).
      // The local variable Open must not be counted at the Status::Open position.
      const code = `OBJECT Codeunit 50000 B10Test
{
  CODE
  {
    VAR
      Status@1000 : Option;

    PROCEDURE ProcA@1();
    VAR
      Open@1000 : Boolean;
    BEGIN
      Open := TRUE;
      Status := Status::Open;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Open@1000 : Boolean'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Open');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 2), ast, true, symbolTable, tokens
      );

      // Real local use must be counted
      const realUseLine = lines.findIndex(l => l.trim() === 'Open := TRUE;');
      expect(realUseLine).toBeGreaterThan(-1);
      const realUseResults = result.filter(loc => loc.range.start.line === realUseLine);
      expect(realUseResults.length).toBeGreaterThanOrEqual(1);

      // Status::Open option value must NOT be counted for the local Open origin
      const optionLine = lines.findIndex(l => l.includes('Status::Open'));
      expect(optionLine).toBeGreaterThan(-1);
      const optionResults = result.filter(loc => loc.range.start.line === optionLine);
      expect(optionResults.length).toBe(0);
    });

    // B11: Quoted member property for FIELD origin — must be counted
    it('B11: quoted member property Rec."No." is counted when origin is the member-property itself', () => {
      const code = `OBJECT Codeunit 50000 B11Test
{
  CODE
  {
    VAR
      Rec@1000 : Record 18;

    PROCEDURE ProcA@1();
    BEGIN
      Rec."No." := 'x';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      // Position cursor ON the "No." member-property (inside the quotes)
      const memberLine = lines.findIndex(l => l.includes('Rec."No."'));
      expect(memberLine).toBeGreaterThan(-1);
      const lineText = lines[memberLine];
      const dotIdx = lineText.indexOf('Rec."No."');
      const quoteStart = dotIdx + 'Rec.'.length; // start of '"No."'
      const insideQuoteCol = quoteStart + 1; // cursor inside the quotes on 'N'

      const result = provider.getReferences(
        doc, Position.create(memberLine, insideQuoteCol), ast, true, symbolTable, tokens
      );

      // The member-property must be counted (field/member origin)
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBeGreaterThanOrEqual(1);
    });

    // B12: Quoted clicked-property fail-safe pin
    it('B12: quoted cursor on Rec."No." (no same-named local) — occurrence is counted (pin)', () => {
      // Pins quoted-cursor member-property behavior; see #791 follow-up on
      // getWordAtPosition offset alignment.
      const code = `OBJECT Codeunit 50000 B12Test
{
  CODE
  {
    VAR
      Rec@1000 : Record 18;

    PROCEDURE ProcA@1();
    BEGIN
      Rec."No." := 'ABC';
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const memberLine = lines.findIndex(l => l.includes('Rec."No."'));
      expect(memberLine).toBeGreaterThan(-1);
      const lineText = lines[memberLine];
      const dotIdx = lineText.indexOf('"No."');
      const insideQuoteCol = dotIdx + 1; // cursor inside the quotes

      const result = provider.getReferences(
        doc, Position.create(memberLine, insideQuoteCol), ast, true, symbolTable, tokens
      );

      // The occurrence must be returned (not dropped)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    // B13: Global variable collision — same as B1 but with a global variable
    it('B13: global variable origin: SomeRec.Employee member-property is NOT counted for a same-named global', () => {
      // The drop is keyed on kind='variable', not local vs global scope distinction.
      const code = `OBJECT Codeunit 50000 B13Test
{
  CODE
  {
    VAR
      Employee@1000 : Record 18;
      SomeRec@1001 : Record 50000;

    PROCEDURE ProcA@1();
    BEGIN
      SomeRec.Employee := 0;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );

      // Declaration must be present (anti-vacuous)
      const declResults = result.filter(loc => loc.range.start.line === declLine);
      expect(declResults.length).toBeGreaterThanOrEqual(1);

      // Member-property must NOT be counted
      const memberLine = lines.findIndex(l => l.includes('SomeRec.Employee'));
      expect(memberLine).toBeGreaterThan(-1);
      const memberResults = result.filter(loc => loc.range.start.line === memberLine);
      expect(memberResults.length).toBe(0);
    });

    // B14: Error recovery — malformed trailing-dot must not throw
    it('B14: malformed trailing dot does not throw and returns an array', () => {
      const code = `OBJECT Codeunit 50000 B14Test
{
  CODE
  {
    VAR
      SomeRec@1000 : Record 50000;

    PROCEDURE ProcA@1();
    VAR
      Employee@1000 : Record 18;
    BEGIN
      SomeRec.
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);
      const lines = code.split('\n');

      const declLine = lines.findIndex(l => l.includes('Employee@1000 : Record 18'));
      expect(declLine).toBeGreaterThan(-1);
      const col = lines[declLine].indexOf('Employee');

      expect(() => {
        provider.getReferences(
          doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
        );
      }).not.toThrow();

      const result = provider.getReferences(
        doc, Position.create(declLine, col + 3), ast, true, symbolTable, tokens
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // WITH-bare field reference isolation tests (issue #790)
  // A WITH-bare identifier (e.g. "Qty" inside "WITH Rec DO BEGIN Qty := 2 END")
  // resolves to the FIELD of the WITH'd record, not any same-named local/global.
  // After the fix, getSymbolAtOffset returns kind:'field' for the WITH-bare use,
  // so it is bound to the FIELD identity — not the local's identity.
  // ---------------------------------------------------------------------------
  describe('#790 WITH-bare field reference isolation', () => {
    it('T7: clicking same-named LOCAL does not count the WITH-bare field use', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Table 50002 WithFieldLocal50002
{
  FIELDS
  {
    { 1   ;   ;Qty                 ;Integer       }
    { 2   ;   ;LineNo              ;Integer       }
  }
  CODE
  {
    PROCEDURE CalcTotal@1();
    VAR
      Qty@1000 : Integer;
      Rec2@1001 : Record 50002;
    BEGIN
      Qty := 99;
      WITH Rec2 DO BEGIN
        Qty := 2;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');

      // Position cursor on the LOCAL Qty declaration (unique: has @1000)
      const localDeclLine = lines.findIndex(l => l.includes('Qty@1000 : Integer'));
      expect(localDeclLine).toBeGreaterThan(-1);
      const col = lines[localDeclLine].indexOf('Qty');

      const result = provider.getReferences(
        doc, Position.create(localDeclLine, col + 2), ast, true, symbolTable, tokens
      );

      // Anti-vacuous: the local's genuine use (Qty := 99) must appear
      const genuineUseLine = lines.findIndex(l => l.includes('Qty := 99'));
      expect(genuineUseLine).toBeGreaterThan(-1);
      const genuineUseResults = result.filter(loc => loc.range.start.line === genuineUseLine);
      expect(genuineUseResults.length).toBeGreaterThanOrEqual(1);

      // The WITH-bare use (Qty := 2) must NOT appear — it resolves to the FIELD, not the local
      const withBareLine = lines.findIndex(l => l.includes('Qty := 2'));
      expect(withBareLine).toBeGreaterThan(-1);
      const withBareResults = result.filter(loc => loc.range.start.line === withBareLine);
      expect(withBareResults.length).toBe(0);
    });

    it('T8: clicking the FIELD unifies both WITH-bare uses under the field identity', () => {
      // Same-named local Qty shadows the field inside the procedure.
      // Without the fix, WITH-bare Qty resolves to the LOCAL (identity mismatch with field),
      // so clicking the FIELD misses both WITH-bare uses.
      // After the fix, WITH-bare Qty resolves to the FIELD (WITH scope injection),
      // so clicking the FIELD includes both WITH-bare uses.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Table 50003 WithFieldForward50003
{
  FIELDS
  {
    { 1   ;   ;Qty                 ;Integer       }
    { 2   ;   ;LineNo              ;Integer       }
  }
  CODE
  {
    PROCEDURE SumUp@1();
    VAR
      Qty@1000 : Integer;
      Rec2@1001 : Record 50003;
    BEGIN
      WITH Rec2 DO BEGIN
        Qty := 3;
      END;
      WITH Rec2 DO BEGIN
        Qty := 7;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, symbolTable, tokens } = parseContent(code);

      const lines = code.split('\n');

      // Position cursor on the FIELD declaration line (has spaces + ;Integer, no @)
      const fieldDeclLine = lines.findIndex(l => l.includes('Qty                 ;Integer'));
      expect(fieldDeclLine).toBeGreaterThan(-1);
      const col = lines[fieldDeclLine].indexOf('Qty');

      const result = provider.getReferences(
        doc, Position.create(fieldDeclLine, col + 2), ast, true, symbolTable, tokens
      );

      // Anti-vacuous: the field declaration itself must be included
      const fieldDeclResults = result.filter(loc => loc.range.start.line === fieldDeclLine);
      expect(fieldDeclResults.length).toBeGreaterThanOrEqual(1);

      // Both WITH-bare uses must be present in the result set
      const firstWithBareLine = lines.findIndex(l => l.includes('Qty := 3'));
      expect(firstWithBareLine).toBeGreaterThan(-1);
      const firstWithBareResults = result.filter(loc => loc.range.start.line === firstWithBareLine);
      expect(firstWithBareResults.length).toBeGreaterThanOrEqual(1);

      const secondWithBareLine = lines.findIndex(l => l.includes('Qty := 7'));
      expect(secondWithBareLine).toBeGreaterThan(-1);
      const secondWithBareResults = result.filter(loc => loc.range.start.line === secondWithBareLine);
      expect(secondWithBareResults.length).toBeGreaterThanOrEqual(1);

      // Exact membership: result must contain exactly 3 locations
      // (field decl + first WITH-bare use + second WITH-bare use).
      // The local Qty@1000 declaration and any local uses must NOT appear.
      expect(result.length).toBe(3);
    });
  });
});
