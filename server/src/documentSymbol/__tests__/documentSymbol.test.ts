import { DocumentSymbolProvider } from '../documentSymbolProvider';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolKind } from 'vscode-languageserver';

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
  const ast = parser.parse();
  return { ast, parser };
}

describe('DocumentSymbolProvider', () => {
  let provider: DocumentSymbolProvider;

  beforeEach(() => {
    provider = new DocumentSymbolProvider();
  });

  describe('Basic Functionality', () => {
    it('should return empty array for empty file', () => {
      const code = '';
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols).toEqual([]);
    });

    it('should return root symbol for object declaration', () => {
      const code = `OBJECT Table 50000 Test
{
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      expect(symbols[0].name).toBe('Table 50000 "Test"');
      expect(symbols[0].kind).toBe(SymbolKind.Class);
    });

    it('should handle different object types', () => {
      const testCases = [
        { code: 'OBJECT Table 50000 Test\n{\n}', expected: 'Table 50000 "Test"' },
        { code: 'OBJECT Codeunit 50000 Test\n{\n}', expected: 'Codeunit 50000 "Test"' },
        { code: 'OBJECT Page 50000 Test\n{\n}', expected: 'Page 50000 "Test"' },
        { code: 'OBJECT Report 50000 Test\n{\n}', expected: 'Report 50000 "Test"' },
        { code: 'OBJECT Query 50000 Test\n{\n}', expected: 'Query 50000 "Test"' },
        { code: 'OBJECT XMLport 50000 Test\n{\n}', expected: 'XMLport 50000 "Test"' },
      ];

      for (const { code, expected } of testCases) {
        const doc = createDocument(code);
        const { ast } = parseContent(code);
        const symbols = provider.getDocumentSymbols(doc, ast);

        expect(symbols.length).toBe(1);
        expect(symbols[0].name).toBe(expected);
      }
    });
  });

  describe('Field Section', () => {
    it('should include FIELDS group for table with fields', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      expect(symbols[0].children).toBeDefined();

      const fieldsGroup = symbols[0].children?.find(c => c.name === 'FIELDS');
      expect(fieldsGroup).toBeDefined();
      expect(fieldsGroup?.kind).toBe(SymbolKind.Namespace);
      expect(fieldsGroup?.children?.length).toBe(2);
    });

    it('should show field details with type information', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const fieldsGroup = symbols[0].children?.find(c => c.name === 'FIELDS');
      const field = fieldsGroup?.children?.[0];

      expect(field?.name).toBe('1 "No."');
      expect(field?.kind).toBe(SymbolKind.Field);
      expect(field?.detail).toBe('Code[20]');
    });
  });

  describe('Keys Section', () => {
    it('should include KEYS group for table with keys', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
  KEYS
  {
    {    ;"No."                  ;Clustered=Yes }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const keysGroup = symbols[0].children?.find(c => c.name === 'KEYS');
      expect(keysGroup).toBeDefined();
      expect(keysGroup?.kind).toBe(SymbolKind.Namespace);
      expect(keysGroup?.children?.length).toBe(1);
      expect(keysGroup?.children?.[0].kind).toBe(SymbolKind.Key);
    });
  });

  describe('Code Section', () => {
    it('should include PROCEDURES group for codeunit with procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    PROCEDURE AnotherProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      expect(proceduresGroup).toBeDefined();
      expect(proceduresGroup?.kind).toBe(SymbolKind.Namespace);
      expect(proceduresGroup?.children?.length).toBe(2);
    });

    it('should show procedure signature with parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Param1@1000 : Integer;VAR Param2@1001 : Text);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('TestProc(Param1: Integer; VAR Param2: Text)');
      expect(proc?.kind).toBe(SymbolKind.Method);
    });

    it('should show procedure return type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFunc@1() : Boolean;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const func = proceduresGroup?.children?.[0];

      expect(func?.name).toBe('TestFunc() : Boolean');
    });

    it('should show LOCAL prefix for local procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE LocalProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('LOCAL LocalProc()');
    });

    it('should include TRIGGERS group for object with triggers', () => {
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
      const symbols = provider.getDocumentSymbols(doc, ast);

      const triggersGroup = symbols[0].children?.find(c => c.name === 'TRIGGERS');
      expect(triggersGroup).toBeDefined();
      expect(triggersGroup?.kind).toBe(SymbolKind.Namespace);
      expect(triggersGroup?.children?.length).toBe(1);
      expect(triggersGroup?.children?.[0].name).toBe('OnRun');
      expect(triggersGroup?.children?.[0].kind).toBe(SymbolKind.Event);
    });

    it('should include VAR group for global variables', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      GlobalVar@1000 : Integer;
      AnotherVar@1001 : Text;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const varGroup = symbols[0].children?.find(c => c.name === 'VAR');
      expect(varGroup).toBeDefined();
      expect(varGroup?.kind).toBe(SymbolKind.Namespace);
      expect(varGroup?.children?.length).toBe(2);

      const globalVar = varGroup?.children?.[0];
      expect(globalVar?.name).toBe('GlobalVar');
      expect(globalVar?.kind).toBe(SymbolKind.Variable);
      expect(globalVar?.detail).toBe('Integer');
    });

    it('should NOT show local variables in procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      LocalVar@1000 : Integer;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      // Should NOT have a VAR group (no global variables)
      const varGroup = symbols[0].children?.find(c => c.name === 'VAR');
      expect(varGroup).toBeUndefined();

      // Procedure should NOT have children (local vars not shown)
      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];
      expect(proc?.children).toBeUndefined();
    });
  });

  describe('Hierarchical Structure', () => {
    it('should create proper hierarchy for complete table', () => {
      const code = `OBJECT Table 50000 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
  KEYS
  {
    {    ;"No."                  ;Clustered=Yes }
  }
  CODE
  {
    VAR
      TempRec@1000 : Record 50000;

    PROCEDURE ValidateNo@1();
    BEGIN
    END;

    TRIGGER OnInsert@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const root = symbols[0];

      expect(root.name).toBe('Table 50000 "Customer"');
      expect(root.children?.length).toBe(5); // FIELDS, KEYS, VAR, TRIGGERS, PROCEDURES

      const groups = root.children!.map(c => c.name);
      expect(groups).toContain('FIELDS');
      expect(groups).toContain('KEYS');
      expect(groups).toContain('VAR');
      expect(groups).toContain('TRIGGERS');
      expect(groups).toContain('PROCEDURES');
    });
  });

  describe('Range Information', () => {
    it('should have correct range for object (0-based lines)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      // Object starts on line 1 (0-based: 0)
      expect(symbols[0].range.start.line).toBe(0);
      expect(symbols[0].selectionRange.start.line).toBe(0);
    });

    it('should have valid range and selectionRange', () => {
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
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      // All ranges should be valid
      expect(proc?.range).toBeDefined();
      expect(proc?.selectionRange).toBeDefined();
      expect(proc?.range.start.line).toBeGreaterThanOrEqual(0);
      expect(proc?.range.end.line).toBeGreaterThanOrEqual(proc?.range.start.line ?? 0);
    });
  });

  describe('Procedure Attributes', () => {
    it('should display simple [External] attribute in procedure name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('[External] TestProc()');
    });

    it('should display parameterized attribute with full syntax', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscriber(Page,6302,OnOAuthAccessDenied)]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('[EventSubscriber(Page,6302,OnOAuthAccessDenied)] TestProc()');
    });

    it('should display attribute with string parameter preserving quotes', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Scope('OnPrem')]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('[Scope(\'OnPrem\')] TestProc()');
    });

    it('should display attribute with empty string parameter as ""', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('[EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)] TestProc()');
    });

    it('should display attribute with boolean argument', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integration(TRUE)]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('[Integration(TRUE)] TestProc()');
    });

    it('should display multiple attributes on same procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    [TryFunction]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('[External] [TryFunction] TestProc()');
    });

    it('should not display attributes for procedures without attributes (regression)', () => {
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
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('TestProc()');
    });
  });

  describe('Edge Cases', () => {
    it('should handle object with no sections', () => {
      const code = `OBJECT Codeunit 50000 Empty
{
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      expect(symbols[0].name).toBe('Codeunit 50000 "Empty"');
      expect(symbols[0].children).toEqual([]);
    });

    it('should handle quoted object names', () => {
      const code = `OBJECT Table 50000 "Sales Header"
{
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols[0].name).toBe('Table 50000 "Sales Header"');
    });

    it('should handle table with only fields (no code section)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const fieldsGroup = symbols[0].children?.find(c => c.name === 'FIELDS');
      expect(fieldsGroup).toBeDefined();
      expect(fieldsGroup?.children?.length).toBe(1);
    });
  });

  describe('Actions Section', () => {
    it('should include ACTIONS group for page with top-level ACTIONS section', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                Name=ActionItems }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      expect(actionsGroup).toBeDefined();
      expect(actionsGroup?.kind).toBe(SymbolKind.Namespace);
      expect(actionsGroup?.children?.length).toBe(1);
    });

    it('should show action type, ID, and Name in symbol name', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                Name=ActionItems }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      const action = actionsGroup?.children?.[0];

      expect(action?.name).toBe('ActionContainer 1 "ActionItems"');
      expect(action?.kind).toBe(SymbolKind.Event);
    });

    it('should show action type and ID only when Name property is missing', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 5   ;1   ;Separator }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      const action = actionsGroup?.children?.[0];

      expect(action?.name).toBe('Separator 5');
      expect(action?.kind).toBe(SymbolKind.Event);
    });

    it('should create hierarchical nesting based on indent level', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                Name=ActionItems }
    { 2   ;1   ;ActionGroup;
                Name=Functions }
    { 3   ;2   ;Action;
                Name=Refresh }
    { 4   ;2   ;Action;
                Name=Delete }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      expect(actionsGroup?.children?.length).toBe(1);

      const actionContainer = actionsGroup?.children?.[0];
      expect(actionContainer?.name).toBe('ActionContainer 1 "ActionItems"');
      expect(actionContainer?.children?.length).toBe(1);

      const actionGroup = actionContainer?.children?.[0];
      expect(actionGroup?.name).toBe('ActionGroup 2 "Functions"');
      expect(actionGroup?.children?.length).toBe(2);

      const action1 = actionGroup?.children?.[0];
      const action2 = actionGroup?.children?.[1];
      expect(action1?.name).toBe('Action 3 "Refresh"');
      expect(action2?.name).toBe('Action 4 "Delete"');
    });

    it('should include ACTIONS group for inline ActionList from property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                ContainerType=ContentArea }
    { 2   ;1   ;Group ;
                GroupType=CueGroup;
                ActionList=ACTIONS
                {
                  { 3   ;    ;Action    ;
                                  Name=CueAction }
                } }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      expect(actionsGroup).toBeDefined();
      expect(actionsGroup?.kind).toBe(SymbolKind.Namespace);
    });
  });

  describe('Controls Section', () => {
    it('should include CONTROLS group for page with CONTROLS section', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                ContainerType=ContentArea }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      expect(controlsGroup).toBeDefined();
      expect(controlsGroup?.kind).toBe(SymbolKind.Namespace);
      expect(controlsGroup?.children?.length).toBe(1);
    });

    it('should show control type, ID, and Name in symbol name', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                Name=ContentArea;
                ContainerType=ContentArea }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      const control = controlsGroup?.children?.[0];

      expect(control?.name).toBe('Container 1 "ContentArea"');
      expect(control?.kind).toBe(SymbolKind.Struct);
    });

    it('should show control type and ID only when Name property is missing', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 3   ;2   ;Field;
                SourceExpr="No." }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      const control = controlsGroup?.children?.[0];

      expect(control?.name).toBe('Field 3');
      expect(control?.kind).toBe(SymbolKind.Struct);
    });

    it('should create hierarchical nesting based on indent level', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                ContainerType=ContentArea }
    { 2   ;1   ;Group;
                Name=General;
                GroupType=Group }
    { 3   ;2   ;Field;
                Name=No;
                SourceExpr="No." }
    { 4   ;2   ;Field;
                Name=CustomerName;
                SourceExpr=Name }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      expect(controlsGroup?.children?.length).toBe(1);

      const container = controlsGroup?.children?.[0];
      expect(container?.name).toBe('Container 1');
      expect(container?.children?.length).toBe(1);

      const group = container?.children?.[0];
      expect(group?.name).toBe('Group 2 "General"');
      expect(group?.children?.length).toBe(2);

      const field1 = group?.children?.[0];
      const field2 = group?.children?.[1];
      expect(field1?.name).toBe('Field 3 "No"');
      expect(field2?.name).toBe('Field 4 "CustomerName"');
    });

    it('should use SymbolKind.Struct for individual control symbols', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                ContainerType=ContentArea }
    { 2   ;1   ;Group;
                Name=General }
    { 3   ;2   ;Field;
                Name=No }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');

      const container = controlsGroup?.children?.[0];
      expect(container?.kind).toBe(SymbolKind.Struct);

      const group = container?.children?.[0];
      expect(group?.kind).toBe(SymbolKind.Struct);

      const field = group?.children?.[0];
      expect(field?.kind).toBe(SymbolKind.Struct);
    });

    it('should handle page with both CONTROLS and ACTIONS sections', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                ContainerType=ContentArea }
  }
  ACTIONS
  {
    { 2   ;0   ;ActionContainer;
                Name=ActionItems }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      expect(controlsGroup).toBeDefined();
      expect(controlsGroup?.children?.length).toBe(1);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      expect(actionsGroup).toBeDefined();
      expect(actionsGroup?.children?.length).toBe(1);
    });

    it('should promote inline ActionList from multiple CueGroups to separate root-level ACTIONS groups', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container;
                ContainerType=ContentArea }
    { 2   ;1   ;Group ;
                GroupType=CueGroup;
                ActionList=ACTIONS
                {
                  { 3   ;    ;Action    ;
                                  Name=FirstCueAction }
                } }
    { 4   ;1   ;Group ;
                GroupType=CueGroup;
                ActionList=ACTIONS
                {
                  { 5   ;    ;Action    ;
                                  Name=SecondCueAction }
                } }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);

      // Both inline ActionList sections are promoted to root-level ACTIONS groups
      const actionsGroups = symbols[0].children?.filter(c => c.name === 'ACTIONS');
      expect(actionsGroups?.length).toBe(2);

      expect(actionsGroups?.[0].children?.length).toBe(1);
      expect(actionsGroups?.[0].children?.[0].name).toBe('Action 3 "FirstCueAction"');

      expect(actionsGroups?.[1].children?.length).toBe(1);
      expect(actionsGroups?.[1].children?.[0].name).toBe('Action 5 "SecondCueAction"');
    });
  });

  describe('case-insensitive property names', () => {
    it('should show action Name with lowercase name property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action        ;
                name=MyAction }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      const actionContainer = actionsGroup?.children?.[0];
      const action = actionContainer?.children?.[0];

      expect(action?.name).toBe('Action 2 "MyAction"');
      expect(action?.kind).toBe(SymbolKind.Event);
    });

    it('should show action Name with mixed case name property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action        ;
                NaMe=TestAction }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      const actionContainer = actionsGroup?.children?.[0];
      const action = actionContainer?.children?.[0];

      expect(action?.name).toBe('Action 2 "TestAction"');
      expect(action?.kind).toBe(SymbolKind.Event);
    });

    it('should show action Name with uppercase NAME property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action        ;
                NAME=ActionItem }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const actionsGroup = symbols[0].children?.find(c => c.name === 'ACTIONS');
      const actionContainer = actionsGroup?.children?.[0];
      const action = actionContainer?.children?.[0];

      expect(action?.name).toBe('Action 2 "ActionItem"');
      expect(action?.kind).toBe(SymbolKind.Event);
    });

    it('should show control Name with lowercase name property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  CONTROLS
  {
    { 1   ;0   ;Container;
                name=MyContainer;
                ContainerType=ContentArea }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      const control = controlsGroup?.children?.[0];

      expect(control?.name).toBe('Container 1 "MyContainer"');
      expect(control?.kind).toBe(SymbolKind.Struct);
    });

    it('should show control Name with mixed case name property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  CONTROLS
  {
    { 1   ;0   ;Group;
                NaMe=TestGroup;
                GroupType=Group }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      const control = controlsGroup?.children?.[0];

      expect(control?.name).toBe('Group 1 "TestGroup"');
      expect(control?.kind).toBe(SymbolKind.Struct);
    });

    it('should show control Name with uppercase NAME property', () => {
      const code = `OBJECT Page 50000 "Test Page"
{
  CONTROLS
  {
    { 1   ;0   ;Field;
                NAME=CustomerName;
                SourceExpr=Name }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const controlsGroup = symbols[0].children?.find(c => c.name === 'CONTROLS');
      const control = controlsGroup?.children?.[0];

      expect(control?.name).toBe('Field 1 "CustomerName"');
      expect(control?.kind).toBe(SymbolKind.Struct);
    });
  });
});
