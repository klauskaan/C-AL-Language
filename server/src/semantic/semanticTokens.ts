import { SemanticTokensBuilder } from 'vscode-languageserver';
import { Token, TokenType } from '../lexer/tokens';
import { CALDocument, ActionDeclaration } from '../parser/ast';
import { scanForSetLiterals, TokenContextType } from './setLiteralScanner';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';

/**
 * Semantic token types - these will be sent to the client
 * The client will map these to appropriate colors
 */
export enum SemanticTokenTypes {
  Keyword = 0,
  String = 1,
  Number = 2,
  Operator = 3,
  Variable = 4,
  Function = 5,
  Parameter = 6,
  Property = 7,
  Type = 8,
  Comment = 9,
  SetBracket = 10
}

/**
 * Semantic token modifiers
 */
export enum SemanticTokenModifiers {
  Declaration = 0,
  Definition = 1,
  Readonly = 2,
  Static = 3
}

/**
 * Get the legend for semantic tokens (must be sent to client during initialization)
 */
export function getSemanticTokensLegend(): { tokenTypes: string[], tokenModifiers: string[] } {
  return {
    tokenTypes: [
      'keyword',
      'string',
      'number',
      'operator',
      'variable',
      'function',
      'parameter',
      'property',
      'type',
      'comment',
      'setbracket'
    ],
    tokenModifiers: [
      'declaration',
      'definition',
      'readonly',
      'static'
    ]
  };
}

/**
 * Scan AST for action type tokens and property name tokens
 *
 * Unlike setLiteralScanner (AST-only), this scanner takes both the AST
 * and token array. Multi-word property names require scanning forward in
 * the token array from Property.startToken to find all name tokens.
 */
function scanForActionTokens(ast: CALDocument, tokens: readonly Token[]): Map<number, SemanticTokenTypes> {
  const contextMap = new Map<number, SemanticTokenTypes>();
  const walker = new ASTWalker();

  // Build a token index for offset-based lookup
  const tokensByOffset = new Map<number, number>();  // startOffset -> array index
  for (let i = 0; i < tokens.length; i++) {
    tokensByOffset.set(tokens[i].startOffset, i);
  }

  const visitor: Partial<ASTVisitor> = {
    visitActionDeclaration(node: ActionDeclaration): void | false {
      // Mark action type token as Keyword
      if (node.actionTypeToken) {
        contextMap.set(node.actionTypeToken.startOffset, SemanticTokenTypes.Keyword);
      }

      // Mark property name tokens as Property
      if (node.properties?.properties) {
        for (const prop of node.properties.properties) {
          const startIdx = tokensByOffset.get(prop.startToken.startOffset);
          if (startIdx !== undefined) {
            // Scan forward from property start token until = is found
            const MAX_NAME_TOKENS = 5;  // Matches accumulatePropertyName
            for (let j = startIdx; j < startIdx + MAX_NAME_TOKENS && j < tokens.length; j++) {
              if (tokens[j].type === TokenType.Equal) break;
              contextMap.set(tokens[j].startOffset, SemanticTokenTypes.Property);
            }
          }
        }
      }

      // Don't return false — let the walker traverse children automatically
      // This covers nested action hierarchies (children) and inline ActionList
    }
  };

  walker.walk(ast, visitor);
  return contextMap;
}

/**
 * Semantic Tokens Provider
 *
 * This is the key feature that solves the quoted identifier issue.
 * By providing semantic tokens, we can make quoted identifiers like "Line No."
 * appear the same as regular identifiers like Description, even though the
 * TextMate grammar scopes them differently for bracket matching purposes.
 */
export class SemanticTokensProvider {
  private inObjectProperties = false;
  private inProperties = false;
  private propertiesBraceDepth = 0;
  private inPropertyValue = false; // Tracks if we're currently in a property value (after = and before ;)
  private bracketDepth: number = 0; // Tracks [] bracket depth to handle CaptionML=[DAN=...;ENU=...]

  /**
   * Build semantic tokens from tokens and AST
   */
  public buildSemanticTokens(tokens: readonly Token[], ast: CALDocument, builder: SemanticTokensBuilder): void {
    // Reset state for each document
    this.inObjectProperties = false;
    this.inProperties = false;
    this.propertiesBraceDepth = 0;
    this.inPropertyValue = false;
    this.bracketDepth = 0;

    // Scan for set literals and range operators
    const setLiteralContext = scanForSetLiterals(ast);
    const actionContext = scanForActionTokens(ast, tokens);

    // Process all tokens and assign semantic token types
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;

      // Track OBJECT-PROPERTIES and PROPERTIES context
      this.updatePropertiesContext(token);

      this.processToken(token, builder, nextToken, setLiteralContext.contextMap, actionContext);
    }
  }

  /**
   * Update context tracking for OBJECT-PROPERTIES and PROPERTIES sections
   */
  private updatePropertiesContext(token: Token): void {
    // Check if we're entering an OBJECT-PROPERTIES section
    if (token.type === TokenType.ObjectProperties) {
      this.inObjectProperties = true;
      return;
    }

    // Check if we're entering a PROPERTIES section
    if (token.type === TokenType.Properties) {
      this.inProperties = true;
      return;
    }

    // Track brace depth when inside either section
    if (this.inObjectProperties || this.inProperties) {
      if (token.type === TokenType.LeftBrace) {
        this.propertiesBraceDepth++;
      } else if (token.type === TokenType.RightBrace) {
        this.propertiesBraceDepth--;

        // Exit sections when we close them (when depth returns to 0)
        if (this.propertiesBraceDepth === 0) {
          this.inObjectProperties = false;
          this.inProperties = false;
          // Reset bracket depth when exiting property sections
          this.bracketDepth = 0;
        }
      }
    }
  }


  private processToken(token: Token, builder: SemanticTokensBuilder, nextToken: Token | null, contextMap: Map<number, TokenContextType>, actionContextMap: Map<number, SemanticTokenTypes>): void {
    let tokenType: number | null = null;

    // Check action context map FIRST (AST-derived, definitive)
    const actionSemanticType = actionContextMap.get(token.startOffset);
    if (actionSemanticType !== undefined) {
      const line = token.line - 1;
      const char = token.column - 1;
      const length = token.endOffset - token.startOffset;
      builder.push(line, char, length, actionSemanticType, 0);
      return;
    }

    // Check OBJECT-PROPERTIES context next
    // If we're in OBJECT-PROPERTIES and this is handled there, use that result
    // This prevents OBJECT-PROPERTIES brackets from being marked as SetBracket
    if (this.inObjectProperties && this.propertiesBraceDepth > 0) {
      tokenType = this.mapObjectPropertyToken(token, nextToken);
    } else {
      // Not in OBJECT-PROPERTIES, check set literal context
      const context = contextMap.get(token.startOffset);
      if (context) {
        // Apply context-specific semantic token type
        if (context === TokenContextType.SetBracketOpen || context === TokenContextType.SetBracketClose) {
          tokenType = SemanticTokenTypes.SetBracket;
        } else if (context === TokenContextType.RangeOperator) {
          tokenType = SemanticTokenTypes.Operator;
        }
      }

      // If no set literal context, use normal mapping
      if (tokenType === null) {
        tokenType = this.mapTokenTypeToSemantic(token, nextToken);
      }
    }

    if (tokenType === null) {
      return; // Skip tokens we don't want to highlight semantically
    }

    // Calculate line and character position (0-based)
    const line = token.line - 1; // Tokens use 1-based line numbers
    const char = token.column - 1; // Tokens use 1-based column numbers
    // Use source span (includes quotes) instead of value.length (excludes quotes)
    const length = token.endOffset - token.startOffset;

    // Add the semantic token
    builder.push(line, char, length, tokenType, 0);
  }

  /**
   * Map lexer token types to semantic token types
   *
   * IMPORTANT: Quoted identifiers are mapped to 'variable' type, making them
   * appear the same as regular identifiers despite having different TextMate scopes.
   *
   * Context-aware mapping:
   * - In OBJECT-PROPERTIES: Date, Time, Modified, etc. are property names (not types)
   * - In PROPERTIES: Treated normally (identifiers remain as variables)
   * - Property values after = are strings (in OBJECT-PROPERTIES)
   */
  private mapTokenTypeToSemantic(token: Token, nextToken: Token | null): number | null {
    // Special handling for OBJECT-PROPERTIES context only
    // PROPERTIES sections are treated normally (no special property name handling)
    if (this.inObjectProperties && this.propertiesBraceDepth > 0) {
      return this.mapObjectPropertyToken(token, nextToken);
    }

    switch (token.type) {
      // Keywords
      case TokenType.Object:
      case TokenType.Table:
      case TokenType.Page:
      case TokenType.Report:
      case TokenType.Codeunit:
      case TokenType.Query:
      case TokenType.XMLport:
      case TokenType.MenuSuite:
      case TokenType.ObjectProperties:
      case TokenType.Properties:
      case TokenType.Fields:
      case TokenType.Keys:
      case TokenType.FieldGroups:
      case TokenType.Actions:
      case TokenType.Controls:
      case TokenType.Dataset:
      case TokenType.Elements:
      case TokenType.Labels:
      case TokenType.MenuNodes:
      case TokenType.DataItems:
      case TokenType.Sections:
      case TokenType.RequestForm:
      case TokenType.RequestPage:
      case TokenType.Code:
      case TokenType.If:
      case TokenType.Then:
      case TokenType.Else:
      case TokenType.Case:
      case TokenType.Of:
      case TokenType.While:
      case TokenType.Do:
      case TokenType.Repeat:
      case TokenType.Until:
      case TokenType.For:
      case TokenType.To:
      case TokenType.DownTo:
      case TokenType.Exit:
      case TokenType.Break:
      case TokenType.Procedure:
      case TokenType.Function:
      case TokenType.Local:
      case TokenType.Var:
      case TokenType.Trigger:
      case TokenType.Event:
      case TokenType.Begin:
      case TokenType.End:
      case TokenType.True:
      case TokenType.False:
      case TokenType.Div:
      case TokenType.Mod:
      case TokenType.And:
      case TokenType.Or:
      case TokenType.Not:
      case TokenType.Xor:
      case TokenType.In:
      case TokenType.With:
      case TokenType.Array:
      case TokenType.Temporary:
      case TokenType.InDataSet:
      case TokenType.RunOnClient:
      case TokenType.WithEvents:
      case TokenType.SecurityFiltering:
      case TokenType.LeftBrace:
      case TokenType.RightBrace:
        return SemanticTokenTypes.Keyword;

      // Handle unmatched right braces as keywords for semantic highlighting
      case TokenType.Unknown:
        if (token.value === '}') {
          return SemanticTokenTypes.Keyword;
        }
        return null; // Skip other unknown tokens

      // Data types
      case TokenType.Boolean:
      case TokenType.Integer_Type:
      case TokenType.Decimal_Type:
      case TokenType.Text:
      case TokenType.Code_Type:
      case TokenType.Date_Type:
      case TokenType.Time_Type:
      case TokenType.DateTime_Type:
      case TokenType.Record:
      case TokenType.RecordID:
      case TokenType.RecordRef:
      case TokenType.FieldRef:
      case TokenType.BigInteger:
      case TokenType.BigText:
      case TokenType.BLOB:
      case TokenType.GUID:
      case TokenType.Duration:
      case TokenType.Option:
      case TokenType.Char:
      case TokenType.Byte:
      case TokenType.TextConst:
        return SemanticTokenTypes.Type;

      // Literals
      case TokenType.String:
        return SemanticTokenTypes.String;

      case TokenType.Integer:
      case TokenType.Decimal:
        return SemanticTokenTypes.Number;

      // Identifiers and Quoted Identifiers
      // THIS IS THE KEY: Both regular and quoted identifiers get the same semantic type
      case TokenType.Identifier:
      case TokenType.QuotedIdentifier:
        return SemanticTokenTypes.Variable;

      // Operators
      case TokenType.Plus:
      case TokenType.Minus:
      case TokenType.Multiply:
      case TokenType.Divide:
      case TokenType.Assign:
      case TokenType.Equal:
      case TokenType.NotEqual:
      case TokenType.Less:
      case TokenType.LessEqual:
      case TokenType.Greater:
      case TokenType.GreaterEqual:
      case TokenType.Dot:
      case TokenType.DotDot:
      case TokenType.DoubleColon:
        return SemanticTokenTypes.Operator;

      // Comments
      case TokenType.Comment:
        return SemanticTokenTypes.Comment;

      // Skip other tokens (punctuation, whitespace, etc.)
      default:
        return null;
    }
  }

  /**
   * Map tokens inside OBJECT-PROPERTIES sections
   *
   * In OBJECT-PROPERTIES, the pattern is: PropertyName=PropertyValue; or PropertyName PropertyName=PropertyValue;
   * - Property names (left of =) should be Property type (including multi-word names like "Version List")
   * - Property values (right of =, before ;) should be String type - INCLUDING separators like :, -, ., ,
   * - This includes Date, Time, Modified, Version List, etc.
   */
  private mapObjectPropertyToken(token: Token, nextToken: Token | null): number | null {
    // Check if this is part of a property name (immediately before = or another identifier that precedes =)
    const isPropertyName = this.isPropertyName(token, nextToken);
    if (isPropertyName) {
      return SemanticTokenTypes.Property;
    }

    // Handle = and ; to track property value state
    if (token.type === TokenType.Equal) {
      this.inPropertyValue = true; // Start of property value
      return null; // Don't color the = itself
    }

    // Track bracket depth for multi-language properties like CaptionML=[DAN=...;ENU=...]
    if (token.type === TokenType.LeftBracket && this.inPropertyValue) {
      this.bracketDepth++;
      return null; // Don't color the bracket itself
    }

    if (token.type === TokenType.RightBracket && this.inPropertyValue && this.bracketDepth > 0) {
      this.bracketDepth--;
      return null; // Don't color the bracket itself
    }

    // Only reset inPropertyValue on semicolon when NOT inside brackets
    // Brackets are used in multi-language properties like CaptionML=[DAN=...;ENU=...]
    if (token.type === TokenType.Semicolon) {
      if (this.bracketDepth === 0) {
        this.inPropertyValue = false; // End of property value (only when not inside brackets)
      }
      return null; // Don't color the ; itself
    }

    // If we're in a property value, color EVERYTHING as String (including separators)
    if (this.inPropertyValue) {
      // All value parts including numbers, identifiers, and separators -> String
      if (token.type === TokenType.Integer ||
          token.type === TokenType.Decimal ||
          token.type === TokenType.Identifier ||
          token.type === TokenType.True ||
          token.type === TokenType.False ||
          token.type === TokenType.String ||
          token.type === TokenType.Minus ||    // - in dates like 24-03-19
          token.type === TokenType.Colon ||    // : in times like 12:00:00
          token.type === TokenType.Dot ||      // . in versions like NAVW114.00
          token.type === TokenType.Comma) {    // , in lists
        return SemanticTokenTypes.String;
      }
    }

    // Skip other tokens
    return null;
  }

  /**
   * Check if a token is part of a property name in OBJECT-PROPERTIES
   *
   * Property names can be:
   * - Single word: Date, Time, Modified, etc.
   * - Multi-word: Version List, etc.
   *
   * A token is a property name if:
   * 1. It's directly before = (next token is =)
   * 2. It's a type keyword before another identifier that comes before =
   */
  private isPropertyName(token: Token, nextToken: Token | null): boolean {
    // Types like Date, Time, Modified, Version are property names when followed by = or another identifier
    if (token.type === TokenType.Date_Type ||
        token.type === TokenType.Time_Type ||
        token.type === TokenType.Identifier ||
        token.type === TokenType.QuotedIdentifier) {

      // Case 1: Directly before = (single-word property)
      if (nextToken && nextToken.type === TokenType.Equal) {
        return true;
      }

      // Case 2: Before another identifier (part of multi-word property like "Version List")
      // Continue checking through identifiers until we find =
      if (nextToken && (nextToken.type === TokenType.Identifier ||
                        nextToken.type === TokenType.QuotedIdentifier ||
                        nextToken.type === TokenType.Date_Type ||
                        nextToken.type === TokenType.Time_Type)) {
        return true;
      }
    }

    return false;
  }
}
