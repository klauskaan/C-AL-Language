import { Lexer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';

// With valid element first
const code = `OBJECT XMLport 50000 "Test"
{
  ELEMENTS
  {
    { [{VALID-GUID-1}];0 ;validElement ;Element ;Text }
    { [{BROKEN-GUID}];0 ;brokenElement ;Element ;Text
  }
}`;

const lexer = new Lexer(code);
const parser = new Parser(lexer.tokenize());

const ast = parser.parse();

const obj = ast.object as any;
console.log('Elements:');
obj.elements?.elements?.forEach((e: any) => {
  console.log(`  - ${e.name} (GUID: ${e.guid})`);
});
