/**
 * Tests for Hover Information Provider
 */

import { HoverProvider } from '../hoverProvider';
import { SymbolTable } from '../../symbols/symbolTable';
import { Position, MarkupKind } from 'vscode-languageserver';
import { createMockToken, createDocument } from '../../__tests__/testUtils';
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

    it('should show deprecation notice for deprecated Record methods in method context', () => {
      const doc = createDocument('Rec.RECORDLEVELLOCKING');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'Rec', kind: 'variable', token: createMockToken(), type: 'Record Customer' });

      const hover = provider.getHover(doc, Position.create(0, 15), undefined, symbolTable);

      expect(hover).not.toBeNull();
      const content = getHoverContent(hover);
      expect(content).toContain('**Deprecated:**');
      expect(content).toContain('Always returns TRUE in SQL Server-based versions');
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
      const docIndex = content.indexOf('consistent');
      const deprecatedIndex = content.indexOf('**Deprecated:**');
      expect(docIndex).toBeGreaterThan(-1);
      expect(deprecatedIndex).toBeGreaterThan(-1);
      expect(docIndex).toBeLessThan(deprecatedIndex);
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
});
