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

  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private readonly tokens: Token[] = [];
  private readonly contextStack: LexerContext[] = [LexerContext.NORMAL];
  private braceDepth: number = 0;
  private contextUnderflowDetected: boolean = false;

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
    if (this.getCurrentContext() === LexerContext.OBJECT_LEVEL && this.braceDepth === 1) {
      this.pushContext(LexerContext.SECTION_LEVEL);
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
      }
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
      const savedPos = this.position;
      const savedLine = this.line;
      const savedColumn = this.column;

      this.advance(); // skip '-'

      // Check if PROPERTIES follows
      let nextWord = '';
      while (this.isIdentifierPart(this.currentChar())) {
        nextWord += this.currentChar();
        this.advance();
      }

      if (nextWord.toUpperCase() === 'PROPERTIES') {
        // Found OBJECT-PROPERTIES, emit as single token
        this.addToken(TokenType.ObjectProperties, value + '-' + nextWord, startPos, this.position, startLine, startColumn);
        return;
      }

      // Not OBJECT-PROPERTIES, restore position and process OBJECT normally
      this.position = savedPos;
      this.line = savedLine;
      this.column = savedColumn;
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

    // Update context based on keywords
    this.updateContextForKeyword(tokenType);
  }

  /**
   * Update lexer context based on keyword tokens
   */
  private updateContextForKeyword(tokenType: TokenType): void {
    switch (tokenType) {
      case TokenType.Object:
        // After OBJECT keyword, we're at object level
        this.pushContext(LexerContext.OBJECT_LEVEL);
        break;

      case TokenType.Properties:
      case TokenType.Fields:
      case TokenType.Keys:
      case TokenType.FieldGroups:
      case TokenType.Code:
      case TokenType.Controls:
      case TokenType.Actions:
      case TokenType.DataItems:
      case TokenType.Elements:
      case TokenType.RequestForm:
        // Section keywords - prepare for section content
        // The actual SECTION_LEVEL context is pushed when we see the opening brace
        // For now, stay in OBJECT_LEVEL or current context
        break;

      case TokenType.Begin:
        // BEGIN starts a code block where braces are comments
        this.pushContext(LexerContext.CODE_BLOCK);
        break;

      case TokenType.End:
        // END closes a code block
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
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
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isIdentifierPart(ch: string): boolean {
    // Allow apostrophes in identifiers ONLY in SECTION_LEVEL context (property values)
    // AND only when they're truly part of a word (not starting a new string)
    // We check if the previous character (before the identifier started) was alphanumeric
    // to distinguish "word's" from "word '" (where ' should be a string delimiter)
    if (ch === "'" && this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
      // This apostrophe is part of an identifier being scanned, so allow it
      return true;
    }
    return this.isIdentifierStart(ch) || this.isDigit(ch);
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
