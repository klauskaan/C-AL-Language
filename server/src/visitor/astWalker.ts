/**
 * ASTWalker - Centralized AST traversal using the Visitor pattern.
 *
 * This class provides depth-first traversal of C/AL AST nodes, calling
 * the appropriate visitor methods for each node type. It eliminates
 * code duplication by providing a single traversal implementation that
 * can be reused across different analysis tasks.
 *
 * @example
 * ```typescript
 * const walker = new ASTWalker();
 * const visitor: Partial<ASTVisitor> = {
 *   visitIdentifier(node) {
 *     console.log('Found identifier:', node.name);
 *   }
 * };
 * walker.walk(ast, visitor);
 * ```
 */

import { ASTVisitor } from './astVisitor';
import {
  ASTNode,
  CALDocument,
  ObjectDeclaration,
  PropertySection,
  FieldSection,
  KeySection,
  FieldGroupSection,
  CodeSection,
  Property,
  FieldDeclaration,
  KeyDeclaration,
  FieldGroup,
  VariableDeclaration,
  ProcedureDeclaration,
  ParameterDeclaration,
  TriggerDeclaration,
  DataType,
  Statement,
  BlockStatement,
  IfStatement,
  WhileStatement,
  RepeatStatement,
  ForStatement,
  CaseStatement,
  CaseBranch,
  AssignmentStatement,
  CallStatement,
  ExitStatement,
  Expression,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  MemberExpression,
  CallExpression,
  ArrayAccessExpression
} from '../parser/ast';

/**
 * ASTWalker class for depth-first traversal of C/AL AST nodes.
 *
 * The walker is stateless - all state should be managed by the visitor.
 * This allows the same walker instance to be reused for multiple traversals.
 */
export class ASTWalker {
  /**
   * Walk the AST starting from the given node, calling visitor methods
   * for each node encountered.
   *
   * Traversal is depth-first: the node's visitor method is called first,
   * then all children are traversed recursively.
   *
   * @param node - The AST node to start traversal from (can be null/undefined)
   * @param visitor - Partial visitor with methods for nodes of interest
   */
  public walk(node: ASTNode | null | undefined, visitor: Partial<ASTVisitor>): void {
    if (!node) {
      return;
    }

    // Call generic visitNode first if present
    if (visitor.visitNode) {
      const result = visitor.visitNode(node);
      if (result === false) {
        return; // Skip type-specific visitor and children
      }
    }

    // Dispatch to type-specific handler
    switch (node.type) {
      // Document Level
      case 'CALDocument':
        this.walkCALDocument(node as CALDocument, visitor);
        break;
      case 'ObjectDeclaration':
        this.walkObjectDeclaration(node as ObjectDeclaration, visitor);
        break;

      // Sections
      case 'PropertySection':
        this.walkPropertySection(node as PropertySection, visitor);
        break;
      case 'FieldSection':
        this.walkFieldSection(node as FieldSection, visitor);
        break;
      case 'KeySection':
        this.walkKeySection(node as KeySection, visitor);
        break;
      case 'FieldGroupSection':
        this.walkFieldGroupSection(node as FieldGroupSection, visitor);
        break;
      case 'CodeSection':
        this.walkCodeSection(node as CodeSection, visitor);
        break;

      // Declarations
      case 'Property':
        this.walkProperty(node as Property, visitor);
        break;
      case 'FieldDeclaration':
        this.walkFieldDeclaration(node as FieldDeclaration, visitor);
        break;
      case 'KeyDeclaration':
        this.walkKeyDeclaration(node as KeyDeclaration, visitor);
        break;
      case 'FieldGroup':
        this.walkFieldGroup(node as FieldGroup, visitor);
        break;
      case 'VariableDeclaration':
        this.walkVariableDeclaration(node as VariableDeclaration, visitor);
        break;
      case 'ProcedureDeclaration':
        this.walkProcedureDeclaration(node as ProcedureDeclaration, visitor);
        break;
      case 'ParameterDeclaration':
        this.walkParameterDeclaration(node as ParameterDeclaration, visitor);
        break;
      case 'TriggerDeclaration':
        this.walkTriggerDeclaration(node as TriggerDeclaration, visitor);
        break;
      case 'DataType':
        this.walkDataType(node as DataType, visitor);
        break;

      // Statements
      case 'BlockStatement':
        this.walkBlockStatement(node as BlockStatement, visitor);
        break;
      case 'IfStatement':
        this.walkIfStatement(node as IfStatement, visitor);
        break;
      case 'WhileStatement':
        this.walkWhileStatement(node as WhileStatement, visitor);
        break;
      case 'RepeatStatement':
        this.walkRepeatStatement(node as RepeatStatement, visitor);
        break;
      case 'ForStatement':
        this.walkForStatement(node as ForStatement, visitor);
        break;
      case 'CaseStatement':
        this.walkCaseStatement(node as CaseStatement, visitor);
        break;
      case 'CaseBranch':
        this.walkCaseBranch(node as CaseBranch, visitor);
        break;
      case 'AssignmentStatement':
        this.walkAssignmentStatement(node as AssignmentStatement, visitor);
        break;
      case 'CallStatement':
        this.walkCallStatement(node as CallStatement, visitor);
        break;
      case 'ExitStatement':
        this.walkExitStatement(node as ExitStatement, visitor);
        break;

      // Expressions
      case 'Identifier':
        this.walkIdentifier(node as Identifier, visitor);
        break;
      case 'Literal':
        this.walkLiteral(node as Literal, visitor);
        break;
      case 'BinaryExpression':
        this.walkBinaryExpression(node as BinaryExpression, visitor);
        break;
      case 'UnaryExpression':
        this.walkUnaryExpression(node as UnaryExpression, visitor);
        break;
      case 'MemberExpression':
        this.walkMemberExpression(node as MemberExpression, visitor);
        break;
      case 'CallExpression':
        this.walkCallExpression(node as CallExpression, visitor);
        break;
      case 'ArrayAccessExpression':
        this.walkArrayAccessExpression(node as ArrayAccessExpression, visitor);
        break;

      default:
        // Unknown node type - skip
        break;
    }
  }

  // ============================================
  // Document Level
  // ============================================

  private walkCALDocument(node: CALDocument, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitCALDocument) {
      const result = visitor.visitCALDocument(node);
      if (result === false) {
        return;
      }
    }
    this.walk(node.object, visitor);
  }

  private walkObjectDeclaration(node: ObjectDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitObjectDeclaration) {
      const result = visitor.visitObjectDeclaration(node);
      if (result === false) {
        return;
      }
    }
    this.walk(node.properties, visitor);
    this.walk(node.fields, visitor);
    this.walk(node.keys, visitor);
    this.walk(node.fieldGroups, visitor);
    this.walk(node.code, visitor);
  }

  // ============================================
  // Sections
  // ============================================

  private walkPropertySection(node: PropertySection, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitPropertySection) {
      const result = visitor.visitPropertySection(node);
      if (result === false) {
        return;
      }
    }
    for (const prop of node.properties) {
      this.walk(prop, visitor);
    }
  }

  private walkFieldSection(node: FieldSection, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitFieldSection) {
      const result = visitor.visitFieldSection(node);
      if (result === false) {
        return;
      }
    }
    for (const field of node.fields) {
      this.walk(field, visitor);
    }
  }

  private walkKeySection(node: KeySection, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitKeySection) {
      const result = visitor.visitKeySection(node);
      if (result === false) {
        return;
      }
    }
    for (const key of node.keys) {
      this.walk(key, visitor);
    }
  }

  private walkFieldGroupSection(node: FieldGroupSection, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitFieldGroupSection) {
      const result = visitor.visitFieldGroupSection(node);
      if (result === false) {
        return;
      }
    }
    for (const group of node.fieldGroups) {
      this.walk(group, visitor);
    }
  }

  private walkCodeSection(node: CodeSection, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitCodeSection) {
      const result = visitor.visitCodeSection(node);
      if (result === false) {
        return;
      }
    }
    for (const variable of node.variables) {
      this.walk(variable, visitor);
    }
    for (const proc of node.procedures) {
      this.walk(proc, visitor);
    }
    for (const trigger of node.triggers) {
      this.walk(trigger, visitor);
    }
  }

  // ============================================
  // Declarations
  // ============================================

  private walkProperty(node: Property, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitProperty) {
      const result = visitor.visitProperty(node);
      if (result === false) {
        return;
      }
    }

    // Property triggers (OnRun, OnValidate, etc.) may have trigger variables and body
    if (node.triggerVariables) {
      for (const variable of node.triggerVariables) {
        this.walk(variable, visitor);
      }
    }
    if (node.triggerBody) {
      for (const statement of node.triggerBody) {
        this.walk(statement, visitor);
      }
    }
  }

  private walkFieldDeclaration(node: FieldDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitFieldDeclaration) {
      const result = visitor.visitFieldDeclaration(node);
      if (result === false) {
        return;
      }
    }
    this.walk(node.dataType, visitor);
    this.walk(node.properties, visitor);
    // Traverse field triggers (OnValidate, OnLookup, etc.)
    if (node.triggers) {
      for (const trigger of node.triggers) {
        this.walk(trigger, visitor);
      }
    }
  }

  private walkKeyDeclaration(node: KeyDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitKeyDeclaration) {
      const result = visitor.visitKeyDeclaration(node);
      if (result === false) {
        return;
      }
    }
    this.walk(node.properties, visitor);
  }

  private walkFieldGroup(node: FieldGroup, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitFieldGroup) {
      visitor.visitFieldGroup(node);
    }
    // FieldGroup has no child AST nodes to traverse (fields is string[])
  }

  private walkVariableDeclaration(node: VariableDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitVariableDeclaration) {
      const result = visitor.visitVariableDeclaration(node);
      if (result === false) {
        return;
      }
    }
    this.walk(node.dataType, visitor);
  }

  private walkProcedureDeclaration(node: ProcedureDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitProcedureDeclaration) {
      const result = visitor.visitProcedureDeclaration(node);
      if (result === false) {
        return;
      }
    }
    for (const param of node.parameters) {
      this.walk(param, visitor);
    }
    if (node.returnType) {
      this.walk(node.returnType, visitor);
    }
    for (const variable of node.variables) {
      this.walk(variable, visitor);
    }
    for (const stmt of node.body) {
      this.walkStatement(stmt, visitor);
    }
  }

  private walkParameterDeclaration(node: ParameterDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitParameterDeclaration) {
      const result = visitor.visitParameterDeclaration(node);
      if (result === false) {
        return;
      }
    }
    this.walk(node.dataType, visitor);
  }

  private walkTriggerDeclaration(node: TriggerDeclaration, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitTriggerDeclaration) {
      const result = visitor.visitTriggerDeclaration(node);
      if (result === false) {
        return;
      }
    }
    for (const variable of node.variables) {
      this.walk(variable, visitor);
    }
    for (const stmt of node.body) {
      this.walkStatement(stmt, visitor);
    }
  }

  private walkDataType(node: DataType, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitDataType) {
      visitor.visitDataType(node);
    }
    // DataType has no child AST nodes to traverse
  }

  // ============================================
  // Statements
  // ============================================

  /**
   * Helper to walk a Statement node.
   * This dispatches to the main walk method which will handle the node type.
   */
  private walkStatement(stmt: Statement | null, visitor: Partial<ASTVisitor>): void {
    this.walk(stmt, visitor);
  }

  private walkBlockStatement(node: BlockStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitBlockStatement) {
      const result = visitor.visitBlockStatement(node);
      if (result === false) {
        return;
      }
    }
    for (const stmt of node.statements) {
      this.walkStatement(stmt, visitor);
    }
  }

  private walkIfStatement(node: IfStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitIfStatement) {
      const result = visitor.visitIfStatement(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.condition, visitor);
    this.walkStatement(node.thenBranch, visitor);
    if (node.elseBranch) {
      this.walkStatement(node.elseBranch, visitor);
    }
  }

  private walkWhileStatement(node: WhileStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitWhileStatement) {
      const result = visitor.visitWhileStatement(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.condition, visitor);
    this.walkStatement(node.body, visitor);
  }

  private walkRepeatStatement(node: RepeatStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitRepeatStatement) {
      const result = visitor.visitRepeatStatement(node);
      if (result === false) {
        return;
      }
    }
    for (const stmt of node.body) {
      this.walkStatement(stmt, visitor);
    }
    this.walkExpression(node.condition, visitor);
  }

  private walkForStatement(node: ForStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitForStatement) {
      const result = visitor.visitForStatement(node);
      if (result === false) {
        return;
      }
    }
    // Walk the loop variable (which is an Identifier)
    this.walk(node.variable, visitor);
    this.walkExpression(node.from, visitor);
    this.walkExpression(node.to, visitor);
    this.walkStatement(node.body, visitor);
  }

  private walkCaseStatement(node: CaseStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitCaseStatement) {
      const result = visitor.visitCaseStatement(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.expression, visitor);
    for (const branch of node.branches) {
      this.walk(branch, visitor);
    }
    if (node.elseBranch) {
      for (const stmt of node.elseBranch) {
        this.walkStatement(stmt, visitor);
      }
    }
  }

  private walkCaseBranch(node: CaseBranch, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitCaseBranch) {
      const result = visitor.visitCaseBranch(node);
      if (result === false) {
        return;
      }
    }
    for (const value of node.values) {
      this.walkExpression(value, visitor);
    }
    for (const stmt of node.statements) {
      this.walkStatement(stmt, visitor);
    }
  }

  private walkAssignmentStatement(node: AssignmentStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitAssignmentStatement) {
      const result = visitor.visitAssignmentStatement(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.target, visitor);
    this.walkExpression(node.value, visitor);
  }

  private walkCallStatement(node: CallStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitCallStatement) {
      const result = visitor.visitCallStatement(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.expression, visitor);
  }

  private walkExitStatement(node: ExitStatement, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitExitStatement) {
      const result = visitor.visitExitStatement(node);
      if (result === false) {
        return;
      }
    }
    if (node.value) {
      this.walkExpression(node.value, visitor);
    }
  }

  // ============================================
  // Expressions
  // ============================================

  /**
   * Helper to walk an Expression node.
   * This dispatches to the main walk method which will handle the node type.
   */
  private walkExpression(expr: Expression | null, visitor: Partial<ASTVisitor>): void {
    this.walk(expr, visitor);
  }

  private walkIdentifier(node: Identifier, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitIdentifier) {
      visitor.visitIdentifier(node);
    }
    // Identifier has no child AST nodes to traverse
  }

  private walkLiteral(node: Literal, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitLiteral) {
      visitor.visitLiteral(node);
    }
    // Literal has no child AST nodes to traverse
  }

  private walkBinaryExpression(node: BinaryExpression, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitBinaryExpression) {
      const result = visitor.visitBinaryExpression(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.left, visitor);
    this.walkExpression(node.right, visitor);
  }

  private walkUnaryExpression(node: UnaryExpression, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitUnaryExpression) {
      const result = visitor.visitUnaryExpression(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.operand, visitor);
  }

  private walkMemberExpression(node: MemberExpression, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitMemberExpression) {
      const result = visitor.visitMemberExpression(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.object, visitor);
    // Also walk the property (which is an Identifier)
    this.walk(node.property, visitor);
  }

  private walkCallExpression(node: CallExpression, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitCallExpression) {
      const result = visitor.visitCallExpression(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.callee, visitor);
    for (const arg of node.arguments) {
      this.walkExpression(arg, visitor);
    }
  }

  private walkArrayAccessExpression(node: ArrayAccessExpression, visitor: Partial<ASTVisitor>): void {
    if (visitor.visitArrayAccessExpression) {
      const result = visitor.visitArrayAccessExpression(node);
      if (result === false) {
        return;
      }
    }
    this.walkExpression(node.array, visitor);
    this.walkExpression(node.index, visitor);
  }
}
