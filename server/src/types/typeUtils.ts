/**
 * Type Utility Functions for C/AL Language Server
 *
 * This module provides utility functions for working with semantic Type objects.
 * These utilities are used throughout the language server for generating
 * human-readable type representations in hover information, diagnostics,
 * completion items, and other user-facing features.
 *
 * The primary function is `typeToString` which converts any Type object into
 * a formatted string suitable for display to users.
 */

import {
  Type,
  PrimitiveType,
  PrimitiveName,
  RecordType,
  ArrayType,
  OptionType,
  TextType,
  CodeunitType,
  UnknownType,
  isPrimitiveType,
  isRecordType,
  isArrayType,
  isOptionType,
  isTextType,
  isCodeunitType,
  isUnknownType
} from './types';

/**
 * Options for customizing type string formatting.
 * This interface allows for future extensibility without breaking changes.
 */
export interface TypeFormatOptions {
  /**
   * Whether to include detailed information in the output.
   * When true, includes additional metadata like option values, table IDs, etc.
   * When false, produces more concise output.
   * @default false
   */
  verbose?: boolean;

  /**
   * Maximum number of option values to display before truncating.
   * Only used when verbose is true.
   * @default 3
   */
  maxOptionValues?: number;
}

/**
 * Default options for type formatting.
 */
const DEFAULT_FORMAT_OPTIONS: Required<TypeFormatOptions> = {
  verbose: false,
  maxOptionValues: 3
};

/**
 * Converts a semantic Type object to a human-readable string representation.
 *
 * This is the main utility function for formatting types. It handles all
 * type kinds in the C/AL type system and produces output suitable for
 * display in hover information, diagnostics, and completion items.
 *
 * Format patterns by type kind:
 * - Primitive: "Integer", "Decimal", "Boolean", etc.
 * - Record: "Record Customer" or "Record 18" (with optional "temporary" suffix)
 * - Array: "Array[10] of Integer" or "Array[3, 3] of Decimal"
 * - Option: "Option" (verbose: "Option (Open, Released, Closed)")
 * - Text: "Text[100]" or "Text" (unlimited)
 * - Code: "Code[20]" or "Code" (unlimited)
 * - Codeunit: "Codeunit Sales-Post" or "Codeunit 80"
 * - Unknown: "Unknown" (verbose: "Unknown: reason")
 *
 * @param type - The semantic Type object to format
 * @param options - Optional formatting configuration
 * @returns A human-readable string representation of the type
 *
 * @example
 * // Primitive type
 * const intType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
 * typeToString(intType); // "Integer"
 *
 * @example
 * // Record type with name
 * const customerRec: RecordType = {
 *   kind: 'record',
 *   tableId: 18,
 *   tableName: 'Customer',
 *   isTemporary: false
 * };
 * typeToString(customerRec); // "Record Customer"
 *
 * @example
 * // Temporary record type
 * const tempRec: RecordType = {
 *   kind: 'record',
 *   tableId: 18,
 *   tableName: 'Customer',
 *   isTemporary: true
 * };
 * typeToString(tempRec); // "Record Customer (temporary)"
 *
 * @example
 * // Text type with length
 * const textType: TextType = { kind: 'text', maxLength: 100, isCode: false };
 * typeToString(textType); // "Text[100]"
 *
 * @example
 * // Code type with length
 * const codeType: TextType = { kind: 'text', maxLength: 20, isCode: true };
 * typeToString(codeType); // "Code[20]"
 *
 * @example
 * // Array type
 * const arrayType: ArrayType = {
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 *   dimensions: [10]
 * };
 * typeToString(arrayType); // "Array[10] of Integer"
 *
 * @example
 * // Option type (verbose)
 * const optionType: OptionType = {
 *   kind: 'option',
 *   values: ['Open', 'Released', 'Closed']
 * };
 * typeToString(optionType, { verbose: true }); // "Option (Open, Released, Closed)"
 */
export function typeToString(
  type: Type,
  options: TypeFormatOptions = {}
): string {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };

  if (isPrimitiveType(type)) {
    return primitiveTypeToString(type);
  }

  if (isRecordType(type)) {
    return recordTypeToString(type);
  }

  if (isArrayType(type)) {
    return arrayTypeToString(type, opts);
  }

  if (isOptionType(type)) {
    return optionTypeToString(type, opts);
  }

  if (isTextType(type)) {
    return textTypeToString(type);
  }

  if (isCodeunitType(type)) {
    return codeunitTypeToString(type);
  }

  if (isUnknownType(type)) {
    return unknownTypeToString(type, opts);
  }

  // Fallback for any unhandled type kinds (should not occur with proper typing)
  return 'Unknown';
}

/**
 * Formats a PrimitiveType as a string.
 *
 * Primitive types are formatted using their name directly from the
 * PrimitiveName enum. The output matches C/AL syntax for primitive types.
 *
 * @param type - The PrimitiveType to format
 * @returns The primitive type name (e.g., "Integer", "Boolean", "DateTime")
 *
 * @example
 * primitiveTypeToString({ kind: 'primitive', name: PrimitiveName.Integer });
 * // Returns: "Integer"
 *
 * @example
 * primitiveTypeToString({ kind: 'primitive', name: PrimitiveName.DateTime });
 * // Returns: "DateTime"
 */
function primitiveTypeToString(type: PrimitiveType): string {
  return type.name;
}

/**
 * Formats a RecordType as a string.
 *
 * Record types are formatted as "Record <name>" when the table name is
 * available, or "Record <id>" when only the table ID is known. Temporary
 * records include a "(temporary)" suffix to indicate their in-memory nature.
 *
 * Format patterns:
 * - With name: "Record Customer"
 * - With ID only: "Record 18"
 * - Temporary with name: "Record Customer (temporary)"
 * - Temporary with ID: "Record 18 (temporary)"
 * - No name or ID: "Record"
 *
 * @param type - The RecordType to format
 * @returns A formatted record type string
 *
 * @example
 * // Record with table name
 * recordTypeToString({
 *   kind: 'record',
 *   tableId: 18,
 *   tableName: 'Customer',
 *   isTemporary: false
 * });
 * // Returns: "Record Customer"
 *
 * @example
 * // Temporary record
 * recordTypeToString({
 *   kind: 'record',
 *   tableId: 18,
 *   tableName: 'Customer',
 *   isTemporary: true
 * });
 * // Returns: "Record Customer (temporary)"
 *
 * @example
 * // Record with only ID
 * recordTypeToString({
 *   kind: 'record',
 *   tableId: 18,
 *   tableName: '',
 *   isTemporary: false
 * });
 * // Returns: "Record 18"
 */
function recordTypeToString(type: RecordType): string {
  let result = 'Record';

  // Prefer table name if available, otherwise use table ID
  if (type.tableName) {
    result += ` ${type.tableName}`;
  } else if (type.tableId !== 0) {
    result += ` ${type.tableId}`;
  }

  // Add temporary indicator if applicable
  if (type.isTemporary) {
    result += ' (temporary)';
  }

  return result;
}

/**
 * Formats an ArrayType as a string.
 *
 * Array types are formatted as "Array[dimensions] of <elementType>" where
 * dimensions are comma-separated. The element type is recursively formatted
 * using the main typeToString function.
 *
 * Format patterns:
 * - Single dimension: "Array[10] of Integer"
 * - Multi-dimensional: "Array[3, 3] of Decimal"
 * - No dimensions: "Array[] of Integer"
 *
 * @param type - The ArrayType to format
 * @param options - Formatting options passed to element type formatting
 * @returns A formatted array type string
 *
 * @example
 * // Single-dimensional array
 * arrayTypeToString({
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 *   dimensions: [10]
 * }, {});
 * // Returns: "Array[10] of Integer"
 *
 * @example
 * // Multi-dimensional array
 * arrayTypeToString({
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Decimal },
 *   dimensions: [3, 3]
 * }, {});
 * // Returns: "Array[3, 3] of Decimal"
 *
 * @example
 * // Nested array (array of arrays)
 * arrayTypeToString({
 *   kind: 'array',
 *   elementType: {
 *     kind: 'array',
 *     elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 *     dimensions: [5]
 *   },
 *   dimensions: [10]
 * }, {});
 * // Returns: "Array[10] of Array[5] of Integer"
 */
function arrayTypeToString(
  type: ArrayType,
  options: Required<TypeFormatOptions>
): string {
  const dimensionsStr = type.dimensions.join(', ');
  const elementStr = typeToString(type.elementType, options);
  return `Array[${dimensionsStr}] of ${elementStr}`;
}

/**
 * Formats an OptionType as a string.
 *
 * In non-verbose mode, option types are simply formatted as "Option".
 * In verbose mode, the option values are included in parentheses, with
 * truncation if there are more values than the configured maximum.
 *
 * Format patterns:
 * - Non-verbose: "Option"
 * - Verbose (few values): "Option (Open, Released, Closed)"
 * - Verbose (truncated): "Option (Open, Released, Closed, ...)"
 * - Verbose (no values): "Option ()"
 *
 * @param type - The OptionType to format
 * @param options - Formatting options including verbose flag and max values
 * @returns A formatted option type string
 *
 * @example
 * // Non-verbose output
 * optionTypeToString({
 *   kind: 'option',
 *   values: ['Open', 'Released', 'Closed']
 * }, { verbose: false, maxOptionValues: 3 });
 * // Returns: "Option"
 *
 * @example
 * // Verbose output
 * optionTypeToString({
 *   kind: 'option',
 *   values: ['Open', 'Released', 'Closed']
 * }, { verbose: true, maxOptionValues: 3 });
 * // Returns: "Option (Open, Released, Closed)"
 *
 * @example
 * // Verbose output with truncation
 * optionTypeToString({
 *   kind: 'option',
 *   values: ['A', 'B', 'C', 'D', 'E']
 * }, { verbose: true, maxOptionValues: 3 });
 * // Returns: "Option (A, B, C, ...)"
 */
function optionTypeToString(
  type: OptionType,
  options: Required<TypeFormatOptions>
): string {
  if (!options.verbose) {
    return 'Option';
  }

  // In verbose mode, include the option values
  if (type.values.length === 0) {
    return 'Option ()';
  }

  const displayValues = type.values.slice(0, options.maxOptionValues);
  const hasMore = type.values.length > options.maxOptionValues;
  const valuesStr = displayValues.join(', ') + (hasMore ? ', ...' : '');

  return `Option (${valuesStr})`;
}

/**
 * Formats a TextType as a string.
 *
 * Text and Code types are formatted with their length constraint in brackets.
 * Code types use "Code" as the type name, while Text types use "Text".
 * When no length constraint is specified, the brackets are omitted.
 *
 * Format patterns:
 * - Text with length: "Text[100]"
 * - Code with length: "Code[20]"
 * - Text unlimited: "Text"
 * - Code unlimited: "Code"
 *
 * @param type - The TextType to format
 * @returns A formatted text/code type string
 *
 * @example
 * // Text with length constraint
 * textTypeToString({ kind: 'text', maxLength: 100, isCode: false });
 * // Returns: "Text[100]"
 *
 * @example
 * // Code with length constraint
 * textTypeToString({ kind: 'text', maxLength: 20, isCode: true });
 * // Returns: "Code[20]"
 *
 * @example
 * // Unlimited text
 * textTypeToString({ kind: 'text', maxLength: undefined, isCode: false });
 * // Returns: "Text"
 *
 * @example
 * // Unlimited code
 * textTypeToString({ kind: 'text', maxLength: undefined, isCode: true });
 * // Returns: "Code"
 */
function textTypeToString(type: TextType): string {
  const typeName = type.isCode ? 'Code' : 'Text';

  if (type.maxLength !== undefined) {
    return `${typeName}[${type.maxLength}]`;
  }

  return typeName;
}

/**
 * Formats a CodeunitType as a string.
 *
 * Codeunit types are formatted as "Codeunit <name>" when the codeunit name
 * is available, or "Codeunit <id>" when only the codeunit ID is known.
 * If neither is available, returns just "Codeunit".
 *
 * Format patterns:
 * - With name: "Codeunit Sales-Post"
 * - With ID only: "Codeunit 80"
 * - No name or ID: "Codeunit"
 *
 * @param type - The CodeunitType to format
 * @returns A formatted codeunit type string
 *
 * @example
 * // Codeunit with name
 * codeunitTypeToString({
 *   kind: 'codeunit',
 *   codeunitId: 80,
 *   codeunitName: 'Sales-Post'
 * });
 * // Returns: "Codeunit Sales-Post"
 *
 * @example
 * // Codeunit with only ID
 * codeunitTypeToString({
 *   kind: 'codeunit',
 *   codeunitId: 80,
 *   codeunitName: ''
 * });
 * // Returns: "Codeunit 80"
 *
 * @example
 * // Codeunit with no identification
 * codeunitTypeToString({
 *   kind: 'codeunit',
 *   codeunitId: 0,
 *   codeunitName: ''
 * });
 * // Returns: "Codeunit"
 */
function codeunitTypeToString(type: CodeunitType): string {
  if (type.codeunitName) {
    return `Codeunit ${type.codeunitName}`;
  }

  if (type.codeunitId !== 0) {
    return `Codeunit ${type.codeunitId}`;
  }

  return 'Codeunit';
}

/**
 * Formats an UnknownType as a string.
 *
 * In non-verbose mode, unknown types are simply formatted as "Unknown".
 * In verbose mode, the reason for the unknown type is included when available.
 *
 * Format patterns:
 * - Non-verbose: "Unknown"
 * - Verbose with reason: "Unknown: Unrecognized type: MyCustomType"
 * - Verbose without reason: "Unknown"
 *
 * @param type - The UnknownType to format
 * @param options - Formatting options including verbose flag
 * @returns A formatted unknown type string
 *
 * @example
 * // Non-verbose output
 * unknownTypeToString({
 *   kind: 'unknown',
 *   reason: 'Unrecognized type: MyCustomType'
 * }, { verbose: false, maxOptionValues: 3 });
 * // Returns: "Unknown"
 *
 * @example
 * // Verbose output with reason
 * unknownTypeToString({
 *   kind: 'unknown',
 *   reason: 'Unrecognized type: MyCustomType'
 * }, { verbose: true, maxOptionValues: 3 });
 * // Returns: "Unknown: Unrecognized type: MyCustomType"
 *
 * @example
 * // Verbose output without reason
 * unknownTypeToString({
 *   kind: 'unknown'
 * }, { verbose: true, maxOptionValues: 3 });
 * // Returns: "Unknown"
 */
function unknownTypeToString(
  type: UnknownType,
  options: Required<TypeFormatOptions>
): string {
  if (options.verbose && type.reason) {
    return `Unknown: ${type.reason}`;
  }

  return 'Unknown';
}

// ============================================================================
// Type Comparison Functions
// ============================================================================

/**
 * Compares two Type objects for structural equality.
 *
 * This function performs a deep structural comparison of two types,
 * checking that all type-specific properties match. For composite types
 * like ArrayType, the comparison is recursive.
 *
 * Comparison rules by type kind:
 * - Primitive: Equal if same primitive name
 * - Record: Equal if same tableId, tableName, and isTemporary
 * - Array: Equal if same dimensions and element types are equal (recursive)
 * - Option: Equal if same option values in same order
 * - Text: Equal if same maxLength and isCode flag
 * - Codeunit: Equal if same codeunitId and codeunitName
 * - Unknown: Equal if same reason (both undefined counts as equal)
 *
 * Two types with different 'kind' values are never equal.
 *
 * @param typeA - First type to compare
 * @param typeB - Second type to compare
 * @returns True if the types are structurally equal, false otherwise
 *
 * @example
 * // Primitive types - equal
 * const intA: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
 * const intB: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
 * areTypesEqual(intA, intB); // true
 *
 * @example
 * // Primitive types - not equal (different names)
 * const intType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
 * const decType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Decimal };
 * areTypesEqual(intType, decType); // false
 *
 * @example
 * // Record types - equal
 * const recA: RecordType = { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false };
 * const recB: RecordType = { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false };
 * areTypesEqual(recA, recB); // true
 *
 * @example
 * // Record types - not equal (different isTemporary)
 * const recA: RecordType = { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false };
 * const recB: RecordType = { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: true };
 * areTypesEqual(recA, recB); // false
 *
 * @example
 * // Array types with nested comparison
 * const arrA: ArrayType = {
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 *   dimensions: [10]
 * };
 * const arrB: ArrayType = {
 *   kind: 'array',
 *   elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 *   dimensions: [10]
 * };
 * areTypesEqual(arrA, arrB); // true
 *
 * @example
 * // Different kinds are never equal
 * const textType: TextType = { kind: 'text', maxLength: 100, isCode: false };
 * const intType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
 * areTypesEqual(textType, intType); // false
 */
export function areTypesEqual(typeA: Type, typeB: Type): boolean {
  // Different kinds are never equal
  if (typeA.kind !== typeB.kind) {
    return false;
  }

  // At this point we know both types have the same kind
  // Use type guards to dispatch to the appropriate comparison function
  if (isPrimitiveType(typeA) && isPrimitiveType(typeB)) {
    return arePrimitiveTypesEqual(typeA, typeB);
  }

  if (isRecordType(typeA) && isRecordType(typeB)) {
    return areRecordTypesEqual(typeA, typeB);
  }

  if (isArrayType(typeA) && isArrayType(typeB)) {
    return areArrayTypesEqual(typeA, typeB);
  }

  if (isOptionType(typeA) && isOptionType(typeB)) {
    return areOptionTypesEqual(typeA, typeB);
  }

  if (isTextType(typeA) && isTextType(typeB)) {
    return areTextTypesEqual(typeA, typeB);
  }

  if (isCodeunitType(typeA) && isCodeunitType(typeB)) {
    return areCodeunitTypesEqual(typeA, typeB);
  }

  if (isUnknownType(typeA) && isUnknownType(typeB)) {
    return areUnknownTypesEqual(typeA, typeB);
  }

  // Exhaustive check - should never reach here with proper typing
  return false;
}

/**
 * Compares two PrimitiveType objects for equality.
 *
 * Two primitive types are equal if they have the same primitive name.
 *
 * @param typeA - First primitive type
 * @param typeB - Second primitive type
 * @returns True if primitive names are equal
 *
 * @example
 * arePrimitiveTypesEqual(
 *   { kind: 'primitive', name: PrimitiveName.Integer },
 *   { kind: 'primitive', name: PrimitiveName.Integer }
 * ); // true
 */
function arePrimitiveTypesEqual(typeA: PrimitiveType, typeB: PrimitiveType): boolean {
  return typeA.name === typeB.name;
}

/**
 * Compares two RecordType objects for equality.
 *
 * Two record types are equal if they have the same tableId, tableName,
 * and isTemporary flag. All three properties must match for equality.
 *
 * @param typeA - First record type
 * @param typeB - Second record type
 * @returns True if all record properties are equal
 *
 * @example
 * areRecordTypesEqual(
 *   { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false },
 *   { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false }
 * ); // true
 *
 * @example
 * // Different tableId
 * areRecordTypesEqual(
 *   { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false },
 *   { kind: 'record', tableId: 27, tableName: 'Vendor', isTemporary: false }
 * ); // false
 */
function areRecordTypesEqual(typeA: RecordType, typeB: RecordType): boolean {
  return (
    typeA.tableId === typeB.tableId &&
    typeA.tableName === typeB.tableName &&
    typeA.isTemporary === typeB.isTemporary
  );
}

/**
 * Compares two ArrayType objects for equality.
 *
 * Two array types are equal if they have the same dimensions and their
 * element types are equal. This comparison is recursive - if the element
 * types are arrays themselves, they are compared recursively.
 *
 * Dimensions are compared by length and each dimension value.
 *
 * @param typeA - First array type
 * @param typeB - Second array type
 * @returns True if dimensions and element types are equal
 *
 * @example
 * // Same single-dimensional arrays
 * areArrayTypesEqual(
 *   { kind: 'array', elementType: { kind: 'primitive', name: PrimitiveName.Integer }, dimensions: [10] },
 *   { kind: 'array', elementType: { kind: 'primitive', name: PrimitiveName.Integer }, dimensions: [10] }
 * ); // true
 *
 * @example
 * // Different dimensions
 * areArrayTypesEqual(
 *   { kind: 'array', elementType: { kind: 'primitive', name: PrimitiveName.Integer }, dimensions: [10] },
 *   { kind: 'array', elementType: { kind: 'primitive', name: PrimitiveName.Integer }, dimensions: [20] }
 * ); // false
 *
 * @example
 * // Different element types
 * areArrayTypesEqual(
 *   { kind: 'array', elementType: { kind: 'primitive', name: PrimitiveName.Integer }, dimensions: [10] },
 *   { kind: 'array', elementType: { kind: 'primitive', name: PrimitiveName.Decimal }, dimensions: [10] }
 * ); // false
 */
function areArrayTypesEqual(typeA: ArrayType, typeB: ArrayType): boolean {
  // Compare dimensions length first
  if (typeA.dimensions.length !== typeB.dimensions.length) {
    return false;
  }

  // Compare each dimension value
  for (let i = 0; i < typeA.dimensions.length; i++) {
    if (typeA.dimensions[i] !== typeB.dimensions[i]) {
      return false;
    }
  }

  // Recursively compare element types
  return areTypesEqual(typeA.elementType, typeB.elementType);
}

/**
 * Compares two OptionType objects for equality.
 *
 * Two option types are equal if they have the same option values in the
 * same order. The comparison is case-sensitive and order-dependent.
 *
 * @param typeA - First option type
 * @param typeB - Second option type
 * @returns True if option values are equal in the same order
 *
 * @example
 * areOptionTypesEqual(
 *   { kind: 'option', values: ['Open', 'Released', 'Closed'] },
 *   { kind: 'option', values: ['Open', 'Released', 'Closed'] }
 * ); // true
 *
 * @example
 * // Different order
 * areOptionTypesEqual(
 *   { kind: 'option', values: ['Open', 'Released', 'Closed'] },
 *   { kind: 'option', values: ['Open', 'Closed', 'Released'] }
 * ); // false
 *
 * @example
 * // Case-sensitive
 * areOptionTypesEqual(
 *   { kind: 'option', values: ['Open'] },
 *   { kind: 'option', values: ['OPEN'] }
 * ); // false
 */
function areOptionTypesEqual(typeA: OptionType, typeB: OptionType): boolean {
  // Compare values length first
  if (typeA.values.length !== typeB.values.length) {
    return false;
  }

  // Compare each option value
  for (let i = 0; i < typeA.values.length; i++) {
    if (typeA.values[i] !== typeB.values[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two TextType objects for equality.
 *
 * Two text types are equal if they have the same maxLength and isCode flag.
 * Undefined maxLength values are treated as equal to each other.
 *
 * @param typeA - First text type
 * @param typeB - Second text type
 * @returns True if maxLength and isCode are equal
 *
 * @example
 * // Same Text types
 * areTextTypesEqual(
 *   { kind: 'text', maxLength: 100, isCode: false },
 *   { kind: 'text', maxLength: 100, isCode: false }
 * ); // true
 *
 * @example
 * // Text vs Code
 * areTextTypesEqual(
 *   { kind: 'text', maxLength: 100, isCode: false },
 *   { kind: 'text', maxLength: 100, isCode: true }
 * ); // false
 *
 * @example
 * // Different maxLength
 * areTextTypesEqual(
 *   { kind: 'text', maxLength: 100, isCode: false },
 *   { kind: 'text', maxLength: 50, isCode: false }
 * ); // false
 *
 * @example
 * // Both unlimited
 * areTextTypesEqual(
 *   { kind: 'text', maxLength: undefined, isCode: false },
 *   { kind: 'text', maxLength: undefined, isCode: false }
 * ); // true
 */
function areTextTypesEqual(typeA: TextType, typeB: TextType): boolean {
  return typeA.maxLength === typeB.maxLength && typeA.isCode === typeB.isCode;
}

/**
 * Compares two CodeunitType objects for equality.
 *
 * Two codeunit types are equal if they have the same codeunitId and
 * codeunitName. Both properties must match for equality.
 *
 * @param typeA - First codeunit type
 * @param typeB - Second codeunit type
 * @returns True if codeunitId and codeunitName are equal
 *
 * @example
 * areCodeunitTypesEqual(
 *   { kind: 'codeunit', codeunitId: 80, codeunitName: 'Sales-Post' },
 *   { kind: 'codeunit', codeunitId: 80, codeunitName: 'Sales-Post' }
 * ); // true
 *
 * @example
 * // Different codeunitId
 * areCodeunitTypesEqual(
 *   { kind: 'codeunit', codeunitId: 80, codeunitName: 'Sales-Post' },
 *   { kind: 'codeunit', codeunitId: 81, codeunitName: 'Sales-Post' }
 * ); // false
 */
function areCodeunitTypesEqual(typeA: CodeunitType, typeB: CodeunitType): boolean {
  return (
    typeA.codeunitId === typeB.codeunitId &&
    typeA.codeunitName === typeB.codeunitName
  );
}

/**
 * Compares two UnknownType objects for equality.
 *
 * Two unknown types are equal if they have the same reason. Both undefined
 * reasons are considered equal. This allows tracking that two unknown types
 * originated from the same cause.
 *
 * @param typeA - First unknown type
 * @param typeB - Second unknown type
 * @returns True if reasons are equal (including both undefined)
 *
 * @example
 * // Same reason
 * areUnknownTypesEqual(
 *   { kind: 'unknown', reason: 'Table not found' },
 *   { kind: 'unknown', reason: 'Table not found' }
 * ); // true
 *
 * @example
 * // Both undefined reasons
 * areUnknownTypesEqual(
 *   { kind: 'unknown' },
 *   { kind: 'unknown' }
 * ); // true
 *
 * @example
 * // Different reasons
 * areUnknownTypesEqual(
 *   { kind: 'unknown', reason: 'Table not found' },
 *   { kind: 'unknown', reason: 'Invalid type syntax' }
 * ); // false
 */
function areUnknownTypesEqual(typeA: UnknownType, typeB: UnknownType): boolean {
  return typeA.reason === typeB.reason;
}

// ============================================================================
// Type Compatibility Functions
// ============================================================================

/**
 * Determines if a source type can be assigned to a target type according to
 * C/AL type compatibility rules.
 *
 * This function implements C/AL type compatibility rules:
 * 1. Identical types are always compatible
 * 2. Unknown types always return true (bail out)
 * 3. Numeric widening: Char → Integer, Byte → Integer, Integer → BigInteger,
 *    Integer → Decimal, BigInteger → Decimal
 * 4. Numeric implicit narrowing: Integer → Char, Integer → Byte (ordinal types),
 *    Integer → Duration (Duration is stored as milliseconds)
 * 5. Numeric narrowing: Decimal → Integer is NOT allowed
 * 6. Text/Code interoperability: Text ↔ Code (bidirectional)
 * 7. Text length: Any length to any length (runtime truncates)
 * 8. Char to Text/Code conversion
 * 9. Option/Integer interoperability (bidirectional)
 * 10. Record compatibility by tableId (isTemporary ignored)
 * 11. Codeunit compatibility by ID
 *
 * @param sourceType - The type being assigned from
 * @param targetType - The type being assigned to
 * @returns True if the assignment is compatible, false otherwise
 *
 * @example
 * // Compatible: Integer to Decimal
 * isAssignmentCompatible(
 *   createPrimitiveType(PrimitiveName.Integer),
 *   createPrimitiveType(PrimitiveName.Decimal)
 * ); // true
 *
 * @example
 * // Incompatible: Decimal to Integer
 * isAssignmentCompatible(
 *   createPrimitiveType(PrimitiveName.Decimal),
 *   createPrimitiveType(PrimitiveName.Integer)
 * ); // false
 */
export function isAssignmentCompatible(sourceType: Type, targetType: Type): boolean {
  // Bail out for unknown types (cannot validate)
  if (isUnknownType(targetType) || isUnknownType(sourceType)) {
    return true;
  }

  // Identical types are always compatible
  if (areTypesEqual(targetType, sourceType)) {
    return true;
  }

  // Numeric type compatibility
  if (isPrimitiveType(targetType) && isPrimitiveType(sourceType)) {
    // Char → Integer
    if (sourceType.name === PrimitiveName.Char && targetType.name === PrimitiveName.Integer) {
      return true;
    }

    // Byte → Integer
    if (sourceType.name === PrimitiveName.Byte && targetType.name === PrimitiveName.Integer) {
      return true;
    }

    // Integer → BigInteger
    if (sourceType.name === PrimitiveName.Integer && targetType.name === PrimitiveName.BigInteger) {
      return true;
    }

    // Integer → Decimal
    if (sourceType.name === PrimitiveName.Integer && targetType.name === PrimitiveName.Decimal) {
      return true;
    }

    // BigInteger → Decimal
    if (sourceType.name === PrimitiveName.BigInteger && targetType.name === PrimitiveName.Decimal) {
      return true;
    }

    // Char → BigInteger (transitive: Char → Integer → BigInteger)
    if (sourceType.name === PrimitiveName.Char && targetType.name === PrimitiveName.BigInteger) {
      return true;
    }

    // Char → Decimal (transitive: Char → Integer → Decimal)
    if (sourceType.name === PrimitiveName.Char && targetType.name === PrimitiveName.Decimal) {
      return true;
    }

    // Byte → BigInteger (transitive: Byte → Integer → BigInteger)
    if (sourceType.name === PrimitiveName.Byte && targetType.name === PrimitiveName.BigInteger) {
      return true;
    }

    // Byte → Decimal (transitive: Byte → Integer → Decimal)
    if (sourceType.name === PrimitiveName.Byte && targetType.name === PrimitiveName.Decimal) {
      return true;
    }

    // Integer → Char (C/AL allows integer assignment to Char; ordinal types are interchangeable)
    if (sourceType.name === PrimitiveName.Integer && targetType.name === PrimitiveName.Char) {
      return true;
    }

    // Integer → Byte (same as Integer → Char; ordinal types are interchangeable)
    if (sourceType.name === PrimitiveName.Integer && targetType.name === PrimitiveName.Byte) {
      return true;
    }

    // Integer → Duration (Duration is stored as milliseconds; integer literal assignment is idiomatic in C/AL)
    if (sourceType.name === PrimitiveName.Integer && targetType.name === PrimitiveName.Duration) {
      return true;
    }

    // Decimal → Integer is NOT allowed (narrowing)
    if (sourceType.name === PrimitiveName.Decimal && targetType.name === PrimitiveName.Integer) {
      return false;
    }
  }

  // Text/Code interoperability
  if (isTextType(targetType) && isTextType(sourceType)) {
    // Text ↔ Code (bidirectional)
    // Any length to any length (runtime truncates)
    return true;
  }

  // Char to Text/Code conversion
  if (isPrimitiveType(sourceType) && sourceType.name === PrimitiveName.Char && isTextType(targetType)) {
    return true;
  }

  // Option/Integer interoperability (bidirectional)
  if (isOptionType(targetType) && isPrimitiveType(sourceType) && sourceType.name === PrimitiveName.Integer) {
    return true;
  }

  if (isPrimitiveType(targetType) && targetType.name === PrimitiveName.Integer && isOptionType(sourceType)) {
    return true;
  }

  // Record compatibility by tableId (isTemporary ignored)
  if (isRecordType(targetType) && isRecordType(sourceType)) {
    return targetType.tableId === sourceType.tableId;
  }

  // Codeunit compatibility by ID
  if (isCodeunitType(targetType) && isCodeunitType(sourceType)) {
    return targetType.codeunitId === sourceType.codeunitId;
  }

  // Array compatibility (element type must be compatible, dimensions must match)
  if (isArrayType(targetType) && isArrayType(sourceType)) {
    // Dimensions must match exactly
    if (targetType.dimensions.length !== sourceType.dimensions.length) {
      return false;
    }
    for (let i = 0; i < targetType.dimensions.length; i++) {
      if (targetType.dimensions[i] !== sourceType.dimensions[i]) {
        return false;
      }
    }
    // Element types must be compatible
    return isAssignmentCompatible(sourceType.elementType, targetType.elementType);
  }

  // Option-to-Option compatibility (all option types are compatible)
  if (isOptionType(targetType) && isOptionType(sourceType)) {
    return true;
  }

  // All other combinations are incompatible
  return false;
}

/**
 * Infers a semantic Type from a literal type string.
 *
 * This function maps literal type identifiers (typically from lexer token types)
 * to their corresponding semantic Type objects. It is used during type inference
 * when analyzing literal expressions like integers, strings, dates, etc.
 *
 * Supported literal types:
 * - 'integer' → Integer primitive type
 * - 'decimal' → Decimal primitive type
 * - 'boolean' → Boolean primitive type
 * - 'string' → Unlimited Text type
 * - 'date' → Date primitive type
 * - 'time' → Time primitive type
 * - 'datetime' → DateTime primitive type
 *
 * @param literalType - The literal type string (case-insensitive)
 * @returns The inferred semantic Type object
 *
 * @example
 * // Infer integer literal
 * const intType = inferLiteralType('integer');
 * // intType.kind === 'primitive', intType.name === PrimitiveName.Integer
 *
 * @example
 * // Infer string literal
 * const strType = inferLiteralType('string');
 * // strType.kind === 'text', strType.maxLength === undefined, strType.isCode === false
 *
 * @example
 * // Unknown literal type
 * const unknownType = inferLiteralType('unknown-type');
 * // unknownType.kind === 'unknown'
 */
export function inferLiteralType(literalType: string): Type {
  const normalizedType = literalType.toLowerCase();

  switch (normalizedType) {
    case 'integer':
      return createPrimitiveType(PrimitiveName.Integer);

    case 'decimal':
      return createPrimitiveType(PrimitiveName.Decimal);

    case 'boolean':
      return createPrimitiveType(PrimitiveName.Boolean);

    case 'string':
      // String literals map to unlimited Text
      return createTextType(undefined, false);

    case 'date':
      return createPrimitiveType(PrimitiveName.Date);

    case 'time':
      return createPrimitiveType(PrimitiveName.Time);

    case 'datetime':
      return createPrimitiveType(PrimitiveName.DateTime);

    default:
      return createUnknownType(`Unrecognized literal type: ${literalType}`);
  }
}

// ============================================================================
// Type Factory Functions
// ============================================================================
// These factory functions provide a convenient way to create type instances
// with proper structure and validation. They ensure consistent type creation
// throughout the codebase.

/**
 * Creates a PrimitiveType instance.
 *
 * Primitive types represent the built-in simple types in C/AL such as
 * Integer, Decimal, Boolean, Date, Time, etc. This factory ensures the
 * correct structure with the 'primitive' kind discriminator.
 *
 * @param name - The primitive type name from the PrimitiveName enum
 * @returns A PrimitiveType instance
 *
 * @example
 * // Create an Integer type
 * const intType = createPrimitiveType(PrimitiveName.Integer);
 * // Result: { kind: 'primitive', name: 'Integer' }
 *
 * @example
 * // Create a DateTime type
 * const dateTimeType = createPrimitiveType(PrimitiveName.DateTime);
 * // Result: { kind: 'primitive', name: 'DateTime' }
 *
 * @example
 * // Create a GUID type
 * const guidType = createPrimitiveType(PrimitiveName.GUID);
 * // Result: { kind: 'primitive', name: 'GUID' }
 */
export function createPrimitiveType(name: PrimitiveName): PrimitiveType {
  return {
    kind: 'primitive',
    name
  };
}

/**
 * Creates a RecordType instance.
 *
 * Record types represent table record references in C/AL. They track the
 * table ID, table name, and whether the record is temporary (in-memory only).
 * This factory provides sensible defaults while allowing full customization.
 *
 * @param tableId - The numeric ID of the table (0 if unknown)
 * @param tableName - The name of the table (empty string if unknown)
 * @param isTemporary - Whether this is a temporary record (default: false)
 * @returns A RecordType instance
 *
 * @example
 * // Create a Customer record type
 * const customerRec = createRecordType(18, 'Customer');
 * // Result: { kind: 'record', tableId: 18, tableName: 'Customer', isTemporary: false }
 *
 * @example
 * // Create a temporary Item record type
 * const tempItemRec = createRecordType(27, 'Item', true);
 * // Result: { kind: 'record', tableId: 27, tableName: 'Item', isTemporary: true }
 *
 * @example
 * // Create a record type with only ID (name unknown)
 * const unknownRec = createRecordType(99999, '');
 * // Result: { kind: 'record', tableId: 99999, tableName: '', isTemporary: false }
 *
 * @example
 * // Create a record type with only name (ID unknown)
 * const namedRec = createRecordType(0, 'MyCustomTable');
 * // Result: { kind: 'record', tableId: 0, tableName: 'MyCustomTable', isTemporary: false }
 */
export function createRecordType(
  tableId: number,
  tableName: string,
  isTemporary: boolean = false
): RecordType {
  return {
    kind: 'record',
    tableId,
    tableName,
    isTemporary
  };
}

/**
 * Creates an ArrayType instance.
 *
 * Array types contain elements of a specific type and can have one or more
 * dimensions. C/AL supports multi-dimensional arrays with fixed bounds.
 * The element type can be any valid Type, including nested arrays.
 *
 * @param elementType - The type of elements in the array
 * @param dimensions - Array of dimension sizes (e.g., [10] for single-dimension, [3, 3] for matrix)
 * @returns An ArrayType instance
 *
 * @example
 * // Create a single-dimensional array of integers
 * const intArray = createArrayType(
 *   createPrimitiveType(PrimitiveName.Integer),
 *   [10]
 * );
 * // Result: { kind: 'array', elementType: { kind: 'primitive', name: 'Integer' }, dimensions: [10] }
 *
 * @example
 * // Create a 3x3 matrix of decimals
 * const matrix = createArrayType(
 *   createPrimitiveType(PrimitiveName.Decimal),
 *   [3, 3]
 * );
 * // Result: { kind: 'array', elementType: { kind: 'primitive', name: 'Decimal' }, dimensions: [3, 3] }
 *
 * @example
 * // Create an array of records
 * const recArray = createArrayType(
 *   createRecordType(18, 'Customer'),
 *   [100]
 * );
 * // Result: Array with 100 Customer record elements
 *
 * @example
 * // Create a nested array (array of arrays)
 * const nestedArray = createArrayType(
 *   createArrayType(createPrimitiveType(PrimitiveName.Integer), [5]),
 *   [10]
 * );
 * // Result: Array[10] of Array[5] of Integer
 */
export function createArrayType(
  elementType: Type,
  dimensions: number[]
): ArrayType {
  return {
    kind: 'array',
    elementType,
    dimensions
  };
}

/**
 * Creates an OptionType instance.
 *
 * Option types define a fixed set of named values (enumeration). In C/AL,
 * options are defined as comma-separated strings and internally stored as
 * integers starting from 0. The values array preserves the order and names.
 *
 * @param values - Array of option value strings in order
 * @returns An OptionType instance
 *
 * @example
 * // Create a status option type
 * const statusOption = createOptionType(['Open', 'Released', 'Closed']);
 * // Result: { kind: 'option', values: ['Open', 'Released', 'Closed'] }
 *
 * @example
 * // Create a yes/no option type
 * const yesNoOption = createOptionType(['No', 'Yes']);
 * // Result: { kind: 'option', values: ['No', 'Yes'] }
 *
 * @example
 * // Create a document type option
 * const docTypeOption = createOptionType([
 *   'Quote',
 *   'Order',
 *   'Invoice',
 *   'Credit Memo',
 *   'Blanket Order',
 *   'Return Order'
 * ]);
 * // Result: { kind: 'option', values: ['Quote', 'Order', ...] }
 *
 * @example
 * // Create an empty option type (edge case)
 * const emptyOption = createOptionType([]);
 * // Result: { kind: 'option', values: [] }
 */
export function createOptionType(values: string[]): OptionType {
  return {
    kind: 'option',
    values
  };
}

/**
 * Creates a TextType instance.
 *
 * Text types store character strings with optional maximum length constraints.
 * C/AL distinguishes between Text (general purpose) and Code (uppercase,
 * trailing spaces removed) types. This factory handles both variants.
 *
 * @param maxLength - Maximum length of the text field (undefined for unlimited)
 * @param isCode - Whether this is a Code type (default: false for Text)
 * @returns A TextType instance
 *
 * @example
 * // Create a Text[100] type
 * const text100 = createTextType(100);
 * // Result: { kind: 'text', maxLength: 100, isCode: false }
 *
 * @example
 * // Create a Code[20] type
 * const code20 = createTextType(20, true);
 * // Result: { kind: 'text', maxLength: 20, isCode: true }
 *
 * @example
 * // Create an unlimited Text type
 * const unlimitedText = createTextType();
 * // Result: { kind: 'text', maxLength: undefined, isCode: false }
 *
 * @example
 * // Create an unlimited Code type
 * const unlimitedCode = createTextType(undefined, true);
 * // Result: { kind: 'text', maxLength: undefined, isCode: true }
 *
 * @example
 * // Create a Text[250] for description fields
 * const descText = createTextType(250);
 * // Result: { kind: 'text', maxLength: 250, isCode: false }
 */
export function createTextType(
  maxLength?: number,
  isCode: boolean = false
): TextType {
  return {
    kind: 'text',
    maxLength,
    isCode
  };
}

/**
 * Creates a CodeunitType instance.
 *
 * Codeunit types reference a specific codeunit object that can be instantiated
 * and have its procedures called. The codeunitId and codeunitName provide
 * the link to the codeunit definition.
 *
 * @param codeunitId - The numeric ID of the codeunit (0 if unknown)
 * @param codeunitName - The name of the codeunit (empty string if unknown)
 * @returns A CodeunitType instance
 *
 * @example
 * // Create a Sales-Post codeunit type
 * const salesPost = createCodeunitType(80, 'Sales-Post');
 * // Result: { kind: 'codeunit', codeunitId: 80, codeunitName: 'Sales-Post' }
 *
 * @example
 * // Create a codeunit type with only ID
 * const codeunitById = createCodeunitType(1, '');
 * // Result: { kind: 'codeunit', codeunitId: 1, codeunitName: '' }
 *
 * @example
 * // Create a codeunit type with only name
 * const codeunitByName = createCodeunitType(0, 'Application Management');
 * // Result: { kind: 'codeunit', codeunitId: 0, codeunitName: 'Application Management' }
 *
 * @example
 * // Create a codeunit for posting routines
 * const purchPost = createCodeunitType(90, 'Purch.-Post');
 * // Result: { kind: 'codeunit', codeunitId: 90, codeunitName: 'Purch.-Post' }
 */
export function createCodeunitType(
  codeunitId: number,
  codeunitName: string
): CodeunitType {
  return {
    kind: 'codeunit',
    codeunitId,
    codeunitName
  };
}

/**
 * Creates an UnknownType instance.
 *
 * Unknown types are used as a fallback when a type cannot be determined or
 * resolved. This can occur with invalid type references, forward references
 * that haven't been resolved, or types from external sources. The optional
 * reason field provides context for debugging and diagnostics.
 *
 * @param reason - Optional reason explaining why the type is unknown
 * @returns An UnknownType instance
 *
 * @example
 * // Create an unknown type with no reason
 * const unknown = createUnknownType();
 * // Result: { kind: 'unknown' }
 *
 * @example
 * // Create an unknown type for unrecognized type name
 * const unrecognized = createUnknownType('Unrecognized type: MyCustomType');
 * // Result: { kind: 'unknown', reason: 'Unrecognized type: MyCustomType' }
 *
 * @example
 * // Create an unknown type for table not found
 * const tableNotFound = createUnknownType('Table 99999 not found in workspace');
 * // Result: { kind: 'unknown', reason: 'Table 99999 not found in workspace' }
 *
 * @example
 * // Create an unknown type for parse error
 * const parseError = createUnknownType('Invalid type syntax');
 * // Result: { kind: 'unknown', reason: 'Invalid type syntax' }
 *
 * @example
 * // Create an unknown type for forward reference
 * const forwardRef = createUnknownType('Forward reference to undefined type');
 * // Result: { kind: 'unknown', reason: 'Forward reference to undefined type' }
 */
export function createUnknownType(reason?: string): UnknownType {
  return {
    kind: 'unknown',
    reason
  };
}
