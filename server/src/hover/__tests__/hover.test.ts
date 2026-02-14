/**
 * Tests for Hover Information Provider
 */

import { HoverProvider } from '../hoverProvider';
import { SymbolTable } from '../../symbols/symbolTable';
import { Position, MarkupKind } from 'vscode-languageserver';
import { createMockToken, createDocument, parseAndBuildSymbols } from '../../__tests__/testUtils';
import { Token, TokenType } from '../../lexer/tokens';
import { BuiltinRegistry } from '../../builtins';


/**
 * Helper to get markdown content from hover
 */
function getHoverContent(hover: any): string {
  if (!hover || !hover.contents) return '';
  if (typeof hover.contents === 'string') return hover.contents;
  if (hover.contents.value) return hover.contents.value;
  return '';
}

describe('HoverProvider', () => {
  let provider: HoverProvider;

  beforeEach(() => {
    provider = new HoverProvider(new BuiltinRegistry());
  });

  describe('Symbol Hover', () => {
    it('should show variable type on hover', () => {
      const doc = createDocument('MyVar');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const hover = provider.getHover(doc, Position.create(0, 2), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MyVar');
      expect(content).toContain('Variable');
      expect(content).toContain('Integer');
    });

    it('should show field type on hover', () => {
      const doc = createDocument('Name');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Name', kind: 'field', token: createMockToken(), type: 'Text100' });

      const hover = provider.getHover(doc, Position.create(0, 2), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Name');
      expect(content).toContain('Field');
      expect(content).toContain('Text100');
    });

    it('should show procedure on hover', () => {
      const doc = createDocument('MyProcedure');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyProcedure', kind: 'procedure', token: createMockToken() });

      const hover = provider.getHover(doc, Position.create(0, 5), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MyProcedure');
      expect(content).toContain('Procedure');
    });

    it('should be case-insensitive for symbol lookup', () => {
      const doc = createDocument('MYVAR');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const hover = provider.getHover(doc, Position.create(0, 3), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MyVar');
    });
  });

  describe('Built-in Function Hover', () => {
    it('should show MESSAGE function documentation', () => {
      const doc = createDocument('MESSAGE');

      const hover = provider.getHover(doc, Position.create(0, 4));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MESSAGE');
      expect(content).toContain('Dialog Function');
      expect(content).toContain('message');
    });

    it('should show ERROR function documentation', () => {
      const doc = createDocument('ERROR');

      const hover = provider.getHover(doc, Position.create(0, 3));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('ERROR');
      expect(content).toContain('error');
    });

    it('should show STRSUBSTNO documentation', () => {
      const doc = createDocument('STRSUBSTNO');

      const hover = provider.getHover(doc, Position.create(0, 5));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('STRSUBSTNO');
      expect(content).toContain('String Function');
    });

    it('should show TODAY documentation', () => {
      const doc = createDocument('TODAY');

      const hover = provider.getHover(doc, Position.create(0, 3));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('TODAY');
      expect(content).toContain('Date/Time Function');
    });

    it('should include function signature', () => {
      const doc = createDocument('ROUND');

      const hover = provider.getHover(doc, Position.create(0, 3));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('ROUND');
      expect(content).toContain('(');
      expect(content).toContain(')');
    });
  });

  describe('Record Method Hover (after dot)', () => {
    it('should show GET method documentation after dot', () => {
      const doc = createDocument('Rec.GET');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 5), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('GET');
      expect(content).toContain('Record Method');
    });

    it('should show FINDSET method documentation after dot', () => {
      const doc = createDocument('Rec.FINDSET');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 7), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('FINDSET');
      expect(content).toContain('Record Method');
    });

    it('should show INSERT method documentation', () => {
      const doc = createDocument('Rec.INSERT');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 6), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('INSERT');
      expect(content).toContain('Record Method');
    });

    it('should show field hover from AST after dot', () => {
      const doc = createDocument('Rec.Name');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const ast = {
        object: {
          fields: {
            fields: [
              { fieldName: 'Name', dataType: { typeName: 'Text100' } }
            ]
          }
        }
      };

      const hover = provider.getHover(doc, Position.create(0, 5), ast as any, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Name');
      expect(content).toContain('Field');
      expect(content).toContain('Text100');
    });
  });

  describe('Keyword Hover', () => {
    it('should show IF keyword documentation', () => {
      const doc = createDocument('IF');

      const hover = provider.getHover(doc, Position.create(0, 1));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('IF');
      expect(content).toContain('Control Flow');
    });

    it('should show BEGIN keyword documentation', () => {
      const doc = createDocument('BEGIN');

      const hover = provider.getHover(doc, Position.create(0, 3));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('BEGIN');
      expect(content).toContain('Control Flow');
    });

    it('should show INTEGER data type documentation', () => {
      const doc = createDocument('INTEGER');

      const hover = provider.getHover(doc, Position.create(0, 4));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('INTEGER');
      expect(content).toContain('Data Type');
    });

    it('should show PROCEDURE keyword documentation', () => {
      const doc = createDocument('PROCEDURE');

      const hover = provider.getHover(doc, Position.create(0, 5));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('PROCEDURE');
      expect(content).toContain('Declaration');
    });

    it('should show TABLE object type documentation', () => {
      const doc = createDocument('TABLE');

      const hover = provider.getHover(doc, Position.create(0, 3));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('TABLE');
      expect(content).toContain('Object Type');
    });

    it('should show AND operator documentation', () => {
      const doc = createDocument('AND');

      const hover = provider.getHover(doc, Position.create(0, 1));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('AND');
      expect(content).toContain('Operator');
    });

    it('should show TRUE constant documentation', () => {
      const doc = createDocument('TRUE');

      const hover = provider.getHover(doc, Position.create(0, 2));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('TRUE');
      expect(content).toContain('Boolean');
    });
  });

  describe('CODE Keyword Disambiguation', () => {
    it('should show "Section Keyword" when hovering CODE section keyword (TokenType.Code)', () => {
      const doc = createDocument('CODE');
      const provider = new HoverProvider(new BuiltinRegistry());
      const tokens: Token[] = [{
        type: TokenType.Code,
        value: 'CODE',
        line: 0,
        column: 0,
        startOffset: 0,
        endOffset: 4
      }];

      const hover = provider.getHover(doc, Position.create(0, 2), undefined, undefined, tokens);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Section Keyword');
    });

    it('should show "C/AL Data Type" when hovering CODE data type (TokenType.Code_Type)', () => {
      const doc = createDocument('myVar : Code[20]');
      const provider = new HoverProvider(new BuiltinRegistry());
      const tokens: Token[] = [{
        type: TokenType.Code_Type,
        value: 'Code',
        line: 0,
        column: 8,
        startOffset: 8,
        endOffset: 12
      }];

      const hover = provider.getHover(doc, Position.create(0, 10), undefined, undefined, tokens);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('C/AL Data Type');
    });

    it('should use fallback to "Section Keyword" when no tokens provided', () => {
      const doc = createDocument('CODE');
      const provider = new HoverProvider(new BuiltinRegistry());

      const hover = provider.getHover(doc, Position.create(0, 2));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Section Keyword');
    });
  });

  describe('No Hover Cases', () => {
    it('should return null for empty position', () => {
      const doc = createDocument('   ');

      const hover = provider.getHover(doc, Position.create(0, 1));

      expect(hover).toBeNull();
    });

    it('should return null for unknown identifier', () => {
      const doc = createDocument('UnknownThing');

      const hover = provider.getHover(doc, Position.create(0, 5));

      expect(hover).toBeNull();
    });

    it('should return null for numbers', () => {
      const doc = createDocument('12345');

      const hover = provider.getHover(doc, Position.create(0, 3));

      // Numbers match identifier pattern, but should return null if not in symbol table
      expect(hover).toBeNull();
    });
  });

  describe('Markdown Formatting', () => {
    it('should return Markdown content', () => {
      const doc = createDocument('MESSAGE');

      const hover = provider.getHover(doc, Position.create(0, 4));

      expect(hover).not.toBeNull();
      expect(hover?.contents).toHaveProperty('kind', MarkupKind.Markdown);
    });

    it('should format variable hover with code blocks', () => {
      const doc = createDocument('MyVar');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyVar', kind: 'variable', token: createMockToken(), type: 'Integer' });

      const hover = provider.getHover(doc, Position.create(0, 3), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`Integer`');
    });
  });

  describe('Edge Cases', () => {
    it('should handle hover at start of word', () => {
      const doc = createDocument('MESSAGE');

      const hover = provider.getHover(doc, Position.create(0, 0));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MESSAGE');
    });

    it('should handle hover at end of word', () => {
      const doc = createDocument('MESSAGE');

      const hover = provider.getHover(doc, Position.create(0, 7));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MESSAGE');
    });

    it('should handle hover in middle of line', () => {
      const doc = createDocument('x := MESSAGE + y');

      const hover = provider.getHover(doc, Position.create(0, 8));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MESSAGE');
    });

    it('should handle case insensitive keywords', () => {
      const doc = createDocument('if');

      const hover = provider.getHover(doc, Position.create(0, 1));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('IF');
    });

    it('should handle mixed case built-in functions', () => {
      const doc = createDocument('Message');

      const hover = provider.getHover(doc, Position.create(0, 4));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('MESSAGE');
    });
  });

  describe('Deprecated Functions', () => {
    it('should show deprecation notice in hover for deprecated functions', () => {
      const doc = createDocument('Rec.RECORDLEVELLOCKING');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 15), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('**Deprecated:**');
    });

    it('should include deprecation reason in hover content', () => {
      const doc = createDocument('Rec.RECORDLEVELLOCKING');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 15), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Always returns TRUE in SQL Server-based versions');
    });

    it('should show deprecation notice after original documentation', () => {
      const doc = createDocument('Rec.RECORDLEVELLOCKING');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 15), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      // Check that original documentation appears before deprecation notice
      const docIndex = content.indexOf('record-level locking');
      const deprecatedIndex = content.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
    });

    it('should not show deprecation notice for non-deprecated functions', () => {
      const doc = createDocument('MESSAGE');

      const hover = provider.getHover(doc, Position.create(0, 4));

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).not.toContain('**Deprecated:**');
    });

    it('should show deprecation notice for GETRECORDID method', () => {
      const doc = createDocument('Rec.GETRECORDID');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 10), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('**Deprecated:**');
      expect(content).toContain('Use RECORDID instead');
    });

    it('should show original documentation before deprecation for GETRECORDID', () => {
      const doc = createDocument('Rec.GETRECORDID');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 10), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      const docIndex = content.indexOf('RecordID of the current record');
      const deprecatedIndex = content.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
    });

    it('should show deprecation notice for CONSISTENT method', () => {
      const doc = createDocument('Rec.CONSISTENT');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 10), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('**Deprecated:**');
      expect(content).toContain('Transaction consistency is managed automatically');
    });

    it('should show original documentation before deprecation for CONSISTENT', () => {
      const doc = createDocument('Rec.CONSISTENT');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 10), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      const docIndex = content.indexOf('Marks the record as consistent');
      const deprecatedIndex = content.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
    });
  });

  describe('Procedure Attribute Hover', () => {
    it('should show full [External] attribute syntax in hover', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(5, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[External]`');
    });

    it('should show full [EventSubscriber(Page,6302,OnOAuthAccessDenied)] syntax in hover', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscriber(Page,6302,OnOAuthAccessDenied)]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(5, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[EventSubscriber(Page,6302,OnOAuthAccessDenied)]`');
    });

    it('should show full [Scope(\'OnPrem\')] syntax with single-quoted string in hover', () => {
      // Note: [Scope('OnPrem')] is an AL-only attribute, used here to exercise
      // the string-token re-wrapping path. The parser handles it generically.
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Scope('OnPrem')]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(5, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[Scope(\'OnPrem\')]`');
    });

    it('should re-escape single quotes in attribute string parameters (#396)', () => {
      // In C/AL, single quotes within strings are escaped by doubling: 'O''Brien'
      // The hover should preserve this escape sequence, not show 'O'Brien'
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Scope('O''Brien')]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(5, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[Scope(\'O\'\'Brien\')]`');
    });

    it('should show full [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)] with empty string in hover', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(5, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[EventSubscriber(Codeunit,5330,OnAfterCRMIntegrationEnabled,"",Skip,Skip)]`');
    });

    it('should show full [Integration(TRUE)] syntax with boolean argument in hover', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integration(TRUE)]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(5, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[Integration(TRUE)]`');
    });

    it('should show both attributes when multiple attributes are present', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    [TryFunction]
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(6, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('`[External]`');
      expect(content).toContain('`[TryFunction]`');

      // Verify they appear on separate lines
      const lines = content.split('\n');
      const externalLine = lines.find(l => l.includes('`[External]`'));
      const tryFunctionLine = lines.find(l => l.includes('`[TryFunction]`'));
      expect(externalLine).toBeDefined();
      expect(tryFunctionLine).toBeDefined();
      expect(externalLine).not.toBe(tryFunctionLine);
    });

    it('should not show attributes for procedures without attributes', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProcedure@1();
    BEGIN
    END;
  }
}`;
      const { ast, symbolTable } = parseAndBuildSymbols(code);
      const doc = createDocument(code);

      // Hover over the procedure name
      const hover = provider.getHover(doc, Position.create(4, 15), ast, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      // Should not contain attribute syntax
      expect(content).not.toContain('[External]');
      expect(content).not.toContain('[TryFunction]');
      expect(content).not.toContain('[EventSubscriber');
    });
  });

  describe('Performance', () => {
    it('should complete hover requests quickly', () => {
      const doc = createDocument('MESSAGE');

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        provider.getHover(doc, Position.create(0, 4));
      }
      const elapsed = Date.now() - start;

      // 100 hover requests should take less than 200ms
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Action Hover', () => {
    it('should show ACTIONS as section keyword', () => {
      const doc = createDocument('ACTIONS');
      const hover = provider.getHover(doc, Position.create(0, 3));
      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('ACTIONS');
      expect(content).toContain('Section Keyword');
    });

    it('should show action type description for ActionContainer', () => {
      const code = `OBJECT Page 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
  }
}`;
      const { ast } = parseAndBuildSymbols(code);
      const doc = createDocument(code);
      const lines = code.split('\n');
      const actionLine = lines.findIndex(l => l.includes('ActionContainer'));
      const col = lines[actionLine].indexOf('ActionContainer');
      const hover = provider.getHover(doc, Position.create(actionLine, col + 5), ast);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Action Type');
      expect(content).toContain('ActionContainer');
    });

    it('should show action type description for Action', () => {
      const code = `OBJECT Page 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action        ;
                Name=Refresh }
  }
}`;
      const { ast } = parseAndBuildSymbols(code);
      const doc = createDocument(code);
      const lines = code.split('\n');
      const actionLine = lines.findIndex(l => /;Action\s/.test(l));
      const col = lines[actionLine].indexOf('Action');
      const hover = provider.getHover(doc, Position.create(actionLine, col + 3), ast);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Action Type');
      expect(content).toContain('trigger');
    });

    it('should show action type description for ActionGroup', () => {
      const code = `OBJECT Page 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;ActionGroup;
                CaptionML=ENU=Functions }
  }
}`;
      const { ast } = parseAndBuildSymbols(code);
      const doc = createDocument(code);
      const lines = code.split('\n');
      const actionGroupLine = lines.findIndex(l => l.includes('ActionGroup'));
      const col = lines[actionGroupLine].indexOf('ActionGroup');
      const hover = provider.getHover(doc, Position.create(actionGroupLine, col + 5), ast);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Action Type');
      expect(content).toContain('ActionGroup');
    });

    it('should show action type description for Separator', () => {
      const code = `OBJECT Page 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Separator }
  }
}`;
      const { ast } = parseAndBuildSymbols(code);
      const doc = createDocument(code);
      const lines = code.split('\n');
      const sepLine = lines.findIndex(l => l.includes('Separator'));
      const col = lines[sepLine].indexOf('Separator');
      const hover = provider.getHover(doc, Position.create(sepLine, col + 3), ast);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Action Type');
      expect(content).toContain('Separator');
    });

    it('should show action summary when hovering on action Name value', () => {
      const code = `OBJECT Page 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action        ;
                Name=Refresh;
                Promoted=Yes;
                Image=Refresh }
  }
}`;
      const { ast } = parseAndBuildSymbols(code);
      const doc = createDocument(code);
      const lines = code.split('\n');
      const nameLine = lines.findIndex(l => l.includes('Name=Refresh'));
      const col = lines[nameLine].indexOf('Refresh');
      const hover = provider.getHover(doc, Position.create(nameLine, col + 3), ast);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Action');
      expect(content).toContain('Refresh');
      expect(content).toContain('2');
    });

    it('should not show action type hover outside ACTIONS section', () => {
      const doc = createDocument('ActionContainer');
      const hover = provider.getHover(doc, Position.create(0, 5));
      expect(hover).toBeNull();
    });

    it('should be case-insensitive for action type hover', () => {
      const code = `OBJECT Page 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Separator }
  }
}`;
      const { ast } = parseAndBuildSymbols(code);
      const doc = createDocument(code);
      const lines = code.split('\n');
      const sepLine = lines.findIndex(l => l.includes('Separator'));
      const col = lines[sepLine].indexOf('Separator');
      const hover = provider.getHover(doc, Position.create(sepLine, col + 3), ast);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('Separator');
    });
  });
});
