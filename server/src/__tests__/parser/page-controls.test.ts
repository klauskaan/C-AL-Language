import { parseCAL } from '../../parser/parser';

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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const page = result.ast.object;
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const container = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const control = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const group = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const container = result.ast.object?.controls?.controls[0];
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

      const result = parseCAL(source);
      const errors = result.errors.filter(e => e.code !== 'parse-placeholder-skipped');
      expect(errors.length).toBe(0);

      const controls = result.ast.object?.controls?.controls || [];
      expect(controls[0]?.controlType).toBe('Action');
      expect(controls[1]?.controlType).toBe('Action');
      expect(controls[2]?.controlType).toBe('ActionContainer');
      expect(controls[3]?.controlType).toBe('ActionContainer');
      expect(controls[4]?.controlType).toBe('ActionGroup');
      expect(controls[5]?.controlType).toBe('ActionGroup');
    });
  });
});
