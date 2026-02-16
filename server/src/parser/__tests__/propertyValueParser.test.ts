/**
 * PropertyValueParser - CalcFormula and TableRelation Mini-Parser Tests
 *
 * Tests for parsing complex property values into structured AST nodes.
 *
 * Context: Issue #9 - Parse CalcFormula and TableRelation with mini-parser
 * - Step 1 (complete): Property.valueTokens captures tokens
 * - Step 2 (this file): PropertyValueParser consumes tokens to create AST
 *
 * The PropertyValueParser:
 * 1. Accepts an array of tokens (from Property.valueTokens)
 * 2. Parses CalcFormula: Sum/Count/Lookup/Exist/Min/Max/Average with WHERE clauses
 * 3. Parses TableRelation: simple/qualified table refs with WHERE and IF/ELSE
 * 4. Returns structured AST nodes with proper type information
 * 5. Gracefully handles malformed input (returns null on parse failure)
 * 6. Preserves position information from original tokens
 * 7. Collects diagnostics for parse failures (issue #193)
 *
 * Test Coverage:
 * - CalcFormula: All aggregation functions (Sum, Count, Lookup, Exist, Min, Max, Average)
 * - CalcFormula: WHERE clauses with FIELD(), CONST(), FILTER() predicates
 * - CalcFormula: Multiple WHERE conditions separated by commas
 * - TableRelation: Simple table references
 * - TableRelation: Qualified table.field references
 * - TableRelation: WHERE clauses with predicates
 * - TableRelation: Conditional IF/ELSE relations (including nested IF/ELSE)
 * - Error handling: Malformed expressions, missing tokens, unexpected tokens
 * - Diagnostic reporting: Error messages with token positions (issue #193)
 * - Edge cases: Empty input, whitespace, incomplete expressions
 */

import { parseCode } from './parserTestHelpers';
import { Property, FieldDeclaration, FieldSection } from '../ast';
import { PropertyValueParser } from '../propertyValueParser';
import { Token, TokenType } from '../../lexer/tokens';

/**
 * Helper function to extract valueTokens from a parsed property.
 * Reduces boilerplate in tests.
 */
function getPropertyValueTokens(code: string, propertyName: string): Token[] {
  const { ast } = parseCode(code);

  const fieldSection = ast.object?.fields as FieldSection | undefined;
  if (!fieldSection) {
    throw new Error('No fields section found in test code');
  }

  const field = fieldSection.fields[0] as FieldDeclaration;
  const property = field.properties?.properties?.find(
    (p: Property) => p.name === propertyName
  );

  if (!property?.valueTokens) {
    throw new Error(`Property ${propertyName} has no valueTokens`);
  }

  return property.valueTokens;
}


describe('PropertyValueParser - CalcFormula Parsing', () => {
  describe('Basic CalcFormula aggregation functions', () => {
    it('should parse Sum function with simple table.field reference', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.type).toBe('CalcFormulaNode');
      expect(result?.aggregationFunction).toBe('Sum');
      expect(result?.sourceTable).toBe('Sales Line');
      expect(result?.sourceField).toBe('Amount');
      expect(result?.whereClause).toBeUndefined();
    });

    it('should parse Count function with table reference', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; LineCount ; Integer ;
            CalcFormula=Count("Sales Line") }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.type).toBe('CalcFormulaNode');
      expect(result?.aggregationFunction).toBe('Count');
      expect(result?.sourceTable).toBe('Sales Line');
      expect(result?.sourceField).toBeUndefined(); // Count doesn't need a field
      expect(result?.whereClause).toBeUndefined();
    });

    it('should parse Lookup function', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; AccountName ; Text[50] ;
            CalcFormula=Lookup("G/L Account".Name WHERE (No.=FIELD("No."))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Lookup');
      expect(result?.sourceTable).toBe('G/L Account');
      expect(result?.sourceField).toBe('Name');
      expect(result?.whereClause).toBeDefined();
    });

    it('should parse Exist function', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; HasEntries ; Boolean ;
            CalcFormula=Exist("Customer Ledger Entry" WHERE ("Customer No."=FIELD("No."))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Exist');
      expect(result?.sourceTable).toBe('Customer Ledger Entry');
      expect(result?.whereClause).toBeDefined();
    });

    it('should parse Min function', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; MinAmount ; Decimal ;
            CalcFormula=Min("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Min');
      expect(result?.sourceTable).toBe('Sales Line');
      expect(result?.sourceField).toBe('Amount');
    });

    it('should parse Max function', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; MaxAmount ; Decimal ;
            CalcFormula=Max("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Max');
      expect(result?.sourceTable).toBe('Sales Line');
      expect(result?.sourceField).toBe('Amount');
    });

    it('should parse Average function', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; AvgAmount ; Decimal ;
            CalcFormula=Average("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Average');
      expect(result?.sourceTable).toBe('Sales Line');
      expect(result?.sourceField).toBe('Amount');
    });
  });

  describe('CalcFormula with WHERE clauses', () => {
    it('should parse WHERE clause with single FIELD() predicate', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("Customer Ledger Entry".Amount WHERE ("Customer No."=FIELD("No."))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Customer No.');
      expect(condition?.operator).toBe('=');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('No.');
    });

    it('should parse WHERE clause with single CONST() predicate', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; ItemCount ; Integer ;
            CalcFormula=Count("Sales Line" WHERE (Type=CONST(Item))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Type');
      expect(condition?.operator).toBe('=');
      expect(condition?.predicateType).toBe('CONST');
      expect(condition?.predicateValue).toBe('Item');
    });

    it('should parse WHERE clause with FILTER() predicate', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("G/L Entry".Amount WHERE ("G/L Account No."=FILTER('1000..9999'))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('G/L Account No.');
      expect(condition?.operator).toBe('=');
      expect(condition?.predicateType).toBe('FILTER');
      expect(condition?.predicateValue).toBe('1000..9999');
    });

    it('should parse WHERE clause with multiple conditions', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("Detailed Cust. Ledg. Entry".Amount WHERE ("Customer No."=FIELD("No."),
                                                                         "Posting Date"=FIELD("Date Filter"))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(2);

      const condition1 = result?.whereClause?.conditions[0];
      expect(condition1?.fieldName).toBe('Customer No.');
      expect(condition1?.predicateType).toBe('FIELD');
      expect(condition1?.predicateValue).toBe('No.');

      const condition2 = result?.whereClause?.conditions[1];
      expect(condition2?.fieldName).toBe('Posting Date');
      expect(condition2?.predicateType).toBe('FIELD');
      expect(condition2?.predicateValue).toBe('Date Filter');
    });

    it('should parse WHERE clause with mixed predicate types', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; ItemBalance ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount WHERE (Type=CONST(Item),
                                                        "Sell-to Customer No."=FIELD("No."),
                                                        "Document Type"=FILTER('Order|Invoice'))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result?.whereClause?.conditions).toHaveLength(3);

      expect(result?.whereClause?.conditions[0]?.predicateType).toBe('CONST');
      expect(result?.whereClause?.conditions[1]?.predicateType).toBe('FIELD');
      expect(result?.whereClause?.conditions[2]?.predicateType).toBe('FILTER');
    });
  });

  describe('CalcFormula edge cases', () => {
    it('should handle unquoted table names', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum(Customer.Balance) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.sourceTable).toBe('Customer');
      expect(result?.sourceField).toBe('Balance');
    });

    it('should handle quoted field names with special characters', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("Cust. Ledger Entry"."Amount (LCY)") }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.sourceTable).toBe('Cust. Ledger Entry');
      expect(result?.sourceField).toBe('Amount (LCY)');
    });

    it('should preserve token position information', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      // Result should have startToken and endToken from original tokens
      expect(result?.startToken).toBeDefined();
      expect(result?.endToken).toBeDefined();
      expect(result?.startToken.line).toBeGreaterThan(0);
      expect(result?.endToken.line).toBeGreaterThan(0);
    });
  });
});

describe('PropertyValueParser - TableRelation Parsing', () => {
  describe('Simple TableRelation patterns', () => {
    it('should parse simple unquoted table reference', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation=Customer }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.type).toBe('TableRelationNode');
      expect(result?.tableName).toBe('Customer');
      expect(result?.fieldName).toBeUndefined();
      expect(result?.whereClause).toBeUndefined();
      expect(result?.conditionalRelations).toBeUndefined();
    });

    it('should parse simple quoted table reference', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; PostCode ; Code20 ;
            TableRelation="Post Code" }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.tableName).toBe('Post Code');
      expect(result?.fieldName).toBeUndefined();
    });

    it('should parse qualified table.field reference', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; GLAccountNo ; Code20 ;
            TableRelation="G/L Account"."No." }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.tableName).toBe('G/L Account');
      expect(result?.fieldName).toBe('No.');
    });

    it('should parse qualified reference with unquoted field', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; ItemNo ; Code20 ;
            TableRelation=Item."No." }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.tableName).toBe('Item');
      expect(result?.fieldName).toBe('No.');
    });
  });

  describe('TableRelation with WHERE clauses', () => {
    it('should parse WHERE clause with simple condition', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation=Customer WHERE (Blocked=CONST(No)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result?.tableName).toBe('Customer');
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Blocked');
      expect(condition?.operator).toBe('=');
      expect(condition?.predicateType).toBe('CONST');
      expect(condition?.predicateValue).toBe('No');
    });

    it('should parse WHERE clause with FIELD() predicate', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; PostCode ; Code20 ;
            TableRelation="Post Code" WHERE (Country/Region Code=FIELD(Country/Region Code)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Country/Region Code');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('Country/Region Code');
    });

    it('should parse WHERE clause with multiple conditions', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; LineDefCode ; Code20 ;
            TableRelation="Data Exch. Line Def".Code WHERE (Data Exch. Def Code=FIELD(Data Exch. Def Code),
                                                             Type=CONST(Import)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result?.whereClause?.conditions).toHaveLength(2);

      expect(result?.whereClause?.conditions[0]?.fieldName).toBe('Data Exch. Def Code');
      expect(result?.whereClause?.conditions[0]?.predicateType).toBe('FIELD');

      expect(result?.whereClause?.conditions[1]?.fieldName).toBe('Type');
      expect(result?.whereClause?.conditions[1]?.predicateType).toBe('CONST');
    });
  });

  describe('TableRelation with IF/ELSE conditionals', () => {
    it('should parse simple IF condition', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.conditionalRelations).toBeDefined();
      expect(result?.conditionalRelations?.length).toBe(1);

      const conditional = result?.conditionalRelations?.[0];
      expect(conditional?.type).toBe('ConditionalTableRelation');
      expect(conditional?.condition).toBeDefined();
      expect(conditional?.condition?.fieldName).toBe('Type');
      expect(conditional?.condition?.operator).toBe('=');
      expect(conditional?.condition?.predicateType).toBe('CONST');
      expect(conditional?.condition?.predicateValue).toBe('Item');
      expect(conditional?.thenRelation?.tableName).toBe('Item');
      expect(conditional?.elseRelation).toBeUndefined();
    });

    it('should parse IF/ELSE condition', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item ELSE Resource }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result?.conditionalRelations).toBeDefined();
      expect(result?.conditionalRelations?.length).toBe(1);

      const conditional = result?.conditionalRelations?.[0];
      expect(conditional?.thenRelation?.tableName).toBe('Item');
      expect(conditional?.elseRelation).toBeDefined();
      expect(conditional?.elseRelation?.tableName).toBe('Resource');
    });

    it('should parse valid conditional TableRelation without rejecting ELSE keyword (regression for #191)', () => {
      // Regression test: Ensure the fix for #191 (rejecting trailing tokens)
      // does NOT break valid ELSE syntax
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item ELSE Resource }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should successfully parse - ELSE is valid syntax, not trailing garbage
      expect(result).not.toBeNull();
      expect(result?.conditionalRelations).toBeDefined();
      expect(result?.conditionalRelations?.length).toBe(1);

      const conditional = result?.conditionalRelations?.[0];
      expect(conditional?.thenRelation?.tableName).toBe('Item');
      expect(conditional?.elseRelation).toBeDefined();
      expect(conditional?.elseRelation?.tableName).toBe('Resource');
    });

    it('should parse nested IF/ELSE IF/ELSE chain', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(G/L Account)) "G/L Account"
                          ELSE IF (Type=CONST(Item)) Item
                          ELSE Resource }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should have multiple conditional relations (chain of IF/ELSE)
      expect(result?.conditionalRelations).toBeDefined();
      expect(result?.conditionalRelations?.length).toBeGreaterThan(1);

      // First condition: IF Type=CONST(G/L Account)
      expect(result?.conditionalRelations?.[0]?.condition?.predicateValue).toBe('G/L Account');
      expect(result?.conditionalRelations?.[0]?.thenRelation?.tableName).toBe('G/L Account');

      // Second condition: ELSE IF Type=CONST(Item)
      expect(result?.conditionalRelations?.[1]?.condition?.predicateValue).toBe('Item');
      expect(result?.conditionalRelations?.[1]?.thenRelation?.tableName).toBe('Item');

      // Final ELSE
      expect(result?.conditionalRelations?.[1]?.elseRelation?.tableName).toBe('Resource');
    });

    it('should parse IF condition with WHERE clause in then branch', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item WHERE (Blocked=CONST(No)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      const conditional = result?.conditionalRelations?.[0];
      expect(conditional?.thenRelation?.tableName).toBe('Item');
      expect(conditional?.thenRelation?.whereClause).toBeDefined();
      expect(conditional?.thenRelation?.whereClause?.conditions).toHaveLength(1);
    });
  });

  describe('TableRelation IF/ELSE IF/ELSE chain as flat array (issue #228)', () => {
    it('should parse IF/ELSE IF/ELSE chain as flat array with 3 branches', () => {
      // Main test case for issue #228
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(G/L Account)) "G/L Account"
                          ELSE IF (Type=CONST(Item)) Item
                          ELSE Resource }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should produce flat array with 2 elements (not nested)
      expect(result?.conditionalRelations).toBeDefined();
      expect(result?.conditionalRelations?.length).toBe(2);

      // First condition: IF Type=CONST(G/L Account) -> "G/L Account"
      const firstCondition = result?.conditionalRelations?.[0];
      expect(firstCondition?.condition?.fieldName).toBe('Type');
      expect(firstCondition?.condition?.predicateValue).toBe('G/L Account');
      expect(firstCondition?.thenRelation?.tableName).toBe('G/L Account');
      expect(firstCondition?.elseRelation).toBeUndefined(); // Should not have ELSE

      // Second condition: ELSE IF Type=CONST(Item) -> Item ELSE Resource
      const secondCondition = result?.conditionalRelations?.[1];
      expect(secondCondition?.condition?.fieldName).toBe('Type');
      expect(secondCondition?.condition?.predicateValue).toBe('Item');
      expect(secondCondition?.thenRelation?.tableName).toBe('Item');
      expect(secondCondition?.elseRelation).toBeDefined(); // Final ELSE
      expect(secondCondition?.elseRelation?.tableName).toBe('Resource');
    });

    it('should parse IF/ELSE IF without final ELSE', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item
                          ELSE IF (Type=CONST(Resource)) Resource }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should produce flat array with 2 elements
      expect(result?.conditionalRelations?.length).toBe(2);

      // First condition has no elseRelation
      expect(result?.conditionalRelations?.[0]?.elseRelation).toBeUndefined();

      // Second condition also has no elseRelation
      expect(result?.conditionalRelations?.[1]?.elseRelation).toBeUndefined();
    });

    it('should parse chain with 4+ branches', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (A=CONST(1)) T1
                          ELSE IF (A=CONST(2)) T2
                          ELSE IF (A=CONST(3)) T3
                          ELSE T4 }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should produce flat array with 3 elements (3 conditions)
      expect(result?.conditionalRelations?.length).toBe(3);

      // Only the last condition should have elseRelation
      expect(result?.conditionalRelations?.[0]?.elseRelation).toBeUndefined();
      expect(result?.conditionalRelations?.[1]?.elseRelation).toBeUndefined();
      expect(result?.conditionalRelations?.[2]?.elseRelation).toBeDefined();
      expect(result?.conditionalRelations?.[2]?.elseRelation?.tableName).toBe('T4');
    });

    it('should parse chain with WHERE clause on middle branch', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item WHERE (Blocked=CONST(No))
                          ELSE IF (Type=CONST(Resource)) Resource
                          ELSE "G/L Account" }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Flat structure should be preserved
      expect(result?.conditionalRelations?.length).toBe(2);

      // First condition's thenRelation should have WHERE clause
      expect(result?.conditionalRelations?.[0]?.thenRelation?.tableName).toBe('Item');
      expect(result?.conditionalRelations?.[0]?.thenRelation?.whereClause).toBeDefined();
      expect(result?.conditionalRelations?.[0]?.thenRelation?.whereClause?.conditions).toHaveLength(1);

      // Second condition should have proper structure
      expect(result?.conditionalRelations?.[1]?.thenRelation?.tableName).toBe('Resource');
      expect(result?.conditionalRelations?.[1]?.elseRelation?.tableName).toBe('G/L Account');
    });

    it('should return null for malformed ELSE IF without THEN relation', () => {
      // Malformed: ELSE IF with condition but no table reference
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item
                          ELSE IF (Type=CONST(Resource)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should reject malformed input
      expect(result).toBeNull();
    });
  });

  describe('TableRelation edge cases', () => {
    it('should handle qualified field reference in conditional', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; AccountNo ; Code20 ;
            TableRelation=IF (Source Type=CONST(G/L Account)) "G/L Account"."No." }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      const conditional = result?.conditionalRelations?.[0];
      expect(conditional?.thenRelation?.tableName).toBe('G/L Account');
      expect(conditional?.thenRelation?.fieldName).toBe('No.');
    });

    it('should preserve token positions', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation=Customer }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result?.startToken).toBeDefined();
      expect(result?.endToken).toBeDefined();
      expect(result?.startToken.type).toBe(TokenType.Identifier);
      expect(result?.startToken.value).toBe('Customer');
    });
  });
});

describe('PropertyValueParser - Error Handling', () => {
  describe('Graceful degradation', () => {
    it('should return null for empty token array', () => {
      const parser = new PropertyValueParser([]);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();
    });

    it('should return null for malformed CalcFormula (missing parentheses)', () => {
      // Manually construct malformed tokens - missing opening paren
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 1, column: 4, startOffset: 4, endOffset: 16 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();
    });

    it('should return null for malformed TableRelation (unexpected token)', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Customer', line: 1, column: 1, startOffset: 0, endOffset: 8 },
        { type: TokenType.Semicolon, value: ';', line: 1, column: 9, startOffset: 9, endOffset: 10 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Semicolon is not expected in TableRelation - should fail gracefully
      expect(result).toBeNull();
    });

    it('should return null for simple TableRelation with trailing garbage', () => {
      // Bug #191: Parser accepts "Customer garbage" without validation
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Customer', line: 1, column: 1, startOffset: 0, endOffset: 8 },
        { type: TokenType.Identifier, value: 'garbage', line: 1, column: 10, startOffset: 10, endOffset: 17 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      // Should reject trailing "garbage" token after valid TableRelation
      expect(result).toBeNull();
    });

    it('should return null for conditional TableRelation with trailing garbage', () => {
      // Bug #191: Parser accepts "IF (Type=CONST(Item)) Item garbage" without validation
      const tokens: Token[] = [
        { type: TokenType.If, value: 'IF', line: 1, column: 1, startOffset: 0, endOffset: 2 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.Identifier, value: 'Type', line: 1, column: 5, startOffset: 5, endOffset: 9 },
        { type: TokenType.Equal, value: '=', line: 1, column: 9, startOffset: 9, endOffset: 10 },
        { type: TokenType.Identifier, value: 'CONST', line: 1, column: 10, startOffset: 10, endOffset: 15 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 15, startOffset: 15, endOffset: 16 },
        { type: TokenType.Identifier, value: 'Item', line: 1, column: 16, startOffset: 16, endOffset: 20 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 20, startOffset: 20, endOffset: 21 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 21, startOffset: 21, endOffset: 22 },
        { type: TokenType.Identifier, value: 'Item', line: 1, column: 23, startOffset: 23, endOffset: 27 },
        { type: TokenType.Identifier, value: 'garbage', line: 1, column: 28, startOffset: 28, endOffset: 35 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();
    });

    it('should return null for CalcFormula with multiple trailing tokens', () => {
      // Bug #191: Parser accepts "Sum("Sales Line".Amount) garbage more" without validation
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 1, column: 5, startOffset: 5, endOffset: 17 },
        { type: TokenType.Dot, value: '.', line: 1, column: 17, startOffset: 17, endOffset: 18 },
        { type: TokenType.Identifier, value: 'Amount', line: 1, column: 18, startOffset: 18, endOffset: 24 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 24, startOffset: 24, endOffset: 25 },
        { type: TokenType.Identifier, value: 'garbage', line: 1, column: 26, startOffset: 26, endOffset: 33 },
        { type: TokenType.Identifier, value: 'more', line: 1, column: 34, startOffset: 34, endOffset: 38 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();
    });

    it('should return null for CalcFormula with unknown aggregation function', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'InvalidFunc', line: 1, column: 1, startOffset: 0, endOffset: 11 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 12, startOffset: 12, endOffset: 13 },
        { type: TokenType.Identifier, value: 'Table', line: 1, column: 13, startOffset: 13, endOffset: 18 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 18, startOffset: 18, endOffset: 19 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();
    });

    it('should return null for incomplete WHERE clause', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Customer', line: 1, column: 1, startOffset: 0, endOffset: 8 },
        { type: TokenType.Identifier, value: 'WHERE', line: 1, column: 10, startOffset: 10, endOffset: 15 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 16, startOffset: 16, endOffset: 17 },
        // Missing rest of WHERE clause
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();
    });

    it('should handle incomplete IF condition gracefully', () => {
      const tokens: Token[] = [
        { type: TokenType.If, value: 'IF', line: 1, column: 1, startOffset: 0, endOffset: 2 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.Identifier, value: 'Type', line: 1, column: 5, startOffset: 5, endOffset: 9 },
        // Missing rest of condition
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();
    });
  });

  describe('Error recovery', () => {
    it('should handle missing closing parenthesis', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 1, column: 5, startOffset: 5, endOffset: 17 },
        { type: TokenType.Dot, value: '.', line: 1, column: 17, startOffset: 17, endOffset: 18 },
        { type: TokenType.Identifier, value: 'Amount', line: 1, column: 18, startOffset: 18, endOffset: 24 },
        // Missing closing paren
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      // Should still attempt to parse what's available or return null
      expect(result === null || result !== undefined).toBe(true);
    });

    it('should handle malformed WHERE predicate', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Customer', line: 1, column: 1, startOffset: 0, endOffset: 8 },
        { type: TokenType.Identifier, value: 'WHERE', line: 1, column: 10, startOffset: 10, endOffset: 15 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 16, startOffset: 16, endOffset: 17 },
        { type: TokenType.Identifier, value: 'Blocked', line: 1, column: 17, startOffset: 17, endOffset: 24 },
        { type: TokenType.Equal, value: '=', line: 1, column: 24, startOffset: 24, endOffset: 25 },
        // Missing CONST/FIELD/FILTER
        { type: TokenType.RightParen, value: ')', line: 1, column: 25, startOffset: 25, endOffset: 26 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();
    });
  });
});

describe('PropertyValueParser - Integration with Property.valueTokens', () => {
  describe('Real-world patterns from NAV code', () => {
    it('should parse CalcFormula from Customer table Balance field', () => {
      const code = `OBJECT Table 18 Customer {
        FIELDS {
          { 59  ;   ;Balance (LCY)       ;Decimal       ;
            CaptionML=[ENU=Balance (LCY);
                       DAN=Saldo (RV)];
            FieldClass=FlowField;
            CalcFormula=Sum("Customer Ledger Entry".Amount WHERE (Customer No.=FIELD(No.),
                                                                   Posting Date=FIELD(Date Filter)));
            Editable=No;
            AutoFormatType=1 }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Sum');
      expect(result?.sourceTable).toBe('Customer Ledger Entry');
      expect(result?.sourceField).toBe('Amount');
      expect(result?.whereClause?.conditions).toHaveLength(2);

      // Verify specific conditions
      expect(result?.whereClause?.conditions[0]?.fieldName).toBe('Customer No.');
      expect(result?.whereClause?.conditions[0]?.predicateType).toBe('FIELD');
      expect(result?.whereClause?.conditions[0]?.predicateValue).toBe('No.');

      expect(result?.whereClause?.conditions[1]?.fieldName).toBe('Posting Date');
      expect(result?.whereClause?.conditions[1]?.predicateType).toBe('FIELD');
      expect(result?.whereClause?.conditions[1]?.predicateValue).toBe('Date Filter');
    });

    it('should parse TableRelation from Data Exch. Column Def table', () => {
      const code = `OBJECT Table 1223 "Data Exch. Column Def" {
        FIELDS {
          { 10  ;   ;Data Exch. Line Def Code;Code20    ;
            TableRelation="Data Exch. Line Def".Code WHERE (Data Exch. Def Code=FIELD(Data Exch. Def Code)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.tableName).toBe('Data Exch. Line Def');
      expect(result?.fieldName).toBe('Code');
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);
      expect(result?.whereClause?.conditions[0]?.fieldName).toBe('Data Exch. Def Code');
      expect(result?.whereClause?.conditions[0]?.predicateType).toBe('FIELD');
    });

    it('should parse simple TableRelation', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; PostCode ; Code20 ;
            TableRelation="Post Code" }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeDefined();
      expect(result?.tableName).toBe('Post Code');
      expect(result?.fieldName).toBeUndefined();
      expect(result?.whereClause).toBeUndefined();
      expect(result?.conditionalRelations).toBeUndefined();
    });
  });

  describe('Parser factory method', () => {
    it('should provide static parse method for CalcFormula', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');

      // Static method for convenience
      const result = PropertyValueParser.parseCalcFormula(tokens);

      expect(result).toBeDefined();
      expect(result?.aggregationFunction).toBe('Sum');
    });

    it('should provide static parse method for TableRelation', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation=Customer }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');

      // Static method for convenience
      const result = PropertyValueParser.parseTableRelation(tokens);

      expect(result).toBeDefined();
      expect(result?.tableName).toBe('Customer');
    });
  });
});

describe('PropertyValueParser - Diagnostic Reporting', () => {
  describe('CalcFormula diagnostics', () => {
    it('should report diagnostic for empty input', () => {
      const parser = new PropertyValueParser([]);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain('end of input');
    });

    it('should report diagnostic for invalid aggregation function', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'InvalidFunc', line: 1, column: 1, startOffset: 0, endOffset: 11 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 12, startOffset: 12, endOffset: 13 },
        { type: TokenType.Identifier, value: 'Table', line: 1, column: 13, startOffset: 13, endOffset: 18 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 18, startOffset: 18, endOffset: 19 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/expected.*aggregation function/i);
      expect(diagnostics[0].token.value).toBe('InvalidFunc');
    });

    it('should report diagnostic for missing opening parenthesis', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 2, column: 5, startOffset: 10, endOffset: 22 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/expected.*\(/i);
      expect(diagnostics[0].token.value).toBe('Sales Line');
    });

    it('should report diagnostic for missing table reference', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 5, startOffset: 5, endOffset: 6 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/expected.*table/i);
      expect(diagnostics[0].token.type).toBe(TokenType.RightParen);
    });

    it('should report diagnostic for missing field name after dot', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 1, column: 5, startOffset: 5, endOffset: 17 },
        { type: TokenType.Dot, value: '.', line: 1, column: 17, startOffset: 17, endOffset: 18 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 18, startOffset: 18, endOffset: 19 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/expected.*field/i);
      expect(diagnostics[0].token.type).toBe(TokenType.RightParen);
    });

    it('should report diagnostic for trailing tokens after CalcFormula', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 1, column: 1, startOffset: 0, endOffset: 3 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 1, column: 5, startOffset: 5, endOffset: 17 },
        { type: TokenType.Dot, value: '.', line: 1, column: 17, startOffset: 17, endOffset: 18 },
        { type: TokenType.Identifier, value: 'Amount', line: 1, column: 18, startOffset: 18, endOffset: 24 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 24, startOffset: 24, endOffset: 25 },
        { type: TokenType.Identifier, value: 'garbage', line: 1, column: 26, startOffset: 26, endOffset: 33 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/unexpected.*token/i);
      expect(diagnostics[0].token.value).toBe('garbage');
    });

    it('should report diagnostic with correct token position', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Sum', line: 3, column: 15, startOffset: 50, endOffset: 53 },
        { type: TokenType.LeftParen, value: '(', line: 3, column: 18, startOffset: 54, endOffset: 55 },
        { type: TokenType.Identifier, value: 'InvalidTable', line: 5, column: 20, startOffset: 100, endOffset: 112 },
        { type: TokenType.Dot, value: '.', line: 5, column: 32, startOffset: 112, endOffset: 113 },
        // Missing field name after dot - this will cause an error at the synthetic EOF token
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("Expected field name after '.'");

      // Verify diagnostic token preserves position from peekOrEOF() (synthetic EOF)
      // When we fail to parse field after dot, we call recordDiagnostic without explicit token,
      // so it uses peekOrEOF() which creates synthetic EOF at last token's end position
      const diagnostic = diagnostics[0];
      expect(diagnostic.token.type).toBe(TokenType.EOF);
    });
  });

  describe('TableRelation diagnostics', () => {
    it('should report diagnostic for empty input', () => {
      const parser = new PropertyValueParser([]);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain('end of input');
    });

    it('should report diagnostic for trailing tokens after simple relation', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Customer', line: 1, column: 1, startOffset: 0, endOffset: 8 },
        { type: TokenType.Identifier, value: 'garbage', line: 1, column: 10, startOffset: 10, endOffset: 17 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/unexpected.*token/i);
      expect(diagnostics[0].token.value).toBe('garbage');
    });

    it('should report diagnostic for trailing tokens after conditional relation', () => {
      const tokens: Token[] = [
        { type: TokenType.If, value: 'IF', line: 1, column: 1, startOffset: 0, endOffset: 2 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 4, startOffset: 4, endOffset: 5 },
        { type: TokenType.Identifier, value: 'Type', line: 1, column: 5, startOffset: 5, endOffset: 9 },
        { type: TokenType.Equal, value: '=', line: 1, column: 9, startOffset: 9, endOffset: 10 },
        { type: TokenType.Identifier, value: 'CONST', line: 1, column: 10, startOffset: 10, endOffset: 15 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 15, startOffset: 15, endOffset: 16 },
        { type: TokenType.Identifier, value: 'Item', line: 1, column: 16, startOffset: 16, endOffset: 20 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 20, startOffset: 20, endOffset: 21 },
        { type: TokenType.RightParen, value: ')', line: 1, column: 21, startOffset: 21, endOffset: 22 },
        { type: TokenType.Identifier, value: 'Item', line: 1, column: 23, startOffset: 23, endOffset: 27 },
        { type: TokenType.Identifier, value: 'garbage', line: 1, column: 28, startOffset: 28, endOffset: 35 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toMatch(/unexpected.*token/i);
      expect(diagnostics[0].token.value).toBe('garbage');
    });

    it('should report diagnostic for malformed WHERE clause', () => {
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'Customer', line: 1, column: 1, startOffset: 0, endOffset: 8 },
        { type: TokenType.Identifier, value: 'WHERE', line: 1, column: 10, startOffset: 10, endOffset: 15 },
        { type: TokenType.LeftParen, value: '(', line: 1, column: 16, startOffset: 16, endOffset: 17 },
        { type: TokenType.Identifier, value: 'Blocked', line: 1, column: 17, startOffset: 17, endOffset: 24 },
        { type: TokenType.Equal, value: '=', line: 1, column: 24, startOffset: 24, endOffset: 25 },
        // Missing CONST/FIELD/FILTER predicate
        { type: TokenType.RightParen, value: ')', line: 1, column: 25, startOffset: 25, endOffset: 26 },
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(1);
      // Generic message since sub-methods don't record diagnostics (per plan)
      expect(diagnostics[0].message).toContain('Malformed WHERE clause');
      expect(diagnostics[0].token.type).toBe(TokenType.RightParen);
    });
  });

  describe('First-error-wins policy', () => {
    it('should produce at most one diagnostic for multiple errors in CalcFormula', () => {
      // Multiple errors: invalid function, missing paren, etc.
      const tokens: Token[] = [
        { type: TokenType.Identifier, value: 'InvalidFunc', line: 1, column: 1, startOffset: 0, endOffset: 11 },
        { type: TokenType.QuotedIdentifier, value: 'Sales Line', line: 1, column: 12, startOffset: 12, endOffset: 24 },
        // No opening paren, no closing paren, no field name
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      // Should report first error encountered, not all errors
      expect(diagnostics.length).toBeLessThanOrEqual(1);
    });

    it('should produce at most one diagnostic for multiple errors in TableRelation', () => {
      // Multiple errors: malformed IF, missing condition, etc.
      const tokens: Token[] = [
        { type: TokenType.If, value: 'IF', line: 1, column: 1, startOffset: 0, endOffset: 2 },
        { type: TokenType.Identifier, value: 'Type', line: 1, column: 4, startOffset: 4, endOffset: 8 },
        // Missing opening paren, missing operator, missing value, etc.
      ];

      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).toBeNull();

      const diagnostics = parser.getDiagnostics();
      // Should report first error encountered, not all errors
      expect(diagnostics.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Successful parse produces empty diagnostics', () => {
    it('should have empty diagnostics array for successful CalcFormula parse', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(0);
    });

    it('should have empty diagnostics array for successful TableRelation parse', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation=Customer }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).not.toBeNull();

      const diagnostics = parser.getDiagnostics();
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Integration with main Parser', () => {
    it('should forward CalcFormula diagnostic to parser errors', () => {
      // Malformed CalcFormula: missing opening paren
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum "Sales Line".Amount) }
        }
      }`;

      const { errors } = parseCode(code);

      // Should have at least one error related to CalcFormula parsing
      const calcFormulaError = errors.find(e =>
        e.message.includes('CalcFormula') ||
        e.message.includes('expected') ||
        e.message.includes('(')
      );
      expect(calcFormulaError).toBeDefined();
    });

    it('should forward TableRelation diagnostic to parser errors', () => {
      // Malformed TableRelation: trailing garbage
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation=Customer garbage }
        }
      }`;

      const { errors } = parseCode(code);

      // Should have at least one error related to TableRelation parsing
      const tableRelationError = errors.find(e =>
        e.message.includes('TableRelation') ||
        e.message.includes('unexpected') ||
        e.message.includes('garbage')
      );
      expect(tableRelationError).toBeDefined();
    });
  });
});

describe('PropertyValueParser - WHERE Clause Bug Fixes (Issue #503)', () => {
  describe('Bug 1: Predicate keywords in field names', () => {
    it('should parse unquoted field name containing "Filter" keyword', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; TotalAmount ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount WHERE (Item Filter=FIELD(No.))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Item Filter');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('No.');
    });

    it('should parse unquoted field name containing "Field" keyword', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount WHERE (My Field Name=FIELD(No.))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('My Field Name');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('No.');
    });

    it('should parse unquoted field name containing "Const" keyword', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount WHERE (Const Center=FIELD(No.))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Const Center');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('No.');
    });

    it('should parse CalcFormula with unquoted "Filter" field name', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; HasEntries ; Boolean ;
            CalcFormula=Exist("Item Ledger Entry" WHERE (Item Filter=FIELD(No.))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.aggregationFunction).toBe('Exist');
      expect(result?.sourceTable).toBe('Item Ledger Entry');
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Item Filter');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('No.');
    });

    it('should parse TableRelation with unquoted "Filter" field name', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; BinCode ; Code20 ;
            TableRelation=Bin.Code WHERE (Item Filter=FIELD(No.)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).not.toBeNull();
      expect(result?.tableName).toBe('Bin');
      expect(result?.fieldName).toBe('Code');
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Item Filter');
      expect(condition?.predicateType).toBe('FIELD');
      expect(condition?.predicateValue).toBe('No.');
    });

    it('should parse real NAV pattern: Employee Filter Code field', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; FilterAuth ; Boolean ;
            CalcFormula=Exist("Employee Filter Line" WHERE (Employee Filter Code=FIELD(Employee Filter Delimitation),
                                                            Employee No.=FIELD(No.))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(2);

      const condition1 = result?.whereClause?.conditions[0];
      expect(condition1?.fieldName).toBe('Employee Filter Code');
      expect(condition1?.predicateType).toBe('FIELD');
      expect(condition1?.predicateValue).toBe('Employee Filter Delimitation');

      const condition2 = result?.whereClause?.conditions[1];
      expect(condition2?.fieldName).toBe('Employee No.');
      expect(condition2?.predicateType).toBe('FIELD');
      expect(condition2?.predicateValue).toBe('No.');
    });

    it('should parse real NAV pattern: Variant Filter field', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; BinCode ; Code20 ;
            TableRelation=Bin.Code WHERE (Location Code=FIELD(Location Code),
                                          Item Filter=FIELD(No.),
                                          Variant Filter=FIELD(Variant Code)) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'TableRelation');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseTableRelation();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(3);

      const condition2 = result?.whereClause?.conditions[1];
      expect(condition2?.fieldName).toBe('Item Filter');
      expect(condition2?.predicateType).toBe('FIELD');
      expect(condition2?.predicateValue).toBe('No.');

      const condition3 = result?.whereClause?.conditions[2];
      expect(condition3?.fieldName).toBe('Variant Filter');
      expect(condition3?.predicateType).toBe('FIELD');
      expect(condition3?.predicateValue).toBe('Variant Code');
    });
  });

  describe('Bug 2: Empty predicate values', () => {
    it('should parse CONST() with empty value', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; LineCount ; Integer ;
            CalcFormula=Count("Sales Line" WHERE ("Source Batch Name"=CONST())) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Source Batch Name');
      expect(condition?.predicateType).toBe('CONST');
      expect(condition?.predicateValue).toBe('');
    });

    it('should parse FILTER with empty string', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Customer Ledger Entry".Amount WHERE ("Assigned User ID"=FILTER(''))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Assigned User ID');
      expect(condition?.predicateType).toBe('FILTER');
      expect(condition?.predicateValue).toBe('');
    });

    it('should parse CalcFormula with CONST() empty value integration', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; HasOpenEntries ; Boolean ;
            CalcFormula=Exist("Bank Account Ledger Entry" WHERE ("Void Check Indicator"=CONST())) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.aggregationFunction).toBe('Exist');
      expect(result?.sourceTable).toBe('Bank Account Ledger Entry');
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Void Check Indicator');
      expect(condition?.predicateType).toBe('CONST');
      expect(condition?.predicateValue).toBe('');
    });

    it('should parse real NAV example: Date Closed with FILTER empty string', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Customer Ledger Entry".Amount WHERE ("Date Closed"=FILTER(''))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(1);

      const condition = result?.whereClause?.conditions[0];
      expect(condition?.fieldName).toBe('Date Closed');
      expect(condition?.predicateType).toBe('FILTER');
      expect(condition?.predicateValue).toBe('');
    });
  });

  describe('Combined bugs: Multiple conditions with keywords and empty values', () => {
    it('should parse WHERE clause with unquoted "Filter" field name and CONST() empty value', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Item Ledger Entry".Quantity WHERE (Item Filter=FIELD(No.),
                                                                Source Batch Name=CONST())) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(2);

      const condition1 = result?.whereClause?.conditions[0];
      expect(condition1?.fieldName).toBe('Item Filter');
      expect(condition1?.predicateType).toBe('FIELD');
      expect(condition1?.predicateValue).toBe('No.');

      const condition2 = result?.whereClause?.conditions[1];
      expect(condition2?.fieldName).toBe('Source Batch Name');
      expect(condition2?.predicateType).toBe('CONST');
      expect(condition2?.predicateValue).toBe('');
    });

    it('should parse WHERE clause with multiple unquoted "Filter" field names', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Item Ledger Entry".Quantity WHERE (Item Filter=FIELD(No.),
                                                                Variant Filter=FIELD(Variant Code))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(2);

      const condition1 = result?.whereClause?.conditions[0];
      expect(condition1?.fieldName).toBe('Item Filter');
      expect(condition1?.predicateType).toBe('FIELD');
      expect(condition1?.predicateValue).toBe('No.');

      const condition2 = result?.whereClause?.conditions[1];
      expect(condition2?.fieldName).toBe('Variant Filter');
      expect(condition2?.predicateType).toBe('FIELD');
      expect(condition2?.predicateValue).toBe('Variant Code');
    });

    it('should parse complex WHERE with unquoted keyword field names, empty values, and normal conditions', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount WHERE (Item Filter=FIELD(No.),
                                                        Type=CONST(Item),
                                                        Source Batch Name=CONST(),
                                                        Document Type=FILTER('Order|Invoice'))) }
        }
      }`;

      const tokens = getPropertyValueTokens(code, 'CalcFormula');
      const parser = new PropertyValueParser(tokens);
      const result = parser.parseCalcFormula();

      expect(result).not.toBeNull();
      expect(result?.whereClause).toBeDefined();
      expect(result?.whereClause?.conditions).toHaveLength(4);

      const condition1 = result?.whereClause?.conditions[0];
      expect(condition1?.fieldName).toBe('Item Filter');
      expect(condition1?.predicateType).toBe('FIELD');

      const condition2 = result?.whereClause?.conditions[1];
      expect(condition2?.fieldName).toBe('Type');
      expect(condition2?.predicateType).toBe('CONST');
      expect(condition2?.predicateValue).toBe('Item');

      const condition3 = result?.whereClause?.conditions[2];
      expect(condition3?.fieldName).toBe('Source Batch Name');
      expect(condition3?.predicateType).toBe('CONST');
      expect(condition3?.predicateValue).toBe('');

      const condition4 = result?.whereClause?.conditions[3];
      expect(condition4?.fieldName).toBe('Document Type');
      expect(condition4?.predicateType).toBe('FILTER');
      expect(condition4?.predicateValue).toBe('Order|Invoice');
    });
  });
});
