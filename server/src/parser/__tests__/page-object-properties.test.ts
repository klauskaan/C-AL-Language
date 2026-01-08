/**
 * Regression test for PAG files with OBJECT-PROPERTIES section
 *
 * Real NAV files have OBJECT-PROPERTIES before PROPERTIES section.
 * This may cause parser state issues when followed by CONTROLS and CODE sections.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Page with OBJECT-PROPERTIES', () => {
  it('should parse page with OBJECT-PROPERTIES, PROPERTIES, CONTROLS, and CODE', () => {
    const code = `OBJECT Page 6510 Item Tracking Lines
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Time=12:00:00;
    Version List=NAVW114.00;
  }
  PROPERTIES
  {
    CaptionML=ENU=Test;
  }
  CONTROLS
  {
    { 1 ; Container ; ContentArea }
  }
  CODE
  {
    VAR
      TotalItemTrackingLine@1003 : Record 336;
      ItemTrackingCode@1005 : Record 6502;
  }
}`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    const errors = parser.getErrors();
    if (errors.length > 0) {
      console.log('Parse errors:', errors.slice(0, 5).map(e => `Line ${e.token.line}:${e.token.column} - ${e.message}`));
    }

    expect(errors).toEqual([]);
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectId).toBe(6510);
  });
});
