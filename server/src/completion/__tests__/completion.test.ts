/**
 * Tests for Code Completion Provider
 * Tests Phases 1-4 of the implementation plan
 */

import { CompletionProvider } from '../completionProvider';
import { BUILTIN_FUNCTIONS, RECORD_METHODS } from '../builtins';
import { ACTION_TYPES } from '../actionCompletions';
import { SymbolTable } from '../../symbols/symbolTable';
import { CompletionItemKind, CompletionItemTag, Position } from 'vscode-languageserver';
import { createMockToken, createDocument, parseAndBuildSymbols } from '../../__tests__/testUtils';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { makeSortText, SortBucket } from '../sortText';

describe('CompletionProvider', () => {
  let provider: CompletionProvider;

  beforeEach(() => {
    provider = new CompletionProvider();
  });

  describe('Phase 1: Keyword Completion', () => {
    it('should return keyword completions', () => {
      const doc = createDocument('PRO');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      // Should have multiple items
      expect(items.length).toBeGreaterThan(0);
    });

    it('should complete PROCEDURE for prefix "PRO"', () => {
      const doc = createDocument('PRO');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const procedureItem = items.find(i => i.label === 'PROCEDURE');
      expect(procedureItem).toBeDefined();
      expect(procedureItem?.kind).toBe(CompletionItemKind.Keyword);
    });

    it('should complete IF keyword', () => {
      const doc = createDocument('IF');
      const items = provider.getCompletions(doc, Position.create(0, 2));

      const ifItem = items.find(i => i.label === 'IF');
      expect(ifItem).toBeDefined();
      expect(ifItem?.kind).toBe(CompletionItemKind.Keyword);
    });

    it('should be case-insensitive', () => {
      const doc1 = createDocument('pro');
      const doc2 = createDocument('PRO');
      const doc3 = createDocument('Pro');

      const items1 = provider.getCompletions(doc1, Position.create(0, 3));
      const items2 = provider.getCompletions(doc2, Position.create(0, 3));
      const items3 = provider.getCompletions(doc3, Position.create(0, 3));

      // All should find PROCEDURE
      expect(items1.some(i => i.label === 'PROCEDURE')).toBe(true);
      expect(items2.some(i => i.label === 'PROCEDURE')).toBe(true);
      expect(items3.some(i => i.label === 'PROCEDURE')).toBe(true);
    });

    it('should return all keywords when no prefix', () => {
      const doc = createDocument('');
      const items = provider.getCompletions(doc, Position.create(0, 0));

      // Should include major keywords
      expect(items.some(i => i.label === 'IF')).toBe(true);
      expect(items.some(i => i.label === 'BEGIN')).toBe(true);
      expect(items.some(i => i.label === 'END')).toBe(true);
      expect(items.some(i => i.label === 'PROCEDURE')).toBe(true);
    });

    it('should complete data types', () => {
      const doc = createDocument('INT');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const integerItem = items.find(i => i.label === 'INTEGER');
      expect(integerItem).toBeDefined();
      expect(integerItem?.kind).toBe(CompletionItemKind.TypeParameter);
    });

    it('should include object types', () => {
      const doc = createDocument('TAB');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const tableItem = items.find(i => i.label === 'TABLE');
      expect(tableItem).toBeDefined();
      expect(tableItem?.kind).toBe(CompletionItemKind.Class);
    });

    it('should provide detail for keywords', () => {
      const doc = createDocument('');
      const items = provider.getCompletions(doc, Position.create(0, 0));

      const ifItem = items.find(i => i.label === 'IF');
      expect(ifItem?.detail).toBe('Control Flow');

      const intItem = items.find(i => i.label === 'INTEGER');
      expect(intItem?.detail).toBe('Data Type');
    });
  });

  describe('CODE Keyword Disambiguation', () => {
    it('should provide CODE twice with different details (Section and Data Type)', () => {
      const doc = createDocument('');
      const provider = new CompletionProvider();
      const completions = provider.getCompletions(doc, Position.create(0, 0));

      const codeItems = completions.filter(c => c.label === 'CODE');
      expect(codeItems.length).toBe(2);

      const sectionItem = codeItems.find(c => c.detail === 'Section');
      const dataTypeItem = codeItems.find(c => c.detail === 'Data Type');

      expect(sectionItem).toBeDefined();
      expect(sectionItem?.kind).toBe(CompletionItemKind.Keyword);
      expect(sectionItem?.documentation).toBe('CODE section marker for procedures and triggers');

      expect(dataTypeItem).toBeDefined();
      expect(dataTypeItem?.kind).toBe(CompletionItemKind.TypeParameter);
      expect(dataTypeItem?.documentation).toBe('CODE data type for alphanumeric strings with fixed or variable length');
    });
  });

  describe('Phase 2: Global Symbol Completion', () => {
    it('should include symbols from symbol table when provided', () => {
      const doc = createDocument('My');

      // Create a mock symbol table with symbols
      const symbolTable = new SymbolTable();
      // Manually add symbols for testing (parser may not extract from all formats)
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });
      symbolTable.getRootScope().addSymbol({ name: 'MyProcedure', kind: 'procedure', token: createMockToken() });

      const items = provider.getCompletions(doc, Position.create(0, 2), undefined, symbolTable);

      const varItem = items.find(i => i.label === 'MyVar');
      expect(varItem).toBeDefined();
      expect(varItem?.kind).toBe(CompletionItemKind.Variable);
    });

    it('should include field symbols', () => {
      const doc = createDocument('No');

      // Create a mock symbol table with field symbols
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'No.', kind: 'field', token: createMockToken(), type: 'Code10' });
      symbolTable.getRootScope().addSymbol({ name: 'Name', kind: 'field', token: createMockToken(), type: 'Text100' });

      const items = provider.getCompletions(doc, Position.create(0, 2), undefined, symbolTable);

      const noField = items.find(i => i.label === 'No.');
      expect(noField).toBeDefined();
      expect(noField?.kind).toBe(CompletionItemKind.Field);
    });

    it('should include procedure symbols', () => {
      const doc = createDocument('My');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyProcedure', kind: 'procedure', token: createMockToken() });

      const items = provider.getCompletions(doc, Position.create(0, 2), undefined, symbolTable);

      const procItem = items.find(i => i.label === 'MyProcedure');
      expect(procItem).toBeDefined();
      expect(procItem?.kind).toBe(CompletionItemKind.Method);
    });

    it('should include action symbols with Event kind', () => {
      const doc = createDocument('Get');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'GetFileStructure', kind: 'action', token: createMockToken() });

      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const actionItem = items.find(i => i.label === 'GetFileStructure');
      expect(actionItem).toBeDefined();
      expect(actionItem?.kind).toBe(CompletionItemKind.Event);
    });

    it('should filter symbols by prefix', () => {
      const doc = createDocument('Na');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'No.', kind: 'field', token: createMockToken(), type: 'Code10' });
      symbolTable.getRootScope().addSymbol({ name: 'Name', kind: 'field', token: createMockToken(), type: 'Text100' });
      symbolTable.getRootScope().addSymbol({ name: 'Address', kind: 'field', token: createMockToken(), type: 'Text100' });

      const items = provider.getCompletions(doc, Position.create(0, 2), undefined, symbolTable);

      const nameField = items.find(i => i.label === 'Name');
      expect(nameField).toBeDefined();

      // Address should NOT match "Na" prefix
      const addressField = items.find(i => i.label === 'Address');
      expect(addressField).toBeUndefined();
    });

    it('should show symbol type in detail', () => {
      const doc = createDocument('');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const items = provider.getCompletions(doc, Position.create(0, 0), undefined, symbolTable);

      const varItem = items.find(i => i.label === 'MyVar');
      expect(varItem?.detail).toBe('Integer');
    });
  });

  describe('Phase 3: Built-in Functions', () => {
    it('should include MESSAGE function', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem).toBeDefined();
      expect(messageItem?.kind).toBe(CompletionItemKind.Function);
    });

    it('should include ERROR function', () => {
      const doc = createDocument('ERR');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const errorItem = items.find(i => i.label === 'ERROR');
      expect(errorItem).toBeDefined();
    });

    it('should include CONFIRM function', () => {
      const doc = createDocument('CON');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const confirmItem = items.find(i => i.label === 'CONFIRM');
      expect(confirmItem).toBeDefined();
    });

    it('should show signature in detail', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem?.detail).toContain('(');
      expect(messageItem?.detail).toContain(')');
    });

    it('should include documentation', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem?.documentation).toBeDefined();
      expect(typeof messageItem?.documentation).toBe('string');
    });

    it('should include string functions', () => {
      const doc = createDocument('STR');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      expect(items.some(i => i.label === 'STRSUBSTNO')).toBe(true);
      expect(items.some(i => i.label === 'STRLEN')).toBe(true);
      expect(items.some(i => i.label === 'STRPOS')).toBe(true);
    });

    it('should include date functions', () => {
      const doc = createDocument('TOD');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      expect(items.some(i => i.label === 'TODAY')).toBe(true);
    });
  });

  describe('Phase 4: Dot Trigger', () => {
    it('should show Record methods after dot trigger', () => {
      // Simulate typing "Rec." and triggering completion with dot
      const doc = createDocument('Rec.');

      // Create symbol table with a Record variable
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      // Trigger with '.' character
      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      // Should include Record methods
      expect(items.some(i => i.label === 'GET')).toBe(true);
      expect(items.some(i => i.label === 'FIND')).toBe(true);
      expect(items.some(i => i.label === 'FINDSET')).toBe(true);
      expect(items.some(i => i.label === 'INSERT')).toBe(true);
      expect(items.some(i => i.label === 'MODIFY')).toBe(true);
      expect(items.some(i => i.label === 'DELETE')).toBe(true);
    });

    it('should show Record methods with signatures', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const getItem = items.find(i => i.label === 'GET');
      expect(getItem?.detail).toContain('Boolean');
    });

    it('should filter by prefix after dot', () => {
      // Simulate typing "Rec.FI"
      const doc = createDocument('Rec.FI');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      // Position after "FI" - isAfterDot should detect the dot
      const items = provider.getCompletions(doc, Position.create(0, 6), undefined, symbolTable);

      // Should include FIND, FINDSET, FINDFIRST, FINDLAST, FIELDERROR, etc.
      expect(items.some(i => i.label === 'FIND')).toBe(true);
      expect(items.some(i => i.label === 'FINDSET')).toBe(true);
      expect(items.some(i => i.label === 'FINDFIRST')).toBe(true);

      // Should NOT include GET (doesn't start with FI)
      expect(items.some(i => i.label === 'GET')).toBe(false);
    });

    it('should show fallback Record methods when no symbol context', () => {
      // Just typing after a dot with no recognized symbol
      const doc = createDocument('Unknown.');

      const items = provider.getCompletions(doc, Position.create(0, 8), undefined, undefined, '.');

      // Should still show Record methods as fallback
      expect(items.some(i => i.label === 'GET')).toBe(true);
      expect(items.some(i => i.label === 'FIND')).toBe(true);
    });

    it('should include table fields when AST has fields', () => {
      const doc = createDocument('Rec.');

      // Create symbol table with a Record variable
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      // Create mock AST with fields
      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'No.', dataType: { typeName: 'Code10' } },
              { fieldName: 'Name', dataType: { typeName: 'Text100' } }
            ]
          }
        }
      };

      const items = provider.getCompletions(doc, Position.create(0, 4), ast as any, symbolTable, '.');

      // Should include fields from AST
      expect(items.some(i => i.label === 'No.')).toBe(true);
      expect(items.some(i => i.label === 'Name')).toBe(true);

      // Should also include Record methods
      expect(items.some(i => i.label === 'GET')).toBe(true);
    });

    it('should quote field names with spaces', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      // Create mock AST with field containing spaces
      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'Line No.', dataType: { typeName: 'Integer' } }
            ]
          }
        }
      };

      const items = provider.getCompletions(doc, Position.create(0, 4), ast as any, symbolTable, '.');

      const lineNoItem = items.find(i => i.label === 'Line No.');
      expect(lineNoItem).toBeDefined();
      expect(lineNoItem?.insertText).toBe('"Line No."');
    });
  });

  describe('Builtins Data', () => {
    it('should have valid BUILTIN_FUNCTIONS array', () => {
      expect(Array.isArray(BUILTIN_FUNCTIONS)).toBe(true);
      expect(BUILTIN_FUNCTIONS.length).toBeGreaterThan(40);
    });

    it('should have valid RECORD_METHODS array', () => {
      expect(Array.isArray(RECORD_METHODS)).toBe(true);
      expect(RECORD_METHODS.length).toBeGreaterThan(40);
    });

    it('should have required properties for each builtin', () => {
      for (const func of BUILTIN_FUNCTIONS) {
        expect(func.name).toBeDefined();
        expect(func.signature).toBeDefined();
        expect(func.documentation).toBeDefined();
        expect(func.category).toBeDefined();
      }
    });

    it('should have required properties for each record method', () => {
      for (const method of RECORD_METHODS) {
        expect(method.name).toBeDefined();
        expect(method.signature).toBeDefined();
        expect(method.documentation).toBeDefined();
        expect(method.category).toBe('record');
      }
    });
  });

  describe('Deprecated Functions', () => {
    it('should apply CompletionItemTag.Deprecated to deprecated functions', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const recordLevelLockingItem = items.find(i => i.label === 'RECORDLEVELLOCKING');
      expect(recordLevelLockingItem).toBeDefined();
      expect(recordLevelLockingItem?.tags).toContain(CompletionItemTag.Deprecated);
    });

    it('should append deprecation text to completion item documentation', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const recordLevelLockingItem = items.find(i => i.label === 'RECORDLEVELLOCKING');
      expect(recordLevelLockingItem).toBeDefined();
      expect(recordLevelLockingItem?.documentation).toContain('**Deprecated:**');
      expect(recordLevelLockingItem?.documentation).toContain('Always returns TRUE in SQL Server-based versions');
    });

    it('should include original documentation before deprecation notice', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const recordLevelLockingItem = items.find(i => i.label === 'RECORDLEVELLOCKING');
      expect(recordLevelLockingItem).toBeDefined();
      const documentation = recordLevelLockingItem?.documentation as string;
      const docIndex = documentation.indexOf('record-level locking');
      const deprecatedIndex = documentation.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
    });

    it('should not apply deprecated tag to non-deprecated functions', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem).toBeDefined();
      expect(messageItem?.tags).toBeUndefined();
    });

    it('should apply CompletionItemTag.Deprecated to GETRECORDID', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const getRecordIdItem = items.find(i => i.label === 'GETRECORDID');
      expect(getRecordIdItem).toBeDefined();
      expect(getRecordIdItem?.tags).toContain(CompletionItemTag.Deprecated);
    });

    it('should append deprecation text to GETRECORDID documentation', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const getRecordIdItem = items.find(i => i.label === 'GETRECORDID');
      expect(getRecordIdItem).toBeDefined();
      expect(getRecordIdItem?.documentation).toContain('**Deprecated:**');
      expect(getRecordIdItem?.documentation).toContain('Use RECORDID instead');
    });

    it('should include original documentation before deprecation for GETRECORDID', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const getRecordIdItem = items.find(i => i.label === 'GETRECORDID');
      expect(getRecordIdItem).toBeDefined();
      const documentation = getRecordIdItem?.documentation as string;
      const docIndex = documentation.indexOf('RecordID of the current record');
      const deprecatedIndex = documentation.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
    });

    it('should apply CompletionItemTag.Deprecated to CONSISTENT', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const consistentItem = items.find(i => i.label === 'CONSISTENT');
      expect(consistentItem).toBeDefined();
      expect(consistentItem?.tags).toContain(CompletionItemTag.Deprecated);
    });

    it('should append deprecation text to CONSISTENT documentation', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const consistentItem = items.find(i => i.label === 'CONSISTENT');
      expect(consistentItem).toBeDefined();
      expect(consistentItem?.documentation).toContain('**Deprecated:**');
      expect(consistentItem?.documentation).toContain('Transaction consistency is managed automatically');
    });

    it('should include original documentation before deprecation for CONSISTENT', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const consistentItem = items.find(i => i.label === 'CONSISTENT');
      expect(consistentItem).toBeDefined();
      const documentation = consistentItem?.documentation as string;
      const docIndex = documentation.indexOf('Marks the record as consistent');
      const deprecatedIndex = documentation.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
    });
  });

  describe('Performance', () => {
    it('should complete in reasonable time', () => {
      const doc = createDocument('');

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        provider.getCompletions(doc, Position.create(0, 0));
      }
      const elapsed = Date.now() - start;

      // 100 completions should take less than 500ms
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Visual Polish — Icons (Issue #783)', () => {
    it('should use Method kind for procedure symbols', () => {
      const doc = createDocument('My');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyProcedure', kind: 'procedure', token: createMockToken() });

      const items = provider.getCompletions(doc, Position.create(0, 2), undefined, symbolTable);

      const procItem = items.find(i => i.label === 'MyProcedure');
      expect(procItem).toBeDefined();
      expect(procItem?.kind).toBe(CompletionItemKind.Method);
    });

    it('should use Function kind for MESSAGE builtin (regression guard)', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem).toBeDefined();
      expect(messageItem?.kind).toBe(CompletionItemKind.Function);
    });

    it('should use Method kind for dot-completion record method GET', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const getItem = items.find(i => i.label === 'GET');
      expect(getItem).toBeDefined();
      expect(getItem?.kind).toBe(CompletionItemKind.Method);
    });
  });

  describe('Visual Polish — Rich Detail from resolvedType (Issue #783)', () => {
    it('should show Code[20] in detail and labelDetails.detail for a parsed Code[20] variable', () => {
      // parseAndBuildSymbols populates resolvedType for variables declared in real C/AL source.
      // Cursor is placed inside the BEGIN...END of the procedure so DocNo is in scope.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TestCU
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      DocNo@1000 : Code[20];
    BEGIN

    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Line 8 = blank line inside BEGIN...END
      const items = provider.getCompletions(doc, Position.create(8, 0), ast, symbolTable);

      const docNoItem = items.find(i => i.label === 'DocNo');
      expect(docNoItem).toBeDefined();
      expect(docNoItem?.detail).toBe('Code[20]');
      expect(docNoItem?.labelDetails?.detail).toBe(': Code[20]');
    });

    it('should show Option in detail for a parsed Option variable (resolvedType populated)', () => {
      // In C/AL, Option local variables are declared as: Status@1000 : Option;
      // resolvedType is populated as OptionType { kind: 'option', values: [] }
      // The completion provider intentionally calls typeToString NON-verbose so an
      // Option renders as a clean 'Option' inline (C#-style: show the type, not its
      // members), rather than a long 'Option (A, B, C, ...)' value list that would
      // clutter the completion row.
      // Cursor is placed inside the BEGIN...END so Status is in scope.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TestCU
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Status@1000 : Option;
    BEGIN

    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Line 8 = blank line inside BEGIN...END
      const items = provider.getCompletions(doc, Position.create(8, 0), ast, symbolTable);

      const statusItem = items.find(i => i.label === 'Status');
      expect(statusItem).toBeDefined();
      // resolvedType is set → detail comes from typeToString (not symbol.type)
      // For an Option type, typeToString returns 'Option' (no values = no parens)
      expect(statusItem?.detail).toBeDefined();
      expect(statusItem?.labelDetails?.detail).toBe(': Option');
    });

    it('should show Record 18 in labelDetails.detail for a parsed Record variable', () => {
      // Cursor is placed inside the BEGIN...END so Customer is in scope.
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TestCU
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Customer@1000 : Record 18;
    BEGIN

    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Line 8 = blank line inside BEGIN...END
      const items = provider.getCompletions(doc, Position.create(8, 0), ast, symbolTable);

      const custItem = items.find(i => i.label === 'Customer');
      expect(custItem).toBeDefined();
      expect(custItem?.labelDetails?.detail).toBe(': Record 18');
    });

    it('should fall back to symbol.type when resolvedType is absent (hand-built symbol)', () => {
      // Hand-built symbol: no resolvedType, only type string
      const doc = createDocument('');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const items = provider.getCompletions(doc, Position.create(0, 0), undefined, symbolTable);

      const varItem = items.find(i => i.label === 'MyVar');
      expect(varItem?.detail).toBe('Integer');
    });

    it('should show "procedure" in detail for a user procedure symbol (no labelDetails — no double-kind)', () => {
      const doc = createDocument('');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'CalcAmount', kind: 'procedure', token: createMockToken() });

      const items = provider.getCompletions(doc, Position.create(0, 0), undefined, symbolTable);

      const procItem = items.find(i => i.label === 'CalcAmount');
      expect(procItem).toBeDefined();
      expect(procItem?.detail).toBe('procedure');
      expect(procItem?.labelDetails).toBeUndefined();
    });
  });

  describe('Visual Polish — sortText Ordering (Issue #783)', () => {
    it('should prefix local variable sortText with "0", builtin with "2", keyword with "3"', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TestCU
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      MyVar@1000 : Integer;
    BEGIN

    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Position inside the BEGIN...END body so MyVar is in scope (line 8 = blank line)
      const items = provider.getCompletions(doc, Position.create(8, 0), ast, symbolTable);

      const varItem = items.find(i => i.label === 'MyVar');
      const messageItem = items.find(i => i.label === 'MESSAGE');
      const ifItem = items.find(i => i.label === 'IF');

      expect(varItem?.sortText).toBeDefined();
      expect(messageItem?.sortText).toBeDefined();
      expect(ifItem?.sortText).toBeDefined();

      // String comparison: '0...' < '2...' < '3...'
      expect(varItem!.sortText!.startsWith('0')).toBe(true);
      expect(messageItem!.sortText!.startsWith('2')).toBe(true);
      expect(ifItem!.sortText!.startsWith('3')).toBe(true);
      expect(varItem!.sortText! < messageItem!.sortText!).toBe(true);
      expect(messageItem!.sortText! < ifItem!.sortText!).toBe(true);
    });

    it('should sort builtins case-insensitively within bucket (ERROR < MESSAGE)', () => {
      const doc = createDocument('');
      const items = provider.getCompletions(doc, Position.create(0, 0));

      const errorItem = items.find(i => i.label === 'ERROR');
      const messageItem = items.find(i => i.label === 'MESSAGE');

      expect(errorItem?.sortText).toBeDefined();
      expect(messageItem?.sortText).toBeDefined();
      // Both in bucket 2; lowercase 'error' < 'message'
      expect(errorItem!.sortText).toBe('2error');
      expect(messageItem!.sortText).toBe('2message');
      expect(errorItem!.sortText! < messageItem!.sortText!).toBe(true);
    });

    it('should assign bucket "1" to both dot field and dot GET, sorted alphabetically together', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'Description', dataType: { typeName: 'Text50' } }
            ]
          }
        }
      };

      const items = provider.getCompletions(doc, Position.create(0, 4), ast as any, symbolTable, '.');

      const descItem = items.find(i => i.label === 'Description');
      const getItem = items.find(i => i.label === 'GET');

      expect(descItem?.sortText).toBeDefined();
      expect(getItem?.sortText).toBeDefined();
      expect(descItem!.sortText!.startsWith('1')).toBe(true);
      expect(getItem!.sortText!.startsWith('1')).toBe(true);
      // Alphabetical within bucket: 'description' < 'get'
      expect(descItem!.sortText! < getItem!.sortText!).toBe(true);
    });

    it('should use unquoted lowercase field name for spaced-field sortText', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'Description', dataType: { typeName: 'Text50' } },
              { fieldName: 'Document Type', dataType: { typeName: 'Option' } }
            ]
          }
        }
      };

      const items = provider.getCompletions(doc, Position.create(0, 4), ast as any, symbolTable, '.');

      const docTypeItem = items.find(i => i.label === 'Document Type');
      const descItem = items.find(i => i.label === 'Description');

      expect(docTypeItem?.sortText).toBe('1document type');
      expect(descItem?.sortText).toBe('1description');
      // Alphabetical: 'description' < 'document type'
      expect(descItem!.sortText! < docTypeItem!.sortText!).toBe(true);
    });

    it('should sort local variable before procedure before MESSAGE end-to-end', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TestCU
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      LocalVar@1000 : Integer;
    BEGIN

    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Position the cursor inside the BEGIN...END of MyProc so that
      // LocalVar is in scope (line 8 = the blank line between BEGIN and END)
      const items = provider.getCompletions(doc, Position.create(8, 0), ast, symbolTable);

      const localVarItem = items.find(i => i.label === 'LocalVar');
      const myProcItem = items.find(i => i.label === 'MyProc');
      const messageItem = items.find(i => i.label === 'MESSAGE');

      expect(localVarItem?.sortText).toBeDefined();
      expect(myProcItem?.sortText).toBeDefined();
      expect(messageItem?.sortText).toBeDefined();

      // Sort the three items by sortText and assert ordering
      const sorted = [localVarItem!, myProcItem!, messageItem!]
        .sort((a, b) => a.sortText!.localeCompare(b.sortText!));

      expect(sorted[0].label).toBe('LocalVar');
      expect(sorted[1].label).toBe('MyProc');
      expect(sorted[2].label).toBe('MESSAGE');
    });
  });

  describe('Visual Polish — labelDetails (Issue #783)', () => {
    it('should add labelDetails.description with category for keyword IF', () => {
      const doc = createDocument('');
      const items = provider.getCompletions(doc, Position.create(0, 0));

      const ifItem = items.find(i => i.label === 'IF');
      expect(ifItem).toBeDefined();
      // IF is Control Flow — category is 'Control Flow'
      expect(ifItem?.labelDetails?.description).toBe('Control Flow');
    });

    it('should add labelDetails.detail and description for MESSAGE builtin', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem).toBeDefined();
      // Signature is param-only, assigned directly from func.signature
      expect(messageItem?.labelDetails?.detail).toBe('(String [, Value1, ...])');
      expect(messageItem?.labelDetails?.description).toBe('builtin');
    });

    it('should add labelDetails.detail and description for dot GET record method', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const getItem = items.find(i => i.label === 'GET');
      expect(getItem).toBeDefined();
      expect(getItem?.labelDetails?.detail).toBe('([Value1, Value2, ...]): Boolean');
      expect(getItem?.labelDetails?.description).toBe('record method');
    });

    it('should not throw and should set labelDetails.detail to empty string for DIALOG (empty signature)', () => {
      const doc = createDocument('DIAL');
      expect(() => {
        provider.getCompletions(doc, Position.create(0, 4));
      }).not.toThrow();

      const items = provider.getCompletions(doc, Position.create(0, 4));
      const dialogItem = items.find(i => i.label === 'DIALOG');
      expect(dialogItem).toBeDefined();
      expect(dialogItem?.labelDetails?.detail).toBe('');
      expect(dialogItem?.labelDetails?.description).toBe('builtin');
    });
  });

  describe('Visual Polish — sortText Completeness (Issue #783)', () => {
    it('should set sortText on every item for a populated top-level document', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 TestCU
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Amt@1000 : Decimal;
    BEGIN

    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Line 8 = blank line inside BEGIN...END (Amt in scope; TestProc at root)
      const items = provider.getCompletions(doc, Position.create(8, 0), ast, symbolTable);

      expect(items.length).toBeGreaterThan(0);
      const missingSort = items.filter(i => i.sortText === undefined);
      expect(missingSort).toHaveLength(0);
    });

    it('should set sortText on every item in a dot completion context', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'No.', dataType: { typeName: 'Code20' } }
            ]
          }
        }
      };

      const items = provider.getCompletions(doc, Position.create(0, 4), ast as any, symbolTable, '.');

      expect(items.length).toBeGreaterThan(0);
      const missingSort = items.filter(i => i.sortText === undefined);
      expect(missingSort).toHaveLength(0);
    });
  });

  describe('Visual Polish — Mutation Hazard Guard (Issue #783)', () => {
    it('should not mutate ACTION_TYPES length and should produce stable keyword sortText across two calls', () => {
      const initialLength = ACTION_TYPES.length;

      const { ast } = parseAndBuildSymbols(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {

  }
  CODE
  {
    BEGIN
    END.
  }
}`);
      const doc = createDocument('');

      // First call (result unused — exercises mutation hazard only)
      provider.getCompletions(doc, Position.create(0, 0), ast);
      // Second call
      const items2 = provider.getCompletions(doc, Position.create(0, 0), ast);

      // ACTION_TYPES length must be unchanged after completions are served
      expect(ACTION_TYPES.length).toBe(initialLength);

      // Keyword IF sortText must be exactly '3if' after both calls
      const ifItem = items2.find(i => i.label === 'IF');
      expect(ifItem?.sortText).toBe('3if');
    });
  });

  describe('WITH Statement — Scope Boundary Guard (Issue #790)', () => {
    // Helper: parse and build symbols with a cross-object field registry.
    // Returns ast, symbolTable, and document for use in tests.
    // prettier-ignore
    // Location assertions depend on fixture structure - do not reformat
    const codeunitWithCode = `OBJECT Codeunit 99 CrossObjWith
{
  CODE
  {
    PROCEDURE TestWith@1();
    VAR
      Cust@1000 : Record 18;
    BEGIN
      WITH Cust DO BEGIN
        Cust.INSERT;
      END;
      Cust.FIND('-');
    END;
  }
}`;
    // 'CustName' maps to table 18. It is NOT a root-scope symbol — only injected
    // inside the WITH body. This lets the tests distinguish scope-leak from live access.
    const fieldRegistry = new Map([[18, new Map([['CUSTNAME', { originalName: 'CustName', typeName: 'Text50' }]])]]);

    it('cross-object WITH field is offered inside the WITH body (positive)', () => {
      // Proves that injectWithScopes actually injects CustName at the right scope offset
      const lexer = new Lexer(codeunitWithCode);
      const tokens = lexer.tokenize();
      const ast = new Parser(tokens).parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast, undefined, fieldRegistry);
      const doc = createDocument(codeunitWithCode);

      // Line 9 = '        Cust.INSERT;' — inside the WITH body
      // Location assertions depend on fixture structure - do not reformat
      const items = provider.getCompletions(doc, Position.create(9, 8), ast, symbolTable);

      const custNameItems = items.filter(i => i.label === 'CustName');
      expect(custNameItems).toHaveLength(1);
      expect(custNameItems[0].kind).toBe(CompletionItemKind.Field);
    });

    it('cross-object WITH field is NOT leaked past the WITH END (no-leak)', () => {
      // Proves that the WITH scope is bounded: CustName disappears after END.
      // Without bounding, CustName would appear at line 11 (after WITH...END).
      const lexer = new Lexer(codeunitWithCode);
      const tokens = lexer.tokenize();
      const ast = new Parser(tokens).parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast, undefined, fieldRegistry);
      const doc = createDocument(codeunitWithCode);

      // Line 11 = '      Cust.FIND(\'\');' — after the WITH...END block
      // Location assertions depend on fixture structure - do not reformat
      const items = provider.getCompletions(doc, Position.create(11, 6), ast, symbolTable);

      const custNameItems = items.filter(i => i.label === 'CustName');
      expect(custNameItems).toHaveLength(0);
    });
  });

  describe('Visual Polish — insertText Regression Guard (Issue #783)', () => {
    it('should preserve quoted insertText for spaced field names', () => {
      const doc = createDocument('Rec.');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'Line No.', dataType: { typeName: 'Integer' } }
            ]
          }
        }
      };

      const items = provider.getCompletions(doc, Position.create(0, 4), ast as any, symbolTable, '.');

      const lineNoItem = items.find(i => i.label === 'Line No.');
      expect(lineNoItem?.insertText).toBe('"Line No."');
    });

    it('should use bare name (no parens) as insertText for a procedure symbol', () => {
      const doc = createDocument('');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'CalcAmount', kind: 'procedure', token: createMockToken() });

      const items = provider.getCompletions(doc, Position.create(0, 0), undefined, symbolTable);

      const procItem = items.find(i => i.label === 'CalcAmount');
      expect(procItem?.insertText).toBe('CalcAmount');
    });

    it('should use bare name (no parens) as insertText for MESSAGE builtin', () => {
      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3));

      const messageItem = items.find(i => i.label === 'MESSAGE');
      expect(messageItem?.insertText).toBe('MESSAGE');
    });
  });

  describe('Issue #785: builtin/user-symbol de-duplication', () => {
    it('A — local variable shadows same-named builtin (count + identity)', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MESSAGE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].kind).toBe(CompletionItemKind.Variable);
      expect(msg[0].labelDetails?.description).not.toBe('builtin');
    });

    it('B — procedure with different case shadows same-named builtin', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Message', kind: 'procedure', token: createMockToken() });

      const doc = createDocument('Mes');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].label).toBe('Message');
      expect(msg[0].kind).toBe(CompletionItemKind.Method);
      expect(msg[0].labelDetails?.description).not.toBe('builtin');
    });

    it('C — negative baseline: no user symbol means builtin survives (no over-suppression)', () => {
      const symbolTable = new SymbolTable();

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].kind).toBe(CompletionItemKind.Function);
      expect(msg[0].labelDetails?.description).toBe('builtin');
    });

    it('D — non-colliding user symbol does not suppress unrelated builtin', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const doc = createDocument('M');
      const items = provider.getCompletions(doc, Position.create(0, 1), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg.some(i => i.labelDetails?.description === 'builtin')).toBe(true);
      expect(msg).toHaveLength(1);
      expect(items.some(i => i.label === 'MyVar')).toBe(true);
    });

    it('E — empty-prefix: variable still shadows builtin when no prefix is typed', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MESSAGE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('');
      const items = provider.getCompletions(doc, Position.create(0, 0), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].kind).toBe(CompletionItemKind.Variable);
      expect(msg[0].labelDetails?.description).not.toBe('builtin');
    });

    it('F — strict-prefix: user symbol MES does not suppress builtin MESSAGE', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MES', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].labelDetails?.description).toBe('builtin');
      expect(items.some(i => i.label === 'MES')).toBe(true);
    });

    it('G — field collision suppresses builtin', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MESSAGE', kind: 'field', token: createMockToken(), type: 'Text50' });

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].kind).toBe(CompletionItemKind.Field);
      expect(msg[0].labelDetails?.description).not.toBe('builtin');
    });

    it('H — action kind does NOT suppress builtin (kind-gate proof)', () => {
      // Before the kind-gate fix this passes trivially (no suppression); after the fix it passes ONLY because actions are excluded from SHADOWS_BUILTIN. If the gate regresses to blanket suppression, H fails.
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MESSAGE', kind: 'action', token: createMockToken() });

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(2);
      expect(msg.some(i => i.labelDetails?.description === 'builtin')).toBe(true);
      expect(msg.some(i => i.kind === CompletionItemKind.Event)).toBe(true);
    });

    it('I — parameter shadows same-named builtin (allow-list coverage)', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MESSAGE', kind: 'parameter', token: createMockToken(), type: 'Text' });

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const msg = items.filter(i => i.label.toLowerCase() === 'message');
      expect(msg).toHaveLength(1);
      expect(msg[0].kind).toBe(CompletionItemKind.Variable);
      expect(msg[0].labelDetails?.description).not.toBe('builtin');
    });
  });

  describe('Issue #809: SYSTEM-qualified fallback rows', () => {
    // Positive tests — these assert that a SYSTEM.EVALUATE row IS emitted when EVALUATE
    // is shadowed. They fail before implementation because no such row is produced yet.

    it('emits SYSTEM.EVALUATE when EVALUATE is shadowed by a variable', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();
    });

    it('SYSTEM.EVALUATE row has Function kind and correct detail', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();
      expect(systemRow!.kind).toBe(CompletionItemKind.Function);
      expect(systemRow!.detail).toBe('(Variable, String [, FormatNumber]): Boolean');
      expect(systemRow!.labelDetails?.description).toBe('SYSTEM-qualified builtin');
    });

    it('SYSTEM.EVALUATE row has insertText === "SYSTEM.EVALUATE"', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();
      expect(systemRow!.insertText).toBe('SYSTEM.EVALUATE');
    });

    it('SYSTEM.EVALUATE row has filterText === "EVALUATE" (surfaces when user types the bare name)', () => {
      // filterText is the bare name so the row surfaces when the user types what they expect.
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();
      expect(systemRow!.filterText).toBe('EVALUATE');
    });

    it('SYSTEM.EVALUATE row has sortText === makeSortText(SortBucket.Builtin, "EVALUATE")', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();
      expect(systemRow!.sortText).toBe(makeSortText(SortBucket.Builtin, 'EVALUATE'));
    });

    it('emits SYSTEM.EVALUATE on empty prefix when EVALUATE is shadowed', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('');
      const items = provider.getCompletions(doc, Position.create(0, 0), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();
    });

    it('coexists: user symbol row present, bare builtin gone, SYSTEM row present', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Evaluate', kind: 'procedure', token: createMockToken() });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const userRow = items.find(i => i.label === 'Evaluate');
      expect(userRow).toBeDefined();
      expect(userRow!.kind).toBe(CompletionItemKind.Method);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeDefined();

      const bareBuiltin = items.find(i => i.label === 'EVALUATE' && i.labelDetails?.description === 'builtin');
      expect(bareBuiltin).toBeUndefined();
    });

    it('sort order: user symbol row sorts before SYSTEM.EVALUATE row (Member < Builtin bucket)', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Evaluate', kind: 'procedure', token: createMockToken() });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const userRow = items.find(i => i.label === 'Evaluate');
      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(userRow).toBeDefined();
      expect(systemRow).toBeDefined();
      expect(userRow!.sortText! < systemRow!.sortText!).toBe(true);
    });

    // Negative tests — absence guards. Several of these pass pre-implementation
    // because the feature does not yet exist; that is expected and is NOT a red flag.

    it('no SYSTEM row when EVALUATE is NOT shadowed (bare builtin row is present)', () => {
      const symbolTable = new SymbolTable();

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeUndefined();

      const bareBuiltin = items.find(i => i.label === 'EVALUATE' && i.labelDetails?.description === 'builtin');
      expect(bareBuiltin).toBeDefined();
    });

    it('no SYSTEM.MESSAGE row when MESSAGE is shadowed (MESSAGE is not in SYSTEM_QUALIFIABLE)', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MESSAGE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('MES');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.MESSAGE');
      expect(systemRow).toBeUndefined();

      const userRow = items.find(i => i.label === 'MESSAGE');
      expect(userRow).toBeDefined();
    });

    it('no SYSTEM.STRLEN row when STRLEN is shadowed (STRLEN is not in SYSTEM_QUALIFIABLE)', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'STRLEN', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const doc = createDocument('STR');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.STRLEN');
      expect(systemRow).toBeUndefined();
    });

    it('no SYSTEM.* rows in member-access context (after dot)', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const doc = createDocument('Rec.');
      const items = provider.getCompletions(doc, Position.create(0, 4), undefined, symbolTable, '.');

      const systemItems = items.filter(i => i.label.startsWith('SYSTEM.'));
      expect(systemItems).toHaveLength(0);
    });

    it('no duplicate SYSTEM.EVALUATE rows when EVALUATE is shadowed', () => {
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('EVA');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRows = items.filter(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRows).toHaveLength(1);
    });

    it('prefix "SYS" does not surface SYSTEM.EVALUATE (emission gates on the bare name, not "SYSTEM.")', () => {
      // Server-side, the SYSTEM row is only emitted when the bare builtin name matches the prefix
      // (func.name.toLowerCase().startsWith(prefix)). 'evaluate'.startsWith('sys') === false, so the
      // row is never emitted for 'SYS'. (filterText='EVALUATE' additionally aligns VS Code's
      // client-side filtering with the bare name.)
      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'EVALUATE', kind: 'variable', token: createMockToken(), type: 'Text' });

      const doc = createDocument('SYS');
      const items = provider.getCompletions(doc, Position.create(0, 3), undefined, symbolTable);

      const systemRow = items.find(i => i.label === 'SYSTEM.EVALUATE');
      expect(systemRow).toBeUndefined();
    });
  });
});
