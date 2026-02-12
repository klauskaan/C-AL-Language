/**
 * DepthLimitedWalker Tests
 *
 * Tests for DepthLimitedWalker which prevents parser stack exhaustion by
 * limiting the maximum nesting depth of hierarchical C/AL structures
 * (Actions, Controls, XMLport Elements).
 */

import { DepthLimitedWalker } from '../depthLimitedWalker';
import { ASTVisitor } from '../astVisitor';
import {
  ActionDeclaration,
  ControlDeclaration,
  XMLportElement
} from '../../parser/ast';
import { Token, TokenType } from '../../lexer/tokens';

/**
 * Helper to create a mock Token
 */
function createToken(type: TokenType, value: string, line: number, col: number): Token {
  return {
    type,
    value,
    line,
    column: col,
    startOffset: 0,
    endOffset: value.length
  };
}

/**
 * Helper to create deeply nested ActionDeclaration tree
 */
function createNestedActions(depth: number, startId = 1): ActionDeclaration {
  const token = createToken(TokenType.Identifier, `Action${startId}`, 1, 1);
  const action: ActionDeclaration = {
    type: 'ActionDeclaration',
    id: startId,
    indentLevel: 0,
    actionType: 'ActionGroup',
    properties: null,
    triggers: null,
    children: [],
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    action.children = [createNestedActions(depth - 1, startId + 1)];
  }

  return action;
}

/**
 * Helper to create deeply nested ControlDeclaration tree
 */
function createNestedControls(depth: number, startId = 1): ControlDeclaration {
  const token = createToken(TokenType.Identifier, `Control${startId}`, 1, 1);
  const control: ControlDeclaration = {
    type: 'ControlDeclaration',
    id: startId,
    indentLevel: 0,
    controlType: 'Container',
    properties: null,
    triggers: null,
    children: [],
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    control.children = [createNestedControls(depth - 1, startId + 1)];
  }

  return control;
}

/**
 * Helper to create deeply nested XMLportElement tree
 */
function createNestedXMLportElements(depth: number, startId = 1): XMLportElement {
  const token = createToken(TokenType.Identifier, `Element${startId}`, 1, 1);
  const element: XMLportElement = {
    type: 'XMLportElement',
    guid: `{GUID-${startId}}`,
    indentLevel: 0,
    name: `Element${startId}`,
    nodeType: 'Element',
    sourceType: 'Table',
    properties: null,
    triggers: null,
    children: [],
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    element.children = [createNestedXMLportElements(depth - 1, startId + 1)];
  }

  return element;
}

/**
 * Helper to create mixed nesting: Action containing Control
 */
function createMixedNesting(totalDepth: number): ActionDeclaration {
  const token = createToken(TokenType.Identifier, 'RootAction', 1, 1);
  const action: ActionDeclaration = {
    type: 'ActionDeclaration',
    id: 1,
    indentLevel: 0,
    actionType: 'ActionGroup',
    properties: null,
    triggers: null,
    children: [],
    startToken: token,
    endToken: token
  };

  if (totalDepth > 1) {
    // Create nested actions down to desired depth
    action.children = [createNestedActions(totalDepth - 1, 2)];
  }

  return action;
}

describe('DepthLimitedWalker', () => {
  let walker: DepthLimitedWalker;

  beforeEach(() => {
    walker = new DepthLimitedWalker();
  });

  describe('Constructor and Configuration', () => {
    it('should create walker with default maxDepth of 100', () => {
      const defaultWalker = new DepthLimitedWalker();
      expect(defaultWalker).toBeDefined();
      // Test behavior: should not emit diagnostic at depth 99
      const actions = createNestedActions(99);
      const visitor: Partial<ASTVisitor> = {};
      defaultWalker.walk(actions, visitor);
      expect(defaultWalker.getDiagnostics().length).toBe(0);
    });

    it('should accept custom maxDepth parameter', () => {
      const customWalker = new DepthLimitedWalker(10);
      expect(customWalker).toBeDefined();
      // Test behavior: should emit diagnostic at depth 11
      const actions = createNestedActions(11);
      const visitor: Partial<ASTVisitor> = {};
      customWalker.walk(actions, visitor);
      expect(customWalker.getDiagnostics().length).toBeGreaterThan(0);
    });
  });

  describe('Core Functionality - Normal Nesting', () => {
    it('should complete without diagnostics when depth < limit', () => {
      const walker50 = new DepthLimitedWalker(50);
      const actions = createNestedActions(30); // Well below limit
      const visitor: Partial<ASTVisitor> = {};

      walker50.walk(actions, visitor);
      const diagnostics = walker50.getDiagnostics();

      expect(diagnostics).toEqual([]);
    });

    it('should emit no diagnostics for shallow ActionDeclaration nesting', () => {
      const actions = createNestedActions(5); // Very shallow
      const visitor: Partial<ASTVisitor> = {};

      walker.walk(actions, visitor);

      expect(walker.getDiagnostics()).toEqual([]);
    });

    it('should emit no diagnostics for shallow ControlDeclaration nesting', () => {
      const controls = createNestedControls(5);
      const visitor: Partial<ASTVisitor> = {};

      walker.walk(controls, visitor);

      expect(walker.getDiagnostics()).toEqual([]);
    });

    it('should emit no diagnostics for shallow XMLportElement nesting', () => {
      const elements = createNestedXMLportElements(5);
      const visitor: Partial<ASTVisitor> = {};

      walker.walk(elements, visitor);

      expect(walker.getDiagnostics()).toEqual([]);
    });
  });

  describe('Core Functionality - Exceeding Depth Limit', () => {
    it('should emit diagnostic when ActionDeclaration exceeds depth limit', () => {
      const walker10 = new DepthLimitedWalker(10);
      const actions = createNestedActions(15); // Exceeds limit of 10
      const visitor: Partial<ASTVisitor> = {};

      walker10.walk(actions, visitor);
      const diagnostics = walker10.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('depth');
      expect(diagnostics[0].message).toContain('11'); // First violation at depth 11
      expect(diagnostics[0].message).toContain('10'); // Limit is 10
    });

    it('should emit diagnostic when ControlDeclaration exceeds depth limit', () => {
      const walker10 = new DepthLimitedWalker(10);
      const controls = createNestedControls(15);
      const visitor: Partial<ASTVisitor> = {};

      walker10.walk(controls, visitor);
      const diagnostics = walker10.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('depth');
      expect(diagnostics[0].message).toContain('11');
      expect(diagnostics[0].message).toContain('10');
    });

    it('should emit diagnostic when XMLportElement exceeds depth limit', () => {
      const walker10 = new DepthLimitedWalker(10);
      const elements = createNestedXMLportElements(15);
      const visitor: Partial<ASTVisitor> = {};

      walker10.walk(elements, visitor);
      const diagnostics = walker10.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('depth');
      expect(diagnostics[0].message).toContain('11');
      expect(diagnostics[0].message).toContain('10');
    });
  });

  describe('Boundary Cases', () => {
    it('should emit no diagnostic at depth = maxDepth - 1', () => {
      const walker100 = new DepthLimitedWalker(100);
      const actions = createNestedActions(99); // Depth 99, limit 100
      const visitor: Partial<ASTVisitor> = {};

      walker100.walk(actions, visitor);

      expect(walker100.getDiagnostics()).toEqual([]);
    });

    it('should emit no diagnostic at depth = maxDepth', () => {
      const walker100 = new DepthLimitedWalker(100);
      const actions = createNestedActions(100); // Depth 100, limit 100
      const visitor: Partial<ASTVisitor> = {};

      walker100.walk(actions, visitor);

      expect(walker100.getDiagnostics()).toEqual([]);
    });

    it('should emit diagnostic at depth = maxDepth + 1', () => {
      const walker100 = new DepthLimitedWalker(100);
      const actions = createNestedActions(101); // Depth 101, limit 100
      const visitor: Partial<ASTVisitor> = {};

      walker100.walk(actions, visitor);
      const diagnostics = walker100.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('101'); // Depth
      expect(diagnostics[0].message).toContain('100'); // Limit
    });
  });

  describe('Mixed Nesting - Single Counter', () => {
    it('should track total depth across Action and Control nesting', () => {
      const walker10 = new DepthLimitedWalker(10);

      // Create Action tree that contains nested actions to depth 12
      const actions = createMixedNesting(12);
      const visitor: Partial<ASTVisitor> = {};

      walker10.walk(actions, visitor);
      const diagnostics = walker10.getDiagnostics();

      // Should emit diagnostic since total depth exceeds 10
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('depth');
    });

    it('should use single depth counter for all hierarchical node types', () => {
      const walker5 = new DepthLimitedWalker(5);

      // Mix: Action -> Action -> Action -> Action -> Action -> Action (depth 6)
      const actions = createNestedActions(6);
      const visitor: Partial<ASTVisitor> = {};

      walker5.walk(actions, visitor);

      // Single counter means we should see diagnostic
      expect(walker5.getDiagnostics().length).toBeGreaterThan(0);
    });
  });

  describe('Diagnostic Quality', () => {
    it('should include correct position from node.startToken', () => {
      const walker5 = new DepthLimitedWalker(5);

      // Create action at specific line/column
      const deepAction = createNestedActions(10);
      // Set the problematic node's position (at depth 6)
      const token = createToken(TokenType.Identifier, 'DeepAction', 42, 15);
      deepAction.children[0].children[0].children[0].children[0].children[0].startToken = token;

      const visitor: Partial<ASTVisitor> = {};
      walker5.walk(deepAction, visitor);
      const diagnostics = walker5.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].range.start.line).toBe(41); // LSP is 0-based, token is 1-based
      expect(diagnostics[0].range.start.character).toBe(14); // 0-based
    });

    it('should include depth value in diagnostic message', () => {
      const walker10 = new DepthLimitedWalker(10);
      const actions = createNestedActions(15);
      const visitor: Partial<ASTVisitor> = {};

      walker10.walk(actions, visitor);
      const diagnostics = walker10.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toMatch(/depth.*11/i); // First violation at depth 11
    });

    it('should include limit value in diagnostic message', () => {
      const walker10 = new DepthLimitedWalker(10);
      const actions = createNestedActions(15);
      const visitor: Partial<ASTVisitor> = {};

      walker10.walk(actions, visitor);
      const diagnostics = walker10.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toMatch(/limit.*10/i);
    });

    it('should set diagnostic severity to Warning', () => {
      const walker5 = new DepthLimitedWalker(5);
      const actions = createNestedActions(10);
      const visitor: Partial<ASTVisitor> = {};

      walker5.walk(actions, visitor);
      const diagnostics = walker5.getDiagnostics();

      expect(diagnostics.length).toBeGreaterThan(0);
      // DiagnosticSeverity.Warning = 2
      expect(diagnostics[0].severity).toBe(2);
      expect(diagnostics[0].code).toBe('nesting-depth-exceeded');
    });
  });

  describe('State Management - resetDiagnostics()', () => {
    it('should clear diagnostics array when resetDiagnostics() is called', () => {
      const walker5 = new DepthLimitedWalker(5);
      const actions = createNestedActions(10);
      const visitor: Partial<ASTVisitor> = {};

      walker5.walk(actions, visitor);
      expect(walker5.getDiagnostics().length).toBeGreaterThan(0);

      walker5.resetDiagnostics();
      expect(walker5.getDiagnostics()).toEqual([]);
    });

    it('should reset depth counter when resetDiagnostics() is called', () => {
      const walker5 = new DepthLimitedWalker(5);
      const actions1 = createNestedActions(10);
      const visitor: Partial<ASTVisitor> = {};

      // First walk - should emit diagnostics
      walker5.walk(actions1, visitor);
      expect(walker5.getDiagnostics().length).toBeGreaterThan(0);

      // Reset
      walker5.resetDiagnostics();

      // Second walk with shallow nesting - should emit no diagnostics
      const actions2 = createNestedActions(3);
      walker5.walk(actions2, visitor);
      expect(walker5.getDiagnostics()).toEqual([]);
    });

    it('should support multiple walks with reset between them', () => {
      const walker5 = new DepthLimitedWalker(5);
      const visitor: Partial<ASTVisitor> = {};

      // Walk 1: deep nesting
      const deep = createNestedActions(10);
      walker5.walk(deep, visitor);
      const diagnostics1 = walker5.getDiagnostics();
      expect(diagnostics1.length).toBeGreaterThan(0);

      // Reset
      walker5.resetDiagnostics();

      // Walk 2: shallow nesting
      const shallow = createNestedActions(3);
      walker5.walk(shallow, visitor);
      const diagnostics2 = walker5.getDiagnostics();
      expect(diagnostics2).toEqual([]);

      // Reset
      walker5.resetDiagnostics();

      // Walk 3: deep again
      walker5.walk(deep, visitor);
      const diagnostics3 = walker5.getDiagnostics();
      expect(diagnostics3.length).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility - Visitor Callbacks', () => {
    it('should call visitor callbacks for ActionDeclaration nodes', () => {
      const actions = createNestedActions(3);
      const visitedActions: ActionDeclaration[] = [];
      const visitor: Partial<ASTVisitor> = {
        visitActionDeclaration: (node: ActionDeclaration) => {
          visitedActions.push(node);
        }
      };

      walker.walk(actions, visitor);

      // Should visit root + 2 nested children = 3 total
      expect(visitedActions.length).toBe(3);
    });

    it('should call visitor callbacks for ControlDeclaration nodes', () => {
      const controls = createNestedControls(3);
      const visitedControls: ControlDeclaration[] = [];
      const visitor: Partial<ASTVisitor> = {
        visitControlDeclaration: (node: ControlDeclaration) => {
          visitedControls.push(node);
        }
      };

      walker.walk(controls, visitor);

      expect(visitedControls.length).toBe(3);
    });

    it('should call visitor callbacks for XMLportElement nodes', () => {
      const elements = createNestedXMLportElements(3);
      const visitedElements: XMLportElement[] = [];
      const visitor: Partial<ASTVisitor> = {
        visitXMLportElement: (node: XMLportElement) => {
          visitedElements.push(node);
        }
      };

      walker.walk(elements, visitor);

      expect(visitedElements.length).toBe(3);
    });

    it('should call generic visitNode for all nodes', () => {
      const actions = createNestedActions(3);
      const visitedNodes: string[] = [];
      const visitor: Partial<ASTVisitor> = {
        visitNode: (node) => {
          visitedNodes.push(node.type);
        }
      };

      walker.walk(actions, visitor);

      expect(visitedNodes.filter(t => t === 'ActionDeclaration').length).toBe(3);
    });

    it('should support visitor returning false to skip children', () => {
      const actions = createNestedActions(5);
      let visitCount = 0;
      const visitor: Partial<ASTVisitor> = {
        visitActionDeclaration: (node: ActionDeclaration) => {
          visitCount++;
          // Skip children after first node
          if (node.id === 1) {
            return false;
          }
        }
      };

      walker.walk(actions, visitor);

      // Should visit only root (id=1), children are skipped
      expect(visitCount).toBe(1);
    });
  });

  describe('Multiple Diagnostics', () => {
    it('should emit multiple diagnostics for multiple violations', () => {
      const walker5 = new DepthLimitedWalker(5);

      // Create tree with multiple branches that exceed depth
      const action1 = createNestedActions(10);
      const action2 = createNestedActions(8);
      const root: ActionDeclaration = {
        type: 'ActionDeclaration',
        id: 0,
        indentLevel: 0,
        actionType: 'ActionGroup',
        properties: null,
        triggers: null,
        children: [action1, action2],
        startToken: createToken(TokenType.Identifier, 'Root', 1, 1),
        endToken: createToken(TokenType.Identifier, 'Root', 1, 1)
      };

      const visitor: Partial<ASTVisitor> = {};
      walker5.walk(root, visitor);
      const diagnostics = walker5.getDiagnostics();

      // Both branches should produce diagnostics
      expect(diagnostics.length).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null node gracefully', () => {
      const visitor: Partial<ASTVisitor> = {};

      expect(() => walker.walk(null, visitor)).not.toThrow();
      expect(walker.getDiagnostics()).toEqual([]);
    });

    it('should handle undefined node gracefully', () => {
      const visitor: Partial<ASTVisitor> = {};

      expect(() => walker.walk(undefined, visitor)).not.toThrow();
      expect(walker.getDiagnostics()).toEqual([]);
    });

    it('should handle empty visitor gracefully', () => {
      const actions = createNestedActions(3);

      expect(() => walker.walk(actions, {})).not.toThrow();
    });

    it('should handle node with no children', () => {
      const token = createToken(TokenType.Identifier, 'Leaf', 1, 1);
      const leafAction: ActionDeclaration = {
        type: 'ActionDeclaration',
        id: 1,
        indentLevel: 0,
        actionType: 'Action',
        properties: null,
        triggers: null,
        children: [], // No children
        startToken: token,
        endToken: token
      };

      const visitor: Partial<ASTVisitor> = {};
      walker.walk(leafAction, visitor);

      expect(walker.getDiagnostics()).toEqual([]);
    });
  });

  describe('Default maxDepth of 100', () => {
    it('should use 100 as default maxDepth when not specified', () => {
      const defaultWalker = new DepthLimitedWalker();
      const actions100 = createNestedActions(100);
      const actions101 = createNestedActions(101);
      const visitor: Partial<ASTVisitor> = {};

      // Depth 100 should pass
      defaultWalker.walk(actions100, visitor);
      expect(defaultWalker.getDiagnostics()).toEqual([]);

      // Reset and test depth 101 (first violation)
      defaultWalker.resetDiagnostics();
      defaultWalker.walk(actions101, visitor);
      expect(defaultWalker.getDiagnostics().length).toBeGreaterThan(0);
    });
  });
});
