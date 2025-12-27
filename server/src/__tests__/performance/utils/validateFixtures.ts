/**
 * Fixture Validation Script
 *
 * Validates that all synthetic performance fixtures parse successfully
 * with the C-AL Language Server parser.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { listPerformanceFixtures } from './fixtures';

interface ValidationResult {
  fixture: string;
  success: boolean;
  lines: number;
  tokens: number;
  astNodes: number;
  error?: string;
}

/**
 * Validate a single fixture file
 */
function validateFixture(fixtureName: string): ValidationResult {
  const fixturePath = join(__dirname, '../fixtures', fixtureName);

  try {
    // Read fixture
    const content = readFileSync(fixturePath, 'utf-8');
    const lines = content.split('\n').length;

    // Lex
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();

    // Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Count AST nodes (rough estimate)
    const astJson = JSON.stringify(ast);
    const astNodes = (astJson.match(/"type":/g) || []).length;

    return {
      fixture: fixtureName,
      success: true,
      lines,
      tokens: tokens.length,
      astNodes
    };
  } catch (error) {
    return {
      fixture: fixtureName,
      success: false,
      lines: 0,
      tokens: 0,
      astNodes: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Validate all performance fixtures
 */
function validateAllFixtures(): void {
  console.log('🔍 Validating Performance Fixtures\n');
  console.log('='.repeat(80));

  const fixtures = listPerformanceFixtures();
  const results: ValidationResult[] = [];

  for (const fixture of fixtures) {
    process.stdout.write(`Validating ${fixture.padEnd(40)}... `);
    const result = validateFixture(fixture);
    results.push(result);

    if (result.success) {
      console.log(`✅ OK (${result.lines} lines, ${result.tokens} tokens)`);
    } else {
      console.log(`❌ FAILED`);
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('='.repeat(80));

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);

  console.log(`\n📊 Validation Summary:`);
  console.log(`   Total fixtures: ${results.length}`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total lines: ${totalLines.toLocaleString()}`);
  console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);

  if (failed > 0) {
    console.log('\n❌ Some fixtures failed to parse!');
    process.exit(1);
  } else {
    console.log('\n✅ All fixtures parsed successfully!');
    process.exit(0);
  }
}

// Run validation
validateAllFixtures();
