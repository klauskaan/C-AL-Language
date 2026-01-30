import { Lexer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';

// With PROPERTIES
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

const obj = ast.object as any;
console.log('Elements:', obj.elements?.elements?.length || 0);
console.log('Errors:', parser.getErrors().length);
