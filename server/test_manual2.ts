import { Lexer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';

// Simpler input - just the problematic part
const code = `OBJECT XMLport 50000 "Test"
{
  ELEMENTS
  {
    { [{VALID-GUID-1}];0 ;validElement ;Element ;Text     }
    { [{BROKEN-GUID}];0 ;brokenElement ;Element ;Text
  }
}`;

const lexer = new Lexer(code);
const tokens = lexer.tokenize();

// Print tokens around the problematic area
console.log('Tokens:');
tokens.forEach((t, i) => {
  if (i >= 15) {
    console.log(`${i}: ${t.type} = "${t.value}"`);
  }
  if (i > 35) return;
});
