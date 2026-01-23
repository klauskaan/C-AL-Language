/**
 * Tests for Hover Information Provider
 */

import { HoverProvider } from '../hoverProvider';
import { SymbolTable } from '../../symbols/symbolTable';
import { Position, MarkupKind } from 'vscode-languageserver';
import { createMockToken, createDocument } from '../../__tests__/testUtils';


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
    provider = new HoverProvider();
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
