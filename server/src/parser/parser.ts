import { Token, TokenType } from '../lexer/tokens';
import { Lexer } from '../lexer/lexer';
import { sanitizeContent, sanitizeTokenType, stripPaths } from '../utils/sanitize';
import { PropertyValueParser } from './propertyValueParser';
import { unescapeCalString } from '../utils/string';
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
  ActionSection,
  ActionDeclaration,
  ActionType,
  ControlSection,
  ControlDeclaration,
  ControlType,
  ElementsSection,
  XMLportElement,
  XMLportNodeType,
  XMLportSourceType,
  CodeSection,
  VariableDeclaration,
  VariableModifiers,
  ProcedureAttribute,
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
  BreakStatement,
  EmptyStatement,
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
  TokenType.Controls,   // e.g., "Controls" section keyword but can be used as name (like Code)
  // Note: Date_Type and Time_Type removed - now covered by _TYPE suffix check (Issue #52)
  // Issue #54: Add data type keywords verified in test/REAL/
  TokenType.FieldRef,   // e.g., "FieldRef" parameter name (211 occurrences)
  TokenType.RecordRef,  // e.g., "RecordRef" parameter name (99 occurrences)
  TokenType.RecordID,   // e.g., "RecordID" parameter name (17 occurrences)
  TokenType.Duration,   // e.g., "Duration" parameter name (5 occurrences)
  TokenType.BigInteger, // e.g., "BigInteger" parameter name (3 occurrences)
  TokenType.Fields,     // e.g., "Fields" parameter name (2 occurrences)
  TokenType.Keys,       // e.g., "Keys" section keyword but can be used as name (like Fields, Controls)
  TokenType.Byte,       // e.g., "Byte" parameter name (1 occurrence)
  TokenType.Break,      // Issue #258: "Break" procedure name (REP6005597.TXT:835)
                        // Note: Calls require quoted syntax ("Break";) to disambiguate from BREAK statement
  // Issue #258: Section keywords as identifiers (completing the family started by Fields/Keys/Controls/Code)
  // These keywords are structural at object level but can be used as identifiers inside CODE sections.
  // At SECTION_LEVEL (procedure declarations): lexer retains keyword types, parser must allow via this set.
  // At CODE_BLOCK (procedure bodies): lexer downgrades to Identifier automatically.
  // Note: All section/object keywords are uniformly downgraded to Identifier when followed by @ (Issue #261).
  // ALLOWED_KEYWORDS_AS_IDENTIFIERS still necessary for keywords used WITHOUT @ suffix in identifier position.
  // State contamination: updateContextForKeyword fires at SECTION_LEVEL setting lastWasSectionKeyword (Issue #260).
  // See also: SECTION_KEYWORDS constant for the authoritative list of section keywords used in error recovery.
  TokenType.MenuSuite,     // Object type keyword (same family as Table/Page/Report/Codeunit/Query/XMLport)
  TokenType.Properties,    // Section keyword (PROPERTIES section)
  TokenType.FieldGroups,   // Section keyword (FIELDGROUPS section)
  TokenType.Actions,       // Section keyword (ACTIONS section - Page/Report)
  TokenType.Elements,      // Section keyword (ELEMENTS section - XMLport)
  TokenType.Labels,        // Section keyword (LABELS section - Report)
  TokenType.Dataset,       // Section keyword (DATASET section - Report/Page)
  // Issue #361: Add missing data type keywords that can be used as identifiers
  TokenType.BigText,       // Data type keyword (e.g., "BigText" parameter name)
  TokenType.BLOB,          // Data type keyword (e.g., "BLOB" parameter name)
  TokenType.GUID,          // Data type keyword (e.g., "GUID" parameter name)
  TokenType.TextConst,     // Data type keyword (e.g., "TextConst" parameter name)
  TokenType.RequestForm,   // Section keyword (REQUESTFORM section - Report)
  TokenType.RequestPage,   // Section keyword (REQUESTPAGE section - Report)
  TokenType.MenuNodes,     // Section keyword (MENUNODES section - MenuSuite)
  TokenType.DataItems,     // Section keyword (DATAITEMS section - Report)
  TokenType.Sections,      // Section keyword (SECTIONS section - Form, legacy)
  TokenType.ALOnlyKeyword,         // Enum, Interface, Extends, Implements can be variable names
  TokenType.ALOnlyAccessModifier,  // Internal, Protected, Public can be variable names
]);


/**
 * Control-flow keywords that should NEVER appear in expression position.
 * When encountered in parsePrimary(), these indicate a syntax error rather
 * than an identifier. The parser records an error and recovers.
 *
 * IMPORTANT: Break is intentionally EXCLUDED from this set.
 * Real NAV code uses "Break" as a procedure name (Issue #258, REP6005597.TXT:835).
 * Break is in ALLOWED_KEYWORDS_AS_IDENTIFIERS for this reason.
 *
 * Exit is also excluded because it takes an optional expression argument
 * EXIT(value), so it can legitimately appear at expression boundaries.
 */
const CONTROL_FLOW_KEYWORDS = new Set<TokenType>([
  TokenType.Then,      // IF ... THEN
  TokenType.Else,      // IF ... ELSE, CASE ... ELSE
  TokenType.Do,        // WHILE ... DO, FOR ... DO
  TokenType.Of,        // CASE ... OF
  TokenType.To,        // FOR ... TO
  TokenType.DownTo,    // FOR ... DOWNTO
  TokenType.Until,     // REPEAT ... UNTIL
  TokenType.Begin,     // Block start
  TokenType.End,       // Block/statement terminator
]);

/**
 * All section keywords that can appear at the object level in C/AL (15 keywords).
 * Used by isSectionKeyword() and synchronize() for error recovery.
 *
 * This is distinct from lexer.ts SECTION_KEYWORDS (12 keywords) which is used
 * for identifier downgrading. The parser includes three additional keywords:
 * - Fields: Table field definitions section
 * - Keys: Table key definitions section
 * - Controls: Page/Form control definitions section
 *
 * These three keywords cannot appear as identifiers in contexts where the lexer
 * performs downgrading (field names, key names, control names, ML properties, code blocks),
 * so they are excluded from the lexer set. However, they are section keywords
 * for error recovery purposes in the parser.
 *
 * Note: Code and Controls require special handling (must be followed by '{')
 * to distinguish from use as identifiers. The isSectionKeyword() method
 * handles this distinction separately before checking this set.
 *
 * @internal Exported for testing only. Do not use outside of parser tests.
 */
export const SECTION_KEYWORDS = new Set<TokenType>([
  TokenType.Properties,
  TokenType.Fields,
  TokenType.Keys,
  TokenType.FieldGroups,
  TokenType.Code,
  TokenType.Controls,
  TokenType.MenuNodes,
  TokenType.Actions,
  TokenType.Dataset,
  TokenType.RequestPage,
  TokenType.Labels,
  TokenType.Elements,
  TokenType.RequestForm,
  TokenType.DataItems,
  TokenType.Sections,
]);

/**
 * Tokens that indicate a procedure/function boundary in the CODE section.
 * Used by error recovery logic to prevent consuming into the next procedure.
 *
 * These are the keywords that can start a new code unit within a CODE section:
 * - PROCEDURE: Standard procedure declaration
 * - FUNCTION: Function declaration (legacy, but valid)
 * - TRIGGER: Event trigger declaration
 * - EVENT: Event publisher/subscriber declaration
 *
 * @internal Exported for testing only. Do not use outside of parser tests.
 */
export const PROCEDURE_BOUNDARY_TOKENS = new Set<TokenType>([
  TokenType.Procedure,
  TokenType.Function,
  TokenType.Trigger,
  TokenType.Event,
]);

/**
 * Statement-starting keywords that signal a missing CASE END
 *
 * When encountered during CASE branch parsing, these keywords indicate the CASE
 * statement is missing its END. They never appear within a case branch statement,
 * so their presence means we've left the CASE structure.
 *
 * Issue #314: CASE missing END detection when followed by control flow statements
 */
export const CASE_EXIT_STATEMENT_KEYWORDS = new Set<TokenType>([
  TokenType.If,
  TokenType.While,
  TokenType.For,
  TokenType.Repeat,
  TokenType.With,
]);

/**
 * Tokens that should NEVER be consumed in parsePrimary() fallback - throw error.
 * These are structural/boundary tokens that indicate missing expression.
 *
 * Issue #361: parsePrimary() should throw on tokens that never start an expression
 * and would break parsing if consumed. These tokens are "wrong enough" that we
 * should error without consuming them, preserving the token stream for recovery.
 *
 * Note: Minus and Not are NOT in this set - they are handled by parseUnary() before
 * parsePrimary() is reached, so they are unreachable here.
 *
 * @internal
 */
const NEVER_PRIMARY_THROW = new Set<TokenType>([
  TokenType.RightParen,    // Unbalanced closing delimiter
  TokenType.RightBracket,  // Unbalanced closing delimiter
  TokenType.RightBrace,    // Unbalanced closing delimiter (code blocks only)
  TokenType.Semicolon,     // Statement terminator
  TokenType.LeftBrace,     // Block start (BEGIN...END context)
  TokenType.If,            // Statement keyword
  TokenType.While,         // Statement keyword
  TokenType.Repeat,        // Statement keyword
  TokenType.For,           // Statement keyword
  TokenType.Case,          // Statement keyword
  TokenType.Exit,          // Statement keyword
  TokenType.With,          // Statement keyword
  TokenType.EOF,           // End of file
]);

/**
 * Tokens that should NEVER be consumed in parsePrimary() fallback - consume and error.
 * These are operator tokens that require a left operand but have none.
 *
 * Issue #361: parsePrimary() should error on tokens that cannot start an expression
 * but are "close enough" that we should consume them and return an error sentinel.
 * Consuming these tokens prevents infinite loops when they appear in invalid contexts.
 *
 * Binary operators that appear where a primary is expected are always errors:
 * they require a left operand to be valid. We consume them and return an error
 * sentinel to allow parsing to continue.
 *
 * Note: Minus and Not are NOT in this set - they are handled by parseUnary() before
 * parsePrimary() is reached, so they are unreachable here.
 *
 * @internal
 */
const NEVER_PRIMARY_CONSUME = new Set<TokenType>([
  // Binary arithmetic operators
  TokenType.Plus,          // Binary + (unary + not in C/AL)
  TokenType.Multiply,      // Binary * operator
  TokenType.Divide,        // Binary / operator
  // Assignment operators
  TokenType.Assign,        // := assignment
  TokenType.PlusAssign,    // += compound assignment
  TokenType.MinusAssign,   // -= compound assignment
  TokenType.MultiplyAssign, // *= compound assignment
  TokenType.DivideAssign,  // /= compound assignment
  // Comparison operators
  TokenType.Equal,         // = comparison
  TokenType.NotEqual,      // <> comparison
  TokenType.Less,          // < comparison
  TokenType.LessEqual,     // <= comparison
  TokenType.Greater,       // > comparison
  TokenType.GreaterEqual,  // >= comparison
  // Postfix/infix operators
  TokenType.Dot,           // . member access (requires left operand)
  // Note: DotDot (..) is NOT in this set - it can start open-ended ranges in set literals: [..100]
  TokenType.DoubleColon,   // :: scope resolution (requires left operand)
  TokenType.Colon,         // : type annotation separator
  TokenType.Comma,         // , list separator
  // Binary logical/arithmetic keywords
  TokenType.And,           // AND binary operator
  TokenType.Or,            // OR binary operator
  TokenType.Xor,           // XOR binary operator
  TokenType.Div,           // DIV integer division
  TokenType.Mod,           // MOD modulo operator
  TokenType.In,            // IN membership test
]);

/**
 * Section keywords that are ALWAYS skipped via skipUnsupportedSection().
 * These sections have complex nested structures that are not parsed.
 *
 * This set excludes:
 * - Actions: Has dedicated parseActionSection() with fallback to skip on error
 * - Controls: Has dedicated parseControlSection() with fallback to skip on error
 * - Elements: XMLport ELEMENTS are fully parsed; only Query ELEMENTS are skipped
 *             (handled specially in the section parsing loop)
 *
 * @internal Exported for testing only. Do not use outside of parser tests.
 */
export const UNSUPPORTED_SECTIONS = new Set<TokenType>([
  TokenType.MenuNodes,
  TokenType.Dataset,
  TokenType.RequestPage,
  TokenType.Labels,
  TokenType.RequestForm,
  TokenType.DataItems,
  TokenType.Sections,
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
      this.recordError(`Invalid integer value: ${sanitizeContent(token.value)}${contextMsg}`, token);
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
   * Record a warning when attributes are ignored for non-PROCEDURE declarations.
   * Used when attributes precede TRIGGER or EVENT declarations (which don't support attributes in C/AL).
   */
  private warnIgnoredAttributes(count: number, token: Token): void {
    this.recordError(
      `${count} ${count === 1 ? 'attribute' : 'attributes'} ignored - attributes are only supported on PROCEDURE declarations in C/AL`,
      token
    );
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
    let actions: ActionSection | null = null;
    let controls: ControlSection | null = null;
    let elements: ElementsSection | null = null;
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
        } else if (token.type === TokenType.Actions) {
          try {
            actions = this.parseActionSection('top-level');
          } catch (error) {
            if (error instanceof ParseError) {
              this.errors.push(error);
              this.skipUnsupportedSection(TokenType.Actions);
            } else {
              throw error;
            }
          }
        } else if (token.type === TokenType.Var) {
          // Parse object-level VAR section
          // These variables should be included in the CODE section
          this.parseVariableDeclarations(objectLevelVariables);
        } else if (this.check(TokenType.Code)) {
          code = this.parseCodeSection();
          // Prepend object-level variables to code section variables
          if (objectLevelVariables.length > 0 && code) {
            code.variables = [...objectLevelVariables, ...code.variables];
          }
        } else if (token.type === TokenType.Controls) {
          try {
            controls = this.parseControlSection();
          } catch (error) {
            if (error instanceof ParseError) {
              this.errors.push(error);
              this.skipUnsupportedSection(TokenType.Controls);
            } else {
              throw error;
            }
          }
        } else if (token.type === TokenType.Elements) {
          if (objectKind === ObjectKind.XMLport) {
            elements = this.parseElementsSection();
          } else {
            // Query ELEMENTS have different format - not yet supported
            this.skipUnsupportedSection(TokenType.Elements);
          }
        } else if (UNSUPPORTED_SECTIONS.has(token.type)) {
          // Skip unsupported sections (DATAITEMS, SECTIONS, DATASET, REQUESTPAGE, LABELS, REQUESTFORM, MENUNODES)
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
      actions,
      controls,
      elements,
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
      // Unquoted name - use offset-based accumulation to preserve original spacing
      const nameParts: string[] = [];
      let lastEndOffset = -1;
      while (!this.check(TokenType.LeftBrace) && !this.isAtEnd()) {
        const token = this.advance();
        // Add space only if there was whitespace between tokens in source
        if (lastEndOffset !== -1 && token.startOffset > lastEndOffset) {
          nameParts.push(' ');
        }
        nameParts.push(token.value);
        lastEndOffset = token.endOffset;
      }
      objectName = nameParts.join('').trim();
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
    this.consume(TokenType.LeftBrace, 'Expected { to open PROPERTIES section');

    const properties: Property[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type)) {
      const property = this.parseWithRecovery(
        () => this.parseProperty(),
        [TokenType.Semicolon, TokenType.RightBrace]
      );
      if (property) {
        properties.push(property);
      }
    }

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      // Missing closing brace - record error but return the section
      this.recordError('Expected } to close PROPERTIES section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'PropertySection',
      properties,
      startToken,
      endToken
    };
  }

  private parseProperty(): Property {
    const { name, startToken } = this.accumulatePropertyName();

    const equalsToken = this.consume(TokenType.Equal, 'Expected = after property name');

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

      const endToken = this.consumeExpected(TokenType.Semicolon, 'Expected ; after trigger body');

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

    // Check if this is an ActionList property (value starts with ACTIONS {)
    if (name.toLowerCase() === 'actionlist' && this.check(TokenType.Actions) && this.isFollowedByLeftBrace()) {
      const actionSection = this.parseActionSection('property');
      const endToken = this.check(TokenType.Semicolon) ? this.advance() : actionSection.endToken;
      return {
        type: 'Property',
        name,
        value: 'ACTIONS {...}',
        actionSection,
        startToken,
        endToken
      };
    }

    // Regular property value - read until semicolon, preserving whitespace
    // Special handling: ActionList/DataItemTable properties can have nested ACTIONS/DATAITEMS blocks
    let value = '';
    let lastToken: Token | null = null;
    const valueTokens: Token[] = [];  // Collect original tokens
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
      // Also check if the keyword is followed by '{' to ensure it's actually a section start
      // This prevents stopping on keywords used in property values like CaptionML=ENU=Actions
      if (braceDepth === 0 && bracketDepth === 0 && value.length > 0 &&
          (this.check(TokenType.Actions) ||
           this.check(TokenType.Controls) ||
           this.check(TokenType.Elements) ||
           this.check(TokenType.RequestForm) ||
           this.check(TokenType.DataItems))) {
        // Peek ahead to see if this keyword is followed by '{'
        if (this.isFollowedByLeftBrace()) {
          break;
        }
      }

      const currentToken = this.advance();
      valueTokens.push(currentToken);  // Store original token

      // Track brace depth to handle nested structures like ActionList=ACTIONS { ... }
      if (currentToken.type === TokenType.LeftBrace) {
        braceDepth++;
      } else if (currentToken.type === TokenType.RightBrace) {
        braceDepth--;
        // Safety: if depth goes negative, we've consumed too many closing braces
        // This means we've exited the property value and should stop
        if (braceDepth < 0) {
          const hasWhitespace = this.hasWhitespaceBetween(equalsToken, currentToken);
          if (!hasWhitespace) {
            // Truly empty/malformed: no tokens and no whitespace (e.g., ActionList=})
            this.recordError(`Empty or malformed value for property '${sanitizeContent(name)}'`, currentToken);
          }
          // Back up one token since we consumed the brace that closes the PROPERTIES section
          this.current--;
          // Restore this.braceDepth that was decremented by advance() when consuming the RightBrace
          // The backup undoes the token consumption, so we must also undo the braceDepth change
          // (advance() decrements this.braceDepth at line 3068)
          this.braceDepth++;
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

    const property: Property = {
      type: 'Property',
      name,
      value: value.trim(),
      valueTokens: valueTokens.length > 0 ? valueTokens : undefined,
      startToken,
      endToken
    };

    // Parse complex property values
    if (valueTokens.length > 0) {
      const lowerName = name.toLowerCase();

      if (lowerName === 'calcformula') {
        const pvp = new PropertyValueParser(valueTokens);
        property.calcFormula = pvp.parseCalcFormula() ?? undefined;
        for (const diag of pvp.getDiagnostics()) {
          this.recordError(diag.message, diag.token, 'parse-property-value');
        }
      } else if (lowerName === 'tablerelation') {
        const pvp = new PropertyValueParser(valueTokens);
        property.tableRelation = pvp.parseTableRelation() ?? undefined;
        for (const diag of pvp.getDiagnostics()) {
          this.recordError(diag.message, diag.token, 'parse-property-value');
        }
      }
    }

    return property;
  }

  /**
   * Parse FIELDS section
   */
  private parseFieldSection(): FieldSection {
    const startToken = this.consume(TokenType.Fields, 'Expected FIELDS');
    this.consumeSectionBrace('FIELDS', (t) => t === TokenType.Integer);

    const fields: FieldDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type)) {
      try {
        const field = this.parseField();
        fields.push(field);
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Recover by advancing to the next item's opening brace or section closing brace
          this.recoverToTokens([TokenType.LeftBrace, TokenType.RightBrace]);

          // Disambiguation: If we stopped at }, check if it's the item's } (followed by {)
          // or the section's } (end of section). Consume item's } to continue.
          if (this.check(TokenType.RightBrace) && this.peekAhead(1)?.type === TokenType.LeftBrace) {
            this.advance(); // Consume the item's closing }, next iteration will parse the item
          }
        } else {
          throw error;
        }
      }
    }

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      // Missing closing brace - record error but return the section
      this.recordError('Expected } to close FIELDS section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'FieldSection',
      fields,
      startToken,
      endToken
    };
  }

  private parseField(): FieldDeclaration {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected { to open field definition');

    // Field number
    const fieldNoToken = this.consume(TokenType.Integer, 'Expected field number');
    const fieldNo = this.parseInteger(fieldNoToken, 'field number in FIELDS section');

    this.consume(TokenType.Semicolon, 'Expected ; after field number');

    // Reserved column (always empty in NAV exports)
    // C/AL format: { FieldNo ; (reserved) ; FieldName ; DataType }
    // Note: FlowField/FlowFilter designation appears as FieldClass property, not in this column
    let fieldClass = '';
    if (!this.check(TokenType.Semicolon)) {
      const fieldClassToken = this.advance();
      fieldClass = fieldClassToken.value;
    }

    this.consume(TokenType.Semicolon, 'Expected ; after field class');

    // Field name (can be quoted or unquoted)
    // For unquoted names, read all tokens until semicolon to handle special chars like periods
    // Format: { FieldNo ; FieldClass ; FieldName ... ; DataType ; ... }
    let fieldName = '';
    let nameToken: Token | undefined;

    if (this.check(TokenType.QuotedIdentifier)) {
      // Quoted name - single token (e.g., "No.")
      nameToken = this.advance();
      fieldName = nameToken.value;
    } else {
      // Unquoted name - read everything between semicolons
      // This handles all special characters: periods, slashes, Unicode, etc.
      // Examples: No., Job No., Update Std. Gen. Jnl. Lines
      const startPos = this.peek();
      const nameParts: string[] = [];
      let lastEndOffset = -1;

      // Consume all tokens until we hit the next semicolon
      // Use offset-based accumulation to preserve original spacing
      while (!this.check(TokenType.Semicolon) && !this.isAtEnd()) {
        const token = this.advance();
        // Add space only if there was whitespace between tokens in source
        if (lastEndOffset !== -1 && token.startOffset > lastEndOffset) {
          nameParts.push(' ');
        }
        nameParts.push(token.value);
        lastEndOffset = token.endOffset;
      }

      // Join without adding extra spaces
      fieldName = nameParts.join('').trim();

      // Validate field name is not empty
      if (fieldName === '') {
        this.recordError('Field name cannot be empty (in FIELDS section)', startPos);
        fieldName = '<missing>'; // Placeholder for error recovery
        // Leave nameToken as undefined for error recovery
      } else {
        // Use first token of the multi-token name
        nameToken = startPos;
      }
    }

    this.consume(TokenType.Semicolon, 'Expected ; after field name');

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

    // Conditional closing brace check (issue #302)
    // When closing } is missing, record error but return partial item instead of throwing.
    // This allows the section loop to continue parsing subsequent items.
    // Note: When the missing } is on the last item, the section's closing } may be
    // consumed as the item's closing }. This produces a section-level error instead
    // of an item-level error, which is acceptable for LSP purposes (data completeness
    // matters more than error precision).
    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close field definition', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'FieldDeclaration',
      fieldNo,
      fieldClass,
      fieldName,
      nameToken,
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

      this.consume(TokenType.RightBracket, 'Expected ] after array dimensions');

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
      this.consume(TokenType.RightBracket, 'Expected ] after type length');
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
      const fullTypeSpec = quotedTypeToken.value; // e.g., 'mscorlib'.System.DateTime

      // Parse the value: 'assembly'.Type.Name
      // Assembly reference is between the first pair of single quotes
      // Support escaped quotes: 'O''Reilly' should match as O''Reilly
      const assemblyMatch = fullTypeSpec.match(/^'((?:[^']|'')+)'\./);

      if (!assemblyMatch) {
        this.recordError('Invalid DotNet type format, expected \'assembly\'.TypeName', this.peek());
        return {
          type: 'DataType',
          typeName: 'DotNet',
          startToken,
          endToken: this.previous()
        };
      }

      const assemblyReference = unescapeCalString(assemblyMatch[1]); // Extract assembly name and unescape doubled quotes
      const dotNetTypeName = unescapeCalString(fullTypeSpec.substring(assemblyMatch[0].length)); // Everything after 'assembly', unescape doubled quotes

      // Validate that type name is not empty
      if (!dotNetTypeName || dotNetTypeName.trim() === '') {
        this.recordError('Expected type name after assembly reference', quotedTypeToken);
        return {
          type: 'DataType',
          typeName: 'DotNet',
          assemblyReference,
          startToken,
          endToken: this.previous()
        };
      }

      return {
        type: 'DataType',
        typeName: 'DotNet',
        assemblyReference,
        dotNetTypeName,
        startToken,
        endToken: this.previous()
      };
    }

    // Handle Automation COM type reference
    // Format: Automation "{TypeLibGUID} Version:{ClassGUID}:'TypeLibName'.ClassName"
    // Example: Automation "{F935DC20-1CF0-11D0-ADB9-00C04FD58A0B} 1.0:{0D43FE01-F093-11CF-8940-00A0C9054228}:'Windows Script Host Object Model'.FileSystemObject"
    //
    // The lexer tokenizes the entire "{GUID} Ver:{GUID}:'TypeLib'.Class" as a single QuotedIdentifier token.
    // We need to parse its value to extract:
    // - Type Library GUID (in braces)
    // - Version (e.g., "1.0", "3.0")
    // - Class GUID (in braces)
    // - Type Library Name (in single quotes)
    // - Class Name (after the dot)
    if (typeName.toUpperCase() === 'AUTOMATION' && this.check(TokenType.QuotedIdentifier)) {
      const quotedTypeToken = this.advance();
      const fullTypeSpec = quotedTypeToken.value;

      // Parse: {TypeLibGUID} Version:{ClassGUID}:'TypeLibName'.ClassName
      // Regex captures: (1) TypeLibGUID, (2) Version, (3) ClassGUID, (4) TypeLibName, (5) ClassName
      // TypeLibName supports escaped quotes: 'O''Reilly' -> O'Reilly
      const automationMatch = fullTypeSpec.match(
        /^\{([^}]+)\}\s+([\d.]+):\{([^}]+)\}:'((?:[^']|'')+)'\.(.+)$/
      );

      if (!automationMatch) {
        this.recordError('Invalid Automation type format, expected "{TypeLibGUID} Version:{ClassGUID}:\'TypeLibName\'.ClassName"', quotedTypeToken);
        return {
          type: 'DataType',
          typeName: 'Automation',
          startToken,
          endToken: this.previous()
        };
      }

      return {
        type: 'DataType',
        typeName: 'Automation',
        automationTypeLibGuid: automationMatch[1],
        automationVersion: automationMatch[2],
        automationClassGuid: automationMatch[3],
        automationTypeLibName: unescapeCalString(automationMatch[4]), // Unescape doubled quotes
        automationClassName: automationMatch[5],
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
      // For STRING tokens representing option types, preserve the quotes in typeName
      // The lexer strips quotes, but we need them in the AST for display/round-tripping
      if (typeToken.type === TokenType.String) {
        typeName = `'${typeName}'`;
      }
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
   * Accumulate consecutive tokens that form a property name.
   * Property names can be multi-word (e.g., "SQL Data Type").
   *
   * Algorithm:
   * 1. If next token after current is EQUAL, return current token only (fast path)
   * 2. Otherwise, accumulate identifiers until EQUAL is found (max 5 tokens)
   * 3. Stop on: EQUAL, SEMICOLON, RIGHT_BRACE, section keywords
   *
   * @returns Object with accumulated name string and source location tokens
   */
  private accumulatePropertyName(): { name: string; startToken: Token; endToken: Token } {
    const MAX_PROPERTY_NAME_TOKENS = 5; // Covers "SQL Data Type" (3 words)

    const startToken = this.peek();
    const firstToken = this.advance();

    // Fast path: single-word property name (the common case ~99%)
    if (this.check(TokenType.Equal)) {
      return { name: firstToken.value, startToken, endToken: firstToken };
    }

    // Multi-word property name: accumulate tokens until = found
    let name = firstToken.value;
    let endToken = firstToken;
    let lookAhead = 0;

    while (lookAhead < MAX_PROPERTY_NAME_TOKENS - 1 && !this.isAtEnd()) {
      const current = this.peek();

      // Stop on property value separator
      if (current.type === TokenType.Equal) {
        break;
      }

      // Stop on property/section terminators
      if (current.type === TokenType.Semicolon ||
          current.type === TokenType.RightBrace) {
        break;
      }

      // Handle :: operator in trigger names (e.g., Import::OnBeforeInsertRecord)
      if (current.type === TokenType.DoubleColon) {
        name += current.value;  // No space before ::
        endToken = this.advance();
        lookAhead++;
      }
      // Accumulate identifier tokens (property name components)
      else if (current.type === TokenType.Identifier) {
        // Add space before identifier unless previous was ::
        if (!name.endsWith('::')) {
          name += ' ';
        }
        name += current.value;
        endToken = this.advance();
        lookAhead++;
      } else {
        // Non-identifier token - stop accumulating
        break;
      }
    }

    return {
      name,
      startToken,
      endToken
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

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.check(TokenType.LeftBrace)) {
      const result = this.parseWithRecovery(
        () => {
          const { name, startToken } = this.accumulatePropertyName();

          const equalsToken = this.consume(TokenType.Equal, 'Expected = after field property name');

          // Check if this is a trigger (starts with BEGIN or VAR) or regular property
          if (this.check(TokenType.Begin) || this.check(TokenType.Var)) {
            // This is a field trigger (OnValidate, OnLookup, etc.)
            return { type: 'trigger' as const, trigger: this.parseFieldTrigger(name, startToken) };
          }

          // Check if this is an ActionList property (value starts with ACTIONS {)
          if (name.toLowerCase() === 'actionlist' && this.check(TokenType.Actions) && this.isFollowedByLeftBrace()) {
            const actionSection = this.parseActionSection('control-property');
            if (this.check(TokenType.Semicolon)) this.advance();
            const property: Property = {
              type: 'Property' as const,
              name,
              value: 'ACTIONS {...}',
              actionSection,
              startToken,
              endToken: this.previous()
            };
            return { type: 'property' as const, property };
          }

          // Regular property - read value until semicolon, tracking bracket depth for arrays
          let value = '';
          let braceDepth = 0;
          let bracketDepth = 0;
          let lastToken: Token | null = null;
          const valueTokens: Token[] = [];  // Collect original tokens

          while (!this.isAtEnd()) {
            // Stop at semicolon only if not inside brackets or braces
            if (this.check(TokenType.Semicolon) && braceDepth === 0 && bracketDepth === 0) {
              break;
            }

            // Stop at right brace when not inside brackets or braces (end of field properties)
            // Only stop if we have some value content (prevents stopping on malformed ActionList=})
            if (this.check(TokenType.RightBrace) && braceDepth === 0 && bracketDepth === 0 && value.length > 0) {
              break;
            }

            // Stop at section keywords when at depth 0 and have value content
            // Only stop if the keyword is followed by '{' (indicating a section start)
            // This prevents stopping on keywords used in property values like CaptionML=ENU=Actions
            if (braceDepth === 0 && bracketDepth === 0 && value.length > 0 &&
                (this.check(TokenType.Actions) ||
                 this.check(TokenType.Controls) ||
                 this.check(TokenType.Elements) ||
                 this.check(TokenType.RequestForm))) {
              // Peek ahead to see if this keyword is followed by '{'
              if (this.isFollowedByLeftBrace()) {
                break;
              }
            }

            const currentToken = this.advance();
            valueTokens.push(currentToken);  // Store original token

            // Track brace depth for nested structures like ActionList=ACTIONS { ... }
            if (currentToken.type === TokenType.LeftBrace) {
              // If we see { at depth 0 and not after a container keyword, it likely starts a new item
              if (braceDepth === 0 && bracketDepth === 0) {
                // Check if the previous token was a keyword indicating nested structure
                const prevTokenType = lastToken?.type;
                const isNestedStructure =
                  prevTokenType === TokenType.Actions ||
                  prevTokenType === TokenType.Controls ||
                  prevTokenType === TokenType.Elements;

                if (!isNestedStructure) {
                  // This { likely starts a new item definition, stop parsing property value
                  // Put the { back by decrementing position
                  this.current--;
                  // Remove the { from valueTokens since we didn't consume it
                  valueTokens.pop();
                  break;
                }
              }
              braceDepth++;
            } else if (currentToken.type === TokenType.RightBrace) {
              braceDepth--;
              if (braceDepth < 0) {
                const hasWhitespace = this.hasWhitespaceBetween(equalsToken, currentToken);
                if (!hasWhitespace) {
                  // Truly empty/malformed: no tokens and no whitespace (e.g., ActionList=})
                  this.recordError(`Empty or malformed value for property '${sanitizeContent(name)}'`, currentToken);
                }
                // Back up token position
                this.current--;
                // Restore this.braceDepth (decremented by advance())
                this.braceDepth++;
                braceDepth = 0;
                break;
              }
            }

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

          const property: Property = {
            type: 'Property' as const,
            name,
            value: value.trim(),
            valueTokens: valueTokens.length > 0 ? valueTokens : undefined,
            startToken,
            endToken: this.previous()
          };

          // Parse complex property values
          if (valueTokens.length > 0) {
            const lowerName = name.toLowerCase();

            if (lowerName === 'calcformula') {
              const pvp = new PropertyValueParser(valueTokens);
              property.calcFormula = pvp.parseCalcFormula() ?? undefined;
              for (const diag of pvp.getDiagnostics()) {
                this.recordError(diag.message, diag.token, 'parse-property-value');
              }
            } else if (lowerName === 'tablerelation') {
              const pvp = new PropertyValueParser(valueTokens);
              property.tableRelation = pvp.parseTableRelation() ?? undefined;
              for (const diag of pvp.getDiagnostics()) {
                this.recordError(diag.message, diag.token, 'parse-property-value');
              }
            }
          }

          return {
            type: 'property' as const,
            property
          };
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
    this.consumeSectionBrace('KEYS', (t) => t === TokenType.Semicolon);

    const keys: KeyDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type)) {
      try {
        const key = this.parseKey();
        keys.push(key);
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Recover by advancing to the next item's opening brace or section closing brace
          this.recoverToTokens([TokenType.LeftBrace, TokenType.RightBrace]);

          // Disambiguation: If we stopped at }, check if it's the item's } (followed by {)
          // or the section's } (end of section). Consume item's } to continue.
          if (this.check(TokenType.RightBrace) && this.peekAhead(1)?.type === TokenType.LeftBrace) {
            this.advance(); // Consume the item's closing }, next iteration will parse the item
          }
        } else {
          throw error;
        }
      }
    }

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      // Missing closing brace - record error but return the section
      this.recordError('Expected } to close KEYS section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'KeySection',
      keys,
      startToken,
      endToken
    };
  }

  private parseKey(): KeyDeclaration {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected { to open key definition');

    // Column 1: Empty (skip until first semicolon)
    while (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      this.advance();
    }

    const fields: string[] = [];

    // Consume the semicolon separator (if present)
    if (this.check(TokenType.Semicolon)) {
      this.advance();

      // Column 2: Field list - comma-separated, accumulate tokens with spacing
      if (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace)) {
        let currentFieldTokens: string[] = [];
        let lastEndOffset = -1;

        while (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type) && !this.check(TokenType.LeftBrace)) {
          if (this.check(TokenType.Comma)) {
            // End of current field
            if (currentFieldTokens.length > 0) {
              fields.push(currentFieldTokens.join('').trim());
              currentFieldTokens = [];
            }
            this.advance(); // consume comma
            lastEndOffset = -1; // reset for next field
          } else {
            const token = this.advance();
            // Add space if there was whitespace between tokens
            if (lastEndOffset !== -1 && token.startOffset > lastEndOffset) {
              currentFieldTokens.push(' ');
            }
            currentFieldTokens.push(token.value);
            lastEndOffset = token.endOffset;
          }
        }

        // Don't forget last field
        if (currentFieldTokens.length > 0) {
          fields.push(currentFieldTokens.join('').trim());
        }
      }
    }

    // Skip any remaining content until }
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type) && !this.check(TokenType.LeftBrace)) {
      this.advance();
    }

    // Conditional closing brace check (issue #302)
    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close key definition', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

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
    this.consumeSectionBrace('FIELDGROUPS', (t) => t === TokenType.Integer);

    const fieldGroups: FieldGroup[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type)) {
      try {
        const fieldGroup = this.parseFieldGroup();
        fieldGroups.push(fieldGroup);
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Recover by advancing to the next item's opening brace or section closing brace
          this.recoverToTokens([TokenType.LeftBrace, TokenType.RightBrace]);

          // Disambiguation: If we stopped at }, check if it's the item's } (followed by {)
          // or the section's } (end of section). Consume item's } to continue.
          if (this.check(TokenType.RightBrace) && this.peekAhead(1)?.type === TokenType.LeftBrace) {
            this.advance(); // Consume the item's closing }, next iteration will parse the item
          }
        } else {
          throw error;
        }
      }
    }

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      // Missing closing brace - record error but return the section
      this.recordError('Expected } to close FIELDGROUPS section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'FieldGroupSection',
      fieldGroups,
      startToken,
      endToken
    };
  }

  private parseFieldGroup(): FieldGroup {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected { to open field group definition');

    // Column 1: ID (integer)
    const idToken = this.consume(TokenType.Integer, 'Expected field group ID');
    const id = this.parseInteger(idToken, 'field group ID');

    this.consume(TokenType.Semicolon, 'Expected ; after field group ID');

    // Column 2: Name (identifier, may be quoted)
    let name: string;
    if (this.check(TokenType.QuotedIdentifier)) {
      name = this.advance().value;
    } else {
      const nameToken = this.consume(TokenType.Identifier, 'Expected field group name');
      name = nameToken.value;
    }

    this.consume(TokenType.Semicolon, 'Expected ; after field group name');

    // Column 3: Field list - comma-separated, accumulate tokens with spacing
    const fields: string[] = [];

    // Handle empty field list explicitly
    if (!this.check(TokenType.RightBrace)) {
      let currentFieldTokens: string[] = [];
      let lastEndOffset = -1;

      while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type) && !this.check(TokenType.LeftBrace)) {
        if (this.check(TokenType.Comma)) {
          // End of current field
          if (currentFieldTokens.length > 0) {
            fields.push(currentFieldTokens.join('').trim());
            currentFieldTokens = [];
          }
          this.advance(); // consume comma
          lastEndOffset = -1; // reset for next field
        } else {
          const token = this.advance();
          // Add space if there was whitespace between tokens
          if (lastEndOffset !== -1 && token.startOffset > lastEndOffset) {
            currentFieldTokens.push(' ');
          }
          currentFieldTokens.push(token.value);
          lastEndOffset = token.endOffset;
        }
      }

      // Don't forget last field
      if (currentFieldTokens.length > 0) {
        fields.push(currentFieldTokens.join('').trim());
      }
    }

    // Conditional closing brace check (issue #302)
    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close field group definition', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'FieldGroup',
      id,
      name,
      fields,
      startToken,
      endToken
    };
  }

  /**
   * Parse an ACTIONS section (top-level or inline ActionList property).
   *
   * Note: Corpus analysis of 3,333 real NAV page exports found 0 instances
   * of top-level ACTIONS sections. All 1,772 pages with actions use inline
   * ActionList property values instead. The top-level path is kept for
   * completeness but may never be exercised in practice.
   */
  private parseActionSection(source: ActionSection['source']): ActionSection {
    const startToken = this.consume(TokenType.Actions, 'Expected ACTIONS');
    this.consumeSectionBrace('ACTIONS', (t) => t === TokenType.Integer);

    const flatActions = this.parseActionItems();

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close ACTIONS section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    const hierarchicalActions = this.buildActionHierarchy(flatActions);
    return { type: 'ActionSection', actions: hierarchicalActions, source, startToken, endToken };
  }

  /**
   * Parse action items - used by both top-level ACTIONS and inline ActionList properties
   */
  private parseActionItems(): ActionDeclaration[] {
    const flatActions: ActionDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type)) {
      try {
        const action = this.parseActionItem();
        flatActions.push(action);
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Recover by advancing to the next item's opening brace or section closing brace
          this.recoverToTokens([TokenType.LeftBrace, TokenType.RightBrace]);

          // Disambiguation: If we stopped at }, check if it's the item's } (followed by {)
          // or the section's } (end of section). Consume item's } to continue.
          if (this.check(TokenType.RightBrace) && this.peekAhead(1)?.type === TokenType.LeftBrace) {
            this.advance(); // Consume the item's closing }, next iteration will parse the item
          }
        } else {
          throw error;
        }
      }
    }

    return flatActions;
  }

  private parseActionItem(): ActionDeclaration {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected { to open action definition');

    // Column 1: Action ID
    const idToken = this.consume(TokenType.Integer, 'Expected action ID');
    const id = this.parseInteger(idToken, 'action ID');
    this.consume(TokenType.Semicolon, 'Expected ; after action ID');

    // Column 2: Indent Level (can be empty - whitespace between semicolons)
    let indentLevel = 0;
    if (!this.check(TokenType.Semicolon) && !this.isAtEnd()) {
      const indentToken = this.consume(TokenType.Integer, 'Expected indent level');
      indentLevel = this.parseInteger(indentToken, 'indent level');
    }
    this.consume(TokenType.Semicolon, 'Expected ; after indent level');

    // Column 3: Action Type
    const { actionType, rawActionType, typeToken } = this.parseActionType();

    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    // Properties and Triggers
    let properties: PropertySection | null = null;
    let triggers: TriggerDeclaration[] | null = null;

    if (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const propsStartToken = this.peek();
      const result = this.parseFieldProperties();

      if (result.properties.length > 0) {
        properties = {
          type: 'PropertySection',
          properties: result.properties,
          startToken: propsStartToken,
          endToken: this.previous()
        };
      }

      if (result.triggers.length > 0) {
        triggers = result.triggers;
      }
    }

    // Conditional closing brace check (issue #302)
    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close action definition', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'ActionDeclaration',
      id,
      indentLevel,
      actionType,
      actionTypeToken: typeToken,
      rawActionType,
      properties,
      triggers,
      children: [],
      startToken,
      endToken
    };
  }

  private parseActionType(): { actionType: ActionType; rawActionType?: string; typeToken?: Token } {
    if (this.check(TokenType.Semicolon) || this.check(TokenType.RightBrace)) {
      this.recordError('Missing action type, defaulting to Action', this.peek());
      return { actionType: 'Action', typeToken: undefined };
    }

    const typeToken = this.advance();
    const rawValue = typeToken.value;

    const typeMap: Record<string, ActionType> = {
      'actioncontainer': 'ActionContainer',
      'actiongroup': 'ActionGroup',
      'action': 'Action',
      'separator': 'Separator'
    };

    const normalizedType = typeMap[rawValue.toLowerCase()];

    if (normalizedType) {
      return { actionType: normalizedType, typeToken };
    }

    this.recordError(`Unknown action type '${rawValue}', treating as Action`, typeToken);
    return { actionType: 'Action', rawActionType: rawValue, typeToken };
  }

  private buildActionHierarchy(flatActions: ActionDeclaration[]): ActionDeclaration[] {
    if (flatActions.length === 0) {
      return [];
    }

    const stack: Array<{ indent: number; action: ActionDeclaration }> = [];
    const roots: ActionDeclaration[] = [];

    for (const action of flatActions) {
      let indent = action.indentLevel;

      if (indent < 0) {
        this.recordError(
          `Invalid negative indent level ${indent}, treating as 0`,
          action.startToken
        );
        indent = 0;
        action.indentLevel = 0;
      }

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        roots.push(action);
      } else {
        stack[stack.length - 1].action.children.push(action);
      }

      stack.push({ indent, action });
    }

    return roots;
  }

  /**
   * Parse CONTROLS section
   */
  private parseControlSection(): ControlSection {
    const startToken = this.consume(TokenType.Controls, 'Expected CONTROLS');
    this.consumeSectionBrace('CONTROLS', (t) => t === TokenType.Integer);

    const flatControls: ControlDeclaration[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type) && !this.check(TokenType.Code)) {
      try {
        const control = this.parseControlItem();
        flatControls.push(control);
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Recover by advancing to the next item's opening brace or section closing brace
          this.recoverToTokens([TokenType.LeftBrace, TokenType.RightBrace]);

          // Disambiguation: If we stopped at }, check if it's the item's } (followed by {)
          // or the section's } (end of section). Consume item's } to continue.
          if (this.check(TokenType.RightBrace) && this.peekAhead(1)?.type === TokenType.LeftBrace) {
            this.advance(); // Consume the item's closing }, next iteration will parse the item
          }
        } else {
          throw error;
        }
      }
    }

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      // Missing closing brace - record error but return the section
      this.recordError('Expected } to close CONTROLS section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    const hierarchicalControls = this.buildControlHierarchy(flatControls);

    return {
      type: 'ControlSection',
      controls: hierarchicalControls,
      startToken,
      endToken
    };
  }

  private parseControlItem(): ControlDeclaration {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected { to open control definition');

    // Column 1: Control ID
    const idToken = this.consume(TokenType.Integer, 'Expected control ID');
    const id = this.parseInteger(idToken, 'control ID');
    this.consume(TokenType.Semicolon, 'Expected ; after control ID');

    // Column 2: Indent Level (can be empty - whitespace between semicolons)
    let indentLevel = 0;
    if (!this.check(TokenType.Semicolon) && !this.isAtEnd()) {
      const indentToken = this.consume(TokenType.Integer, 'Expected indent level');
      indentLevel = this.parseInteger(indentToken, 'indent level');
    }
    this.consume(TokenType.Semicolon, 'Expected ; after indent level');

    // Column 3: Control Type
    const { controlType, rawControlType } = this.parseControlType();

    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    // Properties and Triggers
    let properties: PropertySection | null = null;
    let triggers: TriggerDeclaration[] | null = null;

    if (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const propsStartToken = this.peek();
      const result = this.parseFieldProperties();

      if (result.properties.length > 0) {
        properties = {
          type: 'PropertySection',
          properties: result.properties,
          startToken: propsStartToken,
          endToken: this.previous()
        };
      }

      if (result.triggers.length > 0) {
        triggers = result.triggers;
      }
    }

    // Conditional closing brace check (issue #302)
    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close control definition', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'ControlDeclaration',
      id,
      indentLevel,
      controlType,
      rawControlType,
      properties,
      triggers,
      children: [],
      startToken,
      endToken
    };
  }

  private parseControlType(): { controlType: ControlType; rawControlType?: string } {
    if (this.check(TokenType.Semicolon) || this.check(TokenType.RightBrace)) {
      this.recordError('Missing control type, defaulting to Field', this.peek());
      return { controlType: 'Field' };
    }

    const typeToken = this.advance();
    const rawValue = typeToken.value;

    const typeMap: Record<string, ControlType> = {
      'container': 'Container',
      'group': 'Group',
      'field': 'Field',
      'part': 'Part',
      'separator': 'Separator',
      'action': 'Action',
      'actioncontainer': 'ActionContainer',
      'actiongroup': 'ActionGroup'
    };

    const normalizedType = typeMap[rawValue.toLowerCase()];

    if (normalizedType) {
      return { controlType: normalizedType };
    }

    this.recordError(`Unknown control type '${rawValue}', treating as Field`, typeToken);
    return { controlType: 'Field', rawControlType: rawValue };
  }

  private buildControlHierarchy(flatControls: ControlDeclaration[]): ControlDeclaration[] {
    if (flatControls.length === 0) {
      return [];
    }

    const stack: Array<{ indent: number; control: ControlDeclaration }> = [];
    const roots: ControlDeclaration[] = [];

    for (const control of flatControls) {
      let indent = control.indentLevel;

      if (indent < 0) {
        this.recordError(
          `Invalid negative indent level ${indent}, treating as 0`,
          control.startToken
        );
        indent = 0;
        control.indentLevel = 0;
      }

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        roots.push(control);
      } else {
        stack[stack.length - 1].control.children.push(control);
      }

      stack.push({ indent, control });
    }

    return roots;
  }

  /**
   * Parse ELEMENTS section (XMLport only)
   *
   * IMPORTANT: This method uses custom element-local depth tracking for error
   * recovery instead of parseWithRecovery(). This is intentional and necessary.
   *
   * XMLport elements have a unique nested brace structure:
   * ```
   * ELEMENTS
   * {
   *   { [{GUID-1}]; name1; ... }    <- Element 1
   *   { [{GUID-2}]; name2; ... }    <- Element 2
   * }
   * ```
   *
   * The GUID uses braces: `[{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}]`
   * This creates nested braces within each element.
   *
   * Why parseWithRecovery() fails:
   * - parseWithRecovery() recovers by scanning for RightBrace tokens
   * - On malformed input, it would stop at the GUID's inner `}`
   *   instead of the element's closing `}`
   * - This corrupts parsing state and causes cascade failures
   *
   * Example failure scenario:
   * ```
   * { [{GUID}]; MALFORMED_CONTENT }
   *           ^-- parseWithRecovery stops here (wrong!)
   *                                           ^-- correct stop point
   * ```
   *
   * Why this.braceDepth is unreliable:
   * - Malformed GUIDs like `{12345-{1234...}` contain unbalanced braces
   * - These corrupt this.braceDepth DURING parsing, BEFORE recovery starts
   * - By the time we reach the catch block, this.braceDepth cannot be trusted
   * - Issue #273 documents this problem and the element-local solution
   *
   * Element-local depth tracking (the fix):
   * - Track depth locally from recovery start (recoveryDepth = 0)
   * - Increment for { tokens, decrement for } tokens
   * - When recoveryDepth goes negative, we've exited the element
   * - Section keyword escape hatch: stop if we hit FIELDS/KEYS/etc. at depth 0
   *
   * Section keyword escape hatch details:
   * - Uses isSectionKeyword() to correctly identify section keywords
   * - Handles CODE/CONTROLS which require lookahead for '{' to distinguish
   *   from identifier usage ("Code" field names, "Code[20]" data types)
   * - Only triggers at recoveryDepth === 1 (inside element body, not nested deeper)
   *   to detect if we've overrun into a following section
   *
   * Design decision documented in issues #270 and #273. Recovery vs normal path
   * asymmetry explained in issues #296 and #306. See also synchronize() for the
   * global error recovery strategy.
   *
   * @see synchronize() - global recovery, different purpose
   * @see parseWithRecovery() - standard pattern, not suitable here
   * @see isSectionKeyword() - handles CODE/CONTROLS lookahead correctly
   * @see https://github.com/klauskaan/C-AL-Language/issues/270
   * @see https://github.com/klauskaan/C-AL-Language/issues/273
   * @see https://github.com/klauskaan/C-AL-Language/issues/296
   * @see https://github.com/klauskaan/C-AL-Language/issues/306
   */
  private parseElementsSection(): ElementsSection {
    const startToken = this.consume(TokenType.Elements, 'Expected ELEMENTS');
    this.consume(TokenType.LeftBrace, 'Expected { to open ELEMENTS section');

    const flatElements: XMLportElement[] = [];

    // Note: Parsing uses both isSectionKeyword() lookahead AND explicit CODE/CONTROLS checks
    // to handle malformed code where braces are missing.
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd() && !this.isSectionKeyword(this.peek().type) && !this.check(TokenType.Code) && !this.check(TokenType.Controls)) {
      try {
        const element = this.parseXMLportElement();
        if (element) {
          flatElements.push(element);
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Custom depth-aware recovery using element-local depth tracking.
          //
          // WHY NOT use this.braceDepth?
          // Malformed GUIDs containing unbalanced braces (e.g., {12345-{1234...})
          // corrupt this.braceDepth during parsing BEFORE recovery starts.
          // By the time we reach the catch block, this.braceDepth is unreliable.
          //
          // STRATEGY:
          // 1. Start recoveryDepth = 1 because parseXMLportElement() has already consumed the opening {
          // 2. Scan for closing } of the element, skipping to next element when found
          // 3. Section keyword escape hatch prevents consuming next section
          //
          // WHY RECOVERY NEEDS SECTION-BOUNDARY CHECKS BUT NORMAL PARSING DOESN'T:
          //
          // Normal path (the while loop condition in parseElementsSection):
          //   The loop condition checks for RightBrace, section keywords, and CODE/CONTROLS
          //   BEFORE attempting to parse each element. When we hit the ELEMENTS section's
          //   closing brace or a section keyword, the loop exits cleanly without ever
          //   entering parseXMLportElement() in an invalid state.
          //
          // Recovery path (this block):
          //   We're mid-recovery after a parse error. The loop condition already passed
          //   (we were inside an element), but the element was malformed. We must now
          //   scan forward through tokens, but we don't know if the next } we find:
          //     a) Closes the broken element (consume it), OR
          //     b) Closes the ELEMENTS section (don't consume - let caller handle)
          //
          //   The section-boundary check (when recoveryDepth reaches 0 after decrement)
          //   resolves this ambiguity by examining what follows the }. If it's a section
          //   keyword or EOF, the brace closes the section, not the element.
          //
          // See issues #296 (original bug) and #306 (this documentation).

          let recoveryDepth = 1; // We're inside the element (opened brace already consumed)
          let foundElementClose = false;

          while (!this.isAtEnd() && !foundElementClose) {
            const peekType = this.peek().type;

            // Section keyword escape hatch: stop if we hit a section keyword
            // This prevents recovery from consuming CODE, PROPERTIES, etc.
            if (recoveryDepth === 1 && (this.isSectionKeyword(peekType) || peekType === TokenType.Code)) {
              break;
            }

            // Track brace depth
            if (peekType === TokenType.LeftBrace) {
              recoveryDepth++;
            } else if (peekType === TokenType.RightBrace) {
              recoveryDepth--;
              if (recoveryDepth === 0) {
                // SECTION-BOUNDARY CHECK (see "WHY RECOVERY NEEDS..." comment above)
                //
                // Before consuming the closing brace, check if it closes the element or the section.
                // If the next token after this brace is a section keyword or EOF, this brace
                // closes the ELEMENTS section, not the element. Don't consume it.
                const nextToken = this.peekAhead(1);
                let isSectionEnd = !nextToken || nextToken.type === TokenType.EOF;

                // For CODE/CONTROLS, check if they're followed by {
                if (!isSectionEnd && nextToken && (nextToken.type === TokenType.Code || nextToken.type === TokenType.Controls)) {
                  const tokenAfterCodeControl = this.peekAhead(2);
                  isSectionEnd = tokenAfterCodeControl?.type === TokenType.LeftBrace;
                }

                // For other keywords, check if they're in SECTION_KEYWORDS
                if (!isSectionEnd && nextToken) {
                  isSectionEnd = SECTION_KEYWORDS.has(nextToken.type);
                }

                if (isSectionEnd) {
                  // This brace closes the ELEMENTS section, not the element.
                  // Stop recovery without consuming it.
                  foundElementClose = true;
                  break;
                }

                // This brace closes the element - consume it and exit recovery
                this.advance();
                foundElementClose = true;
                break;
              }
            }

            this.advance();
          }

          // If we exited the loop without finding the element close, we hit a section keyword
          // or EOF. Just continue - don't consume any more tokens.
        } else {
          throw error;
        }
      }
    }

    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      // Missing closing brace - record error but return the section
      this.recordError('Expected } to close ELEMENTS section', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    const hierarchicalElements = this.buildElementHierarchy(flatElements);

    return {
      type: 'ElementsSection',
      elements: hierarchicalElements,
      startToken,
      endToken
    };
  }

  /**
   * Parse a single XMLport element.
   *
   * Element structure with nested braces:
   * ```
   * { [{GUID}]; IndentLevel; Name; NodeType; SourceType; [Properties] }
   *   ^------^
   *   Nested braces - this is why parseElementsSection needs
   *   custom depth-aware recovery instead of parseWithRecovery()
   * ```
   */
  private parseXMLportElement(): XMLportElement {
    const startToken = this.consume(TokenType.LeftBrace, 'Expected { to open element definition');

    // Parse GUID: [{GUID-VALUE}]
    this.consume(TokenType.LeftBracket, 'Expected [ for GUID');
    this.consume(TokenType.LeftBrace, 'Expected { in GUID');

    let guid = '';
    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      guid += this.advance().value;
    }

    // Check for unbalanced braces - if GUID contains {, it must also contain }
    const openBraces = (guid.match(/\{/g) || []).length;
    const closeBraces = (guid.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      this.recordError(
        `Malformed GUID: unbalanced braces (${openBraces} '{' vs ${closeBraces} '}')`,
        this.peek()
      );
    }

    this.consume(TokenType.RightBrace, 'Expected } in GUID');
    this.consume(TokenType.RightBracket, 'Expected ] after GUID');
    this.consume(TokenType.Semicolon, 'Expected ; after GUID');

    // Parse indent level (may be empty, treat as 0)
    let indentLevel = 0;
    if (this.check(TokenType.Integer)) {
      indentLevel = this.parseInteger(this.advance(), 'indent level');
    }
    this.consume(TokenType.Semicolon, 'Expected ; after indent level');

    // Parse element name - accumulate tokens until next semicolon (handles names like "Country/Region Code")
    let name = '';
    let lastToken: Token | null = null;
    while (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const token = this.advance();
      // Preserve whitespace between tokens based on source positions
      if (lastToken !== null && token.startOffset > lastToken.endOffset) {
        name += ' ';
      }
      name += token.value;
      lastToken = token;
    }
    name = name.trim();  // Remove leading/trailing whitespace
    this.consume(TokenType.Semicolon, 'Expected ; after element name');

    // Parse node type (Element or Attribute) - accumulate until semicolon or right brace
    let nodeTypeStr = '';
    lastToken = null;
    while (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const token = this.advance();
      if (lastToken !== null && token.startOffset > lastToken.endOffset) {
        nodeTypeStr += ' ';
      }
      nodeTypeStr += token.value;
      lastToken = token;
    }
    nodeTypeStr = nodeTypeStr.trim();
    const nodeType = this.normalizeXMLportNodeType(nodeTypeStr);
    this.consume(TokenType.Semicolon, 'Expected ; after node type');

    // Parse source type (Text, Table, or Field) - just ONE token expected
    // If next token is Semicolon or RightBrace, sourceType is empty
    let sourceTypeStr = '';
    let sourceTypeStartToken: Token | null = null;
    if (!this.check(TokenType.Semicolon) && !this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const token = this.advance();
      sourceTypeStartToken = token;
      sourceTypeStr = token.value;
      // Check if the next token is "=" which indicates this is a property, not a source type
      if (this.check(TokenType.Equal)) {
        // This was actually a property, not a source type - we parsed it by mistake
        // Don't consume the "=", just treat sourceType as empty
        this.current--;  // Back up to before the token we just consumed
        sourceTypeStr = '';
      }
    }
    sourceTypeStr = sourceTypeStr.trim();

    // Validate that source type is a single valid token (no extra content)
    const sourceTypeTokens = sourceTypeStr.split(/\s+/);
    if (sourceTypeTokens.length > 1) {
      const invalidPart = sourceTypeTokens.slice(1).join(' ');
      throw this.createParseError(
        `Invalid content in source type: '${invalidPart}' (XMLport source type must be Text, Table, or Field)`,
        lastToken || sourceTypeStartToken || this.previous()
      );
    }

    // Validate that source type is one of the valid values
    const normalized = sourceTypeStr.toLowerCase();
    if (normalized !== 'text' && normalized !== 'table' && normalized !== 'field' && sourceTypeStr !== '') {
      throw this.createParseError(
        `Invalid source type '${sourceTypeStr}' (must be Text, Table, or Field)`,
        lastToken || sourceTypeStartToken || this.previous()
      );
    }

    const sourceType = this.normalizeXMLportSourceType(sourceTypeStr);

    // Optional semicolon after source type (present if there are properties/triggers)
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    // Parse properties and triggers
    let properties: PropertySection | null = null;
    let triggers: TriggerDeclaration[] | null = null;

    if (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const propsStartToken = this.peek();
      const result = this.parseFieldProperties();

      if (result.properties.length > 0) {
        properties = {
          type: 'PropertySection',
          properties: result.properties,
          startToken: propsStartToken,
          endToken: this.previous()
        };
      }

      if (result.triggers.length > 0) {
        triggers = result.triggers;
      }
    }

    // Conditional closing brace check (issue #302)
    let endToken: Token;
    if (this.check(TokenType.RightBrace)) {
      endToken = this.advance();
    } else {
      this.recordError('Expected } to close element definition', undefined, 'parse-unclosed-block');
      endToken = this.previous();
    }

    return {
      type: 'XMLportElement',
      guid,
      indentLevel,
      name,
      nodeType,
      sourceType,
      properties,
      triggers,
      children: [],  // Will be populated by buildElementHierarchy
      startToken,
      endToken
    };
  }

  /**
   * Normalize XMLport node type to proper case, defaulting to 'Element' for unknown values
   */
  private normalizeXMLportNodeType(value: string): XMLportNodeType {
    const normalized = value.toLowerCase();
    if (normalized === 'element') return 'Element';
    if (normalized === 'attribute') return 'Attribute';
    // Default to Element if unknown
    return 'Element';
  }

  /**
   * Normalize XMLport source type to proper case, defaulting to 'Text' for unknown values
   */
  private normalizeXMLportSourceType(value: string): XMLportSourceType {
    const normalized = value.toLowerCase();
    if (normalized === 'text') return 'Text';
    if (normalized === 'table') return 'Table';
    if (normalized === 'field') return 'Field';
    // Default to Text if unknown
    return 'Text';
  }

  private buildElementHierarchy(flatElements: XMLportElement[]): XMLportElement[] {
    if (flatElements.length === 0) {
      return [];
    }

    const roots: XMLportElement[] = [];
    const stack: XMLportElement[] = [];

    for (const element of flatElements) {
      // Validate indent level
      if (element.indentLevel < 0) {
        this.recordError(
          `Invalid negative indent level ${element.indentLevel}, treating as 0`,
          element.startToken
        );
        element.indentLevel = 0;
      }

      // Pop stack until we find a valid parent (indent < current)
      while (stack.length > 0 && stack[stack.length - 1].indentLevel >= element.indentLevel) {
        stack.pop();
      }

      if (stack.length === 0) {
        // No parent - this is a root element
        roots.push(element);
      } else {
        // Add as child of the element at top of stack
        const parent = stack[stack.length - 1];
        parent.children.push(element);
      }

      // Push current element onto stack for potential children
      stack.push(element);
    }

    return roots;
  }

  /**
   * Parse CODE section
   */
  private parseCodeSection(): CodeSection {
    const startToken = this.consume(TokenType.Code, 'Expected CODE');

    // Consume opening brace of CODE section (if present)
    if (this.check(TokenType.LeftBrace)) {
      this.advance();
    } else {
      // Missing opening brace - record error but continue parsing
      this.recordError('Expected { to open CODE section', undefined, 'parse-unclosed-block');
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
      const attributes: ProcedureAttribute[] = [];
      let firstLeftBracket: Token | null = null;
      let attributeAttempts = 0;  // Count [ tokens seen, including malformed attributes
      try {
        // Check for AL-only tokens before procedure/trigger declarations
        this.skipALOnlyTokens();

        // Parse attributes like [External], [Integration], [TryFunction], [EventSubscriber], etc.
        // C/AL LIMITATION: Attributes are only supported on PROCEDURE declarations.
        // If attributes appear before TRIGGER or EVENT declarations, they are warned and ignored.
        // See warnIgnoredAttributes() for the warning logic.
        while (this.check(TokenType.LeftBracket)) {
          if (firstLeftBracket === null) {
            firstLeftBracket = this.peek();
          }
          attributeAttempts++;  // Count each [ token seen
          const attr = this.parseAttribute();
          if (attr !== null) {
            attributes.push(attr);
          }
          // If parseAttribute() returned null, it already handled recovery
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
          procedures.push(this.parseProcedure(isLocal, attributes));
        } else if (this.check(TokenType.Trigger)) {
          if (firstLeftBracket !== null) {
            this.warnIgnoredAttributes(attributeAttempts, firstLeftBracket);
          }
          triggers.push(this.parseTrigger());
        } else if (this.check(TokenType.Event)) {
          if (firstLeftBracket !== null) {
            this.warnIgnoredAttributes(attributeAttempts, firstLeftBracket);
          }
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
          // Warn if attributes were parsed but will be discarded
          if (firstLeftBracket !== null) {
            // Use attributeAttempts to count all [ tokens seen (including malformed)
            const count = attributeAttempts;
            const token = attributes.length > 0 ? attributes[0].startToken : firstLeftBracket;
            this.recordError(
              `${count} ${count === 1 ? 'attribute' : 'attributes'} discarded due to invalid declaration`,
              token
            );
          }
          // Skip to next procedure/trigger/event declaration
          // Note: BEGIN is intentionally NOT a stopping token here - if we're
          // recovering from "PROCEDURE BEGIN" (invalid), we need to skip past
          // the BEGIN to find the next real procedure declaration.
          // Stop at '}' by value (not just RightBrace type) because lexer context
          // confusion from malformed input can tokenize '}' as UNKNOWN.
          while (!PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type) &&
                 this.peek().value !== '}' &&
                 !this.isAtEnd()) {
            this.advance();
          }
        } else {
          throw error;
        }
      }
    }

    // Skip documentation trigger if present (BEGIN...END.)
    if (this.check(TokenType.Begin)) {
      this.advance(); // consume BEGIN

      // Skip tokens until END is found
      while (!this.check(TokenType.End) && !this.isAtEnd()) {
        this.advance();
      }

      if (this.check(TokenType.End)) {
        this.advance(); // consume END
      }

      // Consume trailing dot if present
      if (this.check(TokenType.Dot)) {
        this.advance();
      }
    }

    // Consume closing brace of CODE section
    // Note: '}' may be tokenized as UNKNOWN (not RightBrace) when lexer context
    // is confused by malformed input (e.g., PROCEDURE BEGIN; causes lexer to enter
    // CODE_BLOCK where braces are comment delimiters). Also, error recovery may
    // leave unconsumed tokens before the closing brace. Check by value as fallback.
    let endToken: Token;
    if (this.check(TokenType.RightBrace) || this.peek().value === '}') {
      endToken = this.advance();
    } else {
      // Skip past unconsumed tokens to find closing brace
      while (!this.isAtEnd() && !this.check(TokenType.RightBrace) && this.peek().value !== '}') {
        this.advance();
      }
      if (!this.isAtEnd() && (this.check(TokenType.RightBrace) || this.peek().value === '}')) {
        endToken = this.advance();
      } else {
        // Genuinely missing closing brace
        this.recordError('Expected } to close CODE section', undefined, 'parse-unclosed-block');
        endToken = this.previous();
      }
    }

    return {
      type: 'CodeSection',
      variables,
      procedures,
      triggers,
      events,
      startToken,
      endToken
    };
  }

  /**
   * Parse procedure attribute (e.g., [External], [Scope('OnPrem')], [EventSubscriber(...)])
   * Returns null if no attribute found or if malformed and recovery failed.
   */
  private parseAttribute(): ProcedureAttribute | null {
    if (!this.check(TokenType.LeftBracket)) {
      return null;
    }

    const startToken = this.advance(); // consume [

    // Check for empty attribute
    if (this.check(TokenType.RightBracket)) {
      this.recordError('Empty attribute');
      this.advance(); // consume ]
      return null;
    }

    // Capture attribute name (first identifier after [)
    if (!this.canBeUsedAsIdentifier()) {
      this.recordError('Expected attribute name after [');
      return this.recoverFromMalformedAttribute();
    }

    const nameToken = this.advance();
    const name = nameToken.value;

    // Track whether we have arguments and collect all tokens
    let hasArguments = false;
    const rawTokens: Token[] = [];

    // Check for opening parenthesis
    if (this.check(TokenType.LeftParen)) {
      hasArguments = true;
      let parenDepth = 0;

      // Capture all tokens until matching closing paren
      while (!this.isAtEnd()) {
        const token = this.peek();

        if (token.type === TokenType.LeftParen) {
          parenDepth++;
          rawTokens.push(this.advance());
        } else if (token.type === TokenType.RightParen) {
          rawTokens.push(this.advance());
          parenDepth--;
          if (parenDepth === 0) {
            break;
          }
        } else if (token.type === TokenType.RightBracket && parenDepth === 0) {
          // Hit closing bracket before closing paren - malformed
          this.recordError('Unclosed parenthesis in attribute', undefined, 'parse-unclosed-block');
          return this.recoverFromMalformedAttribute();
        } else {
          rawTokens.push(this.advance());
        }
      }

      // Check if we exited due to EOF with unclosed parens
      if (parenDepth > 0) {
        this.recordError('Unclosed parenthesis in attribute', undefined, 'parse-unclosed-block');
        return this.recoverFromMalformedAttribute();
      }
    }

    // Expect closing bracket
    if (!this.check(TokenType.RightBracket)) {
      this.recordError('Expected ] to close attribute', undefined, 'parse-unclosed-block');
      return this.recoverFromMalformedAttribute();
    }

    const endToken = this.advance(); // consume ]

    return {
      type: 'ProcedureAttribute',
      name,
      nameToken,
      rawTokens,
      hasArguments,
      startToken,
      endToken
    };
  }

  /**
   * Recover from malformed attribute by skipping to closing ] or next statement keyword.
   * Returns null to indicate attribute parsing failed.
   */
  private recoverFromMalformedAttribute(): null {
    // Skip to closing ] or next statement keyword
    while (!this.isAtEnd()) {
      if (this.check(TokenType.RightBracket)) {
        this.advance(); // consume ]
        break;
      }
      if (this.check(TokenType.Procedure) || this.check(TokenType.Function) ||
          this.check(TokenType.Local) || this.check(TokenType.Begin)) {
        // Stop at procedure/function keywords
        break;
      }
      this.advance();
    }
    return null;
  }

  /**
   * Parse variable declarations section (VAR keyword and variable list)
   * Handles TEMPORARY keyword and @number auto-numbering syntax
   * @param variables - Array to populate with parsed variable declarations
   */
  private parseVariableDeclarations(variables: VariableDeclaration[]): void {
    this.consume(TokenType.Var, 'Expected VAR');

    while (!this.isAtEnd()) {
      // Skip stray semicolons (empty VAR block artifacts from NAV exports)
      // This handles patterns like "VAR ; BEGIN" or "VAR ;;; x : Integer;"
      if (this.check(TokenType.Semicolon)) {
        this.advance();
        continue;
      }

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

        this.consume(TokenType.Colon, 'Expected : after variable name in variable declaration');

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

        this.consumeExpected(TokenType.Semicolon, 'Expected ; after variable declaration');

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
          this.recordError(`Cannot use reserved keyword '${sanitizeContent(token.value)}' as variable name`, token);

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

  private parseProcedure(isLocal: boolean = false, attributes: ProcedureAttribute[] = []): ProcedureDeclaration {
    const startToken = this.advance(); // PROCEDURE or FUNCTION

    const { name, nameToken } = this.parseProcedureName();

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
      try {
        const block = this.parseBlock();
        body.push(...block.statements);
      } catch (error) {
        if (error instanceof ParseError) {
          // parseBlock threw because it couldn't find END (probably hit procedure boundary)
          // Record the error but continue - we still want to create the procedure
          this.errors.push(error);

          // If we're at a procedure boundary, don't try to recover further
          // The outer parseCodeSection will handle finding the next procedure
          if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
            // Just return what we have so far
            const proc: ProcedureDeclaration = {
              type: 'ProcedureDeclaration',
              name,
              nameToken,
              parameters,
              returnType,
              isLocal,
              variables,
              body,
              startToken,
              endToken: this.previous()
            };
            if (attributes.length > 0) {
              proc.attributes = attributes;
            }
            return proc;
          }

          // Otherwise, re-throw to let outer catch handle it
          throw error;
        } else {
          throw error;
        }
      }
    }

    // Skip semicolon after END
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    const proc: ProcedureDeclaration = {
      type: 'ProcedureDeclaration',
      name,
      nameToken,
      parameters,
      returnType,
      isLocal,
      variables,
      body,
      startToken,
      endToken: this.previous()
    };

    // Add attributes only if there are any (keeps undefined for procedures without attributes)
    if (attributes.length > 0) {
      proc.attributes = attributes;
    }

    return proc;
  }

  /**
   * Parse procedure/function name, handling @number syntax for C/AL auto-numbering
   */
  private parseProcedureName(): { name: string; nameToken: Token } {
    // Validate BEFORE advancing - cannot use structural keywords as procedure names
    if (!this.canBeUsedAsIdentifier()) {
      throw this.createParseError(
        `Expected procedure name, found '${sanitizeContent(this.peek().value)}'`,
        this.peek()
      );
    }

    const nameToken = this.advance();
    const name = nameToken.value;

    // Skip @number if present (C/AL auto-numbering)
    this.skipAutoNumberSuffix();

    return { name, nameToken };
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
        // Check if we've hit a definite end-of-parameter-list token
        if (this.check(TokenType.Begin) || this.check(TokenType.Var) || this.check(TokenType.Procedure)) {
          this.recordError(`Expected ) in parameter list (missing closing parenthesis)`, this.peek());
        } else {
          this.recordError(`Unexpected token '${sanitizeContent(this.peek().value)}' in parameter list (expected ';' or ')')`, this.peek());
        }
        this.advance();
      }
    }

    this.consumeExpected(TokenType.RightParen, 'Expected ) after parameter list');

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
    this.consume(TokenType.DoubleColon, 'Expected :: between subscriber and event name');

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
      this.recordError(`Expected identifier for event name, found '${sanitizeContent(this.peek().value)}'`, this.peek());
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
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt);
        }
        // Check if we've hit a procedure boundary after successfully parsing a statement
        // This handles cases where a statement parser (e.g., parseCaseStatement) detected
        // an error and returned a partial node but didn't throw
        if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
          break;
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Use depth-aware recovery instead of flat recovery
          // Only use Semicolon as base token - END is handled by depth tracking
          this.recoverToTokensDepthAware([TokenType.Semicolon], true);

          // If recovery stopped at a procedure boundary, exit the block parsing loop
          // to let the outer CODE section parser handle the next procedure
          if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
            break;
          }
        } else {
          throw error;
        }
      }
    }

    // Check if loop exited due to procedure boundary
    let endToken: Token;
    if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
      // Block is missing END - report error and return partial block
      // Use previous token for error location (last valid token before procedure boundary)
      this.recordError(
        `Expected END to close BEGIN block`,
        this.previous(),
        'parse-unclosed-block'
      );
      // Use previous token as endToken (last token before procedure boundary)
      endToken = this.previous();
    } else {
      endToken = this.consumeExpected(TokenType.End, 'Expected END to close BEGIN block');
    }

    return {
      type: 'BlockStatement',
      statements,
      startToken,
      endToken
    };
  }


  private parseStatement(): Statement | null {
    const token = this.peek();

    // Check for procedure boundaries that should never start a statement
    // These indicate we've hit the next procedure/function/trigger/event declaration
    if (PROCEDURE_BOUNDARY_TOKENS.has(token.type)) {
      throw this.createParseError(`Unexpected ${token.value} - expected statement or END`);
    }

    // Issue #310: Check for orphaned ELSE (ELSE without a preceding IF at this nesting level)
    // ELSE can only be valid if it's part of an IF or CASE statement's else branch.
    // If we encounter ELSE here at statement position, it's orphaned = syntax error.
    if (token.type === TokenType.Else) {
      this.recordError(
        `Unexpected ELSE - cannot start a statement. ELSE must follow IF or CASE.`,
        token
      );
      this.advance();
      return null;
    }

    // Issue #327: Check for orphaned control-flow keywords
    // But ONLY if they don't appear in a context that suggests expression continuation
    // (like after EXIT or other keywords that can take optional expressions)
    // This avoids conflict with issue #301's expression-level error reporting

    const previousToken = this.previous();
    // Check if we might be in an expression continuation context
    const couldBeExpressionContinuation = previousToken && (
      previousToken.type === TokenType.Exit ||        // EXIT <expr>
      previousToken.type === TokenType.Assign ||      // x := <expr>
      previousToken.type === TokenType.LeftParen ||   // func(<expr>)
      previousToken.type === TokenType.Comma          // a, <expr>
    );

    if (!couldBeExpressionContinuation && token.type === TokenType.Do) {
      this.recordError(
        `Unexpected DO - cannot start a statement. DO must follow WHILE or FOR.`,
        token
      );
      this.advance();
      return null;
    }

    if (!couldBeExpressionContinuation && token.type === TokenType.Of) {
      this.recordError(
        `Unexpected OF - cannot start a statement. OF must follow CASE expression.`,
        token
      );
      this.advance();
      return null;
    }

    if (!couldBeExpressionContinuation && token.type === TokenType.Then) {
      this.recordError(
        `Unexpected THEN - cannot start a statement. THEN must follow IF condition.`,
        token
      );
      this.advance();
      return null;
    }

    if (!couldBeExpressionContinuation && token.type === TokenType.To) {
      this.recordError(
        `Unexpected TO - cannot start a statement. TO must be part of FOR loop.`,
        token
      );
      this.advance();
      return null;
    }

    if (!couldBeExpressionContinuation && token.type === TokenType.DownTo) {
      this.recordError(
        `Unexpected DOWNTO - cannot start a statement. DOWNTO must be part of FOR loop.`,
        token
      );
      this.advance();
      return null;
    }

    if (!couldBeExpressionContinuation && token.type === TokenType.Until) {
      this.recordError(
        `Unexpected UNTIL - cannot start a statement. UNTIL must follow REPEAT body.`,
        token
      );
      this.advance();
      return null;
    }

    // Check for AL-only access modifiers and other non-keyword AL-only features
    // We do NOT universally check for ALOnlyKeyword here because keywords like ENUM, INTERFACE
    // can be used as identifiers in statements (e.g., "Enum := 1").
    // However, we DO check for suspicious patterns that suggest AL-only constructs
    // (e.g., "ENUM Type { }" which looks like an enum declaration).
    if (token.type === TokenType.ALOnlyAccessModifier) {
      // Look ahead to distinguish between:
      // - "Public.FINDFIRST" (variable used with member access)
      // - "Public := ..." (variable used in assignment)
      // - "Public PROCEDURE ..." (access modifier - NOT supported)
      const nextToken = this.peekNextMeaningfulToken(1);
      const isIdentifierUsage = nextToken?.type === TokenType.Dot ||
                                 nextToken?.type === TokenType.Assign ||
                                 nextToken?.type === TokenType.PlusAssign ||
                                 nextToken?.type === TokenType.MinusAssign ||
                                 nextToken?.type === TokenType.MultiplyAssign ||
                                 nextToken?.type === TokenType.DivideAssign ||
                                 nextToken?.type === TokenType.LeftParen ||
                                 nextToken?.type === TokenType.DoubleColon ||
                                 nextToken?.type === TokenType.LeftBracket;

      if (!isIdentifierUsage && nextToken?.type !== TokenType.Semicolon) {
        // It's not being used as an identifier - probably an access modifier
        this.recordError(
          `AL-only access modifier '${sanitizeContent(token.value)}' is not supported in C/AL. Use LOCAL instead.`,
          token,
          'parse-al-only-syntax'
        );
        this.advance();
        return null;
      }
    }
    if (token.type === TokenType.TernaryOperator) {
      this.recordError(
        `AL-only ternary operator (? :) is not supported in C/AL. Use IF-THEN-ELSE instead.`,
        token,
        'parse-al-only-syntax'
      );
      this.advance();
      return null;
    }
    if (token.type === TokenType.PreprocessorDirective) {
      this.recordError(
        `AL-only preprocessor directive '${sanitizeContent(token.value)}' is not supported in C/AL`,
        token,
        'parse-al-only-syntax'
      );
      this.advance();
      return null;
    }

    // Check for AL-only keyword constructs (e.g., "ENUM Type { }" or "INTERFACE IName { }")
    // These are distinguished from identifier usage by lookahead pattern detection.
    // When an ALOnlyKeyword appears at statement level, it's likely a construct declaration.
    // Valid uses of ALOnlyKeywords are: Enum := 1; or MyProc(Enum) or Enum += 1; or Enum[1]
    // Invalid constructs are: ENUM Type { } or INTERFACE IFoo { }
    if (token.type === TokenType.ALOnlyKeyword) {
      // Look ahead to distinguish between:
      // - "ENUM := ..." (variable used in assignment)
      // - "ENUM += ..." (variable used in compound assignment)
      // - "ENUM(" (variable used in function call)
      // - "ENUM.Method" (variable used with member access)
      // - "ENUM[1]" (variable used in array access)
      // - "ENUM Test { }" (type declaration - NOT supported)
      const nextToken = this.peekNextMeaningfulToken(1);
      const isAssignmentOrCall = nextToken?.type === TokenType.Assign ||
                                  nextToken?.type === TokenType.PlusAssign ||
                                  nextToken?.type === TokenType.MinusAssign ||
                                  nextToken?.type === TokenType.MultiplyAssign ||
                                  nextToken?.type === TokenType.DivideAssign ||
                                  nextToken?.type === TokenType.LeftParen ||
                                  nextToken?.type === TokenType.Dot ||
                                  nextToken?.type === TokenType.DoubleColon ||
                                  nextToken?.type === TokenType.LeftBracket;

      if (!isAssignmentOrCall && nextToken?.type !== TokenType.Semicolon) {
        // It's not an assignment, call, or semicolon - probably a construct declaration
        this.recordError(
          `AL-only keyword '${sanitizeContent(token.value)}' is not supported in C/AL`,
          token,
          'parse-al-only-syntax'
        );
        this.advance();
        return null;
      }
    }

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

    // BREAK statement
    if (this.check(TokenType.Break)) {
      return this.parseBreakStatement();
    }

    // WITH statement
    if (this.check(TokenType.With)) {
      return this.parseWithStatement();
    }

    // BEGIN block
    if (this.check(TokenType.Begin)) {
      return this.parseBlock();
    }

    // Bare semicolon (empty statement) - must check before parseAssignmentOrCall
    // because parseAssignmentOrCall will try to parse the semicolon as an identifier
    if (this.check(TokenType.Semicolon)) {
      return this.parseEmptyStatement();
    }

    // Assignment or procedure call
    return this.parseAssignmentOrCall();
  }

  /**
   * Check if the current token can start a valid statement.
   *
   * This helper is used to detect empty statement bodies in control flow constructs.
   * Returns true if the current token can legally begin a statement.
   *
   * Statement starters include:
   * - Control flow keywords: IF, WHILE, REPEAT, FOR, CASE, EXIT, BREAK, WITH, BEGIN
   * - Identifiers (regular and quoted) for assignments/calls
   * - Keywords allowed as identifiers (object types, data types, AL-only keywords)
   *
   * Returns false for:
   * - Statement terminators: END, ELSE, UNTIL
   * - Declaration keywords: PROCEDURE, VAR, LOCAL
   * - End-of-file
   *
   * @returns true if current token can start a statement
   */
  private isStatementStarter(): boolean {
    const token = this.peek();

    // Control flow keywords
    if (token.type === TokenType.If ||
        token.type === TokenType.While ||
        token.type === TokenType.Repeat ||
        token.type === TokenType.For ||
        token.type === TokenType.Case ||
        token.type === TokenType.Exit ||
        token.type === TokenType.Break ||
        token.type === TokenType.With ||
        token.type === TokenType.Begin) {
      return true;
    }

    // Regular identifiers
    if (token.type === TokenType.Identifier ||
        token.type === TokenType.QuotedIdentifier) {
      return true;
    }

    // Keywords allowed as identifiers (can start assignment/call)
    if (ALLOWED_KEYWORDS_AS_IDENTIFIERS.has(token.type)) {
      return true;
    }

    // AL-only keywords can be used as identifiers in C/AL
    if (token.type === TokenType.ALOnlyKeyword ||
        token.type === TokenType.ALOnlyAccessModifier) {
      return true;
    }

    // Data type keywords (Date_Type, Time_Type, etc.) can start assignment statements
    // Consistent with canBeUsedAsIdentifier() - _TYPE suffix check
    if (token.type.toString().endsWith('_TYPE')) {
      return true;
    }

    return false;
  }

  /**
   * Create an empty block statement at the given token position.
   *
   * Used for error recovery when a control flow statement is missing its body.
   * Creates a valid but empty BlockStatement node to maintain AST integrity.
   *
   * @param token Token where the empty block should be positioned
   * @returns Empty BlockStatement
   */
  private createEmptyBlock(token: Token): BlockStatement {
    return {
      type: 'BlockStatement',
      statements: [],
      startToken: token,
      endToken: token
    };
  }

  /**
   * Determines if a statement was terminated by a semicolon.
   * For compound statements (WHILE, FOR, WITH, nested IF), this recursively
   * checks their inner statements since semicolons inside compound statements
   * affect ELSE attribution for outer IFs.
   *
   * KEY RULES:
   * 1. Self-contained statements (BEGIN/END, CASE, REPEAT) are never terminated internally
   * 2. Simple statements (calls, assignments, etc.) propagate from their endToken
   * 3. Compound wrappers (WHILE, FOR, WITH) propagate from their body
   * 4. IF without elseBranch is never terminated (allows outer IF to claim ELSE)
   * 5. IF with elseBranch propagates from elseBranch
   */
  private isStatementTerminatedBySemicolon(stmt: Statement): boolean {
    switch (stmt.type) {
      // Simple statements: check if their endToken is a semicolon
      case 'CallStatement':
      case 'AssignmentStatement':
      case 'ExitStatement':
      case 'BreakStatement':
      case 'EmptyStatement':
        return stmt.endToken?.type === TokenType.Semicolon;

      // Compound statements that wrap a single body: propagate from body
      case 'WhileStatement':
      case 'ForStatement':
      case 'WithStatement':
        return this.isStatementTerminatedBySemicolon(stmt.body);

      // IF statement: Check if the IF can claim a following ELSE
      // If elseBranch exists, check if it's terminated (prevents outer IF from claiming ELSE)
      // If no elseBranch, this IF is "open" and could claim a following ELSE
      case 'IfStatement': {
        if (stmt.elseBranch) {
          // IF with elseBranch: check if complete IF-ELSE ends with semicolon
          return this.isStatementTerminatedBySemicolon(stmt.elseBranch);
        } else {
          // IF without elseBranch: this IF is "open" and could claim a following ELSE
          // Don't propagate inner thenBranch termination to outer constructs
          return false;
        }
      }

      // Self-contained statements: check if followed by semicolon after END/UNTIL
      case 'BlockStatement':
      case 'CaseStatement':
      case 'RepeatStatement':
        // These statements end with END/UNTIL - check if followed by semicolon
        return stmt.endToken?.type === TokenType.Semicolon;

      // Default: not terminated
      default:
        return false;
    }
  }

  private parseIfStatement(): IfStatement {
    const startToken = this.consume(TokenType.If, 'Expected IF');

    // Parse condition
    const condition = this.parseExpression();

    // THEN
    this.consumeExpected(TokenType.Then, 'Expected THEN');

    // Parse then branch
    let thenBranch: Statement;
    if (this.check(TokenType.Begin)) {
      thenBranch = this.parseBlock();
    } else if (this.check(TokenType.Semicolon)) {
      // Empty statement: IF condition THEN;
      thenBranch = this.parseEmptyStatement();
    } else if (this.check(TokenType.End) || this.check(TokenType.Else)) {
      // Empty body is valid - create EmptyStatement (don't consume END/ELSE)
      const startToken = this.previous();
      thenBranch = { type: 'EmptyStatement', startToken, endToken: startToken };
    } else if (!this.isStatementStarter()) {
      this.recordError('Expected statement after THEN', this.peek());
      thenBranch = this.createEmptyBlock(this.previous());
    } else {
      const stmt = this.parseStatement();
      if (!stmt) {
        throw this.createParseError('Expected statement after THEN');
      }
      thenBranch = stmt;
    }

    // Parse optional else branch
    // C/AL rule: A semicolon terminates the IF statement's ability to claim an ELSE.
    // For compound statements (WHILE, FOR, WITH, nested IF), we recursively check if
    // their inner statements were terminated by semicolon.
    let elseBranch: Statement | null = null;
    const thenEndedWithSemicolon = this.isStatementTerminatedBySemicolon(thenBranch);
    if (this.check(TokenType.Else) && !thenEndedWithSemicolon) {
      this.advance();
      if (this.check(TokenType.Begin)) {
        elseBranch = this.parseBlock();
      } else if (this.check(TokenType.Semicolon)) {
        // Empty statement: IF condition THEN ... ELSE;
        elseBranch = this.parseEmptyStatement();
      } else if (this.check(TokenType.End)) {
        // Empty body is valid - create EmptyStatement (don't consume END)
        const startToken = this.previous();
        elseBranch = { type: 'EmptyStatement', startToken, endToken: startToken };
      } else if (!this.isStatementStarter()) {
        this.recordError('Expected statement after ELSE', this.peek());
        elseBranch = this.createEmptyBlock(this.previous());
      } else {
        const stmt = this.parseStatement();
        if (!stmt) {
          throw this.createParseError('Expected statement after ELSE');
        }
        elseBranch = stmt;
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
    this.consumeExpected(TokenType.Do, 'Expected DO after WHILE condition');

    // Parse body
    let body: Statement;
    if (this.check(TokenType.Begin)) {
      body = this.parseBlock();
    } else if (this.check(TokenType.Semicolon)) {
      // Empty statement: WHILE condition DO;
      body = this.parseEmptyStatement();
    } else if (this.check(TokenType.End)) {
      // Empty body is valid - create EmptyStatement (don't consume END)
      const startToken = this.previous();
      body = { type: 'EmptyStatement', startToken, endToken: startToken };
    } else if (!this.isStatementStarter()) {
      this.recordError('Expected statement after DO', this.peek());
      body = this.createEmptyBlock(this.previous());
    } else {
      const stmt = this.parseStatement();
      if (!stmt) {
        throw this.createParseError('Expected statement after DO');
      }
      body = stmt;
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
      // Boundary: END at depth 0 belongs to enclosing block
      if (this.check(TokenType.End)) {
        break;
      }
      // Boundary: procedure/trigger/event/function declaration
      if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
        break;
      }

      try {
        const stmt = this.parseStatement();
        if (stmt) {
          body.push(stmt);
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Mirror parseBlock()'s recovery: skip to semicolon with depth awareness
          this.recoverToTokensDepthAware([TokenType.Semicolon], true);
          // If recovery stopped at a procedure boundary, exit to let outer parser handle it
          if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
            break;
          }

          // Recovery skips to the next semicolon (or END/procedure boundary).
          // If recovery consumed past UNTIL, the missing-UNTIL path below will
          // report the error. If recovery stopped before UNTIL, the loop
          // condition re-checks on the next iteration.
        } else {
          throw error;
        }
      }
    }

    // UNTIL
    if (this.check(TokenType.Until)) {
      this.advance();

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

    // Missing UNTIL - report error at the REPEAT keyword location
    this.recordError('Expected UNTIL to close REPEAT statement', startToken, 'parse-unclosed-block');

    // Return partial node with placeholder condition
    const placeholder: Identifier = {
      type: 'Identifier',
      name: '<error>',
      isQuoted: false,
      startToken,
      endToken: startToken
    };

    return {
      type: 'RepeatStatement',
      body,
      condition: placeholder,
      startToken,
      endToken: this.previous()
    };
  }

  private parseForStatement(): ForStatement {
    const startToken = this.consume(TokenType.For, 'Expected FOR');

    // Parse variable expression (can be Identifier or MemberExpression)
    const variableExpr = this.parseExpression();

    // Validate that the variable is either an Identifier or MemberExpression
    let variable: Identifier | MemberExpression;
    if (variableExpr.type === 'Identifier') {
      variable = variableExpr;
    } else if (variableExpr.type === 'MemberExpression') {
      // Additional validation: ensure the object is a valid lvalue (Identifier or MemberExpression)
      if (variableExpr.object.type !== 'Identifier' && variableExpr.object.type !== 'MemberExpression') {
        this.recordError('Invalid FOR loop variable: expected identifier or field reference', variableExpr.startToken);
        variable = {
          type: 'Identifier',
          name: '<error>',
          isQuoted: false,
          startToken: this.previous(),
          endToken: this.previous()
        };
      } else {
        variable = variableExpr;
      }
    } else {
      // Invalid expression type - record error and create synthetic identifier for recovery
      this.recordError('Invalid FOR loop variable: expected identifier or field reference', variableExpr.startToken);
      variable = {
        type: 'Identifier',
        name: '<error>',
        isQuoted: false,
        startToken: this.previous(),
        endToken: this.previous()
      };
    }

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
      this.consumeExpected(TokenType.To, 'Expected TO or DOWNTO');
    }

    // To expression
    const to = this.parseExpression();

    // DO
    this.consumeExpected(TokenType.Do, 'Expected DO after FOR range');

    // Parse body
    let body: Statement;
    if (this.check(TokenType.Begin)) {
      body = this.parseBlock();
    } else if (this.check(TokenType.Semicolon)) {
      // Empty statement: FOR i := 1 TO 10 DO;
      body = this.parseEmptyStatement();
    } else if (this.check(TokenType.End)) {
      // Empty body is valid - create EmptyStatement (don't consume END)
      const startToken = this.previous();
      body = { type: 'EmptyStatement', startToken, endToken: startToken };
    } else if (!this.isStatementStarter()) {
      this.recordError('Expected statement after DO', this.peek());
      body = this.createEmptyBlock(this.previous());
    } else {
      const stmt = this.parseStatement();
      if (!stmt) {
        throw this.createParseError('Expected statement after DO');
      }
      body = stmt;
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
    this.consumeExpected(TokenType.Of, 'Expected OF after CASE');

    // Parse branches
    const branches: CaseBranch[] = [];
    let elseBranch: Statement[] | null = null;

    while (!this.check(TokenType.End) && !this.isAtEnd() &&
           !PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type) &&
           !CASE_EXIT_STATEMENT_KEYWORDS.has(this.peek().type)) {
      if (this.check(TokenType.Else)) {
        elseBranch = this.parseCaseElseBranch();
        break;
      }

      try {
        branches.push(this.parseCaseBranch());
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);

          // Capture partial branch data before recovery
          let partialValues: Expression[] | null = null;
          let partialStartToken: Token | null = null;
          if (error instanceof CaseBranchParseError) {
            partialValues = error.values;
            partialStartToken = error.branchStartToken;
          }

          // Recover within the CASE statement - skip to next case value or ELSE/END
          while (!this.isAtEnd()) {
            // Stop at END (closes the case)
            if (this.check(TokenType.End)) {
              break;
            }
            // Stop at ELSE
            if (this.check(TokenType.Else)) {
              break;
            }
            // Stop at procedure boundaries - don't consume into next procedure
            if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
              break;
            }
            // Stop at statement-starting keywords - CASE is missing END
            if (CASE_EXIT_STATEMENT_KEYWORDS.has(this.peek().type)) {
              break;
            }
            // Stop at semicolon - likely ends the branch statement
            if (this.check(TokenType.Semicolon)) {
              this.advance();
              break;
            }
            // Stop at potential next case value (number, string, or identifier)
            // But we need to be careful not to stop mid-expression
            if (this.check(TokenType.Integer) || this.check(TokenType.Decimal) ||
                this.check(TokenType.String)) {
              // Peek ahead to see if this looks like a case value
              const next = this.peekNextMeaningfulToken(1);
              if (next && (next.type === TokenType.Colon || next.type === TokenType.DotDot ||
                           next.type === TokenType.Comma)) {
                // This looks like a case value - stop here so the loop tries again
                break;
              }
            }
            // Stop at potential identifier case value (simple identifier or quoted)
            // Note: Use Colon/DotDot only for identifiers (not Comma) to avoid false positives
            // from function arguments like SomeFunc(a, b, c) where comma separates args
            if (this.check(TokenType.Identifier) || this.check(TokenType.QuotedIdentifier)) {
              const next = this.peekNextMeaningfulToken(1);
              if (next && (next.type === TokenType.Colon || next.type === TokenType.DotDot)) {
                break;
              }
            }
            this.advance();
          }

          // Create partial branch AFTER recovery so endToken reflects actual extent
          if (partialValues && partialStartToken) {
            branches.push({
              type: 'CaseBranch',
              values: partialValues,
              statements: [],
              startToken: partialStartToken,
              endToken: this.previous()
            });
          }
        } else {
          throw error;
        }
      }
    }

    // Check if loop exited due to procedure boundary or statement-starting keyword
    if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
      // Procedure boundary found - CASE is missing END
      this.recordError('Expected END to close CASE statement', this.peek(), 'parse-unclosed-block');
      // Return partial node without consuming the procedure boundary
      // Let outer parser handle the next procedure
      return {
        type: 'CaseStatement',
        expression,
        branches,
        elseBranch,
        startToken,
        endToken: this.previous()  // Last token before procedure boundary (partial node marker)
      };
    }
    if (CASE_EXIT_STATEMENT_KEYWORDS.has(this.peek().type)) {
      // Statement keyword found - CASE is missing END
      this.recordError('Expected END to close CASE statement', this.peek(), 'parse-unclosed-block');
      // Return partial node without consuming the statement keyword
      // Let outer parser handle the statement
      return {
        type: 'CaseStatement',
        expression,
        branches,
        elseBranch,
        startToken,
        endToken: this.previous()  // Last token before statement keyword (partial node marker)
      };
    }

    // Before consuming END, check if it likely belongs to outer structure
    if (this.isEndForOuterStructure()) {
      // END followed by section close or procedure boundary
      // This END likely belongs to outer BEGIN block
      this.recordError('Expected END to close CASE statement', this.peek(), 'parse-unclosed-block');
      // Return partial node without consuming END
      // Let outer parseBlock() consume it and succeed
      return {
        type: 'CaseStatement',
        expression,
        branches,
        elseBranch,
        startToken,
        endToken: this.previous()  // Last token before END (partial node marker)
      };
    }

    this.consumeExpected(TokenType.End, 'Expected END to close CASE statement');
    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    const result = {
      type: 'CaseStatement' as const,
      expression,
      branches,
      elseBranch,
      startToken,
      endToken: this.previous()
    };
    return result;
  }

  /**
   * Parse a single CASE branch with values and statements
   */
  private parseCaseBranch(): CaseBranch {
    const branchStart = this.peek();
    const values: Expression[] = [];

    // Save position so we can restore if expression parsing fails deep inside
    // (e.g., malformed function call consuming tokens past the actual case value)
    const savedPosition = this.current;
    try {
      // Parse value(s), including range expressions (e.g., 1..10)
      values.push(this.parseCaseValue());
      while (this.check(TokenType.Comma)) {
        this.advance();
        values.push(this.parseCaseValue());
      }
    } catch (error) {
      if (values.length > 0 && error instanceof ParseError) {
        // Successfully parsed some values before failure.
        // DON'T restore to savedPosition -- that causes infinite loop for multi-value branches.
        // Instead, convert to CaseBranchParseError so parseCaseStatement creates a partial branch.
        throw new CaseBranchParseError(
          'Expected : after case branch value',
          error.token,
          values,
          branchStart,
          'parse-expected-token'
        );
      }
      // No values parsed or non-ParseError -- restore position and re-throw
      this.current = savedPosition;
      throw error;
    }

    // Manual colon check to preserve parsed values in case of error
    if (!this.check(TokenType.Colon)) {
      const errorLocation = this.previous();
      const errorContext = this.peek();
      const sanitizedType = sanitizeTokenType(errorContext.type as string);
      const message = `Expected : after case branch value, but found '${sanitizeContent(errorContext.value)}' (${sanitizedType})`;
      throw new CaseBranchParseError(
        stripPaths(message),
        errorLocation,
        values,
        branchStart,
        'parse-expected-token'
      );
    }
    this.advance(); // consume the colon

    // Parse statement(s)
    const statements: Statement[] = [];
    if (this.check(TokenType.Begin)) {
      const block = this.parseBlock();
      statements.push(...block.statements);
    } else if (this.check(TokenType.End) || this.check(TokenType.Else) ||
               this.check(TokenType.Integer) || this.check(TokenType.Decimal) ||
               this.check(TokenType.String)) {
      // Empty branch is valid - next case value, ELSE, or END
      // Don't consume the token, create EmptyStatement
      const startToken = this.previous();
      statements.push({ type: 'EmptyStatement', startToken, endToken: startToken });
    } else if (this.check(TokenType.Identifier) || this.check(TokenType.QuotedIdentifier)) {
      // For identifiers, verify it's actually a case value (not a statement start)
      const next = this.peekNextMeaningfulToken(1);
      if (next && (next.type === TokenType.Colon || next.type === TokenType.DotDot)) {
        // Empty branch - next token is identifier case value
        const startToken = this.previous();
        statements.push({ type: 'EmptyStatement', startToken, endToken: startToken });
      } else {
        // Not a case value, parse as statement
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt);
        }
      }
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
      const operatorToken = this.advance(); // consume ..

      // Guard: check if next token cannot start an expression
      if (this.isAtEnd() || this.check(TokenType.Colon) || this.check(TokenType.Comma) ||
          this.check(TokenType.RightParen) || this.check(TokenType.Semicolon) ||
          this.check(TokenType.End) || this.check(TokenType.Else)) {
        this.recordError("Expected expression after '..' in range", this.peek());
        return {
          type: 'RangeExpression',
          start: expr,
          end: null,
          operatorToken,
          startToken: expr.startToken,
          endToken: this.previous()
        } as RangeExpression;
      }

      const endExpr = this.parseExpression();
      return {
        type: 'RangeExpression',
        start: expr,
        end: endExpr,
        operatorToken,
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
    // Stop at procedure boundaries (PROCEDURE/FUNCTION/TRIGGER/EVENT).
    // Note: CASE_EXIT_STATEMENT_KEYWORDS (IF/WHILE/FOR/REPEAT/WITH) are NOT added here
    // because they are valid statement starters inside ELSE bodies and are handled by parseStatement().
    while (!this.check(TokenType.End) && !this.isAtEnd() &&
           !PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt);
        }
        // Check if we've hit a procedure boundary after successfully parsing a statement
        // (handles partial-node-returning paths like parseCaseStatement)
        if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
          break;
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);
          // Mirror parseBlock()'s recovery: skip to semicolon with depth awareness
          this.recoverToTokensDepthAware([TokenType.Semicolon], true);
          // If recovery stopped at a procedure boundary, exit to let outer parser handle it
          if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
            break;
          }
        } else {
          throw error;
        }
      }
    }
    return statements;
  }

  private parseExitStatement(): ExitStatement {
    const startToken = this.consume(TokenType.Exit, 'Expected EXIT');

    let value: Expression | null = null;
    if (this.check(TokenType.LeftParen)) {
      this.advance();
      // Check if we have a valid expression start or an immediate closing paren
      if (!this.check(TokenType.RightParen)) {
        // If we see a token that can't start an expression, skip parseExpression
        // to avoid the generic "expected expression" error from parsePrimary
        // The consume() below will provide the context-specific "Expected ) after EXIT value" error
        if (!NEVER_PRIMARY_THROW.has(this.peek().type)) {
          value = this.parseExpression();
        }
        // else: skip parseExpression, let consume() handle the error
      }
      this.consumeExpected(TokenType.RightParen, 'Expected ) after EXIT value');
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
   * Parses a BREAK statement.
   * Syntax: BREAK;
   * Note: Unlike EXIT, BREAK takes no value and only exits the innermost loop.
   */
  private parseBreakStatement(): BreakStatement {
    const startToken = this.consume(TokenType.Break, 'Expected BREAK');

    if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: 'BreakStatement',
      startToken,
      endToken: this.previous()
    };
  }

  /**
   * Parse empty statement (standalone semicolon)
   *
   * Used for intentionally empty statement bodies in control flow:
   * - IF condition THEN;
   * - WHILE condition DO;
   * - FOR i := 1 TO 10 DO;
   * - WITH record DO;
   */
  private parseEmptyStatement(): EmptyStatement {
    const semicolon = this.consume(TokenType.Semicolon, 'Expected ; after statement');
    return {
      type: 'EmptyStatement',
      startToken: semicolon,
      endToken: semicolon
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
    this.consumeExpected(TokenType.Do, 'Expected DO after WITH record');

    // Parse body (can be BEGIN-END block or single statement)
    let body: Statement;
    if (this.check(TokenType.Begin)) {
      body = this.parseBlock();
    } else if (this.check(TokenType.Semicolon)) {
      // Empty statement: WITH record DO;
      body = this.parseEmptyStatement();
    } else if (this.check(TokenType.End)) {
      // Empty body is valid - create EmptyStatement (don't consume END)
      const startToken = this.previous();
      body = { type: 'EmptyStatement', startToken, endToken: startToken };
    } else if (!this.isStatementStarter()) {
      this.recordError('Expected statement after DO', this.peek());
      body = this.createEmptyBlock(this.previous());
    } else {
      const stmt = this.parseStatement();
      if (!stmt) {
        throw this.createParseError('Expected statement after DO');
      }
      body = stmt;
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
    // Check for AL-only tokens that are genuinely invalid in expressions
    // (TernaryOperator and PreprocessorDirective), but NOT ALOnlyKeyword
    // because keywords like ENUM, INTERFACE can be used as identifiers in expressions
    const currentToken = this.peek();
    if (currentToken.type === TokenType.TernaryOperator) {
      this.recordError(
        `AL-only ternary operator (? :) is not supported in C/AL. Use IF-THEN-ELSE instead.`,
        currentToken,
        'parse-al-only-syntax'
      );
      this.advance();
      return {
        type: 'Identifier',
        name: '?',
        isQuoted: false,
        startToken: currentToken,
        endToken: currentToken
      } as Identifier;
    }
    if (currentToken.type === TokenType.PreprocessorDirective) {
      this.recordError(
        `AL-only preprocessor directive '${sanitizeContent(currentToken.value)}' is not supported in C/AL`,
        currentToken,
        'parse-al-only-syntax'
      );
      this.advance();
      return {
        type: 'Identifier',
        name: currentToken.value,
        isQuoted: false,
        startToken: currentToken,
        endToken: currentToken
      } as Identifier;
    }

    // Try to parse as literal
    const literal = this.parseLiteral();
    if (literal) {
      return literal;
    }

    // Parenthesized expression
    if (this.check(TokenType.LeftParen)) {
      this.advance();
      const expr = this.parseExpression();
      this.consumeExpected(TokenType.RightParen, 'Expected ) after expression');
      return expr;
    }

    // Set literal (standalone - typically used with IN operator)
    // Parse it to get proper error messages if malformed
    if (this.check(TokenType.LeftBracket)) {
      return this.parseSetLiteral();
    }

    // Identifier (with optional member access and function calls)
    // Also handle keywords that can be used as identifiers
    if (this.check(TokenType.Identifier) ||
        this.check(TokenType.QuotedIdentifier) ||
        this.canBeUsedAsIdentifier()) {
      return this.parseIdentifierExpression();
    }


    // Procedure boundaries should never appear in expressions
    // They indicate we've hit the next declaration - don't consume
    if (PROCEDURE_BOUNDARY_TOKENS.has(this.peek().type)) {
      const token = this.peek();
      throw this.createParseError(
        `Unexpected ${token.value} in expression - expected value or identifier`,
        token
      );
    }

    // Check for control-flow keywords that are never valid in expressions
    // These indicate a syntax error - record and recover
    const cfToken = this.peek();
    if (CONTROL_FLOW_KEYWORDS.has(cfToken.type)) {
      // Skip the error for orphaned keywords at statement level
      // An orphaned keyword is one that appears where a statement would be expected
      // (like "ELSE;" without an IF). This happens when the previous statement ended,
      // and we're at statement level, not in an expression context.
      //
      // Key indicators of expression context: operator/assignment before the keyword
      const previousToken = this.previous();
      const isInExpressionContext = previousToken && (
        previousToken.type === TokenType.LeftBracket ||  // [THEN
        previousToken.type === TokenType.LeftParen ||    // func(THEN)
        previousToken.type === TokenType.Comma ||        // a, THEN
        previousToken.type === TokenType.Colon ||        // [THEN :
        previousToken.type === TokenType.DotDot ||       // [1..THEN] (range)
        previousToken.type === TokenType.Plus ||         // x + THEN
        previousToken.type === TokenType.Minus ||        // x - THEN
        previousToken.type === TokenType.Multiply ||     // x * THEN
        previousToken.type === TokenType.Divide ||       // x / THEN
        previousToken.type === TokenType.Equal ||        // x = THEN
        previousToken.type === TokenType.NotEqual ||     // x <> THEN
        previousToken.type === TokenType.Less ||         // x < THEN
        previousToken.type === TokenType.LessEqual ||    // x <= THEN
        previousToken.type === TokenType.Greater ||      // x > THEN
        previousToken.type === TokenType.GreaterEqual || // x >= THEN
        previousToken.type === TokenType.Assign ||       // x := THEN
        previousToken.type === TokenType.PlusAssign ||   // x += THEN
        previousToken.type === TokenType.MinusAssign ||  // x -= THEN
        previousToken.type === TokenType.MultiplyAssign || // x *= THEN
        previousToken.type === TokenType.DivideAssign ||  // x /= THEN
        // Logical and arithmetic operators
        previousToken.type === TokenType.Not ||          // NOT THEN
        previousToken.type === TokenType.And ||          // x AND THEN
        previousToken.type === TokenType.Or ||           // x OR THEN
        previousToken.type === TokenType.Xor ||          // x XOR THEN
        previousToken.type === TokenType.Div ||          // x DIV THEN
        previousToken.type === TokenType.Mod ||          // x MOD THEN
        previousToken.type === TokenType.In ||           // x IN THEN
        // Statement keyword that can be followed by an expression
        previousToken.type === TokenType.Exit            // EXIT THEN
      );

      // Report error if we're in an expression context
      if (isInExpressionContext) {
        this.recordError(
          `Unexpected keyword '${sanitizeContent(cfToken.value)}' in expression. Missing statement or operator before '${sanitizeContent(cfToken.value)}'.`,
          cfToken
        );
        this.advance();
        return {
          type: 'Identifier',
          name: '<error>',
          isQuoted: false,
          startToken: cfToken,
          endToken: cfToken
        } as Identifier;
      }

      // Control-flow keyword outside expression context - throw without consuming
      // This prevents infinite loops when orphaned control-flow keywords appear
      throw this.createParseError(
        `Unexpected keyword '${sanitizeContent(cfToken.value)}' - expected expression or statement`,
        cfToken
      );
    }

    // Issue #361: Tokens that should never be consumed as identifiers
    // These are structural/boundary tokens that indicate missing expression
    if (NEVER_PRIMARY_THROW.has(this.peek().type)) {
      const token = this.peek();
      throw this.createParseError(
        `Unexpected '${sanitizeContent(token.value)}' - expected expression`,
        token
      );
    }

    // Issue #361: Binary operators that appear where a primary is expected
    // These require a left operand, so they're always errors here
    if (NEVER_PRIMARY_CONSUME.has(this.peek().type)) {
      const token = this.advance();
      this.recordError(
        `Unexpected operator '${sanitizeContent(token.value)}' - expected expression`,
        token
      );
      return {
        type: 'Identifier',
        name: '<error>',
        isQuoted: false,
        startToken: token,
        endToken: token
      } as Identifier;
    }

    // Issue #361: Residual fallback for any remaining tokens
    // This handles keywords that can be used as identifiers in certain contexts
    const fallbackToken = this.advance();
    this.recordError(
      `Unexpected token '${sanitizeContent(fallbackToken.value)}' - expected expression`,
      fallbackToken
    );
    const expr: Expression = {
      type: 'Identifier',
      name: '<error>',
      isQuoted: false,
      startToken: fallbackToken,
      endToken: fallbackToken
    } as Identifier;

    // Apply postfix operations to fallback expressions too
    // This allows continued parsing after errors
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
      this.recordError(`Expected identifier after :: operator, got '${sanitizeContent(this.peek().value)}'`, this.peek());
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

      // Check for colon after expression - indicates malformed argument like "arg:"
      // This triggers CASE error recovery for patterns like: SomeFunc(arg: Ready: MESSAGE('Ready');
      if (this.check(TokenType.Colon)) {
        throw this.createParseError(
          `Expected ',' or ')' in function arguments, but found '${sanitizeContent(this.peek().value)}'`,
          this.peek()
        );
      }

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

    const endToken = this.consumeExpected(TokenType.RightBracket, 'Expected ] after array index');

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
    const startToken = this.consume(TokenType.LeftBracket, 'Expected [ to open set literal');
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
      try {
        // Check for open-ended range: ..end
        if (this.check(TokenType.DotDot)) {
          const rangeStart = this.advance();

          // Guard: Check for EOF or delimiter tokens after '..'
          if (this.isAtEnd() || this.check(TokenType.Comma) || this.check(TokenType.RightBracket) ||
              this.check(TokenType.Semicolon) || this.check(TokenType.End) ||
              this.check(TokenType.Then) || this.check(TokenType.Do) ||
              this.check(TokenType.Else)) {
            // Error: no expression after '..'
            this.recordError("Expected expression after '..' in set range", this.peek());
            elements.push({
              type: 'RangeExpression',
              start: null,
              end: null,
              operatorToken: rangeStart,
              startToken: rangeStart,
              endToken: this.previous()
            } as RangeExpression);
          } else {
            // Valid: parse the end expression
            const end = this.parseExpression();
            elements.push({
              type: 'RangeExpression',
              start: null,
              end,
              operatorToken: rangeStart,
              startToken: rangeStart,
              endToken: end.endToken
            } as RangeExpression);
          }
        } else {
          // Parse start of element or range
          const start = this.parseExpression();

          // Check if this is a range: start..end or start..
          if (this.check(TokenType.DotDot)) {
            const operatorToken = this.advance(); // consume '..'

            // Check for closed range (start..end) vs open-ended range (start..)
            if (this.check(TokenType.Comma) || this.check(TokenType.RightBracket)) {
              // BRANCH 1: Valid open-ended range (start..)
              elements.push({
                type: 'RangeExpression',
                start,
                end: null,
                operatorToken,
                startToken: start.startToken,
                endToken: this.previous()
              } as RangeExpression);
            } else if (this.isAtEnd() || this.check(TokenType.Semicolon) || this.check(TokenType.End) ||
                       this.check(TokenType.Then) || this.check(TokenType.Do) ||
                       this.check(TokenType.Else)) {
              // BRANCH 2: Error - EOF or delimiter after '..'
              this.recordError("Expected expression after '..' in set range", this.peek());
              elements.push({
                type: 'RangeExpression',
                start,
                end: null,
                operatorToken,
                startToken: start.startToken,
                endToken: this.previous()
              } as RangeExpression);
            } else {
              // BRANCH 3: Closed range (start..end)
              const end = this.parseExpression();
              elements.push({
                type: 'RangeExpression',
                start,
                end,
                operatorToken,
                startToken: start.startToken,
                endToken: end.endToken
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
      } catch (error) {
        if (error instanceof ParseError) {
          this.errors.push(error);

          // Recover from expression parsing errors in set literal
          // Skip to next comma, right bracket, or statement terminator
          while (!this.isAtEnd()) {
            if (this.check(TokenType.RightBracket) ||
                this.check(TokenType.Comma) ||
                this.check(TokenType.Semicolon) ||
                this.check(TokenType.Then) ||
                this.check(TokenType.Do) ||
                this.check(TokenType.End)) {
              break;
            }
            this.advance();
          }
          // If we found a comma, consume it and continue
          if (this.check(TokenType.Comma)) {
            this.advance();
            continue;
          } else {
            // Otherwise exit the do-while loop
            break;
          }
        } else {
          throw error;
        }
      }
    } while (!this.check(TokenType.RightBracket) &&
             !this.check(TokenType.Then) &&
             !this.check(TokenType.Do) &&
             !this.check(TokenType.End) &&
             !this.check(TokenType.Else) &&
             !this.isAtEnd());

    let endToken: Token;
    if (this.check(TokenType.RightBracket)) {
      endToken = this.advance();
    } else {
      // Missing closing bracket - create synthetic token at current position
      this.recordError('Expected ] after set literal', this.peek());
      endToken = this.peek();
    }

    return {
      type: 'SetLiteral',
      elements,
      startToken,
      endToken
    } as SetLiteral;
  }

  /**
   * Checks if the next token after the current position is a left brace '{'.
   * Used to distinguish section keywords (CODE {, CONTROLS {) from identifiers
   * or type names (Code[20], Variant Code).
   *
   * Note: The lexer skips whitespace, so this.current + 1 is the next meaningful token.
   *
   * @returns true if the token at current + 1 is a left brace
   */
  private isFollowedByLeftBrace(): boolean {
    const nextIndex = this.current + 1;
    return nextIndex < this.tokens.length &&
           this.tokens[nextIndex].type === TokenType.LeftBrace;
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
      default: throw this.createParseError(`Invalid object type: ${sanitizeTokenType(type as string)}`);
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /**
   * Check if there is whitespace between two consecutive tokens.
   * Used to distinguish valid "Property= }" (whitespace value) from
   * malformed "Property=}" (no value, no whitespace).
   *
   * In C/AL, whitespace is a valid property value. When tokens are adjacent
   * (endOffset == startOffset), there is no gap and therefore no whitespace.
   *
   * @param token1 First token (typically the equals sign)
   * @param token2 Second token (typically the closing brace)
   * @returns true if there is any gap between tokens (whitespace present)
   */
  private hasWhitespaceBetween(token1: Token, token2: Token): boolean {
    return token1.endOffset < token2.startOffset;
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
   * Check if the current END token likely belongs to an outer structure.
   *
   * When CASE is missing its END, the END we see belongs to an enclosing
   * BEGIN block. We detect this conservatively by checking what follows END:
   * - END; followed by } → outer structure (section/object close)
   * - END; followed by procedure boundary (see PROCEDURE_BOUNDARY_TOKENS) → outer structure (next procedure)
   *
   * This is deliberately CONSERVATIVE to avoid false positives:
   * - Only triggers when followed by clear outer-structure signals
   * - Does NOT trigger on statements like IF, WHILE (could be valid)
   *
   * @returns true if END likely belongs to outer structure
   */
  private isEndForOuterStructure(): boolean {
    if (!this.check(TokenType.End)) {
      return false;
    }

    // Look at what follows END, skipping any consecutive semicolons.
    // e.g., END; ???  or  END;; ???  or  END;;;; ???
    let offset = 1;
    let checkToken = this.peekAhead(offset);
    // Skip consecutive semicolons (bounded to prevent runaway on pathological input)
    while (checkToken?.type === TokenType.Semicolon && offset < 10) {
      offset++;
      checkToken = this.peekAhead(offset);
    }

    if (!checkToken) {
      return false; // EOF - ambiguous, don't trigger
    }

    // Also check by value for } in case token type is not properly set
    const isClosingBrace = checkToken.value === '}';

    return checkToken.type === TokenType.RightBrace ||
           PROCEDURE_BOUNDARY_TOKENS.has(checkToken.type) ||
           isClosingBrace;
  }

  /**
   * Peek ahead N tokens from the current position.
   * Used for pattern detection in lookahead checks (e.g., AL keyword detection).
   *
   * Note: The lexer never emits Whitespace or NewLine tokens (they are skipped
   * during tokenization), so every token in the array is "meaningful". This method
   * uses direct index lookup for efficiency.
   *
   * @param skipCount How many tokens to skip (1 = next token, 2 = second token, etc.)
   * @returns The Nth token, or undefined if past end of tokens
   */
  private peekNextMeaningfulToken(skipCount: number): Token | undefined {
    const index = this.current + skipCount;
    return index < this.tokens.length ? this.tokens[index] : undefined;
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
   * Keywords stored in the ALLOWED_KEYWORDS_AS_IDENTIFIERS Set, including:
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
   * **Section keywords:** MenuSuite, Properties, FieldGroups, Actions, DataItems, Elements, Labels, Dataset, RequestForm, RequestPage, MenuNodes
   * - Structural at object level, but can be identifiers inside CODE sections
   * - Lexer behavior (context-dependent):
   *   - At SECTION_LEVEL (procedure declarations): keyword type preserved, parser allows via this set
   *   - At CODE_BLOCK (procedure bodies): lexer downgrades to Identifier automatically
   * - Non-uniformity (Issue #261): Labels and Dataset have additional @ downgrade behavior
   * - State contamination (Issue #260): updateContextForKeyword fires at SECTION_LEVEL setting lastWasSectionKeyword
   * - Example: `PROCEDURE Properties@1(); BEGIN END;` inside a CODE section
   *
   * ### 3. NOT Allowed - Reserved Keywords
   * These keywords are fundamental to C/AL syntax and CANNOT be used as identifiers.
   * Attempting to use them as variable/parameter names will cause parser errors.
   *
   * **Control flow keywords:**
   * - IF, THEN, ELSE - Conditional statement parts (`IF condition THEN ... ELSE ...`)
   * - CASE, OF - Case statement structure (`CASE value OF ...`)
   * - WHILE, DO - While loop (`WHILE condition DO ...`)
   * - REPEAT, UNTIL - Repeat loop (`REPEAT ... UNTIL condition`)
   * - FOR, TO, DOWNTO - For loop (`FOR i := 1 TO 10 DO ...`)
   * - Rationale: Statement starters/parts that would create ambiguity with `parseStatement()` dispatch
   *
   * **Block delimiters:**
   * - BEGIN, END - Code block boundaries, consumed throughout parser
   * - Rationale: Used ubiquitously for block delimiting; cannot be identifiers
   *
   * **Boolean literals:**
   * - TRUE, FALSE - Parsed as boolean literals in `parseLiteral()`
   * - Rationale: These are literal values, not keywords
   *
   * **Operators:**
   * - DIV, MOD - Integer division and modulo operators
   * - AND, OR, NOT, XOR - Logical operators
   * - IN - Set membership operator
   * - Rationale: Binary/unary operators in expression parsing
   *
   * **Declaration keywords:**
   * - VAR, PROCEDURE, FUNCTION - Declaration starters
   * - LOCAL - Procedure visibility modifier
   * - TRIGGER, EVENT - Special procedure types
   * - Rationale: Intercepted before `parseProcedureName()` or used as section boundaries
   *
   * **Statement/Type modifiers:**
   * - WITH - Statement starter (`WITH record DO ...`)
   * - ARRAY - Type declaration (`ARRAY [10] OF Integer`)
   * - TEMPORARY - Variable modifier (`TEMPORARY Record 18`)
   * - Rationale: Special syntactic roles that conflict with identifier usage
   *
   * **Example (invalid):**
   * ```cal
   * VAR
   *   IF@1000 : Integer;    // ERROR: Cannot use reserved keyword
   *   FOR@1001 : Text[10];  // ERROR: Cannot use reserved keyword
   *   BEGIN@1002 : Boolean; // ERROR: Cannot use reserved keyword
   * ```
   *
   * ## Cross-References
   * - **ALLOWED_KEYWORDS_AS_IDENTIFIERS constant**: Set of explicitly allowed keywords
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
   * ### Lexer Behavior Notes
   *
   * **Section keyword token types:**
   * - At SECTION_LEVEL (procedure declarations): Section keywords (Properties, FieldGroups, Actions, DataItems,
   *   Elements, MenuSuite, Labels, Dataset) arrive as their respective keyword TokenType values, not Identifier.
   *   The parser must explicitly allow them via ALLOWED_KEYWORDS_AS_IDENTIFIERS.
   * - At CODE_BLOCK (procedure bodies): The lexer automatically downgrades section keywords to Identifier type,
   *   so the parser sees TokenType.Identifier directly.
   *
   * **Uniform @ downgrade behavior (Issue #261 - RESOLVED):**
   * - All section and object type keywords are uniformly downgraded to Identifier when followed by `@`.
   * - Keywords like `Properties@1000`, `Table@1001`, `Labels@1002` arrive as TokenType.Identifier.
   * - ALLOWED_KEYWORDS_AS_IDENTIFIERS is still necessary for keywords used WITHOUT `@` suffix in identifier
   *   contexts (e.g., `Properties := 5;` where the keyword arrives as TokenType.Properties).
   *
   * **State contamination (Issue #260):**
   * - When section keywords are used as identifiers at SECTION_LEVEL inside CODE sections, the lexer's
   *   `updateContextForKeyword()` still fires, setting `lastWasSectionKeyword = true` and `currentSectionType`.
   * - This state contamination is benign for well-formed C/SIDE exports but represents a technical debt.
   * - The parser must handle these keywords regardless of lexer state pollution.
   *
   * @returns `true` if the current token can be used as an identifier, `false` otherwise
   *
   * @see ALLOWED_KEYWORDS_AS_IDENTIFIERS - Set of explicitly allowed keyword tokens (line 68)
   * @see TokenType - Lexer token definitions (server/src/lexer/tokens.ts)
   * @see keyword-variable-names.test.ts - Comprehensive test coverage and usage examples
   * @see Issue #260 - Lexer state contamination from section keywords in CODE sections
   * @see Issue #261 - Labels/Dataset @ downgrade non-uniformity
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
    const sanitizedType = sanitizeTokenType(current.type as string);
    const enhancedMessage = `${message}, but found '${sanitizeContent(current.value)}' (${sanitizedType})`;
    throw this.createParseError(enhancedMessage, current, 'parse-expected-token');
  }

  /**
   * Consume a token that is expected to follow a preceding construct.
   *
   * Unlike consume(), which reports errors at peek() (the next token), this
   * method reports errors at previous() (the last consumed token). This gives
   * correct error location when the expected token is missing at end-of-line:
   * the error appears on the line where the token was expected, not the next line.
   *
   * Note: The error's .token field (location) will be previous(), while the error
   * message describes peek() (what was found instead). This intentional divergence
   * decouples "where to report" from "what was found".
   *
   * Use this for delimiters/keywords that follow expressions, blocks, or
   * declarations: semicolons after statements, THEN after IF conditions,
   * DO after WHILE/FOR/WITH, END after blocks, closing parens/brackets.
   */
  private consumeExpected(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const errorLocation = this.previous();
    const errorContext = this.peek();
    const sanitizedType = sanitizeTokenType(errorContext.type as string);
    const enhancedMessage = `${message}, but found '${sanitizeContent(errorContext.value)}' (${sanitizedType})`;
    throw this.createParseError(enhancedMessage, errorLocation, 'parse-expected-token');
  }

  /**
   * Consume the opening brace for a section, with lookahead validation.
   *
   * When a section opening brace is missing, the parser greedily consumes
   * the first item's opening brace as the section's brace. This method detects
   * that situation by peeking at the token after the brace and checking if it
   * matches the expected item content pattern.
   *
   * Detection is deliberately CONSERVATIVE to avoid false positives:
   * - Only triggers section-level error when highly confident
   * - Ambiguous cases fall through to item parser (produces reasonable error)
   *
   * @param sectionName Name of the section for error messages (e.g., "FIELDS")
   * @param isItemContentToken Predicate to check if token indicates item content
   *        (i.e., we consumed an item brace instead of section brace)
   * @returns The opening brace token if valid, or previous token if error recorded
   */
  private consumeSectionBrace(
    sectionName: string,
    isItemContentToken: (tokenType: TokenType | undefined) => boolean
  ): Token {
    if (!this.check(TokenType.LeftBrace)) {
      // No brace at all - record error and return previous token
      this.recordError(`Expected { to open ${sectionName} section`, undefined, 'parse-unclosed-block');
      return this.previous();
    }

    // Peek at token after the brace to validate we're consuming a section brace
    const tokenAfterBrace = this.peekAhead(1);

    // Check if we're about to consume an item brace instead of section brace
    // This is detected when the token after { matches item content pattern
    if (isItemContentToken(tokenAfterBrace?.type)) {
      // We would consume an item brace as section brace
      // Record section-level error but do NOT consume the brace
      // This allows item parsing to proceed normally
      this.recordError(`Expected { to open ${sectionName} section`, undefined, 'parse-unclosed-block');
      return this.previous();
    }

    // Either valid section brace ({ followed by { or }) or ambiguous case
    // In ambiguous cases, consume as section brace and let item parser handle errors
    return this.advance();
  }

  public getErrors(): ParseError[] {
    return this.errors;
  }

  /**
   * Get all skipped regions recorded during parsing
   *
   * SECURITY WARNING: Returns data containing raw token values.
   * - MUST NOT be exposed to LSP clients
   * - Safe for internal position/length calculations only
   * - Do NOT serialize token.value to any external interface
   *
   * Reserved for future debugging and diagnostic tools. Currently has no callers.
   * See skipped-region-token-isolation.test.ts for safe usage patterns.
   */
  public getSkippedRegions(): SkippedRegion[] {
    return this.skippedRegions;
  }

  /**
   * Factory method for creating ParseError instances with sanitized messages.
   * This is the ONLY allowed site for ParseError construction.
   * All error messages containing token values MUST go through this factory
   * to prevent accidental content leakage from test/REAL/ files.
   *
   * @param message - Base error message (may already contain sanitized token values)
   * @param token - Token associated with the error (defaults to current token)
   * @returns ParseError with sanitized message and location info
   */
  private createParseError(message: string, token?: Token, code?: string): ParseError {
    const errorToken = token || this.peek();
    // Apply path sanitization as a safety layer to prevent test/REAL/ leakage
    // Note: stripPaths only removes file paths, not the entire message content
    // Token values should already be sanitized by callers using sanitizeContent()
    const sanitizedMessage = stripPaths(message);
    return new ParseError(sanitizedMessage, errorToken, code);
  }

  /**
   * Record an error without throwing - used for error recovery
   */
  private recordError(message: string, token?: Token, code?: string): void {
    const error = this.createParseError(message, token, code);
    this.errors.push(error);
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
    this.recordError(`Skipped ${tokenCount} ${tokenWord} during error recovery`, startToken, 'parse-error-recovery');
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
   * Recover parser state with awareness of BEGIN/END and CASE/END nesting depth.
   *
   * Unlike recoverToTokens(), this method tracks:
   * - BEGIN/END pairs (blocks)
   * - CASE/END pairs (case statements - note: CASE uses END without BEGIN)
   *
   * This prevents consuming END tokens that belong to outer structures.
   *
   * END-terminated structures in C/AL:
   * - BEGIN...END (blocks)
   * - CASE...OF...END (case statements)
   *
   * NOT END-terminated (use single statement or BEGIN-END):
   * - REPEAT...UNTIL (uses UNTIL)
   * - WITH...DO, IF...THEN, WHILE...DO, FOR...DO
   *
   * @param tokens - Base recovery tokens (typically [Semicolon])
   * @param stopAtProcedureBoundary - If true, also stop at PROCEDURE/TRIGGER/FUNCTION/EVENT
   */
  private recoverToTokensDepthAware(
    tokens: TokenType[],
    stopAtProcedureBoundary: boolean = true
  ): void {
    const skipStartToken = this.peek();
    let skipCount = 0;

    // Track BEGIN/END nesting (blocks)
    // Starts at 1 because we're inside a BEGIN block when this is called from parseBlock
    let beginEndDepth = 1;

    // Track CASE/END nesting (case statements use END without BEGIN)
    let caseDepth = 0;

    while (!this.isAtEnd()) {
      const current = this.peek();

      // Stop at procedure boundaries (safety net - we've gone too far)
      if (stopAtProcedureBoundary && PROCEDURE_BOUNDARY_TOKENS.has(current.type)) {
        break;  // Do NOT advance past procedure boundary - let caller decide
      }

      // Track BEGIN - opens a new block
      if (current.type === TokenType.Begin) {
        beginEndDepth++;
      }

      // Track CASE - opens a case statement (uses END without BEGIN)
      if (current.type === TokenType.Case) {
        caseDepth++;
      }

      // Track END - closes either a CASE or a BEGIN block
      if (current.type === TokenType.End) {
        if (caseDepth > 0) {
          // This END closes a CASE statement
          caseDepth--;
        } else if (beginEndDepth > 1) {
          // This END closes a nested BEGIN block (not our outer block)
          beginEndDepth--;
        } else {
          // beginEndDepth === 1 and caseDepth === 0
          // This END would close our containing BEGIN block - stop here, don't consume
          break;
        }
      }

      // Check base recovery tokens (typically Semicolon)
      if (tokens.some(t => this.check(t))) {
        break;
      }

      this.advance();
      skipCount++;
    }

    if (skipCount > 0) {
      this.recordSkippedRegion(skipStartToken, this.previous(), skipCount, 'Error recovery');
    }

    // Consume semicolon if that's where we stopped
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
          `AL-only keyword '${sanitizeContent(token.value)}' is not supported in C/AL`,
          token,
          'parse-al-only-syntax'
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      case TokenType.ALOnlyAccessModifier:
        this.recordError(
          `AL-only access modifier '${sanitizeContent(token.value)}' is not supported in C/AL. Use LOCAL instead.`,
          token,
          'parse-al-only-syntax'
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      case TokenType.TernaryOperator:
        this.recordError(
          `AL-only ternary operator (? :) is not supported in C/AL. Use IF-THEN-ELSE instead.`,
          token,
          'parse-al-only-syntax'
        );
        this.advance(); // Consume the token to continue parsing
        return true;

      case TokenType.PreprocessorDirective:
        this.recordError(
          `AL-only preprocessor directive '${sanitizeContent(token.value)}' is not supported in C/AL`,
          token,
          'parse-al-only-syntax'
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
  private skipUnsupportedSection(_sectionType: TokenType): void {
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
   * Check if a token type represents an object section keyword.
   *
   * IMPORTANT: The lexer sometimes tokenizes keywords even when they appear in other contexts:
   * - "Code" in "Variant Code" (inside PROPERTIES section!)
   * - "Code" in "Item Tracking Code" (captions)
   * - "Code" in "Code[20]" (data types)
   *
   * For CODE and CONTROLS specifically, we check that they're followed by '{' to distinguish
   * the section keyword from false positives. However, parsing loops also add explicit checks
   * for these keywords to handle malformed code where braces are missing.
   */
  private isSectionKeyword(type: TokenType): boolean {
    // Special case for CODE and CONTROLS: must be followed by '{'
    // to distinguish section keyword from identifier usage.
    // The lexer never emits Whitespace/NewLine tokens (they're skipped during tokenization).
    // See also: peekNextMeaningfulToken() which documents this invariant.
    if (type === TokenType.Code || type === TokenType.Controls) {
      return this.isFollowedByLeftBrace();
    }

    // All other section keywords are unambiguous
    return SECTION_KEYWORDS.has(type);
  }

  /**
   * Synchronize parser state after an error by advancing to a recovery point.
   * Recovery points are: section keywords, END, or end of input.
   */
  private synchronize(): void {
    const startToken = this.peek();
    let tokenCount = 0;
    // Remember the depth where the error occurred
    const errorDepth = this.braceDepth;

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

      const peekType = this.peek().type;

      // Stop at section keywords (centralized list)
      if (SECTION_KEYWORDS.has(peekType)) {
        if (tokenCount > 0) {
          this.recordSkippedRegion(startToken, this.previous(), tokenCount, 'Error recovery');
        }
        return;
      }

      // Stop at other structural tokens (not section keywords)
      switch (peekType) {
        case TokenType.Procedure:
        case TokenType.Function:
        case TokenType.Trigger:
        case TokenType.Begin:
        case TokenType.End:
        case TokenType.Var:
          if (tokenCount > 0) {
            this.recordSkippedRegion(startToken, this.previous(), tokenCount, 'Error recovery');
          }
          return;
        case TokenType.RightBrace:
          // Only stop at RightBrace if we're back to a level OUTSIDE the error context
          // If error occurred at depth N, we need to get back to depth < N to stop at RightBrace
          if (this.braceDepth < errorDepth) {
            // Record skipped region before returning
            if (tokenCount > 0) {
              this.recordSkippedRegion(startToken, this.previous(), tokenCount, 'Error recovery');
            }
            return;
          }
          break;
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
  constructor(message: string, public token: Token, public code: string = 'parse-error') {
    super(`${message} at line ${token.line}, column ${token.column}`);
    this.name = 'ParseError';
  }
}

/**
 * Specialized error thrown when parseCaseBranch() fails after parsing case values
 * but before/at the colon. Carries the already-parsed values so they can be preserved
 * in a partial CaseBranch node during error recovery.
 */
export class CaseBranchParseError extends ParseError {
  constructor(
    message: string,
    token: Token,
    public values: Expression[],
    public branchStartToken: Token,
    code: string = 'parse-error'
  ) {
    super(message, token, code);
    this.name = 'CaseBranchParseError';
  }
}

/**
 * Represents a region of tokens skipped during error recovery
 *
 * SECURITY WARNING: This interface contains raw, unsanitized token data.
 * - Both `startToken.value` and `endToken.value` contain raw source content
 * - MUST NEVER be serialized to LSP clients
 * - Safe for internal position/length calculations only
 *
 * See skipped-region-token-isolation.test.ts for the security boundary pattern.
 *
 * NOTE: getSkippedRegions() currently has no callers. Reserved for future
 * debugging and diagnostic tools.
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
 *
 * @deprecated Use parserTestHelpers.parseCode() for tests
 */
export function parseCode(code: string): { ast: CALDocument | null; errors: ParseError[] } {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const errors = parser.getErrors();
  return { ast, errors };
}
