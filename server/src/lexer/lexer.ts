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
  private static readonly MIN_TIME_DIGITS = 6;      // HHMMSS minimum

  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private contextStack: LexerContext[] = [LexerContext.NORMAL];
  private braceDepth: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input
   */
  public tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.contextStack = [LexerContext.NORMAL];
    this.braceDepth = 0;

    while (this.position < this.input.length) {
      this.scanToken();
    }

    this.tokens.push(this.createToken(TokenType.EOF, '', this.position, this.position));
    return this.tokens;
  }

  /**
   * Get current lexer context
   */
  private getCurrentContext(): LexerContext {
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * Push a new context onto the stack
   */
  private pushContext(context: LexerContext): void {
    this.contextStack.push(context);
  }

  /**
   * Pop the current context from the stack
   */
  private popContext(): void {
    if (this.contextStack.length > 1) {
      this.contextStack.pop();
    }
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
      // In CODE_BLOCK context, braces are comments
      if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
        this.scanBlockComment();
        return;
      }
      // Otherwise, they are structural delimiters
      this.advance();
      this.braceDepth++;
      this.addToken(TokenType.LeftBrace, ch, startPos, this.position, startLine, startColumn);

      // Push SECTION_LEVEL context when we see opening brace at object level
      if (this.getCurrentContext() === LexerContext.OBJECT_LEVEL && this.braceDepth === 1) {
        this.pushContext(LexerContext.SECTION_LEVEL);
      }
      return;
    }

    if (ch === '}') {
      // In CODE_BLOCK context, this closes a comment (handled by scanBlockComment)
      // Otherwise, it's a structural delimiter
      if (this.getCurrentContext() !== LexerContext.CODE_BLOCK) {
        this.advance();
        this.braceDepth--;
        this.addToken(TokenType.RightBrace, ch, startPos, this.position, startLine, startColumn);

        // Pop context when closing a section
        if (this.braceDepth === 0 && this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
          this.popContext();
        }
        return;
      }
    }

    // Quoted identifiers
    if (ch === '"') {
      this.scanQuotedIdentifier(startPos, startLine, startColumn);
      return;
    }

    // String literals (single quotes)
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

    while (this.position < this.input.length && this.currentChar() !== '"') {
      if (this.currentChar() === '\n' || this.currentChar() === '\r') {
        // Quoted identifiers shouldn't span multiple lines, but handle gracefully
        break;
      }
      value += this.currentChar();
      this.advance();
    }

    if (this.currentChar() === '"') {
      this.advance(); // consume closing "
    }

    this.addToken(TokenType.QuotedIdentifier, value, startPos, this.position, startLine, startColumn);
  }

  private scanString(startPos: number, startLine: number, startColumn: number): void {
    this.advance(); // consume opening '
    let value = '';

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
          break;
        }
      } else if (ch === '\n' || ch === '\r') {
        // Strings shouldn't span multiple lines
        break;
      } else {
        value += ch;
        this.advance();
      }
    }

    this.addToken(TokenType.String, value, startPos, this.position, startLine, startColumn);
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

        // Check if followed by time (DT format)
        if (this.isDigit(this.currentChar())) {
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
      // Time literal: HHMMSS[ms]T (at least 6 digits)
      const valueLength = value.length;
      if (valueLength >= Lexer.MIN_TIME_DIGITS) {
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
    const tokenType = KEYWORDS.get(lowerValue) || TokenType.Identifier;

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
    this.advance(); // consume {

    while (this.position < this.input.length) {
      if (this.currentChar() === '}') {
        this.advance();
        break;
      }

      if (this.currentChar() === '\n') {
        this.handleNewLine();
      } else {
        this.advance();
      }
    }
  }

  private scanCStyleComment(): void {
    this.advance(); // consume /
    this.advance(); // consume *

    while (this.position < this.input.length) {
      if (this.currentChar() === '*' && this.peek() === '/') {
        this.advance(); // consume *
        this.advance(); // consume /
        break;
      }

      if (this.currentChar() === '\n') {
        this.handleNewLine();
      } else {
        this.advance();
      }
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
