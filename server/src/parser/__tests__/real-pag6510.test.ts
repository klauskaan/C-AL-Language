/**
 * Direct test of actual PAG6510.TXT file from test/REAL
 *
 * This file had 1992 errors in validation report.
 * Testing the actual file to see if we can reproduce the issue.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Real PAG6510.TXT file', () => {
  it('should parse PAG6510.TXT from test/REAL without errors', () => {
    const filePath = join(__dirname, '../../../../test/REAL/PAG6510.TXT');
    const content = readFileSync(filePath, 'utf-8');

    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const errors = parser.getErrors();

    if (errors.length > 0) {
      console.log(`\nPAG6510.TXT has ${errors.length} parse errors:`);
      // Show first 10 errors
      errors.slice(0, 10).forEach(e => {
        console.log(`  Line ${e.token.line}:${e.token.column} - ${e.message}`);
      });
      console.log('  ...');
      // Show last 10 errors
      errors.slice(-10).forEach(e => {
        console.log(`  Line ${e.token.line}:${e.token.column} - ${e.message}`);
      });
    }

    // This will fail if there are errors - that's what we want to see!
    expect(errors).toEqual([]);
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectId).toBe(6510);
  });
});
