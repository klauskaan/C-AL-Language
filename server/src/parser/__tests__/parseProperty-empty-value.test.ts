/**
 * REFACTORING TESTS: Empty/Malformed Property Value in parseProperty()
 *
 * Context: Extracting duplicate whitespace detection logic into helper method
 * - Current logic: `equalsToken.endOffset < currentToken.startOffset`
 * - New helper: `hasWhitespaceBetween(token1: Token, token2: Token): boolean`
 * - Two call sites: parseProperty() line 499, parseFieldProperties() line 1108
 *
 * The parseFieldProperties() call site is covered by parseFieldProperties-empty-value.test.ts
 * These tests cover the parseProperty() call site (PROPERTIES sections)
 *
 * Note: OBJECT-PROPERTIES section is skipped by the parser (skipObjectPropertiesSection),
 * so these tests focus on the PROPERTIES section where parseProperty() is actually invoked.
 *
 * Expected Behavior (REFACTORING - tests SHOULD PASS):
 * - Property= } (with whitespace) should parse without errors (whitespace is valid)
 * - Property=} (no whitespace) should report "Empty or malformed value" error
 * - Tab, space, newline all count as whitespace
 *
 * These tests verify existing behavior BEFORE refactoring, ensuring the helper
 * method extraction doesn't introduce regressions.
 */

import { parseCode } from './parserTestHelpers';
import { ObjectKind } from '../ast';

describe('Parser - Empty/Malformed Property Values in parseProperty()', () => {
  describe('Table PROPERTIES section', () => {
    it('should parse property with whitespace value (VALID) without errors', () => {
      // Test case: Description= } with whitespace in PROPERTIES section
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
    Description= }
  FIELDS
  {
  }
  KEYS
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should report error for property with no whitespace (MALFORMED)', () => {
      // Test case: Description=} with no whitespace in PROPERTIES section
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
    Description=}
  FIELDS
  {
  }
  KEYS
  {
  }
}`;
      const { errors } = parseCode(code);

      // Should have error for malformed property
      expect(errors.length).toBeGreaterThan(0);

      const relevantError = errors.find(e =>
        e.message.toLowerCase().includes('empty') ||
        e.message.toLowerCase().includes('malformed')
      );
      expect(relevantError).toBeDefined();
    });

    it('should parse property with whitespace followed by other properties', () => {
      // Test case: Description= ; followed by another property
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
    Description= ;
    DataPerCompany=Yes }
  FIELDS
  {
  }
  KEYS
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);

      // Both properties should exist
      const properties = ast.object?.properties?.properties || [];
      expect(properties.length).toBeGreaterThanOrEqual(2);

      const descProp = properties.find(p => p.name === 'Description');
      const dataProp = properties.find(p => p.name === 'DataPerCompany');

      expect(descProp).toBeDefined();
      expect(dataProp).toBeDefined();
    });

    it('should parse Page with empty property value', () => {
      // Test case: Page object with Description= }
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
    PageType=Card;
    Description= }
  CONTROLS
  {
    { 1   ;0   ;Container }
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      const properties = ast.object?.properties?.properties || [];
      expect(properties.length).toBe(2);

      const descProp = properties.find(p => p.name === 'Description');
      expect(descProp).toBeDefined();
    });

    it('should parse Codeunit with empty property value', () => {
      // Test case: Codeunit object with Permissions= }
      const code = `OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
    Permissions= }
  CODE
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Codeunit);
    });
  });

  describe('Page PROPERTIES section', () => {
    it('should parse Page property with whitespace value without errors', () => {
      // Test case: Page with InstructionalText= } in PROPERTIES
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
    PageType=Card;
    InstructionalText= }
  CONTROLS
  {
    { 1   ;0   ;Container }
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      const properties = ast.object?.properties?.properties || [];
      const instrProp = properties.find(p => p.name === 'InstructionalText');
      expect(instrProp).toBeDefined();
    });

    it('should report error for Page property with no whitespace', () => {
      // Test case: Page with InstructionalText=} (malformed)
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
    PageType=Card;
    InstructionalText=}
  CONTROLS
  {
    { 1   ;0   ;Container }
  }
}`;
      const { errors } = parseCode(code);

      // Should have error for malformed property
      expect(errors.length).toBeGreaterThan(0);

      const relevantError = errors.find(e =>
        e.message.toLowerCase().includes('empty') ||
        e.message.toLowerCase().includes('malformed')
      );
      expect(relevantError).toBeDefined();
    });
  });

  describe('Report PROPERTIES section', () => {
    it('should parse Report property with whitespace value without errors', () => {
      // Test case: Report with CaptionML= } in PROPERTIES
      const code = `OBJECT Report 50000 Test
{
  PROPERTIES
  {
    ProcessingOnly=Yes;
    CaptionML= }
  DATASET
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);
      expect(ast.object?.objectKind).toBe(ObjectKind.Report);
    });
  });

  describe('REAL-WORLD: Complex object with multiple properties', () => {
    it('should parse realistic Table with multiple properties including empty values', () => {
      // Realistic scenario: Table with various properties including Description= }
      const code = `OBJECT Table 50000 "Customer Extended"
{
  OBJECT-PROPERTIES
  {
    Date=25-01-26;
    Time=10:00:00 }
  PROPERTIES
  {
    DataPerCompany=Yes;
    Description= ;
    Permissions=TableData 18=r }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {
    {    ;No.                                      ;Clustered=Yes }
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);

      const table = ast.object;
      expect(table).toBeDefined();
      expect(table?.properties).toBeDefined();

      // Verify Description property exists
      const descProp = table?.properties?.properties?.find(p => p.name === 'Description');
      expect(descProp).toBeDefined();

      // Other properties should also be parsed correctly
      const dataProp = table?.properties?.properties?.find(p => p.name === 'DataPerCompany');
      const permProp = table?.properties?.properties?.find(p => p.name === 'Permissions');
      expect(dataProp).toBeDefined();
      expect(permProp).toBeDefined();
    });
  });

  describe('SNAPSHOT: Property value parsing results', () => {
    it('should match snapshot for PROPERTIES with empty Description value', () => {
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
    DataPerCompany=Yes;
    Description= ;
    Permissions=TableData 18=r }
  FIELDS
  {
  }
  KEYS
  {
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      // Snapshot the properties to verify structure
      expect(ast.object?.properties).toMatchSnapshot();
    });
  });
});
