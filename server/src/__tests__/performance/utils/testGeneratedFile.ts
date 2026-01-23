/**
 * Quick test to verify generated files can be parsed
 */

import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { loadFixture, FIXTURES } from './fixtures';

function testFile(name: string, fixtureName: string) {
  console.log(`\nTesting ${name}...`);
  const content = loadFixture(fixtureName);
  const lines = content.split('\n').length;
  console.log(`  Lines: ${lines}`);
  console.log(`  Size: ${(content.length / 1024).toFixed(1)}KB`);

  try {
    const startLex = Date.now();
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const lexTime = Date.now() - startLex;
    console.log(`  ✓ Lexer: ${tokens.length} tokens in ${lexTime}ms`);

    const startParse = Date.now();
    const parser = new Parser(tokens);
    const _ast = parser.parse();
    const parseTime = Date.now() - startParse;
    console.log(`  ✓ Parser: parsed successfully in ${parseTime}ms`);

    console.log(`  ✅ Success! Total: ${lexTime + parseTime}ms`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed:`, error);
    return false;
  }
}

console.log('Testing Generated Large Files');
console.log('='.repeat(50));

const results = [
  testFile('huge.cal (5000+ lines)', FIXTURES.HUGE),
  testFile('enormous.cal (10000+ lines)', FIXTURES.ENORMOUS)
];

console.log('\n' + '='.repeat(50));
console.log(`Results: ${results.filter(r => r).length}/${results.length} passed`);

if (results.every(r => r)) {
  console.log('✅ All generated files are valid!');
  process.exit(0);
} else {
  console.error('❌ Some files failed to parse');
  process.exit(1);
}
