import { readFileSync } from 'fs';
import { Lexer } from './server/src/lexer/lexer';
import { Parser } from './server/src/parser/parser';

const content = readFileSync('./test/REAL/PAG6510.TXT', 'utf-8');
const lexer = new Lexer(content);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
parser.parse();
const errors = parser.getErrors();

console.log(`File: PAG6510.TXT`);
console.log(`Lines: ${content.split('\n').length}`);
console.log(`Errors: ${errors.length}\n`);

if (errors.length > 0) {
  console.log('First 20 errors:');
  errors.slice(0, 20).forEach(e => {
    console.log(`  Line ${e.token.line}:${e.token.column} - ${e.message}`);
  });
}
