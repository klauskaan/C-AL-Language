/**
 * Token types for C/AL lexer
 */
export enum TokenType {
  // Literals
  Identifier = 'IDENTIFIER',
  QuotedIdentifier = 'QUOTED_IDENTIFIER',
  Integer = 'INTEGER',
  Decimal = 'DECIMAL',
  String = 'STRING',
  Date = 'DATE',
  Time = 'TIME',
  DateTime = 'DATETIME',

  // Keywords - Object Types
  Object = 'OBJECT',
  Table = 'TABLE',
  Page = 'PAGE',
  Report = 'REPORT',
  Codeunit = 'CODEUNIT',
  Query = 'QUERY',
  XMLport = 'XMLPORT',
  MenuSuite = 'MENUSUITE',

  // Keywords - Sections
  ObjectProperties = 'OBJECT_PROPERTIES',
  Properties = 'PROPERTIES',
  Fields = 'FIELDS',
  Keys = 'KEYS',
  FieldGroups = 'FIELDGROUPS',
  Code = 'CODE',
  Controls = 'CONTROLS',
  Actions = 'ACTIONS',
  DataItems = 'DATAITEMS',
  Elements = 'ELEMENTS',
  RequestForm = 'REQUESTFORM',

  // Keywords - Data Types
  Boolean = 'BOOLEAN',
  Integer_Type = 'INTEGER_TYPE',
  Decimal_Type = 'DECIMAL_TYPE',
  Text = 'TEXT',
  Code_Type = 'CODE_TYPE',
  Date_Type = 'DATE_TYPE',
  Time_Type = 'TIME_TYPE',
  DateTime_Type = 'DATETIME_TYPE',
  Record = 'RECORD',
  RecordID = 'RECORDID',
  RecordRef = 'RECORDREF',
  FieldRef = 'FIELDREF',
  BigInteger = 'BIGINTEGER',
  BigText = 'BIGTEXT',
  BLOB = 'BLOB',
  GUID = 'GUID',
  Duration = 'DURATION',
  Option = 'OPTION',
  Char = 'CHAR',
  Byte = 'BYTE',
  TextConst = 'TEXTCONST',

  // Keywords - Control Flow
  If = 'IF',
  Then = 'THEN',
  Else = 'ELSE',
  Case = 'CASE',
  Of = 'OF',
  While = 'WHILE',
  Do = 'DO',
  Repeat = 'REPEAT',
  Until = 'UNTIL',
  For = 'FOR',
  To = 'TO',
  DownTo = 'DOWNTO',
  Exit = 'EXIT',
  Break = 'BREAK',

  // Keywords - Procedure/Function
  Procedure = 'PROCEDURE',
  Function = 'FUNCTION',
  Local = 'LOCAL',
  Var = 'VAR',
  Trigger = 'TRIGGER',

  // Keywords - Blocks
  Begin = 'BEGIN',
  End = 'END',

  // Keywords - Boolean
  True = 'TRUE',
  False = 'FALSE',

  // Keywords - Other
  Div = 'DIV',
  Mod = 'MOD',
  And = 'AND',
  Or = 'OR',
  Not = 'NOT',
  Xor = 'XOR',
  In = 'IN',
  With = 'WITH',
  Array = 'ARRAY',
  Temporary = 'TEMPORARY',
  InDataSet = 'INDATASET',
  RunOnClient = 'RUNONCLIENT',
  WithEvents = 'WITHEVENTS',
  /** SECURITYFILTERING modifier (NAV 2013 R2+) for Record/Query variables */
  SecurityFiltering = 'SECURITYFILTERING',

  // Operators
  Plus = 'PLUS',              // +
  Minus = 'MINUS',            // -
  Multiply = 'MULTIPLY',      // *
  Divide = 'DIVIDE',          // /
  Assign = 'ASSIGN',          // :=
  PlusAssign = 'PLUS_ASSIGN', // +=
  MinusAssign = 'MINUS_ASSIGN', // -=
  MultiplyAssign = 'MULTIPLY_ASSIGN', // *=
  DivideAssign = 'DIVIDE_ASSIGN', // /=
  Equal = 'EQUAL',            // =
  NotEqual = 'NOT_EQUAL',     // <>
  Less = 'LESS',              // <
  LessEqual = 'LESS_EQUAL',   // <=
  Greater = 'GREATER',        // >
  GreaterEqual = 'GREATER_EQUAL', // >=
  Dot = 'DOT',                // .
  DotDot = 'DOTDOT',          // ..
  Comma = 'COMMA',            // ,
  Semicolon = 'SEMICOLON',    // ;
  Colon = 'COLON',            // :
  DoubleColon = 'DOUBLE_COLON', // ::

  // Delimiters
  LeftParen = 'LEFT_PAREN',   // (
  RightParen = 'RIGHT_PAREN', // )
  LeftBracket = 'LEFT_BRACKET', // [
  RightBracket = 'RIGHT_BRACKET', // ]
  LeftBrace = 'LEFT_BRACE',   // {
  RightBrace = 'RIGHT_BRACE', // }

  // Special
  Comment = 'COMMENT',
  Whitespace = 'WHITESPACE',
  NewLine = 'NEWLINE',
  EOF = 'EOF',
  Unknown = 'UNKNOWN',

  // AL-Only Features (not supported in C/AL)
  ALOnlyKeyword = 'AL_ONLY_KEYWORD',
  ALOnlyAccessModifier = 'AL_ONLY_ACCESS_MODIFIER',
  TernaryOperator = 'TERNARY_OPERATOR',       // ? (ternary operator not supported in C/AL)
  PreprocessorDirective = 'PREPROCESSOR_DIRECTIVE'  // #if, #else, #endif not supported in C/AL
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  startOffset: number;
  endOffset: number;
}

/**
 * C/AL keywords mapped to token types (case-insensitive)
 */
export const KEYWORDS: Map<string, TokenType> = new Map([
  // Object types
  ['object', TokenType.Object],
  ['table', TokenType.Table],
  ['page', TokenType.Page],
  ['report', TokenType.Report],
  ['codeunit', TokenType.Codeunit],
  ['query', TokenType.Query],
  ['xmlport', TokenType.XMLport],
  ['menusuite', TokenType.MenuSuite],

  // Sections
  ['properties', TokenType.Properties],
  ['fields', TokenType.Fields],
  ['keys', TokenType.Keys],
  ['fieldgroups', TokenType.FieldGroups],
  ['code', TokenType.Code],
  ['controls', TokenType.Controls],
  ['actions', TokenType.Actions],
  ['dataitems', TokenType.DataItems],
  ['elements', TokenType.Elements],
  ['requestform', TokenType.RequestForm],

  // Data types
  ['boolean', TokenType.Boolean],
  ['integer', TokenType.Integer_Type],
  ['decimal', TokenType.Decimal_Type],
  ['text', TokenType.Text],
  ['date', TokenType.Date_Type],
  ['time', TokenType.Time_Type],
  ['datetime', TokenType.DateTime_Type],
  ['record', TokenType.Record],
  ['recordid', TokenType.RecordID],
  ['recordref', TokenType.RecordRef],
  ['fieldref', TokenType.FieldRef],
  ['biginteger', TokenType.BigInteger],
  ['bigtext', TokenType.BigText],
  ['blob', TokenType.BLOB],
  ['guid', TokenType.GUID],
  ['duration', TokenType.Duration],
  ['option', TokenType.Option],
  ['char', TokenType.Char],
  ['byte', TokenType.Byte],
  ['textconst', TokenType.TextConst],

  // Control flow
  ['if', TokenType.If],
  ['then', TokenType.Then],
  ['else', TokenType.Else],
  ['case', TokenType.Case],
  ['of', TokenType.Of],
  ['while', TokenType.While],
  ['do', TokenType.Do],
  ['repeat', TokenType.Repeat],
  ['until', TokenType.Until],
  ['for', TokenType.For],
  ['to', TokenType.To],
  ['downto', TokenType.DownTo],
  ['exit', TokenType.Exit],
  ['break', TokenType.Break],

  // Procedure/Function
  ['procedure', TokenType.Procedure],
  ['function', TokenType.Function],
  ['local', TokenType.Local],
  ['var', TokenType.Var],
  ['trigger', TokenType.Trigger],

  // Blocks
  ['begin', TokenType.Begin],
  ['end', TokenType.End],

  // Boolean
  ['true', TokenType.True],
  ['false', TokenType.False],

  // Other
  ['div', TokenType.Div],
  ['mod', TokenType.Mod],
  ['and', TokenType.And],
  ['or', TokenType.Or],
  ['not', TokenType.Not],
  ['xor', TokenType.Xor],
  ['in', TokenType.In],
  ['with', TokenType.With],
  ['array', TokenType.Array],
  ['temporary', TokenType.Temporary],
  ['indataset', TokenType.InDataSet],
  ['runonclient', TokenType.RunOnClient],
  ['withevents', TokenType.WithEvents],
  ['securityfiltering', TokenType.SecurityFiltering]
]);

/**
 * AL-only keywords that are NOT supported in C/AL (case-insensitive)
 * These keywords exist in modern AL (Business Central) but not in C/AL (NAV)
 */
export const AL_ONLY_KEYWORDS: Map<string, TokenType> = new Map([
  ['enum', TokenType.ALOnlyKeyword],
  ['interface', TokenType.ALOnlyKeyword],
  ['extends', TokenType.ALOnlyKeyword],
  ['implements', TokenType.ALOnlyKeyword]
]);

/**
 * AL-only access modifiers that are NOT supported in C/AL (case-insensitive)
 * In C/AL, only LOCAL is valid for procedure visibility
 */
export const AL_ONLY_ACCESS_MODIFIERS: Map<string, TokenType> = new Map([
  ['internal', TokenType.ALOnlyAccessModifier],
  ['protected', TokenType.ALOnlyAccessModifier],
  ['public', TokenType.ALOnlyAccessModifier]
]);
