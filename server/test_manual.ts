import { Lexer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { ObjectDeclaration } from './src/parser/ast';

const code = `OBJECT XMLport 50000 "Test XMLport"
{
  PROPERTIES
  {
  }
  ELEMENTS
  {
    { [{VALID-GUID-1}];0 ;validElement        ;Element ;Text     }
    { [{BROKEN-GUID}];0 ;brokenElement       ;Element ;Text
  }
  CODE
  {
    VAR
      x@1000 : Integer;

    BEGIN
    END.
  }
}`;

const lexer = new Lexer(code);
const parser = new Parser(lexer.tokenize());
const ast = parser.parse();

const obj = ast.object as ObjectDeclaration;

console.log('Number of elements:', obj.elements?.elements?.length || 0);
console.log('Elements:', obj.elements?.elements?.map((e: any) => ({ name: e.name, guid: e.guid })));
console.log('Number of errors:', parser.getErrors().length);
console.log('Errors:', parser.getErrors());
console.log('Has CODE section:', !!obj.code);
