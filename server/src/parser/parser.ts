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
  ProcedureDeclaration,
  ParameterDeclaration,
  TriggerDeclaration,
  Statement,
  BlockStatement,
  IfStatement,
  WhileStatement,
  RepeatStatement,
  ForStatement,
  CaseStatement,
  CaseBranch,
  ExitStatement,
  AssignmentStatement,
  CallStatement,
  Expression,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  MemberExpression,
  CallExpression,
  ArrayAccessExpression
} from './ast';

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

  constructor(tokens: Token[]) {
    // Filter out EOF token for easier parsing
    this.tokens = tokens.filter(t => t.type !== TokenType.EOF);
  }

  /**
   * Safely parse an integer from a token, recording an error if invalid
   */
  private parseInteger(token: Token): number {
    const value = parseInt(token.value, 10);
    if (isNaN(value)) {
      this.recordError(`Invalid integer value: ${token.value}`, token);
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
        } else if (token.type === TokenType.Code) {
          code = this.parseCodeSection();
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
    const objectId = this.parseInteger(idToken);

    // Object Name (can be quoted or unquoted)
    const nameToken = this.advance();
    const objectName = nameToken.value;

    return { startToken, objectKind, objectId, objectName };
  }

  /**
   * Skip OBJECT-PROPERTIES section if present (it's metadata, not code)
   */
  private skipObjectPropertiesSection(): void {
    if (this.check(TokenType.Object) && this.checkNext(TokenType.Minus)) {
      // Skip OBJECT-PROPERTIES { ... }
      this.advance(); // OBJECT
      this.advance(); // -
      this.advance(); // PROPERTIES
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

    // Property value - read until semicolon, preserving whitespace
    let value = '';
    let lastToken: Token | null = null;

    while (!this.check(TokenType.Semicolon) && !this.isAtEnd()) {
      const currentToken = this.advance();

      // If there's a gap between tokens, add a space
      if (lastToken !== null && currentToken.startOffset > lastToken.endOffset) {
        value += ' ';
      }

      value += currentToken.value;
      lastToken = currentToken;
    }

    const endToken = this.consume(TokenType.Semicolon, 'Expected ;');

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
    const fieldNo = this.parseInteger(fieldNoToken);

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
    const nameToken = this.advance();
    const fieldName = nameToken.value;

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

    // Check for ARRAY[n] OF Type pattern
    if (typeName.toUpperCase() === 'ARRAY' && this.check(TokenType.LeftBracket)) {
      this.advance(); // consume '['
      const sizeToken = this.consume(TokenType.Integer, 'Expected array size');
      const arraySize = this.parseInteger(sizeToken);
      this.consume(TokenType.RightBracket, 'Expected ]');

      // Expect OF keyword
      if (this.check(TokenType.Of)) {
        this.advance();
        const elementType = this.parseDataType();
        typeName = `ARRAY[${arraySize}] OF ${elementType.typeName}`;
      }

      return {
        type: 'DataType',
        typeName,
        length: arraySize,
        tableId,
        startToken,
        endToken: this.previous()
      };
    }

    // Check for Record <tableId> pattern
    if (typeName.toUpperCase() === 'RECORD' && this.check(TokenType.Integer)) {
      const tableIdToken = this.advance();
      tableId = this.parseInteger(tableIdToken);
      typeName = `Record ${tableId}`;
    }

    // Check for length specification [length]
    if (this.check(TokenType.LeftBracket)) {
      this.advance();
      const lengthToken = this.consume(TokenType.Integer, 'Expected length');
      length = this.parseInteger(lengthToken);
      this.consume(TokenType.RightBracket, 'Expected ]');
    }

    // Handle TextConst with string value: TextConst 'ENU=...'
    if (typeName.toUpperCase() === 'TEXTCONST' && this.check(TokenType.String)) {
      this.advance(); // consume the string value
    }

    return {
      type: 'DataType',
      typeName,
      length,
      tableId,
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
            // Regular property - read value until semicolon
            let value = '';
            while (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd()) {
              value += this.advance().value;
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

    const variables: VariableDeclaration[] = [];
    const procedures: ProcedureDeclaration[] = [];
    const triggers: TriggerDeclaration[] = [];

    // Parse VAR section if present
    if (this.check(TokenType.Var)) {
      this.parseVariableDeclarations(variables);
    }

    // Parse procedures and triggers
    while (!this.isAtEnd()) {
      try {
        // Check for AL-only tokens before procedure/trigger declarations
        this.skipALOnlyTokens();

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
        } else if (this.check(TokenType.Begin)) {
          // Main code block (documentation trigger) - skip for now
          break;
        } else {
          break;
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Skip to next procedure/trigger/end
          while (!this.check(TokenType.Procedure) && !this.check(TokenType.Function) &&
                 !this.check(TokenType.Trigger) && !this.check(TokenType.Begin) && !this.isAtEnd()) {
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

    while (!this.isCodeSectionBoundary() && !this.isAtEnd()) {
      const startToken = this.peek();
      const nameToken = this.advance();

      if (nameToken.type === TokenType.Identifier || nameToken.type === TokenType.QuotedIdentifier) {
        // Skip @number if present (C/AL auto-numbering)
        this.skipAutoNumberSuffix();

        this.consume(TokenType.Colon, 'Expected :');

        // Check for TEMPORARY keyword before data type
        let isTemporary = false;
        if (this.check(TokenType.Temporary)) {
          isTemporary = true;
          this.advance();
        }

        const dataType = this.parseDataType();
        this.consume(TokenType.Semicolon, 'Expected ;');

        variables.push({
          type: 'VariableDeclaration',
          name: nameToken.value,
          dataType,
          isTemporary,
          startToken,
          endToken: this.previous()
        });
      } else {
        break;
      }
    }
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
      body.push(block);
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

      // Parameter name
      if (this.check(TokenType.Identifier)) {
        const paramToken = this.advance();
        const paramName = paramToken.value;

        // Colon and type
        let dataType: DataType | null = null;
        if (this.check(TokenType.Colon)) {
          this.advance();
          dataType = this.parseDataType();
        }

        parameters.push({
          type: 'ParameterDeclaration',
          name: paramName,
          dataType: dataType || { type: 'DataType', typeName: 'Variant', startToken: paramToken, endToken: paramToken },
          isVar,
          startToken: paramToken,
          endToken: this.previous()
        });
      }

      // Skip semicolon between parameters
      if (this.check(TokenType.Semicolon)) {
        this.advance();
      } else if (!this.check(TokenType.RightParen)) {
        this.recordError('Unexpected token in parameter list', this.peek());
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

    // Parse value(s)
    values.push(this.parseExpression());
    while (this.check(TokenType.Comma)) {
      this.advance();
      values.push(this.parseExpression());
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

    return {
      type: 'CaseBranch',
      values,
      statements,
      startToken: branchStart,
      endToken: this.previous()
    };
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
        const op = opToken.type === TokenType.PlusAssign ? '+' :
                   opToken.type === TokenType.MinusAssign ? '-' :
                   opToken.type === TokenType.MultiplyAssign ? '*' : '/';
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
    return this.parseBinaryExpression(
      () => this.parseTerm(),
      false,
      TokenType.Less,
      TokenType.LessEqual,
      TokenType.Greater,
      TokenType.GreaterEqual,
      TokenType.In
    );
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
    const fallbackToken = this.advance();
    return {
      type: 'Identifier',
      name: fallbackToken.value,
      isQuoted: false,
      startToken: fallbackToken,
      endToken: fallbackToken
    } as Identifier;
  }

  /**
   * Parse identifier with optional postfix operations
   * Handles chained operations: object.property[index].method(args)
   * @returns Expression node (Identifier, MemberExpression, CallExpression, or ArrayAccessExpression)
   */
  private parseIdentifierExpression(): Expression {
    const startToken = this.peek();
    let expr: Expression = {
      type: 'Identifier',
      name: this.advance().value,
      isQuoted: startToken.type === TokenType.QuotedIdentifier,
      startToken,
      endToken: startToken
    } as Identifier;

    // Handle postfix operations
    while (true) {
      const before = expr;

      expr = this.parseMemberAccessIfPresent(expr);
      expr = this.parseFunctionCallIfPresent(expr);
      expr = this.parseArrayAccessIfPresent(expr);

      if (expr === before) {
        break;
      }
    }

    return expr;
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
   */
  private parseArrayAccessIfPresent(expr: Expression): Expression {
    if (!this.check(TokenType.LeftBracket)) {
      return expr;
    }

    this.advance();
    const indexExpr = this.parseExpression();
    const endToken = this.consume(TokenType.RightBracket, 'Expected ]');

    return {
      type: 'ArrayAccessExpression',
      array: expr,
      index: indexExpr,
      startToken: expr.startToken,
      endToken
    } as ArrayAccessExpression;
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
   * Check if current token marks end of variable declarations
   */
  private isCodeSectionBoundary(): boolean {
    return this.check(TokenType.Procedure) ||
           this.check(TokenType.Function) ||
           this.check(TokenType.Local) ||
           this.check(TokenType.Trigger) ||
           this.check(TokenType.Begin);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
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

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek());
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
