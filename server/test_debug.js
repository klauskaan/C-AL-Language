const { Lexer } = require('./dist/lexer/lexer');
const { Parser } = require('./dist/parser/parser');

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

console.log('Number of elements:', ast.object?.elements?.elements?.length || 0);
console.log('Elements:', ast.object?.elements?.elements?.map(e => ({ name: e.name, guid: e.guid })));
console.log('Errors:', parser.getErrors().length);
console.log('Has CODE section:', !!ast.object?.code);
