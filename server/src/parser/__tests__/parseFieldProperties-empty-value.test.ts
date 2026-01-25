/**
 * TDD TESTS: Empty/Malformed Property Value Fix in parseFieldProperties()
 *
 * Bug: The parser incorrectly reports errors for valid `Property= }` patterns
 * (with whitespace between = and }) but correctly handles truly malformed cases
 * like `Property=}` (no whitespace).
 *
 * Root Cause:
 * - When Property= } (with whitespace) appears in field properties, the parser
 *   should NOT report an error because whitespace between = and } is valid C/AL
 * - When Property=} (no whitespace) appears, parser SHOULD report error
 *
 * Expected Behavior:
 * - Property= } should parse without errors (whitespace is valid)
 * - Property=} should report "Empty or malformed value for property" error
 * - This applies to both TABLE FIELDS and PAGE CONTROLS sections
 *
 * These tests MUST reflect current behavior:
 * - Whitespace value tests SHOULD FAIL initially (parser incorrectly reports errors)
 * - Malformed value tests SHOULD PASS (parser correctly detects the error)
 * After fix, whitespace tests should pass without errors.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind, ObjectDeclaration, FieldDeclaration, ControlDeclaration } from '../ast';

describe('Parser - Empty/Malformed Property Values in parseFieldProperties()', () => {
  describe('TABLE FIELDS: Description property', () => {
    it('should parse Description with whitespace value (VALID) without errors', () => {
      // PRIMARY test case: Description= } with whitespace is VALID C/AL
      // BEFORE fix: Should FAIL - parser incorrectly reports error
      // AFTER fix: Should PASS - no errors
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Field1              ;Text30        ;
                                                   Description= }
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // BEFORE fix: This assertion will FAIL due to error being reported
      expect(parser.getErrors()).toHaveLength(0);

      // Verify AST structure is correct
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);

      const table = ast.object as ObjectDeclaration;
      expect(table.fields).toBeDefined();
      expect(table.fields?.fields).toHaveLength(1);

      const field = table.fields?.fields[0] as FieldDeclaration;
      expect(field.properties?.properties).toContainEqual(
        expect.objectContaining({ name: 'Description' })
      );
    });

    it('should report error for Description with no whitespace (MALFORMED)', () => {
      // Test case: Description=} with no whitespace is MALFORMED
      // This test should PASS (parser correctly detects error)
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Field1              ;Text30        ;
                                                   Description=}
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();

      // Should have error for malformed property
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Error message should mention empty or malformed value
      const relevantError = errors.find(e =>
        e.message.toLowerCase().includes('empty') ||
        e.message.toLowerCase().includes('malformed') ||
        e.message.toLowerCase().includes('value')
      );
      expect(relevantError).toBeDefined();
    });

    it('should parse multiple fields with whitespace property values', () => {
      // Test case: Multiple fields with Property= } pattern
      // BEFORE fix: Should FAIL with multiple errors
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Field1              ;Text30        ;
                                                   Description= }
    { 2   ;   ;Field2              ;Integer       ;
                                                   Description= }
    { 3   ;   ;Field3              ;Code20        ;
                                                   Description= }
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should have no errors after fix
      expect(parser.getErrors()).toHaveLength(0);

      const table = ast.object as ObjectDeclaration;
      expect(table.fields?.fields).toHaveLength(3);

      // All fields should have Description property
      table.fields?.fields.forEach((field: FieldDeclaration) => {
        const descProp = field.properties?.properties?.find(p => p.name === 'Description');
        expect(descProp).toBeDefined();
      });
    });

    it('should parse Description with whitespace followed by other properties', () => {
      // Test case: Description= } ; NextProperty=Value
      // BEFORE fix: Should FAIL
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Field1              ;Text30        ;
                                                   Description= ;
                                                   Editable=No }
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const table = ast.object as ObjectDeclaration;
      const field = table.fields?.fields[0] as FieldDeclaration;

      // Both properties should be parsed correctly
      const descProp = field.properties?.properties?.find(p => p.name === 'Description');
      const editableProp = field.properties?.properties?.find(p => p.name === 'Editable');

      expect(descProp).toBeDefined();
      expect(editableProp).toBeDefined();
    });
  });

  describe('PAGE CONTROLS: InstructionalTextML property', () => {
    it('should parse InstructionalTextML with whitespace value (VALID) without errors', () => {
      // Test case: InstructionalTextML= } in PAGE CONTROLS
      // BEFORE fix: Should FAIL - parser incorrectly reports error
      // AFTER fix: Should PASS - no errors
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                ContainerType=ContentArea;
                InstructionalTextML= }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // BEFORE fix: This assertion will FAIL due to error being reported
      expect(parser.getErrors()).toHaveLength(0);

      // Verify AST structure
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      const page = ast.object as ObjectDeclaration;
      expect(page.controls).toBeDefined();
      expect(page.controls?.controls).toHaveLength(1);

      const control = page.controls?.controls[0] as ControlDeclaration;
      expect(control.properties?.properties).toContainEqual(
        expect.objectContaining({ name: 'InstructionalTextML' })
      );
    });

    it('should parse Container with multiple empty properties (whitespace values)', () => {
      // Test case: Multiple properties with whitespace values
      // BEFORE fix: Should FAIL with multiple errors
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                ContainerType=ContentArea;
                InstructionalTextML= ;
                CaptionML= }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      // Both properties should exist
      const instructionalProp = control.properties?.properties?.find(p => p.name === 'InstructionalTextML');
      const captionProp = control.properties?.properties?.find(p => p.name === 'CaptionML');

      expect(instructionalProp).toBeDefined();
      expect(captionProp).toBeDefined();
    });
  });

  describe('PAGE CONTROLS: ActionList malformed (no whitespace)', () => {
    it('should report error for ActionList=} with no whitespace (MALFORMED)', () => {
      // Test case: ActionList=} in PAGE CONTROLS is malformed
      // This test should PASS (parser correctly detects error)
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                ActionList=}
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();

      // Should have error for malformed property
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Error should be about empty or malformed value
      const relevantError = errors.find(e =>
        e.message.toLowerCase().includes('empty') ||
        e.message.toLowerCase().includes('malformed') ||
        e.message.toLowerCase().includes('value')
      );
      expect(relevantError).toBeDefined();
    });

    it('should handle mixed valid and malformed properties', () => {
      // Test case: Some properties with whitespace (valid), one without (malformed)
      // Should report error only for the malformed one
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                InstructionalTextML= ;
                ActionList=}
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();

      // Should have error for ActionList but not InstructionalTextML
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Error should mention ActionList or be about malformed value
      const hasRelevantError = errors.some(e =>
        e.message.toLowerCase().includes('actionlist') ||
        e.message.toLowerCase().includes('malformed')
      );
      expect(hasRelevantError).toBe(true);
    });
  });

  describe('EDGE CASE: Property value with only whitespace characters', () => {
    it('should parse property with tab character before closing brace', () => {
      // Test case: Property=\t} (tab is whitespace)
      // BEFORE fix: Should FAIL
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Field1              ;Text30        ;
                                                   Description=\t}
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();

      // Tab is whitespace, so this should be valid
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should parse property with multiple spaces before closing brace', () => {
      // Test case: Property=   } (multiple spaces)
      // BEFORE fix: Should FAIL
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;Field1              ;Text30        ;
                                                   Description=   }
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();

      // Multiple spaces are valid whitespace
      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('REAL-WORLD: Complex field with multiple properties', () => {
    it('should parse realistic field with Description and other properties', () => {
      // Realistic scenario: field with multiple properties including Description= }
      // BEFORE fix: Should FAIL
      const code = `OBJECT Table 50000 "Customer Extended"
{
  OBJECT-PROPERTIES
  {
    Date=25-01-26;
    Time=10:00:00;
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        ;
                                                   CaptionML=ENU=No. }
    { 2   ;   ;Name                ;Text50        ;
                                                   CaptionML=ENU=Name;
                                                   Description= }
    { 3   ;   ;Address             ;Text50        ;
                                                   CaptionML=ENU=Address;
                                                   Description= ;
                                                   Editable=Yes }
  }
  KEYS
  {
    {    ;No.                                      ;Clustered=Yes }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should parse without errors
      expect(parser.getErrors()).toHaveLength(0);

      const table = ast.object as ObjectDeclaration;
      expect(table.fields?.fields).toHaveLength(3);

      // Verify Field 2 (Name) has Description property
      const nameField = table.fields?.fields[1] as FieldDeclaration;
      const descProp = nameField.properties?.properties?.find(p => p.name === 'Description');
      expect(descProp).toBeDefined();

      // Verify Field 3 (Address) has all three properties
      const addressField = table.fields?.fields[2] as FieldDeclaration;
      expect(addressField.properties?.properties?.find(p => p.name === 'CaptionML')).toBeDefined();
      expect(addressField.properties?.properties?.find(p => p.name === 'Description')).toBeDefined();
      expect(addressField.properties?.properties?.find(p => p.name === 'Editable')).toBeDefined();
    });
  });

  describe('SNAPSHOT: Property value parsing results', () => {
    it('should match snapshot for field with empty Description value', () => {
      const code = `OBJECT Table 50000 Test
{
  OBJECT-PROPERTIES
  {
  }
  PROPERTIES
  {
  }
  FIELDS
  {
    { 1   ;   ;TestField           ;Text30        ;
                                                   CaptionML=ENU=Test Field;
                                                   Description= ;
                                                   Editable=No }
  }
  KEYS
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const table = ast.object as ObjectDeclaration;
      const field = table.fields?.fields[0] as FieldDeclaration;

      // Snapshot the field's properties to verify structure
      expect(field.properties).toMatchSnapshot();
    });
  });
});
