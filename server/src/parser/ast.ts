import { Token } from '../lexer/tokens';

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
export interface CALDocument {
  type: 'CALDocument';
  startToken: Token;
  endToken: Token;
  object: ObjectDeclaration | null;
}

/**
 * Object declaration (OBJECT Table 18 Customer)
 */
export interface ObjectDeclaration {
  type: 'ObjectDeclaration';
  startToken: Token;
  endToken: Token;
  objectKind: ObjectKind;
  objectId: number;
  objectName: string;
  properties: PropertySection | null;
  fields: FieldSection | null;
  keys: KeySection | null;
  fieldGroups: FieldGroupSection | null;
  actions: ActionSection | null;
  controls: ControlSection | null;
  elements: ElementsSection | null;
  code: CodeSection | null;
}

/**
 * PROPERTIES section
 */
export interface PropertySection {
  type: 'PropertySection';
  startToken: Token;
  endToken: Token;
  properties: Property[];
}

export interface Property {
  type: 'Property';
  startToken: Token;
  endToken: Token;
  name: string;
  value: string;
  /** For property triggers (OnRun, OnValidate, etc.), stores the parsed trigger body */
  triggerBody?: Statement[];
  /** Variables declared in property trigger VAR section (rare but possible) */
  triggerVariables?: VariableDeclaration[];
  /** Original tokens captured during property value parsing.
   * Preserves exact positions and token types (including QuotedIdentifier).
   * Used by mini-parsers for accurate parsing with position tracking.
   * Not populated for trigger properties (which use triggerBody instead). */
  valueTokens?: Token[];
  /** Parsed CalcFormula structure (for CalcFormula properties) */
  calcFormula?: CalcFormulaNode;
  /** Parsed TableRelation structure (for TableRelation properties) */
  tableRelation?: TableRelationNode;
}

/**
 * CalcFormula parsed structure
 *
 * Represents a parsed CalcFormula property value, which defines a FlowField calculation.
 *
 * @example
 * CalcFormula=Sum("Customer Ledger Entry".Amount WHERE ("Customer No."=FIELD("No.")))
 * // Produces:
 * {
 *   type: 'CalcFormulaNode',
 *   aggregationFunction: 'Sum',
 *   sourceTable: 'Customer Ledger Entry',
 *   sourceField: 'Amount',
 *   whereClause: { conditions: [...] }
 * }
 *
 * @example
 * CalcFormula=Count("Sales Line")
 * // Produces:
 * {
 *   type: 'CalcFormulaNode',
 *   aggregationFunction: 'Count',
 *   sourceTable: 'Sales Line',
 *   sourceField: undefined  // Count doesn't require a field
 * }
 */
export interface CalcFormulaNode {
  type: 'CalcFormulaNode';
  startToken: Token;
  endToken: Token;
  /** Aggregation function: Sum, Count, Lookup, Exist, Min, Max, Average */
  aggregationFunction: 'Sum' | 'Count' | 'Lookup' | 'Exist' | 'Min' | 'Max' | 'Average';
  /** Source table name (quoted or unquoted) */
  sourceTable: string;
  /** Source field name (required for Sum/Lookup/Min/Max/Average, not for Count/Exist) */
  sourceField?: string;
  /** Optional WHERE clause filtering the source table */
  whereClause?: WhereClauseNode;
}

/**
 * TableRelation parsed structure
 *
 * Represents a parsed TableRelation property value, which defines field validation/lookup.
 *
 * @example
 * TableRelation=Customer
 * // Produces:
 * {
 *   type: 'TableRelationNode',
 *   tableName: 'Customer',
 *   fieldName: undefined,
 *   whereClause: undefined,
 *   conditionalRelations: undefined
 * }
 *
 * @example
 * TableRelation="G/L Account"."No." WHERE (Blocked=CONST(No))
 * // Produces:
 * {
 *   type: 'TableRelationNode',
 *   tableName: 'G/L Account',
 *   fieldName: 'No.',
 *   whereClause: { conditions: [...] },
 *   conditionalRelations: undefined
 * }
 *
 * @example
 * TableRelation=IF (Type=CONST(Item)) Item ELSE Resource
 * // Produces:
 * {
 *   type: 'TableRelationNode',
 *   tableName: undefined,  // No unconditional relation
 *   conditionalRelations: [
 *     {
 *       condition: { fieldName: 'Type', operator: '=', predicateType: 'CONST', predicateValue: 'Item' },
 *       thenRelation: { tableName: 'Item', ... },
 *       elseRelation: { tableName: 'Resource', ... }
 *     }
 *   ]
 * }
 */
export interface TableRelationNode {
  type: 'TableRelationNode';
  startToken: Token;
  endToken: Token;
  /** Target table name (for simple, unconditional relations) */
  tableName?: string;
  /** Qualified field name (e.g., "No." in Customer."No.") */
  fieldName?: string;
  /** Optional WHERE clause filtering the target table */
  whereClause?: WhereClauseNode;
  /** Conditional relations (IF/ELSE clauses) */
  conditionalRelations?: ConditionalTableRelation[];
}

/**
 * Conditional table relation (IF/ELSE structure)
 *
 * Represents an IF condition in a TableRelation property.
 *
 * @example
 * IF (Type=CONST(Item)) Item ELSE Resource
 * // Produces:
 * {
 *   type: 'ConditionalTableRelation',
 *   condition: { fieldName: 'Type', operator: '=', predicateType: 'CONST', predicateValue: 'Item' },
 *   thenRelation: { tableName: 'Item', ... },
 *   elseRelation: { tableName: 'Resource', ... }
 * }
 *
 * @example
 * IF (Type=CONST(G/L Account)) "G/L Account" ELSE IF (Type=CONST(Item)) Item ELSE Resource
 * // Produces multiple ConditionalTableRelation nodes in array:
 * [
 *   { condition: {...G/L Account...}, thenRelation: {...}, elseRelation: undefined },
 *   { condition: {...Item...}, thenRelation: {...}, elseRelation: {...Resource...} }
 * ]
 */
export interface ConditionalTableRelation {
  type: 'ConditionalTableRelation';
  startToken: Token;
  endToken: Token;
  /** The condition to test (e.g., Type=CONST(Item)) */
  condition: WhereConditionNode;
  /** The table relation if condition is true */
  thenRelation: TableRelationNode;
  /** The table relation if condition is false (optional ELSE clause) */
  elseRelation?: TableRelationNode;
}

/**
 * WHERE clause containing one or more conditions
 *
 * Represents a WHERE clause in CalcFormula or TableRelation.
 *
 * @example
 * WHERE ("Customer No."=FIELD("No."), "Posting Date"=FIELD("Date Filter"))
 * // Produces:
 * {
 *   type: 'WhereClauseNode',
 *   conditions: [
 *     { fieldName: 'Customer No.', operator: '=', predicateType: 'FIELD', predicateValue: 'No.' },
 *     { fieldName: 'Posting Date', operator: '=', predicateType: 'FIELD', predicateValue: 'Date Filter' }
 *   ]
 * }
 */
export interface WhereClauseNode {
  type: 'WhereClauseNode';
  startToken: Token;
  endToken: Token;
  /** Array of WHERE conditions (comma-separated in source) */
  conditions: WhereConditionNode[];
}

/**
 * Individual WHERE condition
 *
 * Represents a single condition in a WHERE clause.
 *
 * Predicate types:
 * - FIELD: Value comes from another field (e.g., FIELD("No."))
 * - CONST: Constant value (e.g., CONST(Item))
 * - FILTER: Filter expression (e.g., FILTER('1000..9999'))
 *
 * @example
 * "Customer No."=FIELD("No.")
 * // Produces:
 * {
 *   type: 'WhereConditionNode',
 *   fieldName: 'Customer No.',
 *   operator: '=',
 *   predicateType: 'FIELD',
 *   predicateValue: 'No.'
 * }
 *
 * @example
 * Type=CONST(Item)
 * // Produces:
 * {
 *   type: 'WhereConditionNode',
 *   fieldName: 'Type',
 *   operator: '=',
 *   predicateType: 'CONST',
 *   predicateValue: 'Item'
 * }
 *
 * @example
 * "G/L Account No."=FILTER('1000..9999')
 * // Produces:
 * {
 *   type: 'WhereConditionNode',
 *   fieldName: 'G/L Account No.',
 *   operator: '=',
 *   predicateType: 'FILTER',
 *   predicateValue: '1000..9999'
 * }
 */
export interface WhereConditionNode {
  type: 'WhereConditionNode';
  startToken: Token;
  endToken: Token;
  /** Field name being tested (can be quoted or unquoted) */
  fieldName: string;
  /** Comparison operator (typically '=' but could be '<>', '>', '<', etc.) */
  operator: string;
  /** Type of predicate: FIELD, CONST, or FILTER */
  predicateType: 'FIELD' | 'CONST' | 'FILTER';
  /** Value inside the predicate function (e.g., "No." for FIELD("No.")) */
  predicateValue: string;
}

/**
 * FIELDS section
 */
export interface FieldSection {
  type: 'FieldSection';
  startToken: Token;
  endToken: Token;
  fields: FieldDeclaration[];
}

export interface FieldDeclaration {
  type: 'FieldDeclaration';
  startToken: Token;
  endToken: Token;
  fieldNo: number;
  fieldClass: string;  // Reserved column - always empty in NAV exports
  fieldName: string;
  nameToken?: Token;  // First token of field name (QuotedIdentifier or first token of unquoted name)
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
export interface DataType {
  type: 'DataType';
  startToken: Token;
  endToken: Token;

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

  /** Type Library GUID for Automation types (e.g., "F935DC20-1CF0-11D0-ADB9-00C04FD58A0B") */
  automationTypeLibGuid?: string;

  /** Version string for Automation types (e.g., "1.0", "3.0") */
  automationVersion?: string;

  /** Class GUID for Automation types (e.g., "0D43FE01-F093-11CF-8940-00A0C9054228") */
  automationClassGuid?: string;

  /** Type Library Name for Automation types (e.g., "Windows Script Host Object Model") */
  automationTypeLibName?: string;

  /** Class Name for Automation types (e.g., "FileSystemObject") */
  automationClassName?: string;
}

/**
 * KEYS section
 */
export interface KeySection {
  type: 'KeySection';
  startToken: Token;
  endToken: Token;
  keys: KeyDeclaration[];
}

export interface KeyDeclaration {
  type: 'KeyDeclaration';
  startToken: Token;
  endToken: Token;
  fields: string[];
  properties: PropertySection | null;
}

/**
 * FIELDGROUPS section
 */
export interface FieldGroupSection {
  type: 'FieldGroupSection';
  startToken: Token;
  endToken: Token;
  fieldGroups: FieldGroup[];
}

export interface FieldGroup {
  type: 'FieldGroup';
  startToken: Token;
  endToken: Token;
  id: number;
  name: string;
  fields: string[];
}

/**
 * Action types in C/AL ACTIONS sections
 */
export type ActionType = 'ActionContainer' | 'ActionGroup' | 'Action' | 'Separator';

/**
 * Control types in C/AL CONTROLS sections
 */
export type ControlType = 'Container' | 'Group' | 'Field' | 'Part' | 'Separator';

/**
 * XMLport node types (column 4 in ELEMENTS section)
 */
export type XMLportNodeType = 'Element' | 'Attribute';

/**
 * XMLport source types (column 5 in ELEMENTS section)
 */
export type XMLportSourceType = 'Text' | 'Table' | 'Field';

/**
 * ACTIONS section containing UI action definitions
 */
export interface ActionSection {
  type: 'ActionSection';
  startToken: Token;
  endToken: Token;
  actions: ActionDeclaration[];
}

/**
 * Individual action declaration within ACTIONS section
 * Format: { ID;IndentLevel;Type; Properties [Triggers] }
 */
export interface ActionDeclaration {
  type: 'ActionDeclaration';
  startToken: Token;
  endToken: Token;
  id: number;
  indentLevel: number;
  actionType: ActionType;
  rawActionType?: string;
  properties: PropertySection | null;
  triggers: TriggerDeclaration[] | null;
  children: ActionDeclaration[];
}

/**
 * ELEMENTS section containing XMLport element definitions
 */
export interface ElementsSection {
  type: 'ElementsSection';
  startToken: Token;
  endToken: Token;
  elements: XMLportElement[];  // Top-level elements (indentLevel 0 or first level)
}

/**
 * Individual XMLport element declaration within ELEMENTS section
 * Format: { [{GUID}];IndentLevel;ElementName;NodeType;SourceType; Properties [Triggers] }
 */
export interface XMLportElement {
  type: 'XMLportElement';
  startToken: Token;
  endToken: Token;
  guid: string;
  indentLevel: number;
  name: string;
  nodeType: XMLportNodeType;
  sourceType: XMLportSourceType;
  properties: PropertySection | null;
  triggers: TriggerDeclaration[] | null;
  children: XMLportElement[];  // Populated from indentLevel hierarchy
}

/**
 * CONTROLS section containing UI control definitions
 */
export interface ControlSection {
  type: 'ControlSection';
  startToken: Token;
  endToken: Token;
  controls: ControlDeclaration[];
}

/**
 * Individual control declaration within CONTROLS section
 * Format: { ID;IndentLevel;Type; Properties [Triggers] }
 */
export interface ControlDeclaration {
  type: 'ControlDeclaration';
  startToken: Token;
  endToken: Token;
  id: number;
  indentLevel: number;
  controlType: ControlType;
  rawControlType?: string;
  properties: PropertySection | null;
  triggers: TriggerDeclaration[] | null;
  children: ControlDeclaration[];
}

/**
 * CODE section
 */
export interface CodeSection {
  type: 'CodeSection';
  startToken: Token;
  endToken: Token;
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
export interface VariableDeclaration extends VariableModifiers {
  type: 'VariableDeclaration';
  startToken: Token;
  endToken: Token;
  name: string;
  dataType: DataType;
}

/**
 * Procedure attribute (e.g., [External], [Scope('OnPrem')], [EventSubscriber(...)])
 */
export interface ProcedureAttribute {
  type: 'ProcedureAttribute';
  startToken: Token;
  endToken: Token;
  /** Attribute name (e.g., "External", "Scope", "EventSubscriber") */
  name: string;
  /**
   * Tokens captured after the attribute name (empty for simple attributes).
   * For parameterized attributes, includes opening '(', all argument tokens, and closing ')'.
   * Does NOT include the attribute name itself or the square brackets.
   * Example: [EventSubscriber(Page,6302,OnEvent)] → rawTokens = ['(', 'Page', ',', '6302', ',', 'OnEvent', ')']
   */
  rawTokens: Token[];
  /** True if parentheses present (e.g., [EventSubscriber(...)]) */
  hasArguments: boolean;
}

/**
 * Procedure/Function declaration
 */
export interface ProcedureDeclaration {
  type: 'ProcedureDeclaration';
  startToken: Token;
  endToken: Token;
  name: string;
  /** Token pointing to the procedure name identifier (for symbol resolution) */
  nameToken?: Token;
  parameters: ParameterDeclaration[];
  returnType: DataType | null;
  isLocal: boolean;
  variables: VariableDeclaration[];
  body: Statement[];
  /** Optional array of captured attributes (e.g., [External], [Scope('OnPrem')]) */
  attributes?: ProcedureAttribute[];
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

export interface ParameterDeclaration extends ParameterModifiers {
  type: 'ParameterDeclaration';
  startToken: Token;
  endToken: Token;
  name: string;
  dataType: DataType;
  isVar: boolean;  // VAR parameter (pass by reference)
}

/**
 * Trigger declaration (e.g., OnInsert, OnValidate)
 */
export interface TriggerDeclaration {
  type: 'TriggerDeclaration';
  startToken: Token;
  endToken: Token;
  name: string;
  variables: VariableDeclaration[];
  body: Statement[];
}

/**
 * Event declaration for DotNet control add-in event handlers
 * Syntax: EVENT SubscriberName@Number::EventName@Number(parameters);
 */
export interface EventDeclaration {
  type: 'EventDeclaration';
  startToken: Token;
  endToken: Token;
  subscriberName: string;  // e.g., "CameraProvider@1001"
  eventName: string;       // e.g., "PictureAvailable@10"
  parameters: ParameterDeclaration[];
  variables: VariableDeclaration[];
  body: Statement[];
}

/**
 * Statements
 */
export interface BlockStatement {
  type: 'BlockStatement';
  startToken: Token;
  endToken: Token;
  statements: Statement[];
}

export interface IfStatement {
  type: 'IfStatement';
  startToken: Token;
  endToken: Token;
  condition: Expression;
  thenBranch: Statement;
  elseBranch: Statement | null;
}

export interface WhileStatement {
  type: 'WhileStatement';
  startToken: Token;
  endToken: Token;
  condition: Expression;
  body: Statement;
}

export interface RepeatStatement {
  type: 'RepeatStatement';
  startToken: Token;
  endToken: Token;
  body: Statement[];
  condition: Expression;
}

export interface ForStatement {
  type: 'ForStatement';
  startToken: Token;
  endToken: Token;
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

export interface CaseStatement {
  type: 'CaseStatement';
  startToken: Token;
  endToken: Token;
  expression: Expression;
  branches: CaseBranch[];
  elseBranch: Statement[] | null;
}

export interface CaseBranch {
  type: 'CaseBranch';
  startToken: Token;
  endToken: Token;
  values: Expression[];
  statements: Statement[];
}

export interface AssignmentStatement {
  type: 'AssignmentStatement';
  startToken: Token;
  endToken: Token;
  target: Expression;
  value: Expression;
}

export interface CallStatement {
  type: 'CallStatement';
  startToken: Token;
  endToken: Token;
  expression: Expression;
}

export interface ExitStatement {
  type: 'ExitStatement';
  startToken: Token;
  endToken: Token;
  value: Expression | null;
}

/**
 * BREAK statement - exits the innermost loop.
 * Unlike EXIT, BREAK takes no value and only affects loop control flow.
 * Valid in: FOR, WHILE, REPEAT-UNTIL loops.
 * Note: Parser accepts BREAK syntactically but does not validate loop context.
 * Semantic validation (ensuring BREAK appears within a loop) is deferred.
 */
export interface BreakStatement {
  type: 'BreakStatement';
  startToken: Token;
  endToken: Token;
  // NO value field - BREAK takes no arguments (critical difference from ExitStatement)
}

/**
 * Empty statement represented by a standalone semicolon.
 * Valid in C/AL after THEN, DO, ELSE keywords: IF cond THEN; or WHILE cond DO;
 * Used when the statement body is intentionally empty (e.g., IF Rec.FINDLAST THEN;)
 */
export interface EmptyStatement {
  type: 'EmptyStatement';
  startToken: Token;
  endToken: Token;
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
export interface WithStatement {
  type: 'WithStatement';
  startToken: Token;
  endToken: Token;
  record: Expression;  // Single record variable or expression
  body: Statement;     // Block or single statement
}

/**
 * Expressions
 */
export interface Identifier {
  type: 'Identifier';
  startToken: Token;
  endToken: Token;
  name: string;
  isQuoted: boolean;
}

export interface Literal {
  type: 'Literal';
  startToken: Token;
  endToken: Token;
  value: string | number | boolean;
  literalType: 'string' | 'integer' | 'decimal' | 'boolean' | 'date' | 'time' | 'datetime';
}

export interface BinaryExpression {
  type: 'BinaryExpression';
  startToken: Token;
  endToken: Token;
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  startToken: Token;
  endToken: Token;
  operator: string;
  operand: Expression;
}

export interface MemberExpression {
  type: 'MemberExpression';
  startToken: Token;
  endToken: Token;
  object: Expression;
  property: Identifier;
}

export interface CallExpression {
  type: 'CallExpression';
  startToken: Token;
  endToken: Token;
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
export interface ArrayAccessExpression {
  type: 'ArrayAccessExpression';
  startToken: Token;
  endToken: Token;
  /** The array being accessed */
  array: Expression;
  /**
   * Array indices for single or multi-dimensional access.
   * For `arr[i,j,k]`, this contains [i, j, k].
   * @since 0.4.7 - Changed from singular `index: Expression` to support multi-dimensional arrays
   */
  indices: Expression[];
}

export interface SetLiteral {
  type: 'SetLiteral';
  startToken: Token;
  endToken: Token;
  elements: (Expression | RangeExpression)[];
}

export interface RangeExpression {
  type: 'RangeExpression';
  startToken: Token;
  endToken: Token;
  start: Expression | null;
  end: Expression | null;
  operatorToken?: Token;
}

/**
 * Union type for all Statement nodes
 */
export type Statement = BlockStatement | IfStatement | WhileStatement | RepeatStatement | ForStatement | CaseStatement | AssignmentStatement | CallStatement | ExitStatement | BreakStatement | EmptyStatement | WithStatement;

/**
 * Union type for all Expression nodes
 */
export type Expression = Identifier | Literal | BinaryExpression | UnaryExpression | MemberExpression | CallExpression | ArrayAccessExpression | SetLiteral | RangeExpression;

/**
 * Union type for all AST nodes
 */
export type ASTNode = CALDocument | ObjectDeclaration | PropertySection | FieldSection | KeySection | FieldGroupSection | ActionSection | ControlSection | ElementsSection | CodeSection | Property | FieldDeclaration | KeyDeclaration | FieldGroup | ActionDeclaration | ControlDeclaration | XMLportElement | VariableDeclaration | ProcedureDeclaration | ProcedureAttribute | ParameterDeclaration | TriggerDeclaration | EventDeclaration | DataType | CaseBranch | CalcFormulaNode | TableRelationNode | ConditionalTableRelation | WhereClauseNode | WhereConditionNode | Statement | Expression;
