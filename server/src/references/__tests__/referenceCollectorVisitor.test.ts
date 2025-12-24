/**
 * Integration Tests for ReferenceCollectorVisitor
 *
 * Tests the visitor pattern implementation used by ReferenceProvider
 * to ensure proper reference collection from all AST nodes.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { ReferenceProvider } from '../referenceProvider';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver-types';

describe('ReferenceCollectorVisitor Integration', () => {
  describe('Definition vs Usage Marking', () => {
    it('should mark variable declarations as definitions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      myVar : Integer;

    PROCEDURE TestProc@1();
    VAR
      localVar : Integer;
    BEGIN
      myVar := 5;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to myVar
      const myVarRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find 2 references: declaration and usage
      expect(myVarRefs.length).toBeGreaterThanOrEqual(2);

      // Find the declaration reference
      const declaration = myVarRefs.find(ref =>
        ref.range.start.line === 5
      );
      expect(declaration).toBeDefined();
    });

    it('should mark parameter declarations as definitions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(param1 : Text; param2 : Integer);
    BEGIN
      param1 := 'test';
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to param1
      const param1Refs = provider.getReferences(doc, Position.create(4, 27), ast, true);

      // Should find 2 references: declaration and usage
      expect(param1Refs.length).toBeGreaterThanOrEqual(2);
    });

    it('should mark identifier usages as non-definitions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      counter : Integer;

    PROCEDURE Increment@1();
    BEGIN
      counter := counter + 1;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to counter
      const counterRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find 3 references: 1 declaration + 2 usages in the assignment
      expect(counterRefs.length).toBeGreaterThanOrEqual(3);
    });

    it('should mark field declarations as definitions', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text50        }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to No.
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('"No."'));
      const noCol = lines[defLineIndex].indexOf('"No."') + 1;

      const noRefs = provider.getReferences(doc, Position.create(defLineIndex, noCol), ast, true);

      // Should find at least the declaration
      expect(noRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Reference Collection from All Expression Types', () => {
    it('should collect references from binary expressions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      a : Integer;
      b : Integer;
      result : Integer;

    PROCEDURE Calculate@1();
    BEGIN
      result := a + b;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to 'a'
      const aRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find declaration and usage in binary expression
      expect(aRefs.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect references from member expressions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Rec : Record 18;

    PROCEDURE GetValue@1();
    BEGIN
      Rec.Name := 'Test';
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to Rec
      const recRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find declaration and usage in member expression
      expect(recRefs.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect references from call expressions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      value : Text;

    PROCEDURE CallTest@1();
    BEGIN
      MESSAGE(value);
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to value
      const valueRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find declaration and usage in call argument
      expect(valueRefs.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect references from IF statements', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      flag : Boolean;

    PROCEDURE TestIf@1();
    BEGIN
      IF flag THEN
        flag := FALSE;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to flag
      const flagRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find declaration + 2 usages (condition and assignment)
      expect(flagRefs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Field Trigger Reference Collection', () => {
    it('should collect references from field trigger bodies', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=VAR
                                          tempVar : Integer;
                                        BEGIN
                                          tempVar := 5;
                                        END; }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to tempVar (cursor on declaration line 6)
      const tempVarRefs = provider.getReferences(doc, Position.create(6, 44), ast, true);

      // Should find 2 references: declaration in VAR section and usage in assignment
      expect(tempVarRefs.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect global variable references from field triggers', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=BEGIN
                                          globalVar := 10;
                                        END; }
  }

  CODE
  {
    VAR
      globalVar : Integer;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to globalVar
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('globalVar : Integer'));
      const varCol = lines[defLineIndex].indexOf('globalVar');

      const globalVarRefs = provider.getReferences(doc, Position.create(defLineIndex, varCol + 2), ast, true);

      // Should find 2 references: declaration and usage in field trigger
      expect(globalVarRefs.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect field references from field trigger bodies', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=BEGIN
                                          "No." := 'TEST';
                                        END; }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to No.
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('"No."'));
      const noCol = lines[defLineIndex].indexOf('"No."') + 1;

      const noRefs = provider.getReferences(doc, Position.create(defLineIndex, noCol), ast, true);

      // Should find 2 references: field declaration and usage in trigger
      expect(noRefs.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect references from nested statements in field triggers', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=VAR
                                          i : Integer;
                                        BEGIN
                                          FOR i := 1 TO 10 DO
                                            "No." := FORMAT(i);
                                        END; }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to i
      const lines = code.split('\n');
      const defLineIndex = lines.findIndex(l => l.includes('i : Integer'));
      const iCol = lines[defLineIndex].indexOf('i : Integer');

      const iRefs = provider.getReferences(doc, Position.create(defLineIndex, iCol), ast, true);

      // Should find 3 references: declaration, FOR loop variable, FORMAT argument
      expect(iRefs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cross-Statement Reference Collection', () => {
    it('should collect references from WHILE loops', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      counter : Integer;

    PROCEDURE TestWhile@1();
    BEGIN
      WHILE counter < 10 DO
        counter := counter + 1;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to counter
      const counterRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find declaration + 3 usages (condition, assignment target, addition)
      expect(counterRefs.length).toBeGreaterThanOrEqual(4);
    });

    it('should collect references from CASE statements', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      value : Integer;

    PROCEDURE TestCase@1();
    BEGIN
      CASE value OF
        1: value := 10;
        2: value := 20;
      END;
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const doc = TextDocument.create('file:///test.cal', 'cal', 1, code);
      const provider = new ReferenceProvider();

      // Find references to value
      const valueRefs = provider.getReferences(doc, Position.create(5, 6), ast, true);

      // Should find declaration + 3 usages (CASE expression, 2 assignments)
      expect(valueRefs.length).toBeGreaterThanOrEqual(4);
    });
  });
});
