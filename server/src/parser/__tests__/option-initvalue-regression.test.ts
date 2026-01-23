/**
 * Regression Test: Option Field InitValue Parsing
 *
 * Issue: Parser reports "Expected =" errors on Option fields with InitValue property
 * Source: TAB5342.TXT line 41
 *
 * Field pattern:
 * { 4   ;   ;CustomerTypeCode    ;Option        ;InitValue=DefaultValue;
 *                                                ExternalName=customertypecode;
 *                                                ExternalType=Picklist;
 *
 * Expected: Should parse without errors
 * Actual: Reports "Expected =" at multiple positions
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Regression - Option InitValue Parsing', () => {
  const fixtureFile = path.join(__dirname, '../../../../test/fixtures/regression/table-5342-option-initvalue.cal');

  it('should parse Option field with InitValue property', () => {
    const code = `OBJECT Table 5342 Test {
      FIELDS {
        { 1 ; ; TestField ; Option ; InitValue=DefaultValue;
                                     OptionString=DefaultValue }
      }
    }`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const _ast = parser.parse();
    const errors = parser.getErrors();

    console.log('\n=== MINIMAL TEST CASE ===');
    console.log('Code:', code);
    console.log('\nTokens:', JSON.stringify(tokens, null, 2));
    console.log('\nErrors:', JSON.stringify(errors, null, 2));
    console.log('\nAST:', JSON.stringify(_ast, null, 2));

    expect(errors).toHaveLength(0);
    expect(_ast.object).not.toBeNull();
  });

  it('should parse fixture file with Option InitValue fields', () => {
    if (!fs.existsSync(fixtureFile)) {
      console.log('Fixture file not found, skipping test');
      return;
    }

    const code = fs.readFileSync(fixtureFile, 'utf-8');
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const _ast = parser.parse();
    const errors = parser.getErrors();

    console.log('\n=== FIXTURE FILE TEST ===');
    console.log('File:', fixtureFile);
    console.log('\nTotal tokens:', tokens.length);
    console.log('\nErrors:', JSON.stringify(errors, null, 2));

    // Show tokens around field 3 (CustomerSizeCode) - should be around token index 120-180
    const field3Start = tokens.findIndex(t =>
      t.type === 'IDENTIFIER' && t.value === 'CustomerSizeCode'
    );
    if (field3Start > 0) {
      console.log('\n=== TOKENS AROUND CustomerSizeCode (field 3) ===');
      const start = Math.max(0, field3Start - 5);
      const end = Math.min(tokens.length, field3Start + 30);
      for (let i = start; i < end; i++) {
        const t = tokens[i];
        console.log(`[${i}] ${t.type.padEnd(20)} "${t.value}" (line ${t.line}:${t.column})`);
      }
    }

    // Show tokens around field 4 (CustomerTypeCode) - the problematic one
    const field4Start = tokens.findIndex(t =>
      t.type === 'IDENTIFIER' && t.value === 'CustomerTypeCode'
    );
    if (field4Start > 0) {
      console.log('\n=== TOKENS AROUND CustomerTypeCode (field 4) ===');
      const start = Math.max(0, field4Start - 5);
      const end = Math.min(tokens.length, field4Start + 30);
      for (let i = start; i < end; i++) {
        const t = tokens[i];
        console.log(`[${i}] ${t.type.padEnd(20)} "${t.value}" (line ${t.line}:${t.column})`);
      }
    }

    if (errors.length > 0) {
      console.log('\n=== ERROR DETAILS ===');
      errors.forEach((err, idx) => {
        console.log(`\nError ${idx + 1}:`);
        console.log(`  Message: ${err.message}`);
        console.log(`  Token: ${err.token.type} "${err.token.value}"`);
        console.log(`  Position: line ${err.token.line}, column ${err.token.column}`);

        // Show tokens near this position
        const nearbyTokens = tokens.filter(t =>
          t.line === err.token.line && Math.abs(t.column - err.token.column) < 20
        );
        console.log(`  Nearby tokens:`, nearbyTokens.map(t =>
          `${t.type}:"${t.value}"@${t.column}`
        ).join(', '));
      });
    }

    expect(errors).toHaveLength(0);
    expect(_ast.object).not.toBeNull();
  });

  it('should tokenize InitValue=DefaultValue correctly', () => {
    const code = 'InitValue=DefaultValue';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    console.log('\n=== TOKENIZING "InitValue=DefaultValue" ===');
    tokens.forEach((t, idx) => {
      console.log(`[${idx}] ${t.type.padEnd(20)} "${t.value}" (line ${t.line}:${t.column})`);
    });

    // Should have exactly 3 tokens: IDENTIFIER, EQUAL, IDENTIFIER (plus EOF)
    const nonWhitespace = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF');
    expect(nonWhitespace).toHaveLength(3);
    expect(nonWhitespace[0].type).toBe('IDENTIFIER');
    expect(nonWhitespace[0].value).toBe('InitValue');
    expect(nonWhitespace[1].type).toBe('EQUAL');
    expect(nonWhitespace[1].value).toBe('=');
    expect(nonWhitespace[2].type).toBe('IDENTIFIER');
    expect(nonWhitespace[2].value).toBe('DefaultValue');
  });

  it('should parse field property with identifier value', () => {
    const code = `OBJECT Table 1 Test {
      FIELDS {
        { 1 ; ; Field1 ; Code10 ; InitValue=Value }
      }
    }`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const _ast = parser.parse();
    const errors = parser.getErrors();

    console.log('\n=== SIMPLE PROPERTY TEST ===');
    console.log('Tokens:', tokens.map(t => `${t.type}:"${t.value}"`).join(' '));
    console.log('\nErrors:', JSON.stringify(errors, null, 2));

    expect(errors).toHaveLength(0);
  });

  it('should handle apostrophe in Description property value', () => {
    const code = `OBJECT Table 1 Test {
      FIELDS {
        { 1 ; ; Field1 ; Code10 ; Description=This is John's field }
      }
    }`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    console.log('\n=== APOSTROPHE IN DESCRIPTION TEST ===');
    console.log('Code:', code);
    console.log('\nTokens:');
    tokens.forEach((t, idx) => {
      if (t.type === 'UNKNOWN') {
        console.log(`  [${idx}] **UNKNOWN** "${t.value}" (line ${t.line}:${t.column})`);
      } else if (t.value.includes('Description') || t.value.includes('John') || t.value.includes('field')) {
        console.log(`  [${idx}] ${t.type.padEnd(20)} "${t.value}" (line ${t.line}:${t.column})`);
      }
    });

    const unknownTokens = tokens.filter(t => t.type === 'UNKNOWN');
    console.log('\nUNKNOWN tokens found:', unknownTokens.length);
    unknownTokens.forEach(t => {
      console.log(`  "${t.value}" at line ${t.line}:${t.column}`);
    });

    const parser = new Parser(tokens);
    const _ast = parser.parse();
    const errors = parser.getErrors();

    console.log('\nParser errors:', errors.length);
    errors.slice(0, 5).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.message}`);
      console.log(`     Token: ${err.token.type} "${err.token.value}" at line ${err.token.line}:${err.token.column}`);
    });

    // This test documents the FIXED behavior
    // The lexer now handles apostrophes as part of identifiers (no UNKNOWN tokens)
    expect(unknownTokens.length).toBe(0);
  });

  it('should reproduce TAB5342 line 41 error', () => {
    const code = `OBJECT Table 5342 Test {
      FIELDS {
        { 3 ; ; Field3 ; Option ; Description=Select the size of the contact's company }
        { 4 ; ; Field4 ; Option ; InitValue=DefaultValue;
                                   OptionString=DefaultValue }
      }
    }`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    console.log('\n=== TAB5342 LINE 41 REPRODUCTION ===');

    // Find tokens around the apostrophe
    const descIdx = tokens.findIndex(t => t.type === 'IDENTIFIER' && t.value === 'Description');
    if (descIdx >= 0) {
      console.log('\nTokens around Description property:');
      for (let i = Math.max(0, descIdx - 2); i < Math.min(tokens.length, descIdx + 20); i++) {
        const t = tokens[i];
        const marker = t.type === 'UNKNOWN' ? ' <<< UNKNOWN' : '';
        console.log(`  [${i}] ${t.type.padEnd(20)} "${t.value}" (line ${t.line}:${t.column})${marker}`);
      }
    }

    const parser = new Parser(tokens);
    const _ast = parser.parse();
    const errors = parser.getErrors();

    console.log('\nParser errors:', errors.length);
    errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.message}`);
      console.log(`     Token: ${err.token.type} "${err.token.value}" at line ${err.token.line}:${err.token.column}`);
    });

    // This test documents that apostrophes in property values are now handled correctly
    // The lexer includes apostrophes as part of identifiers, preventing parsing errors
    expect(errors.length).toBe(0);
  });
});
