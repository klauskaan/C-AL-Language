/**
 * Tests for flattenDocumentSymbols utility function
 *
 * This function will be extracted from WorkspaceSymbolProvider's private method
 * into a shared utility for use by both WorkspaceSymbolProvider and WorkspaceIndex.
 */

import { flattenDocumentSymbols } from '../flattenSymbols';
import { DocumentSymbol, SymbolKind, SymbolInformation, Range, Position } from 'vscode-languageserver';

/**
 * Helper to create a DocumentSymbol for testing
 */
function createSymbol(
  name: string,
  kind: SymbolKind,
  children?: DocumentSymbol[]
): DocumentSymbol {
  const range = Range.create(Position.create(0, 0), Position.create(0, 10));
  return {
    name,
    kind,
    range,
    selectionRange: range,
    children
  };
}

describe('flattenDocumentSymbols', () => {
  const testUri = 'file:///test.cal';

  describe('Basic Flattening', () => {
    it('should flatten single-level symbols', () => {
      const symbols = [
        createSymbol('Field1', SymbolKind.Field),
        createSymbol('Field2', SymbolKind.Field)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.length).toBe(2);
      expect(flattened[0].name).toBe('Field1');
      expect(flattened[1].name).toBe('Field2');
      expect(flattened[0].location.uri).toBe(testUri);
      expect(flattened[1].location.uri).toBe(testUri);
    });

    it('should flatten nested symbols', () => {
      const symbols = [
        createSymbol('FIELDS', SymbolKind.Namespace, [
          createSymbol('Field1', SymbolKind.Field),
          createSymbol('Field2', SymbolKind.Field)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // Should include only Field1 and Field2, not the FIELDS namespace
      expect(flattened.length).toBe(2);
      expect(flattened.some((s: SymbolInformation) => s.name === 'Field1')).toBe(true);
      expect(flattened.some((s: SymbolInformation) => s.name === 'Field2')).toBe(true);
    });

    it('should flatten deeply nested symbols', () => {
      const symbols = [
        createSymbol('Root', SymbolKind.Namespace, [
          createSymbol('Level1', SymbolKind.Namespace, [
            createSymbol('Level2', SymbolKind.Field)
          ])
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // All namespace containers filtered, only Field remains
      expect(flattened.length).toBe(1);
      expect(flattened[0].name).toBe('Level2');
      expect(flattened[0].kind).toBe(SymbolKind.Field);
    });
  });

  describe('Namespace Filtering', () => {
    it('should filter FIELDS namespace container', () => {
      const symbols = [
        createSymbol('FIELDS', SymbolKind.Namespace, [
          createSymbol('No.', SymbolKind.Field),
          createSymbol('Name', SymbolKind.Field)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // FIELDS container should be filtered out
      expect(flattened.some((s: SymbolInformation) => s.name === 'FIELDS')).toBe(false);
      expect(flattened.length).toBe(2);
      expect(flattened.every((s: SymbolInformation) => s.kind === SymbolKind.Field)).toBe(true);
    });

    it('should filter KEYS namespace container', () => {
      const symbols = [
        createSymbol('KEYS', SymbolKind.Namespace, [
          createSymbol('No., Name', SymbolKind.Key)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.some((s: SymbolInformation) => s.name === 'KEYS')).toBe(false);
      expect(flattened.length).toBe(1);
      expect(flattened[0].name).toBe('No., Name');
    });

    it('should filter VAR namespace container', () => {
      const symbols = [
        createSymbol('VAR', SymbolKind.Namespace, [
          createSymbol('MyVariable', SymbolKind.Variable)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.some((s: SymbolInformation) => s.name === 'VAR')).toBe(false);
      expect(flattened.length).toBe(1);
      expect(flattened[0].name).toBe('MyVariable');
    });

    it('should filter PROCEDURES namespace container', () => {
      const symbols = [
        createSymbol('PROCEDURES', SymbolKind.Namespace, [
          createSymbol('TestProc', SymbolKind.Method),
          createSymbol('AnotherProc', SymbolKind.Method)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.some((s: SymbolInformation) => s.name === 'PROCEDURES')).toBe(false);
      expect(flattened.length).toBe(2);
      expect(flattened.every((s: SymbolInformation) => s.kind === SymbolKind.Method)).toBe(true);
    });

    it('should filter TRIGGERS namespace container', () => {
      const symbols = [
        createSymbol('TRIGGERS', SymbolKind.Namespace, [
          createSymbol('OnInsert', SymbolKind.Event),
          createSymbol('OnModify', SymbolKind.Event)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.some((s: SymbolInformation) => s.name === 'TRIGGERS')).toBe(false);
      expect(flattened.length).toBe(2);
      expect(flattened.every((s: SymbolInformation) => s.kind === SymbolKind.Event)).toBe(true);
    });
  });

  describe('Root Object Declaration Filtering', () => {
    it('should filter root object declaration (Class kind)', () => {
      const symbols = [
        createSymbol('Table 18 "Customer"', SymbolKind.Class, [
          createSymbol('FIELDS', SymbolKind.Namespace, [
            createSymbol('No.', SymbolKind.Field)
          ])
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // Root object should be filtered
      expect(flattened.some((s: SymbolInformation) => s.name === 'Table 18 "Customer"')).toBe(false);
      // But child symbols should remain
      expect(flattened.length).toBe(1);
      expect(flattened[0].name).toBe('No.');
    });

    it('should not filter non-root Class symbols', () => {
      const symbols = [
        createSymbol('FIELDS', SymbolKind.Namespace, [
          createSymbol('InnerClass', SymbolKind.Class) // Not a root
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // Non-root Class should be included
      expect(flattened.length).toBe(1);
      expect(flattened[0].name).toBe('InnerClass');
    });
  });

  describe('Container Name Handling', () => {
    it('should set containerName to namespace for direct children', () => {
      const symbols = [
        createSymbol('PROCEDURES', SymbolKind.Namespace, [
          createSymbol('MyProc', SymbolKind.Method)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.length).toBe(1);
      expect(flattened[0].containerName).toBe('PROCEDURES');
    });

    it('should preserve containerName through nested namespaces', () => {
      const symbols = [
        createSymbol('FIELDS', SymbolKind.Namespace, [
          createSymbol('NestedGroup', SymbolKind.Namespace, [
            createSymbol('Field1', SymbolKind.Field)
          ])
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.length).toBe(1);
      // Container should be the last namespace before the symbol
      expect(flattened[0].containerName).toBe('NestedGroup');
    });

    it('should not set containerName for root object children', () => {
      const symbols = [
        createSymbol('Table 18 "Customer"', SymbolKind.Class, [
          createSymbol('Field1', SymbolKind.Field)
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.length).toBe(1);
      // No container name because root object is filtered
      expect(flattened[0].containerName).toBeUndefined();
    });
  });

  describe('Symbol Kind Preservation', () => {
    it('should preserve Field kind', () => {
      const symbols = [
        createSymbol('MyField', SymbolKind.Field)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened[0].kind).toBe(SymbolKind.Field);
    });

    it('should preserve Method kind', () => {
      const symbols = [
        createSymbol('MyProc', SymbolKind.Method)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened[0].kind).toBe(SymbolKind.Method);
    });

    it('should preserve Event kind', () => {
      const symbols = [
        createSymbol('OnInsert', SymbolKind.Event)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened[0].kind).toBe(SymbolKind.Event);
    });

    it('should preserve Variable kind', () => {
      const symbols = [
        createSymbol('MyVar', SymbolKind.Variable)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened[0].kind).toBe(SymbolKind.Variable);
    });

    it('should preserve Key kind', () => {
      const symbols = [
        createSymbol('No., Name', SymbolKind.Key)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened[0].kind).toBe(SymbolKind.Key);
    });
  });

  describe('Location Information', () => {
    it('should set correct URI in location', () => {
      const customUri = 'file:///workspace/custom.cal';
      const symbols = [
        createSymbol('Field1', SymbolKind.Field)
      ];

      const flattened = flattenDocumentSymbols(symbols, customUri);

      expect(flattened[0].location.uri).toBe(customUri);
    });

    it('should use selectionRange for location range', () => {
      const selectionRange = Range.create(
        Position.create(5, 10),
        Position.create(5, 20)
      );
      const symbol: DocumentSymbol = {
        name: 'TestSymbol',
        kind: SymbolKind.Method,
        range: Range.create(Position.create(5, 0), Position.create(10, 0)),
        selectionRange
      };

      const flattened = flattenDocumentSymbols([symbol], testUri);

      expect(flattened[0].location.range).toEqual(selectionRange);
    });
  });

  describe('Complex Structures', () => {
    it('should handle table with all section types', () => {
      const symbols = [
        createSymbol('Table 50000 "ComplexTable"', SymbolKind.Class, [
          createSymbol('FIELDS', SymbolKind.Namespace, [
            createSymbol('No.', SymbolKind.Field),
            createSymbol('Name', SymbolKind.Field)
          ]),
          createSymbol('KEYS', SymbolKind.Namespace, [
            createSymbol('No.', SymbolKind.Key)
          ]),
          createSymbol('VAR', SymbolKind.Namespace, [
            createSymbol('GlobalCounter', SymbolKind.Variable)
          ]),
          createSymbol('PROCEDURES', SymbolKind.Namespace, [
            createSymbol('ValidateData', SymbolKind.Method)
          ]),
          createSymbol('TRIGGERS', SymbolKind.Namespace, [
            createSymbol('OnInsert', SymbolKind.Event)
          ])
        ])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // Should have: 2 fields, 1 key, 1 variable, 1 procedure, 1 trigger = 6 symbols
      expect(flattened.length).toBe(6);

      const kinds = flattened.map((s: SymbolInformation) => s.kind);
      expect(kinds).toContain(SymbolKind.Field);
      expect(kinds).toContain(SymbolKind.Key);
      expect(kinds).toContain(SymbolKind.Variable);
      expect(kinds).toContain(SymbolKind.Method);
      expect(kinds).toContain(SymbolKind.Event);

      // All namespaces should be filtered
      expect(flattened.some((s: SymbolInformation) => s.kind === SymbolKind.Namespace)).toBe(false);
      // Root object should be filtered
      expect(flattened.some((s: SymbolInformation) => s.kind === SymbolKind.Class)).toBe(false);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty array', () => {
      const flattened = flattenDocumentSymbols([], testUri);

      expect(flattened).toEqual([]);
    });

    it('should handle symbol with no children', () => {
      const symbols = [
        createSymbol('Field1', SymbolKind.Field)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.length).toBe(1);
      expect(flattened[0].name).toBe('Field1');
    });

    it('should handle namespace with no children', () => {
      const symbols = [
        createSymbol('FIELDS', SymbolKind.Namespace, [])
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      // Empty namespace should be filtered
      expect(flattened.length).toBe(0);
    });

    it('should handle multiple root symbols', () => {
      const symbols = [
        createSymbol('Symbol1', SymbolKind.Field),
        createSymbol('Symbol2', SymbolKind.Method),
        createSymbol('Symbol3', SymbolKind.Variable)
      ];

      const flattened = flattenDocumentSymbols(symbols, testUri);

      expect(flattened.length).toBe(3);
      expect(flattened.map((s: SymbolInformation) => s.name)).toEqual(['Symbol1', 'Symbol2', 'Symbol3']);
    });
  });
});
