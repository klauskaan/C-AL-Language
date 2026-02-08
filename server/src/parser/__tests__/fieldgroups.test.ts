/**
 * Tests for FIELDGROUPS Parsing
 *
 * FIELDGROUPS format:
 * ```
 * FIELDGROUPS
 * {
 *   { ID ; Name ; FieldList }
 * }
 * ```
 * where:
 * - ID is an integer
 * - Name is an identifier
 * - FieldList is comma-separated field names (may contain spaces, parentheses, periods)
 *
 * The parser should:
 * - Parse each field group entry
 * - Extract id, name, and fields array
 * - Handle whitespace and special characters in field names
 * - Recover from malformed entries
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { FieldGroupSection, ObjectDeclaration } from '../ast';

describe('Parser - FIELDGROUPS Section', () => {
  describe('Basic field group parsing', () => {
    it('should parse simple field group with basic field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;DropDown            ;No.,Name,City                    }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups).toBeDefined();
      expect(fieldGroups.type).toBe('FieldGroupSection');
      expect(fieldGroups.fieldGroups).toHaveLength(1);

      const group = fieldGroups.fieldGroups[0];
      expect(group.type).toBe('FieldGroup');
      expect(group.id).toBe(1);
      expect(group.name).toBe('DropDown');
      expect(group.fields).toEqual(['No.', 'Name', 'City']);
    });

    it('should parse field group with fields containing parentheses', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 2   ;Brick               ;No.,Name,Balance (LCY)           }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(1);

      const group = fieldGroups.fieldGroups[0];
      expect(group.id).toBe(2);
      expect(group.name).toBe('Brick');
      expect(group.fields).toEqual(['No.', 'Name', 'Balance (LCY)']);
    });

    it('should parse field group with fields containing multiple spaces', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;Test                ;Balance Due (LCY),Post Code      }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(1);

      const group = fieldGroups.fieldGroups[0];
      expect(group.id).toBe(1);
      expect(group.name).toBe('Test');
      expect(group.fields).toEqual(['Balance Due (LCY)', 'Post Code']);
    });
  });

  describe('Edge cases', () => {
    it('should parse empty FIELDGROUPS section', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups).toBeDefined();
      expect(fieldGroups.type).toBe('FieldGroupSection');
      expect(fieldGroups.fieldGroups).toHaveLength(0);
    });

    it('should parse multiple field groups', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;DropDown            ;No.,Name,City                    }
          { 2   ;Brick               ;No.,Name,Balance (LCY)           }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(2);

      const group1 = fieldGroups.fieldGroups[0];
      expect(group1.id).toBe(1);
      expect(group1.name).toBe('DropDown');
      expect(group1.fields).toEqual(['No.', 'Name', 'City']);

      const group2 = fieldGroups.fieldGroups[1];
      expect(group2.id).toBe(2);
      expect(group2.name).toBe('Brick');
      expect(group2.fields).toEqual(['No.', 'Name', 'Balance (LCY)']);
    });

    it('should parse field group with single field', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;Single              ;OnlyOne                          }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(1);

      const group = fieldGroups.fieldGroups[0];
      expect(group.id).toBe(1);
      expect(group.name).toBe('Single');
      expect(group.fields).toEqual(['OnlyOne']);
    });

    it('should parse field group with empty field list', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;Empty               ;                                 }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(1);

      const group = fieldGroups.fieldGroups[0];
      expect(group.id).toBe(1);
      expect(group.name).toBe('Empty');
      expect(group.fields).toHaveLength(0);
    });
  });

  describe('Whitespace handling', () => {
    it('should handle extra whitespace in field group definition', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          {  1  ;  DropDown  ;  No.  ,  Name  ,  City  }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(1);

      const group = fieldGroups.fieldGroups[0];
      expect(group.id).toBe(1);
      expect(group.name).toBe('DropDown');
      // Field names should be trimmed
      expect(group.fields).toEqual(['No.', 'Name', 'City']);
    });

    it('should preserve spaces within field names but trim outer spaces', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;Test                ; Balance Due , Post Code         }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      const group = fieldGroups.fieldGroups[0];
      // Inner spaces preserved, outer spaces trimmed
      expect(group.fields).toEqual(['Balance Due', 'Post Code']);
    });
  });

  describe('Special characters in field names', () => {
    it('should handle fields with periods in names', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;DropDown            ;No.,Name,Balance (LCY)           }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      const group = fieldGroups.fieldGroups[0];
      // Period is part of field name "No."
      expect(group.fields[0]).toBe('No.');
    });

    it('should handle fields with parentheses and spaces', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;Test                ;Balance Due (LCY),Sales (LCY)    }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      const group = fieldGroups.fieldGroups[0];
      expect(group.fields).toEqual(['Balance Due (LCY)', 'Sales (LCY)']);
    });
  });

  describe('Error recovery', () => {
    it('should recover from malformed field group and parse valid entries', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;Malformed           }
          { 2   ;Valid               ;No.,Name                         }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Expect some errors but parser should recover
      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      // Should have at least one valid entry
      const validGroups = fieldGroups.fieldGroups.filter(g => g.id === 2);
      expect(validGroups).toHaveLength(1);
      expect(validGroups[0].name).toBe('Valid');
      expect(validGroups[0].fields).toEqual(['No.', 'Name']);
    });

    it('should handle missing closing brace gracefully', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;DropDown            ;No.,Name,City
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should have errors but not crash
      expect(ast.object).toBeDefined();
      const obj = ast.object as ObjectDeclaration;
      expect(obj.fieldGroups).toBeDefined();
    });
  });

  describe('Integration with full table structure', () => {
    it('should parse FIELDGROUPS alongside FIELDS and PROPERTIES', () => {
      const code = `OBJECT Table 18 Customer
      {
        PROPERTIES
        {
          DataPerCompany=Yes;
        }
        FIELDS
        {
          { 1   ;   ;No.                 ;Code20        }
          { 2   ;   ;Name                ;Text50        }
          { 3   ;   ;City                ;Text30        }
        }
        FIELDGROUPS
        {
          { 1   ;DropDown            ;No.,Name,City                    }
          { 2   ;Brick               ;No.,Name                         }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const obj = ast.object as ObjectDeclaration;

      // Verify PROPERTIES section exists
      expect(obj.properties).toBeDefined();

      // Verify FIELDS section exists
      expect(obj.fields).toBeDefined();

      // Verify FIELDGROUPS section exists and is parsed correctly
      const fieldGroups = obj.fieldGroups as FieldGroupSection;
      expect(fieldGroups).toBeDefined();
      expect(fieldGroups.fieldGroups).toHaveLength(2);

      const group1 = fieldGroups.fieldGroups[0];
      expect(group1.id).toBe(1);
      expect(group1.name).toBe('DropDown');
      expect(group1.fields).toEqual(['No.', 'Name', 'City']);

      const group2 = fieldGroups.fieldGroups[1];
      expect(group2.id).toBe(2);
      expect(group2.name).toBe('Brick');
      expect(group2.fields).toEqual(['No.', 'Name']);
    });
  });

  describe('ID handling', () => {
    it('should parse field group with large ID', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 99999 ;DropDown          ;No.,Name                         }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      const group = fieldGroups.fieldGroups[0];
      expect(group.id).toBe(99999);
    });

    it('should parse field groups with sequential IDs', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;First               ;No.                              }
          { 2   ;Second              ;Name                             }
          { 3   ;Third               ;City                             }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;

      expect(fieldGroups.fieldGroups).toHaveLength(3);
      expect(fieldGroups.fieldGroups[0].id).toBe(1);
      expect(fieldGroups.fieldGroups[1].id).toBe(2);
      expect(fieldGroups.fieldGroups[2].id).toBe(3);
    });
  });

  describe('Quoted identifier names', () => {
    it('should parse field group with quoted name', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDGROUPS
        {
          { 1   ;"Special Name"       ;No.,Name                         }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const obj = ast.object as ObjectDeclaration;
      const fieldGroups = obj.fieldGroups as FieldGroupSection;
      const group = fieldGroups.fieldGroups[0];

      expect(group.id).toBe(1);
      expect(group.name).toBe('Special Name');
      expect(group.fields).toEqual(['No.', 'Name']);
    });
  });
});
