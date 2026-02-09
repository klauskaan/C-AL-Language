/**
 * Tests: ActionList Property Parsing in Control Properties
 *
 * Bug: When ActionList=ACTIONS { ... } appears in CONTROL properties (not PROPERTIES section),
 * the parser incorrectly emits "Expected =" errors. This happens because the parseProperty()
 * logic has special handling for ActionList in PROPERTIES section, but when the same pattern
 * appears in control properties, the brace depth tracking gets confused.
 *
 * Root Cause:
 * - In PROPERTIES section: ActionList=ACTIONS { ... } works correctly
 * - In CONTROLS section (CueGroup): ActionList=ACTIONS { ... } triggers "Expected =" errors
 * - The parser's section-specific property parsing applies different logic
 *
 * Expected Behavior:
 * - ActionList should parse correctly in both PROPERTIES and CONTROLS sections
 * - Brace depth tracking should handle nested ACTIONS blocks in control properties
 * - No "Expected =" errors when ActionList contains properly nested structure
 */

import { parseCode } from './parserTestHelpers';
import { ObjectKind, ObjectDeclaration, ControlDeclaration, Property } from '../ast';

describe('Parser - ActionList in Control Properties (Brace Depth Bug)', () => {
  describe('PRIMARY: ActionList in CueGroup control', () => {
    it('should parse CueGroup control with ActionList=ACTIONS without errors', () => {
      // This is the PRIMARY test case from the approved plan
      // BEFORE fix: Should FAIL with "Expected =" errors
      // AFTER fix: Should PASS with no errors
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group; GroupType=CueGroup; ActionList=ACTIONS { { 1; ;Action } } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      // BEFORE fix: This assertion will FAIL due to "Expected =" errors
      expect(errors).toHaveLength(0);

      // Verify AST structure is correct
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      const page = ast.object as ObjectDeclaration;
      expect(page.controls).toBeDefined();
      expect(page.controls?.controls).toHaveLength(1);

      const control = page.controls?.controls[0] as ControlDeclaration;
      expect(control.properties?.properties).toContainEqual(
        expect.objectContaining({ name: 'ActionList' })
      );
    });

    it('should parse CueGroup with multiple ActionList items', () => {
      // Test case: Multiple actions inside ACTIONS block
      // BEFORE fix: Should FAIL with "Expected =" errors
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group; GroupType=CueGroup; ActionList=ACTIONS {
            { 1; ;Action; Name=Action1 }
            { 2; ;Action; Name=Action2 }
            { 3; ;Action; Name=Action3 }
          } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      // Should have no errors after fix
      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      // Verify ActionList property exists
      const actionListProp = control.properties?.properties?.find(
        p => p.name === 'ActionList'
      );
      expect(actionListProp).toBeDefined();
      expect(actionListProp?.value).toContain('ACTIONS');
    });

    it('should parse ActionList followed by other properties', () => {
      // Test case: ActionList=...; NextProperty=Value
      // BEFORE fix: Should FAIL
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group;
                  GroupType=CueGroup;
                  ActionList=ACTIONS { { 1; ;Action } };
                  CaptionML=ENU=My Group }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      // Both properties should be parsed correctly
      const actionListProp = control.properties?.properties?.find(p => p.name === 'ActionList');
      const captionProp = control.properties?.properties?.find(p => p.name === 'CaptionML');

      expect(actionListProp).toBeDefined();
      expect(captionProp).toBeDefined();
    });

    it('should parse ActionList as last property (no trailing semicolon)', () => {
      // Test case: ActionList as last property before control closing brace
      // BEFORE fix: Should FAIL
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group;
                  GroupType=CueGroup;
                  CaptionML=ENU=Actions;
                  ActionList=ACTIONS { { 1; ;Action } } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      const actionListProp = control.properties?.properties?.find(p => p.name === 'ActionList');
      expect(actionListProp).toBeDefined();
    });

    it('should parse ActionList with deeply nested braces', () => {
      // Test case: Nested braces inside ActionList
      // BEFORE fix: Should FAIL
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group; GroupType=CueGroup; ActionList=ACTIONS {
            { 1; ;ActionGroup; CaptionML=[ENU=Group] }
            { 2;1;Action; Name=NestedAction }
          } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      const actionListProp = control.properties?.properties?.find(p => p.name === 'ActionList');
      expect(actionListProp).toBeDefined();
      expect(actionListProp?.value).toContain('ActionGroup');
    });
  });

  describe('EDGE CASE: Empty ActionList', () => {
    it('should parse empty ActionList=ACTIONS { }', () => {
      // Test case from adversarial-reviewer
      // BEFORE fix: May FAIL with errors
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group; GroupType=CueGroup; ActionList=ACTIONS { } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      const actionListProp = control.properties?.properties?.find(p => p.name === 'ActionList');
      expect(actionListProp).toBeDefined();
      expect(actionListProp?.value).toBe('ACTIONS { }');
    });
  });

  describe('EDGE CASE: ActionList followed by section keyword', () => {
    it('should parse ActionList correctly when ACTIONS section follows CONTROLS', () => {
      // Test case: Ensure ActionList in control doesn't interfere with ACTIONS section
      // BEFORE fix: May cause section boundary confusion
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group; GroupType=CueGroup; ActionList=ACTIONS { { 1; ;Action } } }
        }
        ACTIONS {
          { 1; ;ActionContainer }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;

      // Verify both CONTROLS and ACTIONS sections are parsed
      expect(page.controls).toBeDefined();
      expect(page.actions).toBeDefined();

      // Verify control has ActionList property
      const control = page.controls?.controls[0] as ControlDeclaration;
      const actionListProp = control.properties?.properties?.find(p => p.name === 'ActionList');
      expect(actionListProp).toBeDefined();
    });
  });

  describe('EDGE CASE: Malformed ActionList=} in control', () => {
    it('should handle malformed ActionList=} without crashing parser', () => {
      // Test case from adversarial-reviewer: Malformed in control properties
      // This is different from Issue #75 which was about PROPERTIES section
      // BEFORE fix: Should report appropriate error but not crash
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group; GroupType=CueGroup; ActionList=} }
        }
      }`;
      const { ast, errors } = parseCode(code);

      // Parser should not crash
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      // Should have some error about malformed property
      expect(errors.length).toBeGreaterThan(0);

      // Should NOT cause section boundary errors (like unexpected EOF)
      const sectionErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(sectionErrors.length).toBe(0);
    });
  });

  describe('COMPARISON: ActionList in PROPERTIES vs CONTROLS', () => {
    it('should parse ActionList correctly in PROPERTIES section (baseline)', () => {
      // This should already work (baseline for comparison)
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          ActionList=ACTIONS {
            { 1; ;ActionContainer }
            { 2;1;Action; Name=MyAction }
          }
        }
        CONTROLS {
          { 1 ;0 ;Container }
        }
      }`;
      const { ast, errors } = parseCode(code);

      // This should pass even before the fix
      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const actionListProp = page.properties?.properties?.find((p: Property) => p.name === 'ActionList');
      expect(actionListProp).toBeDefined();
      expect(actionListProp?.value).toContain('ACTIONS');
    });

    it('should parse ActionList in both PROPERTIES and CONTROLS (full test)', () => {
      // Combined test: ActionList in both sections
      // BEFORE fix: CONTROLS ActionList should FAIL
      // AFTER fix: Both should work
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          ActionList=ACTIONS {
            { 1; ;ActionContainer }
          }
        }
        CONTROLS {
          { 1 ;0 ;Container }
          { 2 ;1 ;Group; GroupType=CueGroup; ActionList=ACTIONS {
            { 1; ;Action; Name=CueAction }
          } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;

      // Verify PROPERTIES ActionList
      const propsActionList = page.properties?.properties?.find((p: Property) => p.name === 'ActionList');
      expect(propsActionList).toBeDefined();

      // Verify CONTROLS ActionList
      const cueGroup = page.controls?.controls[0].children?.[0] as ControlDeclaration;
      const controlsActionList = cueGroup.properties?.properties?.find((p: Property) => p.name === 'ActionList');
      expect(controlsActionList).toBeDefined();
    });
  });

  describe('REAL-WORLD: Complex CueGroup scenario', () => {
    it('should parse real-world CueGroup with ActionList and multiple properties', () => {
      // Realistic scenario based on NAV CueGroup patterns
      // BEFORE fix: Should FAIL with multiple "Expected =" errors
      const code = `OBJECT Page 50000 "Sales Cue" {
        PROPERTIES {
          PageType=CardPart;
          SourceTable=Table9050;
        }
        CONTROLS {
          { 1000;0;Container;
                  ContainerType=ContentArea }
          { 1001;1;Group;
                  CaptionML=[ENU=Sales Orders];
                  GroupType=CueGroup;
                  ActionList=ACTIONS {
                    { 1;  ;Action;
                          Name=ViewSalesOrders;
                          CaptionML=[ENU=View Sales Orders];
                          Image=Document }
                    { 2;  ;Action;
                          Name=NewSalesOrder;
                          CaptionML=[ENU=New Sales Order];
                          Image=New }
                  } }
          { 1002;2;Field;
                  SourceExpr="Sales Orders - Open";
                  DrillDownPageID=Page9305 }
        }
      }`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      expect(page.controls).toBeDefined();

      // Find the CueGroup control (second child of Container)
      const container = page.controls?.controls[0] as ControlDeclaration;
      const cueGroup = container.children?.[0] as ControlDeclaration;

      // Verify CueGroup properties
      expect(cueGroup.properties?.properties).toContainEqual(
        expect.objectContaining({ name: 'GroupType' })
      );
      expect(cueGroup.properties?.properties).toContainEqual(
        expect.objectContaining({ name: 'ActionList' })
      );

      const actionListProp = cueGroup.properties?.properties?.find(p => p.name === 'ActionList');
      expect(actionListProp?.value).toContain('ACTIONS');
      expect(actionListProp?.value).toContain('ViewSalesOrders');
      expect(actionListProp?.value).toContain('NewSalesOrder');
    });
  });

  describe('SNAPSHOT: ActionList parsing results', () => {
    it('should match snapshot for CueGroup with ActionList', () => {
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
        }
        CONTROLS {
          { 1 ;0 ;Group;
                  GroupType=CueGroup;
                  CaptionML=ENU=Actions;
                  ActionList=ACTIONS {
                    { 1; ;Action; Name=Action1; CaptionML=ENU=First }
                    { 2; ;Action; Name=Action2; CaptionML=ENU=Second }
                  } }
        }
      }`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const page = ast.object as ObjectDeclaration;
      const control = page.controls?.controls[0] as ControlDeclaration;

      // Snapshot the control's properties to verify structure
      expect(control.properties).toMatchSnapshot();
    });
  });
});
