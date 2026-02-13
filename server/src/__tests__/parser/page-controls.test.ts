import { parseCode } from '../../parser/parser';

describe('Page CONTROLS - Action control types', () => {
  describe('Action control type', () => {
    it('should parse Action control type correctly', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Action;
                    Name=TestAction;
                    CaptionML=ENU=Test Action }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      expect(result.ast).not.toBeNull();
      const page = result.ast!.object;
      expect(page).toBeDefined();
      expect(page?.controls).toBeDefined();
      expect(page?.controls?.controls.length).toBe(1);

      const control = page?.controls?.controls[0];
      expect(control?.controlType).toBe('Action');
      expect(control?.rawControlType).toBeUndefined();
    });

    it('should parse Action control with properties', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Action;
                    Name=MyAction;
                    CaptionML=ENU=My Action;
                    Image=Action }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast!.object?.controls?.controls[0];
      expect(control?.controlType).toBe('Action');
      expect(control?.properties?.properties.length).toBeGreaterThan(0);
    });

    it('should parse Action control with OnAction trigger', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Action;
                    Name=TestAction;
                    OnAction=BEGIN
                               MESSAGE('Action triggered');
                             END;
                     }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast!.object?.controls?.controls[0];
      expect(control?.controlType).toBe('Action');
      expect(control?.triggers).toBeDefined();
      expect(control?.triggers?.length).toBeGreaterThan(0);
    });
  });

  describe('ActionContainer control type', () => {
    it('should parse ActionContainer control type correctly', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionContainer }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast!.object?.controls?.controls[0];
      expect(control?.controlType).toBe('ActionContainer');
      expect(control?.rawControlType).toBeUndefined();
    });

    it('should parse ActionContainer with ActionContainerType property', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionContainer;
                    ActionContainerType=ActionItems }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast!.object?.controls?.controls[0];
      expect(control?.controlType).toBe('ActionContainer');
      expect(control?.properties?.properties.length).toBeGreaterThan(0);
    });

    it('should parse ActionContainer as parent with Action children', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionContainer }
            { 2;1;Action;
                    Name=ChildAction }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const container = result.ast!.object?.controls?.controls[0];
      expect(container?.controlType).toBe('ActionContainer');
      expect(container?.children.length).toBe(1);
      expect(container?.children[0]?.controlType).toBe('Action');
    });
  });

  describe('ActionGroup control type', () => {
    it('should parse ActionGroup control type correctly', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionGroup }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast!.object?.controls?.controls[0];
      expect(control?.controlType).toBe('ActionGroup');
      expect(control?.rawControlType).toBeUndefined();
    });

    it('should parse ActionGroup with CaptionML property', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionGroup;
                    CaptionML=ENU=My Actions }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast!.object?.controls?.controls[0];
      expect(control?.controlType).toBe('ActionGroup');
      expect(control?.properties?.properties.length).toBeGreaterThan(0);
    });

    it('should parse ActionGroup as parent with Action children', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionGroup }
            { 2;1;Action;
                    Name=ChildAction }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const group = result.ast!.object?.controls?.controls[0];
      expect(group?.controlType).toBe('ActionGroup');
      expect(group?.children.length).toBe(1);
      expect(group?.children[0]?.controlType).toBe('Action');
    });
  });

  describe('Mixed action control types', () => {
    it('should parse complex hierarchy with ActionContainer > ActionGroup > Action', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;ActionContainer }
            { 2;1;ActionGroup;
                    CaptionML=ENU=Group 1 }
            { 3;2;Action;
                    Name=Action1 }
            { 4;2;Action;
                    Name=Action2 }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const container = result.ast!.object?.controls?.controls[0];
      expect(container?.controlType).toBe('ActionContainer');
      expect(container?.children.length).toBe(1);

      const group = container?.children[0];
      expect(group?.controlType).toBe('ActionGroup');
      expect(group?.children.length).toBe(2);

      expect(group?.children[0]?.controlType).toBe('Action');
      expect(group?.children[1]?.controlType).toBe('Action');
    });
  });

  describe('Case sensitivity', () => {
    it('should parse action control types case-insensitively', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;action }
            { 2;0;ACTION }
            { 3;0;actioncontainer }
            { 4;0;ACTIONCONTAINER }
            { 5;0;actiongroup }
            { 6;0;ACTIONGROUP }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const controls = result.ast!.object?.controls?.controls || [];
      expect(controls[0]?.controlType).toBe('Action');
      expect(controls[1]?.controlType).toBe('Action');
      expect(controls[2]?.controlType).toBe('ActionContainer');
      expect(controls[3]?.controlType).toBe('ActionContainer');
      expect(controls[4]?.controlType).toBe('ActionGroup');
      expect(controls[5]?.controlType).toBe('ActionGroup');
    });
  });

  describe('Deep nesting (5+ levels)', () => {
    it('should parse 5-level nesting: Container > Group > Group > Group > Field', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Container }
            { 2;1;Group }
            { 3;2;Group }
            { 4;3;Group }
            { 5;4;Field;
                    SourceExpr="Field1" }
            { 6;4;Field;
                    SourceExpr="Field2" }
            { 7;3;Group }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      expect(result.ast).not.toBeNull();
      const page = result.ast!.object;
      expect(page).toBeDefined();
      expect(page?.controls).toBeDefined();

      // Verify root control (Container at level 0)
      const controls = page?.controls?.controls || [];
      expect(controls.length).toBe(1);
      const level0 = controls[0];
      expect(level0?.id).toBe(1);
      expect(level0?.controlType).toBe('Container');
      expect(level0?.indentLevel).toBe(0);

      // Verify level 1 (Group)
      expect(level0?.children.length).toBe(1);
      const level1 = level0?.children[0];
      expect(level1?.id).toBe(2);
      expect(level1?.controlType).toBe('Group');
      expect(level1?.indentLevel).toBe(1);

      // Verify level 2 (Group)
      expect(level1?.children.length).toBe(1);
      const level2 = level1?.children[0];
      expect(level2?.id).toBe(3);
      expect(level2?.controlType).toBe('Group');
      expect(level2?.indentLevel).toBe(2);

      // Verify level 3 (two Groups as siblings)
      expect(level2?.children.length).toBe(2);
      const level3a = level2?.children[0];
      expect(level3a?.id).toBe(4);
      expect(level3a?.controlType).toBe('Group');
      expect(level3a?.indentLevel).toBe(3);

      const level3b = level2?.children[1];
      expect(level3b?.id).toBe(7);
      expect(level3b?.controlType).toBe('Group');
      expect(level3b?.indentLevel).toBe(3);

      // Verify level 4 (two Fields as siblings)
      expect(level3a?.children.length).toBe(2);
      const level4a = level3a?.children[0];
      expect(level4a?.id).toBe(5);
      expect(level4a?.controlType).toBe('Field');
      expect(level4a?.indentLevel).toBe(4);

      const level4b = level3a?.children[1];
      expect(level4b?.id).toBe(6);
      expect(level4b?.controlType).toBe('Field');
      expect(level4b?.indentLevel).toBe(4);
    });

    it('should handle multi-level stack pop-back from depth 5+ (0 > 1 > 2 > 3 > 4 > 5 > 1)', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Container }
            { 2;1;Group;
                    CaptionML=ENU=Level 1 }
            { 3;2;Group;
                    CaptionML=ENU=Level 2 }
            { 4;3;Group;
                    CaptionML=ENU=Level 3 }
            { 5;4;Group;
                    CaptionML=ENU=Level 4 }
            { 6;5;Field;
                    SourceExpr="DeepField" }
            { 7;1;Group;
                    CaptionML=ENU=Back to Level 1 }
            { 8;2;Field;
                    SourceExpr="Field2" }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      expect(result.ast).not.toBeNull();
      const page = result.ast!.object;
      expect(page).toBeDefined();
      expect(page?.controls).toBeDefined();

      const controls = page?.controls?.controls || [];
      expect(controls.length).toBe(1);

      // Verify root (Container at level 0)
      const container = controls[0];
      expect(container?.id).toBe(1);
      expect(container?.controlType).toBe('Container');
      expect(container?.indentLevel).toBe(0);
      expect(container?.children.length).toBe(2); // Two level-1 Groups

      // Verify first level-1 Group (deep nesting path)
      const group1a = container?.children[0];
      expect(group1a?.id).toBe(2);
      expect(group1a?.controlType).toBe('Group');
      expect(group1a?.indentLevel).toBe(1);

      // Verify level 2
      expect(group1a?.children.length).toBe(1);
      const group2 = group1a?.children[0];
      expect(group2?.id).toBe(3);
      expect(group2?.indentLevel).toBe(2);

      // Verify level 3
      expect(group2?.children.length).toBe(1);
      const group3 = group2?.children[0];
      expect(group3?.id).toBe(4);
      expect(group3?.indentLevel).toBe(3);

      // Verify level 4
      expect(group3?.children.length).toBe(1);
      const group4 = group3?.children[0];
      expect(group4?.id).toBe(5);
      expect(group4?.indentLevel).toBe(4);

      // Verify level 5 (deepest field)
      expect(group4?.children.length).toBe(1);
      const field5 = group4?.children[0];
      expect(field5?.id).toBe(6);
      expect(field5?.controlType).toBe('Field');
      expect(field5?.indentLevel).toBe(5);
      expect(field5?.children.length).toBe(0);

      // Verify second level-1 Group (after multi-level pop from 5 to 1)
      const group1b = container?.children[1];
      expect(group1b?.id).toBe(7);
      expect(group1b?.controlType).toBe('Group');
      expect(group1b?.indentLevel).toBe(1);

      // Verify level-2 Field under second Group
      expect(group1b?.children.length).toBe(1);
      const field2 = group1b?.children[0];
      expect(field2?.id).toBe(8);
      expect(field2?.controlType).toBe('Field');
      expect(field2?.indentLevel).toBe(2);
    });

    it('should parse mixed indent patterns with non-sequential indents (0 > 1 > 1 > 2 > 2)', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Container }
            { 2;1;Group;
                    CaptionML=ENU=Group 1 }
            { 3;1;Group;
                    CaptionML=ENU=Group 2 }
            { 4;2;Field;
                    SourceExpr="Field1" }
            { 5;2;Field;
                    SourceExpr="Field2" }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const controls = result.ast!.object?.controls?.controls || [];
      expect(controls.length).toBe(1);

      // Root container
      const root = controls[0];
      expect(root?.id).toBe(1);
      expect(root?.controlType).toBe('Container');

      // Two sibling groups at level 1
      expect(root?.children.length).toBe(2);
      const group1 = root?.children[0];
      const group2 = root?.children[1];

      expect(group1?.id).toBe(2);
      expect(group1?.indentLevel).toBe(1);
      expect(group1?.controlType).toBe('Group');

      expect(group2?.id).toBe(3);
      expect(group2?.indentLevel).toBe(1);
      expect(group2?.controlType).toBe('Group');

      // Two sibling fields at level 2 under group2
      expect(group2?.children.length).toBe(2);
      const field1 = group2?.children[0];
      const field2 = group2?.children[1];

      expect(field1?.id).toBe(4);
      expect(field1?.indentLevel).toBe(2);
      expect(field1?.controlType).toBe('Field');

      expect(field2?.id).toBe(5);
      expect(field2?.indentLevel).toBe(2);
      expect(field2?.controlType).toBe('Field');

      // Group1 should have no children
      expect(group1?.children.length).toBe(0);
    });

    it('should parse 6+ level nesting: Container > Group > Group > Group > Group > Field > Part', () => {
      const source = `
        OBJECT Page 50000 Test
        {
          OBJECT-PROPERTIES
          {
            Date=01-01-24;
            Time=12:00:00;
          }
          PROPERTIES
          {
          }
          CONTROLS
          {
            { 1;0;Container }
            { 2;1;Group }
            { 3;2;Group }
            { 4;3;Group }
            { 5;4;Group }
            { 6;5;Field;
                    SourceExpr="DeepField" }
            { 7;6;Part;
                    PagePartID=Page50001 }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `;

      const result = parseCode(source);
      const errors = result.errors.filter((e: any) => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      // Verify all 7 controls are present in the hierarchy
      function countControls(control: any): number {
        let count = 1;
        if (control.children) {
          for (const child of control.children) {
            count += countControls(child);
          }
        }
        return count;
      }

      const controls = result.ast!.object?.controls?.controls || [];
      expect(controls.length).toBe(1);
      const controlCount = countControls(controls[0]);
      expect(controlCount).toBe(7);

      // Navigate through the hierarchy
      const level0 = controls[0];
      expect(level0?.id).toBe(1);
      expect(level0?.controlType).toBe('Container');
      expect(level0?.indentLevel).toBe(0);

      const level1 = level0?.children[0];
      expect(level1?.id).toBe(2);
      expect(level1?.controlType).toBe('Group');
      expect(level1?.indentLevel).toBe(1);

      const level2 = level1?.children[0];
      expect(level2?.id).toBe(3);
      expect(level2?.controlType).toBe('Group');
      expect(level2?.indentLevel).toBe(2);

      const level3 = level2?.children[0];
      expect(level3?.id).toBe(4);
      expect(level3?.controlType).toBe('Group');
      expect(level3?.indentLevel).toBe(3);

      const level4 = level3?.children[0];
      expect(level4?.id).toBe(5);
      expect(level4?.controlType).toBe('Group');
      expect(level4?.indentLevel).toBe(4);

      const level5 = level4?.children[0];
      expect(level5?.id).toBe(6);
      expect(level5?.controlType).toBe('Field');
      expect(level5?.indentLevel).toBe(5);

      const level6 = level5?.children[0];
      expect(level6?.id).toBe(7);
      expect(level6?.controlType).toBe('Part');
      expect(level6?.indentLevel).toBe(6);

      // Verify no hard depth limit - level6 should have no children
      expect(level6?.children.length).toBe(0);
    });
  });
});
