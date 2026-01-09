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
  EventDeclaration,
  DataType,
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
  WithStatement,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  MemberExpression,
  CallExpression,
  ArrayAccessExpression,
  SetLiteral,
  RangeExpression
} from '../parser/ast';

/**
 * Visitor interface for traversing AST nodes.
 *
 * All methods are optional - implement only the node types you need to handle.
 * The ASTWalker will call the appropriate method for each node type during traversal.
 *
 * Each visitor method receives the node being visited and can return:
 * - void: normal traversal continues to children
 * - false: skip traversing children of this node
 *
 * @example
 * ```typescript
 * const visitor: ASTVisitor = {
 *   visitIdentifier(node: Identifier) {
 *     // Handle identifier nodes
 *   },
 *   visitProcedureDeclaration(node: ProcedureDeclaration) {
 *     // Handle procedure declarations
 *   }
 * };
 * ```
 */
export interface ASTVisitor {
  // Document Level
  /**
   * Visit a CALDocument node (root node of the AST)
   */
  visitCALDocument?(node: CALDocument): void | false;

  /**
   * Visit an ObjectDeclaration node (e.g., Table, Codeunit, Page)
   */
  visitObjectDeclaration?(node: ObjectDeclaration): void | false;

  // Sections
  /**
   * Visit a PropertySection node (PROPERTIES block)
   */
  visitPropertySection?(node: PropertySection): void | false;

  /**
   * Visit a FieldSection node (FIELDS block)
   */
  visitFieldSection?(node: FieldSection): void | false;

  /**
   * Visit a KeySection node (KEYS block)
   */
  visitKeySection?(node: KeySection): void | false;

  /**
   * Visit a FieldGroupSection node (FIELDGROUPS block)
   */
  visitFieldGroupSection?(node: FieldGroupSection): void | false;

  /**
   * Visit a CodeSection node (CODE block)
   */
  visitCodeSection?(node: CodeSection): void | false;

  // Declarations
  /**
   * Visit a Property node (name=value pair in PROPERTIES)
   */
  visitProperty?(node: Property): void | false;

  /**
   * Visit a FieldDeclaration node (table field definition)
   */
  visitFieldDeclaration?(node: FieldDeclaration): void | false;

  /**
   * Visit a KeyDeclaration node (key definition in KEYS)
   */
  visitKeyDeclaration?(node: KeyDeclaration): void | false;

  /**
   * Visit a FieldGroup node (field group definition)
   */
  visitFieldGroup?(node: FieldGroup): void | false;

  /**
   * Visit a VariableDeclaration node (local or global variable)
   */
  visitVariableDeclaration?(node: VariableDeclaration): void | false;

  /**
   * Visit a ProcedureDeclaration node (function/procedure definition)
   */
  visitProcedureDeclaration?(node: ProcedureDeclaration): void | false;

  /**
   * Visit a ParameterDeclaration node (procedure parameter)
   */
  visitParameterDeclaration?(node: ParameterDeclaration): void | false;

  /**
   * Visit a TriggerDeclaration node (e.g., OnInsert, OnValidate)
   */
  visitTriggerDeclaration?(node: TriggerDeclaration): void | false;

  /**
   * Visit an EventDeclaration node (DotNet control add-in event handler)
   */
  visitEventDeclaration?(node: EventDeclaration): void | false;

  /**
   * Visit a DataType node (type specification)
   */
  visitDataType?(node: DataType): void | false;

  // Statements
  /**
   * Visit a BlockStatement node (BEGIN...END block)
   */
  visitBlockStatement?(node: BlockStatement): void | false;

  /**
   * Visit an IfStatement node (IF...THEN...ELSE)
   */
  visitIfStatement?(node: IfStatement): void | false;

  /**
   * Visit a WhileStatement node (WHILE...DO)
   */
  visitWhileStatement?(node: WhileStatement): void | false;

  /**
   * Visit a RepeatStatement node (REPEAT...UNTIL)
   */
  visitRepeatStatement?(node: RepeatStatement): void | false;

  /**
   * Visit a ForStatement node (FOR...TO/DOWNTO...DO)
   */
  visitForStatement?(node: ForStatement): void | false;

  /**
   * Visit a CaseStatement node (CASE...OF)
   */
  visitCaseStatement?(node: CaseStatement): void | false;

  /**
   * Visit a CaseBranch node (single branch in CASE)
   */
  visitCaseBranch?(node: CaseBranch): void | false;

  /**
   * Visit an AssignmentStatement node (:= assignment)
   */
  visitAssignmentStatement?(node: AssignmentStatement): void | false;

  /**
   * Visit a CallStatement node (procedure/function call as statement)
   */
  visitCallStatement?(node: CallStatement): void | false;

  /**
   * Visit an ExitStatement node (EXIT with optional value)
   */
  visitExitStatement?(node: ExitStatement): void | false;

  /**
   * Visit a WithStatement node (WITH...DO)
   */
  visitWithStatement?(node: WithStatement): void | false;

  // Expressions
  /**
   * Visit an Identifier node (variable, procedure, or field name)
   */
  visitIdentifier?(node: Identifier): void | false;

  /**
   * Visit a Literal node (string, number, boolean, date, time)
   */
  visitLiteral?(node: Literal): void | false;

  /**
   * Visit a BinaryExpression node (a + b, x AND y, etc.)
   */
  visitBinaryExpression?(node: BinaryExpression): void | false;

  /**
   * Visit a UnaryExpression node (NOT x, -y)
   */
  visitUnaryExpression?(node: UnaryExpression): void | false;

  /**
   * Visit a MemberExpression node (object.property)
   */
  visitMemberExpression?(node: MemberExpression): void | false;

  /**
   * Visit a CallExpression node (function/method call)
   */
  visitCallExpression?(node: CallExpression): void | false;

  /**
   * Visit an ArrayAccessExpression node (array[index])
   */
  visitArrayAccessExpression?(node: ArrayAccessExpression): void | false;

  /**
   * Visit a SetLiteral node (e.g., [0, 1..5, 10])
   */
  visitSetLiteral?(node: SetLiteral): void | false;

  /**
   * Visit a RangeExpression node (e.g., 1..5)
   */
  visitRangeExpression?(node: RangeExpression): void | false;

  /**
   * Generic visitor for any ASTNode type.
   * Called for all nodes before the type-specific visitor.
   * Return false to skip both type-specific visitor and children.
   */
  visitNode?(node: ASTNode): void | false;
}

/**
 * Type alias for partial visitor implementations.
 * Allows implementing only the visitor methods you need.
 */
export type PartialASTVisitor = Partial<ASTVisitor>;
