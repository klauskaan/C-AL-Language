/**
 * Tests for ProviderBase Abstract Class
 * Tests the shared utility methods used by all providers
 */

import { ProviderBase } from '../providerBase';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Location } from 'vscode-languageserver';
import { Token, TokenType } from '../../lexer/tokens';

/**
 * Concrete test class extending ProviderBase to expose protected methods
 */
class TestProvider extends ProviderBase {
  // Expose IDENTIFIER_PATTERN for testing
  public static getIdentifierPattern(): RegExp {
    return ProviderBase.IDENTIFIER_PATTERN;
  }

  // Expose scanBackward for testing
  public testScanBackward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    return this.scanBackward(text, startOffset, predicate);
  }

  // Expose scanForward for testing
  public testScanForward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    return this.scanForward(text, startOffset, predicate);
  }

  // Expose getWordAtPosition for testing
  public testGetWordAtPosition(document: TextDocument, position: Position): { word: string; start: number; end: number } | null {
    return this.getWordAtPosition(document, position);
  }

  // Expose isAfterDot for testing
  public testIsAfterDot(document: TextDocument, position: Position): boolean {
    return this.isAfterDot(document, position);
  }

  // Expose getIdentifierBeforeDot for testing
  public testGetIdentifierBeforeDot(document: TextDocument, position: Position): string | null {
    return this.getIdentifierBeforeDot(document, position);
  }

  // Expose tokenToLocation for testing
  public testTokenToLocation(token: Token, documentUri: string): Location {
    return this.tokenToLocation(token, documentUri);
  }
}

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string): TextDocument {
  return TextDocument.create('file:///test.cal', 'cal', 1, content);
}

describe('ProviderBase', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('IDENTIFIER_PATTERN', () => {
    it('should match alphanumeric characters', () => {
      const pattern = TestProvider.getIdentifierPattern();
      expect(pattern.test('a')).toBe(true);
      expect(pattern.test('Z')).toBe(true);
      expect(pattern.test('5')).toBe(true);
    });

    it('should match underscores', () => {
      const pattern = TestProvider.getIdentifierPattern();
      expect(pattern.test('_')).toBe(true);
    });

    it('should not match special characters', () => {
      const pattern = TestProvider.getIdentifierPattern();
      expect(pattern.test('.')).toBe(false);
      expect(pattern.test(' ')).toBe(false);
      expect(pattern.test('-')).toBe(false);
      expect(pattern.test(':')).toBe(false);
      expect(pattern.test(';')).toBe(false);
    });
  });

  describe('scanBackward', () => {
    it('should scan backwards while predicate is true', () => {
      const text = 'Hello World';
      const pattern = /[a-zA-Z]/;
      // Starting from 'o' in 'World' (index 10), scan backwards
      const result = provider.testScanBackward(text, 10, c => pattern.test(c));
      // Should stop at 'W' (index 6)
      expect(result).toBe(6);
    });

    it('should return startOffset + 1 when first character fails predicate', () => {
      const text = 'Hello World';
      // Starting at space (index 5), predicate fails immediately
      const result = provider.testScanBackward(text, 5, c => /[a-zA-Z]/.test(c));
      expect(result).toBe(6);
    });

    it('should handle scanning to beginning of text', () => {
      const text = 'Hello';
      // Starting at 'o' (index 4), scan backwards matching letters
      const result = provider.testScanBackward(text, 4, c => /[a-zA-Z]/.test(c));
      // Should return 0 (start of text)
      expect(result).toBe(0);
    });

    it('should handle empty text', () => {
      const text = '';
      const result = provider.testScanBackward(text, -1, () => true);
      expect(result).toBe(0);
    });

    it('should handle startOffset of 0', () => {
      const text = 'Hello';
      // Starting at 'H' (index 0)
      const result = provider.testScanBackward(text, 0, c => /[a-zA-Z]/.test(c));
      expect(result).toBe(0);
    });

    it('should handle negative startOffset', () => {
      const text = 'Hello';
      const result = provider.testScanBackward(text, -1, () => true);
      expect(result).toBe(0);
    });

    it('should work with identifier pattern', () => {
      const text = 'var MyVar := 123';
      const pattern = TestProvider.getIdentifierPattern();
      // Starting at 'r' in 'MyVar' (index 8), scan backwards
      const result = provider.testScanBackward(text, 8, c => pattern.test(c));
      // Should stop at 'M' (index 4)
      expect(result).toBe(4);
    });
  });

  describe('scanForward', () => {
    it('should scan forwards while predicate is true', () => {
      const text = 'Hello World';
      const pattern = /[a-zA-Z]/;
      // Starting from 'H' (index 0), scan forwards
      const result = provider.testScanForward(text, 0, c => pattern.test(c));
      // Should stop at space (index 5)
      expect(result).toBe(5);
    });

    it('should return startOffset when first character fails predicate', () => {
      const text = 'Hello World';
      // Starting at space (index 5), predicate fails immediately
      const result = provider.testScanForward(text, 5, c => /[a-zA-Z]/.test(c));
      expect(result).toBe(5);
    });

    it('should handle scanning to end of text', () => {
      const text = 'Hello';
      // Starting at 'H' (index 0), scan forwards matching letters
      const result = provider.testScanForward(text, 0, c => /[a-zA-Z]/.test(c));
      // Should return text.length (5)
      expect(result).toBe(5);
    });

    it('should handle empty text', () => {
      const text = '';
      const result = provider.testScanForward(text, 0, () => true);
      expect(result).toBe(0);
    });

    it('should handle startOffset at end of text', () => {
      const text = 'Hello';
      const result = provider.testScanForward(text, 5, () => true);
      expect(result).toBe(5);
    });

    it('should handle startOffset beyond text length', () => {
      const text = 'Hello';
      const result = provider.testScanForward(text, 10, () => true);
      expect(result).toBe(10);
    });

    it('should work with identifier pattern', () => {
      const text = 'MyVar := 123';
      const pattern = TestProvider.getIdentifierPattern();
      // Starting at 'M' (index 0), scan forwards
      const result = provider.testScanForward(text, 0, c => pattern.test(c));
      // Should stop at space (index 5)
      expect(result).toBe(5);
    });
  });

  describe('getWordAtPosition', () => {
    it('should return word when cursor is inside identifier', () => {
      const doc = createDocument('MyVariable');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 5));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('MyVariable');
      expect(result?.start).toBe(0);
      expect(result?.end).toBe(10);
    });

    it('should return word when cursor is at start of identifier', () => {
      const doc = createDocument('MyVariable');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 0));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('MyVariable');
    });

    it('should return word when cursor is at end of identifier', () => {
      const doc = createDocument('MyVariable');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 10));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('MyVariable');
    });

    it('should return null for empty document', () => {
      const doc = createDocument('');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 0));

      expect(result).toBeNull();
    });

    it('should return null when cursor is completely on whitespace', () => {
      // When cursor is in middle of whitespace with no adjacent identifiers
      const doc = createDocument('Hello    World');
      // Position 7 is in the middle of spaces with no adjacent identifiers
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 7));

      expect(result).toBeNull();
    });

    it('should return adjacent word when cursor is at boundary', () => {
      // When cursor is on special character but adjacent to identifier, returns the adjacent word
      const doc = createDocument('a.b');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 1));

      // Returns 'a' because cursor is adjacent to it (at offset-1)
      expect(result).not.toBeNull();
      expect(result?.word).toBe('a');
    });

    it('should extract word in middle of line', () => {
      const doc = createDocument('x := MyVar + y');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 7));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('MyVar');
      expect(result?.start).toBe(5);
      expect(result?.end).toBe(10);
    });

    it('should handle identifiers with underscores', () => {
      const doc = createDocument('My_Variable_Name');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 8));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('My_Variable_Name');
    });

    it('should handle identifiers with numbers', () => {
      const doc = createDocument('Var123');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 3));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('Var123');
    });

    it('should handle multiline documents', () => {
      const doc = createDocument('Line1\nMyVar\nLine3');
      const result = provider.testGetWordAtPosition(doc, Position.create(1, 3));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('MyVar');
    });

    it('should handle cursor at boundary of identifier', () => {
      const doc = createDocument('abc.def');
      // Cursor right before the dot
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 3));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('abc');
    });
  });

  describe('isAfterDot', () => {
    it('should return true when immediately after dot', () => {
      const doc = createDocument('Rec.');
      const result = provider.testIsAfterDot(doc, Position.create(0, 4));

      expect(result).toBe(true);
    });

    it('should return true when typing after dot', () => {
      const doc = createDocument('Rec.GET');
      const result = provider.testIsAfterDot(doc, Position.create(0, 7));

      expect(result).toBe(true);
    });

    it('should return true with whitespace after dot', () => {
      const doc = createDocument('Rec. GET');
      // Position at 'G', there's whitespace between dot and GET
      const result = provider.testIsAfterDot(doc, Position.create(0, 8));

      expect(result).toBe(true);
    });

    it('should return false when not after dot', () => {
      const doc = createDocument('MyVariable');
      const result = provider.testIsAfterDot(doc, Position.create(0, 5));

      expect(result).toBe(false);
    });

    it('should return false at start of document', () => {
      const doc = createDocument('Rec');
      const result = provider.testIsAfterDot(doc, Position.create(0, 0));

      expect(result).toBe(false);
    });

    it('should return false for empty document', () => {
      const doc = createDocument('');
      const result = provider.testIsAfterDot(doc, Position.create(0, 0));

      expect(result).toBe(false);
    });

    it('should return true for nested member access', () => {
      const doc = createDocument('Rec.Field.SubField');
      const result = provider.testIsAfterDot(doc, Position.create(0, 18));

      expect(result).toBe(true);
    });

    it('should handle dot at beginning of line', () => {
      const doc = createDocument('.Field');
      const result = provider.testIsAfterDot(doc, Position.create(0, 6));

      expect(result).toBe(true);
    });
  });

  describe('getIdentifierBeforeDot', () => {
    it('should return identifier before dot', () => {
      const doc = createDocument('Rec.');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 4));

      expect(result).toBe('Rec');
    });

    it('should return identifier when typing after dot', () => {
      const doc = createDocument('Customer.GET');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 12));

      expect(result).toBe('Customer');
    });

    it('should handle whitespace after dot', () => {
      const doc = createDocument('Rec. GET');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 8));

      expect(result).toBe('Rec');
    });

    it('should return null when no dot present', () => {
      const doc = createDocument('MyVariable');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 5));

      expect(result).toBeNull();
    });

    it('should return null for empty document', () => {
      const doc = createDocument('');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 0));

      expect(result).toBeNull();
    });

    it('should return null when dot has no identifier before it', () => {
      const doc = createDocument('.Field');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 6));

      expect(result).toBeNull();
    });

    it('should return last identifier in nested access', () => {
      const doc = createDocument('Rec.Field.SubField');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 18));

      expect(result).toBe('Field');
    });

    it('should handle identifier with underscores', () => {
      const doc = createDocument('My_Record.GET');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 13));

      expect(result).toBe('My_Record');
    });

    it('should handle identifier with numbers', () => {
      const doc = createDocument('Rec123.Field');
      const result = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 12));

      expect(result).toBe('Rec123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long identifiers', () => {
      const longIdentifier = 'A'.repeat(1000);
      const doc = createDocument(longIdentifier);
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 500));

      expect(result).not.toBeNull();
      expect(result?.word.length).toBe(1000);
    });

    it('should handle document with only dots', () => {
      const doc = createDocument('...');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 1));

      expect(result).toBeNull();
    });

    it('should handle document with only whitespace', () => {
      const doc = createDocument('   ');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 1));

      expect(result).toBeNull();
    });

    it('should handle tabs correctly', () => {
      const doc = createDocument('\tMyVar');
      const result = provider.testGetWordAtPosition(doc, Position.create(0, 4));

      expect(result).not.toBeNull();
      expect(result?.word).toBe('MyVar');
    });

    it('should handle mixed content', () => {
      const doc = createDocument('IF x.Field > 10 THEN');

      // Test 'IF'
      const ifResult = provider.testGetWordAtPosition(doc, Position.create(0, 1));
      expect(ifResult?.word).toBe('IF');

      // Test 'Field' after dot
      const fieldResult = provider.testGetWordAtPosition(doc, Position.create(0, 8));
      expect(fieldResult?.word).toBe('Field');

      // Test isAfterDot for 'Field'
      const afterDot = provider.testIsAfterDot(doc, Position.create(0, 10));
      expect(afterDot).toBe(true);

      // Test getIdentifierBeforeDot
      const beforeDot = provider.testGetIdentifierBeforeDot(doc, Position.create(0, 10));
      expect(beforeDot).toBe('x');
    });
  });

  describe('Performance', () => {
    it('should handle scanning efficiently', () => {
      const doc = createDocument('x := ' + 'A'.repeat(10000));

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        provider.testGetWordAtPosition(doc, Position.create(0, 5000));
      }
      const elapsed = Date.now() - start;

      // 1000 operations should take less than 2000ms (relaxed for CI environments)
      expect(elapsed).toBeLessThan(2000);
    });

    it('should handle isAfterDot efficiently', () => {
      const doc = createDocument('Rec.' + 'A'.repeat(1000));

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        provider.testIsAfterDot(doc, Position.create(0, 500));
      }
      const elapsed = Date.now() - start;

      // 1000 operations should take less than 2000ms (relaxed for CI environments)
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('tokenToLocation', () => {
    it('should convert token to LSP location with correct coordinates', () => {
      const token: Token = {
        type: TokenType.Identifier,
        value: 'MyVar',
        line: 5,
        column: 10,
        startOffset: 100,
        endOffset: 105
      };
      const uri = 'file:///test.cal';

      const result = provider.testTokenToLocation(token, uri);

      expect(result.uri).toBe(uri);
      expect(result.range.start.line).toBe(4); // 1-based to 0-based
      expect(result.range.start.character).toBe(9); // 1-based to 0-based
      expect(result.range.end.line).toBe(4);
      expect(result.range.end.character).toBe(14); // start + value.length
    });

    it('should handle single-character tokens', () => {
      const token: Token = {
        type: TokenType.Identifier,
        value: 'x',
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 1
      };

      const result = provider.testTokenToLocation(token, 'file:///test.cal');

      expect(result.range.start.line).toBe(0);
      expect(result.range.start.character).toBe(0);
      expect(result.range.end.line).toBe(0);
      expect(result.range.end.character).toBe(1);
    });

    it('should handle multi-character tokens', () => {
      const token: Token = {
        type: TokenType.Identifier,
        value: 'CustomerName',
        line: 10,
        column: 5,
        startOffset: 200,
        endOffset: 212
      };

      const result = provider.testTokenToLocation(token, 'file:///test.cal');

      expect(result.range.start.line).toBe(9);
      expect(result.range.start.character).toBe(4);
      expect(result.range.end.line).toBe(9);
      expect(result.range.end.character).toBe(16); // 4 + 12
    });

    it('should preserve URI exactly', () => {
      const token: Token = {
        type: TokenType.Identifier,
        value: 'test',
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 4
      };
      const uri = 'file:///path/to/my/file.cal';

      const result = provider.testTokenToLocation(token, uri);

      expect(result.uri).toBe(uri);
    });

    it('should calculate correct range boundaries', () => {
      const token: Token = {
        type: TokenType.Identifier,
        value: 'PROCEDURE',
        line: 20,
        column: 15,
        startOffset: 500,
        endOffset: 509
      };

      const result = provider.testTokenToLocation(token, 'file:///test.cal');

      expect(result.range.start.line).toBe(19);
      expect(result.range.start.character).toBe(14);
      expect(result.range.end.line).toBe(19);
      expect(result.range.end.character).toBe(23); // 14 + 9
    });

    it('should handle token at line 1 column 1 (edge case)', () => {
      const token: Token = {
        type: TokenType.Identifier,
        value: 'TABLE',
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 5
      };

      const result = provider.testTokenToLocation(token, 'file:///test.cal');

      expect(result.range.start.line).toBe(0);
      expect(result.range.start.character).toBe(0);
      expect(result.range.end.line).toBe(0);
      expect(result.range.end.character).toBe(5);
    });
  });
});
