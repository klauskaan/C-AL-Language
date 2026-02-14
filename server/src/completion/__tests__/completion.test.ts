/**
 * Tests for Code Completion Provider
 * Tests Phases 1-4 of the implementation plan
 */

import { CompletionProvider } from '../completionProvider';
import { BUILTIN_FUNCTIONS, RECORD_METHODS } from '../builtins';
import { SymbolTable } from '../../symbols/symbolTable';
import { CompletionItemKind, CompletionItemTag, Position } from 'vscode-languageserver';
import { createMockToken, createDocument } from '../../__tests__/testUtils';

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
      expect(procItem?.kind).toBe(CompletionItemKind.Function);
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
});
