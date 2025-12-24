/**
 * Tests for Signature Help Provider
 */

import { SignatureHelpProvider } from '../signatureHelpProvider';
import { SymbolTable } from '../../symbols/symbolTable';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, MarkupKind } from 'vscode-languageserver';

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string): TextDocument {
  return TextDocument.create('file:///test.cal', 'cal', 1, content);
}

/**
 * Helper to create a mock token for tests
 */
function mockToken(): any {
  return {
    type: 'IDENTIFIER',
    value: 'test',
    line: 1,
    column: 1,
    startOffset: 0,
    endOffset: 4
  };
}

/**
 * Helper to get documentation content from signature help
 */
function getDocumentation(signatureHelp: any): string {
  if (!signatureHelp?.signatures?.[0]?.documentation) return '';
  const doc = signatureHelp.signatures[0].documentation;
  if (typeof doc === 'string') return doc;
  if (doc.value) return doc.value;
  return '';
}

describe('SignatureHelpProvider', () => {
  let provider: SignatureHelpProvider;

  beforeEach(() => {
    provider = new SignatureHelpProvider();
  });

  describe('Built-in Functions', () => {
    it('should show signature for MESSAGE function', () => {
      const doc = createDocument('MESSAGE(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      expect(help?.signatures).toHaveLength(1);
      expect(help?.signatures[0].label).toContain('MESSAGE');
      expect(help?.activeSignature).toBe(0);
    });

    it('should show signature for ERROR function', () => {
      const doc = createDocument('ERROR(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('ERROR');
    });

    it('should show signature for STRSUBSTNO function', () => {
      const doc = createDocument('STRSUBSTNO(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 11));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('STRSUBSTNO');
    });

    it('should show signature for ROUND function', () => {
      const doc = createDocument('ROUND(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('ROUND');
    });

    it('should show signature for TODAY function', () => {
      const doc = createDocument('TODAY(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('TODAY');
    });

    it('should include documentation', () => {
      const doc = createDocument('MESSAGE(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      const docText = getDocumentation(help);
      expect(docText).toContain('message');
    });
  });

  describe('Record Methods', () => {
    it('should show signature for Rec.GET method', () => {
      const doc = createDocument('Rec.GET(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('GET');
    });

    it('should show signature for Rec.FIND method', () => {
      const doc = createDocument('Rec.FIND(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 9));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('FIND');
    });

    it('should show signature for Rec.FINDSET method', () => {
      const doc = createDocument('Rec.FINDSET(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 12));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('FINDSET');
    });

    it('should show signature for Rec.INSERT method', () => {
      const doc = createDocument('Rec.INSERT(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 11));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('INSERT');
    });

    it('should show signature for Rec.SETRANGE method', () => {
      const doc = createDocument('Rec.SETRANGE(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 13));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('SETRANGE');
    });

    it('should show signature for Rec.SETFILTER method', () => {
      const doc = createDocument('Rec.SETFILTER(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 14));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('SETFILTER');
    });
  });

  describe('Parameter Index Tracking', () => {
    it('should show first parameter as active initially', () => {
      const doc = createDocument('MESSAGE(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(0);
    });

    it('should show second parameter as active after comma', () => {
      const doc = createDocument('MESSAGE(x, ');
      const help = provider.getSignatureHelp(doc, Position.create(0, 11));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(1);
    });

    it('should show third parameter as active after two commas', () => {
      const doc = createDocument('MESSAGE(x, y, ');
      const help = provider.getSignatureHelp(doc, Position.create(0, 14));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(2);
    });

    it('should track parameters in STRSUBSTNO', () => {
      const doc = createDocument("STRSUBSTNO('Hello %1 %2', ");
      const help = provider.getSignatureHelp(doc, Position.create(0, 26));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(1);
    });

    it('should track multiple parameters', () => {
      const doc = createDocument("STRSUBSTNO('Hello %1 %2', x, ");
      const help = provider.getSignatureHelp(doc, Position.create(0, 29));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(2);
    });
  });

  describe('Nested Function Calls', () => {
    it('should handle nested function - outer function', () => {
      const doc = createDocument('MESSAGE(FORMAT(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 15));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('FORMAT');
    });

    it('should handle nested function after closing inner', () => {
      const doc = createDocument('MESSAGE(FORMAT(x), ');
      const help = provider.getSignatureHelp(doc, Position.create(0, 19));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('MESSAGE');
      expect(help?.activeParameter).toBe(1);
    });

    it('should handle deeply nested functions', () => {
      const doc = createDocument('MESSAGE(FORMAT(ABS(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 19));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('ABS');
    });
  });

  describe('Case Insensitivity', () => {
    it('should find MESSAGE in lowercase', () => {
      const doc = createDocument('message(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('MESSAGE');
    });

    it('should find FIND in mixed case', () => {
      const doc = createDocument('Rec.Find(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 9));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('FIND');
    });
  });

  describe('User-defined Procedures', () => {
    it('should show signature for user-defined procedure', () => {
      const doc = createDocument('MyProcedure(');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({ name: 'MyProcedure', kind: 'procedure', token: mockToken() });

      const help = provider.getSignatureHelp(doc, Position.create(0, 12), undefined, symbolTable);

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('MyProcedure');
    });
  });

  describe('No Signature Cases', () => {
    it('should return null when not inside function call', () => {
      const doc = createDocument('x := 5');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).toBeNull();
    });

    it('should return null after closing parenthesis', () => {
      const doc = createDocument('MESSAGE(x)');
      const help = provider.getSignatureHelp(doc, Position.create(0, 10));

      expect(help).toBeNull();
    });

    it('should return null for unknown function', () => {
      const doc = createDocument('UnknownFunction(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 16));

      expect(help).toBeNull();
    });

    it('should return null at start of document', () => {
      const doc = createDocument('x');
      const help = provider.getSignatureHelp(doc, Position.create(0, 0));

      expect(help).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace after function name', () => {
      const doc = createDocument('MESSAGE (');
      const help = provider.getSignatureHelp(doc, Position.create(0, 9));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].label).toContain('MESSAGE');
    });

    it('should handle cursor right after opening paren', () => {
      const doc = createDocument('ROUND(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(0);
    });

    it('should handle parameter content between parens', () => {
      const doc = createDocument('ROUND(123');
      const help = provider.getSignatureHelp(doc, Position.create(0, 9));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(0);
    });

    it('should handle multiline function calls', () => {
      const doc = createDocument('MESSAGE(\n  x,\n  ');
      const help = provider.getSignatureHelp(doc, Position.create(2, 2));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(1);
    });
  });

  describe('Parameter Information', () => {
    it('should have parameters array in signature', () => {
      const doc = createDocument('ROUND(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].parameters).toBeDefined();
      expect(help?.signatures[0].parameters!.length).toBeGreaterThan(0);
    });

    it('should have correct number of parameters for COPYSTR', () => {
      const doc = createDocument('COPYSTR(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      // COPYSTR(String, Position [, Length]): Text - 3 params
      expect(help?.signatures[0].parameters!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Markdown Formatting', () => {
    it('should return Markdown documentation', () => {
      const doc = createDocument('MESSAGE(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 8));

      expect(help).not.toBeNull();
      expect(help?.signatures[0].documentation).toHaveProperty('kind', MarkupKind.Markdown);
    });
  });

  describe('Performance', () => {
    it('should complete signature help requests quickly', () => {
      const doc = createDocument('MESSAGE(');

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        provider.getSignatureHelp(doc, Position.create(0, 8));
      }
      const elapsed = Date.now() - start;

      // 100 requests should take less than 200ms
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('String and Comment Handling', () => {
    it('should ignore commas inside single-quoted strings', () => {
      const doc = createDocument("MESSAGE('Hello, World', ");
      const help = provider.getSignatureHelp(doc, Position.create(0, 24));

      expect(help).not.toBeNull();
      // Only the comma after the string should count, not the one inside
      expect(help?.activeParameter).toBe(1);
    });

    it('should ignore commas inside double-quoted identifiers', () => {
      const doc = createDocument('Rec.SETRANGE("Item, No.", ');
      const help = provider.getSignatureHelp(doc, Position.create(0, 26));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(1);
    });

    it('should ignore commas inside block comments', () => {
      const doc = createDocument('MESSAGE(x { a, b, c }, ');
      const help = provider.getSignatureHelp(doc, Position.create(0, 23));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(1);
    });

    it('should handle escaped quotes in strings', () => {
      const doc = createDocument("MESSAGE('It''s here', ");
      const help = provider.getSignatureHelp(doc, Position.create(0, 22));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(1);
    });

    it('should handle complex string with multiple commas', () => {
      const doc = createDocument("MESSAGE('a, b, c, d', x, ");
      const help = provider.getSignatureHelp(doc, Position.create(0, 25));

      expect(help).not.toBeNull();
      // Only 2 real commas: after the string and after x
      expect(help?.activeParameter).toBe(2);
    });

    it('should handle mixed strings and quoted identifiers', () => {
      const doc = createDocument('Rec.SETFILTER("Field, Name", \'%1, %2\', ');
      const help = provider.getSignatureHelp(doc, Position.create(0, 39));

      expect(help).not.toBeNull();
      // Two real commas: after "Field, Name" and after '%1, %2'
      expect(help?.activeParameter).toBe(2);
    });
  });

  describe('No Parameters Functions', () => {
    it('should return activeParameter >= 0 for functions with no parameters', () => {
      const doc = createDocument('TODAY(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 6));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBeGreaterThanOrEqual(0);
    });

    it('should return activeParameter 0 for TIME function', () => {
      const doc = createDocument('TIME(');
      const help = provider.getSignatureHelp(doc, Position.create(0, 5));

      expect(help).not.toBeNull();
      expect(help?.activeParameter).toBe(0);
    });
  });
});
