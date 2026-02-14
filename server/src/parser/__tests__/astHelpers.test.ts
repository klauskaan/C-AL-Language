/**
 * Tests for AST Helper Functions
 */

import { getActionName, findProperty, getControlName, ActionDeclaration, ControlDeclaration, PropertySection, Property } from '../ast';

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

describe('findProperty', () => {
  it('should return the Property object when property exists', () => {
    const node = {
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
            value: 'Customer Name'
          } as Property,
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'SourceExpr',
            value: 'Name'
          } as Property
        ]
      } as PropertySection
    };

    const result = findProperty(node, 'Caption');
    expect(result).toBeDefined();
    expect(result!.name).toBe('Caption');
    expect(result!.value).toBe('Customer Name');
  });

  it('should return undefined when no properties section', () => {
    const node = {
      properties: null
    };

    expect(findProperty(node, 'Caption')).toBeUndefined();
  });

  it('should return undefined when property does not exist', () => {
    const node = {
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
            value: 'Test'
          } as Property
        ]
      } as PropertySection
    };

    expect(findProperty(node, 'NonExistent')).toBeUndefined();
  });

  it('should be case-insensitive when searching for property name', () => {
    const node = {
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
            value: 'TestName'
          } as Property
        ]
      } as PropertySection
    };

    const resultLower = findProperty(node, 'name');
    expect(resultLower).toBeDefined();
    expect(resultLower!.name).toBe('Name');
    expect(resultLower!.value).toBe('TestName');

    const resultUpper = findProperty(node, 'NAME');
    expect(resultUpper).toBeDefined();
    expect(resultUpper!.name).toBe('Name');
    expect(resultUpper!.value).toBe('TestName');
  });

  it('should return full Property object with all fields', () => {
    const startToken = { type: 'IDENTIFIER', value: 'Caption', line: 1, column: 1 } as any;
    const endToken = { type: 'SEMICOLON', value: ';', line: 1, column: 20 } as any;

    const node = {
      properties: {
        type: 'PropertySection',
        startToken: {} as any,
        endToken: {} as any,
        properties: [
          {
            type: 'Property',
            startToken: startToken,
            endToken: endToken,
            name: 'Caption',
            value: 'Test Caption'
          } as Property
        ]
      } as PropertySection
    };

    const result = findProperty(node, 'Caption');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('type', 'Property');
    expect(result).toHaveProperty('startToken');
    expect(result).toHaveProperty('endToken');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('value');
    expect(result!.startToken).toBe(startToken);
    expect(result!.endToken).toBe(endToken);
  });
});

describe('getControlName', () => {
  it('should return the Name property value when present', () => {
    const control: ControlDeclaration = {
      type: 'ControlDeclaration',
      startToken: {} as any,
      endToken: {} as any,
      id: 1,
      indentLevel: 0,
      controlType: 'Field',
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
            value: 'CustomerName'
          } as Property,
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'Caption',
            value: 'Customer Name'
          } as Property
        ]
      } as PropertySection,
      triggers: null,
      children: []
    };

    expect(getControlName(control)).toBe('CustomerName');
  });

  it('should return undefined when control has no properties', () => {
    const control: ControlDeclaration = {
      type: 'ControlDeclaration',
      startToken: {} as any,
      endToken: {} as any,
      id: 1,
      indentLevel: 0,
      controlType: 'Container',
      properties: null,
      triggers: null,
      children: []
    };

    expect(getControlName(control)).toBeUndefined();
  });

  it('should return undefined when control has properties but no Name property', () => {
    const control: ControlDeclaration = {
      type: 'ControlDeclaration',
      startToken: {} as any,
      endToken: {} as any,
      id: 1,
      indentLevel: 0,
      controlType: 'Group',
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
            value: 'General'
          } as Property,
          {
            type: 'Property',
            startToken: {} as any,
            endToken: {} as any,
            name: 'GroupType',
            value: 'Group'
          } as Property
        ]
      } as PropertySection,
      triggers: null,
      children: []
    };

    expect(getControlName(control)).toBeUndefined();
  });
});
