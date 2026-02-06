/**
 * Keyword Metadata Tests
 *
 * Tests for the shared keyword metadata module that provides centralized
 * categorization and descriptions for C/AL keywords.
 *
 * This module consolidates keyword metadata for use across completion provider,
 * hover provider, and semantic tokens provider.
 */

import { CompletionItemKind } from 'vscode-languageserver';
import { TokenType } from '../../lexer/tokens';
import {
  KeywordCategory,
  KeywordMetadata,
  getMetadataByTokenType,
  getMetadataByKeyword,
  getHoverLabel
} from '../keywordMetadata';

describe('Keyword Metadata', () => {
  describe('getMetadataByTokenType', () => {
    describe('Control Flow keywords', () => {
      it('should return metadata for IF keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.If);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Control Flow');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for BEGIN keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Begin);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Control Flow');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for WHILE keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.While);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Control Flow');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return metadata for CASE keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Case);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Control Flow');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });
    });

    describe('Data Type keywords', () => {
      it('should return metadata for INTEGER data type', () => {
        const metadata = getMetadataByTokenType(TokenType.Integer_Type);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for BOOLEAN data type', () => {
        const metadata = getMetadataByTokenType(TokenType.Boolean);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });

      it('should return metadata for TEXT data type', () => {
        const metadata = getMetadataByTokenType(TokenType.Text);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });

      it('should return metadata for CODE_TYPE (not Section)', () => {
        const metadata = getMetadataByTokenType(TokenType.Code_Type);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
        // Ensure it's not categorized as Section
        expect(metadata!.category).not.toBe('Section');
      });

      it('should return metadata for RECORD data type', () => {
        const metadata = getMetadataByTokenType(TokenType.Record);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });
    });

    describe('Object Type keywords', () => {
      it('should return metadata for TABLE object type', () => {
        const metadata = getMetadataByTokenType(TokenType.Table);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for PAGE object type', () => {
        const metadata = getMetadataByTokenType(TokenType.Page);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
      });

      it('should return metadata for CODEUNIT object type', () => {
        const metadata = getMetadataByTokenType(TokenType.Codeunit);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
      });

      it('should return metadata for REPORT object type', () => {
        const metadata = getMetadataByTokenType(TokenType.Report);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
      });
    });

    describe('Declaration keywords', () => {
      it('should return metadata for PROCEDURE keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Procedure);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Declaration');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for VAR keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Var);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Declaration');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return metadata for EVENT keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Event);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Declaration');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return metadata for TRIGGER keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Trigger);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Declaration');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });
    });

    describe('Boolean Constant keywords', () => {
      it('should return metadata for TRUE keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.True);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Boolean Constant');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Constant);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for FALSE keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.False);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Boolean Constant');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Constant);
      });
    });

    describe('Operator keywords', () => {
      it('should return metadata for DIV operator', () => {
        const metadata = getMetadataByTokenType(TokenType.Div);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Operator');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Operator);
        expect(metadata!.description).toBeDefined();
      });

      it('should return metadata for MOD operator', () => {
        const metadata = getMetadataByTokenType(TokenType.Mod);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Operator');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Operator);
      });

      it('should return metadata for AND operator', () => {
        const metadata = getMetadataByTokenType(TokenType.And);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Operator');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Operator);
      });

      it('should return metadata for OR operator', () => {
        const metadata = getMetadataByTokenType(TokenType.Or);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Operator');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Operator);
      });

      it('should return metadata for NOT operator', () => {
        const metadata = getMetadataByTokenType(TokenType.Not);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Operator');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Operator);
      });
    });

    describe('Section keywords', () => {
      it('should return metadata for CODE section (not Data Type)', () => {
        const metadata = getMetadataByTokenType(TokenType.Code);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Section');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
        // Ensure it's not categorized as Data Type
        expect(metadata!.category).not.toBe('Data Type');
      });

      it('should return metadata for PROPERTIES section', () => {
        const metadata = getMetadataByTokenType(TokenType.Properties);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Section');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return metadata for FIELDS section', () => {
        const metadata = getMetadataByTokenType(TokenType.Fields);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Section');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });
    });

    describe('Uncategorized keywords', () => {
      it('should return undefined for INDATASET (uncategorized)', () => {
        const metadata = getMetadataByTokenType(TokenType.InDataSet);

        expect(metadata).toBeUndefined();
      });

      it('should return metadata for TEMPORARY keyword', () => {
        const metadata = getMetadataByTokenType(TokenType.Temporary);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Keyword');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return undefined for WITHEVENTS (uncategorized)', () => {
        const metadata = getMetadataByTokenType(TokenType.WithEvents);

        expect(metadata).toBeUndefined();
      });
    });

    describe('Generic keyword category', () => {
      it('should return metadata with Keyword category for WITH', () => {
        const metadata = getMetadataByTokenType(TokenType.With);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Keyword');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return metadata with Keyword category for LOCAL', () => {
        const metadata = getMetadataByTokenType(TokenType.Local);

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Keyword');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });
    });
  });

  describe('getMetadataByKeyword', () => {
    describe('Case-insensitive lookup', () => {
      it('should return metadata for "code" keyword (lowercase)', () => {
        const metadata = getMetadataByKeyword('code');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });

      it('should return metadata for "CODE" keyword (uppercase)', () => {
        const metadata = getMetadataByKeyword('CODE');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });

      it('should return metadata for "Code" keyword (mixed case)', () => {
        const metadata = getMetadataByKeyword('Code');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });
    });

    describe('Preserves hover behavior', () => {
      it('should return Data Type metadata for "code" keyword', () => {
        // This preserves the existing hover behavior where "code" shows
        // as Data Type, not Section
        const metadata = getMetadataByKeyword('code');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.description).toBeDefined();
      });

      it('should return Control Flow metadata for "begin" keyword', () => {
        const metadata = getMetadataByKeyword('begin');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Control Flow');
        expect(metadata!.description).toBeDefined();
      });

      it('should return Boolean Constant metadata for "true" keyword', () => {
        const metadata = getMetadataByKeyword('true');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Boolean Constant');
        expect(metadata!.description).toBeDefined();
      });

      it('should return Declaration metadata for "procedure" keyword', () => {
        const metadata = getMetadataByKeyword('procedure');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Declaration');
        expect(metadata!.description).toBeDefined();
      });
    });

    describe('Uncategorized keywords', () => {
      it('should return undefined for "indataset" (uncategorized)', () => {
        const metadata = getMetadataByKeyword('indataset');

        expect(metadata).toBeUndefined();
      });

      it('should return metadata for "temporary" keyword', () => {
        const metadata = getMetadataByKeyword('temporary');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Keyword');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Keyword);
      });

      it('should return undefined for "withevents" (uncategorized)', () => {
        const metadata = getMetadataByKeyword('withevents');

        expect(metadata).toBeUndefined();
      });
    });

    describe('Non-existent keywords', () => {
      it('should return undefined for non-keyword identifier', () => {
        const metadata = getMetadataByKeyword('MyVariable');

        expect(metadata).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        const metadata = getMetadataByKeyword('');

        expect(metadata).toBeUndefined();
      });
    });

    describe('Data types', () => {
      it('should return metadata for "integer" keyword', () => {
        const metadata = getMetadataByKeyword('integer');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });

      it('should return metadata for "boolean" keyword', () => {
        const metadata = getMetadataByKeyword('boolean');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });

      it('should return metadata for "text" keyword', () => {
        const metadata = getMetadataByKeyword('text');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Data Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.TypeParameter);
      });
    });

    describe('Object types', () => {
      it('should return metadata for "table" keyword', () => {
        const metadata = getMetadataByKeyword('table');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
      });

      it('should return metadata for "page" keyword', () => {
        const metadata = getMetadataByKeyword('page');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
      });

      it('should return metadata for "codeunit" keyword', () => {
        const metadata = getMetadataByKeyword('codeunit');

        expect(metadata).toBeDefined();
        expect(metadata!.category).toBe('Object Type');
        expect(metadata!.completionKind).toBe(CompletionItemKind.Class);
      });
    });
  });

  describe('getHoverLabel', () => {
    it('should return correct label for Data Type category', () => {
      const label = getHoverLabel('Data Type');

      expect(label).toBe('C/AL Data Type');
    });

    it('should return correct label for Control Flow category', () => {
      const label = getHoverLabel('Control Flow');

      expect(label).toBe('Control Flow Keyword');
    });

    it('should return correct label for Object Type category', () => {
      const label = getHoverLabel('Object Type');

      expect(label).toBe('C/AL Object Type');
    });

    it('should return correct label for Declaration category', () => {
      const label = getHoverLabel('Declaration');

      expect(label).toBe('Declaration Keyword');
    });

    it('should return correct label for Operator category', () => {
      const label = getHoverLabel('Operator');

      expect(label).toBe('Operator');
    });

    it('should return correct label for Boolean Constant category', () => {
      const label = getHoverLabel('Boolean Constant');

      expect(label).toBe('Boolean Constant');
    });

    it('should return correct label for Section category', () => {
      const label = getHoverLabel('Section');

      expect(label).toBe('Section Keyword');
    });

    it('should return correct label for generic Keyword category', () => {
      const label = getHoverLabel('Keyword');

      expect(label).toBe('Keyword');
    });
  });

  describe('Description content', () => {
    it('should provide description for IF keyword', () => {
      const metadata = getMetadataByTokenType(TokenType.If);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('IF');
    });

    it('should provide description for BEGIN keyword', () => {
      const metadata = getMetadataByTokenType(TokenType.Begin);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('BEGIN');
    });

    it('should provide description for INTEGER data type', () => {
      const metadata = getMetadataByTokenType(TokenType.Integer_Type);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('integer');
    });

    it('should provide description for TABLE object type', () => {
      const metadata = getMetadataByTokenType(TokenType.Table);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('table');
    });

    it('should provide description for TRUE constant', () => {
      const metadata = getMetadataByTokenType(TokenType.True);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('TRUE');
    });

    it('should provide description for DIV operator', () => {
      const metadata = getMetadataByTokenType(TokenType.Div);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('DIV');
    });

    it('should provide description for PROCEDURE keyword', () => {
      const metadata = getMetadataByTokenType(TokenType.Procedure);

      expect(metadata).toBeDefined();
      expect(metadata!.description).toBeDefined();
      expect(metadata!.description).toContain('PROCEDURE');
    });
  });

  describe('Metadata consistency', () => {
    it('should return same metadata for TokenType.Begin and keyword "begin"', () => {
      const byToken = getMetadataByTokenType(TokenType.Begin);
      const byKeyword = getMetadataByKeyword('begin');

      expect(byToken).toBeDefined();
      expect(byKeyword).toBeDefined();
      // Both should have the same category and completion kind
      expect(byToken!.category).toBe(byKeyword!.category);
      expect(byToken!.completionKind).toBe(byKeyword!.completionKind);
    });

    it('should return same metadata for TokenType.Table and keyword "table"', () => {
      const byToken = getMetadataByTokenType(TokenType.Table);
      const byKeyword = getMetadataByKeyword('table');

      expect(byToken).toBeDefined();
      expect(byKeyword).toBeDefined();
      expect(byToken!.category).toBe(byKeyword!.category);
      expect(byToken!.completionKind).toBe(byKeyword!.completionKind);
    });

    it('should return same metadata for TokenType.Integer_Type and keyword "integer"', () => {
      const byToken = getMetadataByTokenType(TokenType.Integer_Type);
      const byKeyword = getMetadataByKeyword('integer');

      expect(byToken).toBeDefined();
      expect(byKeyword).toBeDefined();
      expect(byToken!.category).toBe(byKeyword!.category);
      expect(byToken!.completionKind).toBe(byKeyword!.completionKind);
    });
  });

  describe('TypeScript type safety', () => {
    it('should have readonly properties on KeywordMetadata', () => {
      const metadata = getMetadataByTokenType(TokenType.If);

      expect(metadata).toBeDefined();
      // TypeScript compiler enforces readonly at compile time
      // Runtime check: attempting to modify should fail in strict mode
      expect(() => {
        // @ts-expect-error - Testing that readonly is enforced
        metadata!.category = 'Data Type';
      }).toThrow();
    });

    it('should allow KeywordCategory to be string literal type', () => {
      // This test verifies the type system at compile time
      const category: KeywordCategory = 'Control Flow';
      expect(category).toBe('Control Flow');

      // @ts-expect-error - Invalid category should fail at compile time
      const invalidCategory: KeywordCategory = 'Invalid Category';
    });
  });
});
