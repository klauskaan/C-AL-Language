/**
 * Type Resolver for C/AL Language Server
 *
 * This module converts syntactic DataType AST nodes from the parser into
 * semantic Type objects that provide rich type information for analysis,
 * diagnostics, and intelligent code assistance.
 *
 * The resolver bridges the gap between the parser's string-based type
 * representation and the semantic type system's structured representation.
 */

import { DataType, VariableDeclaration } from '../parser/ast';
import {
  Type,
  PrimitiveType,
  RecordType,
  ArrayType,
  OptionType,
  TextType,
  CodeunitType,
  UnknownType,
  PrimitiveName
} from './types';

/**
 * Options for type resolution that may affect how types are resolved.
 * This interface allows for future extensibility without breaking changes.
 */
export interface TypeResolverOptions {
  /**
   * Whether to mark record types as temporary by default when the
   * isTemporary flag is not explicitly set.
   * @default false
   */
  defaultTemporary?: boolean;

  /**
   * Explicit isTemporary flag for record types.
   * When provided, this takes precedence over defaultTemporary.
   *
   * Use this when resolving a type from a VariableDeclaration context
   * where the isTemporary flag is known from the variable declaration.
   *
   * @example
   * // When resolving from a VariableDeclaration
   * const type = resolveType(varDecl.dataType, {
   *   isTemporary: varDecl.isTemporary
   * });
   */
  isTemporary?: boolean;
}

/**
 * Default options for the type resolver.
 */
const DEFAULT_OPTIONS: TypeResolverOptions = {
  defaultTemporary: false
};

/**
 * Extracts the base type name from a potentially compound typeName.
 *
 * The parser may produce compound typeNames like:
 * - "Code20", "Text50" - embedded size patterns
 * - "Text[30]", "Code[10]" - bracket notation
 * - "Record 18", "Codeunit 80" - space + object ID
 *
 * This function extracts just the alphabetic base type name (e.g., "code",
 * "text", "record", "codeunit") for dispatch to the appropriate resolver.
 *
 * @param typeName - The potentially compound typeName (already lowercased)
 * @returns The base type name (alphabetic prefix)
 *
 * @example
 * extractBaseTypeName('code20') // 'code'
 * extractBaseTypeName('text[50]') // 'text'
 * extractBaseTypeName('record 18') // 'record'
 * extractBaseTypeName('integer') // 'integer'
 */
function extractBaseTypeName(typeName: string): string {
  // Extract leading alphabetic characters only
  const match = typeName.match(/^[a-z]+/);
  return match ? match[0] : typeName;
}

/**
 * Resolves a syntactic DataType AST node to a semantic Type object.
 *
 * This is the main entry point for type resolution. It examines the
 * typeName field of the DataType node and delegates to specialized
 * resolution functions based on the type category.
 *
 * @param dataType - The DataType AST node to resolve
 * @param options - Optional configuration for type resolution
 * @returns The resolved semantic Type object
 *
 * @example
 * // Resolve an Integer type
 * const intDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Integer',
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveType(intDataType);
 * // resolved.kind === 'primitive' && resolved.name === PrimitiveName.Integer
 *
 * @example
 * // Resolve a Text type with length
 * const textDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Text',
 *   length: 100,
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveType(textDataType);
 * // resolved.kind === 'text' && resolved.maxLength === 100
 *
 * @example
 * // Resolve a Record type
 * const recordDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Record',
 *   tableId: 18,
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveType(recordDataType);
 * // resolved.kind === 'record' && resolved.tableId === 18
 */
export function resolveType(
  dataType: DataType,
  options: TypeResolverOptions = DEFAULT_OPTIONS
): Type {
  const typeName = dataType.typeName.toLowerCase();
  const baseType = extractBaseTypeName(typeName);

  // Try to resolve as primitive type
  const primitiveType = resolvePrimitiveType(baseType);
  if (primitiveType) {
    return primitiveType;
  }

  // Try to resolve as codeunit type
  if (baseType === 'codeunit') {
    return resolveCodeunitType(dataType);
  }

  // Try to resolve as text/code type
  if (baseType === 'text' || baseType === 'code') {
    return resolveTextType(dataType, baseType === 'code');
  }

  // Try to resolve as record type
  if (baseType === 'record') {
    return resolveRecordType(dataType, options);
  }

  // Try to resolve as option type
  if (baseType === 'option') {
    return resolveOptionType(dataType);
  }

  // Try to resolve as array type
  if (baseType === 'array') {
    return resolveArrayType(dataType, options);
  }

  // Fallback to unknown type
  return createUnknownType(dataType.typeName);
}

/**
 * Attempts to resolve a type name to a primitive type.
 *
 * @param typeName - The lowercase type name to check
 * @returns A PrimitiveType if the name matches a primitive, null otherwise
 */
function resolvePrimitiveType(typeName: string): PrimitiveType | null {
  const primitiveMap: Record<string, PrimitiveName> = {
    'integer': PrimitiveName.Integer,
    'decimal': PrimitiveName.Decimal,
    'boolean': PrimitiveName.Boolean,
    'date': PrimitiveName.Date,
    'time': PrimitiveName.Time,
    'datetime': PrimitiveName.DateTime,
    'char': PrimitiveName.Char,
    'byte': PrimitiveName.Byte,
    'guid': PrimitiveName.GUID,
    'duration': PrimitiveName.Duration,
    'biginteger': PrimitiveName.BigInteger
  };

  const primitiveName = primitiveMap[typeName];
  if (primitiveName) {
    return {
      kind: 'primitive',
      name: primitiveName
    };
  }

  return null;
}

/**
 * Resolves a Text or Code type from a DataType AST node.
 *
 * Text and Code types in C/AL are string types with optional length constraints.
 * They share the same underlying representation (TextType) but differ in behavior:
 * - Text: General-purpose string type, preserves case and whitespace
 * - Code: Uppercase string type with trailing spaces automatically removed
 *
 * The maxLength field is extracted directly from the DataType AST node's length
 * property. When no length is specified (undefined), the type represents an
 * unlimited-length text (similar to BigText in some contexts).
 *
 * Common length patterns in C/AL:
 * - Text[100]: General-purpose text with 100 character limit
 * - Code[20]: Uppercase code with 20 character limit (e.g., item numbers)
 * - Text: Unlimited text (maxLength = undefined)
 *
 * @param dataType - The DataType AST node containing the length property
 * @param isCode - Whether this is a Code type (true) or Text type (false)
 * @returns A TextType with the appropriate maxLength and isCode flag
 *
 * @example
 * // Text type with explicit length
 * const textDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Text',
 *   length: 100,
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveTextType(textDataType, false);
 * // resolved.kind === 'text', resolved.maxLength === 100, resolved.isCode === false
 *
 * @example
 * // Code type with explicit length
 * const codeDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Code',
 *   length: 20,
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveTextType(codeDataType, true);
 * // resolved.kind === 'text', resolved.maxLength === 20, resolved.isCode === true
 *
 * @example
 * // Text type without length (unlimited)
 * const unlimitedTextDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Text',
 *   // length is undefined
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveTextType(unlimitedTextDataType, false);
 * // resolved.kind === 'text', resolved.maxLength === undefined, resolved.isCode === false
 */
function resolveTextType(dataType: DataType, isCode: boolean): TextType {
  return {
    kind: 'text',
    maxLength: dataType.length,
    isCode
  };
}

/**
 * Resolves a Record type from a DataType AST node.
 *
 * Record types in C/AL represent references to table records. They include:
 * - tableId: The numeric ID of the referenced table (extracted from AST)
 * - tableName: The name of the table (requires symbol resolution, empty for now)
 * - isTemporary: Whether the record variable is temporary (in-memory only)
 *
 * The isTemporary flag is determined with the following precedence:
 * 1. If `options.isTemporary` is explicitly provided (from VariableDeclaration context), use it
 * 2. Otherwise, fall back to `options.defaultTemporary` (defaults to false)
 *
 * Note: The tableId is extracted directly from the DataType AST node. A tableId
 * of 0 indicates no table was specified or the table reference is invalid.
 *
 * @param dataType - The DataType AST node containing type information
 * @param options - Type resolver options including isTemporary overrides
 * @returns A RecordType with tableId, tableName, and isTemporary fields
 *
 * @example
 * // Basic record resolution from DataType
 * const recordDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Record',
 *   tableId: 18, // Customer table
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveRecordType(recordDataType, {});
 * // resolved.tableId === 18, resolved.isTemporary === false
 *
 * @example
 * // Record resolution with explicit isTemporary from VariableDeclaration
 * const resolved = resolveRecordType(recordDataType, { isTemporary: true });
 * // resolved.tableId === 18, resolved.isTemporary === true
 */
function resolveRecordType(
  dataType: DataType,
  options: TypeResolverOptions
): RecordType {
  // Extract tableId from the AST node, defaulting to 0 if not specified
  const tableId = dataType.tableId ?? 0;

  // Determine isTemporary with precedence:
  // 1. Explicit isTemporary from options (e.g., from VariableDeclaration context)
  // 2. Default temporary flag from options
  // 3. Final fallback to false
  const isTemporary =
    options.isTemporary !== undefined
      ? options.isTemporary
      : options.defaultTemporary ?? false;

  return {
    kind: 'record',
    tableId,
    tableName: '', // Table name lookup would require symbol resolution
    isTemporary
  };
}

/**
 * Resolves an Option type from a DataType AST node.
 *
 * Option types in C/AL represent enumeration values - a fixed set of named
 * string values where each value corresponds to an integer (0, 1, 2, etc.).
 * Options are commonly used for status fields, categories, and flags.
 *
 * The option values are extracted from the DataType AST node's optionString
 * property using the parseOptionString helper function. The optionString is
 * a comma-separated list of option names (e.g., "Open,Released,Closed").
 *
 * Common patterns in C/AL:
 * - Status fields: "Open,Released,Pending Approval,Pending Prepayment"
 * - Boolean-like options: "No,Yes"
 * - Categories: "Customer,Vendor,Employee"
 *
 * @param dataType - The DataType AST node containing the optionString property
 * @returns An OptionType with the parsed option values as a string array
 *
 * @example
 * // Option type with multiple values
 * const statusDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Option',
 *   optionString: 'Open,Released,Closed',
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveOptionType(statusDataType);
 * // resolved.kind === 'option'
 * // resolved.values === ['Open', 'Released', 'Closed']
 *
 * @example
 * // Option type without option string (empty values)
 * const emptyOptionDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Option',
 *   // optionString is undefined
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveOptionType(emptyOptionDataType);
 * // resolved.kind === 'option'
 * // resolved.values === []
 *
 * @example
 * // Option type with spaces in values
 * const statusDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Option',
 *   optionString: 'Pending Approval, Pending Prepayment, Released',
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveOptionType(statusDataType);
 * // resolved.values === ['Pending Approval', 'Pending Prepayment', 'Released']
 */
function resolveOptionType(dataType: DataType): OptionType {
  const values = parseOptionString(dataType.optionString);
  return {
    kind: 'option',
    values
  };
}

/**
 * Parses an option string into an array of option values.
 *
 * Option strings in C/AL are comma-separated values that define the members
 * of an Option type. Each value's position in the array corresponds to its
 * integer representation (first value = 0, second = 1, etc.).
 *
 * The parsing handles several edge cases:
 * - Whitespace around values is trimmed
 * - Empty values (consecutive commas) are filtered out
 * - Undefined or empty input returns an empty array
 *
 * Examples of valid option strings:
 * - "Open,Released,Closed" → ['Open', 'Released', 'Closed']
 * - "Option A, Option B, Option C" → ['Option A', 'Option B', 'Option C']
 * - "" or undefined → []
 *
 * Note: This parser does not currently handle quoted option values or escaped
 * commas within values. Complex option strings with such patterns may not
 * parse correctly.
 *
 * @param optionString - The raw option string from the DataType AST node
 * @returns An array of trimmed, non-empty option values
 */
function parseOptionString(optionString: string | undefined): string[] {
  if (!optionString) {
    return [];
  }

  // Split by comma and trim whitespace from each value
  return optionString
    .split(',')
    .map(value => value.trim())
    .filter(value => value.length > 0);
}

/**
 * Resolves a Codeunit type from a DataType AST node.
 *
 * Codeunit types in C/AL represent references to codeunit objects, which are
 * containers for business logic procedures. Codeunits can be instantiated and
 * their procedures called, making them a fundamental building block for
 * organizing application code.
 *
 * The codeunitId is extracted from the DataType AST node. Due to how the parser
 * currently structures DataType nodes, the codeunit ID may be stored in the
 * tableId field (which is reused for object references). When tableId is not
 * set, this function attempts to parse the object ID from the typeName field
 * using the pattern "Codeunit <id>" (e.g., "Codeunit 80").
 *
 * Note: The codeunitName field is left empty because resolving the codeunit
 * name from its ID requires symbol table lookup, which is beyond the scope
 * of pure type resolution. The name can be populated later during semantic
 * analysis when the symbol table is available.
 *
 * Common patterns in C/AL:
 * - Codeunit 80 "Sales-Post": Primary sales posting logic
 * - Codeunit 1 "Application Management": Core application utilities
 * - Custom codeunits: Application-specific business logic
 *
 * @param dataType - The DataType AST node containing the codeunit reference
 * @returns A CodeunitType with codeunitId and empty codeunitName
 *
 * @example
 * // Codeunit type with explicit ID in tableId
 * const codeunitDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Codeunit',
 *   tableId: 80, // Reused for codeunit ID
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveCodeunitType(codeunitDataType);
 * // resolved.kind === 'codeunit'
 * // resolved.codeunitId === 80
 * // resolved.codeunitName === ''
 *
 * @example
 * // Codeunit type with ID in typeName
 * const codeunitDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Codeunit 80',
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveCodeunitType(codeunitDataType);
 * // resolved.kind === 'codeunit'
 * // resolved.codeunitId === 80
 * // resolved.codeunitName === ''
 *
 * @example
 * // Codeunit type without ID (bare declaration)
 * const bareCodeunitDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Codeunit',
 *   // tableId is undefined
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveCodeunitType(bareCodeunitDataType);
 * // resolved.kind === 'codeunit'
 * // resolved.codeunitId === 0
 * // resolved.codeunitName === ''
 */
function resolveCodeunitType(dataType: DataType): CodeunitType {
  let codeunitId = dataType.tableId ?? 0;

  // If tableId is not set, try to parse from typeName pattern "Codeunit <id>"
  if (!codeunitId) {
    const match = dataType.typeName.match(/\s+(\d+)/);
    if (match) {
      codeunitId = parseInt(match[1], 10);
    }
  }

  return {
    kind: 'codeunit',
    codeunitId,
    codeunitName: '' // Codeunit name lookup would require symbol resolution
  };
}

/**
 * Resolves an Array type from a DataType AST node.
 *
 * Array types in C/AL are fixed-size collections of elements of a single type.
 * They can be single-dimensional (e.g., `array[10] of Integer`) or
 * multi-dimensional (e.g., `array[3,3] of Decimal`). Arrays support both
 * primitive and complex element types.
 *
 * Current Limitations:
 * This is a basic implementation that creates a placeholder ArrayType with
 * an unknown element type and empty dimensions. Full array resolution would
 * require the parser to expose additional AST information:
 * - Element type as a nested DataType node
 * - Array dimensions as bounds (e.g., lower: 1, upper: 10)
 *
 * Future Enhancement:
 * When the parser provides structured array information, this resolver can
 * recursively resolve the element type and properly extract dimension bounds.
 * For example, `array[1..10] of Record 18` would resolve to:
 * - elementType: RecordType with tableId: 18
 * - dimensions: [10] (size of first dimension)
 *
 * The options parameter is accepted for consistency with other resolution
 * functions and to support future enhancement where element types might need
 * context-sensitive resolution (e.g., temporary records in arrays).
 *
 * @param _dataType - The DataType AST node (currently unused, reserved for future)
 * @param _options - Type resolver options (reserved for future element type resolution)
 * @returns An ArrayType with unknown element type and empty dimensions
 *
 * @example
 * // Current behavior - returns placeholder array type
 * const arrayDataType: DataType = {
 *   type: 'DataType',
 *   typeName: 'Array',
 *   startToken: token,
 *   endToken: token
 * };
 * const resolved = resolveArrayType(arrayDataType, {});
 * // resolved.kind === 'array'
 * // resolved.elementType.kind === 'unknown'
 * // resolved.dimensions === []
 *
 * @example
 * // Future expected behavior (when parser support is added)
 * // Input: array[1..10] of Integer
 * // Expected output:
 * // {
 * //   kind: 'array',
 * //   elementType: { kind: 'primitive', name: PrimitiveName.Integer },
 * //   dimensions: [10]
 * // }
 */
function resolveArrayType(
  _dataType: DataType,
  _options: TypeResolverOptions
): ArrayType {
  // For basic array types, we create an unknown element type
  // A more complete implementation would parse the array declaration
  // to extract the element type and dimensions
  return {
    kind: 'array',
    elementType: createUnknownType('unresolved element type'),
    dimensions: []
  };
}

/**
 * Creates an UnknownType for unrecognized or unresolvable type names.
 *
 * UnknownType serves as a fallback when type resolution cannot produce a
 * specific type. This can happen in several scenarios:
 *
 * 1. Unrecognized Type Names: The type name doesn't match any known C/AL type
 *    (e.g., a typo like "Integr" instead of "Integer")
 *
 * 2. Placeholder Types: Used internally when a type component cannot be
 *    resolved yet (e.g., array element types before full parser support)
 *
 * 3. External Types: Type references that require symbol resolution from
 *    external sources not yet available
 *
 * The reason field provides context for why the type is unknown, which is
 * useful for:
 * - Generating meaningful error messages in diagnostics
 * - Debugging type resolution issues
 * - Distinguishing between different causes of unknown types
 *
 * Design Note:
 * UnknownType should never silently swallow errors. Always provide a meaningful
 * reason so that downstream consumers can report the issue appropriately.
 *
 * @param originalName - The original type name or description of why resolution failed
 * @returns An UnknownType with a descriptive reason message
 *
 * @example
 * // Unrecognized type name from user code
 * const unknownType = createUnknownType('MyCustomType');
 * // unknownType.kind === 'unknown'
 * // unknownType.reason === 'Unrecognized type: MyCustomType'
 *
 * @example
 * // Placeholder for unresolved component
 * const placeholderType = createUnknownType('unresolved element type');
 * // unknownType.kind === 'unknown'
 * // unknownType.reason === 'Unrecognized type: unresolved element type'
 *
 * @example
 * // Usage in diagnostics
 * function reportTypeError(type: Type) {
 *   if (type.kind === 'unknown') {
 *     console.warn(`Type resolution failed: ${type.reason}`);
 *   }
 * }
 */
function createUnknownType(originalName: string): UnknownType {
  return {
    kind: 'unknown',
    reason: `Unrecognized type: ${originalName}`
  };
}

// ============================================================================
// Convenience Functions for Common Resolution Contexts
// ============================================================================

/**
 * Resolves the type of a VariableDeclaration, extracting the isTemporary
 * flag from the variable declaration and passing it to the type resolver.
 *
 * This is a convenience function that handles the common case of resolving
 * a variable's type while preserving its temporary status for Record types.
 *
 * @param varDecl - The VariableDeclaration AST node
 * @param options - Additional type resolver options (optional)
 * @returns The resolved semantic Type object
 *
 * @example
 * // Given a variable declaration from the AST
 * const varDecl: VariableDeclaration = {
 *   type: 'VariableDeclaration',
 *   name: 'TempCustomer',
 *   dataType: { type: 'DataType', typeName: 'Record', tableId: 18, ... },
 *   isTemporary: true,
 *   startToken: token,
 *   endToken: token
 * };
 *
 * const resolved = resolveVariableType(varDecl);
 * // If Record type: resolved.isTemporary === true
 */
export function resolveVariableType(
  varDecl: VariableDeclaration,
  options: TypeResolverOptions = {}
): Type {
  // Merge the variable's isTemporary flag with provided options
  // The explicit isTemporary from VariableDeclaration takes precedence
  const mergedOptions: TypeResolverOptions = {
    ...options,
    isTemporary: varDecl.isTemporary ?? options.isTemporary
  };

  return resolveType(varDecl.dataType, mergedOptions);
}
