/**
 * Cross-File Tests
 *
 * Tests for multi-file language features in C/AL Language Server.
 * Validates cross-file symbol resolution and inter-document references
 * including Codeunit-to-Codeunit calls, Table relationships, and
 * Page-to-Table field bindings.
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { SymbolTable } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';

/**
 * Represents a parsed document with all associated data
 */
interface ParsedDocument {
  textDoc: TextDocument;
  ast: CALDocument;
  symbolTable: SymbolTable;
}

/**
 * Context for multi-document test scenarios
 * Maps URIs to their parsed documents for cross-file testing
 */
interface MultiDocumentContext {
  documents: Map<string, ParsedDocument>;
}

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string, uri: string = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse content and build symbol table
 */
function parseAndBuildSymbols(content: string): { ast: CALDocument; symbolTable: SymbolTable } {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return { ast, symbolTable };
}

/**
 * Create a multi-document context for cross-file testing
 * Parses all provided files and builds their symbol tables
 */
function createMultiDocumentContext(files: { uri: string; content: string }[]): MultiDocumentContext {
  const documents = new Map<string, ParsedDocument>();

  for (const file of files) {
    const textDoc = TextDocument.create(file.uri, 'cal', 1, file.content);
    const lexer = new Lexer(file.content);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    documents.set(file.uri, { textDoc, ast, symbolTable });
  }

  return { documents };
}

/**
 * Get a document from context by URI
 */
function getDocument(context: MultiDocumentContext, uri: string): ParsedDocument | undefined {
  return context.documents.get(uri);
}

/**
 * Find a symbol across all documents in the context
 * Returns the first matching symbol and its source URI
 */
function findSymbolInContext(
  context: MultiDocumentContext,
  symbolName: string
): { symbol: ReturnType<SymbolTable['getSymbol']>; uri: string } | undefined {
  for (const [uri, doc] of context.documents) {
    const symbol = doc.symbolTable.getSymbol(symbolName);
    if (symbol) {
      return { symbol, uri };
    }
  }
  return undefined;
}

/**
 * Get all symbols from all documents in the context
 */
function getAllSymbolsInContext(
  context: MultiDocumentContext
): { symbol: ReturnType<SymbolTable['getSymbol']>; uri: string }[] {
  const allSymbols: { symbol: ReturnType<SymbolTable['getSymbol']>; uri: string }[] = [];

  for (const [uri, doc] of context.documents) {
    for (const symbol of doc.symbolTable.getAllSymbols()) {
      allSymbols.push({ symbol, uri });
    }
  }

  return allSymbols;
}

describe('Cross-File Test Infrastructure', () => {
  describe('Multi-Document Context Helpers', () => {
    it('should create a multi-document context with multiple files', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///table.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`
        },
        {
          uri: 'file:///codeunit.cal',
          content: `OBJECT Codeunit 50000 CustomerMgmt
{
  CODE
  {
    PROCEDURE DoSomething@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      expect(context.documents.size).toBe(2);
      expect(context.documents.has('file:///table.cal')).toBe(true);
      expect(context.documents.has('file:///codeunit.cal')).toBe(true);
    });

    it('should build symbol tables for each document', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///table.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///table.cal');
      expect(tableDoc).toBeDefined();
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Name')).toBe(true);
    });

    it('should allow querying symbols across documents', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunit1.cal',
          content: `OBJECT Codeunit 50000 Helper
{
  CODE
  {
    PROCEDURE CalculateTotal@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///codeunit2.cal',
          content: `OBJECT Codeunit 50001 Processor
{
  CODE
  {
    PROCEDURE ProcessOrder@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Find symbol from first codeunit
      const calcTotal = findSymbolInContext(context, 'CalculateTotal');
      expect(calcTotal).toBeDefined();
      expect(calcTotal?.uri).toBe('file:///codeunit1.cal');
      expect(calcTotal?.symbol?.kind).toBe('procedure');

      // Find symbol from second codeunit
      const processOrder = findSymbolInContext(context, 'ProcessOrder');
      expect(processOrder).toBeDefined();
      expect(processOrder?.uri).toBe('file:///codeunit2.cal');
      expect(processOrder?.symbol?.kind).toBe('procedure');
    });

    it('should handle empty files gracefully', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///empty.cal',
          content: ''
        }
      ]);

      const emptyDoc = getDocument(context, 'file:///empty.cal');
      expect(emptyDoc).toBeDefined();
      expect(emptyDoc?.symbolTable.getAllSymbols()).toEqual([]);
    });

    it('should get all symbols from all documents', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///table.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`
        },
        {
          uri: 'file:///codeunit.cal',
          content: `OBJECT Codeunit 50000 CustomerMgmt
{
  CODE
  {
    PROCEDURE DoSomething@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const allSymbols = getAllSymbolsInContext(context);
      expect(allSymbols.length).toBe(2);

      const symbolNames = allSymbols.map(s => s.symbol?.name);
      expect(symbolNames).toContain('No.');  // Original case is preserved
      expect(symbolNames).toContain('DoSomething');
    });

    it('should maintain case-insensitive symbol lookup', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunit.cal',
          content: `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProcedure@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Should find symbol regardless of case
      expect(findSymbolInContext(context, 'MyProcedure')).toBeDefined();
      expect(findSymbolInContext(context, 'myprocedure')).toBeDefined();
      expect(findSymbolInContext(context, 'MYPROCEDURE')).toBeDefined();
    });
  });
});

describe('Cross-File Codeunit', () => {
  describe('Codeunit-to-Codeunit Procedure Calls', () => {
    it('should find procedure defined in another codeunit file', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///helperCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Helper Functions"
{
  CODE
  {
    PROCEDURE CalculateTotal@1() : Decimal;
    BEGIN
      EXIT(100);
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///mainCodeunit.cal',
          content: `OBJECT Codeunit 50001 "Order Processing"
{
  CODE
  {
    PROCEDURE ProcessOrder@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Verify both codeunits are parsed correctly
      const helperDoc = getDocument(context, 'file:///helperCodeunit.cal');
      const mainDoc = getDocument(context, 'file:///mainCodeunit.cal');

      expect(helperDoc).toBeDefined();
      expect(mainDoc).toBeDefined();

      // Verify procedures exist in their respective files
      expect(helperDoc?.symbolTable.hasSymbol('CalculateTotal')).toBe(true);
      expect(mainDoc?.symbolTable.hasSymbol('ProcessOrder')).toBe(true);

      // Cross-file lookup should find CalculateTotal from helper codeunit
      const calcTotal = findSymbolInContext(context, 'CalculateTotal');
      expect(calcTotal).toBeDefined();
      expect(calcTotal?.uri).toBe('file:///helperCodeunit.cal');
      expect(calcTotal?.symbol?.kind).toBe('procedure');
    });

    it('should distinguish procedures with same name in different codeunits', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunit1.cal',
          content: `OBJECT Codeunit 50000 "First Codeunit"
{
  CODE
  {
    VAR
      UniqueVar1 : Integer;

    PROCEDURE Initialize@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///codeunit2.cal',
          content: `OBJECT Codeunit 50001 "Second Codeunit"
{
  CODE
  {
    VAR
      UniqueVar2 : Integer;

    PROCEDURE Initialize@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Both codeunits have Initialize procedure - findSymbolInContext returns first match
      const initSymbol = findSymbolInContext(context, 'Initialize');
      expect(initSymbol).toBeDefined();
      expect(initSymbol?.symbol?.kind).toBe('procedure');

      // Each codeunit should have its own Initialize procedure in its symbol table
      const doc1 = getDocument(context, 'file:///codeunit1.cal');
      const doc2 = getDocument(context, 'file:///codeunit2.cal');

      expect(doc1?.symbolTable.hasSymbol('Initialize')).toBe(true);
      expect(doc2?.symbolTable.hasSymbol('Initialize')).toBe(true);

      // Unique variables distinguish the codeunits
      expect(doc1?.symbolTable.hasSymbol('UniqueVar1')).toBe(true);
      expect(doc1?.symbolTable.hasSymbol('UniqueVar2')).toBe(false);
      expect(doc2?.symbolTable.hasSymbol('UniqueVar2')).toBe(true);
      expect(doc2?.symbolTable.hasSymbol('UniqueVar1')).toBe(false);
    });

    it('should find multiple procedures across multiple codeunit files', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///mathHelper.cal',
          content: `OBJECT Codeunit 50000 "Math Helper"
{
  CODE
  {
    PROCEDURE Add@1() : Decimal;
    BEGIN
    END;

    PROCEDURE Subtract@2() : Decimal;
    BEGIN
    END;

    PROCEDURE Multiply@3() : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///stringHelper.cal',
          content: `OBJECT Codeunit 50001 "String Helper"
{
  CODE
  {
    PROCEDURE Concat@1() : Text;
    BEGIN
    END;

    PROCEDURE Trim@2() : Text;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///mainProcessor.cal',
          content: `OBJECT Codeunit 50002 "Main Processor"
{
  CODE
  {
    PROCEDURE RunAll@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Get all symbols from all codeunits
      const allSymbols = getAllSymbolsInContext(context);
      const procedureNames = allSymbols
        .filter(s => s.symbol?.kind === 'procedure')
        .map(s => s.symbol?.name);

      // Should find all procedures from all files (original case preserved)
      expect(procedureNames).toContain('Add');
      expect(procedureNames).toContain('Subtract');
      expect(procedureNames).toContain('Multiply');
      expect(procedureNames).toContain('Concat');
      expect(procedureNames).toContain('Trim');
      expect(procedureNames).toContain('RunAll');

      // Verify each procedure is in the correct file
      const addSymbol = findSymbolInContext(context, 'Add');
      expect(addSymbol?.uri).toBe('file:///mathHelper.cal');

      const concatSymbol = findSymbolInContext(context, 'Concat');
      expect(concatSymbol?.uri).toBe('file:///stringHelper.cal');

      const runAllSymbol = findSymbolInContext(context, 'RunAll');
      expect(runAllSymbol?.uri).toBe('file:///mainProcessor.cal');
    });

    it('should find LOCAL procedures within the same codeunit but they exist in symbol table', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunitWithLocal.cal',
          content: `OBJECT Codeunit 50000 "Codeunit With Local"
{
  CODE
  {
    PROCEDURE PublicMethod@1();
    BEGIN
    END;

    LOCAL PROCEDURE PrivateHelper@2();
    BEGIN
    END;

    LOCAL PROCEDURE AnotherPrivate@3();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///codeunitWithLocal.cal');
      expect(doc).toBeDefined();

      // Both public and local procedures should be in the symbol table
      expect(doc?.symbolTable.hasSymbol('PublicMethod')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('PrivateHelper')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('AnotherPrivate')).toBe(true);

      // All should be kind 'procedure'
      expect(doc?.symbolTable.getSymbol('PublicMethod')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('PrivateHelper')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('AnotherPrivate')?.kind).toBe('procedure');

      // Cross-file lookup should also find them
      expect(findSymbolInContext(context, 'PublicMethod')).toBeDefined();
      expect(findSymbolInContext(context, 'PrivateHelper')).toBeDefined();
    });

    it('should handle codeunit with variables and procedures together', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///salesManager.cal',
          content: `OBJECT Codeunit 50000 "Sales Manager"
{
  CODE
  {
    VAR
      Counter : Integer;
      TotalAmount : Decimal;
      CustomerName : Text;

    PROCEDURE InitializeSales@1();
    BEGIN
    END;

    PROCEDURE ProcessSalesOrder@2();
    BEGIN
    END;

    LOCAL PROCEDURE ValidateCustomer@3();
    BEGIN
    END;

    PROCEDURE FinalizeSales@4();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///salesManager.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      const variables = allSymbols.filter(s => s.kind === 'variable');
      const procedures = allSymbols.filter(s => s.kind === 'procedure');

      expect(variables.length).toBe(3);
      expect(procedures.length).toBe(4);

      // Verify variables
      expect(doc?.symbolTable.getSymbol('Counter')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('Counter')?.type).toBe('Integer');
      expect(doc?.symbolTable.getSymbol('TotalAmount')?.type).toBe('Decimal');
      expect(doc?.symbolTable.getSymbol('CustomerName')?.type).toBe('Text');

      // Verify procedures
      expect(doc?.symbolTable.getSymbol('InitializeSales')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('ProcessSalesOrder')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('ValidateCustomer')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('FinalizeSales')?.kind).toBe('procedure');
    });

    it('should handle case-insensitive procedure lookup across files', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///helperCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Helper"
{
  CODE
  {
    PROCEDURE CalculateTotalAmount@1() : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // All case variations should find the same symbol
      const upperCase = findSymbolInContext(context, 'CALCULATETOTALAMOUNT');
      const lowerCase = findSymbolInContext(context, 'calculatetotalamount');
      const mixedCase = findSymbolInContext(context, 'CalculateTotalAmount');
      const randomCase = findSymbolInContext(context, 'cAlCuLaTeTotalAmount');

      expect(upperCase).toBeDefined();
      expect(lowerCase).toBeDefined();
      expect(mixedCase).toBeDefined();
      expect(randomCase).toBeDefined();

      // All should point to the same procedure
      expect(upperCase?.uri).toBe('file:///helperCodeunit.cal');
      expect(lowerCase?.uri).toBe('file:///helperCodeunit.cal');
      expect(mixedCase?.uri).toBe('file:///helperCodeunit.cal');
      expect(randomCase?.uri).toBe('file:///helperCodeunit.cal');

      // All should be the same symbol (original case preserved in name)
      expect(upperCase?.symbol?.name).toBe('CalculateTotalAmount');
      expect(lowerCase?.symbol?.name).toBe('CalculateTotalAmount');
      expect(mixedCase?.symbol?.name).toBe('CalculateTotalAmount');
      expect(randomCase?.symbol?.name).toBe('CalculateTotalAmount');
    });

    it('should handle procedure with @number syntax (legacy NAV format)', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///legacyCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Legacy Codeunit"
{
  CODE
  {
    PROCEDURE FirstProc@1() : Boolean;
    BEGIN
    END;

    PROCEDURE SecondProc@2();
    BEGIN
    END;

    LOCAL PROCEDURE ThirdProc@100();
    BEGIN
    END;

    PROCEDURE FourthProc@9999() : Text;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///legacyCodeunit.cal');
      expect(doc).toBeDefined();

      // All procedures with @number should be extracted
      expect(doc?.symbolTable.hasSymbol('FirstProc')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('SecondProc')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('ThirdProc')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('FourthProc')).toBe(true);

      // All should be procedures
      expect(doc?.symbolTable.getSymbol('FirstProc')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('SecondProc')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('ThirdProc')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('FourthProc')?.kind).toBe('procedure');
    });

    it('should handle codeunits with Record type variables referencing tables', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///helperCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Helper Functions"
{
  CODE
  {
    VAR
      Customer : Record 18;

    PROCEDURE DoHelp@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///mainCodeunit.cal',
          content: `OBJECT Codeunit 50001 "Main Logic"
{
  CODE
  {
    VAR
      SalesHeader : Record 36;
      LocalCounter : Integer;

    PROCEDURE UseHelper@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Verify both codeunits are parsed
      const helperDoc = getDocument(context, 'file:///helperCodeunit.cal');
      const mainDoc = getDocument(context, 'file:///mainCodeunit.cal');

      expect(helperDoc).toBeDefined();
      expect(mainDoc).toBeDefined();

      // Helper codeunit has a Customer Record variable
      expect(helperDoc?.symbolTable.hasSymbol('Customer')).toBe(true);
      const customerVar = helperDoc?.symbolTable.getSymbol('Customer');
      expect(customerVar?.kind).toBe('variable');
      expect(customerVar?.type).toContain('Record');

      // Main codeunit has SalesHeader Record and LocalCounter Integer
      expect(mainDoc?.symbolTable.hasSymbol('SalesHeader')).toBe(true);
      expect(mainDoc?.symbolTable.hasSymbol('LocalCounter')).toBe(true);

      // Both codeunits' procedures should be findable
      expect(findSymbolInContext(context, 'DoHelp')?.uri).toBe('file:///helperCodeunit.cal');
      expect(findSymbolInContext(context, 'UseHelper')?.uri).toBe('file:///mainCodeunit.cal');
    });

    it('should return undefined when looking for non-existent procedure', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunit.cal',
          content: `OBJECT Codeunit 50000 "Test"
{
  CODE
  {
    PROCEDURE ExistingProcedure@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      expect(findSymbolInContext(context, 'ExistingProcedure')).toBeDefined();
      expect(findSymbolInContext(context, 'NonExistentProcedure')).toBeUndefined();
      expect(findSymbolInContext(context, 'SomeRandomName')).toBeUndefined();
    });

    it('should handle multiple codeunits with separate procedure definitions', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///baseCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Base Functions"
{
  CODE
  {
    PROCEDURE GetBaseValue@1() : Integer;
    BEGIN
      EXIT(100);
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///middleCodeunit.cal',
          content: `OBJECT Codeunit 50001 "Middle Layer"
{
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE GetMiddleValue@1() : Integer;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///topCodeunit.cal',
          content: `OBJECT Codeunit 50002 "Top Layer"
{
  CODE
  {
    VAR
      TotalAmount : Decimal;
      IsProcessed : Boolean;

    PROCEDURE GetTopValue@1() : Integer;
    BEGIN
    END;

    PROCEDURE ProcessAll@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // All three codeunits should be parseable
      expect(context.documents.size).toBe(3);

      // Each codeunit should have its own procedures
      expect(findSymbolInContext(context, 'GetBaseValue')?.uri).toBe('file:///baseCodeunit.cal');
      expect(findSymbolInContext(context, 'GetMiddleValue')?.uri).toBe('file:///middleCodeunit.cal');
      expect(findSymbolInContext(context, 'GetTopValue')?.uri).toBe('file:///topCodeunit.cal');
      expect(findSymbolInContext(context, 'ProcessAll')?.uri).toBe('file:///topCodeunit.cal');

      // Check the variables in each codeunit
      const middleDoc = getDocument(context, 'file:///middleCodeunit.cal');
      expect(middleDoc?.symbolTable.hasSymbol('Counter')).toBe(true);

      const topDoc = getDocument(context, 'file:///topCodeunit.cal');
      expect(topDoc?.symbolTable.hasSymbol('TotalAmount')).toBe(true);
      expect(topDoc?.symbolTable.hasSymbol('IsProcessed')).toBe(true);
    });
  });

  describe('Codeunit Symbol Resolution Edge Cases', () => {
    it('should handle empty codeunit gracefully', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///emptyCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Empty Codeunit"
{
  CODE
  {
    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///emptyCodeunit.cal');
      expect(doc).toBeDefined();
      expect(doc?.symbolTable.getAllSymbols()).toEqual([]);
    });

    it('should handle codeunit with only variables and no procedures', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///varOnlyCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Variables Only"
{
  CODE
  {
    VAR
      Counter : Integer;
      Name : Text;
      Amount : Decimal;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///varOnlyCodeunit.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      expect(allSymbols.length).toBe(3);
      expect(allSymbols.every(s => s.kind === 'variable')).toBe(true);
    });

    it('should handle codeunit with only procedures and no variables', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///procOnlyCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Procedures Only"
{
  CODE
  {
    PROCEDURE First@1();
    BEGIN
    END;

    PROCEDURE Second@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///procOnlyCodeunit.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      expect(allSymbols.length).toBe(2);
      expect(allSymbols.every(s => s.kind === 'procedure')).toBe(true);
    });

    it('should handle quoted procedure names', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///quotedCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Quoted Names"
{
  CODE
  {
    PROCEDURE "My Special Procedure"@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///quotedCodeunit.cal');
      expect(doc).toBeDefined();

      // Should find the quoted procedure name
      expect(doc?.symbolTable.hasSymbol('My Special Procedure')).toBe(true);
      expect(doc?.symbolTable.getSymbol('My Special Procedure')?.kind).toBe('procedure');
    });

    it('should handle large codeunit with many procedures', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///largeCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Large Codeunit"
{
  CODE
  {
    VAR
      Var1 : Integer;
      Var2 : Text;
      Var3 : Decimal;
      Var4 : Boolean;
      Var5 : Date;

    PROCEDURE Proc1@1();
    BEGIN
    END;

    PROCEDURE Proc2@2();
    BEGIN
    END;

    PROCEDURE Proc3@3();
    BEGIN
    END;

    PROCEDURE Proc4@4();
    BEGIN
    END;

    PROCEDURE Proc5@5();
    BEGIN
    END;

    LOCAL PROCEDURE LocalProc1@6();
    BEGIN
    END;

    LOCAL PROCEDURE LocalProc2@7();
    BEGIN
    END;

    LOCAL PROCEDURE LocalProc3@8();
    BEGIN
    END;

    PROCEDURE Proc6@9();
    BEGIN
    END;

    PROCEDURE Proc7@10();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///largeCodeunit.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      const variables = allSymbols.filter(s => s.kind === 'variable');
      const procedures = allSymbols.filter(s => s.kind === 'procedure');

      expect(variables.length).toBe(5);
      expect(procedures.length).toBe(10);

      // Verify all procedures are accessible
      for (let i = 1; i <= 7; i++) {
        expect(doc?.symbolTable.hasSymbol(`Proc${i}`)).toBe(true);
      }
      for (let i = 1; i <= 3; i++) {
        expect(doc?.symbolTable.hasSymbol(`LocalProc${i}`)).toBe(true);
      }
    });
  });
});

describe('Cross-File Codeunit Edge Cases', () => {
  describe('Case Insensitivity', () => {
    it('should find codeunit symbols regardless of case (MyCodeunit vs MYCODEUNIT)', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///testCodeunit.cal',
          content: `OBJECT Codeunit 50000 "MySpecialCodeunit"
{
  CODE
  {
    VAR
      MyVariable : Integer;

    PROCEDURE MyProcedure@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Test variable case variations
      expect(findSymbolInContext(context, 'MyVariable')).toBeDefined();
      expect(findSymbolInContext(context, 'MYVARIABLE')).toBeDefined();
      expect(findSymbolInContext(context, 'myvariable')).toBeDefined();
      expect(findSymbolInContext(context, 'myVARIABLE')).toBeDefined();

      // Test procedure case variations
      expect(findSymbolInContext(context, 'MyProcedure')).toBeDefined();
      expect(findSymbolInContext(context, 'MYPROCEDURE')).toBeDefined();
      expect(findSymbolInContext(context, 'myprocedure')).toBeDefined();
      expect(findSymbolInContext(context, 'myPROCEDURE')).toBeDefined();

      // All should resolve to the same normalized symbol
      const var1 = findSymbolInContext(context, 'MyVariable');
      const var2 = findSymbolInContext(context, 'MYVARIABLE');
      expect(var1?.symbol?.name).toBe(var2?.symbol?.name);

      const proc1 = findSymbolInContext(context, 'MyProcedure');
      const proc2 = findSymbolInContext(context, 'myprocedure');
      expect(proc1?.symbol?.name).toBe(proc2?.symbol?.name);
    });

    it('should handle mixed case symbol names consistently across multiple codeunits', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunit1.cal',
          content: `OBJECT Codeunit 50000 "First"
{
  CODE
  {
    PROCEDURE HandleRequest@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///codeunit2.cal',
          content: `OBJECT Codeunit 50001 "Second"
{
  CODE
  {
    PROCEDURE ProcessResponse@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Find symbols using various cases
      expect(findSymbolInContext(context, 'HANDLEREQUEST')?.uri).toBe('file:///codeunit1.cal');
      expect(findSymbolInContext(context, 'handlerequest')?.uri).toBe('file:///codeunit1.cal');
      expect(findSymbolInContext(context, 'HandleRequest')?.uri).toBe('file:///codeunit1.cal');

      expect(findSymbolInContext(context, 'PROCESSRESPONSE')?.uri).toBe('file:///codeunit2.cal');
      expect(findSymbolInContext(context, 'processresponse')?.uri).toBe('file:///codeunit2.cal');
      expect(findSymbolInContext(context, 'ProcessResponse')?.uri).toBe('file:///codeunit2.cal');
    });
  });

  describe('Missing Referenced Objects', () => {
    it('should handle codeunit referencing non-existent procedure gracefully', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///callerCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Caller"
{
  CODE
  {
    PROCEDURE CallHelper@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // The codeunit parses fine
      const doc = getDocument(context, 'file:///callerCodeunit.cal');
      expect(doc).toBeDefined();
      expect(doc?.symbolTable.hasSymbol('CallHelper')).toBe(true);

      // But the non-existent referenced procedure is not found
      expect(findSymbolInContext(context, 'NonExistentHelperProc')).toBeUndefined();
      expect(findSymbolInContext(context, 'SomeOtherMissingProcedure')).toBeUndefined();
    });

    it('should handle missing codeunit when another codeunit references it', () => {
      // Create a codeunit that would conceptually call procedures from a missing helper codeunit
      // The helper codeunit (50000) is not loaded in the workspace
      const context = createMultiDocumentContext([
        {
          uri: 'file:///orderProcessor.cal',
          content: `OBJECT Codeunit 50001 "Order Processor"
{
  CODE
  {
    VAR
      LocalCounter : Integer;

    PROCEDURE ProcessOrder@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // The codeunit should parse successfully
      const doc = getDocument(context, 'file:///orderProcessor.cal');
      expect(doc).toBeDefined();
      expect(doc?.symbolTable.hasSymbol('ProcessOrder')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('LocalCounter')).toBe(true);

      // Cross-file lookup for procedures from non-existent codeunit returns undefined
      // This simulates when a codeunit tries to call HelperCodeunit.DoSomething() but HelperCodeunit isn't loaded
      expect(findSymbolInContext(context, 'HelperProcedure')).toBeUndefined();
      expect(findSymbolInContext(context, 'DoSomething')).toBeUndefined();
      expect(findSymbolInContext(context, 'MissingProcedure')).toBeUndefined();
    });

    it('should handle partial workspace with only some codeunits loaded', () => {
      // Simulate a scenario where only some of a project's codeunits are loaded
      const context = createMultiDocumentContext([
        {
          uri: 'file:///base.cal',
          content: `OBJECT Codeunit 50000 "Base Functions"
{
  CODE
  {
    PROCEDURE GetBaseValue@1() : Integer;
    BEGIN
      EXIT(100);
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///middle.cal',
          content: `OBJECT Codeunit 50002 "Middle Layer"
{
  CODE
  {
    PROCEDURE GetMiddleValue@1() : Integer;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
        // Note: Codeunit 50001 is missing (simulating partial load)
      ]);

      // Should find symbols from loaded codeunits
      expect(findSymbolInContext(context, 'GetBaseValue')).toBeDefined();
      expect(findSymbolInContext(context, 'GetMiddleValue')).toBeDefined();

      // Should not find symbols from non-loaded codeunits
      expect(findSymbolInContext(context, 'GetMissingValue')).toBeUndefined();
    });
  });

  describe('LOCAL vs Public Procedure Visibility', () => {
    it('should include LOCAL procedures in symbol table', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///mixedVisibility.cal',
          content: `OBJECT Codeunit 50000 "Mixed Visibility"
{
  CODE
  {
    PROCEDURE PublicProcedure@1();
    BEGIN
    END;

    LOCAL PROCEDURE LocalProcedure@2();
    BEGIN
    END;

    PROCEDURE AnotherPublicProcedure@3();
    BEGIN
    END;

    LOCAL PROCEDURE AnotherLocalProcedure@4();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///mixedVisibility.cal');
      expect(doc).toBeDefined();

      // Both public and LOCAL procedures should be in the symbol table
      expect(doc?.symbolTable.hasSymbol('PublicProcedure')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('LocalProcedure')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('AnotherPublicProcedure')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('AnotherLocalProcedure')).toBe(true);

      // All should be of kind 'procedure'
      expect(doc?.symbolTable.getSymbol('PublicProcedure')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('LocalProcedure')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('AnotherPublicProcedure')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('AnotherLocalProcedure')?.kind).toBe('procedure');

      // Cross-file search should also find LOCAL procedures
      expect(findSymbolInContext(context, 'LocalProcedure')).toBeDefined();
      expect(findSymbolInContext(context, 'AnotherLocalProcedure')).toBeDefined();
    });

    it('should distinguish LOCAL procedures from different codeunits', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeunit1.cal',
          content: `OBJECT Codeunit 50000 "First"
{
  CODE
  {
    VAR
      UniqueMarker1 : Integer;

    LOCAL PROCEDURE SharedLocalName@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///codeunit2.cal',
          content: `OBJECT Codeunit 50001 "Second"
{
  CODE
  {
    VAR
      UniqueMarker2 : Integer;

    LOCAL PROCEDURE SharedLocalName@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Both codeunits should have their own LOCAL procedure with the same name
      const doc1 = getDocument(context, 'file:///codeunit1.cal');
      const doc2 = getDocument(context, 'file:///codeunit2.cal');

      expect(doc1?.symbolTable.hasSymbol('SharedLocalName')).toBe(true);
      expect(doc2?.symbolTable.hasSymbol('SharedLocalName')).toBe(true);

      // Use unique markers to verify document isolation
      expect(doc1?.symbolTable.hasSymbol('UniqueMarker1')).toBe(true);
      expect(doc1?.symbolTable.hasSymbol('UniqueMarker2')).toBe(false);
      expect(doc2?.symbolTable.hasSymbol('UniqueMarker2')).toBe(true);
      expect(doc2?.symbolTable.hasSymbol('UniqueMarker1')).toBe(false);
    });

    it('should handle codeunit with only LOCAL procedures', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///allLocal.cal',
          content: `OBJECT Codeunit 50000 "All Local"
{
  CODE
  {
    LOCAL PROCEDURE Helper1@1();
    BEGIN
    END;

    LOCAL PROCEDURE Helper2@2();
    BEGIN
    END;

    LOCAL PROCEDURE Helper3@3();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///allLocal.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      expect(allSymbols.length).toBe(3);
      expect(allSymbols.every(s => s.kind === 'procedure')).toBe(true);

      // All LOCAL procedures should be accessible
      expect(doc?.symbolTable.hasSymbol('Helper1')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Helper2')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Helper3')).toBe(true);
    });
  });

  describe('Procedure @Number Syntax', () => {
    it('should handle procedures with various @number values', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///numberedProcs.cal',
          content: `OBJECT Codeunit 50000 "Numbered Procedures"
{
  CODE
  {
    PROCEDURE First@1();
    BEGIN
    END;

    PROCEDURE Second@10();
    BEGIN
    END;

    PROCEDURE Third@100();
    BEGIN
    END;

    PROCEDURE Fourth@9999();
    BEGIN
    END;

    PROCEDURE Fifth@0();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///numberedProcs.cal');
      expect(doc).toBeDefined();

      // All procedures with @number should be extracted correctly
      expect(doc?.symbolTable.hasSymbol('First')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Second')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Third')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Fourth')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Fifth')).toBe(true);

      // All should be procedures
      expect(doc?.symbolTable.getSymbol('First')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('Second')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('Third')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('Fourth')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('Fifth')?.kind).toBe('procedure');
    });

    it('should handle LOCAL procedures with @number syntax', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///localNumbered.cal',
          content: `OBJECT Codeunit 50000 "Local Numbered"
{
  CODE
  {
    LOCAL PROCEDURE LocalFirst@1();
    BEGIN
    END;

    LOCAL PROCEDURE LocalSecond@50();
    BEGIN
    END;

    LOCAL PROCEDURE LocalThird@999();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///localNumbered.cal');
      expect(doc).toBeDefined();

      expect(doc?.symbolTable.hasSymbol('LocalFirst')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('LocalSecond')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('LocalThird')).toBe(true);

      expect(doc?.symbolTable.getSymbol('LocalFirst')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('LocalSecond')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('LocalThird')?.kind).toBe('procedure');
    });

    it('should handle procedures with return types and @number', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///returnTypes.cal',
          content: `OBJECT Codeunit 50000 "Return Types"
{
  CODE
  {
    PROCEDURE GetInteger@1() : Integer;
    BEGIN
      EXIT(0);
    END;

    PROCEDURE GetDecimal@2() : Decimal;
    BEGIN
      EXIT(0.0);
    END;

    PROCEDURE GetBoolean@3() : Boolean;
    BEGIN
      EXIT(TRUE);
    END;

    PROCEDURE GetText@4() : Text;
    BEGIN
      EXIT('');
    END;

    LOCAL PROCEDURE GetLocalValue@5() : Integer;
    BEGIN
      EXIT(0);
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///returnTypes.cal');
      expect(doc).toBeDefined();

      // All procedures should be found regardless of return type
      expect(doc?.symbolTable.hasSymbol('GetInteger')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('GetDecimal')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('GetBoolean')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('GetText')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('GetLocalValue')).toBe(true);

      // All should be procedures
      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      expect(allSymbols.every(s => s.kind === 'procedure')).toBe(true);
    });

    it('should handle mixed public and LOCAL procedures with @number across codeunits', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///mixedCodeunit1.cal',
          content: `OBJECT Codeunit 50000 "Mixed One"
{
  CODE
  {
    PROCEDURE PublicA@1() : Boolean;
    BEGIN
    END;

    LOCAL PROCEDURE PrivateA@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///mixedCodeunit2.cal',
          content: `OBJECT Codeunit 50001 "Mixed Two"
{
  CODE
  {
    PROCEDURE PublicB@1() : Integer;
    BEGIN
    END;

    LOCAL PROCEDURE PrivateB@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // All procedures should be findable across files
      expect(findSymbolInContext(context, 'PublicA')?.uri).toBe('file:///mixedCodeunit1.cal');
      expect(findSymbolInContext(context, 'PrivateA')?.uri).toBe('file:///mixedCodeunit1.cal');
      expect(findSymbolInContext(context, 'PublicB')?.uri).toBe('file:///mixedCodeunit2.cal');
      expect(findSymbolInContext(context, 'PrivateB')?.uri).toBe('file:///mixedCodeunit2.cal');

      // All should be of kind procedure
      expect(findSymbolInContext(context, 'PublicA')?.symbol?.kind).toBe('procedure');
      expect(findSymbolInContext(context, 'PrivateA')?.symbol?.kind).toBe('procedure');
      expect(findSymbolInContext(context, 'PublicB')?.symbol?.kind).toBe('procedure');
      expect(findSymbolInContext(context, 'PrivateB')?.symbol?.kind).toBe('procedure');
    });
  });
});

describe('Cross-File Table References', () => {
  describe('Record Type Variable References', () => {
    it('should extract Record type variable with table ID from codeunit', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///salesCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Sales Manager"
{
  CODE
  {
    VAR
      Customer : Record 18;

    PROCEDURE CheckCustomer@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///salesCodeunit.cal');
      expect(doc).toBeDefined();

      // Verify Customer Record variable exists
      expect(doc?.symbolTable.hasSymbol('Customer')).toBe(true);
      const customerVar = doc?.symbolTable.getSymbol('Customer');
      expect(customerVar?.kind).toBe('variable');
      expect(customerVar?.type).toContain('Record');
    });

    it('should extract Table fields from table object', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;"Credit Limit"  ;Decimal       }
    { 4   ;   ;Balance         ;Decimal       }
    { 5   ;   ;Blocked         ;Option        }
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///customerTable.cal');
      expect(doc).toBeDefined();

      // Verify all fields are extracted
      expect(doc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Name')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Credit Limit')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Balance')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Blocked')).toBe(true);

      // Verify field types
      expect(doc?.symbolTable.getSymbol('No.')?.type).toBe('Code20');
      expect(doc?.symbolTable.getSymbol('Name')?.type).toBe('Text100');
      expect(doc?.symbolTable.getSymbol('Credit Limit')?.type).toBe('Decimal');
      expect(doc?.symbolTable.getSymbol('Balance')?.type).toBe('Decimal');
      expect(doc?.symbolTable.getSymbol('Blocked')?.type).toBe('Option');

      // All should be fields
      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      expect(allSymbols.every(s => s.kind === 'field')).toBe(true);
    });

    it('should parse Table and Codeunit with Record reference independently', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///salesCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Sales Manager"
{
  CODE
  {
    VAR
      Customer : Record 18;
      TotalAmount : Decimal;

    PROCEDURE ProcessSales@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Both documents should be parsed
      expect(context.documents.size).toBe(2);

      const tableDoc = getDocument(context, 'file:///customerTable.cal');
      const codeunitDoc = getDocument(context, 'file:///salesCodeunit.cal');

      expect(tableDoc).toBeDefined();
      expect(codeunitDoc).toBeDefined();

      // Table should have fields
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Name')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Balance')).toBe(true);

      // Codeunit should have variable and procedure
      expect(codeunitDoc?.symbolTable.hasSymbol('Customer')).toBe(true);
      expect(codeunitDoc?.symbolTable.hasSymbol('TotalAmount')).toBe(true);
      expect(codeunitDoc?.symbolTable.hasSymbol('ProcessSales')).toBe(true);

      // Verify types
      expect(codeunitDoc?.symbolTable.getSymbol('Customer')?.kind).toBe('variable');
      expect(codeunitDoc?.symbolTable.getSymbol('TotalAmount')?.type).toBe('Decimal');
      expect(codeunitDoc?.symbolTable.getSymbol('ProcessSales')?.kind).toBe('procedure');
    });

    it('should handle multiple Record type variables referencing different tables', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///orderProcessor.cal',
          content: `OBJECT Codeunit 50001 "Order Processor"
{
  CODE
  {
    VAR
      Customer : Record 18;
      SalesHeader : Record 36;
      SalesLine : Record 37;
      Item : Record 27;

    PROCEDURE ProcessOrder@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///orderProcessor.cal');
      expect(doc).toBeDefined();

      // All Record variables should be extracted
      expect(doc?.symbolTable.hasSymbol('Customer')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('SalesHeader')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('SalesLine')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Item')).toBe(true);

      // All should be variables with Record type
      expect(doc?.symbolTable.getSymbol('Customer')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('SalesHeader')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('SalesLine')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('Item')?.kind).toBe('variable');

      expect(doc?.symbolTable.getSymbol('Customer')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('SalesHeader')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('SalesLine')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('Item')?.type).toContain('Record');
    });

    it('should find table fields across multiple table files', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`
        },
        {
          uri: 'file:///itemTable.cal',
          content: `OBJECT Table 27 Item
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 3   ;   ;Description     ;Text100       }
    { 18  ;   ;"Unit Price"    ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///salesHeader.cal',
          content: `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type" ;Option        }
    { 2   ;   ;"Sell-to Customer No.";Code20  }
    { 3   ;   ;"No."           ;Code20        }
  }
}`
        }
      ]);

      expect(context.documents.size).toBe(3);

      // Each table should have its own fields
      const customerDoc = getDocument(context, 'file:///customerTable.cal');
      const itemDoc = getDocument(context, 'file:///itemTable.cal');
      const salesDoc = getDocument(context, 'file:///salesHeader.cal');

      expect(customerDoc?.symbolTable.getAllSymbols().length).toBe(2);
      expect(itemDoc?.symbolTable.getAllSymbols().length).toBe(3);
      expect(salesDoc?.symbolTable.getAllSymbols().length).toBe(3);

      // Verify specific fields in each table
      expect(customerDoc?.symbolTable.hasSymbol('Name')).toBe(true);
      expect(itemDoc?.symbolTable.hasSymbol('Description')).toBe(true);
      expect(itemDoc?.symbolTable.hasSymbol('Unit Price')).toBe(true);
      expect(salesDoc?.symbolTable.hasSymbol('Document Type')).toBe(true);
      expect(salesDoc?.symbolTable.hasSymbol('Sell-to Customer No.')).toBe(true);

      // No. field exists in all three - but in their respective tables
      expect(customerDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(itemDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(salesDoc?.symbolTable.hasSymbol('No.')).toBe(true);
    });

    it('should handle codeunit with Record variables and table fields in same context', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;"Credit Limit"  ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///salesCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Sales Manager"
{
  CODE
  {
    VAR
      Customer : Record 18;

    PROCEDURE CheckCreditLimit@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Get all symbols across both documents
      const allSymbols = getAllSymbolsInContext(context);

      // Should have 3 fields + 1 variable + 1 procedure = 5 total
      expect(allSymbols.length).toBe(5);

      // Verify fields from table
      const fieldSymbols = allSymbols.filter(s => s.symbol?.kind === 'field');
      expect(fieldSymbols.length).toBe(3);
      expect(fieldSymbols.every(s => s.uri === 'file:///customerTable.cal')).toBe(true);

      // Verify variable from codeunit
      const variableSymbols = allSymbols.filter(s => s.symbol?.kind === 'variable');
      expect(variableSymbols.length).toBe(1);
      expect(variableSymbols[0].uri).toBe('file:///salesCodeunit.cal');

      // Verify procedure from codeunit
      const procedureSymbols = allSymbols.filter(s => s.symbol?.kind === 'procedure');
      expect(procedureSymbols.length).toBe(1);
      expect(procedureSymbols[0].uri).toBe('file:///salesCodeunit.cal');
    });
  });

  describe('Table Field Types and Variations', () => {
    it('should handle all common field data types', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///allTypes.cal',
          content: `OBJECT Table 50000 "All Types"
{
  FIELDS
  {
    { 1   ;   ;CodeField       ;Code20        }
    { 2   ;   ;TextField       ;Text100       }
    { 3   ;   ;IntField        ;Integer       }
    { 4   ;   ;DecimalField    ;Decimal       }
    { 5   ;   ;DateField       ;Date          }
    { 6   ;   ;TimeField       ;Time          }
    { 7   ;   ;DateTimeField   ;DateTime      }
    { 8   ;   ;BoolField       ;Boolean       }
    { 9   ;   ;OptionField     ;Option        }
    { 10  ;   ;GuidField       ;GUID          }
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///allTypes.cal');
      expect(doc).toBeDefined();

      expect(doc?.symbolTable.getSymbol('CodeField')?.type).toBe('Code20');
      expect(doc?.symbolTable.getSymbol('TextField')?.type).toBe('Text100');
      expect(doc?.symbolTable.getSymbol('IntField')?.type).toBe('Integer');
      expect(doc?.symbolTable.getSymbol('DecimalField')?.type).toBe('Decimal');
      expect(doc?.symbolTable.getSymbol('DateField')?.type).toBe('Date');
      expect(doc?.symbolTable.getSymbol('TimeField')?.type).toBe('Time');
      expect(doc?.symbolTable.getSymbol('DateTimeField')?.type).toBe('DateTime');
      expect(doc?.symbolTable.getSymbol('BoolField')?.type).toBe('Boolean');
      expect(doc?.symbolTable.getSymbol('OptionField')?.type).toBe('Option');
      expect(doc?.symbolTable.getSymbol('GuidField')?.type).toBe('GUID');
    });

    it('should handle quoted field names with special characters', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///specialFields.cal',
          content: `OBJECT Table 50001 "Special Fields"
{
  FIELDS
  {
    { 1   ;   ;"VAT %"             ;Decimal       }
    { 2   ;   ;"Amount (LCY)"      ;Decimal       }
    { 3   ;   ;"No. Series"        ;Code20        }
    { 4   ;   ;"Gen. Bus. Posting Group";Code20  }
    { 5   ;   ;"E-Mail"            ;Text80        }
    { 6   ;   ;"Phone No. 2"       ;Text30        }
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///specialFields.cal');
      expect(doc).toBeDefined();

      // All special character field names should be found
      expect(doc?.symbolTable.hasSymbol('VAT %')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Amount (LCY)')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('No. Series')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Gen. Bus. Posting Group')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('E-Mail')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('Phone No. 2')).toBe(true);

      // Case-insensitive lookup should work
      expect(doc?.symbolTable.hasSymbol('vat %')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('AMOUNT (LCY)')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('e-mail')).toBe(true);
    });

    it('should handle case-insensitive field lookup across table files', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
    { 2   ;   ;CustomerName    ;Text100       }
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///customerTable.cal');
      expect(doc).toBeDefined();

      // All case variations should find the field
      expect(doc?.symbolTable.hasSymbol('CustomerNo')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('CUSTOMERNO')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('customerno')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('customerNo')).toBe(true);

      expect(doc?.symbolTable.hasSymbol('CustomerName')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('CUSTOMERNAME')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('customername')).toBe(true);
    });
  });

  describe('Cross-File Table-Codeunit Relationships', () => {
    it('should maintain separate symbol tables for table and codeunit', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`
        },
        {
          uri: 'file:///customerMgmt.cal',
          content: `OBJECT Codeunit 50000 "Customer Management"
{
  CODE
  {
    VAR
      Cust : Record 18;

    PROCEDURE FindCustomer@1();
    BEGIN
    END;

    PROCEDURE UpdateCustomer@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///customerTable.cal');
      const codeunitDoc = getDocument(context, 'file:///customerMgmt.cal');

      // Table should NOT have Cust variable or procedures
      expect(tableDoc?.symbolTable.hasSymbol('Cust')).toBe(false);
      expect(tableDoc?.symbolTable.hasSymbol('FindCustomer')).toBe(false);

      // Codeunit should NOT have table fields
      expect(codeunitDoc?.symbolTable.hasSymbol('No.')).toBe(false);
      expect(codeunitDoc?.symbolTable.hasSymbol('Name')).toBe(false);

      // But cross-file lookup should find symbols from either
      expect(findSymbolInContext(context, 'No.')).toBeDefined();
      expect(findSymbolInContext(context, 'Name')).toBeDefined();
      expect(findSymbolInContext(context, 'Cust')).toBeDefined();
      expect(findSymbolInContext(context, 'FindCustomer')).toBeDefined();
    });

    it('should find table fields when searching across context with Record variable', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///salesHeader.cal',
          content: `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type" ;Option        }
    { 2   ;   ;"Sell-to Customer No.";Code20  }
    { 3   ;   ;"No."           ;Code20        }
    { 4   ;   ;"Posting Date"  ;Date          }
    { 5   ;   ;Amount          ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///salesPost.cal',
          content: `OBJECT Codeunit 80 "Sales-Post"
{
  CODE
  {
    VAR
      SalesHeader : Record 36;
      SalesLine : Record 37;
      PostingDate : Date;
      TotalAmount : Decimal;

    PROCEDURE Run@1();
    BEGIN
    END;

    LOCAL PROCEDURE PostHeader@2();
    BEGIN
    END;

    LOCAL PROCEDURE PostLines@3();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Cross-file lookup should find table fields
      expect(findSymbolInContext(context, 'Document Type')?.uri).toBe('file:///salesHeader.cal');
      expect(findSymbolInContext(context, 'Sell-to Customer No.')?.uri).toBe('file:///salesHeader.cal');
      expect(findSymbolInContext(context, 'Posting Date')?.symbol?.kind).toBe('field');

      // And codeunit variables (note: PostingDate is ALSO in codeunit - first match wins)
      expect(findSymbolInContext(context, 'SalesHeader')?.uri).toBe('file:///salesPost.cal');
      expect(findSymbolInContext(context, 'SalesLine')?.uri).toBe('file:///salesPost.cal');
      expect(findSymbolInContext(context, 'TotalAmount')?.uri).toBe('file:///salesPost.cal');

      // And procedures
      expect(findSymbolInContext(context, 'Run')?.uri).toBe('file:///salesPost.cal');
      expect(findSymbolInContext(context, 'PostHeader')?.uri).toBe('file:///salesPost.cal');
    });

    it('should handle table with both FIELDS and CODE sections', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///salesHeader.cal',
          content: `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type" ;Option        }
    { 2   ;   ;"No."           ;Code20        }
    { 3   ;   ;Amount          ;Decimal       }
  }

  CODE
  {
    VAR
      SalesSetup : Record 311;
      TempLine : Record 37;

    PROCEDURE InitRecord@1();
    BEGIN
    END;

    LOCAL PROCEDURE ValidateNo@2();
    BEGIN
    END;
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///salesHeader.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];

      // Should have fields, variables, and procedures
      const fields = allSymbols.filter(s => s.kind === 'field');
      const variables = allSymbols.filter(s => s.kind === 'variable');
      const procedures = allSymbols.filter(s => s.kind === 'procedure');

      expect(fields.length).toBe(3);
      expect(variables.length).toBe(2);
      expect(procedures.length).toBe(2);

      // Verify specific symbols
      expect(doc?.symbolTable.getSymbol('Document Type')?.kind).toBe('field');
      expect(doc?.symbolTable.getSymbol('SalesSetup')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('InitRecord')?.kind).toBe('procedure');
    });

    it('should handle realistic multi-file workspace with tables and codeunits', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;"Credit Limit"  ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///salesHeaderTable.cal',
          content: `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type" ;Option        }
    { 2   ;   ;"Sell-to Customer No.";Code20  }
    { 3   ;   ;"No."           ;Code20        }
  }
}`
        },
        {
          uri: 'file:///salesManager.cal',
          content: `OBJECT Codeunit 50000 "Sales Manager"
{
  CODE
  {
    VAR
      Customer : Record 18;
      SalesHeader : Record 36;

    PROCEDURE CreateSalesOrder@1();
    BEGIN
    END;

    PROCEDURE ProcessOrder@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///customerMgmt.cal',
          content: `OBJECT Codeunit 50001 "Customer Mgmt"
{
  CODE
  {
    VAR
      Cust : Record 18;

    PROCEDURE ValidateCustomer@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      expect(context.documents.size).toBe(4);

      // Count total symbols
      const allSymbols = getAllSymbolsInContext(context);

      // Tables: 3 + 3 = 6 fields
      // Codeunits: 2 + 2 + 1 + 1 = 6 symbols (variables + procedures)
      expect(allSymbols.length).toBe(12);

      // Verify we can find symbols from all files
      expect(findSymbolInContext(context, 'Name')?.uri).toBe('file:///customerTable.cal');
      expect(findSymbolInContext(context, 'Credit Limit')?.uri).toBe('file:///customerTable.cal');
      expect(findSymbolInContext(context, 'Document Type')?.uri).toBe('file:///salesHeaderTable.cal');
      expect(findSymbolInContext(context, 'Sell-to Customer No.')?.uri).toBe('file:///salesHeaderTable.cal');
      expect(findSymbolInContext(context, 'CreateSalesOrder')?.uri).toBe('file:///salesManager.cal');
      expect(findSymbolInContext(context, 'ValidateCustomer')?.uri).toBe('file:///customerMgmt.cal');
    });
  });

  describe('TEMPORARY Record Types', () => {
    it('should extract TEMPORARY Record type variable from codeunit', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///tempRecordCodeunit.cal',
          content: `OBJECT Codeunit 50000 "Temp Record Handler"
{
  CODE
  {
    VAR
      TempCustomer : TEMPORARY Record 18;

    PROCEDURE ProcessTemp@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///tempRecordCodeunit.cal');
      expect(doc).toBeDefined();

      // Verify TEMPORARY Record variable exists
      expect(doc?.symbolTable.hasSymbol('TempCustomer')).toBe(true);
      const tempVar = doc?.symbolTable.getSymbol('TempCustomer');
      expect(tempVar?.kind).toBe('variable');
      expect(tempVar?.type).toContain('Record');
    });

    it('should extract multiple TEMPORARY Record type variables', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///multiTempCodeunit.cal',
          content: `OBJECT Codeunit 50001 "Multi Temp Handler"
{
  CODE
  {
    VAR
      TempSalesLine : TEMPORARY Record 37;
      TempPurchaseLine : TEMPORARY Record 39;
      TempItem : TEMPORARY Record 27;

    PROCEDURE ProcessAll@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///multiTempCodeunit.cal');
      expect(doc).toBeDefined();

      // All TEMPORARY Record variables should be extracted
      expect(doc?.symbolTable.hasSymbol('TempSalesLine')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('TempPurchaseLine')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('TempItem')).toBe(true);

      // All should be variables with Record type
      expect(doc?.symbolTable.getSymbol('TempSalesLine')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('TempPurchaseLine')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('TempItem')?.kind).toBe('variable');

      expect(doc?.symbolTable.getSymbol('TempSalesLine')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('TempPurchaseLine')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('TempItem')?.type).toContain('Record');
    });

    it('should handle mix of TEMPORARY and regular Record type variables', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///mixedRecordCodeunit.cal',
          content: `OBJECT Codeunit 50002 "Mixed Record Handler"
{
  CODE
  {
    VAR
      Customer : Record 18;
      TempCustomer : TEMPORARY Record 18;
      SalesHeader : Record 36;
      TempSalesHeader : TEMPORARY Record 36;

    PROCEDURE ProcessRecords@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///mixedRecordCodeunit.cal');
      expect(doc).toBeDefined();

      // Both regular and TEMPORARY Records should be extracted
      expect(doc?.symbolTable.hasSymbol('Customer')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('TempCustomer')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('SalesHeader')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('TempSalesHeader')).toBe(true);

      // All should be variables
      expect(doc?.symbolTable.getSymbol('Customer')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('TempCustomer')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('SalesHeader')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('TempSalesHeader')?.kind).toBe('variable');

      // All should have Record type
      expect(doc?.symbolTable.getSymbol('Customer')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('TempCustomer')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('SalesHeader')?.type).toContain('Record');
      expect(doc?.symbolTable.getSymbol('TempSalesHeader')?.type).toContain('Record');
    });

    it('should find TEMPORARY Record variables across multiple files', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///tempCodeunit1.cal',
          content: `OBJECT Codeunit 50000 "Temp Handler One"
{
  CODE
  {
    VAR
      TempSalesLine : TEMPORARY Record 37;

    PROCEDURE ProcessSalesLines@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///tempCodeunit2.cal',
          content: `OBJECT Codeunit 50001 "Temp Handler Two"
{
  CODE
  {
    VAR
      TempPurchaseLine : TEMPORARY Record 39;

    PROCEDURE ProcessPurchaseLines@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // Cross-file lookup should find TEMPORARY variables in both files
      expect(findSymbolInContext(context, 'TempSalesLine')?.uri).toBe('file:///tempCodeunit1.cal');
      expect(findSymbolInContext(context, 'TempPurchaseLine')?.uri).toBe('file:///tempCodeunit2.cal');

      // Both should be variables
      expect(findSymbolInContext(context, 'TempSalesLine')?.symbol?.kind).toBe('variable');
      expect(findSymbolInContext(context, 'TempPurchaseLine')?.symbol?.kind).toBe('variable');
    });

    it('should handle TEMPORARY Record with @number syntax (legacy NAV format)', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///legacyTempCodeunit.cal',
          content: `OBJECT Codeunit 50003 "Legacy Temp Handler"
{
  CODE
  {
    VAR
      TempCustomer@1009 : TEMPORARY Record 18;
      TempItem@1010 : TEMPORARY Record 27;

    PROCEDURE DoWork@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///legacyTempCodeunit.cal');
      expect(doc).toBeDefined();

      // TEMPORARY Records with @number should be extracted
      expect(doc?.symbolTable.hasSymbol('TempCustomer')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('TempItem')).toBe(true);

      expect(doc?.symbolTable.getSymbol('TempCustomer')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('TempItem')?.kind).toBe('variable');
    });

    it('should handle case-insensitive lookup for TEMPORARY Record variables', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///caseTempCodeunit.cal',
          content: `OBJECT Codeunit 50004 "Case Temp Handler"
{
  CODE
  {
    VAR
      TempCustomerBuffer : TEMPORARY Record 18;

    PROCEDURE Process@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      // All case variations should find the same symbol
      expect(findSymbolInContext(context, 'TempCustomerBuffer')).toBeDefined();
      expect(findSymbolInContext(context, 'tempcustomerbuffer')).toBeDefined();
      expect(findSymbolInContext(context, 'TEMPCUSTOMERBUFFER')).toBeDefined();
      expect(findSymbolInContext(context, 'tempCustomerBuffer')).toBeDefined();

      // All should point to the same file
      expect(findSymbolInContext(context, 'TempCustomerBuffer')?.uri).toBe('file:///caseTempCodeunit.cal');
      expect(findSymbolInContext(context, 'tempcustomerbuffer')?.uri).toBe('file:///caseTempCodeunit.cal');
    });

    it('should handle TEMPORARY Record in codeunit with table definition in context', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///tempCustomerCodeunit.cal',
          content: `OBJECT Codeunit 50005 "Temp Customer Handler"
{
  CODE
  {
    VAR
      TempCustomer : TEMPORARY Record 18;
      RegularCustomer : Record 18;

    PROCEDURE ProcessCustomers@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      expect(context.documents.size).toBe(2);

      // Table fields should be in table document
      const tableDoc = getDocument(context, 'file:///customerTable.cal');
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Name')).toBe(true);

      // TEMPORARY and regular Record variables should be in codeunit
      const codeunitDoc = getDocument(context, 'file:///tempCustomerCodeunit.cal');
      expect(codeunitDoc?.symbolTable.hasSymbol('TempCustomer')).toBe(true);
      expect(codeunitDoc?.symbolTable.hasSymbol('RegularCustomer')).toBe(true);

      // Cross-file lookup
      expect(findSymbolInContext(context, 'No.')?.uri).toBe('file:///customerTable.cal');
      expect(findSymbolInContext(context, 'TempCustomer')?.uri).toBe('file:///tempCustomerCodeunit.cal');
    });

    it('should handle TEMPORARY Record variables with procedures and other variable types', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///complexTempCodeunit.cal',
          content: `OBJECT Codeunit 50006 "Complex Temp Handler"
{
  CODE
  {
    VAR
      TempSalesLine : TEMPORARY Record 37;
      TempPurchLine : TEMPORARY Record 39;
      Counter : Integer;
      TotalAmount : Decimal;
      ProcessingDate : Date;
      IsProcessed : Boolean;

    PROCEDURE Initialize@1();
    BEGIN
    END;

    PROCEDURE ProcessTempRecords@2();
    BEGIN
    END;

    LOCAL PROCEDURE ClearTempRecords@3();
    BEGIN
    END;

    PROCEDURE Finalize@4();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///complexTempCodeunit.cal');
      expect(doc).toBeDefined();

      const allSymbols = doc?.symbolTable.getAllSymbols() ?? [];
      const variables = allSymbols.filter(s => s.kind === 'variable');
      const procedures = allSymbols.filter(s => s.kind === 'procedure');

      // Should have 6 variables (2 TEMPORARY + 4 simple types)
      expect(variables.length).toBe(6);
      // Should have 4 procedures
      expect(procedures.length).toBe(4);

      // Verify TEMPORARY records
      expect(doc?.symbolTable.getSymbol('TempSalesLine')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('TempPurchLine')?.kind).toBe('variable');

      // Verify simple types
      expect(doc?.symbolTable.getSymbol('Counter')?.type).toBe('Integer');
      expect(doc?.symbolTable.getSymbol('TotalAmount')?.type).toBe('Decimal');
      expect(doc?.symbolTable.getSymbol('ProcessingDate')?.type).toBe('Date');
      expect(doc?.symbolTable.getSymbol('IsProcessed')?.type).toBe('Boolean');

      // Verify procedures
      expect(doc?.symbolTable.getSymbol('Initialize')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('ProcessTempRecords')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('ClearTempRecords')?.kind).toBe('procedure');
      expect(doc?.symbolTable.getSymbol('Finalize')?.kind).toBe('procedure');
    });

    it('should handle TEMPORARY Record variable with quoted name', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///quotedTempCodeunit.cal',
          content: `OBJECT Codeunit 50007 "Quoted Temp Handler"
{
  CODE
  {
    VAR
      "Temp Sales Line Buffer" : TEMPORARY Record 37;

    PROCEDURE Process@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const doc = getDocument(context, 'file:///quotedTempCodeunit.cal');
      expect(doc).toBeDefined();

      // Quoted TEMPORARY Record should be extracted
      expect(doc?.symbolTable.hasSymbol('Temp Sales Line Buffer')).toBe(true);
      expect(doc?.symbolTable.getSymbol('Temp Sales Line Buffer')?.kind).toBe('variable');
      expect(doc?.symbolTable.getSymbol('Temp Sales Line Buffer')?.type).toContain('Record');

      // Case-insensitive lookup with spaces
      expect(doc?.symbolTable.hasSymbol('temp sales line buffer')).toBe(true);
      expect(doc?.symbolTable.hasSymbol('TEMP SALES LINE BUFFER')).toBe(true);
    });

    it('should get all TEMPORARY Record symbols from all documents in context', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///tempCodeunitA.cal',
          content: `OBJECT Codeunit 50008 "Temp Handler A"
{
  CODE
  {
    VAR
      TempRecordA : TEMPORARY Record 18;

    PROCEDURE ProcessA@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///tempCodeunitB.cal',
          content: `OBJECT Codeunit 50009 "Temp Handler B"
{
  CODE
  {
    VAR
      TempRecordB : TEMPORARY Record 27;

    PROCEDURE ProcessB@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///tempCodeunitC.cal',
          content: `OBJECT Codeunit 50010 "Temp Handler C"
{
  CODE
  {
    VAR
      TempRecordC : TEMPORARY Record 36;

    PROCEDURE ProcessC@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const allSymbols = getAllSymbolsInContext(context);
      const variables = allSymbols.filter(s => s.symbol?.kind === 'variable');

      // Should have 3 TEMPORARY Record variables
      expect(variables.length).toBe(3);

      const variableNames = variables.map(s => s.symbol?.name);
      expect(variableNames).toContain('TempRecordA');  // Original case preserved
      expect(variableNames).toContain('TempRecordB');
      expect(variableNames).toContain('TempRecordC');

      // Verify each is from the correct file
      expect(findSymbolInContext(context, 'TempRecordA')?.uri).toBe('file:///tempCodeunitA.cal');
      expect(findSymbolInContext(context, 'TempRecordB')?.uri).toBe('file:///tempCodeunitB.cal');
      expect(findSymbolInContext(context, 'TempRecordC')?.uri).toBe('file:///tempCodeunitC.cal');
    });
  });
});

describe('Cross-File Page-Table References', () => {
  describe('Page SourceTable Property', () => {
    it('should parse Page with SourceTable property referencing Table', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///itemTable.cal',
          content: `OBJECT Table 27 Item
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 3   ;   ;Description     ;Text100       }
    { 18  ;   ;"Unit Price"    ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///itemCard.cal',
          content: `OBJECT Page 30 "Item Card"
{
  PROPERTIES
  {
    SourceTable=Table27;
  }
}`
        }
      ]);

      // Both documents should be successfully parsed
      expect(context.documents.size).toBe(2);

      const tableDoc = getDocument(context, 'file:///itemTable.cal');
      const pageDoc = getDocument(context, 'file:///itemCard.cal');

      expect(tableDoc).toBeDefined();
      expect(pageDoc).toBeDefined();

      // Verify Table object is parsed correctly
      expect(tableDoc?.ast.object?.objectKind).toBe('Table');
      expect(tableDoc?.ast.object?.objectId).toBe(27);
      expect(tableDoc?.ast.object?.objectName).toBe('Item');

      // Verify Page object is parsed correctly
      expect(pageDoc?.ast.object?.objectKind).toBe('Page');
      expect(pageDoc?.ast.object?.objectId).toBe(30);
      expect(pageDoc?.ast.object?.objectName).toBe('Item Card');

      // Verify Page has properties section with SourceTable
      expect(pageDoc?.ast.object?.properties).toBeDefined();
      const properties = pageDoc?.ast.object?.properties?.properties ?? [];
      expect(properties.length).toBeGreaterThan(0);

      const sourceTableProp = properties.find(p => p.name === 'SourceTable');
      expect(sourceTableProp).toBeDefined();
      expect(sourceTableProp?.value).toBe('Table27');
    });

    it('should parse Page with SourceTable and Table fields both available in context', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;"Credit Limit"  ;Decimal       }
    { 4   ;   ;Blocked         ;Option        }
  }
}`
        },
        {
          uri: 'file:///customerCard.cal',
          content: `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///customerTable.cal');
      const pageDoc = getDocument(context, 'file:///customerCard.cal');

      // Table fields should be available in the table's symbol table
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Name')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Credit Limit')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Blocked')).toBe(true);

      // Page should have SourceTable property pointing to Table18
      const props = pageDoc?.ast.object?.properties?.properties ?? [];
      const sourceTable = props.find(p => p.name === 'SourceTable');
      expect(sourceTable?.value).toBe('Table18');

      // The table's fields can be found via cross-file lookup
      const noField = findSymbolInContext(context, 'No.');
      expect(noField).toBeDefined();
      expect(noField?.uri).toBe('file:///customerTable.cal');
      expect(noField?.symbol?.kind).toBe('field');
    });

    it('should handle multiple Pages referencing the same Table', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///salesHeaderTable.cal',
          content: `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type" ;Option        }
    { 3   ;   ;"No."           ;Code20        }
    { 4   ;   ;"Bill-to Customer No.";Code20  }
    { 5   ;   ;"Bill-to Name"  ;Text100       }
  }
}`
        },
        {
          uri: 'file:///salesOrderPage.cal',
          content: `OBJECT Page 42 "Sales Order"
{
  PROPERTIES
  {
    SourceTable=Table36;
  }
}`
        },
        {
          uri: 'file:///salesListPage.cal',
          content: `OBJECT Page 9305 "Sales Order List"
{
  PROPERTIES
  {
    SourceTable=Table36;
  }
}`
        }
      ]);

      // All three documents should be parsed
      expect(context.documents.size).toBe(3);

      const tableDoc = getDocument(context, 'file:///salesHeaderTable.cal');
      const orderPage = getDocument(context, 'file:///salesOrderPage.cal');
      const listPage = getDocument(context, 'file:///salesListPage.cal');

      // Verify table has fields
      expect(tableDoc?.symbolTable.hasSymbol('Document Type')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Bill-to Customer No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Bill-to Name')).toBe(true);

      // Both pages reference the same table
      const orderProps = orderPage?.ast.object?.properties?.properties ?? [];
      const listProps = listPage?.ast.object?.properties?.properties ?? [];

      const orderSourceTable = orderProps.find(p => p.name === 'SourceTable');
      const listSourceTable = listProps.find(p => p.name === 'SourceTable');

      expect(orderSourceTable?.value).toBe('Table36');
      expect(listSourceTable?.value).toBe('Table36');
    });

    it('should parse Page with additional properties beyond SourceTable', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///itemTable.cal',
          content: `OBJECT Table 27 Item
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`
        },
        {
          uri: 'file:///itemCardPage.cal',
          content: `OBJECT Page 30 "Item Card"
{
  PROPERTIES
  {
    SourceTable=Table27;
    PageType=Card;
    Editable=Yes;
  }
}`
        }
      ]);

      const pageDoc = getDocument(context, 'file:///itemCardPage.cal');
      const props = pageDoc?.ast.object?.properties?.properties ?? [];

      expect(props.length).toBe(3);

      const sourceTable = props.find(p => p.name === 'SourceTable');
      const pageType = props.find(p => p.name === 'PageType');
      const editable = props.find(p => p.name === 'Editable');

      expect(sourceTable?.value).toBe('Table27');
      expect(pageType?.value).toBe('Card');
      expect(editable?.value).toBe('Yes');
    });
  });

  describe('Page and Table Field Bindings', () => {
    it('should find Table fields that match Page field references', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///vendorTable.cal',
          content: `OBJECT Table 23 Vendor
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 21  ;   ;"Phone No."     ;Text30        }
    { 102 ;   ;"E-Mail"        ;Text80        }
  }
}`
        },
        {
          uri: 'file:///vendorCard.cal',
          content: `OBJECT Page 26 "Vendor Card"
{
  PROPERTIES
  {
    SourceTable=Table23;
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///vendorTable.cal');

      // All table fields that would be referenced by Page
      const expectedFields = ['No.', 'Name', 'Phone No.', 'E-Mail'];

      for (const fieldName of expectedFields) {
        expect(tableDoc?.symbolTable.hasSymbol(fieldName)).toBe(true);
        const field = tableDoc?.symbolTable.getSymbol(fieldName);
        expect(field?.kind).toBe('field');
      }

      // Cross-file lookup should find all fields
      for (const fieldName of expectedFields) {
        const result = findSymbolInContext(context, fieldName);
        expect(result).toBeDefined();
        expect(result?.uri).toBe('file:///vendorTable.cal');
      }
    });

    it('should correctly identify field types from source Table', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///resourceTable.cal',
          content: `OBJECT Table 156 Resource
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Type            ;Option        }
    { 3   ;   ;Name            ;Text100       }
    { 13  ;   ;"Unit Price"    ;Decimal       }
    { 20  ;   ;"Unit of Measure Code";Code10  }
    { 55  ;   ;"Last Date Modified";Date      }
    { 95  ;   ;Blocked         ;Boolean       }
  }
}`
        },
        {
          uri: 'file:///resourceCard.cal',
          content: `OBJECT Page 76 "Resource Card"
{
  PROPERTIES
  {
    SourceTable=Table156;
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///resourceTable.cal');

      // Verify each field has the correct type
      expect(tableDoc?.symbolTable.getSymbol('No.')?.type).toBe('Code20');
      expect(tableDoc?.symbolTable.getSymbol('Type')?.type).toBe('Option');
      expect(tableDoc?.symbolTable.getSymbol('Name')?.type).toBe('Text100');
      expect(tableDoc?.symbolTable.getSymbol('Unit Price')?.type).toBe('Decimal');
      expect(tableDoc?.symbolTable.getSymbol('Unit of Measure Code')?.type).toBe('Code10');
      expect(tableDoc?.symbolTable.getSymbol('Last Date Modified')?.type).toBe('Date');
      expect(tableDoc?.symbolTable.getSymbol('Blocked')?.type).toBe('Boolean');
    });

    it('should handle quoted field names in Page-Table context', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///glAccountTable.cal',
          content: `OBJECT Table 15 "G/L Account"
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 9   ;   ;"Income/Balance";Option        }
    { 31  ;   ;"Debit/Credit"  ;Option        }
    { 61  ;   ;"VAT %"         ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///glAccountCard.cal',
          content: `OBJECT Page 17 "G/L Account Card"
{
  PROPERTIES
  {
    SourceTable=Table15;
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///glAccountTable.cal');

      // Fields with special characters should be found
      expect(tableDoc?.symbolTable.hasSymbol('Income/Balance')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Debit/Credit')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('VAT %')).toBe(true);

      // Cross-file lookup should work with quoted names
      expect(findSymbolInContext(context, 'Income/Balance')).toBeDefined();
      expect(findSymbolInContext(context, 'Debit/Credit')).toBeDefined();
      expect(findSymbolInContext(context, 'VAT %')).toBeDefined();
    });

    it('should find fields case-insensitively in Page-Table context', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///contactTable.cal',
          content: `OBJECT Table 5050 Contact
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 5   ;   ;"Company Name"  ;Text100       }
  }
}`
        },
        {
          uri: 'file:///contactCard.cal',
          content: `OBJECT Page 5050 "Contact Card"
{
  PROPERTIES
  {
    SourceTable=Table5050;
  }
}`
        }
      ]);

      // Case insensitive lookups should all work
      expect(findSymbolInContext(context, 'Name')).toBeDefined();
      expect(findSymbolInContext(context, 'NAME')).toBeDefined();
      expect(findSymbolInContext(context, 'name')).toBeDefined();

      expect(findSymbolInContext(context, 'Company Name')).toBeDefined();
      expect(findSymbolInContext(context, 'COMPANY NAME')).toBeDefined();
      expect(findSymbolInContext(context, 'company name')).toBeDefined();
    });
  });

  describe('Page-Table Cross-File Symbol Resolution', () => {
    it('should find all symbols from both Page and Table documents', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///employeeTable.cal',
          content: `OBJECT Table 5200 Employee
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;"First Name"    ;Text30        }
    { 3   ;   ;"Middle Name"   ;Text30        }
    { 4   ;   ;"Last Name"     ;Text30        }
  }
}`
        },
        {
          uri: 'file:///employeeCard.cal',
          content: `OBJECT Page 5200 "Employee Card"
{
  PROPERTIES
  {
    SourceTable=Table5200;
  }
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE ValidateEmployee@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const allSymbols = getAllSymbolsInContext(context);

      // Should find table fields
      const fieldSymbols = allSymbols.filter(s => s.symbol?.kind === 'field');
      expect(fieldSymbols.length).toBe(4);

      // Should find page code symbols (variable and procedure)
      const variableSymbols = allSymbols.filter(s => s.symbol?.kind === 'variable');
      const procedureSymbols = allSymbols.filter(s => s.symbol?.kind === 'procedure');

      expect(variableSymbols.length).toBe(1);
      expect(procedureSymbols.length).toBe(1);

      // Verify fields come from table
      for (const field of fieldSymbols) {
        expect(field.uri).toBe('file:///employeeTable.cal');
      }

      // Verify code symbols come from page
      expect(variableSymbols[0].uri).toBe('file:///employeeCard.cal');
      expect(procedureSymbols[0].uri).toBe('file:///employeeCard.cal');
    });

    it('should handle workspace with multiple Tables and their corresponding Pages', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///customerTable.cal',
          content: `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`
        },
        {
          uri: 'file:///vendorTable.cal',
          content: `OBJECT Table 23 Vendor
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`
        },
        {
          uri: 'file:///customerCard.cal',
          content: `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`
        },
        {
          uri: 'file:///vendorCard.cal',
          content: `OBJECT Page 26 "Vendor Card"
{
  PROPERTIES
  {
    SourceTable=Table23;
  }
}`
        }
      ]);

      expect(context.documents.size).toBe(4);

      // All documents should be parsed
      expect(getDocument(context, 'file:///customerTable.cal')).toBeDefined();
      expect(getDocument(context, 'file:///vendorTable.cal')).toBeDefined();
      expect(getDocument(context, 'file:///customerCard.cal')).toBeDefined();
      expect(getDocument(context, 'file:///vendorCard.cal')).toBeDefined();

      // Both tables have same field names - findSymbolInContext returns first match
      const noField = findSymbolInContext(context, 'No.');
      expect(noField).toBeDefined();

      // Fields exist in both tables
      const customerDoc = getDocument(context, 'file:///customerTable.cal');
      const vendorDoc = getDocument(context, 'file:///vendorTable.cal');

      expect(customerDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(vendorDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(customerDoc?.symbolTable.hasSymbol('Name')).toBe(true);
      expect(vendorDoc?.symbolTable.hasSymbol('Name')).toBe(true);
    });

    it('should handle Page without SourceTable (standalone Page)', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///roleCenterPage.cal',
          content: `OBJECT Page 9020 "Business Manager Role Center"
{
  PROPERTIES
  {
    PageType=RoleCenter;
  }
}`
        }
      ]);

      const pageDoc = getDocument(context, 'file:///roleCenterPage.cal');
      expect(pageDoc).toBeDefined();
      expect(pageDoc?.ast.object?.objectKind).toBe('Page');

      // Page has properties but no SourceTable
      const props = pageDoc?.ast.object?.properties?.properties ?? [];
      const sourceTable = props.find(p => p.name === 'SourceTable');
      expect(sourceTable).toBeUndefined();

      const pageType = props.find(p => p.name === 'PageType');
      expect(pageType?.value).toBe('RoleCenter');
    });

    it('should handle Table without corresponding Page', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///setupTable.cal',
          content: `OBJECT Table 98 "General Ledger Setup"
{
  FIELDS
  {
    { 1   ;   ;"Primary Key"   ;Code10        }
    { 2   ;   ;"Allow Posting From";Date      }
    { 3   ;   ;"Allow Posting To";Date        }
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///setupTable.cal');
      expect(tableDoc).toBeDefined();
      expect(tableDoc?.ast.object?.objectKind).toBe('Table');

      // Table fields should be accessible
      expect(tableDoc?.symbolTable.hasSymbol('Primary Key')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Allow Posting From')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Allow Posting To')).toBe(true);
    });

    it('should parse Page with CODE section containing procedures', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///itemTable.cal',
          content: `OBJECT Table 27 Item
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 3   ;   ;Description     ;Text100       }
  }
}`
        },
        {
          uri: 'file:///itemCardPage.cal',
          content: `OBJECT Page 30 "Item Card"
{
  PROPERTIES
  {
    SourceTable=Table27;
  }
  CODE
  {
    VAR
      TotalQuantity : Decimal;
      IsBlocked : Boolean;

    PROCEDURE UpdateStatistics@1();
    BEGIN
    END;

    LOCAL PROCEDURE CalculateTotal@2() : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///itemTable.cal');
      const pageDoc = getDocument(context, 'file:///itemCardPage.cal');

      // Table has fields
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Description')).toBe(true);

      // Page has variables and procedures
      expect(pageDoc?.symbolTable.hasSymbol('TotalQuantity')).toBe(true);
      expect(pageDoc?.symbolTable.hasSymbol('IsBlocked')).toBe(true);
      expect(pageDoc?.symbolTable.hasSymbol('UpdateStatistics')).toBe(true);
      expect(pageDoc?.symbolTable.hasSymbol('CalculateTotal')).toBe(true);

      // Verify types
      expect(pageDoc?.symbolTable.getSymbol('TotalQuantity')?.type).toBe('Decimal');
      expect(pageDoc?.symbolTable.getSymbol('IsBlocked')?.type).toBe('Boolean');
      expect(pageDoc?.symbolTable.getSymbol('UpdateStatistics')?.kind).toBe('procedure');
      expect(pageDoc?.symbolTable.getSymbol('CalculateTotal')?.kind).toBe('procedure');
    });

    it('should handle realistic multi-file workspace with Tables, Pages, and Codeunits', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///salesLineTable.cal',
          content: `OBJECT Table 37 "Sales Line"
{
  FIELDS
  {
    { 1   ;   ;"Document Type" ;Option        }
    { 3   ;   ;"Document No."  ;Code20        }
    { 4   ;   ;"Line No."      ;Integer       }
    { 6   ;   ;"No."           ;Code20        }
    { 11  ;   ;Description     ;Text100       }
    { 15  ;   ;Quantity        ;Decimal       }
    { 22  ;   ;"Unit Price"    ;Decimal       }
  }
}`
        },
        {
          uri: 'file:///salesLineSubpage.cal',
          content: `OBJECT Page 46 "Sales Order Subform"
{
  PROPERTIES
  {
    SourceTable=Table37;
    PageType=ListPart;
  }
  CODE
  {
    VAR
      TotalLineAmount : Decimal;

    PROCEDURE GetTotalAmount@1() : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///salesMgmtCodeunit.cal',
          content: `OBJECT Codeunit 80 "Sales-Post"
{
  CODE
  {
    VAR
      SalesLine : Record 37;
      PostingDate : Date;

    PROCEDURE RunPost@1();
    BEGIN
    END;

    LOCAL PROCEDURE CheckLine@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      expect(context.documents.size).toBe(3);

      // Table fields
      const tableDoc = getDocument(context, 'file:///salesLineTable.cal');
      expect(tableDoc?.symbolTable.hasSymbol('Document Type')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Quantity')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Unit Price')).toBe(true);

      // Page symbols
      const pageDoc = getDocument(context, 'file:///salesLineSubpage.cal');
      expect(pageDoc?.symbolTable.hasSymbol('TotalLineAmount')).toBe(true);
      expect(pageDoc?.symbolTable.hasSymbol('GetTotalAmount')).toBe(true);

      // Codeunit symbols
      const codeunitDoc = getDocument(context, 'file:///salesMgmtCodeunit.cal');
      expect(codeunitDoc?.symbolTable.hasSymbol('SalesLine')).toBe(true);
      expect(codeunitDoc?.symbolTable.hasSymbol('PostingDate')).toBe(true);
      expect(codeunitDoc?.symbolTable.hasSymbol('RunPost')).toBe(true);
      expect(codeunitDoc?.symbolTable.hasSymbol('CheckLine')).toBe(true);

      // Cross-file lookup
      const allSymbols = getAllSymbolsInContext(context);
      const fieldCount = allSymbols.filter(s => s.symbol?.kind === 'field').length;
      const variableCount = allSymbols.filter(s => s.symbol?.kind === 'variable').length;
      const procedureCount = allSymbols.filter(s => s.symbol?.kind === 'procedure').length;

      expect(fieldCount).toBe(7); // 7 table fields
      expect(variableCount).toBe(3); // 1 page var + 2 codeunit vars
      expect(procedureCount).toBe(3); // 1 page proc + 1 public codeunit proc + 1 LOCAL codeunit proc
    });
  });

  describe('Page-Table Edge Cases', () => {
    it('should handle Page with empty PROPERTIES section', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///emptyPropsPage.cal',
          content: `OBJECT Page 50000 "Empty Props Page"
{
  PROPERTIES
  {
  }
}`
        }
      ]);

      const pageDoc = getDocument(context, 'file:///emptyPropsPage.cal');
      expect(pageDoc).toBeDefined();
      expect(pageDoc?.ast.object?.objectKind).toBe('Page');

      const props = pageDoc?.ast.object?.properties?.properties ?? [];
      expect(props.length).toBe(0);
    });

    it('should handle Page with only CODE section (no PROPERTIES)', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///codeOnlyPage.cal',
          content: `OBJECT Page 50001 "Code Only Page"
{
  CODE
  {
    VAR
      MyVar : Integer;

    PROCEDURE MyProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        }
      ]);

      const pageDoc = getDocument(context, 'file:///codeOnlyPage.cal');
      expect(pageDoc).toBeDefined();
      expect(pageDoc?.symbolTable.hasSymbol('MyVar')).toBe(true);
      expect(pageDoc?.symbolTable.hasSymbol('MyProc')).toBe(true);
    });

    it('should handle Table with both FIELDS and CODE sections', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///tableWithCode.cal',
          content: `OBJECT Table 50000 "Custom Table"
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Description     ;Text100       }
  }
  CODE
  {
    VAR
      TotalCount : Integer;

    PROCEDURE Validate@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`
        },
        {
          uri: 'file:///customPage.cal',
          content: `OBJECT Page 50000 "Custom Card"
{
  PROPERTIES
  {
    SourceTable=Table50000;
  }
}`
        }
      ]);

      const tableDoc = getDocument(context, 'file:///tableWithCode.cal');

      // Table should have both fields and code symbols
      expect(tableDoc?.symbolTable.hasSymbol('No.')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Description')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('TotalCount')).toBe(true);
      expect(tableDoc?.symbolTable.hasSymbol('Validate')).toBe(true);

      // Verify types
      expect(tableDoc?.symbolTable.getSymbol('No.')?.kind).toBe('field');
      expect(tableDoc?.symbolTable.getSymbol('TotalCount')?.kind).toBe('variable');
      expect(tableDoc?.symbolTable.getSymbol('Validate')?.kind).toBe('procedure');
    });

    it('should handle SourceTable with different naming formats', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///page1.cal',
          content: `OBJECT Page 50001 "Page One"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`
        },
        {
          uri: 'file:///page2.cal',
          content: `OBJECT Page 50002 "Page Two"
{
  PROPERTIES
  {
    SourceTable=Table 18;
  }
}`
        },
        {
          uri: 'file:///page3.cal',
          content: `OBJECT Page 50003 "Page Three"
{
  PROPERTIES
  {
    SourceTable="Table18";
  }
}`
        }
      ]);

      // All three pages should parse successfully
      expect(context.documents.size).toBe(3);

      const page1 = getDocument(context, 'file:///page1.cal');
      const page2 = getDocument(context, 'file:///page2.cal');
      const page3 = getDocument(context, 'file:///page3.cal');

      expect(page1?.ast.object?.objectKind).toBe('Page');
      expect(page2?.ast.object?.objectKind).toBe('Page');
      expect(page3?.ast.object?.objectKind).toBe('Page');
    });

    it('should handle Page referencing non-existent Table gracefully', () => {
      const context = createMultiDocumentContext([
        {
          uri: 'file:///orphanPage.cal',
          content: `OBJECT Page 99999 "Orphan Page"
{
  PROPERTIES
  {
    SourceTable=Table99999;
  }
}`
        }
      ]);

      // Page should still parse even if Table doesn't exist
      const pageDoc = getDocument(context, 'file:///orphanPage.cal');
      expect(pageDoc).toBeDefined();
      expect(pageDoc?.ast.object?.objectKind).toBe('Page');

      const props = pageDoc?.ast.object?.properties?.properties ?? [];
      const sourceTable = props.find(p => p.name === 'SourceTable');
      expect(sourceTable?.value).toBe('Table99999');

      // No field symbols should be found in context
      const allSymbols = getAllSymbolsInContext(context);
      const fields = allSymbols.filter(s => s.symbol?.kind === 'field');
      expect(fields.length).toBe(0);
    });
  });
});

describe('Cross-File Test Infrastructure', () => {
  describe('Document Parsing', () => {
    it('should correctly parse Table objects', () => {
      const { ast, symbolTable } = parseAndBuildSymbols(`OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
  }
}`);

      expect(ast.object?.objectKind).toBe('Table');
      expect(ast.object?.objectId).toBe(18);
      expect(ast.object?.objectName).toBe('Customer');
      expect(symbolTable.hasSymbol('No.')).toBe(true);
      expect(symbolTable.hasSymbol('Name')).toBe(true);
      expect(symbolTable.hasSymbol('Balance')).toBe(true);
    });

    it('should correctly parse Codeunit objects', () => {
      const { ast, symbolTable } = parseAndBuildSymbols(`OBJECT Codeunit 50000 SalesManager
{
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE ProcessSales@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`);

      expect(ast.object?.objectKind).toBe('Codeunit');
      expect(ast.object?.objectId).toBe(50000);
      expect(ast.object?.objectName).toBe('SalesManager');
      expect(symbolTable.hasSymbol('Counter')).toBe(true);
      expect(symbolTable.hasSymbol('ProcessSales')).toBe(true);
    });

    it('should correctly parse Page objects', () => {
      const { ast } = parseAndBuildSymbols(`OBJECT Page 21 CustomerCard
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`);

      expect(ast.object?.objectKind).toBe('Page');
      expect(ast.object?.objectId).toBe(21);
      expect(ast.object?.objectName).toBe('CustomerCard');
    });
  });
});
