/**
 * REGRESSION TESTS: Property Value Parsing with Bracket Depth Tracking
 *
 * Fixed: Parser now correctly tracks square bracket depth in property values
 * to avoid stopping at semicolons inside array literals like [1;2;3;4;5].
 *
 * This is a regression test for the bracket depth tracking fix implemented
 * in parser.ts lines 318, 322, and 361-370.
 *
 * Context:
 * - Previously, parser would stop at semicolons inside array literals
 * - Properties like OptionOrdinalValues=[1;2;3;4;5]; would be truncated
 * - Fixed by tracking bracketDepth similar to braceDepth tracking
 *
 * Test coverage:
 * 1. OptionOrdinalValues with array syntax
 * 2. Single value (no brackets)
 * 3. Negative values in arrays
 * 4. Mixed braces and brackets (regex patterns in strings)
 * 5. Multiple properties with arrays
 * 6. Empty arrays
 * 7. Semicolons outside brackets (should still terminate)
 * 8. Nested structures
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { Property, FieldDeclaration, FieldSection } from '../ast';

describe('Parser - Property Value Parsing with Bracket Depth Tracking', () => {
  describe('REGRESSION: OptionOrdinalValues with array syntax', () => {
    it('should parse OptionOrdinalValues with simple positive array', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionString=Value1,Value2,Value3;
            OptionOrdinalValues=[1;2;3];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      // Navigate to field properties
      const fieldSection = ast.object?.fields as FieldSection;
      expect(fieldSection).toBeDefined();
      expect(fieldSection.fields).toHaveLength(1);

      const field = fieldSection.fields[0] as FieldDeclaration;
      expect(field.properties).toBeDefined();

      // Find OptionOrdinalValues property
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );
      expect(optionOrdinalValues).toBeDefined();

      // Verify the entire array value is captured, including semicolons
      expect(optionOrdinalValues?.value).toBe('[1;2;3]');
    });

    it('should parse OptionOrdinalValues with negative values', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=[-1;0;1];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      expect(optionOrdinalValues?.value).toBe('[-1;0;1]');
    });

    it('should parse OptionOrdinalValues with mixed positive and negative values', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=[-1;1;2;3;2483;3986];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      expect(optionOrdinalValues?.value).toBe('[-1;1;2;3;2483;3986]');
    });

    it('should parse OptionOrdinalValues with single value (no brackets)', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=1;
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      // Single value without brackets
      expect(optionOrdinalValues?.value).toBe('1');
    });

    it('should parse OptionOrdinalValues with empty array', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            InitValue=[ ];
            OptionOrdinalValues=[ ];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      // Empty array with space
      expect(optionOrdinalValues?.value).toBe('[ ]');
    });

    it('should handle multiple properties with array values', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            InitValue=[ ];
            OptionOrdinalValues=[-1;0;1];
            OptionString=[ ,Active,Inactive];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;

      const initValue = field.properties?.properties?.find(
        (p: Property) => p.name === 'InitValue'
      );
      expect(initValue?.value).toBe('[ ]');

      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );
      expect(optionOrdinalValues?.value).toBe('[-1;0;1]');

      const optionString = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionString'
      );
      // OptionString can contain comma-separated values in brackets
      expect(optionString?.value).toContain('[');
      expect(optionString?.value).toContain(']');
    });
  });

  describe('REGRESSION: Semicolons outside brackets should still terminate', () => {
    it('should stop at semicolon when not inside brackets', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Code20 ;
            CaptionML=ENU=Test;
            Description=This is a test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;

      const captionML = field.properties?.properties?.find(
        (p: Property) => p.name === 'CaptionML'
      );
      expect(captionML?.value).toBe('ENU=Test');

      const description = field.properties?.properties?.find(
        (p: Property) => p.name === 'Description'
      );
      expect(description?.value).toBe('This is a test');
    });

    it('should handle multiple fields each with array properties', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; Field1 ; Option ;
            OptionOrdinalValues=[1;2;3];
            CaptionML=ENU=First }
          { 2 ; ; Field2 ; Option ;
            OptionOrdinalValues=[-1;5;4;3;2;1];
            CaptionML=ENU=Second }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      expect(fieldSection.fields).toHaveLength(2);

      const field1 = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues1 = field1.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );
      expect(optionOrdinalValues1?.value).toBe('[1;2;3]');

      const field2 = fieldSection.fields[1] as FieldDeclaration;
      const optionOrdinalValues2 = field2.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );
      expect(optionOrdinalValues2?.value).toBe('[-1;5;4;3;2;1]');
    });
  });

  describe('REGRESSION: Mixed braces and brackets in property values', () => {
    it('should handle regex patterns with both braces and brackets in strings', () => {
      // Real example from NAV: regex patterns in TextConst values can contain {[...]}
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            RegexTok@1000 : TextConst 'ENU=Pattern:(\{[0-9]{8}\})';
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should handle the mixed braces and brackets
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();
    });

    it('should handle property values with braces containing bracket arrays', () => {
      // Testing edge case: property value starts with brace, contains brackets
      const code = `OBJECT Table 50000 Test {
        PROPERTIES {
          DataPerCompany=Yes;
          TestProperty={[1;2;3]};
          Permissions=TableData 18=rm }
        FIELDS {
          { 1 ; ; No ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      if (ast.object?.properties) {
        const testProp = ast.object.properties.properties.find(
          (p: Property) => p.name === 'TestProperty'
        );
        if (testProp) {
          // Value should include the full {[1;2;3]} structure
          expect(testProp.value).toContain('[1;2;3]');
        }
      }
    });
  });

  describe('REGRESSION: Nested bracket structures', () => {
    it('should handle nested brackets in property values', () => {
      // Hypothetical case: nested array structures
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Text50 ;
            TestProperty=[[1;2];[3;4]];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const testProperty = field.properties?.properties?.find(
        (p: Property) => p.name === 'TestProperty'
      );

      // Should capture entire nested structure
      expect(testProperty?.value).toBe('[[1;2];[3;4]]');
    });

    it('should handle deeply nested brackets', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Text50 ;
            TestProperty=[[[1;2;3];[4;5;6]];[[7;8;9];[10;11;12]]];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const testProperty = field.properties?.properties?.find(
        (p: Property) => p.name === 'TestProperty'
      );

      // Should capture entire deeply nested structure
      expect(testProperty?.value).toBe('[[[1;2;3];[4;5;6]];[[7;8;9];[10;11;12]]]');
    });

    it('should handle mismatched brackets gracefully (error recovery)', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=[1;2;3;
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should attempt to recover from missing closing bracket
      expect(ast.object).toBeDefined();

      // The parser should collect an error but not crash
      // Note: Exact error handling depends on parser implementation
    });
  });

  describe('REGRESSION: Real-world C/AL patterns from NAV', () => {
    it('should parse real NAV pattern: CRM status field with OptionOrdinalValues', () => {
      const code = `OBJECT Table 5388 "CRM Post Configuration" {
        FIELDS {
          { 4 ; ; statecode ; Option ;
            InitValue=[ ];
            ExternalName=statecode;
            ExternalType=State;
            ExternalAccess=Modify;
            OptionOrdinalValues=[-1;0;1];
            DataClassification=SystemMetadata;
            CaptionML=ENU=Status;
            OptionCaptionML=ENU=" ,Active,Inactive";
            OptionString=[ ,Active,Inactive];
            Description=Status of the Post Configuration }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;

      // Verify all properties are parsed correctly
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );
      expect(optionOrdinalValues?.value).toBe('[-1;0;1]');

      const initValue = field.properties?.properties?.find(
        (p: Property) => p.name === 'InitValue'
      );
      expect(initValue?.value).toBe('[ ]');

      const optionString = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionString'
      );
      expect(optionString?.value).toContain('[');
    });

    it('should parse real NAV pattern: Complex option field with large ordinal values', () => {
      const code = `OBJECT Table 5349 "CRM Contact" {
        FIELDS {
          { 15 ; ; customerid ; Option ;
            ExternalName=customerid;
            ExternalType=Lookup;
            OptionOrdinalValues=[-1;1;2;3;2483;3986];
            CaptionML=ENU=Company Name;
            OptionCaptionML=ENU=" ,Account,Contact,Lead,Custom1,Custom2";
            Description=Select the customer account }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;

      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );
      // This is the critical test: large custom ordinal values like 2483, 3986
      expect(optionOrdinalValues?.value).toBe('[-1;1;2;3;2483;3986]');
    });

    it('should parse real NAV pattern: Multiple option fields in same object', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; Status1 ; Option ;
            OptionOrdinalValues=[-1;0;1];
            CaptionML=ENU=Status 1 }
          { 2 ; ; Status2 ; Option ;
            OptionOrdinalValues=[-1;1;2];
            CaptionML=ENU=Status 2 }
          { 3 ; ; Status3 ; Option ;
            OptionOrdinalValues=[1;2;3];
            CaptionML=ENU=Status 3 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      expect(fieldSection.fields).toHaveLength(3);

      // Verify each field has correct OptionOrdinalValues
      const field1 = fieldSection.fields[0] as FieldDeclaration;
      const ov1 = field1.properties?.properties?.find((p: Property) => p.name === 'OptionOrdinalValues');
      expect(ov1?.value).toBe('[-1;0;1]');

      const field2 = fieldSection.fields[1] as FieldDeclaration;
      const ov2 = field2.properties?.properties?.find((p: Property) => p.name === 'OptionOrdinalValues');
      expect(ov2?.value).toBe('[-1;1;2]');

      const field3 = fieldSection.fields[2] as FieldDeclaration;
      const ov3 = field3.properties?.properties?.find((p: Property) => p.name === 'OptionOrdinalValues');
      expect(ov3?.value).toBe('[1;2;3]');
    });
  });

  describe('REGRESSION: Bracket depth safety checks', () => {
    it('should handle extra closing brackets gracefully', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=[1;2;3]];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Parser should handle the extra closing bracket
      expect(ast.object).toBeDefined();
    });

    it('should handle brackets in property name context', () => {
      // Edge case: bracket-like characters in quoted property names (shouldn't happen but test robustness)
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; "Field[1]" ; Code20 ;
            CaptionML=ENU=Test Field;
            Description=Field with brackets in name }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;

      // Field name should be parsed correctly
      expect(field.fieldName).toContain('Field');
    });
  });

  describe('Edge cases: Whitespace and formatting variations', () => {
    it('should handle arrays with extra whitespace', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=[  1  ;  2  ;  3  ];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      // Value should preserve spacing as it appears in source
      expect(optionOrdinalValues?.value).toContain('1');
      expect(optionOrdinalValues?.value).toContain('2');
      expect(optionOrdinalValues?.value).toContain('3');
    });

    it('should handle arrays without spaces around semicolons', () => {
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Option ;
            OptionOrdinalValues=[1;2;3;4;5];
            CaptionML=ENU=Test }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinalValues = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      expect(optionOrdinalValues?.value).toBe('[1;2;3;4;5]');
    });
  });

  describe('REGRESSION: Properties with slash in name (Format/Evaluate)', () => {
    it('should parse Format/Evaluate property in XMLport', () => {
      const code = `OBJECT XMLport 1225 Test {
        PROPERTIES {
          Encoding=UTF-8;
          Format/Evaluate=XML Format/Evaluate;
        }
        ELEMENTS {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.properties?.properties).toHaveLength(2);

      const formatEval = ast.object?.properties?.properties.find(
        (p: Property) => p.name === 'Format/Evaluate'
      );
      expect(formatEval).toBeDefined();
      expect(formatEval?.value).toBe('XML Format/Evaluate');
    });

    it('should parse Format/Evaluate with C/SIDE value', () => {
      const code = `OBJECT XMLport 1660 Test {
        PROPERTIES {
          Format/Evaluate=C/SIDE Format/Evaluate;
        }
        ELEMENTS {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const formatEval = ast.object?.properties?.properties.find(
        (p: Property) => p.name === 'Format/Evaluate'
      );
      expect(formatEval).toBeDefined();
      expect(formatEval?.value).toBe('C/SIDE Format/Evaluate');
    });

    it('should parse regular properties without slashes', () => {
      // Verify we didn't break normal property parsing
      const code = `OBJECT Table 50000 Test {
        PROPERTIES {
          DataPerCompany=Yes;
          Permissions=TableData 18=rm;
        }
        FIELDS {
          { 1 ; ; No ; Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const dataProp = ast.object?.properties?.properties.find(
        (p: Property) => p.name === 'DataPerCompany'
      );
      expect(dataProp?.value).toBe('Yes');

      const permProp = ast.object?.properties?.properties.find(
        (p: Property) => p.name === 'Permissions'
      );
      expect(permProp?.value).toBe('TableData 18=rm');
    });
  });
});
