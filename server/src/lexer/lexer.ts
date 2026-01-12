import { Token, TokenType, KEYWORDS, AL_ONLY_KEYWORDS, AL_ONLY_ACCESS_MODIFIERS } from './tokens';

/**
 * Lexer context states for context-aware brace handling
 * C/AL uses { } for both structural delimiters and comments
 */
enum LexerContext {
  NORMAL,           // Default state
  OBJECT_LEVEL,     // After OBJECT keyword, before first section
  SECTION_LEVEL,    // Inside PROPERTIES/FIELDS/KEYS/FIELDGROUPS/CODE sections
  CODE_BLOCK,       // Inside BEGIN...END blocks (braces are comments here)
}

/**
 * Column position tracking for field definitions
 * Used to distinguish field name positions from property values
 *
 * Column meanings are section-specific:
 *
 * FIELDS: { FieldNo ; Reserved ; FieldName ; DataType ; Properties }
 *   COL_1-4: Structural columns (protect from BEGIN/END context changes)
 *   PROPERTIES: Field properties (allow triggers)
 *
 * KEYS: { ; FieldList ; Properties }
 *   COL_1-2: Structural columns (reserved ; field list)
 *   COL_3+: Properties section (allow triggers if they existed)
 *
 * CONTROLS: { ID ; Type ; SubType ; Properties }
 *   COL_1-3: Structural columns
 *   COL_4+: Properties section (allow triggers)
 */
enum FieldDefColumn {
  NONE,       // Not in field definition
  COL_1,      // FIELDS: FieldNo | KEYS: Reserved | CONTROLS: ID
  COL_2,      // FIELDS: Reserved | KEYS: FieldList | CONTROLS: Type
  COL_3,      // FIELDS: FieldName | KEYS: Properties start | CONTROLS: SubType
  COL_4,      // FIELDS: DataType | CONTROLS: Properties start
  PROPERTIES  // FIELDS: After DataType, in properties section
}

/**
 * Lexer for C/AL language
 */
export class Lexer {
  // Date/time literal validation constants
  private static readonly DATE_DIGITS_SHORT = 6;    // MMDDYY format
  private static readonly DATE_DIGITS_LONG = 8;     // MMDDYYYY format
  private static readonly UNDEFINED_DATE_DIGITS = 1; // 0D (undefined date)
  private static readonly UNDEFINED_DATE = '0D';    // Undefined date literal value
  private static readonly MIN_TIME_DIGITS = 6;      // HHMMSS minimum
  private static readonly MIN_CONTEXT_STACK_SIZE = 1; // Context stack minimum

  // Unicode range constants for extended Latin identifiers
  // NAV C/SIDE supports extended Latin characters (validated by multilingual.cal fixture)
  private static readonly LATIN_1_SUPPLEMENT_START = 0x00C0;  // À
  private static readonly LATIN_1_SUPPLEMENT_END = 0x00FF;    // ÿ
  private static readonly LATIN_EXTENDED_A_START = 0x0100;    // Ā
  private static readonly LATIN_EXTENDED_A_END = 0x017F;      // ſ
  // Excluded from identifiers: U+00D7 (×), U+00F7 (÷)

  /**
   * Property names that contain executable code (trigger properties).
   * These are the ONLY properties where BEGIN/END should enter CODE_BLOCK context.
   * Source: NAV 2013-2018 C/AL Language Reference
   */
  private static readonly TRIGGER_PROPERTIES: ReadonlySet<string> = new Set<string>([
    'oninsert', 'onmodify', 'ondelete', 'onrename',
    'onvalidate', 'onlookup',
    'onrun',
    'oninit', 'onopenpage', 'onclosepage', 'onfindrecord', 'onnextrecord',
    'onaftergetrecord', 'onnewrecord', 'oninsertrecord', 'onmodifyrecord',
    'ondeleterecord', 'onqueryclosepage', 'onaftergetcurrrecord', 'onactivate',
    'onaction', 'onassistedit', 'ondrilldown',
    'oninitreport', 'onprereport', 'onpostreport',
    'onpredataitem', 'onpostdataitem',
    'oninitxmlport', 'onprexmlport', 'onpostxmlport', 'onprexmlitem',
    'onafterassignfield', 'onbeforepassfield',
    'onafterassignvariable', 'onbeforepassvariable',
    'onafterinitrecord', 'onafterinsertrecord', 'onbeforeinsertrecord',
    'onbeforeopen',
  ]);

  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private readonly tokens: Token[] = [];
  private readonly contextStack: LexerContext[] = [LexerContext.NORMAL];
  private braceDepth: number = 0;
  private contextUnderflowDetected: boolean = false;

  // Property tracking for BEGIN/END context decisions
  private lastPropertyName: string = '';
  private inPropertyValue: boolean = false;

  // Track if we just saw a section keyword (FIELDS, PROPERTIES, etc.)
  private lastWasSectionKeyword: boolean = false;

  // Column position tracking for field definitions
  private currentSectionType: 'FIELDS' | 'KEYS' | 'CONTROLS' | null = null;
  private fieldDefColumn: FieldDefColumn = FieldDefColumn.NONE;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input
   */
  public tokenize(): Token[] {
    this.tokens.length = 0;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.contextStack.length = 0;
    this.contextStack.push(LexerContext.NORMAL);
    this.braceDepth = 0;
    // Reset property tracking state
    this.lastPropertyName = '';
    this.inPropertyValue = false;
    this.lastWasSectionKeyword = false;
    // Reset column tracking state
    this.currentSectionType = null;
    this.fieldDefColumn = FieldDefColumn.NONE;

    while (this.position < this.input.length) {
      this.scanToken();
    }

    this.tokens.push(this.createToken(TokenType.EOF, '', this.position, this.position));
    return this.tokens;
  }

  /**
   * Get current lexer context
   * Defensive: Returns NORMAL if stack is empty (should never happen in normal operation)
   */
  private getCurrentContext(): LexerContext {
    return this.contextStack[this.contextStack.length - 1] ?? LexerContext.NORMAL;
  }

  /**
   * Push a new context onto the stack
   */
  private pushContext(context: LexerContext): void {
    this.contextStack.push(context);
  }

  /**
   * Pop the current context from the stack
   * Sets contextUnderflowDetected flag if stack is at minimum size
   */
  private popContext(): void {
    if (this.contextStack.length > Lexer.MIN_CONTEXT_STACK_SIZE) {
      this.contextStack.pop();
    } else {
      this.contextUnderflowDetected = true;
    }
  }

  /**
   * Check if a property name is a trigger property (contains executable code).
   */
  private isTriggerProperty(propertyName: string): boolean {
    return Lexer.TRIGGER_PROPERTIES.has(propertyName.toLowerCase());
  }

  /**
   * Check if current column should be protected from BEGIN/END context changes.
   * Section-aware protection:
   * - FIELDS: Protect COL_1-4 (structural columns)
   * - KEYS: Protect COL_1-2 (structural columns)
   * - CONTROLS: Protect COL_1-3 (structural columns)
   */
  private shouldProtectFromBeginEnd(): boolean {
    if (this.fieldDefColumn === FieldDefColumn.NONE) {
      return false;
    }

    switch (this.currentSectionType) {
      case 'FIELDS':
        // Protect all structural columns (COL_1-4)
        return this.fieldDefColumn === FieldDefColumn.COL_1 ||
               this.fieldDefColumn === FieldDefColumn.COL_2 ||
               this.fieldDefColumn === FieldDefColumn.COL_3 ||
               this.fieldDefColumn === FieldDefColumn.COL_4;

      case 'KEYS':
        // Protect only COL_1-2 (reserved ; field list)
        // COL_3+ is properties section (allow triggers if they existed)
        return this.fieldDefColumn === FieldDefColumn.COL_1 ||
               this.fieldDefColumn === FieldDefColumn.COL_2;

      case 'CONTROLS':
        // Protect COL_1-3 (ID ; Type ; SubType)
        // COL_4+ is properties section (allow triggers)
        return this.fieldDefColumn === FieldDefColumn.COL_1 ||
               this.fieldDefColumn === FieldDefColumn.COL_2 ||
               this.fieldDefColumn === FieldDefColumn.COL_3;

      default:
        // No protection for unknown section types
        return false;
    }
  }

  /**
   * Scan left brace '{' - handles both structural delimiters and block comments
   * In CODE_BLOCK context, braces start comments; otherwise they are structural delimiters
   */
  private scanLeftBrace(startPos: number, startLine: number, startColumn: number): void {
    // In CODE_BLOCK context, braces are comments
    if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
      this.scanBlockComment();
      return;
    }
    // Otherwise, they are structural delimiters
    this.advance();
    this.braceDepth++;
    this.addToken(TokenType.LeftBrace, '{', startPos, this.position, startLine, startColumn);

    // Push SECTION_LEVEL context when we see opening brace at object level
    // OR when we just saw a section keyword (FIELDS, PROPERTIES, etc.)
    if ((this.getCurrentContext() === LexerContext.OBJECT_LEVEL && this.braceDepth === 1) ||
        this.lastWasSectionKeyword) {
      this.pushContext(LexerContext.SECTION_LEVEL);
      this.lastWasSectionKeyword = false;
    }

    // Start column tracking when opening a field/key/control definition
    if (this.getCurrentContext() === LexerContext.SECTION_LEVEL &&
        (this.currentSectionType === 'FIELDS' ||
         this.currentSectionType === 'KEYS' ||
         this.currentSectionType === 'CONTROLS')) {
      this.fieldDefColumn = FieldDefColumn.COL_1;
    }
  }

  /**
   * Scan right brace '}' - handles structural delimiters (not comments)
   * In CODE_BLOCK context, closing braces are part of block comments (handled by scanBlockComment)
   * @returns true if the brace was handled as a structural delimiter, false otherwise
   */
  private scanRightBrace(startPos: number, startLine: number, startColumn: number): boolean {
    // In CODE_BLOCK context, this closes a comment (handled by scanBlockComment)
    // Otherwise, it's a structural delimiter
    if (this.getCurrentContext() !== LexerContext.CODE_BLOCK) {
      this.advance();

      // Prevent negative braceDepth from unmatched closing braces
      if (this.braceDepth <= 0) {
        this.addToken(TokenType.Unknown, '}', startPos, this.position, startLine, startColumn);
        return true;
      }

      this.braceDepth--;
      this.addToken(TokenType.RightBrace, '}', startPos, this.position, startLine, startColumn);

      // Pop context when closing a section
      if (this.braceDepth === 0 && this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
        this.popContext();
        if (this.contextUnderflowDetected) {
          this.contextUnderflowDetected = false;
        }
        // Reset section tracking when exiting section context
        this.currentSectionType = null;
      }

      // Reset property tracking (standardized order: inPropertyValue first, then lastPropertyName)
      this.inPropertyValue = false;
      this.lastPropertyName = '';

      // Reset column tracking when closing a field definition
      this.fieldDefColumn = FieldDefColumn.NONE;

      return true;
    }
    return false;
  }

  private scanToken(): void {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    const ch = this.currentChar();

    // Skip whitespace (excluding newlines)
    if (this.isWhitespace(ch)) {
      this.skipWhitespace();
      return;
    }

    // Handle newlines
    if (ch === '\n' || ch === '\r') {
      this.handleNewLine();
      return;
    }

    // Comments
    if (ch === '/' && this.peek() === '/') {
      this.scanLineComment();
      return;
    }

    // C-style comments
    if (ch === '/' && this.peek() === '*') {
      this.scanCStyleComment();
      return;
    }

    // Handle braces based on context
    if (ch === '{') {
      this.scanLeftBrace(startPos, startLine, startColumn);
      return;
    }

    if (ch === '}') {
      if (this.scanRightBrace(startPos, startLine, startColumn)) {
        return;
      }
    }

    // Quoted identifiers
    if (ch === '"') {
      this.scanQuotedIdentifier(startPos, startLine, startColumn);
      return;
    }

    // String literals (single quotes)
    // Apostrophes can start string literals in most contexts
    // Apostrophes within identifiers (like "it's" or "contact's") are handled by isIdentifierPart()
    // The distinction is: if apostrophe starts a new token (after whitespace), it's a string
    // If apostrophe is during identifier scanning, it's part of the identifier (in SECTION_LEVEL)
    if (ch === "'") {
      this.scanString(startPos, startLine, startColumn);
      return;
    }

    // Numbers
    if (this.isDigit(ch)) {
      this.scanNumber(startPos, startLine, startColumn);
      return;
    }

    // Identifiers and keywords
    if (this.isIdentifierStart(ch)) {
      this.scanIdentifier(startPos, startLine, startColumn);
      return;
    }

    // Preprocessor directives (# at line start)
    if (ch === '#') {
      this.scanPreprocessorDirective(startPos, startLine, startColumn);
      return;
    }

    // Operators and punctuation
    this.scanOperatorOrPunctuation(startPos, startLine, startColumn);
  }

  private scanQuotedIdentifier(startPos: number, startLine: number, startColumn: number): void {
    this.advance(); // consume opening "
    let value = '';
    let closed = false;

    while (this.position < this.input.length && this.currentChar() !== '"') {
      if (this.currentChar() === '\n' || this.currentChar() === '\r') {
        // Unclosed quoted identifier - newline before closing quote
        break;
      }
      value += this.currentChar();
      this.advance();
    }

    if (this.currentChar() === '"') {
      this.advance(); // consume closing "
      closed = true;
    }

    // Emit Unknown token for unclosed quoted identifiers
    const tokenType = closed ? TokenType.QuotedIdentifier : TokenType.Unknown;
    this.addToken(tokenType, value, startPos, this.position, startLine, startColumn);
  }

  private scanString(startPos: number, startLine: number, startColumn: number): void {
    this.advance(); // consume opening '
    let value = '';
    let closed = false;

    while (this.position < this.input.length) {
      const ch = this.currentChar();

      if (ch === "'") {
        // Check for escaped quote ''
        if (this.peek() === "'") {
          value += "'";
          this.advance();
          this.advance();
        } else {
          // End of string
          this.advance();
          closed = true;
          break;
        }
      } else if (ch === '\n' || ch === '\r') {
        // Unclosed string - newline before closing quote
        break;
      } else {
        value += ch;
        this.advance();
      }
    }

    // Emit Unknown token for unclosed strings
    const tokenType = closed ? TokenType.String : TokenType.Unknown;
    this.addToken(tokenType, value, startPos, this.position, startLine, startColumn);
  }

  private scanNumber(startPos: number, startLine: number, startColumn: number): void {
    let value = '';
    let isDecimal = false;

    // Scan integer part
    while (this.isDigit(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    // Check for decimal point
    if (this.currentChar() === '.' && this.isDigit(this.peek())) {
      isDecimal = true;
      value += '.';
      this.advance();

      // Scan decimal part
      while (this.isDigit(this.currentChar())) {
        value += this.currentChar();
        this.advance();
      }
    }

    // Check for date/time literals (e.g., 010125D, 120000T, 010125DT120000T)
    // Date format: MMDDYY[YY]D (6 or 8 digits + D)
    // Time format: HHMMSS[ms]T (6+ digits + T)
    // DateTime format: date + time
    if (!isDecimal && this.currentChar() === 'D') {
      // Check if it's a date literal or datetime literal
      const valueLength = value.length;
      const isValidDateLength = valueLength === Lexer.DATE_DIGITS_SHORT ||
                                valueLength === Lexer.DATE_DIGITS_LONG ||
                                valueLength === Lexer.UNDEFINED_DATE_DIGITS;
      if (isValidDateLength) {
        value += this.currentChar();
        this.advance();

        // Check if followed by time (DT format) or undefined datetime (0DT)
        const isUndefinedDateTime = value === Lexer.UNDEFINED_DATE && this.currentChar() === 'T';
        if (this.isDigit(this.currentChar()) || isUndefinedDateTime) {
          // Scan time part
          while (this.isDigit(this.currentChar())) {
            value += this.currentChar();
            this.advance();
          }
          if (this.currentChar() === 'T') {
            value += this.currentChar();
            this.advance();
            this.addToken(TokenType.DateTime, value, startPos, this.position, startLine, startColumn);
            return;
          }
        }

        this.addToken(TokenType.Date, value, startPos, this.position, startLine, startColumn);
        return;
      }
    } else if (!isDecimal && this.currentChar() === 'T') {
      // Time literal: HHMMSS[ms]T (at least 6 digits) or 0T (undefined time)
      const valueLength = value.length;
      const isValidTimeLength = valueLength >= Lexer.MIN_TIME_DIGITS ||
                                valueLength === Lexer.UNDEFINED_DATE_DIGITS; // 0T is valid
      if (isValidTimeLength) {
        value += this.currentChar();
        this.advance();
        this.addToken(TokenType.Time, value, startPos, this.position, startLine, startColumn);
        return;
      }
    }

    const tokenType = isDecimal ? TokenType.Decimal : TokenType.Integer;
    this.addToken(tokenType, value, startPos, this.position, startLine, startColumn);
  }

  private scanIdentifier(startPos: number, startLine: number, startColumn: number): void {
    let value = '';

    while (this.isIdentifierPart(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    // Special case: Check for OBJECT-PROPERTIES compound keyword
    if (value.toUpperCase() === 'OBJECT' && this.currentChar() === '-') {
      if (this.tryCompoundToken(value, '-', 'PROPERTIES', TokenType.ObjectProperties, startPos, startLine, startColumn)) {
        return;
      }
    }

    // Special case: Check for Format/Evaluate compound property name
    // This is handled at lexer-level (not parser-level) because:
    // 1. It's a syntactic token, not semantic interpretation
    // 2. Matches existing OBJECT-PROPERTIES pattern
    // 3. Simplifies parser property name handling
    // Format/Evaluate is the ONLY C/AL property name containing '/' (XMLport-specific)
    if (value.toUpperCase() === 'FORMAT' && this.currentChar() === '/') {
      if (this.tryCompoundToken(value, '/', 'EVALUATE', TokenType.Identifier, startPos, startLine, startColumn)) {
        return;
      }
    }

    // Check if it's a keyword (case-insensitive)
    const lowerValue = value.toLowerCase();

    // Check AL-only keywords first (these should be rejected in C/AL)
    const alOnlyKeyword = AL_ONLY_KEYWORDS.get(lowerValue);
    if (alOnlyKeyword !== undefined) {
      this.addToken(alOnlyKeyword, value, startPos, this.position, startLine, startColumn);
      return;
    }

    // Check AL-only access modifiers (these should be rejected in C/AL)
    const alOnlyAccessModifier = AL_ONLY_ACCESS_MODIFIERS.get(lowerValue);
    if (alOnlyAccessModifier !== undefined) {
      this.addToken(alOnlyAccessModifier, value, startPos, this.position, startLine, startColumn);
      return;
    }

    // Check regular C/AL keywords
    let tokenType = KEYWORDS.get(lowerValue) || TokenType.Identifier;

    // Context-aware handling for data type keywords that can also be identifiers
    // Keywords like "Code", "Text", "Date", "Time", "RecordID", "Record", etc. can be:
    // 1. Section keywords (CODE section) or data type keywords
    // 2. Data types (Code[20], Text[50], Record 18, RecordID, etc.) - should REMAIN as keywords
    // 3. Identifiers/parameter names (Code@1001, RecordID@1000) - should become IDENTIFIER
    // We need to distinguish based on context
    const dataTypeKeywords = [
      TokenType.Code, TokenType.Text, TokenType.Date_Type, TokenType.Time,
      TokenType.RecordID, TokenType.RecordRef, TokenType.FieldRef,
      TokenType.Record, TokenType.Boolean, TokenType.Integer_Type,
      TokenType.Decimal_Type, TokenType.Code_Type, TokenType.Time_Type,
      TokenType.DateTime_Type, TokenType.BigInteger, TokenType.BigText,
      TokenType.BLOB, TokenType.GUID, TokenType.Duration, TokenType.Option,
      TokenType.Char, TokenType.Byte, TokenType.TextConst
    ];
    if (dataTypeKeywords.includes(tokenType)) {
      const nextChar = this.currentChar();
      const prevToken = this.tokens.length > 0 ? this.tokens[this.tokens.length - 1] : null;

      // Check if this is a parameter/variable NAME (followed by @number)
      // Pattern: "Code@1001" or ";Code@1001" or "(Code@1001"
      // In these cases, treat as IDENTIFIER
      if (nextChar === '@') {
        tokenType = TokenType.Identifier;
      }
      // If followed by '[' and preceded by a colon, it's a data type declaration like ": Code[20]"
      // Keep as keyword (don't convert to identifier)
      else if (nextChar === '[' && prevToken && prevToken.type === TokenType.Colon) {
        // This is a data type: keep as keyword
        // Example: "Param : Code[20]"
      }
      // If followed by '[' but NOT after colon, might be array access or other context
      // For safety, convert to identifier
      else if (nextChar === '[') {
        tokenType = TokenType.Identifier;
      }
      // For CODE specifically, check if it's a section header
      // CODE section would be at object level, not in parameter/variable contexts
      // The parser handles CODE { ... } correctly even if lexed as identifier
    }

    this.addToken(tokenType, value, startPos, this.position, startLine, startColumn);

    // Track identifier as potential property name for BEGIN/END context decisions
    // Only track at SECTION_LEVEL where properties exist - NOT in CODE_BLOCK where = is comparison
    // This prevents UNTIL x = 0 from corrupting property tracking state
    // NOTE: Context coupling is intentional - C/AL properties only exist in PROPERTIES/FIELDS/KEYS sections
    if (!this.inPropertyValue &&
        tokenType === TokenType.Identifier &&
        this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
      this.lastPropertyName = value;
    }

    // Reset section keyword flag for non-section identifiers
    // Section keywords (FIELDS, PROPERTIES, etc.) will re-set this flag in updateContextForKeyword()
    // This condition is always true here (scanIdentifier never produces LeftBrace), but prevents future bugs
    if (tokenType !== TokenType.LeftBrace) {
      this.lastWasSectionKeyword = false;
    }

    // Update context based on keywords
    this.updateContextForKeyword(tokenType);
  }

  /**
   * Update lexer context based on keyword tokens
   */
  private updateContextForKeyword(tokenType: TokenType): void {
    switch (tokenType) {
      case TokenType.Object:
        // Only push OBJECT_LEVEL when in NORMAL context (at document start)
        // Prevents "object" appearing in property values from corrupting context stack
        if (this.getCurrentContext() === LexerContext.NORMAL) {
          this.pushContext(LexerContext.OBJECT_LEVEL);
        }
        break;

      case TokenType.Fields:
        // Section keywords - mark that we're expecting a section
        // The actual SECTION_LEVEL context is pushed when we see the opening brace
        this.lastWasSectionKeyword = true;
        this.currentSectionType = 'FIELDS';
        break;

      case TokenType.Keys:
        this.lastWasSectionKeyword = true;
        this.currentSectionType = 'KEYS';
        break;

      case TokenType.Controls:
        this.lastWasSectionKeyword = true;
        this.currentSectionType = 'CONTROLS';
        break;

      case TokenType.Properties:
      case TokenType.FieldGroups:
      case TokenType.Code:
      case TokenType.Actions:
      case TokenType.DataItems:
      case TokenType.RequestForm:
        // Section keywords without column tracking
        this.lastWasSectionKeyword = true;
        this.currentSectionType = null;
        break;

      case TokenType.Begin:
        // Guard: Don't push CODE_BLOCK if BEGIN appears in structural columns
        // Section-aware protection:
        // - FIELDS: Protect COL_1-4 (structural)
        // - KEYS: Protect COL_1-2 (structural)
        // - CONTROLS: Protect COL_1-3 (structural)
        if (this.shouldProtectFromBeginEnd()) {
          // BEGIN is part of structure (likely in field/key/control name), not code
          break;
        }

        // Only push CODE_BLOCK for ACTUAL code blocks, not property values
        // If we're in a property value, only enter CODE_BLOCK if it's a trigger property
        if (this.inPropertyValue) {
          if (this.isTriggerProperty(this.lastPropertyName)) {
            this.pushContext(LexerContext.CODE_BLOCK);
          }
          // Otherwise: BEGIN is just a property value identifier, don't change context
        } else {
          // Not in property value - use original context-based logic
          const currentContext = this.getCurrentContext();
          if (currentContext === LexerContext.NORMAL ||
              currentContext === LexerContext.SECTION_LEVEL ||
              currentContext === LexerContext.CODE_BLOCK) {
            this.pushContext(LexerContext.CODE_BLOCK);
          }
        }
        break;

      case TokenType.End:
        // Guard: Don't pop CODE_BLOCK if END appears in structural columns
        // Section-aware protection (same logic as BEGIN)
        if (this.shouldProtectFromBeginEnd()) {
          // END is part of structure (likely in field/key/control name), not code
          break;
        }

        // Only pop CODE_BLOCK if we're actually in one
        // In property values for non-triggers, END is just an identifier value
        if (this.inPropertyValue && !this.isTriggerProperty(this.lastPropertyName)) {
          // END is just a property value, don't change context
        } else if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          this.popContext();
          this.contextUnderflowDetected = false;
        }
        break;
    }
  }

  private scanOperatorOrPunctuation(startPos: number, startLine: number, startColumn: number): void {
    const ch = this.currentChar();
    this.advance();

    switch (ch) {
      case '+':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.PlusAssign, '+=', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Plus, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case '-':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.MinusAssign, '-=', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Minus, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case '*':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.MultiplyAssign, '*=', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Multiply, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case '/':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.DivideAssign, '/=', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Divide, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case '=':
        this.addToken(TokenType.Equal, ch, startPos, this.position, startLine, startColumn);
        // Enter property value mode ONLY at SECTION_LEVEL
        // In CODE_BLOCK, = is a comparison operator, not property assignment
        // DEPENDENCY: lastPropertyName is set by scanIdentifier() when an identifier is scanned
        // Pattern: PropertyName = Value
        if (this.lastPropertyName !== '' &&
            this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
          this.inPropertyValue = true;
        }
        break;
      case '<':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.LessEqual, '<=', startPos, this.position, startLine, startColumn);
        } else if (this.currentChar() === '>') {
          this.advance();
          this.addToken(TokenType.NotEqual, '<>', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Less, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case '>':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.GreaterEqual, '>=', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Greater, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case '.':
        if (this.currentChar() === '.') {
          this.advance();
          this.addToken(TokenType.DotDot, '..', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Dot, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case ':':
        if (this.currentChar() === '=') {
          this.advance();
          this.addToken(TokenType.Assign, ':=', startPos, this.position, startLine, startColumn);
        } else if (this.currentChar() === ':') {
          this.advance();
          this.addToken(TokenType.DoubleColon, '::', startPos, this.position, startLine, startColumn);
        } else {
          this.addToken(TokenType.Colon, ch, startPos, this.position, startLine, startColumn);
        }
        break;
      case ';':
        this.addToken(TokenType.Semicolon, ch, startPos, this.position, startLine, startColumn);
        // End of property value
        this.inPropertyValue = false;
        this.lastPropertyName = '';
        // Advance column tracking
        if (this.fieldDefColumn !== FieldDefColumn.NONE) {
          switch (this.fieldDefColumn) {
            case FieldDefColumn.COL_1:
              this.fieldDefColumn = FieldDefColumn.COL_2;
              break;
            case FieldDefColumn.COL_2:
              this.fieldDefColumn = FieldDefColumn.COL_3;
              break;
            case FieldDefColumn.COL_3:
              this.fieldDefColumn = FieldDefColumn.COL_4;
              break;
            case FieldDefColumn.COL_4:
              this.fieldDefColumn = FieldDefColumn.PROPERTIES;
              break;
            // Stay in PROPERTIES after that
          }
        }
        break;
      case ',':
        this.addToken(TokenType.Comma, ch, startPos, this.position, startLine, startColumn);
        break;
      case '(':
        this.addToken(TokenType.LeftParen, ch, startPos, this.position, startLine, startColumn);
        break;
      case ')':
        this.addToken(TokenType.RightParen, ch, startPos, this.position, startLine, startColumn);
        break;
      case '[':
        this.addToken(TokenType.LeftBracket, ch, startPos, this.position, startLine, startColumn);
        break;
      case ']':
        this.addToken(TokenType.RightBracket, ch, startPos, this.position, startLine, startColumn);
        break;
      case '?':
        // Ternary operator is not supported in C/AL
        this.addToken(TokenType.TernaryOperator, ch, startPos, this.position, startLine, startColumn);
        break;
      default:
        this.addToken(TokenType.Unknown, ch, startPos, this.position, startLine, startColumn);
        break;
    }
  }

  private scanLineComment(): void {
    // Skip until end of line
    while (this.position < this.input.length && this.currentChar() !== '\n' && this.currentChar() !== '\r') {
      this.advance();
    }
  }

  private scanBlockComment(): void {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // consume {
    let closed = false;

    while (this.position < this.input.length) {
      if (this.currentChar() === '}') {
        this.advance();
        closed = true;
        break;
      }

      if (this.currentChar() === '\n') {
        this.handleNewLine();
      } else {
        this.advance();
      }
    }

    if (!closed) {
      this.addToken(TokenType.Unknown, '{', startPos, this.position, startLine, startColumn);
    }
  }

  private scanCStyleComment(): void {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // consume /
    this.advance(); // consume *
    let closed = false;

    while (this.position < this.input.length) {
      if (this.currentChar() === '*' && this.peek() === '/') {
        this.advance(); // consume *
        this.advance(); // consume /
        closed = true;
        break;
      }

      if (this.currentChar() === '\n') {
        this.handleNewLine();
      } else {
        this.advance();
      }
    }

    if (!closed) {
      this.addToken(TokenType.Unknown, '/*', startPos, this.position, startLine, startColumn);
    }
  }

  /**
   * Scan preprocessor directive (# followed by directive name)
   * Preprocessor directives are not supported in C/AL
   */
  private scanPreprocessorDirective(startPos: number, startLine: number, startColumn: number): void {
    let value = '';
    value += this.currentChar(); // include #
    this.advance();

    // Read the directive name (alphabetic characters only)
    while (this.isIdentifierPart(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    // Emit PreprocessorDirective token for any #directive pattern
    // Common AL preprocessor directives: #if, #else, #endif, #elif, #region, #endregion, #pragma
    this.addToken(TokenType.PreprocessorDirective, value, startPos, this.position, startLine, startColumn);
  }

  private skipWhitespace(): void {
    while (this.isWhitespace(this.currentChar())) {
      this.advance();
    }
  }

  private handleNewLine(): void {
    if (this.currentChar() === '\r' && this.peek() === '\n') {
      this.advance();
      this.advance();
    } else {
      this.advance();
    }
    this.line++;
    this.column = 1;
  }

  private isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t';
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentifierStart(ch: string): boolean {
    // ASCII fast path
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      return true;
    }
    // Extended Latin characters (for multilingual NAV identifiers)
    const code = ch.charCodeAt(0);
    return this.isExtendedLatinLetter(code);
  }

  private isIdentifierPart(ch: string): boolean {
    // Context-sensitive apostrophe handling
    if (ch === "'" && this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
      return true;
    }
    // ASCII fast path
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || this.isDigit(ch)) {
      return true;
    }
    // Extended Latin characters
    const code = ch.charCodeAt(0);
    return this.isExtendedLatinLetter(code);
  }

  /**
   * Check if character is an extended Latin letter (accented characters in European languages).
   * Includes Latin-1 Supplement (U+00C0-U+00FF) and Latin Extended-A (U+0100-U+017F).
   * Excludes math operators: × (U+00D7) and ÷ (U+00F7).
   * @param code The character code from charCodeAt()
   * @returns true if the character is a valid extended Latin letter for identifiers
   */
  private isExtendedLatinLetter(code: number): boolean {
    // Latin-1 Supplement: U+00C0-U+00FF (excluding × and ÷)
    if (code >= Lexer.LATIN_1_SUPPLEMENT_START && code <= Lexer.LATIN_1_SUPPLEMENT_END) {
      return code !== 0x00D7 && code !== 0x00F7;
    }
    // Latin Extended-A: U+0100-U+017F
    if (code >= Lexer.LATIN_EXTENDED_A_START && code <= Lexer.LATIN_EXTENDED_A_END) {
      return true;
    }
    return false;
  }

  private currentChar(): string {
    if (this.position >= this.input.length) {
      return '\0';
    }
    return this.input[this.position];
  }

  private peek(offset: number = 1): string {
    const pos = this.position + offset;
    if (pos >= this.input.length) {
      return '\0';
    }
    return this.input[pos];
  }

  private advance(): void {
    if (this.position < this.input.length) {
      this.position++;
      this.column++;
    }
  }

  /**
   * Try to recognize a compound token (e.g., OBJECT-PROPERTIES, Format/Evaluate)
   *
   * Uses lookahead with state restoration to check if the current position matches
   * a compound token pattern. If successful, emits the token and returns true.
   * If not, restores lexer state and returns false.
   *
   * @param firstWord - The first word already scanned (e.g., "OBJECT", "Format")
   * @param separator - The separator character (e.g., "-", "/")
   * @param expectedSecond - The expected second word (case-insensitive, e.g., "PROPERTIES", "EVALUATE")
   * @param tokenType - The token type to emit if match succeeds
   * @param startPos - Start position of the first word
   * @param startLine - Start line of the first word
   * @param startColumn - Start column of the first word
   * @returns true if compound token recognized and emitted, false otherwise
   */
  private tryCompoundToken(
    firstWord: string,
    separator: string,
    expectedSecond: string,
    tokenType: TokenType,
    startPos: number,
    startLine: number,
    startColumn: number
  ): boolean {
    // Save lexer state for potential restoration
    const savedPos = this.position;
    const savedLine = this.line;
    const savedColumn = this.column;

    this.advance(); // skip separator

    // Scan the next word
    let nextWord = '';
    while (this.isIdentifierPart(this.currentChar())) {
      nextWord += this.currentChar();
      this.advance();
    }

    // Check if it matches the expected second word (case-insensitive)
    if (nextWord.toUpperCase() === expectedSecond.toUpperCase()) {
      // Match! Emit compound token
      this.addToken(tokenType, firstWord + separator + nextWord, startPos, this.position, startLine, startColumn);
      return true;
    }

    // No match - restore lexer state and return false
    this.position = savedPos;
    this.line = savedLine;
    this.column = savedColumn;
    return false;
  }

  private addToken(
    type: TokenType,
    value: string,
    startOffset: number,
    endOffset: number,
    line: number,
    column: number
  ): void {
    this.tokens.push({
      type,
      value,
      line,
      column,
      startOffset,
      endOffset
    });
  }

  private createToken(
    type: TokenType,
    value: string,
    startOffset: number,
    endOffset: number
  ): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column,
      startOffset,
      endOffset
    };
  }

  /**
   * Get all tokens (for debugging)
   */
  public getTokens(): Token[] {
    return this.tokens;
  }
}
