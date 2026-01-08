import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - INDATASET keyword support', () => {
  it('should parse INDATASET variables', () => {
    const code = `OBJECT Page 6510 Test
{
  CODE
  {
    VAR
      ApplFromItemEntryVisible@19038403 : Boolean INDATASET;
      ItemNoEditable@19055681 : Boolean INDATASET;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const errors = parser.getErrors();

    expect(errors).toEqual([]);
  });
});
