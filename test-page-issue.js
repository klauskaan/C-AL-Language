const { Lexer } = require('./server/dist/lexer/lexer');
const { Parser } = require('./server/dist/parser/parser');
const fs = require('fs');

const code = `OBJECT Page 6510 Test {
  PROPERTIES {
    CaptionML=ENU=Test Page;
  }
  CONTROLS {
    { 1 ; Container ; ContentArea }
  }
  CODE {
    VAR
      TotalItemTrackingLine@1003 : Record 336;
      ItemTrackingCode@1005 : Record 6502;
  }
}`;

console.log('Parsing page with CONTROLS + CODE + VAR...\n');

const lexer = new Lexer(code);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();

console.log('Errors:', parser.errors.length);
if (parser.errors.length > 0) {
  parser.errors.slice(0, 10).forEach(err => {
    console.log(`  - Line ${err.line}:${err.column} - ${err.message}`);
  });
}

console.log('\nAST object:', ast.object ? `${ast.object.objectKind} ${ast.object.objectId}` : 'null');
