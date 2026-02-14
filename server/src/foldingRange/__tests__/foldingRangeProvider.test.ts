/**
 * Tests for FoldingRangeProvider
 *
 * These tests validate the code folding functionality.
 *
 * Issue: #32 - Code folding support
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';

import { FoldingRangeProvider, collectCommentFoldingRanges, collectBraceCommentFoldingRanges } from '../foldingRangeProvider';

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string, uri: string = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse content into AST
 */
function parseContent(content: string) {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return { ast: parser.parse(), lexer };
}

describe('FoldingRangeProvider', () => {
  let provider: FoldingRangeProvider;

  beforeEach(() => {
    provider = new FoldingRangeProvider();
  });

  describe('Basic Constructs', () => {
    it('should create folding range for procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProcedure@1();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for MyProcedure (entire procedure declaration)
      const procRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('PROCEDURE MyProcedure');
      });

      expect(procRange).toBeDefined();
      expect(procRange?.kind).toBeUndefined(); // Procedures don't use FoldingRangeKind.Region
    });

    it.skip('should create folding range for trigger', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    TRIGGER OnInsert@1();
    BEGIN
      // Trigger logic
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for OnInsert trigger
      const triggerRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('TRIGGER OnInsert');
      });

      expect(triggerRange).toBeDefined();
      expect(triggerRange?.kind).toBeUndefined();
    });

    it('should create folding range for BEGIN/END block', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      BEGIN
        // Nested block
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for both outer and inner BEGIN/END blocks
      expect(ranges.length).toBeGreaterThan(0);
    });
  });

  describe('Control Structures', () => {
    it('should create folding range for IF statement with BEGIN/END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Flag : Boolean;
    BEGIN
      IF Flag THEN BEGIN
        // IF branch
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for IF statement's BEGIN/END block
      const ifRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('IF Flag THEN BEGIN');
      });

      expect(ifRange).toBeDefined();
    });

    it('should create folding range for CASE statement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Value : Integer;
    BEGIN
      CASE Value OF
        1: BEGIN
          // Case 1
        END;
        2: BEGIN
          // Case 2
        END;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for CASE statement
      const caseRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('CASE Value OF');
      });

      expect(caseRange).toBeDefined();
    });

    it('should create folding range for REPEAT...UNTIL loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Counter : Integer;
    BEGIN
      REPEAT
        Counter := Counter + 1;
      UNTIL Counter > 10;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for REPEAT...UNTIL
      const repeatRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('REPEAT');
      });

      expect(repeatRange).toBeDefined();
    });

    it('should create folding range for FOR loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO BEGIN
        // Loop body
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for FOR loop's BEGIN/END block
      const forRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('FOR i := 1 TO 10 DO BEGIN');
      });

      expect(forRange).toBeDefined();
    });

    it('should create folding range for WHILE loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Flag : Boolean;
    BEGIN
      WHILE Flag DO BEGIN
        // Loop body
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for WHILE loop's BEGIN/END block
      const whileRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('WHILE Flag DO BEGIN');
      });

      expect(whileRange).toBeDefined();
    });

    it('should create folding range for WITH block', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer DO BEGIN
        // WITH body
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for WITH block
      const withRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('WITH Customer DO BEGIN');
      });

      expect(withRange).toBeDefined();
    });
  });

  describe('Sections - FoldingRangeKind.Region', () => {
    it('should create folding range for PROPERTIES section with kind Region', () => {
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    DataPerCompany=Yes;
    OnInsert=BEGIN
      // Property trigger
    END;

  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for PROPERTIES section
      const propsRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.trim().startsWith('PROPERTIES');
      });

      expect(propsRange).toBeDefined();
      expect(propsRange?.kind).toBe(FoldingRangeKind.Region);
    });

    it('should create folding range for FIELDS section with kind Region', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
    { 3   ;   ;Address             ;Text100       }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for FIELDS section
      const fieldsRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.trim().startsWith('FIELDS');
      });

      expect(fieldsRange).toBeDefined();
      expect(fieldsRange?.kind).toBe(FoldingRangeKind.Region);
    });

    it('should create folding range for KEYS section with kind Region', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {
    {    ;No.                      ;Clustered=Yes }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for KEYS section
      const keysRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.trim().startsWith('KEYS');
      });

      expect(keysRange).toBeDefined();
      expect(keysRange?.kind).toBe(FoldingRangeKind.Region);
    });

    it('should create folding range for CODE section with kind Region', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for CODE section
      const codeRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.trim().startsWith('CODE');
      });

      expect(codeRange).toBeDefined();
      expect(codeRange?.kind).toBe(FoldingRangeKind.Region);
    });

    it.skip('should create folding range for CONTROLS section with kind Region', () => {
      const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    PageType=Card;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                Name=ContentArea }

    { 2   ;1   ;Field     ;
                SourceExpr="No." }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for CONTROLS section
      const controlsRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.trim().startsWith('CONTROLS');
      });

      expect(controlsRange).toBeDefined();
      expect(controlsRange?.kind).toBe(FoldingRangeKind.Region);
    });

    it('should create folding range for FIELDGROUPS section with kind Region', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
  FIELDGROUPS
  {
    { 1   ;DropDown            ;No.,Name                         }
    { 2   ;Brick               ;No.,Name                         }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for FIELDGROUPS section
      const fieldGroupsRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.trim().startsWith('FIELDGROUPS');
      });

      expect(fieldGroupsRange).toBeDefined();
      expect(fieldGroupsRange?.kind).toBe(FoldingRangeKind.Region);
    });

    describe('ACTIONS Sections', () => {
      it('should create folding range for top-level ACTIONS section with kind Region', () => {
        const code = `OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
    PageType=Card;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                Name=ContentArea }
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                Name=ActionItems;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action    ;
                Name=MyAction;
                CaptionML=ENU=My Action }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        // Should have folding range for ACTIONS section
        const actionsRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('ACTIONS');
        });

        expect(actionsRange).toBeDefined();
        expect(actionsRange?.kind).toBe(FoldingRangeKind.Region);
      });

      it('should create folding range for inline ActionList=ACTIONS with kind Region', () => {
        const code = `OBJECT Page 50000 TestPage
{
  CONTROLS
  {
    { 1   ;0   ;Container ;
                Name=ContentArea;
                ActionList=ACTIONS
                {
                  { 2   ;0   ;Action    ;
                              Name=MyAction;
                              CaptionML=ENU=Test }
                } }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        // Should have folding range for ActionList=ACTIONS property
        const actionListRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('ActionList=ACTIONS');
        });

        expect(actionListRange).toBeDefined();
        expect(actionListRange?.kind).toBe(FoldingRangeKind.Region);
      });
    });

    describe('Empty Sections', () => {
      it('should fold empty PROPERTIES section', () => {
        const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);
        const ranges = provider.provide(doc, ast, lexer);

        const propsRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('PROPERTIES');
        });

        expect(propsRange).toBeDefined();
        expect(propsRange?.kind).toBe(FoldingRangeKind.Region);
      });

      it('should fold empty FIELDS section', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);
        const ranges = provider.provide(doc, ast, lexer);

        const fieldsRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('FIELDS');
        });

        expect(fieldsRange).toBeDefined();
        expect(fieldsRange?.kind).toBe(FoldingRangeKind.Region);
      });

      it('should fold empty KEYS section', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);
        const ranges = provider.provide(doc, ast, lexer);

        const keysRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('KEYS');
        });

        expect(keysRange).toBeDefined();
        expect(keysRange?.kind).toBe(FoldingRangeKind.Region);
      });

      it('should fold empty FIELDGROUPS section', () => {
        const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  FIELDGROUPS
  {
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);
        const ranges = provider.provide(doc, ast, lexer);

        const fieldGroupsRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('FIELDGROUPS');
        });

        expect(fieldGroupsRange).toBeDefined();
        expect(fieldGroupsRange?.kind).toBe(FoldingRangeKind.Region);
      });

      it.skip('should fold empty CODE section', () => {
        // Parser limitation: CODE section with only documentation trigger (BEGIN...END.)
        // is not properly parsed. The endToken is set to the opening brace instead of
        // the closing brace. This is a known parser issue, not a folding range issue.
        // A CODE section needs at least one procedure/trigger to be recognized correctly.
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);
        const ranges = provider.provide(doc, ast, lexer);

        const codeRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('CODE');
        });

        expect(codeRange).toBeDefined();
        expect(codeRange?.kind).toBe(FoldingRangeKind.Region);
      });

      it('should fold empty ACTIONS section', () => {
        const code = `OBJECT Page 50000 TestPage
{
  CONTROLS
  {
    { 1   ;0   ;Container ;
                Name=ContentArea }
  }
  ACTIONS
  {
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);
        const ranges = provider.provide(doc, ast, lexer);

        const actionsRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.trim().startsWith('ACTIONS');
        });

        expect(actionsRange).toBeDefined();
        expect(actionsRange?.kind).toBe(FoldingRangeKind.Region);
      });
    });
  });

  describe('Nested Constructs', () => {
    it('should create folding ranges for nested IF with BEGIN/END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Flag1 : Boolean;
      Flag2 : Boolean;
    BEGIN
      IF Flag1 THEN BEGIN
        IF Flag2 THEN BEGIN
          // Nested IF
        END;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for outer procedure, outer IF block, and nested IF block
      expect(ranges.length).toBeGreaterThanOrEqual(3);
    });

    it('should create folding ranges for CASE with multiple branches', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Value : Integer;
    BEGIN
      CASE Value OF
        1: BEGIN
          // Case 1
          IF TRUE THEN BEGIN
            // Nested in Case 1
          END;
        END;
        2: BEGIN
          // Case 2
        END;
        ELSE BEGIN
          // Default case
        END;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for:
      // - Procedure
      // - CASE statement
      // - Each CASE branch's BEGIN/END
      // - Nested IF in first branch
      // - ELSE branch
      expect(ranges.length).toBeGreaterThanOrEqual(5);
    });

    it('should create folding ranges for deeply nested blocks', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO BEGIN
        WHILE TRUE DO BEGIN
          IF i > 5 THEN BEGIN
            // Deeply nested
          END;
        END;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for procedure, FOR block, WHILE block, IF block
      expect(ranges.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Edge Cases', () => {
    it('should not create folding range for single-line procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE OneLine@1();
    BEGIN EXIT(TRUE); END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should NOT include single-line procedure (startLine == endLine)
      const singleLineRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('OneLine') && r.startLine === r.endLine;
      });

      expect(singleLineRange).toBeUndefined();
    });

    it('should handle empty procedure body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Empty@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should create folding range even for empty procedure if multi-line
      const emptyProcRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('PROCEDURE Empty');
      });

      // Empty procedure should fold if BEGIN and END are on different lines
      if (emptyProcRange) {
        expect(emptyProcRange.startLine).toBeLessThan(emptyProcRange.endLine);
      }
    });

    it('should handle malformed AST with missing endToken gracefully', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Incomplete@1();
    BEGIN
      // Missing END - malformed
`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      // Should not throw - parser handles errors gracefully
      expect(() => provider.provide(doc, ast, lexer)).not.toThrow();
    });

    it('should return empty array for empty document', () => {
      const code = '';
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      expect(ranges).toEqual([]);
    });

    it('should return empty array for document with no foldable constructs', () => {
      const code = `OBJECT Codeunit 50000 Empty
{
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // No sections, procedures, or control structures to fold
      expect(ranges).toEqual([]);
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert to 0-based LSP coordinates from 1-based token coordinates', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      // Line 6 (1-based)
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // All line numbers should be 0-based
      ranges.forEach((range: FoldingRange) => {
        expect(range.startLine).toBeGreaterThanOrEqual(0);
        expect(range.endLine).toBeGreaterThanOrEqual(0);
        expect(range.endLine).toBeGreaterThanOrEqual(range.startLine);
      });
    });

    it('should exclude END line from folding range (remains visible when folded)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      // Line 6 (0-based: line 5)
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Find the procedure's BEGIN/END block
      const procRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('PROCEDURE Foo');
      });

      if (procRange) {
        // The endLine should be one less than the actual END token line
        // so END remains visible when folded
        const endLineText = doc.getText({
          start: { line: procRange.endLine, character: 0 },
          end: { line: procRange.endLine, character: 100 }
        });
        // The range should end before the END keyword line
        expect(endLineText).not.toMatch(/^\s*END;/);
      }
    });

    it('should handle object starting on line 1 correctly', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      // Body
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should create valid 0-based coordinates
      // There should be ranges for CODE section and procedure
      expect(ranges.length).toBeGreaterThan(0);

      // All ranges should have valid coordinates (startLine < endLine)
      ranges.forEach((r: FoldingRange) => {
        expect(r.startLine).toBeGreaterThanOrEqual(0);
        expect(r.endLine).toBeGreaterThan(r.startLine);
      });
    });
  });

  describe('Complex Document Structures', () => {
    it('should create all expected folding ranges for a complete table', () => {
      const code = `OBJECT Table 50000 Customer
{
  PROPERTIES
  {
    DataPerCompany=Yes;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
  KEYS
  {
    {    ;No.                      ;Clustered=Yes }
  }
  CODE
  {
    VAR
      GlobalVar@1000 : Integer;

    PROCEDURE ValidateNo@1();
    BEGIN
      IF "No." = '' THEN BEGIN
        ERROR('No. cannot be blank');
      END;
    END;

    TRIGGER OnInsert@2();
    BEGIN
      ValidateNo;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for:
      // - PROPERTIES section
      // - FIELDS section
      // - KEYS section
      // - CODE section
      // - ValidateNo procedure
      // - IF statement's BEGIN/END in ValidateNo
      // - OnInsert trigger
      expect(ranges.length).toBeGreaterThanOrEqual(7);

      // Check sections have kind Region
      const sectionRanges = ranges.filter((r: FoldingRange) => r.kind === FoldingRangeKind.Region);
      expect(sectionRanges.length).toBeGreaterThanOrEqual(4); // PROPERTIES, FIELDS, KEYS, CODE
    });

    it('should handle procedure with VAR section correctly', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      LocalVar1 : Integer;
      LocalVar2 : Text[50];
    BEGIN
      LocalVar1 := 1;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should create folding range for entire procedure (including VAR section)
      const procRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 100 }
        });
        return startLineText.includes('PROCEDURE Foo');
      });

      expect(procRange).toBeDefined();
    });

    it('should handle multiple procedures in CODE section', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE First@1();
    BEGIN
      // First
    END;

    PROCEDURE Second@2();
    BEGIN
      // Second
    END;

    PROCEDURE Third@3();
    BEGIN
      // Third
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for CODE section + 3 procedures
      expect(ranges.length).toBeGreaterThanOrEqual(4);

      // All three procedures should be foldable
      const procNames = ['First', 'Second', 'Third'];
      procNames.forEach(name => {
        const procRange = ranges.find((r: FoldingRange) => {
          const startLineText = doc.getText({
            start: { line: r.startLine, character: 0 },
            end: { line: r.startLine, character: 100 }
          });
          return startLineText.includes(`PROCEDURE ${name}`);
        });
        expect(procRange).toBeDefined();
      });
    });
  });

  describe('Field-Level Triggers', () => {
    it('should create folding range for field OnValidate trigger', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Amount              ;Decimal       ;OnValidate=BEGIN
                                                                IF Amount < 0 THEN
                                                                  ERROR('Cannot be negative');
                                                              END;
                                                   }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for OnValidate trigger
      const validateRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 200 }
        });
        return startLineText.includes('OnValidate=BEGIN');
      });

      expect(validateRange).toBeDefined();
      expect(validateRange?.kind).toBeUndefined(); // Field triggers use default folding, not Region
    });

    it('should create folding range for field OnLookup trigger', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Customer No.        ;Code20        ;OnLookup=BEGIN
                                                              IF Customer.GET("Customer No.") THEN
                                                                MESSAGE('Found');
                                                            END;
                                                   }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for OnLookup trigger
      const lookupRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 200 }
        });
        return startLineText.includes('OnLookup=BEGIN');
      });

      expect(lookupRange).toBeDefined();
      expect(lookupRange?.kind).toBeUndefined();
    });

    it('should create folding ranges for field with multiple triggers', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Amount              ;Decimal       ;OnValidate=BEGIN
                                                                IF Amount < 0 THEN
                                                                  ERROR('Cannot be negative');
                                                              END;
                                                   OnLookup=BEGIN
                                                              MESSAGE('Lookup triggered');
                                                            END;
                                                   }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for both OnValidate and OnLookup
      const validateRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 200 }
        });
        return startLineText.includes('OnValidate=BEGIN');
      });

      const lookupRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 200 }
        });
        return startLineText.includes('OnLookup=BEGIN');
      });

      expect(validateRange).toBeDefined();
      expect(lookupRange).toBeDefined();
    });

    it('should create folding ranges for nested constructs in field trigger', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Amount              ;Decimal       ;OnValidate=VAR
                                                                TempAmount@1000 : Decimal;
                                                              BEGIN
                                                                TempAmount := Amount;
                                                                IF TempAmount < 0 THEN BEGIN
                                                                  ERROR('Cannot be negative');
                                                                END;
                                                              END;
                                                   }
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for:
      // - FIELDS section
      // - OnValidate trigger (entire VAR + BEGIN/END)
      // - IF statement's BEGIN/END block
      expect(ranges.length).toBeGreaterThanOrEqual(3);

      // Verify OnValidate trigger is foldable
      const validateRange = ranges.find((r: FoldingRange) => {
        const startLineText = doc.getText({
          start: { line: r.startLine, character: 0 },
          end: { line: r.startLine, character: 200 }
        });
        return startLineText.includes('OnValidate=VAR');
      });

      expect(validateRange).toBeDefined();
      expect(validateRange?.kind).toBeUndefined();
    });
  });

  describe('Statement-Level Folding', () => {
    it('should create folding range for standalone BlockStatement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      BEGIN
        // Standalone block
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding ranges for procedure and inner standalone block
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle CASE branches without BEGIN/END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Value : Integer;
    BEGIN
      CASE Value OF
        1: Value := 2;
        2: Value := 3;
      END;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for CASE statement and procedure
      // But NOT for individual single-line branches
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle IF/ELSE without BEGIN/END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Flag : Boolean;
      X : Integer;
    BEGIN
      IF Flag THEN
        X := 1
      ELSE
        X := 2;
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast, lexer } = parseContent(code);

      const ranges = provider.provide(doc, ast, lexer);

      // Should have folding range for procedure
      // But NOT for single-line IF branches without BEGIN/END
      expect(ranges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Comment Folding', () => {
    describe('Integration Tests - provide()', () => {
      it('should fold 3-line /* */ comment', () => {
        const code = `/* This is a
multi-line
comment */
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeDefined();
        expect(commentRange?.startLine).toBe(0);
        expect(commentRange?.endLine).toBe(2);
      });

      it('should fold 5-line /* */ comment', () => {
        const code = `/* Long
comment
spanning
multiple
lines */
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeDefined();
        expect(commentRange?.startLine).toBe(0);
        expect(commentRange?.endLine).toBe(4);
      });

      it('should not fold 2-line /* */ comment (below threshold)', () => {
        const code = `/* Two line
comment */
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it('should not fold single-line /* */ comment', () => {
        const code = `/* Single line comment */
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it('should fold multiple /* */ comments separately', () => {
        const code = `/* First
comment
block */
OBJECT Codeunit 50000 Test
{
  /* Second
  comment
  block */
  CODE
  {
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRanges = ranges.filter((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRanges.length).toBe(2);
        expect(commentRanges[0].startLine).toBe(0);
        expect(commentRanges[0].endLine).toBe(2);
        expect(commentRanges[1].startLine).toBe(5);
        expect(commentRanges[1].endLine).toBe(7);
      });

      it('should fold comment at file start (line 0)', () => {
        const code = `/* Comment
at file
start */
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeDefined();
        expect(commentRange?.startLine).toBe(0);
      });

      it('should not fold unclosed /* at EOF', () => {
        const code = `OBJECT Codeunit 50000 Test
{
}
/* Unclosed
comment`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it('should not fold // single-line comments', () => {
        const code = `// Line 1
// Line 2
// Line 3
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it('should include closing */ line in fold range', () => {
        const code = `/* Comment
line 2
line 3 */
OBJECT Codeunit 50000 Test
{
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeDefined();
        expect(commentRange?.endLine).toBe(2);
      });

      it('should not fold /* inside string literal', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Str : Text;
    BEGIN
      Str := 'This /* is not
a comment
inside */ string';
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it("should not fold /* when '' escape does not end string", () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Str : Text;
    BEGIN
      Str := 'It''s /* not a
real
comment */';
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it('should not fold /* in multi-line string literal', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      Str : Text;
    BEGIN
      Str := 'Line 1 /* open
Line 2 middle
Line 3 */ close
still in string';
    END;

    BEGIN
    END.
  }
}`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeUndefined();
      });

      it('should fold comment in document without object', () => {
        const code = `/* File header
comment
block */`;
        const doc = createDocument(code);
        const { ast, lexer } = parseContent(code);

        const ranges = provider.provide(doc, ast, lexer);

        const commentRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
        expect(commentRange).toBeDefined();
        expect(commentRange?.startLine).toBe(0);
        expect(commentRange?.endLine).toBe(2);
      });
    });

    describe('Unit Tests - collectCommentFoldingRanges()', () => {
      it('should return empty array for empty string', () => {
        const code = '';
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges).toEqual([]);
      });

      it('should return empty array for code with no comments', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
  }
}`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges).toEqual([]);
      });

      it('should fold comment exactly at 3-line threshold', () => {
        const code = `/* Line 1
Line 2
Line 3 */`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges.length).toBe(1);
        expect(ranges[0].kind).toBe(FoldingRangeKind.Comment);
        expect(ranges[0].startLine).toBe(0);
        expect(ranges[0].endLine).toBe(2);
      });

      it('should return empty array for 2-line comment (below threshold)', () => {
        const code = `/* Line 1
Line 2 */`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges).toEqual([]);
      });

      it('should handle \\r\\n line endings correctly', () => {
        const code = `/* Line 1\r\nLine 2\r\nLine 3 */`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges.length).toBe(1);
        expect(ranges[0].startLine).toBe(0);
        expect(ranges[0].endLine).toBe(2);
      });

      it('should handle mixed \\r\\n and \\n line endings correctly', () => {
        const code = `/* Line 1\r\nLine 2\nLine 3 */`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges.length).toBe(1);
        expect(ranges[0].startLine).toBe(0);
        expect(ranges[0].endLine).toBe(2);
      });

      it('should skip string literal then fold comment', () => {
        const code = `Str := 'not /* comment';
/* Real
comment
here */`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges.length).toBe(1);
        expect(ranges[0].startLine).toBe(1);
        expect(ranges[0].endLine).toBe(3);
      });

      it('should return empty array when unclosed string before comment', () => {
        const code = `Str := 'unclosed string
/* This looks
like a comment
but scanner is stuck in string */`;
        const doc = createDocument(code);

        const ranges = collectCommentFoldingRanges(doc.getText());

        expect(ranges).toEqual([]);
      });

      it('should not fold /* inside // line comment', () => {
        const code = `// See /* Bug #123
y := 2;
z := 3;
// Fix */ here`;
        const ranges = collectCommentFoldingRanges(code);
        expect(ranges).toEqual([]);
      });
    });

    describe('Brace Comment Folding - { }', () => {
      describe('Integration Tests - provide()', () => {
        it('should fold multi-line { } comment inside procedure', () => {
          const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      { This is a
      multi-line
      brace comment }
      x := 1;
    END;

    BEGIN
    END.
  }
}`;
          const doc = createDocument(code);
          const { ast, lexer } = parseContent(code);

          const ranges = provider.provide(doc, ast, lexer);

          const braceCommentRange = ranges.find((r: FoldingRange) =>
            r.kind === FoldingRangeKind.Comment &&
            r.startLine === 6 &&
            r.endLine === 8
          );
          expect(braceCommentRange).toBeDefined();
        });

        it('should fold { } comment with FoldingRangeKind.Comment', () => {
          const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      { Comment
      line 2
      line 3 }
      x := 1;
    END;

    BEGIN
    END.
  }
}`;
          const doc = createDocument(code);
          const { ast, lexer } = parseContent(code);

          const ranges = provider.provide(doc, ast, lexer);

          const braceCommentRange = ranges.find((r: FoldingRange) =>
            r.kind === FoldingRangeKind.Comment &&
            r.startLine >= 6 && r.endLine >= 8
          );
          expect(braceCommentRange).toBeDefined();
          expect(braceCommentRange?.kind).toBe(FoldingRangeKind.Comment);
        });

        it('should fold both /* */ and { } comments', () => {
          const code = `/* Header
comment
block */
OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo@1();
    BEGIN
      { Brace
      comment
      here }
      x := 1;
    END;

    BEGIN
    END.
  }
}`;
          const doc = createDocument(code);
          const { ast, lexer } = parseContent(code);

          const ranges = provider.provide(doc, ast, lexer);

          const commentRanges = ranges.filter((r: FoldingRange) => r.kind === FoldingRangeKind.Comment);
          expect(commentRanges.length).toBeGreaterThanOrEqual(2);

          // Check for /* */ comment
          const slashStarComment = commentRanges.find(r => r.startLine === 0);
          expect(slashStarComment).toBeDefined();

          // Check for { } comment
          const braceComment = commentRanges.find(r => r.startLine >= 9);
          expect(braceComment).toBeDefined();
        });

        it('should not fold { } braces in FIELDS section', () => {
          const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
    { 3   ;   ;Address             ;Text100       }
  }
}`;
          const doc = createDocument(code);
          const { ast, lexer } = parseContent(code);

          const ranges = provider.provide(doc, ast, lexer);

          // Should have folding range for FIELDS section (kind: Region)
          const fieldsRange = ranges.find((r: FoldingRange) => r.kind === FoldingRangeKind.Region);
          expect(fieldsRange).toBeDefined();

          // Should NOT have comment folding ranges for structural { } braces
          const braceCommentRanges = ranges.filter((r: FoldingRange) =>
            r.kind === FoldingRangeKind.Comment &&
            r.startLine >= 3 && r.endLine <= 7
          );
          expect(braceCommentRanges).toEqual([]);
        });
      });

      describe('Unit Tests - collectBraceCommentFoldingRanges()', () => {
        it('should fold 3-line { } comment in code context', () => {
          const code = `PROCEDURE Foo();
BEGIN
  { Line 1
  Line 2
  Line 3 }
  x := 1;
END;`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges.length).toBe(1);
          expect(ranges[0].kind).toBe(FoldingRangeKind.Comment);
          expect(ranges[0].startLine).toBe(2);
          expect(ranges[0].endLine).toBe(4);
        });

        it('should fold 5-line { } comment', () => {
          const code = `PROCEDURE Foo();
BEGIN
  { Long
  comment
  spanning
  multiple
  lines }
  x := 1;
END;`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges.length).toBe(1);
          expect(ranges[0].kind).toBe(FoldingRangeKind.Comment);
          expect(ranges[0].startLine).toBe(2);
          expect(ranges[0].endLine).toBe(6);
        });

        it('should not fold 2-line { } comment (below threshold)', () => {
          const code = `PROCEDURE Foo();
BEGIN
  { Two line
  comment }
  x := 1;
END;`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges).toEqual([]);
        });

        it('should not fold single-line { } comment', () => {
          const code = `PROCEDURE Foo();
BEGIN
  { Single line comment }
  x := 1;
END;`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges).toEqual([]);
        });

        it('should not fold structural { } in FIELDS section', () => {
          const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
    { 3   ;   ;Address             ;Text100       }
  }
}`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          // Should NOT detect structural braces as comments
          expect(ranges).toEqual([]);
        });

        it('should not fold structural { } in KEYS section', () => {
          const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {
    {    ;No.                      ;Clustered=Yes }
  }
}`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges).toEqual([]);
        });

        it('should fold multiple { } comments separately', () => {
          const code = `PROCEDURE Foo();
BEGIN
  { First
  comment
  block }
  x := 1;
  { Second
  comment
  block }
  y := 2;
END;`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges.length).toBe(2);
          expect(ranges[0].startLine).toBe(2);
          expect(ranges[0].endLine).toBe(4);
          expect(ranges[1].startLine).toBe(6);
          expect(ranges[1].endLine).toBe(8);
        });

        it('should not fold unclosed { at EOF', () => {
          const code = `PROCEDURE Foo();
BEGIN
  { Unclosed
  comment`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges).toEqual([]);
        });

        it('should handle \\r\\n line endings correctly', () => {
          const code = `PROCEDURE Foo();\r\nBEGIN\r\n  { Line 1\r\n  Line 2\r\n  Line 3 }\r\nEND;`;
          const doc = createDocument(code);

          const ranges = collectBraceCommentFoldingRanges(doc.getText());

          expect(ranges.length).toBe(1);
          expect(ranges[0].startLine).toBe(2);
          expect(ranges[0].endLine).toBe(4);
        });
      });
    });
  });
});
