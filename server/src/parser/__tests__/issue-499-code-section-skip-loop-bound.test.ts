/**
 * Issue #499: Add safety bound to CODE section closing brace skip loop
 *
 * When a CODE section is missing its closing '}', the skip loop at line 2645
 * has no upper bound and will consume tokens until '}' or EOF. This can cause
 * the parser to consume tokens from subsequent sections.
 *
 * Expected behavior after fix:
 * - Skip loop should stop at section keywords (KEYS, FIELDS, etc.)
 * - Parser should record error about missing '}'
 * - Subsequent sections should still be parseable
 *
 * Before fix: Skip loop consumes all tokens until '}' or EOF
 * After fix: Skip loop stops at section keywords
 */

import { parseCode } from './parserTestHelpers';
import { ObjectKind } from '../ast';

describe('Issue #499 - CODE section skip loop safety bound', () => {
  describe('Safety bound at section keyword', () => {
    it('should stop skip loop at KEYS section when CODE closing brace is missing', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;

  KEYS
  {
    {    ;   ;"No."                 ;Clustered=Yes }
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse the object without throwing
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);

      // Should report missing closing brace for CODE section
      const missingBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(missingBraceError).toBeDefined();

      // Critical assertion: KEYS section should not be consumed by skip loop
      // The object should have a keys section defined
      expect(ast.object?.keys).toBeDefined();

      // Verify the CODE section exists (parser should have attempted to parse it)
      expect(ast.object?.code).toBeDefined();
    });

    it('should stop skip loop at FIELDS section when CODE closing brace is missing', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;

  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse the object
      expect(ast.object).toBeDefined();

      // Should report missing closing brace
      const missingBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(missingBraceError).toBeDefined();

      // FIELDS section should not be consumed by skip loop
      expect(ast.object?.fields).toBeDefined();
    });

    it('should stop skip loop at PROPERTIES section when CODE closing brace is missing', () => {
      // This scenario tests the case where CODE section appears before PROPERTIES
      // (unusual but syntactically possible in error recovery scenarios)
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;

  PROPERTIES
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse the object
      expect(ast.object).toBeDefined();

      // Should report missing closing brace
      const missingBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(missingBraceError).toBeDefined();

      // PROPERTIES section should not be consumed
      expect(ast.object?.properties).toBeDefined();
    });
  });

  describe('Normal case - closing brace present', () => {
    it('should successfully find closing brace when unconsumed tokens exist', () => {
      // This tests that the skip loop still works normally when '}' IS present
      const code = `OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors about CODE section closing brace
      const codeBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(codeBraceError).toBeUndefined();

      // Object should be fully parsed
      expect(ast.object).toBeDefined();
      expect(ast.object?.code).toBeDefined();
    });

    it('should handle CODE section with multiple procedures and normal closing brace', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    BEGIN
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);

      // No error about missing closing brace
      const codeBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(codeBraceError).toBeUndefined();

      // CODE section should be fully parsed
      expect(ast.object?.code).toBeDefined();
      expect(ast.object?.code?.procedures.length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing closing brace at EOF', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;`;
      const { ast, errors } = parseCode(code);

      // Should detect missing brace
      const missingBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(missingBraceError).toBeDefined();

      // Should still create CODE section node
      expect(ast.object?.code).toBeDefined();
    });

    it('should handle empty CODE section missing closing brace', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
  KEYS
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should detect missing brace
      const missingBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(missingBraceError).toBeDefined();

      // KEYS section should not be consumed
      expect(ast.object?.keys).toBeDefined();
    });

    it('should handle CODE section with only documentation trigger missing closing brace', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    BEGIN
    END.

  PROPERTIES
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should detect missing brace
      const missingBraceError = errors.find(e =>
        e.message.includes('Expected } to close CODE section')
      );
      expect(missingBraceError).toBeDefined();

      // PROPERTIES section should not be consumed
      expect(ast.object?.properties).toBeDefined();
    });
  });
});
