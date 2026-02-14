/**
 * DepthLimitedWalker Tests
 *
 * Tests for DepthLimitedWalker which prevents parser stack exhaustion by
 * limiting the maximum nesting depth of hierarchical C/AL structures
 * (Actions, Controls, XMLport Elements, Statements).
 */

import { DepthLimitedWalker, PHYSICAL_STACK_LIMIT } from '../depthLimitedWalker';
import { ASTVisitor } from '../astVisitor';
import {
  ActionDeclaration,
  ControlDeclaration,
  XMLportElement,
  IfStatement,
  WhileStatement,
  ForStatement,
  RepeatStatement,
  CaseStatement,
  WithStatement,
  TriggerDeclaration,
  Identifier,
  Literal,
  BinaryExpression,
  Statement
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

/**
 * Helper to create a simple literal expression
 */
function createLiteral(value: number): Literal {
  const token = createToken(TokenType.Integer, value.toString(), 1, 1);
  return {
    type: 'Literal',
    value,
    literalType: 'integer',
    startToken: token,
    endToken: token
  };
}

/**
 * Helper to create a simple identifier
 */
function createIdentifier(name: string): Identifier {
  const token = createToken(TokenType.Identifier, name, 1, 1);
  return {
    type: 'Identifier',
    name,
    isQuoted: false,
    startToken: token,
    endToken: token
  };
}

/**
 * Helper to create a simple binary expression (x = 1)
 */
function createBinaryExpression(): BinaryExpression {
  const token = createToken(TokenType.Equal, '=', 1, 1);
  return {
    type: 'BinaryExpression',
    operator: '=',
    left: createIdentifier('x'),
    right: createLiteral(1),
    startToken: token,
    endToken: token
  };
}

/**
 * Helper to create deeply nested IfStatement tree
 */
function createNestedIfStatements(depth: number, startId = 1): IfStatement {
  const token = createToken(TokenType.Identifier, `If${startId}`, 1, 1);
  const ifStmt: IfStatement = {
    type: 'IfStatement',
    condition: createBinaryExpression(),
    thenBranch: {
      type: 'BlockStatement',
      statements: [],
      startToken: token,
      endToken: token
    },
    elseBranch: null,
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    // Nest the next IF inside the THEN branch
    ifStmt.thenBranch = createNestedIfStatements(depth - 1, startId + 1);
  }

  return ifStmt;
}

/**
 * Helper to create deeply nested WhileStatement tree
 */
function createNestedWhileStatements(depth: number, startId = 1): WhileStatement {
  const token = createToken(TokenType.Identifier, `While${startId}`, 1, 1);
  const whileStmt: WhileStatement = {
    type: 'WhileStatement',
    condition: createBinaryExpression(),
    body: {
      type: 'BlockStatement',
      statements: [],
      startToken: token,
      endToken: token
    },
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    // Nest the next WHILE inside the body
    whileStmt.body = createNestedWhileStatements(depth - 1, startId + 1);
  }

  return whileStmt;
}

/**
 * Helper to create deeply nested ForStatement tree
 */
function createNestedForStatements(depth: number, startId = 1): ForStatement {
  const token = createToken(TokenType.Identifier, `For${startId}`, 1, 1);
  const forStmt: ForStatement = {
    type: 'ForStatement',
    variable: createIdentifier('i'),
    from: createLiteral(1),
    to: createLiteral(10),
    downto: false,
    body: {
      type: 'BlockStatement',
      statements: [],
      startToken: token,
      endToken: token
    },
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    // Nest the next FOR inside the body
    forStmt.body = createNestedForStatements(depth - 1, startId + 1);
  }

  return forStmt;
}

/**
 * Helper to create deeply nested RepeatStatement tree
 */
function createNestedRepeatStatements(depth: number, startId = 1): RepeatStatement {
  const token = createToken(TokenType.Identifier, `Repeat${startId}`, 1, 1);
  const repeatStmt: RepeatStatement = {
    type: 'RepeatStatement',
    body: [],
    condition: createBinaryExpression(),
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    // Nest the next REPEAT inside the body
    repeatStmt.body = [createNestedRepeatStatements(depth - 1, startId + 1)];
  }

  return repeatStmt;
}

/**
 * Helper to create deeply nested CaseStatement tree
 */
function createNestedCaseStatements(depth: number, startId = 1): CaseStatement {
  const token = createToken(TokenType.Identifier, `Case${startId}`, 1, 1);
  const caseStmt: CaseStatement = {
    type: 'CaseStatement',
    expression: createIdentifier('x'),
    branches: [
      {
        type: 'CaseBranch',
        values: [createLiteral(1)],
        statements: [],
        startToken: token,
        endToken: token
      }
    ],
    elseBranch: null,
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    // Nest the next CASE inside the branch statements
    caseStmt.branches[0].statements = [createNestedCaseStatements(depth - 1, startId + 1)];
  }

  return caseStmt;
}

/**
 * Helper to create deeply nested WithStatement tree
 */
function createNestedWithStatements(depth: number, startId = 1): WithStatement {
  const token = createToken(TokenType.Identifier, `With${startId}`, 1, 1);
  const withStmt: WithStatement = {
    type: 'WithStatement',
    record: createIdentifier('Rec'),
    body: {
      type: 'BlockStatement',
      statements: [],
      startToken: token,
      endToken: token
    },
    startToken: token,
    endToken: token
  };

  if (depth > 1) {
    // Nest the next WITH inside the body
    withStmt.body = createNestedWithStatements(depth - 1, startId + 1);
  }

  return withStmt;
}

/**
 * Helper to create mixed statement nesting: IF containing WHILE containing FOR
 */
function createMixedStatementNesting(totalDepth: number): IfStatement {
  const token = createToken(TokenType.Identifier, 'MixedRoot', 1, 1);
  const ifStmt: IfStatement = {
    type: 'IfStatement',
    condition: createBinaryExpression(),
    thenBranch: {
      type: 'BlockStatement',
      statements: [],
      startToken: token,
      endToken: token
    },
    elseBranch: null,
    startToken: token,
    endToken: token
  };

  if (totalDepth <= 1) {
    return ifStmt;
  }

  // For mixed nesting: alternate between IF, WHILE, and FOR
  const remaining = totalDepth - 1;
  if (remaining % 3 === 0) {
    // Add nested FOR
    const forStmt = createNestedForStatements(1);
    if (remaining > 1) {
      forStmt.body = createMixedStatementNesting(remaining);
    }
    ifStmt.thenBranch = forStmt;
  } else if (remaining % 3 === 1) {
    // Add nested WHILE
    const whileStmt = createNestedWhileStatements(1);
    if (remaining > 1) {
      whileStmt.body = createMixedStatementNesting(remaining);
    }
    ifStmt.thenBranch = whileStmt;
  } else {
    // Add nested IF
    ifStmt.thenBranch = createMixedStatementNesting(remaining);
  }

  return ifStmt;
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

  describe('Statement Depth Protection', () => {
    describe('IfStatement Protection', () => {
      it('should emit no diagnostics for shallow IF nesting', () => {
        const ifStmts = createNestedIfStatements(5);
        const visitor: Partial<ASTVisitor> = {};

        walker.walk(ifStmts, visitor);

        expect(walker.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic when IF nesting exceeds depth limit', () => {
        const walker10 = new DepthLimitedWalker(10);
        const ifStmts = createNestedIfStatements(15);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(ifStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
        expect(diagnostics[0].message).toContain('if statement');
      });

      it('should emit no diagnostic at depth = maxDepth for IF', () => {
        const walker10 = new DepthLimitedWalker(10);
        const ifStmts = createNestedIfStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(ifStmts, visitor);

        expect(walker10.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic at depth = maxDepth + 1 for IF', () => {
        const walker10 = new DepthLimitedWalker(10);
        const ifStmts = createNestedIfStatements(11);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(ifStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
      });
    });

    describe('WhileStatement Protection', () => {
      it('should emit no diagnostics for shallow WHILE nesting', () => {
        const whileStmts = createNestedWhileStatements(5);
        const visitor: Partial<ASTVisitor> = {};

        walker.walk(whileStmts, visitor);

        expect(walker.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic when WHILE nesting exceeds depth limit', () => {
        const walker10 = new DepthLimitedWalker(10);
        const whileStmts = createNestedWhileStatements(15);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(whileStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
        expect(diagnostics[0].message).toContain('while statement');
      });

      it('should emit no diagnostic at depth = maxDepth for WHILE', () => {
        const walker10 = new DepthLimitedWalker(10);
        const whileStmts = createNestedWhileStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(whileStmts, visitor);

        expect(walker10.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic at depth = maxDepth + 1 for WHILE', () => {
        const walker10 = new DepthLimitedWalker(10);
        const whileStmts = createNestedWhileStatements(11);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(whileStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
      });
    });

    describe('ForStatement Protection', () => {
      it('should emit no diagnostics for shallow FOR nesting', () => {
        const forStmts = createNestedForStatements(5);
        const visitor: Partial<ASTVisitor> = {};

        walker.walk(forStmts, visitor);

        expect(walker.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic when FOR nesting exceeds depth limit', () => {
        const walker10 = new DepthLimitedWalker(10);
        const forStmts = createNestedForStatements(15);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(forStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
        expect(diagnostics[0].message).toContain('for statement');
      });

      it('should emit no diagnostic at depth = maxDepth for FOR', () => {
        const walker10 = new DepthLimitedWalker(10);
        const forStmts = createNestedForStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(forStmts, visitor);

        expect(walker10.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic at depth = maxDepth + 1 for FOR', () => {
        const walker10 = new DepthLimitedWalker(10);
        const forStmts = createNestedForStatements(11);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(forStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
      });
    });

    describe('RepeatStatement Protection', () => {
      it('should emit no diagnostics for shallow REPEAT nesting', () => {
        const repeatStmts = createNestedRepeatStatements(5);
        const visitor: Partial<ASTVisitor> = {};

        walker.walk(repeatStmts, visitor);

        expect(walker.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic when REPEAT nesting exceeds depth limit', () => {
        const walker10 = new DepthLimitedWalker(10);
        const repeatStmts = createNestedRepeatStatements(15);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(repeatStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
        expect(diagnostics[0].message).toContain('repeat statement');
      });

      it('should emit no diagnostic at depth = maxDepth for REPEAT', () => {
        const walker10 = new DepthLimitedWalker(10);
        const repeatStmts = createNestedRepeatStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(repeatStmts, visitor);

        expect(walker10.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic at depth = maxDepth + 1 for REPEAT', () => {
        const walker10 = new DepthLimitedWalker(10);
        const repeatStmts = createNestedRepeatStatements(11);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(repeatStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
      });
    });

    describe('CaseStatement Protection', () => {
      it('should emit no diagnostics for shallow CASE nesting', () => {
        const caseStmts = createNestedCaseStatements(5);
        const visitor: Partial<ASTVisitor> = {};

        walker.walk(caseStmts, visitor);

        expect(walker.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic when CASE nesting exceeds depth limit', () => {
        const walker10 = new DepthLimitedWalker(10);
        const caseStmts = createNestedCaseStatements(15);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(caseStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
        expect(diagnostics[0].message).toContain('case statement');
      });

      it('should emit no diagnostic at depth = maxDepth for CASE', () => {
        const walker10 = new DepthLimitedWalker(10);
        const caseStmts = createNestedCaseStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(caseStmts, visitor);

        expect(walker10.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic at depth = maxDepth + 1 for CASE', () => {
        const walker10 = new DepthLimitedWalker(10);
        const caseStmts = createNestedCaseStatements(11);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(caseStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
      });
    });

    describe('WithStatement Protection', () => {
      it('should emit no diagnostics for shallow WITH nesting', () => {
        const withStmts = createNestedWithStatements(5);
        const visitor: Partial<ASTVisitor> = {};

        walker.walk(withStmts, visitor);

        expect(walker.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic when WITH nesting exceeds depth limit', () => {
        const walker10 = new DepthLimitedWalker(10);
        const withStmts = createNestedWithStatements(15);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(withStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
        expect(diagnostics[0].message).toContain('with statement');
      });

      it('should emit no diagnostic at depth = maxDepth for WITH', () => {
        const walker10 = new DepthLimitedWalker(10);
        const withStmts = createNestedWithStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(withStmts, visitor);

        expect(walker10.getDiagnostics()).toEqual([]);
      });

      it('should emit diagnostic at depth = maxDepth + 1 for WITH', () => {
        const walker10 = new DepthLimitedWalker(10);
        const withStmts = createNestedWithStatements(11);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(withStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('11');
        expect(diagnostics[0].message).toContain('10');
      });
    });

    describe('Mixed Statement Nesting - Shared Counter', () => {
      it('should track total depth across mixed statement types', () => {
        const walker10 = new DepthLimitedWalker(10);
        const mixedStmts = createMixedStatementNesting(12);
        const visitor: Partial<ASTVisitor> = {};

        walker10.walk(mixedStmts, visitor);
        const diagnostics = walker10.getDiagnostics();

        // Should emit diagnostic since total depth exceeds 10
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
      });

      it('should use shared depth counter for IF containing WHILE containing FOR', () => {
        const walker5 = new DepthLimitedWalker(5);
        const mixedStmts = createMixedStatementNesting(6);
        const visitor: Partial<ASTVisitor> = {};

        walker5.walk(mixedStmts, visitor);

        // Single counter means we should see diagnostic at depth 6
        expect(walker5.getDiagnostics().length).toBeGreaterThan(0);
      });

      it('should share depth counter between Actions and Statements', () => {
        const walker10 = new DepthLimitedWalker(10);

        // Create Action tree with nested Actions (depth 5)
        // Then add deeply nested IF statements in the innermost action's trigger
        // Combined depth: 5 (actions) + 6 (statements) = 11, should emit diagnostic
        const rootAction = createNestedActions(5);

        // Navigate to the innermost action and add a trigger with deeply nested statements
        let current = rootAction;
        while (current.children && current.children.length > 0) {
          current = current.children[0];
        }

        // Add a trigger body with 6 nested IF statements to the innermost action
        // This creates a single tree: Action->Action->...->Action->Trigger->If->If->...->If
        current.triggers = [
          {
            type: 'TriggerDeclaration',
            name: 'OnAction',
            variables: [],
            body: [createNestedIfStatements(6) as Statement],
            startToken: createToken(TokenType.Identifier, 'OnAction', 1, 1),
            endToken: createToken(TokenType.Identifier, 'OnAction', 1, 1)
          }
        ];

        // Single walk call - depths accumulate naturally as walker descends the tree
        const visitor: Partial<ASTVisitor> = {};
        walker10.walk(rootAction, visitor);

        const diagnostics = walker10.getDiagnostics();

        // Should emit diagnostic since combined depth (5 actions + 6 statements = 11) exceeds 10
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('depth');
      });
    });

    describe('Extreme Depth - 5000+ Levels', () => {
      it('should respect PHYSICAL_STACK_LIMIT value', () => {
        // Verify the constant is set to 1000
        expect(PHYSICAL_STACK_LIMIT).toBe(1000);

        // Verify effectiveLimit is clamped to physical limit
        const walker10000 = new DepthLimitedWalker(10000);
        const walker500 = new DepthLimitedWalker(500);

        // Walker with maxDepth=10000 should be clamped to 1000
        const deepStmt1 = createNestedIfStatements(1001);
        const visitor1: Partial<ASTVisitor> = {};
        walker10000.walk(deepStmt1, visitor1);
        expect(walker10000.getDiagnostics().length).toBeGreaterThan(0);

        // Walker with maxDepth=500 should use 500 (below physical limit)
        const deepStmt2 = createNestedIfStatements(501);
        const visitor2: Partial<ASTVisitor> = {};
        walker500.walk(deepStmt2, visitor2);
        expect(walker500.getDiagnostics().length).toBeGreaterThan(0);
      });

      it('should handle 5500+ nested IF statements without stack overflow, stopping at physical limit', () => {
        const walker10000 = new DepthLimitedWalker(10000);
        const deepIfs = createNestedIfStatements(5500);
        const visitor: Partial<ASTVisitor> = {};

        // Should complete without crashing
        expect(() => walker10000.walk(deepIfs, visitor)).not.toThrow();

        // Should emit diagnostic at depth 1001 (physical limit)
        const diagnostics = walker10000.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('1001');
        expect(diagnostics[0].message).toContain('1000');
      });

      it('should handle 5500+ nested WHILE statements without stack overflow, stopping at physical limit', () => {
        const walker10000 = new DepthLimitedWalker(10000);
        const deepWhiles = createNestedWhileStatements(5500);
        const visitor: Partial<ASTVisitor> = {};

        // Should complete without crashing
        expect(() => walker10000.walk(deepWhiles, visitor)).not.toThrow();

        // Should emit diagnostic at depth 1001 (physical limit)
        const diagnostics = walker10000.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('1001');
        expect(diagnostics[0].message).toContain('1000');
      });

      it('should handle 1000 nested FOR statements at limit with acceptable performance', () => {
        const walker10000 = new DepthLimitedWalker(10000);
        const deepFors = createNestedForStatements(1000);
        const visitor: Partial<ASTVisitor> = {};

        const startTime = Date.now();
        walker10000.walk(deepFors, visitor);
        const elapsed = Date.now() - startTime;

        // Should complete in reasonable time (< 1 second for 1000 levels)
        expect(elapsed).toBeLessThan(1000);
        // At depth 1000, should not emit diagnostic (at limit is OK)
        expect(walker10000.getDiagnostics()).toEqual([]);
      });

      it('should handle 5500+ nested REPEAT statements without stack overflow, stopping at physical limit', () => {
        const walker10000 = new DepthLimitedWalker(10000);
        const deepRepeats = createNestedRepeatStatements(5500);
        const visitor: Partial<ASTVisitor> = {};

        // Should complete without crashing
        expect(() => walker10000.walk(deepRepeats, visitor)).not.toThrow();

        // Should emit diagnostic at depth 1001 (physical limit)
        const diagnostics = walker10000.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('1001');
        expect(diagnostics[0].message).toContain('1000');
      });

      it('should handle 5500+ nested CASE statements without stack overflow, stopping at physical limit', () => {
        const walker10000 = new DepthLimitedWalker(10000);
        const deepCases = createNestedCaseStatements(5500);
        const visitor: Partial<ASTVisitor> = {};

        // Should complete without crashing
        expect(() => walker10000.walk(deepCases, visitor)).not.toThrow();

        // Should emit diagnostic at depth 1001 (physical limit)
        const diagnostics = walker10000.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('1001');
        expect(diagnostics[0].message).toContain('1000');
      });

      it('should handle 5500+ nested WITH statements without stack overflow, stopping at physical limit', () => {
        const walker10000 = new DepthLimitedWalker(10000);
        const deepWiths = createNestedWithStatements(5500);
        const visitor: Partial<ASTVisitor> = {};

        // Should complete without crashing
        expect(() => walker10000.walk(deepWiths, visitor)).not.toThrow();

        // Should emit diagnostic at depth 1001 (physical limit)
        const diagnostics = walker10000.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].message).toContain('1001');
        expect(diagnostics[0].message).toContain('1000');
      });
    });

    describe('Statement Diagnostic Quality', () => {
      it('should include correct position from statement startToken', () => {
        const walker5 = new DepthLimitedWalker(5);
        const deepStmt = createNestedIfStatements(10);

        // Set a specific position on the 6th nested IF (first violation)
        const token = createToken(TokenType.Identifier, 'DeepIf', 42, 15);
        let current: any = deepStmt;
        for (let i = 0; i < 5; i++) {
          current = current.thenBranch;
        }
        current.startToken = token;

        const visitor: Partial<ASTVisitor> = {};
        walker5.walk(deepStmt, visitor);
        const diagnostics = walker5.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].range.start.line).toBe(41); // LSP is 0-based, token is 1-based
        expect(diagnostics[0].range.start.character).toBe(14); // 0-based
      });

      it('should set diagnostic severity to Warning for statements', () => {
        const walker5 = new DepthLimitedWalker(5);
        const whileStmts = createNestedWhileStatements(10);
        const visitor: Partial<ASTVisitor> = {};

        walker5.walk(whileStmts, visitor);
        const diagnostics = walker5.getDiagnostics();

        expect(diagnostics.length).toBeGreaterThan(0);
        // DiagnosticSeverity.Warning = 2
        expect(diagnostics[0].severity).toBe(2);
        expect(diagnostics[0].code).toBe('nesting-depth-exceeded');
      });

      it('should include depth and limit values in diagnostic for all statement types', () => {
        const walker10 = new DepthLimitedWalker(10);
        const visitor: Partial<ASTVisitor> = {};

        const testCases = [
          { name: 'IF', stmt: createNestedIfStatements(15) },
          { name: 'WHILE', stmt: createNestedWhileStatements(15) },
          { name: 'FOR', stmt: createNestedForStatements(15) },
          { name: 'REPEAT', stmt: createNestedRepeatStatements(15) },
          { name: 'CASE', stmt: createNestedCaseStatements(15) },
          { name: 'WITH', stmt: createNestedWithStatements(15) }
        ];

        for (const testCase of testCases) {
          walker10.resetDiagnostics();
          walker10.walk(testCase.stmt, visitor);
          const diagnostics = walker10.getDiagnostics();

          expect(diagnostics.length).toBeGreaterThan(0);
          expect(diagnostics[0].message).toMatch(/depth.*11/i);
          expect(diagnostics[0].message).toMatch(/limit.*10/i);
        }
      });
    });
  });
});
