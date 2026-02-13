/**
 * Tests for CONTROLS Section Parsing
 *
 * CONTROLS format (found in Page objects):
 * ```
 * CONTROLS
 * {
 *   { ID;IndentLevel;ControlType; Properties [Triggers] }
 * }
 * ```
 * where:
 * - ID is an integer
 * - IndentLevel is an integer (0, 1, 2, etc.)
 * - ControlType is: Container, Group, Field, Part, or Separator
 * - Properties follow standard property format (Name=Value;)
 * - Triggers like OnValidate, OnDrillDown can have BEGIN...END blocks
 *
 * Hierarchy is built from IndentLevel:
 * - IndentLevel 0 = root control
 * - IndentLevel N+1 = child of nearest lower indent level
 *
 * The parser should:
 * - Parse each control entry
 * - Extract id, indentLevel, controlType
 * - Build parent-child hierarchy from indent levels
 * - Parse properties and triggers like FIELDS section
 * - Recover from malformed entries
 */

import { parseCode } from './parserTestHelpers';
import { ObjectDeclaration } from '../ast';

// Helper to parse and extract controls section
function parseControls(code: string) {
  const { ast, errors } = parseCode(code);

  return {
    ast,
    errors,
    controls: (ast.object as ObjectDeclaration)?.controls
  };
}

describe('Parser - CONTROLS Section', () => {
  describe('Basic control parsing', () => {
    it('should parse empty CONTROLS section', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls).toBeDefined();
      expect(result.controls?.type).toBe('ControlSection');
      expect(result.controls?.controls).toHaveLength(0);
    });

    it('should parse single Container control', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls).toBeDefined();
      expect(result.controls?.controls).toHaveLength(1);

      const control = result.controls?.controls[0];
      expect(control?.type).toBe('ControlDeclaration');
      expect(control?.id).toBe(1);
      expect(control?.indentLevel).toBe(0);
      expect(control?.controlType).toBe('Container');
      expect(control?.properties).toBeDefined();
      expect(control?.properties?.properties?.length).toBeGreaterThan(0);
    });

    it('should parse single Group control', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 2   ;1   ;Group     ;
                      CaptionML=[ENU=General];
                      GroupType=Group }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1);

      const control = result.controls?.controls[0];
      expect(control?.id).toBe(2);
      expect(control?.indentLevel).toBe(1);
      expect(control?.controlType).toBe('Group');
    });

    it('should parse single Field control', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 3   ;2   ;Field     ;
                      SourceExpr="No.";
                      CaptionML=[ENU=Number] }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1);

      const control = result.controls?.controls[0];
      expect(control?.id).toBe(3);
      expect(control?.indentLevel).toBe(2);
      expect(control?.controlType).toBe('Field');
    });

    it('should parse single Part control', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 4   ;1   ;Part      ;
                      SubPageLink=No.=FIELD(No.);
                      PagePartID=Page9080 }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1);

      const control = result.controls?.controls[0];
      expect(control?.id).toBe(4);
      expect(control?.indentLevel).toBe(1);
      expect(control?.controlType).toBe('Part');
    });

    it('should parse single Separator control', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 5   ;1   ;Separator }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1);

      const control = result.controls?.controls[0];
      expect(control?.id).toBe(5);
      expect(control?.indentLevel).toBe(1);
      expect(control?.controlType).toBe('Separator');
    });
  });

  describe('Hierarchy building', () => {
    it('should parse flat list (all indent 0)', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;0   ;Container }
          { 3   ;0   ;Container }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(3);

      // All should be root level (no parent)
      result.controls?.controls.forEach(control => {
        expect(control.indentLevel).toBe(0);
        expect(control.children).toEqual([]);
      });
    });

    it('should parse 2-level hierarchy (Container -> Field)', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Field     ;
                      SourceExpr="No." }
          { 3   ;1   ;Field     ;
                      SourceExpr=Name }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1);

      const root = result.controls?.controls[0];
      expect(root?.id).toBe(1);
      expect(root?.indentLevel).toBe(0);
      expect(root?.children).toHaveLength(2);

      expect(root?.children?.[0].id).toBe(2);
      expect(root?.children?.[0].indentLevel).toBe(1);

      expect(root?.children?.[1].id).toBe(3);
      expect(root?.children?.[1].indentLevel).toBe(1);
    });

    it('should parse 3-level hierarchy (Container -> Group -> Field)', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Group     }
          { 3   ;2   ;Field     ;
                      SourceExpr="No." }
          { 4   ;2   ;Field     ;
                      SourceExpr=Name }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);

      const root = result.controls?.controls[0];
      expect(root?.id).toBe(1);
      expect(root?.children).toHaveLength(1);

      const level1 = root?.children?.[0];
      expect(level1?.id).toBe(2);
      expect(level1?.children).toHaveLength(2);

      expect(level1?.children?.[0].id).toBe(3);
      expect(level1?.children?.[1].id).toBe(4);
    });

    it('should parse multiple root controls', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Field     ;
                      SourceExpr="No." }
          { 3   ;0   ;Container }
          { 4   ;1   ;Field     ;
                      SourceExpr=Name }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(2);

      const root1 = result.controls?.controls[0];
      expect(root1?.id).toBe(1);
      expect(root1?.children).toHaveLength(1);
      expect(root1?.children?.[0].id).toBe(2);

      const root2 = result.controls?.controls[1];
      expect(root2?.id).toBe(3);
      expect(root2?.children).toHaveLength(1);
      expect(root2?.children?.[0].id).toBe(4);
    });

    it('should parse complex mixed hierarchy', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Group     }
          { 3   ;2   ;Field     ;
                      SourceExpr="No." }
          { 4   ;1   ;Group     }
          { 5   ;2   ;Field     ;
                      SourceExpr=Name }
          { 6   ;2   ;Field     ;
                      SourceExpr=Address }
          { 7   ;0   ;Container }
          { 8   ;1   ;Field     ;
                      SourceExpr=City }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(2);

      // First root
      const root1 = result.controls?.controls[0];
      expect(root1?.id).toBe(1);
      expect(root1?.children).toHaveLength(2); // Two groups at indent 1

      const group1 = root1?.children?.[0];
      expect(group1?.id).toBe(2);
      expect(group1?.children).toHaveLength(1); // One field

      const group2 = root1?.children?.[1];
      expect(group2?.id).toBe(4);
      expect(group2?.children).toHaveLength(2); // Two fields

      // Second root
      const root2 = result.controls?.controls[1];
      expect(root2?.id).toBe(7);
      expect(root2?.children).toHaveLength(1);
    });

    it('should handle non-monotonic indent levels (0→2→1) using stack algorithm', () => {
      // This test validates the stack-based hierarchy building algorithm
      // in buildControlHierarchy (parser.ts:2005-2039).
      //
      // The algorithm handles non-monotonic indents where levels are skipped:
      // - Control 1 at indent 0 → becomes root, stack = [{0, C1}]
      // - Control 2 at indent 2 → since 0 < 2, becomes child of C1, stack = [{0, C1}, {2, C2}]
      // - Control 3 at indent 1 → pops indent 2 (since 2 >= 1), then:
      //                            since 0 < 1, becomes child of C1 (not C2)
      //                            stack = [{0, C1}, {1, C3}]
      //
      // Result: Both C2 and C3 are children of C1, despite C2 having higher indent than C3.
      // This matches NAV's behavior where indent gaps don't create phantom parents.

      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;2   ;Field     ;
                      SourceExpr="No." }
          { 3   ;1   ;Field     ;
                      SourceExpr=Name }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1);

      // Control 1 should be the only root
      const root = result.controls?.controls[0];
      expect(root?.id).toBe(1);
      expect(root?.indentLevel).toBe(0);

      // Both Control 2 (indent 2) and Control 3 (indent 1) should be direct children of Control 1
      expect(root?.children).toHaveLength(2);

      // Control 2 appears first in source order
      expect(root?.children?.[0].id).toBe(2);
      expect(root?.children?.[0].indentLevel).toBe(2);
      expect(root?.children?.[0].children).toHaveLength(0); // C2 has no children

      // Control 3 appears second, as sibling to C2 (not child)
      expect(root?.children?.[1].id).toBe(3);
      expect(root?.children?.[1].indentLevel).toBe(1);
      expect(root?.children?.[1].children).toHaveLength(0); // C3 has no children
    });
  });

  describe('Property parsing', () => {
    it('should parse control with simple properties', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      Name=MyContainer;
                      ContainerType=ContentArea;
                      CaptionML=ENU=Main Area }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      expect(control?.properties).toBeDefined();
      expect(control?.properties?.properties?.length).toBeGreaterThanOrEqual(3);

      const nameProp = control?.properties?.properties?.find((p: any) => p.name === 'Name');
      expect(nameProp?.value).toContain('MyContainer');

      const containerTypeProp = control?.properties?.properties?.find((p: any) => p.name === 'ContainerType');
      expect(containerTypeProp?.value).toContain('ContentArea');
    });

    it('should parse control with SourceExpr property', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Field     ;
                      SourceExpr="No.";
                      CaptionML=ENU=Number }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      const sourceExprProp = control?.properties?.properties?.find((p: any) => p.name === 'SourceExpr');
      expect(sourceExprProp).toBeDefined();
      expect(sourceExprProp?.value).toContain('No.');
    });

    it('should parse control with SubPageLink property containing nested = and FIELD()', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Part      ;
                      SubPageLink=No.=FIELD(No.);
                      PagePartID=Page9080 }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      const subPageLinkProp = control?.properties?.properties?.find((p: any) => p.name === 'SubPageLink');
      expect(subPageLinkProp).toBeDefined();
      expect(subPageLinkProp?.value).toContain('No.');
      expect(subPageLinkProp?.value).toContain('FIELD');
    });

    it('should parse control with multi-line properties', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Field     ;
                      SourceExpr="No.";
                      CaptionML=[DAN=Nummer;
                                 ENU=Number];
                      Editable=No }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      const captionProp = control?.properties?.properties?.find((p: any) => p.name === 'CaptionML');
      expect(captionProp).toBeDefined();
      expect(captionProp?.value).toContain('DAN');
      expect(captionProp?.value).toContain('ENU');
    });

    it('should parse control without properties (Separator)', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Separator }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      expect(control?.id).toBe(1);
      expect(control?.controlType).toBe('Separator');
      expect(control?.properties).toBeNull();
    });
  });

  describe('Trigger parsing', () => {
    it('should parse control with OnValidate trigger containing multi-statement body', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Field     ;
                      SourceExpr="No.";
                      OnValidate=BEGIN
                                   TESTFIELD(Name);
                                   VALIDATE(City);
                                 END;
                                  }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      expect(control?.triggers).toBeDefined();
      expect(control?.triggers?.length).toBeGreaterThan(0);
      const onValidateTrigger = control?.triggers?.find((t: any) => t.name === 'OnValidate');
      expect(onValidateTrigger).toBeDefined();
      expect(onValidateTrigger?.body).toBeDefined();
      expect(onValidateTrigger?.body?.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse control with OnDrillDown trigger', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Field     ;
                      SourceExpr="Balance (LCY)";
                      OnDrillDown=BEGIN
                                    ShowEntries;
                                  END;
                                   }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      const onDrillDownTrigger = control?.triggers?.find((t: any) => t.name === 'OnDrillDown');
      expect(onDrillDownTrigger).toBeDefined();
      expect(onDrillDownTrigger?.body).toBeDefined();
    });

    it('should parse control with trigger containing VAR section', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Field     ;
                      SourceExpr="No.";
                      OnValidate=VAR
                                   Cust@1000 : Record 18;
                                 BEGIN
                                   Cust.GET("No.");
                                   Name := Cust.Name;
                                 END;
                                  }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      const control = result.controls?.controls[0];

      const onValidateTrigger = control?.triggers?.find((t: any) => t.name === 'OnValidate');
      expect(onValidateTrigger).toBeDefined();
      expect(onValidateTrigger?.variables).toBeDefined();
      expect(onValidateTrigger?.variables?.length).toBe(1);
      expect(onValidateTrigger?.body).toBeDefined();
    });
  });

  describe('Unknown control types', () => {
    it('should handle unknown control type and preserve rawControlType', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;UnknownType;
                      Name=Test }
        }
      }`;

      const result = parseControls(code);

      // Should default to a valid control type but preserve raw type
      const control = result.controls?.controls[0];
      expect(control?.controlType).toBe('Field'); // Default fallback to Field for unknown types
      expect(control?.rawControlType).toBe('UnknownType'); // Preserved
    });
  });

  describe('Edge cases', () => {
    it('should handle control with missing indent column (empty = 0)', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;    ;Container ;
                      ContainerType=ContentArea }
        }
      }`;

      const result = parseControls(code);

      // Empty indent should be treated as 0
      const control = result.controls?.controls[0];
      expect(control?.id).toBe(1);
      expect(control?.indentLevel).toBe(0);
    });

    it('should preserve control order in list', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;0   ;Container }
          { 3   ;0   ;Container }
          { 4   ;0   ;Container }
        }
      }`;

      const result = parseControls(code);

      expect(result.controls?.controls).toHaveLength(4);
      expect(result.controls?.controls[0].id).toBe(1);
      expect(result.controls?.controls[1].id).toBe(2);
      expect(result.controls?.controls[2].id).toBe(3);
      expect(result.controls?.controls[3].id).toBe(4);
    });

    it('should handle very large control IDs', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1900000001;0 ;Container }
        }
      }`;

      const result = parseControls(code);

      const control = result.controls?.controls[0];
      expect(control?.id).toBe(1900000001);
    });
  });

  describe('Real-world examples', () => {
    it('should parse minimal CONTROLS from Page 21 Customer Card', () => {
      const code = `OBJECT Page 21 "Customer Card"
      {
        PROPERTIES
        {
          PageType=Card;
          SourceTable=Table18;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }
          { 2   ;1   ;Group     ;
                      CaptionML=[ENU=General];
                      GroupType=Group }
          { 3   ;2   ;Field     ;
                      SourceExpr="No." }
          { 4   ;2   ;Field     ;
                      SourceExpr=Name }
          { 5   ;2   ;Field     ;
                      SourceExpr=Address }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls?.controls).toHaveLength(1); // One root

      const root = result.controls?.controls[0];
      expect(root?.id).toBe(1);
      expect(root?.controlType).toBe('Container');
      expect(root?.children).toHaveLength(1); // Group

      const group = root?.children?.[0];
      expect(group?.id).toBe(2);
      expect(group?.controlType).toBe('Group');
      expect(group?.children).toHaveLength(3); // Three fields
    });

    it('should parse CONTROLS with Part control and SubPageLink', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Part      ;
                      SubPageLink=Document Type=FIELD(Document Type),
                                  No.=FIELD(No.);
                      PagePartID=Page97 }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);

      const root = result.controls?.controls[0];
      expect(root?.children).toHaveLength(1);

      const part = root?.children?.[0];
      expect(part?.controlType).toBe('Part');

      const subPageLinkProp = part?.properties?.properties?.find((p: any) => p.name === 'SubPageLink');
      expect(subPageLinkProp).toBeDefined();
    });

    it('should parse CONTROLS with triggers', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Field     ;
                      SourceExpr="Balance (LCY)";
                      OnDrillDown=BEGIN
                                    DrillDownOnBalance;
                                  END;
                                   }
          { 3   ;1   ;Field     ;
                      SourceExpr="Credit Limit (LCY)";
                      OnValidate=BEGIN
                                   IF "Credit Limit (LCY)" < 0 THEN
                                     ERROR('Invalid credit limit');
                                 END;
                                  }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);

      const root = result.controls?.controls[0];
      expect(root?.children).toHaveLength(2);

      const field1 = root?.children?.[0];
      const onDrillDown = field1?.triggers?.find((t: any) => t.name === 'OnDrillDown');
      expect(onDrillDown?.body).toBeDefined();

      const field2 = root?.children?.[1];
      const onValidate = field2?.triggers?.find((t: any) => t.name === 'OnValidate');
      expect(onValidate?.body).toBeDefined();
    });
  });

  describe('Integration with full page structure', () => {
    it('should parse CONTROLS alongside PROPERTIES and ACTIONS', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
          PageType=Card;
          SourceTable=Table18;
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }
          { 2   ;1   ;Field     ;
                      SourceExpr="No." }
        }
        ACTIONS
        {
          { 1   ;0   ;ActionContainer }
          { 2   ;1   ;Action    ;
                      Name=MyAction }
        }
        CODE
        {
          VAR
            MyVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast.object).toBeDefined();

      // Verify all sections exist
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.properties).toBeDefined();
      expect(obj.controls).toBeDefined();
      expect(obj.actions).toBeDefined();
      expect(obj.code).toBeDefined();

      // Verify CONTROLS parsed correctly
      expect(obj.controls?.controls).toHaveLength(1);
      const root = obj.controls?.controls[0];
      expect(root?.children).toHaveLength(1);
    });
  });

  describe('Snapshot tests', () => {
    it('should match snapshot for complete CONTROLS section', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container ;
                      ContainerType=ContentArea }
          { 2   ;1   ;Group     ;
                      CaptionML=ENU=General;
                      GroupType=Group }
          { 3   ;2   ;Field     ;
                      SourceExpr="No.";
                      CaptionML=ENU=Number }
          { 4   ;2   ;Field     ;
                      SourceExpr=Name;
                      OnValidate=BEGIN
                                   TESTFIELD("No.");
                                 END;
                                  }
          { 5   ;1   ;Part      ;
                      SubPageLink=No.=FIELD(No.);
                      PagePartID=Page9080 }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls).toMatchSnapshot();
    });

    it('should match snapshot for nested hierarchy', () => {
      const code = `OBJECT Page 50000 "Test Page"
      {
        PROPERTIES
        {
        }
        CONTROLS
        {
          { 1   ;0   ;Container }
          { 2   ;1   ;Group     ;
                      CaptionML=ENU=Group 1 }
          { 3   ;2   ;Field     ;
                      SourceExpr=Field1 }
          { 4   ;2   ;Field     ;
                      SourceExpr=Field2 }
          { 5   ;1   ;Group     ;
                      CaptionML=ENU=Group 2 }
          { 6   ;2   ;Field     ;
                      SourceExpr=Field3 }
        }
      }`;

      const result = parseControls(code);

      expect(result.errors).toHaveLength(0);
      expect(result.controls).toMatchSnapshot();
    });
  });
});
