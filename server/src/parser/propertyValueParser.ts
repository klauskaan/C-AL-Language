import { Token, TokenType } from '../lexer/tokens';
import {
  CalcFormulaNode,
  TableRelationNode,
  WhereClauseNode,
  WhereConditionNode,
  ConditionalTableRelation
} from './ast';

/**
 * Lightweight diagnostic collected during property value parsing.
 *
 * Intentionally NOT a ParseError -- PropertyValueParser operates outside
 * the main Parser's sanitization boundary. The main Parser converts these
 * to ParseError instances via createParseError(), which applies stripPaths()
 * and other sanitization.
 *
 * Callers using the static factory methods do not receive diagnostics.
 * Use the instance API (construct, parse, getDiagnostics) when diagnostics
 * are needed.
 */
export interface PropertyValueDiagnostic {
  message: string;
  token: Token;
}

/**
 * PropertyValueParser - Mini-parser for complex property values
 *
 * Parses CalcFormula and TableRelation property values from token arrays.
 * Uses recursive descent parsing to build structured AST nodes.
 *
 * Key Features:
 * - Handles CalcFormula: Sum/Count/Lookup/Exist/Min/Max/Average with WHERE clauses
 * - Handles TableRelation: simple/qualified references, WHERE, and IF/ELSE conditionals
 * - Graceful error handling: returns null on parse failure (no exceptions)
 * - Preserves token position information for go-to-definition
 *
 * Usage:
 * ```typescript
 * const tokens = property.valueTokens;  // Get tokens from Property.valueTokens
 * const parser = new PropertyValueParser(tokens);
 * const result = parser.parseCalcFormula();  // or parseTableRelation()
 * ```
 *
 * Or use static factory methods:
 * ```typescript
 * const result = PropertyValueParser.parseCalcFormula(tokens);
 * const result = PropertyValueParser.parseTableRelation(tokens);
 * ```
 */
export class PropertyValueParser {
  private tokens: Token[];
  private position: number = 0;
  private diagnostics: PropertyValueDiagnostic[] = [];

  /**
   * Set of token types that cannot be treated as identifiers in property value contexts.
   * Allocated once at class load time for performance.
   */
  private static readonly NON_IDENTIFIER_TYPES = new Set<TokenType>([
    // Operators
    TokenType.Plus, TokenType.Minus, TokenType.Multiply, TokenType.Divide,
    TokenType.Assign, TokenType.PlusAssign, TokenType.MinusAssign,
    TokenType.MultiplyAssign, TokenType.DivideAssign,
    TokenType.Equal, TokenType.NotEqual, TokenType.Less, TokenType.LessEqual,
    TokenType.Greater, TokenType.GreaterEqual,
    TokenType.Dot, TokenType.DotDot, TokenType.Comma, TokenType.Semicolon,
    TokenType.Colon, TokenType.DoubleColon,
    // Delimiters
    TokenType.LeftParen, TokenType.RightParen,
    TokenType.LeftBracket, TokenType.RightBracket,
    TokenType.LeftBrace, TokenType.RightBrace,
    // Literals (except Identifier/QuotedIdentifier)
    TokenType.Integer, TokenType.Decimal, TokenType.String,
    TokenType.Date, TokenType.Time, TokenType.DateTime,
    // Special
    TokenType.Comment, TokenType.Whitespace, TokenType.NewLine,
    TokenType.EOF, TokenType.Unknown,
    // AL-only
    TokenType.ALOnlyKeyword, TokenType.ALOnlyAccessModifier,
    TokenType.TernaryOperator, TokenType.PreprocessorDirective
  ]);

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Get diagnostics collected during parsing
   */
  public getDiagnostics(): PropertyValueDiagnostic[] {
    return this.diagnostics;
  }

  /**
   * Record a diagnostic during parsing
   */
  private recordDiagnostic(message: string, token?: Token): void {
    this.diagnostics.push({ message, token: token ?? this.peekOrEOF() });
  }

  /**
   * Static factory method for parsing CalcFormula
   * Note: Diagnostics are not returned. Use instance API when diagnostics are needed.
   */
  static parseCalcFormula(tokens: Token[]): CalcFormulaNode | null {
    const parser = new PropertyValueParser(tokens);
    return parser.parseCalcFormula();
  }

  /**
   * Static factory method for parsing TableRelation
   * Note: Diagnostics are not returned. Use instance API when diagnostics are needed.
   */
  static parseTableRelation(tokens: Token[]): TableRelationNode | null {
    const parser = new PropertyValueParser(tokens);
    return parser.parseTableRelation();
  }

  /**
   * Parse CalcFormula property value
   *
   * Grammar:
   * CalcFormula = AggregationFunction '(' TableRef ['.' FieldRef] [WhereClause] ')'
   * AggregationFunction = 'Sum' | 'Count' | 'Lookup' | 'Exist' | 'Min' | 'Max' | 'Average'
   * WhereClause = 'WHERE' '(' Conditions ')'
   * Conditions = Condition (',' Condition)*
   * Condition = FieldName '=' Predicate
   * Predicate = 'FIELD' '(' FieldRef ')' | 'CONST' '(' Value ')' | 'FILTER' '(' Filter ')'
   *
   * Examples:
   * - Sum("Sales Line".Amount)
   * - Count("Sales Line")
   * - Sum("Cust. Ledger Entry".Amount WHERE ("Customer No."=FIELD("No.")))
   */
  parseCalcFormula(): CalcFormulaNode | null {
    try {
      if (this.isAtEnd()) {
        this.recordDiagnostic('Expected aggregation function, got end of input');
        return null;
      }

      const startToken = this.peekOrEOF();

      // Parse aggregation function
      const aggregationFunction = this.parseAggregationFunction();
      if (!aggregationFunction) {
        this.recordDiagnostic('Expected aggregation function (Sum, Count, Lookup, Exist, Min, Max, Average)');
        return null;
      }

      // Expect opening parenthesis
      if (!this.match(TokenType.LeftParen)) {
        this.recordDiagnostic("Expected '(' after aggregation function");
        return null;
      }

      // Parse table reference
      const sourceTable = this.parseIdentifierValue();
      if (!sourceTable) {
        this.recordDiagnostic("Expected table reference after '('");
        return null;
      }

      // Parse optional field reference (after dot)
      let sourceField: string | undefined;
      if (this.match(TokenType.Dot)) {
        const field = this.parseIdentifierValue();
        if (!field) {
          this.recordDiagnostic("Expected field name after '.'");
          return null;
        }
        sourceField = field;
      }

      // Parse optional WHERE clause
      let whereClause: WhereClauseNode | undefined;
      if (this.checkIdentifier('WHERE')) {
        this.advance(); // consume WHERE
        const wc = this.parseWhereClause();
        if (!wc) {
          this.recordDiagnostic('Malformed WHERE clause');
          return null;
        }
        whereClause = wc;
      }

      // Expect closing parenthesis (or accept EOF for incomplete expressions)
      this.match(TokenType.RightParen); // Consume if present
      const endToken = this.previousOrEOF();

      // Reject if there are unconsumed tokens (trailing garbage)
      if (!this.isAtEnd()) {
        this.recordDiagnostic('Unexpected token after CalcFormula expression');
        return null;
      }

      return {
        type: 'CalcFormulaNode',
        aggregationFunction,
        sourceTable,
        sourceField,
        whereClause,
        startToken,
        endToken
      };
    } catch {
      this.recordDiagnostic('Unexpected error parsing CalcFormula');
      return null;
    }
  }

  /**
   * Parse TableRelation property value
   *
   * Grammar:
   * TableRelation = ConditionalRelation | SimpleRelation
   * ConditionalRelation = 'IF' '(' Condition ')' TableRef [WhereClause] ['ELSE' (ConditionalRelation | TableRef)]
   * SimpleRelation = TableRef ['.' FieldRef] [WhereClause]
   * TableRef = Identifier | QuotedIdentifier
   * WhereClause = 'WHERE' '(' Conditions ')'
   *
   * Examples:
   * - Customer
   * - "G/L Account"."No."
   * - Customer WHERE (Blocked=CONST(No))
   * - IF (Type=CONST(Item)) Item ELSE Resource
   */
  parseTableRelation(): TableRelationNode | null {
    try {
      if (this.isAtEnd()) {
        this.recordDiagnostic('Expected table name or IF, got end of input');
        return null;
      }

      const startToken = this.peekOrEOF();

      // Check for IF conditional
      if (this.check(TokenType.If)) {
        const conditionalRelations = this.parseConditionalRelations();
        if (!conditionalRelations || conditionalRelations.length === 0) {
          this.recordDiagnostic('Malformed conditional TableRelation');
          return null;
        }

        const endToken = this.previousOrEOF();

        // Reject if there are unconsumed tokens (trailing garbage)
        if (!this.isAtEnd()) {
          this.recordDiagnostic('Unexpected token after TableRelation expression');
          return null;
        }

        return {
          type: 'TableRelationNode',
          conditionalRelations,
          startToken,
          endToken
        };
      }

      // Parse simple table relation
      const tableName = this.parseIdentifierValue();
      if (!tableName) {
        this.recordDiagnostic('Expected table name');
        return null;
      }

      // Parse optional field reference (after dot)
      let fieldName: string | undefined;
      if (this.match(TokenType.Dot)) {
        const field = this.parseIdentifierValue();
        if (!field) {
          this.recordDiagnostic("Expected field name after '.'");
          return null;
        }
        fieldName = field;
      }

      // Parse optional WHERE clause
      let whereClause: WhereClauseNode | undefined;
      if (this.checkIdentifier('WHERE')) {
        this.advance(); // consume WHERE
        const wc = this.parseWhereClause();
        if (!wc) {
          this.recordDiagnostic('Malformed WHERE clause');
          return null;
        }
        whereClause = wc;
      }

      const endToken = this.previousOrEOF();

      // Reject if there are unconsumed tokens (trailing garbage)
      if (!this.isAtEnd()) {
        this.recordDiagnostic('Unexpected token after TableRelation expression');
        return null;
      }

      return {
        type: 'TableRelationNode',
        tableName,
        fieldName,
        whereClause,
        startToken,
        endToken
      };
    } catch {
      this.recordDiagnostic('Unexpected error parsing TableRelation');
      return null;
    }
  }

  /**
   * Parse aggregation function name
   */
  private parseAggregationFunction():
    | 'Sum' | 'Count' | 'Lookup' | 'Exist' | 'Min' | 'Max' | 'Average'
    | undefined {
    const token = this.peek();
    if (!token) return undefined;
    if (!this.isIdentifierLike(token.type)) {
      return undefined;
    }

    const value = token.value.toLowerCase();
    const validFunctions = ['sum', 'count', 'lookup', 'exist', 'min', 'max', 'average'];

    if (!validFunctions.includes(value)) {
      return undefined;
    }

    this.advance();

    // Return with proper casing
    return (value.charAt(0).toUpperCase() + value.slice(1)) as
      | 'Sum' | 'Count' | 'Lookup' | 'Exist' | 'Min' | 'Max' | 'Average';
  }

  /**
   * Parse WHERE clause with conditions
   */
  private parseWhereClause(): WhereClauseNode | undefined {
    const startToken = this.peekOrEOF();

    // Expect opening parenthesis
    if (!this.match(TokenType.LeftParen)) {
      return undefined;
    }

    const conditions: WhereConditionNode[] = [];

    // Parse first condition
    const firstCondition = this.parseWhereCondition();
    if (!firstCondition) {
      return undefined;
    }
    conditions.push(firstCondition);

    // Parse additional conditions (comma-separated)
    while (this.match(TokenType.Comma)) {
      const condition = this.parseWhereCondition();
      if (!condition) {
        return undefined;
      }
      conditions.push(condition);
    }

    // Expect closing parenthesis (or accept EOF for incomplete expressions)
    this.match(TokenType.RightParen); // Consume if present
    const endToken = this.previousOrEOF();

    return {
      type: 'WhereClauseNode',
      conditions,
      startToken,
      endToken
    };
  }

  /**
   * Parse individual WHERE condition
   *
   * Syntax: FieldName '=' Predicate
   * Predicate: 'FIELD' '(' FieldRef ')' | 'CONST' '(' Value ')' | 'FILTER' '(' Filter ')'
   *
   * Note: Field names can be complex and span multiple tokens:
   * - "No." -> IDENTIFIER("No") + DOT
   * - "Country/Region Code" -> IDENTIFIER("Country") + DIVIDE("/") + IDENTIFIER("Region") + CODE("Code")
   *
   * Strategy: Collect tokens until we hit an operator (=, <>, etc.)
   */
  private parseWhereCondition(): WhereConditionNode | undefined {
    const startToken = this.peekOrEOF();

    // Collect field name tokens until we hit an operator
    let fieldName = '';
    let foundOperator = false;
    let lastToken: Token | undefined; // Track previous token for offset gap detection

    while (!this.isAtEnd() && !foundOperator) {
      const token = this.peek();
      if (!token) break;

      // Check if this is an operator
      if (this.isOperator(token.type)) {
        foundOperator = true;
        break;
      }

      // Check if this is a predicate keyword (FIELD, CONST, FILTER) followed by '('
      // Only treat as predicate keyword when followed by '(' — otherwise it's part of
      // a field name like "Item Filter" or "Employee Filter Code"
      const upperValue = token.value.toUpperCase();
      if (upperValue === 'FIELD' || upperValue === 'CONST' || upperValue === 'FILTER') {
        const nextPos = this.position + 1;
        if (nextPos < this.tokens.length && this.tokens[nextPos].type === TokenType.LeftParen) {
          break;
        }
      }

      // Add space if there's a gap between previous token end and current token start
      if (lastToken && token.startOffset > lastToken.endOffset) {
        fieldName += ' ';
      }

      // Add token value to field name based on token type
      if (token.type === TokenType.QuotedIdentifier || token.type === TokenType.Identifier) {
        fieldName += token.value;
      } else if (token.type === TokenType.Divide) {
        fieldName += '/';
      } else if (token.type === TokenType.Dot) {
        fieldName += '.';
      } else if (token.type === TokenType.Minus) {
        fieldName += '-';
      } else {
        // Check if this is a keyword token that's part of the field name
        // Common examples: Code, Date, Time, No, etc.
        // These get tokenized as keyword types but can be part of field names
        if (token.value) {
          fieldName += token.value;
        } else {
          // Unknown token type in field name - stop collecting
          break;
        }
      }

      lastToken = token;
      this.advance();
    }

    if (!fieldName || !foundOperator) {
      return undefined;
    }

    // Parse operator (typically '=', but could be '<>', '>', '<', etc.)
    const operator = this.parseOperator();
    if (!operator) {
      return undefined;
    }

    // Parse predicate (FIELD, CONST, or FILTER)
    const predicateInfo = this.parsePredicate();
    if (!predicateInfo) {
      return undefined;
    }

    const endToken = this.previousOrEOF();

    return {
      type: 'WhereConditionNode',
      fieldName,
      operator,
      predicateType: predicateInfo.type,
      predicateValue: predicateInfo.value,
      startToken,
      endToken
    };
  }

  /**
   * Parse operator (=, <>, <, >, <=, >=)
   */
  private parseOperator(): string | undefined {
    const token = this.peek();
    if (!token) return undefined;

    if (this.isOperator(token.type)) {
      this.advance();
      return token.value;
    }

    return undefined;
  }

  /**
   * Check if token type is an operator
   */
  private isOperator(tokenType: TokenType): boolean {
    const operatorTypes = [
      TokenType.Equal,
      TokenType.NotEqual,
      TokenType.Less,
      TokenType.LessEqual,
      TokenType.Greater,
      TokenType.GreaterEqual
    ];

    return operatorTypes.includes(tokenType);
  }

  /**
   * Parse predicate: FIELD(...), CONST(...), or FILTER(...)
   */
  private parsePredicate(): { type: 'FIELD' | 'CONST' | 'FILTER'; value: string } | undefined {
    const token = this.peek();
    if (!token) return undefined;

    if (!this.isIdentifierLike(token.type)) {
      return undefined;
    }

    const predicateType = token.value.toUpperCase();

    if (predicateType !== 'FIELD' && predicateType !== 'CONST' && predicateType !== 'FILTER') {
      return undefined;
    }

    this.advance(); // consume predicate type

    // Expect opening parenthesis
    if (!this.match(TokenType.LeftParen)) {
      return undefined;
    }

    // Parse predicate value (can be composite like "Country/Region Code")
    const value = this.parseCompositeValue();
    if (value === undefined) {
      return undefined;
    }

    // Expect closing parenthesis
    if (!this.match(TokenType.RightParen)) {
      return undefined;
    }

    return {
      type: predicateType as 'FIELD' | 'CONST' | 'FILTER',
      value
    };
  }

  /**
   * Parse composite value that may span multiple tokens
   * Used for field names, filter values, etc. that can contain /, -, spaces
   * Stops at closing parenthesis
   */
  private parseCompositeValue(): string | undefined {
    let value = '';
    let lastToken: Token | undefined; // Track previous token for offset gap detection

    while (!this.isAtEnd()) {
      const token = this.peek();
      if (!token) break;

      // Stop at closing parenthesis
      if (token.type === TokenType.RightParen) {
        break;
      }

      // Add space if there's a gap between previous token end and current token start
      if (lastToken && token.startOffset > lastToken.endOffset) {
        value += ' ';
      }

      // Add token value based on type
      if (token.type === TokenType.QuotedIdentifier || token.type === TokenType.Identifier) {
        value += token.value;
      } else if (token.type === TokenType.String) {
        value += token.value;
      } else if (token.type === TokenType.Divide) {
        value += '/';
      } else if (token.type === TokenType.Dot) {
        value += '.';
      } else if (token.type === TokenType.Minus) {
        value += '-';
      } else if (token.type === TokenType.DotDot) {
        value += '..';
      } else if (token.type === TokenType.Integer || token.type === TokenType.Decimal) {
        value += token.value;
      } else {
        // Handle keyword tokens that might be part of value
        if (token.value) {
          value += token.value;
        } else {
          break;
        }
      }

      lastToken = token;
      this.advance();
    }

    return value;
  }

  /**
   * Parse conditional relations (IF/ELSE IF/ELSE chain)
   */
  private parseConditionalRelations(): ConditionalTableRelation[] | undefined {
    const relations: ConditionalTableRelation[] = [];

    while (this.check(TokenType.If)) {
      const relation = this.parseConditionalRelation();
      if (!relation) {
        return undefined;
      }
      relations.push(relation);

      // If there's an ELSE relation that's not another IF, we're done
      if (relation.elseRelation && !this.check(TokenType.If)) {
        break;
      }
    }

    return relations;
  }

  /**
   * Parse single conditional relation (IF condition THEN relation [ELSE relation])
   */
  private parseConditionalRelation(): ConditionalTableRelation | undefined {
    const startToken = this.peekOrEOF();

    // Expect IF
    if (!this.match(TokenType.If)) {
      return undefined;
    }

    // Expect opening parenthesis
    if (!this.match(TokenType.LeftParen)) {
      return undefined;
    }

    // Parse condition (same as WHERE condition)
    const condition = this.parseWhereCondition();
    if (!condition) {
      return undefined;
    }

    // Expect closing parenthesis
    if (!this.match(TokenType.RightParen)) {
      return undefined;
    }

    // Parse THEN relation (simple table reference with optional WHERE)
    const thenRelation = this.parseThenRelation();
    if (!thenRelation) {
      return undefined;
    }

    // Parse optional ELSE relation
    let elseRelation: TableRelationNode | undefined;
    if (this.check(TokenType.Else)) {
      this.advance(); // consume ELSE

      // Check if it's ELSE IF (chain continuation)
      if (this.check(TokenType.If)) {
        // ELSE IF detected: this is a chain continuation at the same level, NOT nesting
        // Per ConditionalTableRelation documentation, chains are represented as flat arrays
        // where semantic relationships are implicit in array ordering.
        // Leave elseRelation undefined - the outer parseConditionalRelations() loop
        // will handle the next IF naturally.
      } else {
        // Simple ELSE relation: final fallback value, terminates the chain
        const er = this.parseSimpleTableRelation();
        if (!er) {
          return undefined;
        }
        elseRelation = er;
      }
    }

    const endToken = this.previousOrEOF();

    return {
      type: 'ConditionalTableRelation',
      condition,
      thenRelation,
      elseRelation,
      startToken,
      endToken
    };
  }

  /**
   * Parse THEN relation (table reference with optional WHERE)
   */
  private parseThenRelation(): TableRelationNode | undefined {
    return this.parseSimpleTableRelation();
  }

  /**
   * Parse simple table relation (no IF conditionals)
   */
  private parseSimpleTableRelation(): TableRelationNode | undefined {
    const startToken = this.peekOrEOF();

    // Parse table name
    const tableName = this.parseIdentifierValue();
    if (!tableName) {
      return undefined;
    }

    // Parse optional field reference (after dot)
    let fieldName: string | undefined;
    if (this.match(TokenType.Dot)) {
      const field = this.parseIdentifierValue();
      if (!field) {
        return undefined;
      }
      fieldName = field;
    }

    // Parse optional WHERE clause
    let whereClause: WhereClauseNode | undefined;
    if (this.checkIdentifier('WHERE')) {
      this.advance(); // consume WHERE
      const wc = this.parseWhereClause();
      if (!wc) {
        return undefined;
      }
      whereClause = wc;
    }

    const endToken = this.previousOrEOF();

    return {
      type: 'TableRelationNode',
      tableName,
      fieldName,
      whereClause,
      startToken,
      endToken
    };
  }

  /**
   * Check if a token type can be treated as an identifier in property value contexts
   *
   * In C/AL property values, keywords are often used as identifiers (e.g., "Code", "Type", "Else").
   * This method accepts any token that could reasonably be part of an identifier,
   * excluding only structural tokens, operators, literals, and special tokens.
   *
   * @param tokenType - The token type to check
   * @returns true if the token type can be treated as an identifier
   */
  private isIdentifierLike(tokenType: TokenType): boolean {
    return !PropertyValueParser.NON_IDENTIFIER_TYPES.has(tokenType);
  }

  /**
   * Parse identifier value (handles both quoted and unquoted identifiers)
   * Also handles identifiers split across multiple tokens (e.g., "Country/Region Code")
   */
  private parseIdentifierValue(): string | undefined {
    const token = this.peek();
    if (!token) return undefined;

    if (token.type === TokenType.QuotedIdentifier) {
      this.advance();
      return token.value;
    }

    // Handle special case: string literals in FILTER predicates
    if (token.type === TokenType.String) {
      this.advance();
      return token.value;
    }

    // Accept any identifier-like token (including keywords)
    if (this.isIdentifierLike(token.type)) {
      this.advance();
      return token.value;
    }

    return undefined;
  }

  /**
   * Check if current token is an identifier with specific value
   */
  private checkIdentifier(value: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return !!token && this.isIdentifierLike(token.type) && token.value.toUpperCase() === value.toUpperCase();
  }

  /**
   * Check current token type without advancing
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token?.type === type;
  }

  /**
   * Match current token and advance if match
   */
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Get current token
   */
  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  /**
   * Get previous token
   */
  private previous(): Token | undefined {
    if (this.position === 0) {
      return undefined;
    }
    return this.tokens[this.position - 1];
  }

  /**
   * Get previous token, with fallback to synthetic EOF if not available
   */
  private previousOrEOF(): Token {
    const token = this.previous();
    if (token) return token;

    // Return synthetic EOF token
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
    return {
      type: TokenType.EOF,
      value: '',
      line: 1,
      column: 1,
      startOffset: 0,
      endOffset: 0
    };
  }

  /**
   * Get current token, with fallback to synthetic EOF if not available
   */
  private peekOrEOF(): Token {
    const token = this.peek();
    if (token) return token;

    // Return synthetic EOF token
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
    return {
      type: TokenType.EOF,
      value: '',
      line: 1,
      column: 1,
      startOffset: 0,
      endOffset: 0
    };
  }

  /**
   * Advance to next token
   */
  private advance(): Token | undefined {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.previous();
  }

  /**
   * Check if at end of tokens
   */
  private isAtEnd(): boolean {
    return this.position >= this.tokens.length;
  }
}
