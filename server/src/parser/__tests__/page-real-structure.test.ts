/**
 * Regression test using actual structure from PAG6510.TXT
 *
 * Tests parser with realistic Page structure including:
 * - OBJECT-PROPERTIES
 * - PROPERTIES with triggers
 * - CONTROLS with multiple fields and multi-line properties
 * - CODE with global VAR declarations using @ID syntax
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Page with real NAV structure', () => {
  it('should parse PAG6510-like structure with CONTROLS and CODE sections', () => {
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
    CaptionML=ENU=Item Tracking Lines;
    SourceTable=Table336;
    PageType=Worksheet;
  }
  CONTROLS
  {
    { 1900000001;0;Container;
                ContainerType=ContentArea }

    { 59  ;1   ;Group      }

    { 38  ;4   ;Field     ;
                ApplicationArea=#ItemTracking;
                SourceExpr=CurrentSourceCaption;
                Editable=FALSE;
                ShowCaption=No }
  }
  CODE
  {
    VAR
      xTempItemTrackingLine@1009 : TEMPORARY Record 336;
      TotalItemTrackingLine@1003 : Record 336;
  }
}`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    const errors = parser.getErrors();
    if (errors.length > 0) {
      console.log('Parse errors:');
      errors.slice(0, 10).forEach(e => {
        console.log(`  Line ${e.token.line}:${e.token.column} - ${e.message}`);
      });
    }

    expect(errors).toEqual([]);
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectId).toBe(6510);
  });
});
