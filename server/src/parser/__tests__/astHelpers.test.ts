/**
 * Tests for AST Helper Functions
 */

import { getActionName, ActionDeclaration, PropertySection, Property } from '../ast';

describe('getActionName', () => {
  it('should return the Name property value when present', () => {
    const action: ActionDeclaration = {
      type: 'ActionDeclaration',
      startToken: {} as any,
      endToken: {} as any,
      id: 1,
      indentLevel: 0,
      actionType: 'Action',
      properties: {
        type: 'PropertySection',
        startToken: {} as any,
        endToken: {} as any,
        properties: [
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'Name',
            value: 'DoSomething'
          } as Property,
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'Caption',
            value: 'Do Something'
          } as Property
        ]
      } as PropertySection,
      triggers: null,
      children: []
    };

    expect(getActionName(action)).toBe('DoSomething');
  });

  it('should return undefined when action has no properties', () => {
    const action: ActionDeclaration = {
      type: 'ActionDeclaration',
      startToken: {} as any,
      endToken: {} as any,
      id: 1,
      indentLevel: 0,
      actionType: 'ActionContainer',
      properties: null,
      triggers: null,
      children: []
    };

    expect(getActionName(action)).toBeUndefined();
  });

  it('should return undefined when action has properties but no Name property', () => {
    const action: ActionDeclaration = {
      type: 'ActionDeclaration',
      startToken: {} as any,
      endToken: {} as any,
      id: 1,
      indentLevel: 0,
      actionType: 'Action',
      properties: {
        type: 'PropertySection',
        startToken: {} as any,
        endToken: {} as any,
        properties: [
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'Caption',
            value: 'Some Action'
          } as Property,
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'Image',
            value: 'Process'
          } as Property
        ]
      } as PropertySection,
      triggers: null,
      children: []
    };

    expect(getActionName(action)).toBeUndefined();
  });
});
