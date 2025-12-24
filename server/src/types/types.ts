/**
 * Semantic Type System for C/AL Language Server
 *
 * This module defines the semantic type hierarchy used for type checking,
 * diagnostics, and intelligent code assistance. Unlike the syntactic DataType
 * AST node which stores type information as strings, these interfaces provide
 * rich semantic meaning for each type category.
 *
 * The type system uses a discriminated union pattern with 'kind' as the
 * discriminator field (distinct from AST's 'type' field to avoid confusion).
 */

/**
 * Union of all possible type kinds in the C/AL type system.
 *
 * - 'primitive': Built-in simple types (Integer, Decimal, Boolean, etc.)
 * - 'record': Table record types with tableId and metadata
 * - 'array': Array types with element type and dimensions
 * - 'option': Enumeration types with string values
 * - 'codeunit': Codeunit object references
 * - 'text': Text and Code string types with length constraints
 * - 'unknown': Fallback for unrecognized or invalid types
 */
export type TypeKind =
  | 'primitive'
  | 'record'
  | 'array'
  | 'option'
  | 'codeunit'
  | 'text'
  | 'unknown';

/**
 * Base interface for all semantic types in the C/AL type system.
 *
 * All specialized type interfaces extend this base and narrow the 'kind'
 * field to a specific string literal. This enables TypeScript's type
 * narrowing when checking the kind field.
 *
 * @example
 * function handleType(type: Type) {
 *   if (type.kind === 'primitive') {
 *     // TypeScript knows type is PrimitiveType here
 *     console.log(type.name);
 *   }
 * }
 */
export interface Type {
  /**
   * Discriminator field identifying the specific type variant.
   * Used for TypeScript type narrowing in switch statements and conditionals.
   */
  kind: TypeKind;
}

/**
 * Enumeration of all primitive type names in C/AL.
 *
 * These are the built-in simple types that do not require additional
 * configuration or references to other objects.
 */
export enum PrimitiveName {
  Integer = 'Integer',
  Decimal = 'Decimal',
  Boolean = 'Boolean',
  Date = 'Date',
  Time = 'Time',
  DateTime = 'DateTime',
  Char = 'Char',
  Byte = 'Byte',
  GUID = 'GUID',
  Duration = 'Duration',
  BigInteger = 'BigInteger'
}

/**
 * Represents a primitive (built-in simple) type in C/AL.
 *
 * Primitive types are the fundamental building blocks of the type system.
 * They have no additional configuration beyond their name and represent
 * simple values like numbers, booleans, and date/time values.
 *
 * @example
 * const intType: PrimitiveType = {
 *   kind: 'primitive',
 *   name: PrimitiveName.Integer
 * };
 *
 * @example
 * function isPrimitiveType(type: Type): type is PrimitiveType {
 *   return type.kind === 'primitive';
 * }
 */
export interface PrimitiveType extends Type {
  /**
   * Discriminator indicating this is a primitive type.
   */
  kind: 'primitive';

  /**
   * The specific primitive type name.
   */
  name: PrimitiveName;
}

/**
 * Represents a record (table) type in C/AL.
 *
 * Record types reference a specific table and can be marked as temporary.
 * Temporary records exist only in memory and are not persisted to the database.
 * The tableId and tableName provide the link to the table definition.
 *
 * @example
 * const customerRec: RecordType = {
 *   kind: 'record',
 *   tableId: 18,
 *   tableName: 'Customer',
 *   isTemporary: false
 * };
 *
 * @example
 * function isRecordType(type: Type): type is RecordType {
 *   return type.kind === 'record';
 * }
 */
export interface RecordType extends Type {
  /**
   * Discriminator indicating this is a record type.
   */
  kind: 'record';

  /**
   * The object ID of the referenced table.
   * This corresponds to the table number in the object definition.
   */
  tableId: number;

  /**
   * The name of the referenced table.
   * Used for display purposes and symbol resolution.
   */
  tableName: string;

  /**
   * Whether this record is temporary (in-memory only).
   * Temporary records are not persisted to the database.
   */
  isTemporary: boolean;
}

/**
 * Represents an array type in C/AL.
 *
 * Array types contain elements of a specific type and can have one or more
 * dimensions. C/AL supports multi-dimensional arrays with fixed bounds.
 * The elementType can be any valid Type, allowing for arrays of primitives,
 * records, or even nested arrays.
 *
 * @example
 * const intArray: ArrayType = {
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 *   dimensions: [10]
 * };
 *
 * @example
 * const matrix: ArrayType = {
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Decimal },
 *   dimensions: [3, 3]
 * };
 *
 * @example
 * function isArrayType(type: Type): type is ArrayType {
 *   return type.kind === 'array';
 * }
 */
export interface ArrayType extends Type {
  /**
   * Discriminator indicating this is an array type.
   */
  kind: 'array';

  /**
   * The type of elements contained in the array.
   * Can be any valid Type including primitives, records, or nested arrays.
   */
  elementType: Type;

  /**
   * The dimensions of the array.
   * Each number represents the size of that dimension.
   * Single-dimensional arrays have one element, multi-dimensional have multiple.
   */
  dimensions: number[];
}

/**
 * Represents an option (enumeration) type in C/AL.
 *
 * Option types define a fixed set of named values. In C/AL, options are
 * defined as comma-separated strings and internally stored as integers
 * starting from 0. The values array preserves the order and names of
 * the option members.
 *
 * @example
 * const statusOption: OptionType = {
 *   kind: 'option',
 *   values: ['Open', 'Released', 'Pending Approval', 'Pending Prepayment']
 * };
 *
 * @example
 * const booleanLikeOption: OptionType = {
 *   kind: 'option',
 *   values: ['No', 'Yes']
 * };
 *
 * @example
 * function isOptionType(type: Type): type is OptionType {
 *   return type.kind === 'option';
 * }
 */
export interface OptionType extends Type {
  /**
   * Discriminator indicating this is an option type.
   */
  kind: 'option';

  /**
   * The ordered list of option values.
   * The index of each value corresponds to its integer representation.
   * First value is 0, second is 1, etc.
   */
  values: string[];
}

/**
 * Represents a text or code string type in C/AL.
 *
 * Text types store character strings with optional maximum length constraints.
 * C/AL distinguishes between Text (general purpose) and Code (uppercase,
 * trailing spaces removed) types, both represented by this interface.
 * The isCode flag differentiates between the two variants.
 *
 * @example
 * const customerName: TextType = {
 *   kind: 'text',
 *   maxLength: 100,
 *   isCode: false
 * };
 *
 * @example
 * const itemNo: TextType = {
 *   kind: 'text',
 *   maxLength: 20,
 *   isCode: true
 * };
 *
 * @example
 * const unlimitedText: TextType = {
 *   kind: 'text',
 *   maxLength: undefined,
 *   isCode: false
 * };
 *
 * @example
 * function isTextType(type: Type): type is TextType {
 *   return type.kind === 'text';
 * }
 */
export interface TextType extends Type {
  /**
   * Discriminator indicating this is a text type.
   */
  kind: 'text';

  /**
   * The maximum length of the text field.
   * Undefined indicates no length constraint (BigText or unlimited).
   */
  maxLength: number | undefined;

  /**
   * Whether this is a Code type (true) or Text type (false).
   * Code types are automatically converted to uppercase and have
   * trailing spaces removed.
   */
  isCode: boolean;
}

/**
 * Represents a codeunit object reference type in C/AL.
 *
 * Codeunit types reference a specific codeunit object that can be
 * instantiated and have its procedures called. The codeunitId and
 * codeunitName provide the link to the codeunit definition.
 *
 * @example
 * const salesPost: CodeunitType = {
 *   kind: 'codeunit',
 *   codeunitId: 80,
 *   codeunitName: 'Sales-Post'
 * };
 *
 * @example
 * const codeunitRef: CodeunitType = {
 *   kind: 'codeunit',
 *   codeunitId: 1,
 *   codeunitName: 'Application Management'
 * };
 *
 * @example
 * function isCodeunitType(type: Type): type is CodeunitType {
 *   return type.kind === 'codeunit';
 * }
 */
export interface CodeunitType extends Type {
  /**
   * Discriminator indicating this is a codeunit type.
   */
  kind: 'codeunit';

  /**
   * The object ID of the referenced codeunit.
   * This corresponds to the codeunit number in the object definition.
   */
  codeunitId: number;

  /**
   * The name of the referenced codeunit.
   * Used for display purposes and symbol resolution.
   */
  codeunitName: string;
}

/**
 * Represents an unknown or unresolved type in C/AL.
 *
 * Unknown types are used as a fallback when a type cannot be determined
 * or resolved. This can occur with invalid type references, forward
 * references that haven't been resolved, or types from external sources.
 * The optional reason field provides context for why the type is unknown.
 *
 * @example
 * const unresolved: UnknownType = {
 *   kind: 'unknown',
 *   reason: 'Table 99999 not found in workspace'
 * };
 *
 * @example
 * const parseError: UnknownType = {
 *   kind: 'unknown',
 *   reason: 'Invalid type syntax'
 * };
 *
 * @example
 * function isUnknownType(type: Type): type is UnknownType {
 *   return type.kind === 'unknown';
 * }
 */
export interface UnknownType extends Type {
  /**
   * Discriminator indicating this is an unknown type.
   */
  kind: 'unknown';

  /**
   * Optional reason explaining why the type is unknown.
   * Useful for error messages and diagnostics.
   */
  reason?: string;
}

// ============================================================================
// Type Guard Functions
// ============================================================================
// These type guards enable runtime type checking and TypeScript type narrowing.
// Use them in conditionals to safely access type-specific properties.

/**
 * Type guard to check if a Type is a PrimitiveType.
 *
 * Use this function to narrow a Type to PrimitiveType and access
 * primitive-specific properties like `name`.
 *
 * @param type - The type to check
 * @returns True if the type is a PrimitiveType
 *
 * @example
 * function processType(type: Type) {
 *   if (isPrimitiveType(type)) {
 *     // TypeScript knows type is PrimitiveType here
 *     console.log(`Primitive: ${type.name}`);
 *   }
 * }
 */
export function isPrimitiveType(type: Type): type is PrimitiveType {
  return type.kind === 'primitive';
}

/**
 * Type guard to check if a Type is a RecordType.
 *
 * Use this function to narrow a Type to RecordType and access
 * record-specific properties like `tableId`, `tableName`, and `isTemporary`.
 *
 * @param type - The type to check
 * @returns True if the type is a RecordType
 *
 * @example
 * function processType(type: Type) {
 *   if (isRecordType(type)) {
 *     // TypeScript knows type is RecordType here
 *     console.log(`Table: ${type.tableName} (ID: ${type.tableId})`);
 *   }
 * }
 */
export function isRecordType(type: Type): type is RecordType {
  return type.kind === 'record';
}

/**
 * Type guard to check if a Type is an ArrayType.
 *
 * Use this function to narrow a Type to ArrayType and access
 * array-specific properties like `elementType` and `dimensions`.
 *
 * @param type - The type to check
 * @returns True if the type is an ArrayType
 *
 * @example
 * function processType(type: Type) {
 *   if (isArrayType(type)) {
 *     // TypeScript knows type is ArrayType here
 *     console.log(`Array with ${type.dimensions.length} dimension(s)`);
 *   }
 * }
 */
export function isArrayType(type: Type): type is ArrayType {
  return type.kind === 'array';
}

/**
 * Type guard to check if a Type is an OptionType.
 *
 * Use this function to narrow a Type to OptionType and access
 * option-specific properties like `values`.
 *
 * @param type - The type to check
 * @returns True if the type is an OptionType
 *
 * @example
 * function processType(type: Type) {
 *   if (isOptionType(type)) {
 *     // TypeScript knows type is OptionType here
 *     console.log(`Options: ${type.values.join(', ')}`);
 *   }
 * }
 */
export function isOptionType(type: Type): type is OptionType {
  return type.kind === 'option';
}

/**
 * Type guard to check if a Type is a TextType.
 *
 * Use this function to narrow a Type to TextType and access
 * text-specific properties like `maxLength` and `isCode`.
 *
 * @param type - The type to check
 * @returns True if the type is a TextType
 *
 * @example
 * function processType(type: Type) {
 *   if (isTextType(type)) {
 *     // TypeScript knows type is TextType here
 *     const typeKind = type.isCode ? 'Code' : 'Text';
 *     console.log(`${typeKind}[${type.maxLength ?? 'unlimited'}]`);
 *   }
 * }
 */
export function isTextType(type: Type): type is TextType {
  return type.kind === 'text';
}

/**
 * Type guard to check if a Type is a CodeunitType.
 *
 * Use this function to narrow a Type to CodeunitType and access
 * codeunit-specific properties like `codeunitId` and `codeunitName`.
 *
 * @param type - The type to check
 * @returns True if the type is a CodeunitType
 *
 * @example
 * function processType(type: Type) {
 *   if (isCodeunitType(type)) {
 *     // TypeScript knows type is CodeunitType here
 *     console.log(`Codeunit: ${type.codeunitName} (ID: ${type.codeunitId})`);
 *   }
 * }
 */
export function isCodeunitType(type: Type): type is CodeunitType {
  return type.kind === 'codeunit';
}

/**
 * Type guard to check if a Type is an UnknownType.
 *
 * Use this function to narrow a Type to UnknownType and access
 * unknown-specific properties like `reason`.
 *
 * @param type - The type to check
 * @returns True if the type is an UnknownType
 *
 * @example
 * function processType(type: Type) {
 *   if (isUnknownType(type)) {
 *     // TypeScript knows type is UnknownType here
 *     console.log(`Unknown type: ${type.reason ?? 'no reason given'}`);
 *   }
 * }
 */
export function isUnknownType(type: Type): type is UnknownType {
  return type.kind === 'unknown';
}
