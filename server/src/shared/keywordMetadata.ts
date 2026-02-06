/**
 * Shared Keyword Metadata
 *
 * Centralized keyword categorization and descriptions for use across:
 * - Completion provider (categories and completion item kinds)
 * - Hover provider (descriptions and labels)
 * - Future: Semantic tokens provider
 *
 * This module consolidates keyword metadata to eliminate duplication between providers.
 */

import { CompletionItemKind } from 'vscode-languageserver';
import { TokenType, KEYWORDS } from '../lexer/tokens';

/**
 * Keyword categories for completion and hover
 */
export type KeywordCategory =
  | 'Control Flow'
  | 'Data Type'
  | 'Object Type'
  | 'Declaration'
  | 'Boolean Constant'
  | 'Operator'
  | 'Section'
  | 'Keyword';

/**
 * Metadata for a single keyword
 */
export interface KeywordMetadata {
  readonly category: KeywordCategory;
  readonly completionKind: CompletionItemKind;
  readonly description?: string;
}

/**
 * Helper to create frozen metadata object
 */
function createMetadata(data: KeywordMetadata): Readonly<KeywordMetadata> {
  return Object.freeze(data);
}

/**
 * Keyword metadata map keyed by TokenType
 */
export const KEYWORD_METADATA = new Map<TokenType, KeywordMetadata>([
  // Control Flow keywords
  [TokenType.If, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'IF: Executes code conditionally. Use with THEN and optionally ELSE.'
  })],
  [TokenType.Then, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Follows IF condition to specify code to execute when true.'
  })],
  [TokenType.Else, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Specifies code to execute when IF condition is false.'
  })],
  [TokenType.Case, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Multi-way branch based on expression value. Use with OF.'
  })],
  [TokenType.Of, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Introduces case alternatives in a CASE statement.'
  })],
  [TokenType.While, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Executes code repeatedly while condition is true. Use with DO.'
  })],
  [TokenType.Do, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Follows WHILE or FOR to introduce the loop body.'
  })],
  [TokenType.Repeat, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Executes code at least once, then repeats while condition is false.'
  })],
  [TokenType.Until, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Ends REPEAT loop when condition becomes true.'
  })],
  [TokenType.For, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Executes code a fixed number of times. Use with TO or DOWNTO.'
  })],
  [TokenType.To, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Increments loop counter in FOR loop.'
  })],
  [TokenType.DownTo, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Decrements loop counter in FOR loop.'
  })],
  [TokenType.Exit, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Exits the current procedure/trigger, optionally returning a value.'
  })],
  [TokenType.Break, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Exits the current loop immediately.'
  })],
  [TokenType.Begin, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Starts a BEGIN...END compound statement block.'
  })],
  [TokenType.End, createMetadata({
    category: 'Control Flow',
    completionKind: CompletionItemKind.Keyword,
    description: 'Ends a compound statement block.'
  })],

  // Data Type keywords
  [TokenType.Boolean, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores TRUE or FALSE values.'
  })],
  [TokenType.Integer_Type, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores whole numbers (integer) from -2,147,483,647 to 2,147,483,647.'
  })],
  [TokenType.Decimal_Type, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores decimal numbers with up to 18 significant digits.'
  })],
  [TokenType.Text, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores alphanumeric strings up to 1024 characters.'
  })],
  [TokenType.Code_Type, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores alphanumeric strings, automatically converted to uppercase.'
  })],
  [TokenType.Date_Type, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores date values.'
  })],
  [TokenType.Time_Type, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores time values.'
  })],
  [TokenType.DateTime_Type, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores combined date and time values.'
  })],
  [TokenType.Record, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Represents a row in a database table.'
  })],
  [TokenType.RecordID, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Uniquely identifies a record in a table.'
  })],
  [TokenType.RecordRef, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Generic reference to any record type.'
  })],
  [TokenType.FieldRef, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Generic reference to any field type.'
  })],
  [TokenType.BigInteger, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores large integers from -9,223,372,036,854,775,807 to 9,223,372,036,854,775,807.'
  })],
  [TokenType.BigText, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores large text values up to 2GB.'
  })],
  [TokenType.BLOB, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores binary large objects.'
  })],
  [TokenType.GUID, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores globally unique identifiers.'
  })],
  [TokenType.Duration, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores time spans in milliseconds.'
  })],
  [TokenType.Option, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores a set of predefined values.'
  })],
  [TokenType.Char, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores a single character.'
  })],
  [TokenType.Byte, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores a single byte (0-255).'
  })],
  [TokenType.TextConst, createMetadata({
    category: 'Data Type',
    completionKind: CompletionItemKind.TypeParameter,
    description: 'Stores translatable text constants.'
  })],

  // Object Type keywords
  [TokenType.Table, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Defines a database table with fields, keys, and triggers.'
  })],
  [TokenType.Page, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Defines a user interface for viewing and editing data.'
  })],
  [TokenType.Report, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Defines a report for printing or exporting data.'
  })],
  [TokenType.Codeunit, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Contains business logic as procedures and functions.'
  })],
  [TokenType.Query, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Defines a database query combining data from multiple tables.'
  })],
  [TokenType.XMLport, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Imports and exports data in XML or text format.'
  })],
  [TokenType.MenuSuite, createMetadata({
    category: 'Object Type',
    completionKind: CompletionItemKind.Class,
    description: 'Defines navigation menus (deprecated in newer versions).'
  })],

  // Declaration keywords
  [TokenType.Procedure, createMetadata({
    category: 'Declaration',
    completionKind: CompletionItemKind.Keyword,
    description: 'Declares a PROCEDURE that can be called from other code.'
  })],
  [TokenType.Function, createMetadata({
    category: 'Declaration',
    completionKind: CompletionItemKind.Keyword,
    description: 'Alias for PROCEDURE (same functionality).'
  })],
  [TokenType.Local, createMetadata({
    category: 'Keyword',
    completionKind: CompletionItemKind.Keyword,
    description: 'Marks a procedure as local (not visible outside the object).'
  })],
  [TokenType.Var, createMetadata({
    category: 'Declaration',
    completionKind: CompletionItemKind.Keyword,
    description: 'Declares variables or marks parameters as passed by reference.'
  })],
  [TokenType.Trigger, createMetadata({
    category: 'Declaration',
    completionKind: CompletionItemKind.Keyword,
    description: 'Declares an event handler triggered by system events.'
  })],
  [TokenType.Event, createMetadata({
    category: 'Declaration',
    completionKind: CompletionItemKind.Keyword,
    description: 'Declares a handler for DotNet control add-in events (NAV 2016+).'
  })],

  // Boolean Constant keywords
  [TokenType.True, createMetadata({
    category: 'Boolean Constant',
    completionKind: CompletionItemKind.Constant,
    description: 'Boolean TRUE constant.'
  })],
  [TokenType.False, createMetadata({
    category: 'Boolean Constant',
    completionKind: CompletionItemKind.Constant,
    description: 'Boolean FALSE constant.'
  })],

  // Operator keywords
  [TokenType.Div, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'DIV operator performs integer division (discards remainder).'
  })],
  [TokenType.Mod, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'Modulo operator (returns remainder of division).'
  })],
  [TokenType.And, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'Logical AND operator.'
  })],
  [TokenType.Or, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'Logical OR operator.'
  })],
  [TokenType.Not, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'Logical NOT operator (negation).'
  })],
  [TokenType.Xor, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'Logical exclusive OR operator.'
  })],
  [TokenType.In, createMetadata({
    category: 'Operator',
    completionKind: CompletionItemKind.Operator,
    description: 'Tests if value is in a set or range.'
  })],

  // Section keywords
  [TokenType.Code, createMetadata({
    category: 'Section',
    completionKind: CompletionItemKind.Keyword
  })],
  [TokenType.Properties, createMetadata({
    category: 'Section',
    completionKind: CompletionItemKind.Keyword
  })],
  [TokenType.Fields, createMetadata({
    category: 'Section',
    completionKind: CompletionItemKind.Keyword
  })],
  [TokenType.Keys, createMetadata({
    category: 'Section',
    completionKind: CompletionItemKind.Keyword
  })],
  [TokenType.FieldGroups, createMetadata({
    category: 'Section',
    completionKind: CompletionItemKind.Keyword
  })],

  // Other keywords
  [TokenType.With, createMetadata({
    category: 'Keyword',
    completionKind: CompletionItemKind.Keyword
  })],
  [TokenType.Array, createMetadata({
    category: 'Keyword',
    completionKind: CompletionItemKind.Keyword
  })],
  [TokenType.Temporary, createMetadata({
    category: 'Keyword',
    completionKind: CompletionItemKind.Keyword
  })]
]);

/**
 * Keyword metadata map keyed by lowercase keyword string
 * Built programmatically from KEYWORD_METADATA and KEYWORDS map
 * Special handling for 'code' → maps to Code_Type (Data Type) instead of Code (Section)
 */
export const KEYWORD_STRING_METADATA: ReadonlyMap<string, KeywordMetadata> = (() => {
  const map = new Map<string, KeywordMetadata>();

  // Build from KEYWORDS map + KEYWORD_METADATA
  for (const [keyword, tokenType] of KEYWORDS) {
    const metadata = KEYWORD_METADATA.get(tokenType);
    if (metadata) {
      map.set(keyword, metadata);
    }
  }

  // Special case: 'code' as string → Data Type (Code_Type), not Section (Code)
  // This preserves existing hover behavior where hovering over 'code' shows Data Type
  const codeTypeMetadata = KEYWORD_METADATA.get(TokenType.Code_Type);
  if (codeTypeMetadata) {
    map.set('code', codeTypeMetadata);
  }

  return map;
})();

/**
 * Get keyword metadata by TokenType
 * @param tokenType - The token type to look up
 * @returns Metadata for the keyword, or undefined if not found
 */
export function getMetadataByTokenType(tokenType: TokenType): KeywordMetadata | undefined {
  return KEYWORD_METADATA.get(tokenType);
}

/**
 * Get keyword metadata by keyword string (case-insensitive)
 * @param keyword - The keyword string to look up
 * @returns Metadata for the keyword, or undefined if not found
 */
export function getMetadataByKeyword(keyword: string): KeywordMetadata | undefined {
  return KEYWORD_STRING_METADATA.get(keyword.toLowerCase());
}

/**
 * Get hover label for a keyword category
 * @param category - The keyword category
 * @returns The formatted hover label string
 */
export function getHoverLabel(category: KeywordCategory): string {
  switch (category) {
    case 'Data Type':
      return 'C/AL Data Type';
    case 'Control Flow':
      return 'Control Flow Keyword';
    case 'Object Type':
      return 'C/AL Object Type';
    case 'Declaration':
      return 'Declaration Keyword';
    case 'Section':
      return 'Section Keyword';
    case 'Operator':
      return 'Operator';
    case 'Boolean Constant':
      return 'Boolean Constant';
    case 'Keyword':
      return 'Keyword';
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}
