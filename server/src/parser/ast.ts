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
 * Data type information
 */
export interface DataType extends ASTNode {
  type: 'DataType';
  typeName: string;
  length?: number;
  tableId?: number;  // For Record types
  optionString?: string;  // For Option types (e.g., 'Open,Pending,Posted')
  isTemporary?: boolean;  // For ARRAY OF TEMPORARY patterns
  assemblyReference?: string;  // For DotNet types - assembly name/version/culture/token
  dotNetTypeName?: string;  // For DotNet types - full .NET type path (e.g., 'System.String', 'System.Collections.Generic.Dictionary`2')
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
}

/**
 * Variable declaration
 */
export interface VariableDeclaration extends ASTNode {
  type: 'VariableDeclaration';
  name: string;
  dataType: DataType;
  isTemporary?: boolean;
  isInDataSet?: boolean;
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

export interface ParameterDeclaration extends ASTNode {
  type: 'ParameterDeclaration';
  name: string;
  dataType: DataType;
  isVar: boolean;  // VAR parameter (pass by reference)
  isTemporary: boolean;  // TEMPORARY parameter modifier
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
  variable: Identifier;
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

export interface ArrayAccessExpression extends Expression {
  type: 'ArrayAccessExpression';
  array: Expression;
  index: Expression;
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
