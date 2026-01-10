import { Token, TokenType } from '../lexer/tokens';
import {
  CALDocument,
  ObjectDeclaration,
  ObjectKind,
  PropertySection,
  Property,
  FieldSection,
  FieldDeclaration,
  DataType,
  KeySection,
  KeyDeclaration,
  FieldGroupSection,
  FieldGroup,
  CodeSection,
  VariableDeclaration,
  VariableModifiers,
  ProcedureDeclaration,
  ParameterDeclaration,
  TriggerDeclaration,
  EventDeclaration,
  Statement,
  BlockStatement,
  IfStatement,
  WhileStatement,
  RepeatStatement,
  ForStatement,
  CaseStatement,
  CaseBranch,
  ExitStatement,
  WithStatement,
  AssignmentStatement,
  CallStatement,
  Expression,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  MemberExpression,
  CallExpression,
  ArrayAccessExpression,
  SetLiteral,
  RangeExpression
} from './ast';

/**
 * Keywords that are allowed as identifiers in C/AL.
 * This includes object types, data types, and other keywords that C/AL allows as variable/parameter names.
 * Using a Set provides O(1) lookup performance compared to array.includes().
 */
const ALLOWED_KEYWORDS_AS_IDENTIFIERS = new Set<TokenType>([
  TokenType.Object,     // Variable name for Record 2000000001 (Object table)
  TokenType.Table,      // e.g., "Table" parameter name
  TokenType.Page,       // e.g., "Page" parameter name
  TokenType.Report,     // e.g., "Report" parameter name
  TokenType.Codeunit,   // e.g., "Codeunit" parameter name
  TokenType.Query,      // e.g., "Query" parameter name
  TokenType.XMLport,    // e.g., "XMLport" parameter name
  TokenType.Record,     // e.g., "Record" parameter name
  TokenType.Char,       // e.g., "Char" parameter name
  TokenType.Option,     // e.g., "Option" parameter name
  TokenType.Text,       // e.g., "Text" parameter name
  TokenType.Boolean,    // e.g., "Boolean" parameter name
  TokenType.Code,       // e.g., "Code" section keyword but can be used as name
  // Note: Date_Type and Time_Type removed - now covered by _TYPE suffix check (Issue #52)
  // Issue #54: Add data type keywords verified in test/REAL/
  TokenType.FieldRef,   // e.g., "FieldRef" parameter name (211 occurrences)
  TokenType.RecordRef,  // e.g., "RecordRef" parameter name (99 occurrences)
  TokenType.RecordID,   // e.g., "RecordID" parameter name (17 occurrences)
  TokenType.Duration,   // e.g., "Duration" parameter name (5 occurrences)
  TokenType.BigInteger, // e.g., "BigInteger" parameter name (3 occurrences)
  TokenType.Fields,     // e.g., "Fields" parameter name (2 occurrences)
  TokenType.Byte,       // e.g., "Byte" parameter name (1 occurrence)
]);

/**
 * Result of parsing object header (OBJECT keyword, type, ID, name)
 */
interface ObjectHeader {
  startToken: Token;
  objectKind: ObjectKind;
  objectId: number;
  objectName: string;
}

/**
 * Parser for C/AL language
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];
  private skippedRegions: SkippedRegion[] = [];
  private braceDepth: number = 0; // Track scope depth for section keyword detection

  constructor(tokens: Token[]) {
    // Filter out EOF token for easier parsing
    this.tokens = tokens.filter(t => t.type !== TokenType.EOF);
  }

  /**
   * Safely parse an integer from a token, recording an error if invalid
   */
  private parseInteger(token: Token, context?: string): number {
    const value = parseInt(token.value, 10);
    if (isNaN(value)) {
      const contextMsg = context ? ` (expected ${context})` : '';
      this.recordError(`Invalid integer value: ${token.value}${contextMsg}`, token);
      return 0;
    }
    return value;
  }

  /**
   * Skip @number suffix if present (C/AL auto-numbering)
   */
  private skipAutoNumberSuffix(): void {
    if (this.peek().value === '@') {
      this.advance(); // @
      if (this.check(TokenType.Integer)) {
        this.advance(); // number
      }
    }
  }

  /**
   * Parse the token stream into an AST
   */
  public parse(): CALDocument {
    const startToken = this.peek();
    let object: ObjectDeclaration | null = null;

    // Check for AL-only tokens at the document level
    this.skipALOnlyTokens();

    try {
      if (!this.isAtEnd()) {
        object = this.parseObject();
      }
    } catch (error) {
      if (error instanceof ParseError) {
        this.errors.push(error);
      }
    }

    return {
      type: 'CALDocument',
      object,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse OBJECT declaration
   */
  private parseObject(): ObjectDeclaration {
    const { startToken, objectKind, objectId, objectName } = this.parseObjectHeader();

    // Consume opening brace of object body (if present)
    // Note: Tests may have partial objects without braces
    if (this.check(TokenType.LeftBrace)) {
      this.advance(); // Consume {

      // Skip OBJECT-PROPERTIES section if present (it's metadata, not code)
      this.skipObjectPropertiesSection();
    }

    // Parse sections
    let properties: PropertySection | null = null;
    let fields: FieldSection | null = null;
    let keys: KeySection | null = null;
    let fieldGroups: FieldGroupSection | null = null;
    let code: CodeSection | null = null;
    let objectLevelVariables: VariableDeclaration[] = [];

    while (!this.isAtEnd()) {
      // Check for AL-only tokens at section level
      this.skipALOnlyTokens();

      const token = this.peek();

      try {
        if (token.type === TokenType.Properties) {
          properties = this.parsePropertySection();
        } else if (token.type === TokenType.Fields) {
          fields = this.parseFieldSection();
        } else if (token.type === TokenType.Keys) {
          keys = this.parseKeySection();
        } else if (token.type === TokenType.FieldGroups) {
          fieldGroups = this.parseFieldGroupSection();
        } else if (token.type === TokenType.Var) {
          // Parse object-level VAR section
          // These variables should be included in the CODE section
          this.parseVariableDeclarations(objectLevelVariables);
        } else if (this.isCodeSectionKeyword()) {
          code = this.parseCodeSection();
          // Prepend object-level variables to code section variables
          if (objectLevelVariables.length > 0 && code) {
            code.variables = [...objectLevelVariables, ...code.variables];
          }
        } else if (token.type === TokenType.Controls ||
                   token.type === TokenType.Actions ||
                   token.type === TokenType.DataItems ||
                   token.type === TokenType.Elements ||
                   token.type === TokenType.RequestForm) {
          // Skip unsupported sections (CONTROLS, ACTIONS, DATAITEMS, ELEMENTS, REQUESTFORM)
          // These sections have complex nested structures that aren't fully parsed yet
          this.skipUnsupportedSection(token.type);
        } else {
          break;
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          this.synchronize();
        } else {
          throw error;
        }
      }
    }

    return {
      type: 'ObjectDeclaration',
      objectKind,
      objectId,
      objectName,
      properties,
      fields,
      keys,
      fieldGroups,
      code,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse object header: OBJECT keyword, type, ID, and name
   */
  private parseObjectHeader(): ObjectHeader {
    const startToken = this.consume(TokenType.Object, 'Expected OBJECT keyword');

    // Object type (Table, Page, etc.)
    const objectKindToken = this.advance();
    const objectKind = this.tokenTypeToObjectKind(objectKindToken.type);

    // Object ID
    const idToken = this.consume(TokenType.Integer, 'Expected object ID');
    const objectId = this.parseInteger(idToken, 'object ID');

    // Object Name (can be quoted or unquoted, may contain multiple tokens)
    // If quoted (String token), it's a single token
    // If unquoted, consume all tokens until we hit the opening brace
    let objectName = '';

    if (this.check(TokenType.String)) {
      // Quoted name - single token
      objectName = this.advance().value;
    } else {
      // Unquoted name - consume all tokens until left brace
      const nameParts: string[] = [];
      while (!this.check(TokenType.LeftBrace) && !this.isAtEnd()) {
        nameParts.push(this.advance().value);
      }
      objectName = nameParts.join(' ').trim();
    }

    return { startToken, objectKind, objectId, objectName };
  }

  /**
   * Skip OBJECT-PROPERTIES section if present (it's metadata, not code)
   */
  private skipObjectPropertiesSection(): void {
    if (this.check(TokenType.ObjectProperties)) {
      // Skip OBJECT-PROPERTIES { ... }
      this.advance(); // OBJECT-PROPERTIES
      if (this.check(TokenType.LeftBrace)) {
        this.advance(); // {
        // Skip until matching }
        let depth = 1;
        while (depth > 0 && !this.isAtEnd()) {
          if (this.check(TokenType.LeftBrace)) depth++;
          else if (this.check(TokenType.RightBrace)) depth--;
          this.advance();
        }
      }
    }
  }

  /**
   * Parse PROPERTIES section
   */
  private parsePropertySection(): PropertySection {
    const startToken = this.consume(TokenType.Properties, 'Expected PROPERTIES');
    this.consume(TokenType.LeftBrace, 'Expected {');

    const properties: Property[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const property = this.parseWithRecovery(
        () => this.parseProperty(),
        [TokenType.Semicolon, TokenType.RightBrace]
      );
      if (property) {
        properties.push(property);
      }
    }

    const endToken = this.consume(TokenType.RightBrace, 'Expected }');

    return {
      type: 'PropertySection',
      properties,
      startToken,
      endToken
    };
  }

  private parseProperty(): Property {
    const startToken = this.peek();
    const nameToken = this.advance(); // Property name
    const name = nameToken.value;

    this.consume(TokenType.Equal, 'Expected =');

    // Check if this is a property trigger (value starts with VAR or BEGIN)
    // Property triggers: OnRun, OnValidate, OnLookup, OnInit, OnOpenPage, etc.
    if (this.check(TokenType.Var) || this.check(TokenType.Begin)) {
      // Parse as trigger body
      const triggerVariables: VariableDeclaration[] = [];

      // Some triggers can have VAR section (rare)
      if (this.check(TokenType.Var)) {
        this.parseVariableDeclarations(triggerVariables);
      }

      // Parse the BEGIN...END block and extract its statements
      const block = this.parseBlock();
      const triggerBody = block.statements;

      const endToken = this.consume(TokenType.Semicolon, 'Expected ;');

      return {
        type: 'Property',
        name,
        value: 'BEGIN...END', // Keep a simplified value for display
        triggerBody,
        triggerVariables: triggerVariables.length > 0 ? triggerVariables : undefined,
        startToken,
        endToken
      };
    }

    // Regular property value - read until semicolon, preserving whitespace
    // Special handling: ActionList/DataItemTable properties can have nested ACTIONS/DATAITEMS blocks
    let value = '';
    let lastToken: Token | null = null;
    let braceDepth = 0;
    let bracketDepth = 0;

    while (!this.isAtEnd()) {
      // Stop at semicolon, but only if not inside curly braces or square brackets
      if (this.check(TokenType.Semicolon) && braceDepth === 0 && bracketDepth === 0) {
        break;
      }

      // Stop at RIGHT_BRACE when depth is 0 (end of PROPERTIES section)
      // This handles properties like ActionList=ACTIONS {...} that are the last property
      // and don't have a trailing semicolon before the PROPERTIES closing brace
      if (this.check(TokenType.RightBrace) && braceDepth === 0 && value.length > 0) {
        break;
      }

      // Stop if we encounter a section keyword (ACTIONS, CONTROLS, DATAITEMS, etc) at depth 0
      // UNLESS this is the first token (meaning it's a property like ActionList=ACTIONS { ... })
      if (braceDepth === 0 && value.length > 0 &&
          (this.check(TokenType.Actions) ||
           this.check(TokenType.Controls) ||
           this.check(TokenType.DataItems) ||
           this.check(TokenType.Elements) ||
           this.check(TokenType.RequestForm))) {
        break;
      }

      const currentToken = this.advance();

      // Track brace depth to handle nested structures like ActionList=ACTIONS { ... }
      if (currentToken.type === TokenType.LeftBrace) {
        braceDepth++;
      } else if (currentToken.type === TokenType.RightBrace) {
        braceDepth--;
        // Safety: if depth goes negative, we've consumed too many closing braces
        // This means we've exited the property value and should stop
        if (braceDepth < 0) {
          // Back up one token since we consumed the brace that closes the PROPERTIES section
          this.current--;
          braceDepth = 0;
          break;
        }
      }

      // Track bracket depth to handle array literals like OptionOrdinalValues=[1;2;3;4;5]
      if (currentToken.type === TokenType.LeftBracket) {
        bracketDepth++;
      } else if (currentToken.type === TokenType.RightBracket) {
        bracketDepth--;
        // Safety: if depth goes negative, something went wrong
        if (bracketDepth < 0) {
          bracketDepth = 0;
        }
      }

      // If there's a gap between tokens, add a space
      if (lastToken !== null && currentToken.startOffset > lastToken.endOffset) {
        value += ' ';
      }

      value += currentToken.value;
      lastToken = currentToken;
    }

    // Consume semicolon if present, but it's optional for the last property in a section
    let endToken: Token;
    if (this.check(TokenType.Semicolon)) {
      endToken = this.advance();
    } else {
      // No semicolon - this must be the last property before closing brace
      endToken = lastToken || startToken;
    }

    return {
      type: 'Property',
      name,
      value: value.trim(),
      startToken,
      endToken
    };
  }

  /**
   * Parse FIELDS section
   */
  private parseFieldSection(): FieldSection {
    const startToken = this.consume(TokenType.Fields, 'Expected FIELDS');
    this.consume(TokenType.LeftBrace, 'Expected {');

    const fields: FieldDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const field = this.parseWithRecovery(
        () => this.parseField(),
        [TokenType.LeftBrace, TokenType.RightBrace]
      );
      if (field) {
        fields.push(field);
      }
    }

    const endToken = this.consume(TokenType.RightBrace, 'Expected }');

    return {
      type: 'FieldSection',
      fields,
      startToken,
      endToken
    };
  }

  private parseField(): FieldDeclaration {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected {');

    // Field number
    const fieldNoToken = this.consume(TokenType.Integer, 'Expected field number');
    const fieldNo = this.parseInteger(fieldNoToken, 'field number in FIELDS section');

    this.consume(TokenType.Semicolon, 'Expected ;');

    // Reserved column (always empty in NAV exports)
    // C/AL format: { FieldNo ; (reserved) ; FieldName ; DataType }
    // Note: FlowField/FlowFilter designation appears as FieldClass property, not in this column
    let fieldClass = '';
    if (!this.check(TokenType.Semicolon)) {
      const fieldClassToken = this.advance();
      fieldClass = fieldClassToken.value;
    }

    this.consume(TokenType.Semicolon, 'Expected ;');

    // Field name (can be quoted or unquoted)
    // For unquoted names, read all tokens until semicolon to handle special chars like periods
    // Format: { FieldNo ; FieldClass ; FieldName ... ; DataType ; ... }
    let fieldName = '';

    if (this.check(TokenType.QuotedIdentifier)) {
      // Quoted name - single token (e.g., "No.")
      const nameToken = this.advance();
      fieldName = nameToken.value;
    } else {
      // Unquoted name - read everything between semicolons
      // This handles all special characters: periods, slashes, Unicode, etc.
      // Examples: No., Job No., Update Std. Gen. Jnl. Lines
      const startPos = this.peek();
      const nameParts: string[] = [];

      // Consume all tokens until we hit the next semicolon
      while (!this.check(TokenType.Semicolon) && !this.isAtEnd()) {
        nameParts.push(this.advance().value);
      }

      // Join tokens with single space, then trim leading/trailing whitespace
      // This normalizes field names (spaces around periods, e.g., 'No .')
      fieldName = nameParts.join(' ').trim();

      // Validate field name is not empty
      if (fieldName === '') {
        this.recordError('Field name cannot be empty (in FIELDS section)', startPos);
        fieldName = '<missing>'; // Placeholder for error recovery
      }
    }

    this.consume(TokenType.Semicolon, 'Expected ;');

    // Data type
    const dataType = this.parseDataType();

    // Parse field properties and triggers
    let properties: PropertySection | null = null;
    let triggers: TriggerDeclaration[] | null = null;

    // Consume semicolon after data type if present
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    // Parse properties and triggers if not at closing brace
    if (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const propsStartToken = this.peek();
      const result = this.parseFieldProperties();

      // Create PropertySection if we have properties
      if (result.properties.length > 0) {
        properties = {
          type: 'PropertySection',
          properties: result.properties,
          startToken: propsStartToken,
          endToken: this.previous()
        };
      }

      // Store triggers if we have any
      if (result.triggers.length > 0) {
        triggers = result.triggers;
      }
    }

    const endToken = this.consume(TokenType.RightBrace, 'Expected }');

    return {
      type: 'FieldDeclaration',
      fieldNo,
      fieldClass,
      fieldName,
      dataType,
      properties,
      triggers,
      startToken,
      endToken
    };
  }

  /**
   * Maximum number of dimensions allowed for arrays.
   * C/AL typically supports up to 10 dimensions.
   */
  private static readonly MAX_ARRAY_DIMENSIONS = 10 as const;

  /**
   * Parse comma-separated array dimensions from within brackets.
   * Handles patterns like [10], [9,2], [10,4,4].
   * Assumes the opening '[' has already been consumed.
   *
   * @returns Array of dimension sizes
   */
  private parseArrayDimensions(): number[] {
    const dimensions: number[] = [];

    // Parse first dimension (required)
    const firstSizeToken = this.consume(TokenType.Integer, 'Expected array size');
    dimensions.push(this.parseInteger(firstSizeToken, 'array size'));

    // Parse additional dimensions separated by commas
    while (this.check(TokenType.Comma)) {
      this.advance(); // consume ','
      const dimToken = this.consume(TokenType.Integer, 'Expected array dimension');
      dimensions.push(this.parseInteger(dimToken, 'array dimension'));
    }

    // Validate dimension count
    if (dimensions.length > Parser.MAX_ARRAY_DIMENSIONS) {
      this.recordError(
        `Array cannot have more than ${Parser.MAX_ARRAY_DIMENSIONS} dimensions (found ${dimensions.length})`,
        this.peek()
      );
    }

    return dimensions;
  }

  /**
   * Parse data type specification
   * Supports: simple types, sized types, Record types, ARRAY types, TextConst
   * @returns DataType node with type information
   */
  private parseDataType(): DataType {
    const startToken = this.peek();
    const typeToken = this.advance();
    let typeName = typeToken.value;

    let length: number | undefined;
    let tableId: number | undefined;

    // Check for ARRAY[n] OF Type or ARRAY[n,m,...] OF Type pattern (multi-dimensional)
    if (typeName.toUpperCase() === 'ARRAY' && this.check(TokenType.LeftBracket)) {
      this.advance(); // consume '['

      const dimensions = this.parseArrayDimensions();

      this.consume(TokenType.RightBracket, 'Expected ]');

      // Expect OF keyword
      let hasTemporary = false;
      if (this.check(TokenType.Of)) {
        this.advance();

        // Check for TEMPORARY keyword before element type
        // This handles: ARRAY [4] OF TEMPORARY Record 48
        if (this.check(TokenType.Temporary)) {
          hasTemporary = true;
          this.advance();
        }

        const elementType = this.parseDataType();

        // Build typeName with all dimensions
        const dimensionStr = dimensions.join(',');
        typeName = `ARRAY[${dimensionStr}] OF ${elementType.typeName}`;
      }

      return {
        type: 'DataType',
        typeName,
        length: dimensions[0], // Keep first dimension for backwards compatibility
        dimensions, // Store all dimensions
        tableId,
        isTemporary: hasTemporary,
        startToken,
        endToken: this.previous()
      };
    }

    // Check for object type <ID> patterns (Record, Codeunit, Page, Report, Query, XMLport)
    const objectTypes = ['RECORD', 'CODEUNIT', 'PAGE', 'REPORT', 'QUERY', 'XMLPORT'];
    if (objectTypes.includes(typeName.toUpperCase()) && this.check(TokenType.Integer)) {
      const objectIdToken = this.advance();
      const objectId = this.parseInteger(objectIdToken, 'table/page/report ID');
      // For Record types, store as tableId for backwards compatibility
      if (typeName.toUpperCase() === 'RECORD') {
        tableId = objectId;
      }
      typeName = `${typeName} ${objectId}`;
    }

    // Extract embedded size from type names like Code20, Text100, Decimal5
    // C/AL NAV exports use embedded sizes in type names
    // Store the base type name, but also extract length for formatting purposes
    const sizeMatch = typeName.match(/^([A-Za-z]+)(\d+)$/);
    if (sizeMatch && !length) {
      const baseType = sizeMatch[1];
      const embeddedSize = parseInt(sizeMatch[2], 10);
      // Only extract if it's a known sized type
      if (['Code', 'Text', 'Decimal'].some(t => t.toUpperCase() === baseType.toUpperCase())) {
        length = embeddedSize;
        // Keep original typeName for compatibility with existing code
        // (e.g., symbol table expects "Code20" not "Code")
      }
    }

    // Check for length specification [length] - e.g., Text[30], Code[20]
    if (this.check(TokenType.LeftBracket)) {
      this.advance();
      const lengthToken = this.consume(TokenType.Integer, 'Expected length');
      length = this.parseInteger(lengthToken, 'string/code length');
      this.consume(TokenType.RightBracket, 'Expected ]');
      // Include bracket notation in typeName for proper display
      typeName = `${typeName}[${length}]`;
    }

    // Handle TextConst with string value: TextConst 'ENU=...'
    if (typeName.toUpperCase() === 'TEXTCONST' && this.check(TokenType.String)) {
      this.advance(); // consume the string value
    }

    // Handle DotNet with assembly-qualified type
    // Format: DotNet "'assembly'.Namespace.Type" (entire thing in double quotes = QuotedIdentifier)
    // Examples:
    //   DotNet "'mscorlib'.System.DateTime"
    //   DotNet "'System.Xml, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089'.System.Xml.XmlNode"
    //   DotNet "'mscorlib'.System.Collections.Generic.Dictionary`2"
    //   DotNet "'Microsoft.Dynamics.Nav.Ncl'.Microsoft.Dynamics.Nav.Runtime.WebServiceActionContext+StatusCode"
    //
    // The lexer tokenizes the entire "'assembly'.Type" as a single QuotedIdentifier token.
    // We need to parse its value to extract assembly reference and type name.
    if (typeName.toUpperCase() === 'DOTNET' && this.check(TokenType.QuotedIdentifier)) {
      const quotedTypeToken = this.advance(); // consume the entire "'assembly'.Type" string
      const fullTypeSpec = quotedTypeToken.value; // e.g., "'mscorlib'.System.DateTime"

      // Parse the value: 'assembly'.Type.Name
      // Assembly reference is between the first pair of single quotes
      const assemblyMatch = fullTypeSpec.match(/^'([^']+)'\./);

      if (!assemblyMatch) {
        this.recordError('Invalid DotNet type format, expected \'assembly\'.TypeName', this.peek());
        return {
          type: 'DataType',
          typeName: 'DotNet',
          startToken,
          endToken: this.previous()
        };
      }

      const assemblyReference = assemblyMatch[1]; // Extract assembly name (without quotes)
      const dotNetTypeName = fullTypeSpec.substring(assemblyMatch[0].length); // Everything after 'assembly'.

      return {
        type: 'DataType',
        typeName: 'DotNet',
        assemblyReference,
        dotNetTypeName,
        startToken,
        endToken: this.previous()
      };
    }

    // Handle enum-style single-quoted option strings
    // When the type is a single-quoted string like 'Label,Presentation,Calculation',
    // the lexer emits a STRING token, which becomes the typeName directly.
    // Example: LinkBaseType@1000 : 'Label,Presentation,Calculation,Reference';
    // If typeName contains commas and doesn't look like a standard type name,
    // it's likely an inline option string - populate optionString field.
    let optionString: string | undefined;
    if (typeName.includes(',') && !typeName.includes('.')) {
      // This looks like an inline option string (e.g., 'Open,Pending,Posted')
      optionString = typeName;
    }

    return {
      type: 'DataType',
      typeName,
      length,
      tableId,
      optionString,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse field properties and triggers after the data type
   * Field properties follow format: PropertyName=Value;
   * Field triggers follow format: OnValidate=BEGIN...END;
   *
   * @returns Object containing arrays of properties and triggers parsed from the field
   */
  private parseFieldProperties(): { properties: Property[], triggers: TriggerDeclaration[] } {
    const properties: Property[] = [];
    const triggers: TriggerDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const result = this.parseWithRecovery(
        () => {
          const startToken = this.peek();
          const nameToken = this.advance(); // Property or trigger name
          const name = nameToken.value;

          this.consume(TokenType.Equal, 'Expected =');

          // Check if this is a trigger (starts with BEGIN or VAR) or regular property
          if (this.check(TokenType.Begin) || this.check(TokenType.Var)) {
            // This is a field trigger (OnValidate, OnLookup, etc.)
            return { type: 'trigger' as const, trigger: this.parseFieldTrigger(name, startToken) };
          } else {
            // Regular property - read value until semicolon, tracking bracket depth for arrays
            let value = '';
            let bracketDepth = 0;
            let lastToken: Token | null = null;

            while (!this.isAtEnd()) {
              // Stop at semicolon only if not inside brackets
              if (this.check(TokenType.Semicolon) && bracketDepth === 0) {
                break;
              }

              // Stop at right brace when not inside brackets (end of field properties)
              if (this.check(TokenType.RightBrace) && bracketDepth === 0) {
                break;
              }

              const currentToken = this.advance();

              // Track bracket depth
              if (currentToken.type === TokenType.LeftBracket) {
                bracketDepth++;
              } else if (currentToken.type === TokenType.RightBracket) {
                bracketDepth--;
                if (bracketDepth < 0) {
                  bracketDepth = 0;
                }
              }

              // Preserve whitespace between tokens
              if (lastToken !== null && currentToken.startOffset > lastToken.endOffset) {
                value += ' ';
              }

              value += currentToken.value;
              lastToken = currentToken;
            }

            if (this.check(TokenType.Semicolon)) {
              this.advance();
            }

            return {
              type: 'property' as const,
              property: {
                type: 'Property' as const,
                name,
                value: value.trim(),
                startToken,
                endToken: this.previous()
              }
            };
          }
        },
        [TokenType.Semicolon, TokenType.RightBrace]
      );

      if (result) {
        if (result.type === 'trigger') {
          triggers.push(result.trigger);
        } else {
          properties.push(result.property);
        }
      }
    }

    return { properties, triggers };
  }

  /**
   * Parse KEYS section
   */
  private parseKeySection(): KeySection {
    const startToken = this.consume(TokenType.Keys, 'Expected KEYS');
    this.consume(TokenType.LeftBrace, 'Expected {');

    const keys: KeyDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const key = this.parseWithRecovery(
        () => this.parseKey(),
        [TokenType.LeftBrace, TokenType.RightBrace]
      );
      if (key) {
        keys.push(key);
      }
    }

    const endToken = this.consume(TokenType.RightBrace, 'Expected }');

    return {
      type: 'KeySection',
      keys,
      startToken,
      endToken
    };
  }

  private parseKey(): KeyDeclaration {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected {');

    const fields: string[] = [];

    // Parse field list
    while (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const fieldToken = this.advance();
      fields.push(fieldToken.value);

      if (this.check(TokenType.Comma)) {
        this.advance();
      }
    }

    // Skip any remaining content until }
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      this.advance();
    }

    const endToken = this.consume(TokenType.RightBrace, 'Expected }');

    return {
      type: 'KeyDeclaration',
      fields,
      properties: null,
      startToken,
      endToken
    };
  }

  /**
   * Parse FIELDGROUPS section
   */
  private parseFieldGroupSection(): FieldGroupSection {
    const startToken = this.consume(TokenType.FieldGroups, 'Expected FIELDGROUPS');
    this.consume(TokenType.LeftBrace, 'Expected {');

    const fieldGroups: FieldGroup[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      // Skip for now - simplified implementation
      this.advance();
    }

    const endToken = this.consume(TokenType.RightBrace, 'Expected }');

    return {
      type: 'FieldGroupSection',
      fieldGroups,
      startToken,
      endToken
    };
  }

  /**
   * Parse CODE section
   */
  private parseCodeSection(): CodeSection {
    const startToken = this.consume(TokenType.Code, 'Expected CODE');

    // Consume opening brace of CODE section (if present)
    if (this.check(TokenType.LeftBrace)) {
      this.advance();
    }

    // Skip whitespace and newlines
    while (this.check(TokenType.Whitespace) || this.check(TokenType.NewLine)) {
      this.advance();
    }

    const variables: VariableDeclaration[] = [];
    const procedures: ProcedureDeclaration[] = [];
    const triggers: TriggerDeclaration[] = [];
    const events: EventDeclaration[] = [];

    // Parse VAR section if present
    if (this.check(TokenType.Var)) {
      this.parseVariableDeclarations(variables);
    }

    // Parse procedures, triggers, and events
    while (!this.isAtEnd()) {
      try {
        // Check for AL-only tokens before procedure/trigger declarations
        this.skipALOnlyTokens();

        // Skip attributes like [External], [Integration], etc.
        // These are attributes in square brackets before procedure declarations
        while (this.check(TokenType.LeftBracket)) {
          this.advance(); // consume [
          // Skip until closing ]
          while (!this.check(TokenType.RightBracket) && !this.isAtEnd()) {
            this.advance();
          }
          if (this.check(TokenType.RightBracket)) {
            this.advance(); // consume ]
          }
        }

        // Check for LOCAL keyword before PROCEDURE/FUNCTION
        let isLocal = false;
        if (this.check(TokenType.Local)) {
          isLocal = true;
          this.advance(); // consume LOCAL

          // Check for AL-only tokens after LOCAL (e.g., "LOCAL internal PROCEDURE")
          this.skipALOnlyTokens();
        }

        if (this.check(TokenType.Procedure) || this.check(TokenType.Function)) {
          procedures.push(this.parseProcedure(isLocal));
        } else if (this.check(TokenType.Trigger)) {
          triggers.push(this.parseTrigger());
        } else if (this.check(TokenType.Event)) {
          events.push(this.parseEvent());
        } else if (this.check(TokenType.Begin)) {
          // Main code block (documentation trigger) - skip for now
          break;
        } else {
          break;
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Skip to next procedure/trigger/event/end
          while (!this.check(TokenType.Procedure) && !this.check(TokenType.Function) &&
                 !this.check(TokenType.Trigger) && !this.check(TokenType.Event) &&
                 !this.check(TokenType.Begin) && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          throw error;
        }
      }
    }

    return {
      type: 'CodeSection',
      variables,
      procedures,
      triggers,
      events,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse variable declarations section (VAR keyword and variable list)
   * Handles TEMPORARY keyword and @number auto-numbering syntax
   * @param variables - Array to populate with parsed variable declarations
   */
  private parseVariableDeclarations(variables: VariableDeclaration[]): void {
    this.consume(TokenType.Var, 'Expected VAR');

    while (!this.isAtEnd()) {
      // Check for section boundaries FIRST (before checking if it's a valid identifier)
      // This prevents treating CODE, PROCEDURE, etc. as variable names
      if (this.isVariableSectionBoundary()) {
        // Exit the VAR section when we hit an actual boundary
        break;
      } else if (this.canBeUsedAsIdentifier()) {
        const startToken = this.peek();
        const nameToken = this.advance();

        // Skip @number if present (C/AL auto-numbering)
        this.skipAutoNumberSuffix();

        this.consume(TokenType.Colon, 'Expected :');

        // Check for TEMPORARY keyword before data type
        let isTemporary: boolean | undefined;
        if (this.check(TokenType.Temporary)) {
          isTemporary = true;
          this.advance();
        }

        const dataType = this.parseDataType();

        // Also check if TEMPORARY is part of ARRAY OF TEMPORARY pattern (stored in dataType)
        if (!isTemporary && dataType.isTemporary) {
          isTemporary = true;
        }

        // Parse post-type modifiers (INDATASET, WITHEVENTS, RUNONCLIENT, SECURITYFILTERING)
        const modifiers = this.parsePostTypeModifiers(true); // true = include INDATASET for variables

        this.consume(TokenType.Semicolon, 'Expected ;');

        const variable: VariableDeclaration = {
          type: 'VariableDeclaration',
          name: nameToken.value,
          dataType,
          startToken,
          endToken: this.previous()
        };

        // Only assign modifiers that are set (avoid undefined properties)
        if (isTemporary) variable.isTemporary = isTemporary;
        if (modifiers.isInDataSet) variable.isInDataSet = modifiers.isInDataSet;
        if (modifiers.withEvents) variable.withEvents = modifiers.withEvents;
        if (modifiers.runOnClient) variable.runOnClient = modifiers.runOnClient;
        if (modifiers.securityFiltering) variable.securityFiltering = modifiers.securityFiltering;

        variables.push(variable);
      } else {
        // Non-identifier found where a variable name is expected
        // Issue #53: Record error when reserved keyword is used as variable name, but only
        // if the syntax matches a variable declaration attempt (i.e., followed by @number or colon)
        const token = this.peek();
        const nextToken = this.peekAhead(1);
        const isAttemptedVarDecl = this.isVariableDeclarationAttempt(nextToken);

        if (isAttemptedVarDecl) {
          // Someone is trying to use a reserved keyword as a variable name
          this.recordError(`Cannot use reserved keyword '${token.value}' as variable name`, token);

          // Error recovery: skip past this bad declaration and continue
          while (!this.isAtEnd() &&
                 !this.check(TokenType.Semicolon) &&
                 !this.isVariableSectionBoundary()) {
            this.advance();
          }
          if (this.check(TokenType.Semicolon)) {
            this.advance(); // consume semicolon
          }
          continue; // Try to parse next variable
        }
        break; // Not a variable declaration attempt, exit VAR section
      }
    }
  }

  /**
   * Checks if the next token suggests this is an attempted variable declaration
   * with an invalid identifier. Used to distinguish between malformed variable
   * declarations (which should report an error) and legitimate section boundaries.
   *
   * A token is considered a variable declaration attempt if followed by:
   * - A colon (:) indicating the type separator
   * - An @ symbol indicating auto-numbering syntax
   *
   * @param nextToken The token following the current (invalid) identifier
   * @returns true if this looks like a variable declaration attempt
   */
  private isVariableDeclarationAttempt(nextToken: Token | undefined): boolean {
    if (!nextToken) return false;
    return nextToken.type === TokenType.Colon ||
           (nextToken.type === TokenType.Unknown && nextToken.value === '@');
  }

  /**
   * Parse post-type variable modifiers in canonical order.
   * Order: INDATASET → WITHEVENTS → RUNONCLIENT → SECURITYFILTERING
   * Note: NAV always exports WITHEVENTS before RUNONCLIENT when both are present.
   * @param includeInDataSet - Whether to parse INDATASET (only valid for variables, not parameters)
   */
  private parsePostTypeModifiers(includeInDataSet: boolean): VariableModifiers {
    const modifiers: VariableModifiers = {};

    // INDATASET modifier (only for page variables, not parameters)
    if (includeInDataSet && this.check(TokenType.InDataSet)) {
      modifiers.isInDataSet = true;
      this.advance();
    }

    // WITHEVENTS and RUNONCLIENT modifiers (for Automation/DotNet variables)
    // Real NAV exports WITHEVENTS before RUNONCLIENT, but we accept both orders
    // for lenient parsing (semantic validation is C/SIDE's responsibility)
    for (let i = 0; i < 2; i++) {
      if (this.check(TokenType.WithEvents) && !modifiers.withEvents) {
        modifiers.withEvents = true;
        this.advance();
      } else if (this.check(TokenType.RunOnClient) && !modifiers.runOnClient) {
        modifiers.runOnClient = true;
        this.advance();
      }
    }

    // SECURITYFILTERING modifier (NAV 2013 R2+) for Record/Query variables
    // Syntax: SECURITYFILTERING(Filtered|Ignored|Validated|Disallowed)
    if (this.check(TokenType.SecurityFiltering)) {
      this.advance();
      this.consume(TokenType.LeftParen, 'Expected ( after SECURITYFILTERING');
      const valueToken = this.consume(TokenType.Identifier, 'Expected security filtering value');
      modifiers.securityFiltering = valueToken.value;
      this.consume(TokenType.RightParen, 'Expected ) after security filtering value');
    }

    return modifiers;
  }

  private parseProcedure(isLocal: boolean = false): ProcedureDeclaration {
    const startToken = this.advance(); // PROCEDURE or FUNCTION

    const name = this.parseProcedureName();

    const parameters = this.parseProcedureParameters();

    const returnType = this.parseProcedureReturnType();

    // Parse local variables
    const variables: VariableDeclaration[] = [];
    if (this.check(TokenType.Var)) {
      this.parseVariableDeclarations(variables);
    }

    // Parse body
    const body: Statement[] = [];
    if (this.check(TokenType.Begin)) {
      const block = this.parseBlock();
      body.push(...block.statements);
    }

    // Skip semicolon after END
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'ProcedureDeclaration',
      name,
      parameters,
      returnType,
      isLocal,
      variables,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse procedure/function name, handling @number syntax for C/AL auto-numbering
   */
  private parseProcedureName(): string {
    const nameToken = this.advance();
    const name = nameToken.value;

    // Skip @number if present (C/AL auto-numbering)
    this.skipAutoNumberSuffix();

    return name;
  }

  /**
   * Parse procedure/function parameter list including parentheses
   */
  private parseProcedureParameters(): ParameterDeclaration[] {
    const parameters: ParameterDeclaration[] = [];

    // Parse parameters if present
    if (!this.check(TokenType.LeftParen)) {
      return parameters;
    }

    this.advance(); // consume '('

    // Parse parameter list
    while (!this.check(TokenType.RightParen) && !this.isAtEnd()) {
      // Check for VAR keyword (pass by reference)
      let isVar = false;
      if (this.check(TokenType.Var)) {
        isVar = true;
        this.advance();
      }

      // Parameter name (can be identifier or keyword used as identifier)
      if (this.canBeUsedAsIdentifier()) {
        const paramToken = this.advance();
        const paramName = paramToken.value;

        // Skip @number if present (C/AL auto-numbering)
        this.skipAutoNumberSuffix();

        // Colon and type
        let isTemporary: boolean | undefined;
        let dataType: DataType | null = null;
        if (this.check(TokenType.Colon)) {
          this.advance();

          // Check for TEMPORARY keyword before data type
          if (this.check(TokenType.Temporary)) {
            isTemporary = true;
            this.advance();
          }

          dataType = this.parseDataType();

          // Also check if TEMPORARY is part of ARRAY OF TEMPORARY pattern (stored in dataType)
          if (!isTemporary && dataType && dataType.isTemporary) {
            isTemporary = true;
          }
        }

        // Parse post-type modifiers (WITHEVENTS, RUNONCLIENT, SECURITYFILTERING)
        // Note: INDATASET is NOT valid on parameters (only on page variables)
        const modifiers = this.parsePostTypeModifiers(false); // false = exclude INDATASET for parameters

        const param: ParameterDeclaration = {
          type: 'ParameterDeclaration',
          name: paramName,
          dataType: dataType || { type: 'DataType', typeName: 'Variant', startToken: paramToken, endToken: paramToken },
          isVar,
          startToken: paramToken,
          endToken: this.previous()
        };

        // Only assign modifiers that are set (avoid undefined properties)
        if (isTemporary) param.isTemporary = isTemporary;
        if (modifiers.withEvents) param.withEvents = modifiers.withEvents;
        if (modifiers.runOnClient) param.runOnClient = modifiers.runOnClient;
        if (modifiers.securityFiltering) param.securityFiltering = modifiers.securityFiltering;

        parameters.push(param);
      }

      // Skip semicolon between parameters
      if (this.check(TokenType.Semicolon)) {
        this.advance();
      } else if (!this.check(TokenType.RightParen)) {
        this.recordError(`Unexpected token '${this.peek().value}' in parameter list (expected ';' or ')')`, this.peek());
        this.advance();
      }
    }

    this.consume(TokenType.RightParen, 'Expected )');

    // Skip semicolon after procedure declaration
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return parameters;
  }

  /**
   * Parse optional return type for procedure/function declarations
   */
  private parseProcedureReturnType(): DataType | null {
    let returnType: DataType | null = null;

    if (this.check(TokenType.Colon)) {
      this.advance();
      returnType = this.parseDataType();
    }

    // Skip semicolon after return type
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return returnType;
  }

  /**
   * Parse a field-level trigger (e.g., OnValidate=BEGIN...END;)
   * Unlike CODE section triggers, these don't have the TRIGGER keyword - the trigger name
   * comes from the property name (OnValidate, OnLookup, etc.)
   *
   * @param name The trigger name (e.g., "OnValidate", "OnLookup")
   * @param startToken The token where the trigger name started (for position tracking)
   */
  private parseFieldTrigger(name: string, startToken: Token): TriggerDeclaration {
    // Parse local variables if VAR section is present (rare but possible)
    const variables: VariableDeclaration[] = [];
    if (this.check(TokenType.Var)) {
      this.parseVariableDeclarations(variables);
    }

    // Parse trigger body (BEGIN...END block)
    const body: Statement[] = [];
    if (this.check(TokenType.Begin)) {
      const block = this.parseBlock();
      body.push(...block.statements);
    }

    // Consume trailing semicolon after END
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'TriggerDeclaration',
      name,
      variables,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse a TRIGGER declaration (e.g., OnInsert, OnValidate, OnDelete)
   */
  private parseTrigger(): TriggerDeclaration {
    const startToken = this.consume(TokenType.Trigger, 'Expected TRIGGER');

    // Trigger name
    const nameToken = this.advance();
    const name = nameToken.value;

    // Skip parentheses if present (e.g., OnInsert())
    if (this.check(TokenType.LeftParen)) {
      this.advance();
      if (this.check(TokenType.RightParen)) {
        this.advance();
      }
    }

    // Skip semicolon after trigger declaration
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    // Parse local variables
    const variables: VariableDeclaration[] = [];
    if (this.check(TokenType.Var)) {
      this.parseVariableDeclarations(variables);
    }

    // Parse trigger body
    const body: Statement[] = [];
    if (this.check(TokenType.Begin)) {
      const block = this.parseBlock();
      body.push(...block.statements);
    }

    // Skip semicolon after END
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'TriggerDeclaration',
      name,
      variables,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse an EVENT declaration for DotNet control add-in event handlers
   * Syntax: EVENT SubscriberName@Number::EventName@Number(parameters);
   * Example: EVENT CameraProvider@1001::PictureAvailable@10(PictureName@1001 : Text;PictureFilePath@1000 : Text);
   */
  private parseEvent(): EventDeclaration {
    const startToken = this.consume(TokenType.Event, 'Expected EVENT');

    // Parse subscriber name (e.g., "CameraProvider@1001" or "WebPageViewer@-2")
    const subscriberName = this.parseEventQualifiedName();

    // Expect :: scope resolution operator
    this.consume(TokenType.DoubleColon, 'Expected ::');

    // Parse event name (e.g., "PictureAvailable@10" or "ControlAddInReady@8")
    const eventName = this.parseEventQualifiedName();

    // Parse parameters (reuse existing parameter parsing)
    const parameters = this.parseProcedureParameters();

    // Consume semicolon after event declaration
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    // Parse local variables
    const variables: VariableDeclaration[] = [];
    if (this.check(TokenType.Var)) {
      this.parseVariableDeclarations(variables);
    }

    // Parse event body
    const body: Statement[] = [];
    if (this.check(TokenType.Begin)) {
      const block = this.parseBlock();
      body.push(...block.statements);
    }

    // Skip semicolon after END
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'EventDeclaration',
      subscriberName,
      eventName,
      parameters,
      variables,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse an event-qualified name which includes @number suffix.
   * Unlike procedure names, EVENT names retain the @number suffix because it's part
   * of the event identity (e.g., "CameraProvider@1001" refers to a specific control).
   * Examples: "CameraProvider@1001", "WebPageViewer@-2", "PictureAvailable@10"
   */
  private parseEventQualifiedName(): string {
    // Validate that we have an identifier-like token
    if (!this.canBeUsedAsIdentifier()) {
      this.recordError(`Expected identifier for event name, found '${this.peek().value}'`, this.peek());
      // Try to recover by returning empty string
      return '';
    }

    // Get the identifier part
    const nameToken = this.advance();
    let name = nameToken.value;

    // Check for @number suffix (@ is tokenized as Unknown with value '@')
    // Can be negative like @-2
    if (this.check(TokenType.Unknown) && this.peek().value === '@') {
      this.advance(); // consume @
      // Handle optional negative sign
      if (this.check(TokenType.Minus)) {
        name += '@-';
        this.advance();
        // Expect integer after minus
        if (this.check(TokenType.Integer)) {
          name += this.advance().value;
        } else {
          this.recordError(`Expected number after @- in event name`, this.peek());
        }
      } else if (this.check(TokenType.Integer)) {
        // Positive number
        name += '@';
        name += this.advance().value;
      } else {
        this.recordError(`Expected number after @ in event name`, this.peek());
        name += '@';
      }
    }

    return name;
  }

  private parseBlock(): BlockStatement {
    const startToken = this.consume(TokenType.Begin, 'Expected BEGIN');
    const statements: Statement[] = [];

    while (!this.check(TokenType.End) && !this.isAtEnd()) {
      const stmt = this.parseWithRecovery(
        () => this.parseStatement(),
        [TokenType.Semicolon, TokenType.End]
      );
      if (stmt) {
        statements.push(stmt);
      }
    }

    const endToken = this.consume(TokenType.End, 'Expected END');

    return {
      type: 'BlockStatement',
      statements,
      startToken,
      endToken
    };
  }

  private parseStatement(): Statement | null {
    // Check for AL-only tokens at statement level
    this.skipALOnlyTokens();

    const _startToken = this.peek();

    // IF statement
    if (this.check(TokenType.If)) {
      return this.parseIfStatement();
    }

    // WHILE statement
    if (this.check(TokenType.While)) {
      return this.parseWhileStatement();
    }

    // REPEAT statement
    if (this.check(TokenType.Repeat)) {
      return this.parseRepeatStatement();
    }

    // FOR statement
    if (this.check(TokenType.For)) {
      return this.parseForStatement();
    }

    // CASE statement
    if (this.check(TokenType.Case)) {
      return this.parseCaseStatement();
    }

    // EXIT statement
    if (this.check(TokenType.Exit)) {
      return this.parseExitStatement();
    }

    // WITH statement
    if (this.check(TokenType.With)) {
      return this.parseWithStatement();
    }

    // BEGIN block
    if (this.check(TokenType.Begin)) {
      return this.parseBlock();
    }

    // Assignment or procedure call
    return this.parseAssignmentOrCall();
  }

  private parseIfStatement(): IfStatement {
    const startToken = this.consume(TokenType.If, 'Expected IF');

    // Parse condition
    const condition = this.parseExpression();

    // THEN
    this.consume(TokenType.Then, 'Expected THEN');

    // Parse then branch
    const thenBranch = this.check(TokenType.Begin)
      ? this.parseBlock()
      : this.parseStatement();

    if (!thenBranch) {
      throw new ParseError('Expected statement after THEN', this.peek());
    }

    // Parse optional else branch
    let elseBranch: Statement | null = null;
    if (this.check(TokenType.Else)) {
      this.advance();
      elseBranch = this.check(TokenType.Begin)
        ? this.parseBlock()
        : this.parseStatement();

      if (!elseBranch) {
        throw new ParseError('Expected statement after ELSE', this.peek());
      }
    }

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
      startToken,
      endToken: this.previous()
    };
  }

  private parseWhileStatement(): WhileStatement {
    const startToken = this.consume(TokenType.While, 'Expected WHILE');

    // Parse condition
    const condition = this.parseExpression();

    // DO
    this.consume(TokenType.Do, 'Expected DO');

    // Parse body
    const body = this.check(TokenType.Begin)
      ? this.parseBlock()
      : this.parseStatement();

    if (!body) {
      throw new ParseError('Expected statement after DO', this.peek());
    }

    return {
      type: 'WhileStatement',
      condition,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  private parseRepeatStatement(): RepeatStatement {
    const startToken = this.consume(TokenType.Repeat, 'Expected REPEAT');

    // Parse body statements
    const body: Statement[] = [];
    while (!this.check(TokenType.Until) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
    }

    // UNTIL
    this.consume(TokenType.Until, 'Expected UNTIL');

    // Parse condition
    const condition = this.parseExpression();

    // Semicolon after UNTIL condition
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'RepeatStatement',
      body,
      condition,
      startToken,
      endToken: this.previous()
    };
  }

  private parseForStatement(): ForStatement {
    const startToken = this.consume(TokenType.For, 'Expected FOR');

    // Variable - create proper Identifier node
    const varToken = this.advance();
    const variable: Identifier = {
      type: 'Identifier',
      name: varToken.value,
      isQuoted: varToken.type === TokenType.QuotedIdentifier,
      startToken: varToken,
      endToken: varToken
    };

    // :=
    this.consume(TokenType.Assign, 'Expected :=');

    // From expression
    const from = this.parseExpression();

    // TO or DOWNTO
    let downto = false;
    if (this.check(TokenType.DownTo)) {
      this.advance();
      downto = true;
    } else {
      this.consume(TokenType.To, 'Expected TO or DOWNTO');
    }

    // To expression
    const to = this.parseExpression();

    // DO
    this.consume(TokenType.Do, 'Expected DO');

    // Parse body
    const body = this.check(TokenType.Begin)
      ? this.parseBlock()
      : this.parseStatement();

    if (!body) {
      throw new ParseError('Expected statement after DO', this.peek());
    }

    return {
      type: 'ForStatement',
      variable,
      from,
      to,
      downto,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  private parseCaseStatement(): CaseStatement {
    const startToken = this.consume(TokenType.Case, 'Expected CASE');

    // Parse expression
    const expression = this.parseExpression();

    // OF
    this.consume(TokenType.Of, 'Expected OF');

    // Parse branches
    const branches: CaseBranch[] = [];
    let elseBranch: Statement[] | null = null;

    while (!this.check(TokenType.End) && !this.isAtEnd()) {
      if (this.check(TokenType.Else)) {
        elseBranch = this.parseCaseElseBranch();
        break;
      }

      branches.push(this.parseCaseBranch());
    }

    this.consume(TokenType.End, 'Expected END');
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'CaseStatement',
      expression,
      branches,
      elseBranch,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse a single CASE branch with values and statements
   */
  private parseCaseBranch(): CaseBranch {
    const branchStart = this.peek();
    const values: Expression[] = [];

    // Parse value(s), including range expressions (e.g., 1..10)
    values.push(this.parseCaseValue());
    while (this.check(TokenType.Comma)) {
      this.advance();
      values.push(this.parseCaseValue());
    }

    // Colon
    this.consume(TokenType.Colon, 'Expected :');

    // Parse statement(s)
    const statements: Statement[] = [];
    if (this.check(TokenType.Begin)) {
      const block = this.parseBlock();
      statements.push(...block.statements);
    } else {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    // Consume optional semicolon after statements
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'CaseBranch',
      values,
      statements,
      startToken: branchStart,
      endToken: this.previous()
    };
  }

  /**
   * Parse a single CASE value, which may be a discrete value or a range expression
   * Examples: 1, 'A', Status::Open, 1..10, 'A'..'Z'
   */
  private parseCaseValue(): Expression {
    const expr = this.parseExpression();

    // Check for range expression (e.g., 1..10)
    if (this.check(TokenType.DotDot)) {
      this.advance(); // consume ..
      const endExpr = this.parseExpression();
      return {
        type: 'RangeExpression',
        start: expr,
        end: endExpr,
        startToken: expr.startToken,
        endToken: endExpr.endToken
      } as RangeExpression;
    }

    return expr;
  }

  /**
   * Parse ELSE branch statements in a CASE statement
   */
  private parseCaseElseBranch(): Statement[] {
    this.advance(); // consume ELSE token
    const statements: Statement[] = [];
    while (!this.check(TokenType.End) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }
    return statements;
  }

  private parseExitStatement(): ExitStatement {
    const startToken = this.consume(TokenType.Exit, 'Expected EXIT');

    let value: Expression | null = null;
    if (this.check(TokenType.LeftParen)) {
      this.advance();
      if (!this.check(TokenType.RightParen)) {
        value = this.parseExpression();
      }
      this.consume(TokenType.RightParen, 'Expected )');
    }

    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'ExitStatement',
      value,
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse WITH-DO statement
   *
   * Syntax: WITH record DO statement
   *
   * The WITH statement creates a temporary scope where fields of the record
   * can be accessed without qualification. For example:
   *   WITH Customer DO
   *     "No." := '1000';  // Same as Customer."No." := '1000';
   *
   * Supports nesting: inner WITH takes precedence for field resolution.
   * Note: C/AL only supports single-variable WITH (not multi-variable).
   */
  private parseWithStatement(): WithStatement {
    const startToken = this.consume(TokenType.With, 'Expected WITH');

    // Parse record expression (variable or complex expression)
    const record = this.parseExpression();

    // DO keyword
    this.consume(TokenType.Do, 'Expected DO');

    // Parse body (can be BEGIN-END block or single statement)
    const body = this.check(TokenType.Begin)
      ? this.parseBlock()
      : this.parseStatement();

    if (!body) {
      throw new ParseError('Expected statement after DO', this.peek());
    }

    // Optional semicolon after WITH statement
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'WithStatement',
      record,
      body,
      startToken,
      endToken: this.previous()
    };
  }

  private parseAssignmentOrCall(): Statement | null {
    const startToken = this.peek();

    // Parse the left-hand side expression
    const expr = this.parseExpression();

    // Check for assignment
    if (this.check(TokenType.Assign) ||
        this.check(TokenType.PlusAssign) ||
        this.check(TokenType.MinusAssign) ||
        this.check(TokenType.MultiplyAssign) ||
        this.check(TokenType.DivideAssign)) {
      const opToken = this.advance();
      const value = this.parseExpression();

      if (this.check(TokenType.Semicolon)) {
        this.advance();
      }

      // For compound assignments, transform to binary expression
      let finalValue = value;
      if (opToken.type !== TokenType.Assign) {
        let op: string;
        if (opToken.type === TokenType.PlusAssign) {
          op = '+';
        } else if (opToken.type === TokenType.MinusAssign) {
          op = '-';
        } else if (opToken.type === TokenType.MultiplyAssign) {
          op = '*';
        } else if (opToken.type === TokenType.DivideAssign) {
          op = '/';
        } else {
          throw new Error(`Unexpected compound assignment operator: ${opToken.type}`);
        }
        finalValue = {
          type: 'BinaryExpression',
          operator: op,
          left: expr,
          right: value,
          startToken: expr.startToken,
          endToken: value.endToken
        } as BinaryExpression;
      }

      return {
        type: 'AssignmentStatement',
        target: expr,
        value: finalValue,
        startToken,
        endToken: this.previous()
      } as AssignmentStatement;
    }

    // Otherwise it's a procedure call
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'CallStatement',
      expression: expr,
      startToken,
      endToken: this.previous()
    } as CallStatement;
  }

  /**
   * Expression parsing using Pratt parsing / precedence climbing
   */
  private parseExpression(): Expression {
    return this.parseOr();
  }

  /**
   * Parse binary expression with left-to-right associativity
   * @param nextParser - Function to parse the next precedence level
   * @param upperCaseOperator - Whether to uppercase the operator value
   * @param operatorTypes - Token types that are operators at this level
   */
  private parseBinaryExpression(
    nextParser: () => Expression,
    upperCaseOperator: boolean,
    ...operatorTypes: TokenType[]
  ): Expression {
    let left = nextParser();

    while (operatorTypes.some(op => this.check(op))) {
      const operator = this.advance();
      const right = nextParser();

      left = {
        type: 'BinaryExpression',
        left,
        operator: upperCaseOperator ? operator.value.toUpperCase() : operator.value,
        right,
        startToken: left.startToken,
        endToken: right.endToken
      } as BinaryExpression;
    }

    return left;
  }

  private parseOr(): Expression {
    return this.parseBinaryExpression(
      () => this.parseAnd(),
      true,
      TokenType.Or,
      TokenType.Xor
    );
  }

  private parseAnd(): Expression {
    return this.parseBinaryExpression(
      () => this.parseEquality(),
      true,
      TokenType.And
    );
  }

  private parseEquality(): Expression {
    return this.parseBinaryExpression(
      () => this.parseComparison(),
      false,
      TokenType.Equal,
      TokenType.NotEqual
    );
  }

  private parseComparison(): Expression {
    let left = this.parseTerm();

    while (
      this.check(TokenType.Less) ||
      this.check(TokenType.LessEqual) ||
      this.check(TokenType.Greater) ||
      this.check(TokenType.GreaterEqual) ||
      this.check(TokenType.In)
    ) {
      const operator = this.advance();

      // Special handling for IN operator - right side can be a set literal [...]
      let right: Expression;
      if (operator.type === TokenType.In && this.check(TokenType.LeftBracket)) {
        right = this.parseSetLiteral();
      } else {
        right = this.parseTerm();
      }

      left = {
        type: 'BinaryExpression',
        left,
        operator: operator.value.toUpperCase(),
        right,
        startToken: left.startToken,
        endToken: right.endToken
      } as BinaryExpression;
    }

    return left;
  }

  private parseTerm(): Expression {
    return this.parseBinaryExpression(
      () => this.parseFactor(),
      false,
      TokenType.Plus,
      TokenType.Minus
    );
  }

  private parseFactor(): Expression {
    return this.parseBinaryExpression(
      () => this.parseUnary(),
      true,
      TokenType.Multiply,
      TokenType.Divide,
      TokenType.Div,
      TokenType.Mod
    );
  }

  private parseUnary(): Expression {
    if (this.check(TokenType.Not) || this.check(TokenType.Minus)) {
      const operator = this.advance();
      const operand = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: operator.value.toUpperCase(),
        operand,
        startToken: operator,
        endToken: operand.endToken
      } as UnaryExpression;
    }

    return this.parsePrimary();
  }

  /**
   * Parse literal expressions (Integer, Decimal, String, Boolean, Date, Time, DateTime)
   * Returns null if current token is not a literal
   */
  private parseLiteral(): Expression | null {
    const token = this.peek();

    // Integer literal
    if (this.check(TokenType.Integer)) {
      this.advance();
      return {
        type: 'Literal',
        value: parseInt(token.value, 10),
        literalType: 'integer',
        startToken: token,
        endToken: token
      } as Literal;
    }

    // Decimal literal
    if (this.check(TokenType.Decimal)) {
      this.advance();
      return {
        type: 'Literal',
        value: parseFloat(token.value),
        literalType: 'decimal',
        startToken: token,
        endToken: token
      } as Literal;
    }

    // String literal
    if (this.check(TokenType.String)) {
      this.advance();
      return {
        type: 'Literal',
        value: token.value,
        literalType: 'string',
        startToken: token,
        endToken: token
      } as Literal;
    }

    // Boolean literal
    if (this.check(TokenType.True) || this.check(TokenType.False)) {
      this.advance();
      return {
        type: 'Literal',
        value: token.type === TokenType.True,
        literalType: 'boolean',
        startToken: token,
        endToken: token
      } as Literal;
    }

    // Date literal
    if (this.check(TokenType.Date)) {
      this.advance();
      return {
        type: 'Literal',
        value: token.value,
        literalType: 'date',
        startToken: token,
        endToken: token
      } as Literal;
    }

    // Time literal
    if (this.check(TokenType.Time)) {
      this.advance();
      return {
        type: 'Literal',
        value: token.value,
        literalType: 'time',
        startToken: token,
        endToken: token
      } as Literal;
    }

    // DateTime literal
    if (this.check(TokenType.DateTime)) {
      this.advance();
      return {
        type: 'Literal',
        value: token.value,
        literalType: 'datetime',
        startToken: token,
        endToken: token
      } as Literal;
    }

    return null;
  }

  private parsePrimary(): Expression {
    // Check for AL-only tokens in expression context (e.g., ternary operator)
    this.skipALOnlyTokens();

    // Try to parse as literal
    const literal = this.parseLiteral();
    if (literal) {
      return literal;
    }

    // Parenthesized expression
    if (this.check(TokenType.LeftParen)) {
      this.advance();
      const expr = this.parseExpression();
      this.consume(TokenType.RightParen, 'Expected )');
      return expr;
    }

    // Identifier (with optional member access and function calls)
    if (this.check(TokenType.Identifier) || this.check(TokenType.QuotedIdentifier)) {
      return this.parseIdentifierExpression();
    }

    // Fallback - consume token and return identifier
    // This handles keywords used as identifiers (e.g., CODEUNIT, DATABASE, REPORT in expressions)
    const fallbackToken = this.advance();
    const expr: Expression = {
      type: 'Identifier',
      name: fallbackToken.value,
      isQuoted: false,
      startToken: fallbackToken,
      endToken: fallbackToken
    } as Identifier;

    // Apply postfix operations to fallback expressions too
    // This allows CODEUNIT::X, DATABASE::Y, etc.
    return this.parsePostfixOperations(expr);
  }

  /**
   * Parse identifier with optional postfix operations
   * Handles chained operations: object.property[index].method(args)
   * Also handles :: operator for Option type values
   * @returns Expression node (Identifier, MemberExpression, CallExpression, or ArrayAccessExpression)
   */
  private parseIdentifierExpression(): Expression {
    const startToken = this.peek();
    const expr: Expression = {
      type: 'Identifier',
      name: this.advance().value,
      isQuoted: startToken.type === TokenType.QuotedIdentifier,
      startToken,
      endToken: startToken
    } as Identifier;

    return this.parsePostfixOperations(expr);
  }

  /**
   * Parse postfix operations (., ::, (), []) on an expression
   * @param expr - The base expression to apply postfix operations to
   * @returns Expression with all postfix operations applied
   */
  private parsePostfixOperations(expr: Expression): Expression {
    let result = expr;

    // Handle postfix operations
    while (true) {
      const before = result;

      result = this.parseMemberAccessIfPresent(result);
      result = this.parseScopeAccessIfPresent(result);
      result = this.parseFunctionCallIfPresent(result);
      result = this.parseArrayAccessIfPresent(result);

      if (result === before) {
        break;
      }
    }

    return result;
  }

  /**
   * Parse member access (dot notation) if present
   */
  private parseMemberAccessIfPresent(expr: Expression): Expression {
    if (!this.check(TokenType.Dot)) {
      return expr;
    }

    this.advance();
    const memberToken = this.advance();
    const property: Identifier = {
      type: 'Identifier',
      name: memberToken.value,
      isQuoted: memberToken.type === TokenType.QuotedIdentifier,
      startToken: memberToken,
      endToken: memberToken
    };

    return {
      type: 'MemberExpression',
      object: expr,
      property,
      startToken: expr.startToken,
      endToken: memberToken
    } as MemberExpression;
  }

  /**
   * Parse scope access (:: operator) if present
   * Used for Option type values: Status::Open, "Document Type"::Order
   */
  private parseScopeAccessIfPresent(expr: Expression): Expression {
    if (!this.check(TokenType.DoubleColon)) {
      return expr;
    }

    this.advance(); // consume ::

    // Accept any token after :: except delimiters (C/AL allows keywords, identifiers, etc.)
    // Reject semicolons, operators, and other structural tokens that can't be option values
    if (this.isAtEnd() ||
        this.check(TokenType.Semicolon) ||
        this.check(TokenType.Comma) ||
        this.check(TokenType.RightParen) ||
        this.check(TokenType.RightBracket) ||
        this.check(TokenType.Then) ||
        this.check(TokenType.Do) ||
        this.check(TokenType.Of)) {
      this.recordError(`Expected identifier after :: operator, got '${this.peek().value}'`, this.peek());
      return expr;
    }

    const memberToken = this.advance();
    const property: Identifier = {
      type: 'Identifier',
      name: memberToken.value,
      isQuoted: memberToken.type === TokenType.QuotedIdentifier,
      startToken: memberToken,
      endToken: memberToken
    };

    return {
      type: 'MemberExpression',
      object: expr,
      property,
      startToken: expr.startToken,
      endToken: memberToken
    } as MemberExpression;
  }

  /**
   * Parse function call if present
   */
  private parseFunctionCallIfPresent(expr: Expression): Expression {
    if (!this.check(TokenType.LeftParen)) {
      return expr;
    }

    this.advance();
    const args: Expression[] = [];

    while (!this.check(TokenType.RightParen) && !this.isAtEnd()) {
      args.push(this.parseExpression());
      if (this.check(TokenType.Comma)) {
        this.advance();
      }
    }

    const endToken = this.check(TokenType.RightParen) ? this.advance() : this.previous();

    return {
      type: 'CallExpression',
      callee: expr,
      arguments: args,
      startToken: expr.startToken,
      endToken
    } as CallExpression;
  }

  /**
   * Parse array access if present
   * Supports multi-dimensional arrays: arr[1], arr[i,j], arr[1,2,3]
   */
  private parseArrayAccessIfPresent(expr: Expression): Expression {
    if (!this.check(TokenType.LeftBracket)) {
      return expr;
    }

    this.advance();
    const indices: Expression[] = [];

    // Parse first index
    indices.push(this.parseExpression());

    // Parse additional indices (comma-separated for multi-dimensional arrays)
    while (this.check(TokenType.Comma)) {
      this.advance();  // consume comma
      indices.push(this.parseExpression());
    }

    const endToken = this.consume(TokenType.RightBracket, 'Expected ]');

    return {
      type: 'ArrayAccessExpression',
      array: expr,
      indices,
      startToken: expr.startToken,
      endToken
    } as ArrayAccessExpression;
  }

  /**
   * Parse set literal [element1, element2, start..end, ..max]
   * Examples:
   *   [] - empty set
   *   [1, 2, 3] - discrete values
   *   [1..10] - closed range
   *   [..100] - open-ended range (up to 100)
   *   [1, 5..10, 20] - mixed
   */
  private parseSetLiteral(): Expression {
    const startToken = this.consume(TokenType.LeftBracket, 'Expected [');
    const elements: (Expression | RangeExpression)[] = [];

    // Empty set
    if (this.check(TokenType.RightBracket)) {
      const endToken = this.advance();
      return {
        type: 'SetLiteral',
        elements,
        startToken,
        endToken
      } as SetLiteral;
    }

    // Parse elements
    do {
      // Check for open-ended range: ..end
      if (this.check(TokenType.DotDot)) {
        const rangeStart = this.advance();
        const end = this.parseExpression();
        elements.push({
          type: 'RangeExpression',
          start: null,
          end,
          startToken: rangeStart,
          endToken: end.endToken
        } as RangeExpression);
      } else {
        // Parse start of element or range
        const start = this.parseExpression();

        // Check if this is a range: start..end or start..
        if (this.check(TokenType.DotDot)) {
          this.advance(); // consume '..'

          // Check for closed range (start..end) vs open-ended range (start..)
          if (!this.check(TokenType.Comma) && !this.check(TokenType.RightBracket)) {
            // Closed range: start..end
            const end = this.parseExpression();
            elements.push({
              type: 'RangeExpression',
              start,
              end,
              startToken: start.startToken,
              endToken: end.endToken
            } as RangeExpression);
          } else {
            // Open-ended range: start..
            elements.push({
              type: 'RangeExpression',
              start,
              end: null,
              startToken: start.startToken,
              endToken: this.previous()
            } as RangeExpression);
          }
        } else {
          // Discrete element
          elements.push(start);
        }
      }

      // Continue if comma present
      if (this.check(TokenType.Comma)) {
        this.advance();
      } else {
        break;
      }
    } while (!this.check(TokenType.RightBracket) && !this.isAtEnd());

    const endToken = this.consume(TokenType.RightBracket, 'Expected ]');

    return {
      type: 'SetLiteral',
      elements,
      startToken,
      endToken
    } as SetLiteral;
  }

  /**
   * Helper methods
   */
  private tokenTypeToObjectKind(type: TokenType): ObjectKind {
    switch (type) {
      case TokenType.Table: return ObjectKind.Table;
      case TokenType.Page: return ObjectKind.Page;
      case TokenType.Report: return ObjectKind.Report;
      case TokenType.Codeunit: return ObjectKind.Codeunit;
      case TokenType.Query: return ObjectKind.Query;
      case TokenType.XMLport: return ObjectKind.XMLport;
      case TokenType.MenuSuite: return ObjectKind.MenuSuite;
      default: throw new ParseError(`Invalid object type: ${type}`, this.peek());
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1].type === type;
  }

  /**
   * Checks if the current token marks the end of a variable declaration section.
   * Variable sections terminate when encountering structural keywords like PROCEDURE,
   * CODE, or closing braces.
   *
   * This excludes BEGIN so we can report an error if someone tries to use BEGIN
   * as a variable name, rather than silently treating it as the end of the VAR section.
   * This also excludes LEFT_BRACKET to avoid treating array type syntax like Text[50]
   * as a section boundary (attributes like [External] only appear before procedures,
   * after VAR sections).
   *
   * @returns true if at a boundary token, false otherwise
   */
  private isVariableSectionBoundary(): boolean {
    return this.check(TokenType.Procedure) ||
           this.check(TokenType.Function) ||
           this.check(TokenType.Local) ||
           this.check(TokenType.Trigger) ||
           this.check(TokenType.Event) ||
           this.check(TokenType.Code) ||  // CODE section keyword
           this.check(TokenType.RightBrace);  // End of object or section
    // Note: LEFT_BRACKET (for attributes like [External]) should NOT be checked here
    // because LEFT_BRACKET also appears in data type syntax like Text[50] or Record[*]
    // within VAR sections. Those attributes only appear after VAR sections, before procedures.
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      const token = this.tokens[this.current];
      // Track brace depth for scope-aware section keyword detection
      if (token.type === TokenType.LeftBrace) {
        this.braceDepth++;
      } else if (token.type === TokenType.RightBrace) {
        this.braceDepth--;
      }
      this.current++;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    if (this.isAtEnd()) {
      // Return EOF token with last real token's position for better error messages
      if (this.tokens.length > 0) {
        const lastToken = this.tokens[this.tokens.length - 1];
        return {
          type: TokenType.EOF,
          value: '',
          line: lastToken.line,
          column: lastToken.column + lastToken.value.length,
          startOffset: lastToken.endOffset,
          endOffset: lastToken.endOffset
        };
      }
      // Fallback for empty input
      return {
        type: TokenType.EOF,
        value: '',
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 0
      };
    }
    return this.tokens[this.current];
  }

  private previous(): Token {
    if (this.current === 0) {
      return this.peek();
    }
    return this.tokens[this.current - 1];
  }

  /**
   * Peek ahead at a token at the specified offset from the current position.
   * Does not advance the parser position.
   *
   * @param offset Number of tokens to look ahead (1 = next token, 2 = token after next, etc.)
   * @returns Token at the offset position, or undefined if out of bounds
   * @example
   * // Check if next token is a colon
   * const nextToken = this.peekAhead(1);
   * if (nextToken?.type === TokenType.Colon) { ... }
   */
  private peekAhead(offset: number): Token | undefined {
    if (offset < 0) {
      return undefined; // Invalid: negative offset not supported
    }
    const index = this.current + offset;
    if (index >= this.tokens.length) {
      return undefined;
    }
    return this.tokens[index];
  }

  /**
   * Determines if a keyword token can be used as an identifier (variable/parameter name) in C/AL.
   *
   * C/AL is context-sensitive - many keywords that are reserved in control flow contexts
   * can be repurposed as identifiers when declaring variables or parameters. This method
   * implements that contextual recognition.
   *
   * ## When Called
   * - During variable declaration parsing (VAR sections)
   * - During parameter declaration parsing (procedure signatures)
   * - After consuming the identifier position in declarations
   *
   * ## Allowed Keywords Pattern
   *
   * C/AL allows certain keywords as identifiers because developers often want to name
   * variables after the concepts they represent:
   *
   * **Examples:**
   * ```cal
   * VAR
   *   Date@1000 : Date;              // Variable named "Date" of type Date
   *   FieldRef@1001 : FieldRef;      // Variable named "FieldRef" of type FieldRef
   *   Table@1002 : Record 2000000026; // Variable named "Table" for Table Information
   *   Integer@1003 : Text[50];       // Variable named "Integer" of type Text
   * ```
   *
   * ## Keyword Categories
   *
   * ### 1. Data Type Keywords (auto-recognized via _TYPE suffix)
   * These TokenType enum values end with uppercase `_TYPE` suffix and are automatically allowed:
   * - `INTEGER_TYPE`, `DECIMAL_TYPE`, `CODE_TYPE`, `DATE_TYPE`, `TIME_TYPE`, `DATETIME_TYPE`, etc.
   * - **Convention:** All data type token enum values MUST end with uppercase `_TYPE` suffix
   * - **Performance:** Efficient suffix check using `type.toString().endsWith('_TYPE')`
   *
   * ### 2. Explicitly Allowed Keywords (ALLOWED_KEYWORDS_AS_IDENTIFIERS constant)
   * Keywords stored in the Set at line 51, including:
   *
   * **Object types:** Table, Page, Report, Codeunit, Query, XMLport, Object
   * - Common for variables holding object IDs or references
   * - Example: `Table@1 : Record 2000000026;` (Table Information table)
   *
   * **Data type names:** Record, Char, Option, Text, Boolean, Code
   * - Frequently used as variable names in metadata/reflection code
   * - Example: `Record@1 : Integer;` (variable holding a record count)
   *
   * **Complex type keywords:** FieldRef, RecordRef, RecordID, Duration, BigInteger, Fields
   * - Used extensively in reflection and advanced scenarios
   * - Example: `FieldRef@1000 : FieldRef;` (211 occurrences in real NAV code)
   *
   * **Other keywords:** Byte
   * - Less common but valid in specific contexts
   *
   * ### 3. NOT Allowed - Control Flow & Structural Keywords
   * These keywords are fundamental to C/AL syntax and cannot be identifiers:
   *
   * **Control flow:** IF, THEN, ELSE, FOR, WHILE, REPEAT, UNTIL, DO, TO, DOWNTO
   * **Blocks:** BEGIN, END, CASE, OF, EXIT
   * **Declarations:** VAR, PROCEDURE, FUNCTION, LOCAL
   * **Sections:** KEYS, CONTROLS, PROPERTIES, CODE
   *
   * **Example (invalid):**
   * ```cal
   * VAR
   *   IF@1000 : Integer;    // ERROR: Cannot use reserved keyword
   *   FOR@1001 : Text[10];  // ERROR: Cannot use reserved keyword
   * ```
   *
   * ## Cross-References
   * - **ALLOWED_KEYWORDS_AS_IDENTIFIERS constant** (line 51): Set of explicitly allowed keywords
   * - **Lexer TokenType enum** (server/src/lexer/tokens.ts): Defines all token types including _TYPE suffix
   * - **Tests** (server/src/parser/__tests__/keyword-variable-names.test.ts): Comprehensive test coverage
   *
   * ## Addition Guidelines
   *
   * To safely add a new keyword as an allowed identifier:
   *
   * 1. **Verify it's used in real NAV code:**
   *    - Check test/REAL/ directory for usage patterns (never copy proprietary objects 6000000+)
   *    - Confirm it's a C/AL pattern (not AL-only feature from Business Central)
   *
   * 2. **Choose the right approach:**
   *    - **Data type keywords:** Add to lexer with `_TYPE` suffix (automatically recognized)
   *    - **Other keywords:** Add to ALLOWED_KEYWORDS_AS_IDENTIFIERS Set (line 51)
   *
   * 3. **Add comprehensive tests:**
   *    ```typescript
   *    // Add to keyword-variable-names.test.ts
   *    it('should parse NewKeyword as variable name', () => {
   *      const code = `OBJECT Codeunit 50000 Test
   *{
   *  CODE
   *  {
   *    VAR
   *      NewKeyword@1000 : Integer;
   *  }
   *}`;
   *
   *      const lexer = new Lexer(code);
   *      const tokens = lexer.tokenize();
   *      const parser = new Parser(tokens);
   *      const ast = parser.parse();
   *
   *      expect(parser.getErrors()).toHaveLength(0);
   *      expect(ast.object?.code?.variables).toHaveLength(1);
   *      expect(ast.object?.code?.variables[0].name).toBe('NewKeyword');
   *    });
   *    ```
   *
   * 4. **Test with modifiers:**
   *    - VAR modifier: `VAR NewKeyword@1000 : Type`
   *    - TEMPORARY modifier: `NewKeyword@1000 : TEMPORARY Record 18`
   *    - SECURITYFILTERING: `NewKeyword@1000 : Record 18 SECURITYFILTERING(Filtered)`
   *
   * 5. **Verify no regressions:**
   *    ```bash
   *    cd server && npm test -- keyword-variable-names.test.ts
   *    ```
   *
   * ## Implementation Notes
   *
   * - **Case insensitive:** C/AL is case-insensitive; lexer normalizes to UPPERCASE
   * - **Context matters:** Same token may be keyword in one context, identifier in another
   * - **Performance:** O(1) lookup using Set for ALLOWED_KEYWORDS_AS_IDENTIFIERS
   * - **Type safety:** Returns boolean - caller must validate further if needed
   *
   * @returns `true` if the current token can be used as an identifier, `false` otherwise
   *
   * @see ALLOWED_KEYWORDS_AS_IDENTIFIERS - Set of explicitly allowed keyword tokens (line 51)
   * @see TokenType - Lexer token definitions (server/src/lexer/tokens.ts)
   * @see keyword-variable-names.test.ts - Comprehensive test coverage and usage examples
   */
  private canBeUsedAsIdentifier(): boolean {
    const token = this.peek();
    const type = token.type;

    // Obviously valid identifiers
    if (type === TokenType.Identifier || type === TokenType.QuotedIdentifier) {
      return true;
    }

    // Data type keywords that end with _TYPE (e.g., CODE_TYPE, INTEGER_TYPE, DATE_TYPE, TIME_TYPE)
    // Issue #52: Fixed case sensitivity - TokenType enum values are UPPERCASE
    // INVARIANT: Only data type token values should end with _TYPE suffix
    // All _TYPE tokens are valid as variable names in C/AL
    if (type.toString().endsWith('_TYPE')) {
      return true;
    }

    return ALLOWED_KEYWORDS_AS_IDENTIFIERS.has(type);
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const current = this.peek();
    const enhancedMessage = `${message}, but found '${current.value}' (${current.type})`;
    throw new ParseError(enhancedMessage, current);
  }

  public getErrors(): ParseError[] {
    return this.errors;
  }

  /**
   * Get all skipped regions recorded during parsing
   */
  public getSkippedRegions(): SkippedRegion[] {
    return this.skippedRegions;
  }

  /**
   * Record an error without throwing - used for error recovery
   */
  private recordError(message: string, token?: Token): void {
    const errorToken = token || this.peek();
    this.errors.push(new ParseError(message, errorToken));
  }

  /**
   * Record a skipped region during error recovery
   */
  private recordSkippedRegion(startToken: Token, endToken: Token, tokenCount: number, reason: string): void {
    this.skippedRegions.push({
      startToken,
      endToken,
      tokenCount,
      reason
    });

    // Generate a diagnostic for the skipped region
    const tokenWord = tokenCount === 1 ? 'token' : 'tokens';
    this.recordError(`Skipped ${tokenCount} ${tokenWord} during error recovery`, startToken);
  }

  /**
   * Parse item with automatic error recovery
   * @param parser - Function that parses a single item
   * @param recoveryTokens - Tokens to stop at during recovery
   * @returns Parsed item or null if error occurred
   */
  private parseWithRecovery<T>(
    parser: () => T,
    recoveryTokens: TokenType[]
  ): T | null {
    try {
      return parser();
    } catch (error) {
      if (error instanceof ParseError) {
        this.errors.push(error);
        this.recoverToTokens(recoveryTokens);
        return null;
      }
      throw error;
    }
  }

  /**
   * Recover parser state by advancing to one of the specified tokens
   */
  private recoverToTokens(tokens: TokenType[]): void {
    const skipStartToken = this.peek();
    let skipCount = 0;

    while (!tokens.some(t => this.check(t)) && !this.isAtEnd()) {
      this.advance();
      skipCount++;
    }

    if (skipCount > 0) {
      this.recordSkippedRegion(skipStartToken, this.previous(), skipCount, 'Error recovery');
    }

    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }
  }

  /**
   * Check if the current token is an AL-only feature and record an error if so.
   * AL-only features are not supported in C/AL and should be rejected with clear messages.
   * Returns true if an AL-only token was found (and error recorded), false otherwise.
   */
  private checkAndReportALOnlyToken(): boolean {
    const token = this.peek();

    switch (token.type) {
      case TokenType.ALOnlyKeyword:
        this.recordError(
          `AL-only keyword '${token.value}' is not supported in C/AL`,
          token
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      case TokenType.ALOnlyAccessModifier:
        this.recordError(
          `AL-only access modifier '${token.value}' is not supported in C/AL. Use LOCAL instead.`,
          token
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      case TokenType.TernaryOperator:
        this.recordError(
          `AL-only ternary operator (? :) is not supported in C/AL. Use IF-THEN-ELSE instead.`,
          token
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      case TokenType.PreprocessorDirective:
        this.recordError(
          `AL-only preprocessor directive '${token.value}' is not supported in C/AL`,
          token
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      default:
        return false;
    }
  }

  /**
   * Skip any AL-only tokens at the current position, recording errors for each.
   * This is used to continue parsing after encountering AL-only features.
   */
  private skipALOnlyTokens(): void {
    while (this.checkAndReportALOnlyToken()) {
      // Keep consuming AL-only tokens until we find a valid C/AL token
    }
  }

  /**
   * Skip an unsupported section (CONTROLS, ACTIONS, DATAITEMS, ELEMENTS, REQUESTFORM).
   * These sections have complex nested structures with @ numbering that aren't fully parsed yet.
   * This method consumes the section keyword and its entire content block.
   */
  private skipUnsupportedSection(sectionType: TokenType): void {
    // Remember the brace depth BEFORE entering this section
    // Section keywords appear at depth 1 (inside OBJECT { ... })
    const sectionDepth = this.braceDepth;

    // Consume the section keyword (CONTROLS, ACTIONS, etc.)
    this.advance();

    // Skip tokens until we reach another section keyword at the SAME depth
    while (!this.isAtEnd()) {
      const token = this.peek();

      // Check if we've reached a new section at the same object level
      // Must be back at the same brace depth where we started
      if (this.braceDepth === sectionDepth && this.isSectionKeyword(token.type)) {
        break; // Stop at the next section
      }

      this.advance();
    }

    // Note: We don't record an error here because these sections are intentionally skipped
    // Full parsing support for these sections would be a future enhancement
  }

  /**
   * Check if the current token is a real CODE section (not Code as field name/type).
   * Looks ahead to see if CODE is followed by a left brace '{'.
   * Uses lookahead without advancing parser state.
   *
   * Note: The lexer already skips whitespace/newlines, so the next token
   * is immediately available at this.current + 1.
   */
  private isCodeSectionKeyword(): boolean {
    const currentToken = this.peek();
    if (currentToken.type !== TokenType.Code) {
      return false;
    }

    // Look ahead to the next token (lexer already skipped whitespace)
    const nextIndex = this.current + 1;

    // Check if next token is a left brace
    return nextIndex < this.tokens.length && this.tokens[nextIndex].type === TokenType.LeftBrace;
  }

  /**
   * Check if a token type represents an object section keyword.
   *
   * IMPORTANT: The lexer sometimes tokenizes keywords even when they appear in other contexts:
   * - "Code" in "Variant Code" (inside PROPERTIES section!)
   * - "Code" in "Item Tracking Code" (captions)
   * - "Code" in "Code[20]" (data types)
   *
   * For CODE specifically, we MUST check that it's followed by '{' to distinguish
   * the section keyword from false positives.
   */
  private isSectionKeyword(type: TokenType): boolean {
    // Non-CODE section keywords are unambiguous
    if (type === TokenType.Properties ||
        type === TokenType.Fields ||
        type === TokenType.Keys ||
        type === TokenType.FieldGroups ||
        type === TokenType.Controls ||
        type === TokenType.Actions ||
        type === TokenType.DataItems ||
        type === TokenType.Elements ||
        type === TokenType.RequestForm) {
      return true;
    }

    // Special case for CODE: must be followed by '{'
    // The lexer never emits Whitespace/NewLine tokens (they're skipped),
    // so the next token is always immediately at this.current + 1
    if (type === TokenType.Code) {
      const nextIndex = this.current + 1;
      // Bounds check and verify next token is LEFT_BRACE
      if (nextIndex < this.tokens.length) {
        return this.tokens[nextIndex].type === TokenType.LeftBrace;
      }
      // CODE at end of file is not a section keyword
      return false;
    }

    return false;
  }

  /**
   * Synchronize parser state after an error by advancing to a recovery point.
   * Recovery points are: section keywords, END, or end of input.
   */
  private synchronize(): void {
    const startToken = this.peek();
    let tokenCount = 0;

    this.advance();
    tokenCount++;

    while (!this.isAtEnd()) {
      // Stop at statement boundaries
      if (this.previous().type === TokenType.Semicolon) {
        // Record skipped region before returning
        if (tokenCount > 0) {
          this.recordSkippedRegion(startToken, this.previous(), tokenCount, 'Error recovery');
        }
        return;
      }

      // Stop at section keywords or structural tokens
      switch (this.peek().type) {
        case TokenType.Properties:
        case TokenType.Fields:
        case TokenType.Keys:
        case TokenType.FieldGroups:
        case TokenType.Code:
        case TokenType.Procedure:
        case TokenType.Function:
        case TokenType.Trigger:
        case TokenType.Begin:
        case TokenType.End:
        case TokenType.Var:
        case TokenType.RightBrace:
          // Record skipped region before returning
          if (tokenCount > 0) {
            this.recordSkippedRegion(startToken, this.previous(), tokenCount, 'Error recovery');
          }
          return;
      }

      this.advance();
      tokenCount++;
    }

    // Record region if we skipped anything (reached end of input)
    if (tokenCount > 0) {
      this.recordSkippedRegion(startToken, this.previous(), tokenCount, 'Error recovery');
    }
  }
}

export class ParseError extends Error {
  constructor(message: string, public token: Token) {
    super(`${message} at line ${token.line}, column ${token.column}`);
    this.name = 'ParseError';
  }
}

/**
 * Represents a region of tokens skipped during error recovery
 */
export interface SkippedRegion {
  startToken: Token;      // First token in skipped region
  endToken: Token;        // Last token in skipped region
  tokenCount: number;     // Number of tokens skipped
  reason: string;         // Why this region was skipped (e.g., "Error recovery")
}

/**
 * Helper function to parse C/AL code
 * Used in tests to easily parse code snippets and get AST + errors
 */
export function parseCode(code: string): { ast: CALDocument | null; errors: ParseError[] } {
  const { Lexer } = require('../lexer/lexer');
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const errors = parser.getErrors();
  return { ast, errors };
}
