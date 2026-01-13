import { Token } from '../lexer/tokens';

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  type: string;
  startToken: Token;
  endToken: Token;
}

/**
 * C/AL Object Types
 */
export enum ObjectKind {
  Table = 'Table',
  Page = 'Page',
  Report = 'Report',
  Codeunit = 'Codeunit',
  Query = 'Query',
  XMLport = 'XMLport',
  MenuSuite = 'MenuSuite'
}

/**
 * Root node representing a C/AL file (typically one object per file)
 */
export interface CALDocument extends ASTNode {
  type: 'CALDocument';
  object: ObjectDeclaration | null;
}

/**
 * Object declaration (OBJECT Table 18 Customer)
 */
export interface ObjectDeclaration extends ASTNode {
  type: 'ObjectDeclaration';
  objectKind: ObjectKind;
  objectId: number;
  objectName: string;
  properties: PropertySection | null;
  fields: FieldSection | null;
  keys: KeySection | null;
  fieldGroups: FieldGroupSection | null;
  code: CodeSection | null;
}

/**
 * PROPERTIES section
 */
export interface PropertySection extends ASTNode {
  type: 'PropertySection';
  properties: Property[];
}

export interface Property extends ASTNode {
  type: 'Property';
  name: string;
  value: string;
  /** For property triggers (OnRun, OnValidate, etc.), stores the parsed trigger body */
  triggerBody?: Statement[];
  /** Variables declared in property trigger VAR section (rare but possible) */
  triggerVariables?: VariableDeclaration[];
}

/**
 * FIELDS section
 */
export interface FieldSection extends ASTNode {
  type: 'FieldSection';
  fields: FieldDeclaration[];
}

export interface FieldDeclaration extends ASTNode {
  type: 'FieldDeclaration';
  fieldNo: number;
  fieldClass: string;  // Reserved column - always empty in NAV exports
  fieldName: string;
  dataType: DataType;
  properties: PropertySection | null;
  triggers: TriggerDeclaration[] | null;  // Field-level triggers (OnValidate, OnLookup, etc.)
}

/**
 * Data type information for variable, parameter, and field declarations.
 *
 * @example
 * // Simple type
 * { typeName: 'Integer' }
 *
 * // Sized type
 * { typeName: 'Text50', length: 50 }
 *
 * // Single-dimensional array
 * { typeName: 'ARRAY[10] OF Integer', length: 10, dimensions: [10] }
 *
 * // Multi-dimensional array
 * { typeName: 'ARRAY[9,2] OF Decimal', length: 9, dimensions: [9, 2] }
 *
 * // Record type
 * { typeName: 'Record 18', tableId: 18 }
 */
export interface DataType extends ASTNode {
  type: 'DataType';

  /** Full type name as it appears in source (e.g., 'ARRAY[9,2] OF Decimal', 'Record 18', 'Text50') */
  typeName: string;

  /**
   * Size or first dimension of the type.
   * - For sized types (Text, Code): the size (e.g., 50 for Text50)
   * - For single-dimension arrays: the array size
   * - For multi-dimensional arrays: the first dimension (for backwards compatibility)
   * @deprecated For multi-dimensional arrays, use `dimensions[0]` instead
   */
  length?: number;

  /**
   * Array dimension sizes for ARRAY types.
   * - Single-dimension: [10] for ARRAY[10]
   * - Multi-dimensional: [9, 2] for ARRAY[9,2], [10, 4, 4] for ARRAY[10,4,4]
   * - Only present for ARRAY types
   */
  dimensions?: number[];

  /** Table ID for Record types (e.g., 18 for 'Record 18') */
  tableId?: number;

  /** Option values for Option types (e.g., 'Open,Pending,Posted') */
  optionString?: string;

  /** Whether the TEMPORARY modifier is present (for ARRAY OF TEMPORARY patterns) */
  isTemporary?: boolean;

  /** Assembly reference for DotNet types - assembly name/version/culture/token */
  assemblyReference?: string;

  /** Full .NET type path for DotNet types (e.g., 'System.String', 'System.Collections.Generic.Dictionary`2') */
  dotNetTypeName?: string;
}

/**
 * KEYS section
 */
export interface KeySection extends ASTNode {
  type: 'KeySection';
  keys: KeyDeclaration[];
}

export interface KeyDeclaration extends ASTNode {
  type: 'KeyDeclaration';
  fields: string[];
  properties: PropertySection | null;
}

/**
 * FIELDGROUPS section
 */
export interface FieldGroupSection extends ASTNode {
  type: 'FieldGroupSection';
  fieldGroups: FieldGroup[];
}

export interface FieldGroup extends ASTNode {
  type: 'FieldGroup';
  name: string;
  fields: string[];
}

/**
 * CODE section
 */
export interface CodeSection extends ASTNode {
  type: 'CodeSection';
  variables: VariableDeclaration[];
  procedures: ProcedureDeclaration[];
  triggers: TriggerDeclaration[];
  events: EventDeclaration[];
}

/**
 * Variable modifiers that can appear after data type declarations.
 * Order in real NAV exports: INDATASET → WITHEVENTS → RUNONCLIENT → SECURITYFILTERING
 * Note: TEMPORARY appears before the data type, not after.
 */
export interface VariableModifiers {
  /** TEMPORARY modifier - variable is stored in memory only */
  isTemporary?: boolean;
  /** INDATASET modifier - for page variables bound to dataset fields (variables only, not parameters) */
  isInDataSet?: boolean;
  /** WITHEVENTS modifier - for Automation/DotNet variables with event handlers */
  withEvents?: boolean;
  /** RUNONCLIENT modifier - for DotNet variables that execute on client */
  runOnClient?: boolean;
  /** SECURITYFILTERING(value) modifier - for Record/Query variables (Filtered|Ignored|Validated|Disallowed) */
  securityFiltering?: string;
}

/**
 * Variable declaration
 */
export interface VariableDeclaration extends ASTNode, VariableModifiers {
  type: 'VariableDeclaration';
  name: string;
  dataType: DataType;
}

/**
 * Procedure/Function declaration
 */
export interface ProcedureDeclaration extends ASTNode {
  type: 'ProcedureDeclaration';
  name: string;
  parameters: ParameterDeclaration[];
  returnType: DataType | null;
  isLocal: boolean;
  variables: VariableDeclaration[];
  body: Statement[];
}

/**
 * Parameter modifiers - subset of VariableModifiers.
 * Note: INDATASET is NOT valid on parameters (only on page variables).
 */
export interface ParameterModifiers {
  /** TEMPORARY modifier - parameter is stored in memory only */
  isTemporary?: boolean;
  /** WITHEVENTS modifier - for Automation/DotNet parameters with event handlers */
  withEvents?: boolean;
  /** RUNONCLIENT modifier - for DotNet parameters that execute on client */
  runOnClient?: boolean;
  /** SECURITYFILTERING(value) modifier - for Record/Query parameters */
  securityFiltering?: string;
}

export interface ParameterDeclaration extends ASTNode, ParameterModifiers {
  type: 'ParameterDeclaration';
  name: string;
  dataType: DataType;
  isVar: boolean;  // VAR parameter (pass by reference)
}

/**
 * Trigger declaration (e.g., OnInsert, OnValidate)
 */
export interface TriggerDeclaration extends ASTNode {
  type: 'TriggerDeclaration';
  name: string;
  variables: VariableDeclaration[];
  body: Statement[];
}

/**
 * Event declaration for DotNet control add-in event handlers
 * Syntax: EVENT SubscriberName@Number::EventName@Number(parameters);
 */
export interface EventDeclaration extends ASTNode {
  type: 'EventDeclaration';
  subscriberName: string;  // e.g., "CameraProvider@1001"
  eventName: string;       // e.g., "PictureAvailable@10"
  parameters: ParameterDeclaration[];
  variables: VariableDeclaration[];
  body: Statement[];
}

/**
 * Statements
 */
export interface Statement extends ASTNode {
  type: string;
}

export interface BlockStatement extends Statement {
  type: 'BlockStatement';
  statements: Statement[];
}

export interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenBranch: Statement;
  elseBranch: Statement | null;
}

export interface WhileStatement extends Statement {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement;
}

export interface RepeatStatement extends Statement {
  type: 'RepeatStatement';
  body: Statement[];
  condition: Expression;
}

export interface ForStatement extends Statement {
  type: 'ForStatement';
  /**
   * The loop control variable.
   * Can be a simple identifier (e.g., FOR i := 1 TO 10)
   * or a member expression for record field references (e.g., FOR Rec.Field := 1 TO 10)
   */
  variable: Identifier | MemberExpression;
  from: Expression;
  to: Expression;
  downto: boolean;
  body: Statement;
}

export interface CaseStatement extends Statement {
  type: 'CaseStatement';
  expression: Expression;
  branches: CaseBranch[];
  elseBranch: Statement[] | null;
}

export interface CaseBranch extends ASTNode {
  type: 'CaseBranch';
  values: Expression[];
  statements: Statement[];
}

export interface AssignmentStatement extends Statement {
  type: 'AssignmentStatement';
  target: Expression;
  value: Expression;
}

export interface CallStatement extends Statement {
  type: 'CallStatement';
  expression: Expression;
}

export interface ExitStatement extends Statement {
  type: 'ExitStatement';
  value: Expression | null;
}

/**
 * BREAK statement - exits the innermost loop.
 * Unlike EXIT, BREAK takes no value and only affects loop control flow.
 * Valid in: FOR, WHILE, REPEAT-UNTIL loops.
 * Note: Parser accepts BREAK syntactically but does not validate loop context.
 * Semantic validation (ensuring BREAK appears within a loop) is deferred.
 */
export interface BreakStatement extends Statement {
  type: 'BreakStatement';
  // NO value field - BREAK takes no arguments (critical difference from ExitStatement)
}

/**
 * Empty statement represented by a standalone semicolon.
 * Valid in C/AL after THEN, DO, ELSE keywords: IF cond THEN; or WHILE cond DO;
 * Used when the statement body is intentionally empty (e.g., IF Rec.FINDLAST THEN;)
 */
export interface EmptyStatement extends Statement {
  type: 'EmptyStatement';
}

/**
 * WITH-DO statement for record scope shortening
 *
 * Syntax: WITH record DO statement
 *
 * Creates a scope where fields of the record can be accessed without
 * qualification (e.g., "No." instead of Customer."No.").
 *
 * Note: C/AL supports only single-variable WITH (not multi-variable like Pascal)
 *
 * Available: NAV 2009+
 */
export interface WithStatement extends Statement {
  type: 'WithStatement';
  record: Expression;  // Single record variable or expression
  body: Statement;     // Block or single statement
}

/**
 * Expressions
 */
export interface Expression extends ASTNode {
  type: string;
}

export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
  isQuoted: boolean;
}

export interface Literal extends Expression {
  type: 'Literal';
  value: string | number | boolean;
  literalType: 'string' | 'integer' | 'decimal' | 'boolean' | 'date' | 'time' | 'datetime';
}

export interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  operand: Expression;
}

export interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

export interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

/**
 * Array access expression for single or multi-dimensional array indexing.
 *
 * @example
 * // Single-dimensional: arr[5]
 * { array: Identifier('arr'), indices: [Literal(5)] }
 *
 * // Multi-dimensional: Matrix[1,2,3]
 * { array: Identifier('Matrix'), indices: [Literal(1), Literal(2), Literal(3)] }
 *
 * // Complex expressions: arr[i + 1, Type::Member]
 * { array: Identifier('arr'), indices: [BinaryExpression, MemberExpression] }
 */
export interface ArrayAccessExpression extends Expression {
  type: 'ArrayAccessExpression';
  /** The array being accessed */
  array: Expression;
  /**
   * Array indices for single or multi-dimensional access.
   * For `arr[i,j,k]`, this contains [i, j, k].
   * @since 0.4.7 - Changed from singular `index: Expression` to support multi-dimensional arrays
   */
  indices: Expression[];
}

export interface SetLiteral extends Expression {
  type: 'SetLiteral';
  elements: (Expression | RangeExpression)[];
}

export interface RangeExpression extends Expression {
  type: 'RangeExpression';
  start: Expression | null;
  end: Expression | null;
}
