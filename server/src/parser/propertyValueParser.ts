import { Token, TokenType } from '../lexer/tokens';
import {
  CalcFormulaNode,
  TableRelationNode,
  WhereClauseNode,
  WhereConditionNode,
  ConditionalTableRelation,
  ASTNode
} from './ast';

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

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Static factory method for parsing CalcFormula
   */
  static parseCalcFormula(tokens: Token[]): CalcFormulaNode | null {
    const parser = new PropertyValueParser(tokens);
    return parser.parseCalcFormula();
  }

  /**
   * Static factory method for parsing TableRelation
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
        return null;
      }

      const startToken = this.peekOrEOF();

      // Parse aggregation function
      const aggregationFunction = this.parseAggregationFunction();
      if (!aggregationFunction) {
        return null;
      }

      // Expect opening parenthesis
      if (!this.match(TokenType.LeftParen)) {
        return null;
      }

      // Parse table reference
      const sourceTable = this.parseIdentifierValue();
      if (!sourceTable) {
        return null;
      }

      // Parse optional field reference (after dot)
      let sourceField: string | undefined;
      if (this.match(TokenType.Dot)) {
        const field = this.parseIdentifierValue();
        if (!field) {
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
          return null;
        }
        whereClause = wc;
      }

      // Expect closing parenthesis (or accept EOF for incomplete expressions)
      this.match(TokenType.RightParen); // Consume if present
      const endToken = this.previousOrEOF();

      return {
        type: 'CalcFormulaNode',
        aggregationFunction,
        sourceTable,
        sourceField,
        whereClause,
        startToken,
        endToken
      };
    } catch (error) {
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
        return null;
      }

      const startToken = this.peekOrEOF();

      // Check for IF conditional
      if (this.check(TokenType.If)) {
        const conditionalRelations = this.parseConditionalRelations();
        if (!conditionalRelations || conditionalRelations.length === 0) {
          return null;
        }

        const endToken = this.previousOrEOF();

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
        return null;
      }

      // Parse optional field reference (after dot)
      let fieldName: string | undefined;
      if (this.match(TokenType.Dot)) {
        const field = this.parseIdentifierValue();
        if (!field) {
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
          return null;
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
    } catch (error) {
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
    if (token.type !== TokenType.Identifier) {
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
    let lastTokenWasWord = false; // Track if last token was identifier/keyword (need space before next one)

    while (!this.isAtEnd() && !foundOperator) {
      const token = this.peek();
      if (!token) break;

      // Check if this is an operator
      if (this.isOperator(token.type)) {
        foundOperator = true;
        break;
      }

      // Check if this is a predicate keyword (FIELD, CONST, FILTER) - means we went too far
      const upperValue = token.value.toUpperCase();
      if (upperValue === 'FIELD' || upperValue === 'CONST' || upperValue === 'FILTER') {
        // This shouldn't happen in well-formed WHERE clause, but handle gracefully
        break;
      }

      // Add token value to field name based on token type
      // Field names can contain various characters and keywords
      const currentTokenIsWord = token.type === TokenType.QuotedIdentifier ||
                                  token.type === TokenType.Identifier ||
                                  (token.value && /^[a-zA-Z]/.test(token.value));

      // Add space before word tokens if last token was also a word
      if (currentTokenIsWord && lastTokenWasWord) {
        fieldName += ' ';
      }

      if (token.type === TokenType.QuotedIdentifier || token.type === TokenType.Identifier) {
        fieldName += token.value;
        lastTokenWasWord = true;
      } else if (token.type === TokenType.Divide) {
        fieldName += '/';
        lastTokenWasWord = false;
      } else if (token.type === TokenType.Dot) {
        fieldName += '.';
        lastTokenWasWord = false;
      } else if (token.type === TokenType.Minus) {
        fieldName += '-';
        lastTokenWasWord = false;
      } else {
        // Check if this is a keyword token that's part of the field name
        // Common examples: Code, Date, Time, No, etc.
        // These get tokenized as keyword types but can be part of field names
        if (token.value) {
          fieldName += token.value;
          lastTokenWasWord = true;
        } else {
          // Unknown token type in field name - stop collecting
          break;
        }
      }

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

    if (token.type !== TokenType.Identifier) {
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
    if (!value) {
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
    let lastTokenWasWord = false;

    while (!this.isAtEnd()) {
      const token = this.peek();
      if (!token) break;

      // Stop at closing parenthesis
      if (token.type === TokenType.RightParen) {
        break;
      }

      // Check if this is a word token (identifier or keyword)
      const currentTokenIsWord = token.type === TokenType.QuotedIdentifier ||
                                  token.type === TokenType.Identifier ||
                                  (token.value && /^[a-zA-Z]/.test(token.value));

      // Add space before word tokens if last token was also a word
      if (currentTokenIsWord && lastTokenWasWord) {
        value += ' ';
      }

      if (token.type === TokenType.QuotedIdentifier || token.type === TokenType.Identifier) {
        value += token.value;
        lastTokenWasWord = true;
      } else if (token.type === TokenType.String) {
        value += token.value;
        lastTokenWasWord = false;
      } else if (token.type === TokenType.Divide) {
        value += '/';
        lastTokenWasWord = false;
      } else if (token.type === TokenType.Dot) {
        value += '.';
        lastTokenWasWord = false;
      } else if (token.type === TokenType.Minus) {
        value += '-';
        lastTokenWasWord = false;
      } else if (token.type === TokenType.DotDot) {
        value += '..';
        lastTokenWasWord = false;
      } else if (token.type === TokenType.Integer || token.type === TokenType.Decimal) {
        value += token.value;
        lastTokenWasWord = false;
      } else {
        // Handle keyword tokens that might be part of value
        if (token.value) {
          value += token.value;
          lastTokenWasWord = true;
        } else {
          break;
        }
      }

      this.advance();
    }

    return value || undefined;
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

      // Check if it's ELSE IF (nested conditional)
      if (this.check(TokenType.If)) {
        // Don't consume the IF - let the outer loop handle it
        // But we need to create an elseRelation for this node
        // We'll parse the rest recursively
        const nestedRelations = this.parseConditionalRelations();
        if (!nestedRelations || nestedRelations.length === 0) {
          return undefined;
        }

        // Wrap nested conditionals in a TableRelationNode
        const elseStartToken = this.tokens[this.position - 1];
        const elseEndToken = this.previousOrEOF();

        elseRelation = {
          type: 'TableRelationNode',
          conditionalRelations: nestedRelations,
          startToken: elseStartToken,
          endToken: elseEndToken
        };
      } else {
        // Simple ELSE relation
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

    if (token.type === TokenType.Identifier) {
      this.advance();
      return token.value;
    }

    // Handle special case: string literals in FILTER predicates
    if (token.type === TokenType.String) {
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
    return !!token && token.type === TokenType.Identifier && token.value.toUpperCase() === value.toUpperCase();
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
