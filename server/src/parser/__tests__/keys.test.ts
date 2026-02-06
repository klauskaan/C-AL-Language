/**
 * Tests for KEYS Section Multi-Token Field Name Parsing (Issue #188)
 *
 * KEYS format:
 * ```
 * KEYS
 * {
 *   {    ;Field1,Field2,Field3   ;Properties }
 *   {    ;Single Field            }
 * }
 * ```
 *
 * Validates that parseKey() correctly:
 * - Accumulates all tokens between commas into a single field name
 * - Preserves internal spacing (e.g., "Balance (LCY)" not "Balance(LCY)")
 * - Trims outer whitespace
 * - Handles periods, parentheses, and multi-word names
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { KeySection, ObjectDeclaration } from '../ast';

describe('Parser - KEYS Section Multi-Token Field Names', () => {
  describe('Single field cases', () => {
    it('should parse key with single simple field name', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;No.   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys).toBeDefined();
      expect(keys.type).toBe('KeySection');
      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.type).toBe('KeyDeclaration');
      expect(key.fields).toEqual(['No.']);
      expect(key.properties).toBeNull();
    });

    it('should parse key with single multi-token field name', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;Customer Type   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['Customer Type']);
      expect(key.properties).toBeNull();
    });

    it('should parse key with field name containing parentheses', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;Balance (LCY)   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['Balance (LCY)']);
    });
  });

  describe('Multiple field cases', () => {
    it('should parse key with multiple simple field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;No.,Name   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.', 'Name']);
    });

    it('should parse key with multiple multi-token field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;Customer Type,Credit Limit   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['Customer Type', 'Credit Limit']);
    });

    it('should parse key with mixed simple and multi-token field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;No.,Customer Type,City   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.', 'Customer Type', 'City']);
    });
  });

  describe('Complex field names', () => {
    it('should parse key with multiple periods in field names', () => {
      const code = `OBJECT Table 1225 "Data Exch. Field Mapping"
      {
        KEYS
        {
          {    ;Data Exch. Def Code,Data Exch. Line Def Code,Column No.   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual([
        'Data Exch. Def Code',
        'Data Exch. Line Def Code',
        'Column No.'
      ]);
    });

    it('should parse key with five multi-token fields containing periods', () => {
      const code = `OBJECT Table 1225 "Data Exch. Field Mapping"
      {
        KEYS
        {
          {    ;Data Exch. Def Code,Data Exch. Line Def Code,Table ID,Column No.,Field ID   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual([
        'Data Exch. Def Code',
        'Data Exch. Line Def Code',
        'Table ID',
        'Column No.',
        'Field ID'
      ]);
    });

    it('should parse key with field names containing parentheses and spaces', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;No.,Balance Due (LCY),Sales (LCY)   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.', 'Balance Due (LCY)', 'Sales (LCY)']);
    });
  });

  describe('Keys with properties', () => {
    it('should parse key with simple field and properties', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;No.   ;Clustered=Yes }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.']);
      // Properties parsing is out of scope for this test - just verify fields work
      // (Current implementation sets properties to null)
      expect(key.properties).toBeNull();
    });

    it('should parse key with multi-token fields and properties', () => {
      const code = `OBJECT Table 1001 "Job Task"
      {
        KEYS
        {
          {    ;Job No.,Job Task No.   ;SumIndexFields=Recognized Sales Amount,Recognized Costs Amount;
                                        Clustered=Yes }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['Job No.', 'Job Task No.']);
      // Properties parsing is out of scope - just verify field accumulation works
      expect(key.properties).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should parse key with empty field list', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toHaveLength(0);
    });

    it('should parse multiple keys with multi-token field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;Job No.,Job Task No.   }
          {    ;Job Task No.            }
          {    ;Customer Type,No.       }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(3);

      expect(keys.keys[0].fields).toEqual(['Job No.', 'Job Task No.']);
      expect(keys.keys[1].fields).toEqual(['Job Task No.']);
      expect(keys.keys[2].fields).toEqual(['Customer Type', 'No.']);
    });
  });

  describe('Whitespace handling', () => {
    it('should handle extra whitespace between tokens in field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;  Customer  Type  ,  Credit  Limit  }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      // Should preserve internal spaces but trim outer spaces
      expect(key.fields).toEqual(['Customer Type', 'Credit Limit']);
    });

    it('should trim leading and trailing whitespace from field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;   No.   ,   Name   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.', 'Name']);
    });
  });

  describe('Quoted identifier handling', () => {
    it('should parse key with quoted field name', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;"No."   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.']);
    });

    it('should parse key with multiple quoted field names', () => {
      const code = `OBJECT Table 18 Customer
      {
        KEYS
        {
          {    ;"No.","Customer Type"   }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;
      const keys = obj.keys as KeySection;

      expect(keys.keys).toHaveLength(1);

      const key = keys.keys[0];
      expect(key.fields).toEqual(['No.', 'Customer Type']);
    });
  });

  describe('Integration with full table structure', () => {
    it('should parse KEYS alongside FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
      {
        FIELDS
        {
          { 1   ;   ;No.                 ;Code20        }
          { 2   ;   ;Name                ;Text50        }
          { 3   ;   ;Customer Type       ;Option        }
        }
        KEYS
        {
          {    ;No.                      ;Clustered=Yes }
          {    ;Customer Type,No.         }
        }
      }`;

      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const obj = ast.object as ObjectDeclaration;

      // Verify FIELDS section exists
      expect(obj.fields).toBeDefined();

      // Verify KEYS section exists and is parsed correctly
      const keys = obj.keys as KeySection;
      expect(keys).toBeDefined();
      expect(keys.keys).toHaveLength(2);

      expect(keys.keys[0].fields).toEqual(['No.']);
      expect(keys.keys[1].fields).toEqual(['Customer Type', 'No.']);
    });
  });
});
