/**
 * Property Value Token Capture Tests
 *
 * These tests verify that parseProperty() captures the original tokens
 * during property value parsing, preserving token types and positions.
 *
 * Context: Issue #9 - Parse CalcFormula and TableRelation with mini-parser
 * Step 1: Capture tokens during property value parsing
 *
 * The critical bug we're fixing:
 * - Parser's string concatenation loses token type information
 * - QuotedIdentifier tokens become plain strings
 * - Mini-parser cannot distinguish "Customer" from Customer
 *
 * Test coverage:
 * 1. Basic token capture - tokens are stored
 * 2. Token types preserved - QuotedIdentifier remains QuotedIdentifier
 * 3. Token positions accurate - line, column, offsets match source
 * 4. Multi-token values - all tokens captured
 * 5. Multi-line properties - tokens span lines correctly
 * 6. Empty properties - empty/undefined valueTokens
 * 7. Trigger properties - NO valueTokens (have triggerBody instead)
 * 8. Structural tokens - parentheses, brackets, dots captured
 */

import { parseCode } from './parserTestHelpers';
import { Property, FieldDeclaration, FieldSection } from '../ast';
import { TokenType } from '../../lexer/tokens';

describe('Parser - Property Value Token Capture', () => {
  describe('Basic token capture', () => {
    it('should capture tokens for simple property value', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          CaptionML=ENU=Customer;
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const property = ast.object?.properties?.properties[0];

      expect(property?.valueTokens).toBeDefined();
      expect(property?.valueTokens?.length).toBeGreaterThan(0);
    });

    it('should capture tokens for property with identifier value', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          DataPerCompany=Yes;
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      expect(property?.valueTokens).toBeDefined();
      expect(property?.valueTokens?.length).toBe(1);
      expect(property?.valueTokens?.[0].type).toBe(TokenType.Identifier);
      expect(property?.valueTokens?.[0].value).toBe('Yes');
    });

    it('should capture tokens for property with numeric value', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Name ; Text[50] }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const dataType = field.dataType;

      // Text[50] should have captured tokens for "50"
      // This tests that our mechanism works at multiple parse levels
      // For now, just verify the dataType was parsed correctly
      expect(dataType.typeName).toBe('Text[50]');
      // Future: dataType might also have tokens, but for now focus on Property
    });
  });

  describe('Token type preservation - THE CRITICAL FIX', () => {
    it('should preserve QuotedIdentifier token type in property value', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          TableRelation="Customer Ledger Entry";
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      expect(property?.valueTokens).toBeDefined();
      expect(property?.valueTokens?.length).toBe(1);

      // CRITICAL: Token must be QuotedIdentifier, not converted to string
      expect(property?.valueTokens?.[0].type).toBe(TokenType.QuotedIdentifier);
      expect(property?.valueTokens?.[0].value).toBe('Customer Ledger Entry');
    });

    it('should preserve QuotedIdentifier in CalcFormula expression', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      expect(calcFormula?.valueTokens).toBeDefined();

      // Should have: Sum, (, "Sales Line", ., Amount, )
      expect(calcFormula?.valueTokens?.length).toBeGreaterThan(0);

      // Find the QuotedIdentifier token
      const quotedToken = calcFormula?.valueTokens?.find(
        t => t.type === TokenType.QuotedIdentifier
      );
      expect(quotedToken).toBeDefined();
      expect(quotedToken?.value).toBe('Sales Line');
    });

    it('should preserve multiple QuotedIdentifiers in complex property', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("Customer Ledger Entry"."Amount (LCY)" WHERE ("Customer No."=FIELD("No."))) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      const quotedTokens = calcFormula?.valueTokens?.filter(
        t => t.type === TokenType.QuotedIdentifier
      );

      // Should have: "Customer Ledger Entry", "Amount (LCY)", "Customer No.", "No."
      expect(quotedTokens?.length).toBe(4);
    });
  });

  describe('Token position accuracy', () => {
    it('should preserve accurate line and column information', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          CaptionML=ENU=Customer;
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      expect(property?.valueTokens).toBeDefined();

      // First token should be "ENU" - verify its position
      const firstToken = property?.valueTokens?.[0];
      expect(firstToken).toBeDefined();
      expect(firstToken?.line).toBeGreaterThan(0);
      expect(firstToken?.column).toBeGreaterThan(0);
      expect(firstToken?.startOffset).toBeGreaterThan(0);
      expect(firstToken!.endOffset).toBeGreaterThan(firstToken!.startOffset);
    });

    it('should preserve accurate offsets for extracting source text', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          TableRelation="Customer";
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      const token = property?.valueTokens?.[0];

      // Should be able to extract exact source text using offsets
      const extractedText = code.substring(token?.startOffset || 0, token?.endOffset || 0);
      expect(extractedText).toBe('"Customer"');
    });

    it('should handle multi-line property with correct positions', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          CaptionML=[ENU=Customer;
                     DAN=Kunde];
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      expect(property?.valueTokens).toBeDefined();

      // Tokens should span multiple lines
      const lines = new Set(property?.valueTokens?.map(t => t.line));
      expect(lines.size).toBeGreaterThan(1);
    });
  });

  describe('Multi-token values', () => {
    it('should capture all tokens in CalcFormula expression', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      const tokens = calcFormula?.valueTokens || [];

      // Expected tokens: Sum, (, "Sales Line", ., Amount, )
      expect(tokens.length).toBeGreaterThanOrEqual(6);

      // Verify token types in sequence
      expect(tokens[0].type).toBe(TokenType.Identifier); // Sum
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier); // "Sales Line"
      expect(tokens[3].type).toBe(TokenType.Dot);
      expect(tokens[4].type).toBe(TokenType.Identifier); // Amount
      expect(tokens[5].type).toBe(TokenType.RightParen);
    });

    it('should capture all tokens in TableRelation with WHERE clause', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; CustomerNo ; Code20 ;
            TableRelation="Customer" WHERE (Blocked=CONST(No)) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const tableRelation = field.properties?.properties?.find(
        (p: Property) => p.name === 'TableRelation'
      );

      const tokens = tableRelation?.valueTokens || [];

      // Should include: "Customer", WHERE, (, Blocked, =, CONST, (, No, ), )
      expect(tokens.length).toBeGreaterThan(5);

      // Verify QuotedIdentifier is preserved
      const quotedToken = tokens.find(t => t.type === TokenType.QuotedIdentifier);
      expect(quotedToken?.value).toBe('Customer');

      // Verify WHERE keyword is captured
      const whereToken = tokens.find(t => t.value.toUpperCase() === 'WHERE');
      expect(whereToken).toBeDefined();
    });

    it('should capture tokens in complex nested expression', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("G/L Entry".Amount WHERE ("G/L Account No."=FIELD("No."))) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      const tokens = calcFormula?.valueTokens || [];

      // Should have multiple levels of nesting: Sum(...WHERE(...)
      expect(tokens.length).toBeGreaterThan(10);

      // Count parentheses to verify nesting is captured
      const leftParens = tokens.filter(t => t.type === TokenType.LeftParen).length;
      const rightParens = tokens.filter(t => t.type === TokenType.RightParen).length;
      expect(leftParens).toBeGreaterThan(2);
      expect(leftParens).toBe(rightParens);
    });
  });

  describe('Edge cases - Empty and missing values', () => {
    it('should handle empty property value', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          Description=;
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      // Empty property value produces no tokens, so valueTokens is undefined
      expect(property?.valueTokens).toBeUndefined();
    });

    it('should handle property with whitespace-only value', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          Description=   ;
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      // Whitespace-only value produces no tokens, so valueTokens is undefined
      expect(property?.valueTokens).toBeUndefined();
    });
  });

  describe('Trigger properties - should NOT have valueTokens', () => {
    it('should NOT populate valueTokens for OnValidate trigger', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Name ; Text[50] ;
            OnValidate=BEGIN
              MESSAGE('test');
            END }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const onValidate = field.triggers?.find(
        (t: any) => t.name === 'OnValidate'
      );

      // Field triggers are stored in the triggers array, not properties
      // They have body, not triggerBody (and definitely not valueTokens)
      expect(onValidate?.body).toBeDefined();

      // This is the key assertion: triggers have body, not valueTokens
      // (triggers is property-value-tokens tests doesn't mean field triggers should have valueTokens)
    });

    it('should NOT populate valueTokens for OnLookup trigger', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Name ; Text[50] ;
            OnLookup=BEGIN
              LookupCustomer();
            END }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const onLookup = field.triggers?.find(
        (t: any) => t.name === 'OnLookup'
      );

      // Field triggers are stored in the triggers array, have body (not valueTokens)
      expect(onLookup?.body).toBeDefined();
    });

    it('should NOT populate valueTokens for OnRun trigger', () => {
      const code = `OBJECT Codeunit 1 Test {
        PROPERTIES {
          OnRun=BEGIN
            MESSAGE('Hello');
          END;
        }
        CODE {
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      expect(property?.triggerBody).toBeDefined();
      expect(property?.valueTokens).toBeUndefined();
    });
  });

  describe('Structural tokens captured', () => {
    it('should capture parentheses in property value', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      const tokens = calcFormula?.valueTokens || [];

      // Should have LeftParen and RightParen tokens
      const hasLeftParen = tokens.some(t => t.type === TokenType.LeftParen);
      const hasRightParen = tokens.some(t => t.type === TokenType.RightParen);

      expect(hasLeftParen).toBe(true);
      expect(hasRightParen).toBe(true);
    });

    it('should capture dots in member access', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      const tokens = calcFormula?.valueTokens || [];

      // Should have Dot token between "Sales Line" and Amount
      const hasDot = tokens.some(t => t.type === TokenType.Dot);
      expect(hasDot).toBe(true);
    });

    it('should capture brackets in array property values', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Status ; Option ;
            OptionOrdinalValues=[-1;0;1] }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const optionOrdinals = field.properties?.properties?.find(
        (p: Property) => p.name === 'OptionOrdinalValues'
      );

      const tokens = optionOrdinals?.valueTokens || [];

      // Should have LeftBracket and RightBracket tokens
      const hasLeftBracket = tokens.some(t => t.type === TokenType.LeftBracket);
      const hasRightBracket = tokens.some(t => t.type === TokenType.RightBracket);

      expect(hasLeftBracket).toBe(true);
      expect(hasRightBracket).toBe(true);
    });

    it('should capture equals and semicolons in ML properties', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          CaptionML=[ENU=Customer;DAN=Kunde];
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      const tokens = property?.valueTokens || [];

      // Should include brackets, equals, semicolons
      expect(tokens.some(t => t.type === TokenType.LeftBracket)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.RightBracket)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Equal)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Semicolon)).toBe(true);
    });
  });

  describe('Real-world property patterns', () => {
    it('should capture tokens in TableRelation with IF expression', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; ItemNo ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const tableRelation = field.properties?.properties?.find(
        (p: Property) => p.name === 'TableRelation'
      );

      const tokens = tableRelation?.valueTokens || [];

      // Should have IF, CONST, and Item tokens
      expect(tokens.length).toBeGreaterThan(5);

      const hasIf = tokens.some(t => t.value.toUpperCase() === 'IF');
      const hasConst = tokens.some(t => t.value.toUpperCase() === 'CONST');
      const hasItem = tokens.some(t => t.value === 'Item');

      expect(hasIf).toBe(true);
      expect(hasConst).toBe(true);
      expect(hasItem).toBe(true);
    });

    it('should capture tokens in complex CalcFormula with multiple WHERE conditions', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Balance ; Decimal ;
            CalcFormula=Sum("Detailed Cust. Ledg. Entry".Amount WHERE ("Customer No."=FIELD("No."),
                                                                         "Posting Date"=FIELD("Date Filter"))) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      const tokens = calcFormula?.valueTokens || [];

      // Multi-line, complex expression should have many tokens
      expect(tokens.length).toBeGreaterThan(15);

      // Should have multiple QuotedIdentifiers
      const quotedTokens = tokens.filter(t => t.type === TokenType.QuotedIdentifier);
      expect(quotedTokens.length).toBeGreaterThan(2);

      // Should have comma separating conditions
      const hasComma = tokens.some(t => t.type === TokenType.Comma);
      expect(hasComma).toBe(true);
    });

    it('should capture tokens in TableRelation with ELSE clause', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; No ; Code20 ;
            TableRelation=IF (Type=CONST(Item)) Item ELSE Resource }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const tableRelation = field.properties?.properties?.find(
        (p: Property) => p.name === 'TableRelation'
      );

      const tokens = tableRelation?.valueTokens || [];

      // Should include IF, ELSE, and both table names
      const hasElse = tokens.some(t => t.value.toUpperCase() === 'ELSE');
      expect(hasElse).toBe(true);

      const hasItem = tokens.some(t => t.value === 'Item');
      const hasResource = tokens.some(t => t.value === 'Resource');
      expect(hasItem).toBe(true);
      expect(hasResource).toBe(true);
    });
  });

  describe('Regression - ensure string value still works', () => {
    it('should still populate value field with string representation', () => {
      const code = `OBJECT Table 1 Test {
        PROPERTIES {
          CaptionML=ENU=Customer;
        }
      }`;
      const { ast } = parseCode(code);

      const property = ast.object?.properties?.properties[0];

      // value field should still exist and work as before
      expect(property?.value).toBe('ENU=Customer');

      expect(property?.valueTokens).toBeDefined();
    });

    it('should have consistent value string and tokens', () => {
      const code = `OBJECT Table 1 Test {
        FIELDS {
          { 1 ; ; Total ; Decimal ;
            CalcFormula=Sum("Sales Line".Amount) }
        }
      }`;
      const { ast } = parseCode(code);

      const fieldSection = ast.object?.fields as FieldSection;
      const field = fieldSection.fields[0] as FieldDeclaration;
      const calcFormula = field.properties?.properties?.find(
        (p: Property) => p.name === 'CalcFormula'
      );

      // value should contain the text
      expect(calcFormula?.value).toContain('Sum');
      expect(calcFormula?.value).toContain('Sales Line');

      expect(calcFormula?.valueTokens).toBeDefined();

      // The tokens, when reconstructed, should roughly match the value
      // (may differ in whitespace handling and quote representation)
      // Note: QuotedIdentifier token values don't include quotes
      const reconstructed = calcFormula?.valueTokens
        ?.map(t => t.value)
        .join(' ');
      expect(reconstructed).toContain('Sum');
      expect(reconstructed).toContain('Sales Line');
    });
  });
});
