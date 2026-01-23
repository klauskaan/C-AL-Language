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
  CASE_BLOCK,       // Inside CASE...END blocks (braces are comments here)
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
 *   COL_1-3: Structural columns (ID ; Type ; SubType)
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
 * Section types in C/AL object definitions.
 * Used for tracking current section context during tokenization.
 */
export type SectionType = 'FIELDS' | 'KEYS' | 'CONTROLS' | 'ELEMENTS' | 'DATAITEMS' | 'ACTIONS' | 'DATASET' | 'REQUESTPAGE' | 'LABELS';

/**
 * Categories of clean exit validation failures.
 * Used for categorizing what type of issue caused validation to fail.
 */
export enum ExitCategory {
  STACK_MISMATCH = 'stack-mismatch',
  UNBALANCED_BRACES = 'unbalanced-braces',
  UNBALANCED_BRACKETS = 'unbalanced-brackets',
  INCOMPLETE_PROPERTY = 'incomplete-property',
  INCOMPLETE_FIELD = 'incomplete-field',
  CONTEXT_UNDERFLOW = 'context-underflow'
}

/**
 * A single clean exit validation violation.
 */
export interface ExitViolation {
  /** Category of this violation */
  category: ExitCategory;
  /** Human-readable violation message */
  message: string;
  /** Expected value */
  expected: unknown;
  /** Actual value found */
  actual: unknown;
}

/**
 * Result of clean exit validation.
 * Contains all validation failures, not just the first one found.
 */
export interface CleanExitResult {
  /** Whether all exit criteria passed */
  passed: boolean;
  /** All validation violations (empty if passed) */
  violations: ExitViolation[];
  /** Set of unique failure categories (empty if passed) */
  categories: Set<ExitCategory>;
}

/**
 * Options for clean exit validation.
 */
export interface CleanExitOptions {
  /**
   * If true, ignores contextUnderflowDetected flag.
   * Use this ONLY when tokenizing Report objects that contain RDLDATA sections.
   *
   * WARNING: This option cannot distinguish between legitimate RDLDATA underflow
   * and actual parsing bugs. The caller must determine if the file being tokenized
   * is a Report object with an RDLDATA section before enabling this option.
   * See issue #98 for future object type tracking that would make this safer.
   */
  allowRdldataUnderflow?: boolean;
}

/**
 * Read-only snapshot of lexer internal state for validation and debugging.
 * Context and field column values are returned as strings (not enum values) for API stability.
 *
 * Example usage:
 * ```typescript
 * const lexer = new Lexer(code);
 * lexer.tokenize();
 * const state = lexer.getContextState();
 * console.log(state.contextStack); // ['NORMAL', 'OBJECT_LEVEL']
 * console.log(state.braceDepth); // 0
 * ```
 */
export interface LexerContextState {
  /** Context stack as string array (e.g., ['NORMAL', 'OBJECT_LEVEL', 'SECTION_LEVEL']) */
  contextStack: string[];
  /** Current brace nesting depth */
  braceDepth: number;
  /** Current bracket nesting depth */
  bracketDepth: number;
  /** Whether currently parsing a property value */
  inPropertyValue: boolean;
  /** Current field definition column position (e.g., 'NONE', 'COL_1', 'PROPERTIES') */
  fieldDefColumn: string;
  /** Current section type (FIELDS, KEYS, CONTROLS, etc.) or null */
  currentSectionType: SectionType | null;
  /** Whether a context stack underflow was detected during tokenization */
  contextUnderflowDetected: boolean;
  /**
   * Type of the first object in the file (TABLE, CODEUNIT, PAGE, etc.) or null if no OBJECT keyword found.
   * For files with multiple objects, this reflects the first object only.
   * When called during tokenization, may be null until after the type token is processed.
   *
   * Known limitation: Returns null when curly braces appear between OBJECT and the type keyword
   * (e.g., `OBJECT { ... } Table 18`) because the opening brace is interpreted as the object body
   * delimiter rather than a comment. This edge case does not occur in practice as C/SIDE never
   * generates exports with this pattern.
   */
  objectType: 'TABLE' | 'CODEUNIT' | 'PAGE' | 'REPORT' | 'QUERY' | 'XMLPORT' | 'MENUSUITE' | null;
}

/**
 * Options for Lexer construction.
 * All properties are optional to maintain backward compatibility.
 */
export interface LexerOptions {
  /**
   * Optional trace callback for debugging.
   * When provided, receives events for every lexer decision.
   *
   * REENTRANCY: Callbacks MUST NOT call `tokenize()` on the same Lexer instance
   * that is currently executing. Violations throw an error immediately.
   *
   * EXCEPTION HANDLING: If the callback throws (except for reentrancy violations),
   * it will be disabled for the remainder of tokenization (fail-once behavior).
   * Handle errors within your callback if you need them reported.
   *
   * PERFORMANCE: The callback is only invoked when provided.
   * No object construction occurs when tracing is disabled.
   *
   * @see TraceCallback for full documentation and examples
   */
  trace?: TraceCallback;
}

/**
 * Callback function type for trace events emitted during lexical analysis.
 *
 * REENTRANCY CONSTRAINTS
 * ----------------------
 * Callbacks MUST NOT call `tokenize()` on the SAME Lexer instance that is currently
 * executing tokenization. This is enforced with a runtime guard that throws an error
 * if violated.
 *
 * The reentrancy guard is INSTANCE-BASED, not global. Multiple Lexer instances can
 * tokenize concurrently, even within callbacks from other instances.
 *
 * PROHIBITED OPERATIONS
 * ---------------------
 * - Calling `tokenize()` on the same Lexer instance (throws error)
 * - Modifying the Lexer's source text during tokenization (undefined behavior)
 *
 * PERMITTED OPERATIONS
 * --------------------
 * - Creating new Lexer instances and calling `tokenize()` on them
 * - Calling `tokenize()` on DIFFERENT Lexer instances (concurrent tokenization)
 * - Logging events to console, files, or streams
 * - Accumulating events in arrays or other data structures
 * - Performing synchronous analysis of event data
 * - Reading (but not modifying) the Lexer's public state
 *
 * SAME VS DIFFERENT INSTANCE BEHAVIOR
 * -----------------------------------
 * ```typescript
 * const lexer1 = new Lexer('source1');
 * const lexer2 = new Lexer('source2');
 *
 * // ❌ INVALID: Reentrancy on same instance
 * const lexer1 = new Lexer('source1', {
 *   trace: (event) => {
 *     lexer1.tokenize(); // THROWS ERROR
 *   }
 * });
 * lexer1.tokenize();
 *
 * // ✅ VALID: Different instance
 * const lexer1 = new Lexer('source1', {
 *   trace: (event) => {
 *     lexer2.tokenize(); // OK - different instance
 *   }
 * });
 * lexer1.tokenize();
 *
 * // ✅ VALID: New instance
 * const lexer1 = new Lexer('source1', {
 *   trace: (event) => {
 *     const temp = new Lexer('temp source');
 *     temp.tokenize(); // OK - new instance
 *   }
 * });
 * lexer1.tokenize();
 * ```
 *
 * SYNCHRONOUS EXECUTION
 * ---------------------
 * Callbacks SHOULD complete synchronously for best reliability. The lexer does
 * NOT await async callbacks - they execute as fire-and-forget.
 *
 * If you need async operations:
 * - Collect events in the callback (synchronously)
 * - Process them asynchronously after `tokenize()` returns
 *
 * ASYNC CALLBACK SUPPORT
 * ----------------------
 * Returning `Promise<void>` is supported for fire-and-forget use cases (telemetry,
 * async logging). However, tokenization does NOT wait for these promises to settle.
 *
 * - Promise rejections are caught and handled gracefully
 * - The callback is disabled after the first rejection (fail-once semantics)
 * - Rejections are logged via `console.warn`
 * - Session tracking prevents stale rejections from affecting subsequent tokenizations
 *
 * Example:
 * ```typescript
 * const lexer = new Lexer(source, {
 *   trace: async (event) => {
 *     await sendToTelemetry(event); // Fire-and-forget, errors caught
 *   }
 * });
 * lexer.tokenize(); // Returns immediately, doesn't wait for telemetry
 * ```
 *
 * EXCEPTION HANDLING
 * ------------------
 * - Reentrancy violations: Error is thrown immediately, halting tokenization
 * - Sync exceptions: Callback is disabled for the remainder of tokenization
 * - Async rejections: Callback is disabled, logged via console.warn (no halt)
 * - Disabled callbacks: No further events are delivered, tokenization continues
 *
 * If your callback throws (except for reentrancy violations), it will be silently
 * disabled to prevent cascading failures. Ensure your callback handles its own
 * errors if you need them reported.
 *
 * EXAMPLES
 * --------
 *
 * Example 1: Simple event logging (CORRECT)
 * ```typescript
 * const events: TraceEvent[] = [];
 * const lexer = new Lexer(source, {
 *   trace: (event) => {
 *     events.push(event); // Safe: accumulating data
 *     console.log(event.type); // Safe: logging
 *   }
 * });
 * lexer.tokenize();
 * ```
 *
 * Example 2: Analyzing nested code (CORRECT)
 * ```typescript
 * const lexer = new Lexer(source, {
 *   trace: (event) => {
 *     if (event.type === 'token' && event.data.value === 'BEGIN') {
 *       // Safe: new instance for nested analysis
 *       const nestedLexer = new Lexer(nestedSource);
 *       nestedLexer.tokenize();
 *     }
 *   }
 * });
 * lexer.tokenize();
 * ```
 *
 * Example 3: Reentrancy violation (INCORRECT)
 * ```typescript
 * const lexer = new Lexer(source, {
 *   trace: (event) => {
 *     // ❌ ERROR: Cannot call tokenize() on same instance
 *     lexer.tokenize();
 *     // Throws: "Lexer reentrancy violation: Cannot call tokenize()
 *     //          while tokenization is already in progress on this instance"
 *   }
 * });
 * lexer.tokenize();
 * ```
 *
 * Example 4: Exception handling (CORRECT)
 * ```typescript
 * const lexer = new Lexer(source, {
 *   trace: (event) => {
 *     try {
 *       // Your analysis that might throw
 *       analyzeEvent(event);
 *     } catch (error) {
 *       // Handle error to prevent callback from being disabled
 *       console.error('Analysis failed:', error);
 *     }
 *   }
 * });
 * lexer.tokenize();
 * ```
 *
 * @param event - The trace event containing type, position, and event-specific data
 *
 * @see TraceEvent for event structure
 * @see TraceEventType for available event types
 * @see LexerOptions.trace for how to provide a callback
 */
export type TraceCallback = (event: TraceEvent) => void | Promise<void>;

/**
 * Trace event types emitted by the lexer.
 * - 'token': A token was emitted
 * - 'context-push': Context was pushed onto stack
 * - 'context-pop': Context was popped from stack
 * - 'flag-change': A tracking flag changed value
 * - 'skip': Content was skipped (whitespace, comments)
 * - 'attempt-failed': A compound token match attempt failed
 */
export type TraceEventType = 'token' | 'context-push' | 'context-pop' | 'flag-change' | 'skip' | 'attempt-failed';

/**
 * A trace event emitted during tokenization.
 */
export interface TraceEvent {
  /** Event type */
  type: TraceEventType;
  /** Position in source where event occurred */
  position: { line: number; column: number; offset: number };
  /** Event-specific data */
  data: Record<string, unknown>;
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
  private objectTokenIndex: number = -1;

  // Property tracking for BEGIN/END context decisions
  private lastPropertyName: string = '';
  private inPropertyValue: boolean = false;
  private bracketDepth: number = 0;

  // Track if we just saw a section keyword (FIELDS, PROPERTIES, etc.)
  private lastWasSectionKeyword: boolean = false;

  /** Optional trace callback - null/undefined means tracing disabled */
  private traceCallback?: TraceCallback;

  /**
   * True if trace callback threw an exception during this tokenization run.
   * Reset at the start of each tokenize() call (fail-once per tokenization).
   */
  private traceCallbackDisabled: boolean = false;

  /** Monotonically increasing session ID to detect stale async rejections */
  private tokenizationSessionId: number = 0;

  /**
   * Reentrancy guard to prevent tokenize() from being called recursively on this instance.
   * This typically occurs when a trace callback calls tokenize() on the same Lexer instance.
   */
  private isTokenizing: boolean = false;

  // Column position tracking for field definitions
  private currentSectionType: 'FIELDS' | 'KEYS' | 'CONTROLS' | 'ELEMENTS' | 'DATAITEMS' | 'ACTIONS' | 'DATASET' | 'REQUESTPAGE' | 'LABELS' | null = null;
  private fieldDefColumn: FieldDefColumn = FieldDefColumn.NONE;

  /**
   * Create a new Lexer instance.
   * @param input - The source code to tokenize
   * @param options - Optional configuration (trace callback, etc.)
   */
  constructor(input: string, options?: LexerOptions) {
    this.input = input;
    this.traceCallback = options?.trace;
  }

  /**
   * Tokenize the entire input
   */
  public tokenize(): Token[] {
    if (this.isTokenizing) {
      throw new Error(
        'Lexer reentrancy violation: Cannot call tokenize() while tokenization is already in progress on this instance. ' +
        'This typically occurs when a trace callback calls tokenize() on the same Lexer instance. ' +
        'To analyze other code within a callback, create a new Lexer instance instead.'
      );
    }
    this.isTokenizing = true;

    try {
      // Increment session ID to invalidate any pending async rejections
      this.tokenizationSessionId++;

      // Reset trace callback state for fresh tokenization
      this.traceCallbackDisabled = false;

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
      this.bracketDepth = 0;
      this.lastWasSectionKeyword = false;
      // Reset column tracking state
      this.currentSectionType = null;
      this.fieldDefColumn = FieldDefColumn.NONE;
      // Reset context underflow flag
      this.contextUnderflowDetected = false;
      // Reset object token index
      this.objectTokenIndex = -1;

      while (this.position < this.input.length) {
        this.scanToken();
      }

      // Clean up any remaining contexts at end of tokenization
      // Well-formed C/AL objects should end with context stack = ['NORMAL']
      // For well-formed code: OBJECT_LEVEL and outer SECTION_LEVEL are structural contexts
      // that don't get explicitly popped, so clean them up here
      // For malformed code: inner SECTION_LEVELs (unclosed sections) will remain and trigger
      // STACK_MISMATCH violations in isCleanExit()
      while (this.contextStack.length > 1 &&
             (this.contextStack[this.contextStack.length - 1] === LexerContext.OBJECT_LEVEL ||
              (this.contextStack[this.contextStack.length - 1] === LexerContext.SECTION_LEVEL &&
               this.braceDepth === 0))) {
        this.popContext();
      }

      this.invokeTraceCallback(() => ({
        type: 'token',
        position: { line: this.line, column: this.column, offset: this.position },
        data: { tokenType: 'EOF', value: '' }
      }));

      this.tokens.push(this.createToken(TokenType.EOF, '', this.position, this.position));
      return this.tokens;
    } finally {
      this.isTokenizing = false;
    }
  }

  /**
   * Get current lexer context
   * Defensive: Returns NORMAL if stack is empty (should never happen in normal operation)
   */
  private getCurrentContext(): LexerContext {
    return this.contextStack[this.contextStack.length - 1] ?? LexerContext.NORMAL;
  }

  /**
   * Check if we're in a code execution context where braces are comments
   * @returns true if in CODE_BLOCK or CASE_BLOCK
   */
  private isInCodeContext(): boolean {
    const context = this.getCurrentContext();
    return context === LexerContext.CODE_BLOCK || context === LexerContext.CASE_BLOCK;
  }

  /**
   * Handle errors from trace callback invocations.
   * Reentrancy violations are rethrown to halt tokenization.
   * Other errors disable the callback for the remainder of tokenization.
   */
  private handleTraceCallbackError(error: unknown): void {
    // Reentrancy violations should propagate and halt tokenization
    if (error instanceof Error && error.message.includes('reentrancy violation')) {
      throw error;
    }
    this.traceCallbackDisabled = true;
    // Inline try-catch chosen over helper per #118 discussion - keeps error handling explicit
    try {
      console.warn('Trace callback threw an exception and has been disabled for this tokenization:', error);
    } catch {
      // If console.warn itself throws, silently ignore - nothing more we can do
    }
  }

  /**
   * Handle async rejection from a trace callback.
   * Validates session ID to prevent race conditions when tokenize() is called
   * multiple times while async callbacks are pending.
   *
   * Unlike sync errors, async rejections with "reentrancy violation" messages
   * are NOT rethrown - the tokenization that could have been halted has
   * already completed by the time the rejection arrives.
   *
   * @param error - The rejection reason
   * @param sessionId - The session ID when the callback was invoked
   */
  private handleAsyncRejection(error: unknown, sessionId: number): void {
    // Stale rejection from previous tokenization - ignore silently
    if (sessionId !== this.tokenizationSessionId) {
      return;
    }

    // Already disabled by a previous rejection in this session - ignore
    if (this.traceCallbackDisabled) {
      return;
    }

    this.traceCallbackDisabled = true;
    // Inline try-catch chosen over helper per #118 discussion - keeps error handling explicit
    try {
      console.warn('Async trace callback rejected and has been disabled for this tokenization:', error);
    } catch {
      // If console.warn itself throws, silently ignore - nothing more we can do
    }
  }

  /**
   * Safely invoke the trace callback with lazy event construction.
   * Handles both sync exceptions and async rejections.
   *
   * @param eventFactory - Factory function that constructs the event (called only if callback enabled)
   */
  private invokeTraceCallback(eventFactory: () => TraceEvent): void {
    if (!this.traceCallback || this.traceCallbackDisabled) {
      return;
    }

    const sessionId = this.tokenizationSessionId;

    try {
      const event = eventFactory();
      const result = this.traceCallback(event);

      // Check for thenable (Promise-like) return value
      // Use Promise.resolve() to normalize any thenable to a proper Promise
      if (result != null && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
        Promise.resolve(result).catch((error) => {
          this.handleAsyncRejection(error, sessionId);
        });
      }
    } catch (error) {
      this.handleTraceCallbackError(error);
    }
  }

  /**
   * Push a new context onto the stack
   */
  private pushContext(context: LexerContext): void {
    const from = this.contextToString(this.getCurrentContext());
    this.contextStack.push(context);

    this.invokeTraceCallback(() => ({
      type: 'context-push',
      position: { line: this.line, column: this.column, offset: this.position },
      data: { from, to: this.contextToString(context) }
    }));
  }

  /**
   * Pop the current context from the stack
   * Sets contextUnderflowDetected flag if stack is at minimum size
   */
  private popContext(): void {
    if (this.contextStack.length > Lexer.MIN_CONTEXT_STACK_SIZE) {
      const from = this.contextToString(this.getCurrentContext());
      this.contextStack.pop();

      this.invokeTraceCallback(() => ({
        type: 'context-pop',
        position: { line: this.line, column: this.column, offset: this.position },
        data: { from, to: this.contextToString(this.getCurrentContext()) }
      }));
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
   * - ELEMENTS: Protect COL_1-4 (structural columns)
   * - DATAITEMS: Protect COL_1-4 (structural columns)
   * - ACTIONS: TBD - needs column investigation
   */
  private shouldProtectFromBeginEnd(): boolean {
    if (this.fieldDefColumn === FieldDefColumn.NONE) {
      return false;
    }

    switch (this.currentSectionType) {
      case 'FIELDS':
      case 'ELEMENTS':
      case 'DATAITEMS':
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
      case 'ACTIONS':
        // Protect COL_1-3 (ID ; Type ; SubType/ActionType)
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
   * Check if current column should be protected from section keyword context changes.
   * Prevents section keywords (PROPERTIES, FIELDGROUPS, CODE, etc.) appearing in
   * structural columns from corrupting lexer context.
   * Section-aware protection:
   * - FIELDS: Protect COL_1-4 (structural columns)
   * - KEYS: Protect COL_1-2 (structural columns)
   * - CONTROLS: Protect COL_1-3 (structural columns)
   * - ELEMENTS: Protect COL_1-4 (structural columns)
   * - DATAITEMS: Protect COL_1-4 (structural columns)
   * - ACTIONS: Protect COL_1-3 (structural columns)
   */
  private shouldProtectFromSectionKeyword(): boolean {
    if (this.fieldDefColumn === FieldDefColumn.NONE) {
      return false;
    }

    switch (this.currentSectionType) {
      case 'FIELDS':
      case 'ELEMENTS':
      case 'DATAITEMS':
        // Protect all structural columns (COL_1-4)
        return this.fieldDefColumn === FieldDefColumn.COL_1 ||
               this.fieldDefColumn === FieldDefColumn.COL_2 ||
               this.fieldDefColumn === FieldDefColumn.COL_3 ||
               this.fieldDefColumn === FieldDefColumn.COL_4;

      case 'KEYS':
        // Protect only COL_1-2 (reserved ; field list)
        return this.fieldDefColumn === FieldDefColumn.COL_1 ||
               this.fieldDefColumn === FieldDefColumn.COL_2;

      case 'CONTROLS':
      case 'ACTIONS':
        // Protect COL_1-3 (ID ; Type ; SubType/ActionType)
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
   * In CODE_BLOCK or CASE_BLOCK context, braces start comments; otherwise they are structural delimiters
   */
  private scanLeftBrace(startPos: number, startLine: number, startColumn: number): void {
    // In code execution contexts, braces are comments
    if (this.isInCodeContext()) {
      this.scanBlockComment();
      return;
    }
    // Otherwise, they are structural delimiters
    this.advance();
    const oldBraceDepth = this.braceDepth;
    this.braceDepth++;
    this.invokeTraceCallback(() => ({
      type: 'flag-change',
      position: { line: startLine, column: startColumn, offset: startPos },
      data: { flag: 'braceDepth', from: oldBraceDepth, to: this.braceDepth }
    }));
    this.addToken(TokenType.LeftBrace, '{', startPos, this.position, startLine, startColumn);

    // Push SECTION_LEVEL context when we see opening brace at object level
    // OR when we just saw a section keyword (FIELDS, PROPERTIES, etc.)
    if ((this.getCurrentContext() === LexerContext.OBJECT_LEVEL && this.braceDepth === 1) ||
        this.lastWasSectionKeyword) {
      this.pushContext(LexerContext.SECTION_LEVEL);
      this.lastWasSectionKeyword = false;
    }

    // Start column tracking when opening a field/key/control/element/dataitem/action definition
    // ONLY if we're not already in one (prevents nested braces from resetting column tracking)
    if (this.getCurrentContext() === LexerContext.SECTION_LEVEL &&
        this.fieldDefColumn === FieldDefColumn.NONE &&
        (this.currentSectionType === 'FIELDS' ||
         this.currentSectionType === 'KEYS' ||
         this.currentSectionType === 'CONTROLS' ||
         this.currentSectionType === 'ELEMENTS' ||
         this.currentSectionType === 'DATAITEMS' ||
         this.currentSectionType === 'ACTIONS')) {
      const oldFieldDefColumn = this.fieldDefColumn;
      this.fieldDefColumn = FieldDefColumn.COL_1;
      this.invokeTraceCallback(() => ({
        type: 'flag-change',
        position: { line: startLine, column: startColumn, offset: startPos },
        data: { flag: 'fieldDefColumn', from: this.fieldDefColumnToString(oldFieldDefColumn), to: 'COL_1' }
      }));
    }
  }

  /**
   * Scan right brace '}' - handles structural delimiters (not comments)
   * In CODE_BLOCK or CASE_BLOCK context, closing braces are part of block comments (handled by scanBlockComment)
   * @returns true if the brace was handled as a structural delimiter, false otherwise
   */
  private scanRightBrace(startPos: number, startLine: number, startColumn: number): boolean {
    // In code execution contexts, this closes a comment (handled by scanBlockComment)
    // Otherwise, it's a structural delimiter
    if (!this.isInCodeContext()) {
      this.advance();

      // Prevent negative braceDepth from unmatched closing braces
      if (this.braceDepth <= 0) {
        this.addToken(TokenType.Unknown, '}', startPos, this.position, startLine, startColumn);
        return true;
      }

      const oldBraceDepth = this.braceDepth;
      this.braceDepth--;
      this.invokeTraceCallback(() => ({
        type: 'flag-change',
        position: { line: startLine, column: startColumn, offset: startPos },
        data: { flag: 'braceDepth', from: oldBraceDepth, to: this.braceDepth }
      }));
      this.addToken(TokenType.RightBrace, '}', startPos, this.position, startLine, startColumn);

      // Pop context when closing a section
      if (this.braceDepth === 0 && this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
        this.popContext();
        // Reset section tracking when exiting section context
        const oldSectionType = this.currentSectionType;
        this.currentSectionType = null;
        if (oldSectionType !== null) {
          this.invokeTraceCallback(() => ({
            type: 'flag-change',
            position: { line: startLine, column: startColumn, offset: startPos },
            data: { flag: 'currentSectionType', from: oldSectionType, to: null }
          }));
        }
      }

      // Reset property tracking (standardized order: inPropertyValue first, then lastPropertyName)
      const oldInPropertyValue = this.inPropertyValue;
      const oldLastPropertyName = this.lastPropertyName;
      const oldBracketDepth = this.bracketDepth;
      this.inPropertyValue = false;
      this.lastPropertyName = '';
      this.bracketDepth = 0;
      if (oldInPropertyValue !== false) {
        this.invokeTraceCallback(() => ({
          type: 'flag-change',
          position: { line: startLine, column: startColumn, offset: startPos },
          data: { flag: 'inPropertyValue', from: oldInPropertyValue, to: false }
        }));
      }
      if (oldLastPropertyName !== '') {
        this.invokeTraceCallback(() => ({
          type: 'flag-change',
          position: { line: startLine, column: startColumn, offset: startPos },
          data: { flag: 'lastPropertyName', from: oldLastPropertyName, to: '' }
        }));
      }
      if (oldBracketDepth !== 0) {
        this.invokeTraceCallback(() => ({
          type: 'flag-change',
          position: { line: startLine, column: startColumn, offset: startPos },
          data: { flag: 'bracketDepth', from: oldBracketDepth, to: 0 }
        }));
      }

      // Reset column tracking when closing a field definition
      const oldFieldDefColumn = this.fieldDefColumn;
      this.fieldDefColumn = FieldDefColumn.NONE;
      if (oldFieldDefColumn !== FieldDefColumn.NONE) {
        this.invokeTraceCallback(() => ({
          type: 'flag-change',
          position: { line: startLine, column: startColumn, offset: startPos },
          data: { flag: 'fieldDefColumn', from: this.fieldDefColumnToString(oldFieldDefColumn), to: 'NONE' }
        }));
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
        // Multi-line strings are valid in C/AL - consume newline and track position
        // Note: Cannot use handleNewLine() here because we need to capture newline chars in value
        // Handle CRLF as a single logical newline
        if (ch === '\r' && this.peek() === '\n') {
          value += '\r\n';
          this.advance();
          this.advance();
        } else {
          value += ch;
          this.advance();
        }
        this.line++;
        this.column = 1;
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
      TokenType.Decimal_Type, TokenType.Time_Type,
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
      // Check if we're in a data type context (not a parameter name)
      else {
        // Determine if this is a data type position:
        // 1. After colon: "Param : Code[20]" or "VAR x : Code;"
        // 2. After OF keyword: "ARRAY[10] OF Code[20]"
        // 3. In FIELDS section at COL_4: "{ 1 ; ; FieldName ; Code[10] }"
        const isAfterColon = prevToken && prevToken.type === TokenType.Colon;
        const isAfterOf = prevToken && prevToken.type === TokenType.Of;
        const isFieldDataType = this.currentSectionType === 'FIELDS' && this.fieldDefColumn === FieldDefColumn.COL_4;
        const isInDataTypeContext = isAfterColon || isAfterOf || isFieldDataType;

        if (isInDataTypeContext) {
          // This is a data type usage, not a section keyword or identifier
          // For Code specifically, upgrade to Code_Type
          if (tokenType === TokenType.Code) {
            tokenType = TokenType.Code_Type;
          }
          // Keep other data type keywords as-is
        }
        // If followed by '[' but NOT in data type context, might be array access
        // For safety, convert to identifier
        else if (nextChar === '[') {
          tokenType = TokenType.Identifier;
        }
        // Otherwise, let it fall through to section keyword downgrade logic below
      }
    }

    // Downgrade section keywords to identifiers when used as parameter/variable names
    // Pattern: "Dataset@1000", "RequestPage@1001", "Labels@1002" in VAR/PARAMETER sections
    // These should be IDENTIFIER, not section keywords
    const reportSectionKeywords = [
      TokenType.Dataset, TokenType.RequestPage, TokenType.Labels
    ];
    if (reportSectionKeywords.includes(tokenType) && this.currentChar() === '@') {
      tokenType = TokenType.Identifier;
    }

    // Downgrade section keywords to identifiers when in protected columns, inside brackets, or in CODE_BLOCK
    // Prevents section keywords in field/key/control names, ML property values, or code blocks from corrupting context
    const sectionKeywords = [
      TokenType.Code, TokenType.Properties, TokenType.FieldGroups,
      TokenType.Actions, TokenType.DataItems, TokenType.Elements, TokenType.RequestForm,
      TokenType.Dataset, TokenType.RequestPage, TokenType.Labels
    ];
    if (sectionKeywords.includes(tokenType) &&
        (this.shouldProtectFromSectionKeyword() ||
         this.bracketDepth > 0 ||
         this.isInCodeContext())) {
      tokenType = TokenType.Identifier;
    }

    // Downgrade BEGIN/END to identifiers when inside brackets OR in non-trigger property values
    // Prevents BEGIN/END in property values (e.g., InitValue=Begin or OptionCaptionML=[ENU=Begin,End]) from being treated as code delimiters
    // BUT: Keep BEGIN/END as keywords for:
    // - Trigger properties (OnInsert, OnModify, etc.) where they delimit code blocks
    // - CODE_BLOCK context (actual code, not property values)
    if ((tokenType === TokenType.Begin || tokenType === TokenType.End) &&
        (this.bracketDepth > 0 ||
         (this.inPropertyValue &&
          !this.isTriggerProperty(this.lastPropertyName) &&
          this.getCurrentContext() !== LexerContext.CODE_BLOCK))) {
      tokenType = TokenType.Identifier;
    }

    this.addToken(tokenType, value, startPos, this.position, startLine, startColumn);

    // Track identifier as potential property name for BEGIN/END context decisions
    // Only track at SECTION_LEVEL where properties exist - NOT in CODE_BLOCK where = is comparison
    // This prevents UNTIL x = 0 from corrupting property tracking state
    // NOTE: Context coupling is intentional - C/AL properties only exist in PROPERTIES/FIELDS/KEYS sections
    if (!this.inPropertyValue &&
        tokenType === TokenType.Identifier &&
        this.getCurrentContext() === LexerContext.SECTION_LEVEL) {
      const oldLastPropertyName = this.lastPropertyName;
      this.lastPropertyName = value;
      if (oldLastPropertyName !== value) {
        this.invokeTraceCallback(() => ({
          type: 'flag-change',
          position: { line: startLine, column: startColumn, offset: startPos },
          data: { flag: 'lastPropertyName', from: oldLastPropertyName, to: value }
        }));
      }
    }

    // Reset section keyword flag for non-section identifiers
    // Section keywords (FIELDS, PROPERTIES, etc.) will re-set this flag in updateContextForKeyword()
    // This condition is always true here (scanIdentifier never produces LeftBrace), but prevents future bugs
    if (tokenType !== TokenType.LeftBrace) {
      const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
      this.lastWasSectionKeyword = false;
      if (oldLastWasSectionKeyword !== false) {
        this.invokeTraceCallback(() => ({
          type: 'flag-change',
          position: { line: startLine, column: startColumn, offset: startPos },
          data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: false }
        }));
      }
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
        // Only set objectTokenIndex for the first OBJECT in the file.
        // This ensures objectType reflects the first object only (see LexerContextState.objectType docs).
        if (this.getCurrentContext() === LexerContext.NORMAL) {
          this.pushContext(LexerContext.OBJECT_LEVEL);
          // Capture token index for lazy object type resolution
          // tokens.length - 1 because the OBJECT token was just added
          const oldObjectTokenIndex = this.objectTokenIndex;
          this.objectTokenIndex = this.tokens.length - 1;
          if (oldObjectTokenIndex !== this.objectTokenIndex) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'objectTokenIndex', from: oldObjectTokenIndex, to: this.objectTokenIndex }
            }));
          }
        }
        break;

      case TokenType.Fields:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "Fields" in "Fields := RecordRef.FIELDCOUNT") from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        // Prevents section keywords in property values from corrupting context
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'FIELDS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'FIELDS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'FIELDS' }
            }));
          }
        }
        break;

      case TokenType.Keys:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "Keys" in "Keys := RecordRef.KEYCOUNT") from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'KEYS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'KEYS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'KEYS' }
            }));
          }
        }
        break;

      case TokenType.Controls:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "Controls" in trigger) from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'CONTROLS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'CONTROLS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'CONTROLS' }
            }));
          }
        }
        break;

      case TokenType.Elements:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "Elements" in trigger) from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'ELEMENTS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'ELEMENTS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'ELEMENTS' }
            }));
          }
        }
        break;

      case TokenType.DataItems:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "DataItems" in trigger) from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'DATAITEMS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'DATAITEMS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'DATAITEMS' }
            }));
          }
        }
        break;

      case TokenType.Actions:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "Actions" in trigger) from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'ACTIONS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'ACTIONS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'ACTIONS' }
            }));
          }
        }
        break;

      case TokenType.Dataset:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'DATASET';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'DATASET') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'DATASET' }
            }));
          }
        }
        break;

      case TokenType.RequestPage:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'REQUESTPAGE';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'REQUESTPAGE') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'REQUESTPAGE' }
            }));
          }
        }
        break;

      case TokenType.Labels:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        if (this.inPropertyValue) {
          break;
        }
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = 'LABELS';
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== 'LABELS') {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: 'LABELS' }
            }));
          }
        }
        break;

      case TokenType.Properties:
      case TokenType.FieldGroups:
      case TokenType.Code:
      case TokenType.RequestForm:
        // Guard: Don't mark as section keyword if appearing inside code blocks
        // Prevents section keywords in trigger code (e.g., variable "Code" in "TimeBalanceLine.SETRANGE(Code)") from corrupting context
        if (this.getCurrentContext() === LexerContext.CODE_BLOCK) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in structural columns
        // Prevents section keywords in field/key/control names from corrupting context
        if (this.shouldProtectFromSectionKeyword()) {
          break;
        }
        // Guard: Don't mark as section keyword if appearing in property value
        // Prevents section keywords in property values (e.g., "SWIFT Code" in CaptionML) from corrupting context
        if (this.inPropertyValue) {
          break;
        }
        // Section keywords without column tracking
        {
          const oldLastWasSectionKeyword = this.lastWasSectionKeyword;
          const oldCurrentSectionType = this.currentSectionType;
          this.lastWasSectionKeyword = true;
          this.currentSectionType = null;
          if (oldLastWasSectionKeyword !== true) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'lastWasSectionKeyword', from: oldLastWasSectionKeyword, to: true }
            }));
          }
          if (oldCurrentSectionType !== null) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: this.line, column: this.column, offset: this.position },
              data: { flag: 'currentSectionType', from: oldCurrentSectionType, to: null }
            }));
          }
        }
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
        // Guard: BEGIN inside brackets is just text, not code start
        if (this.bracketDepth > 0) {
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
              currentContext === LexerContext.CODE_BLOCK ||
              currentContext === LexerContext.CASE_BLOCK) {
            this.pushContext(LexerContext.CODE_BLOCK);
          }
        }
        break;

      case TokenType.Case:
        // Push CASE_BLOCK when in any code execution context
        // This allows nested CASE statements to each maintain their own context
        // Guard against malformed input (only push when already in code)
        const currentCtx = this.getCurrentContext();
        if (currentCtx === LexerContext.CODE_BLOCK || currentCtx === LexerContext.CASE_BLOCK) {
          this.pushContext(LexerContext.CASE_BLOCK);
        }
        break;

      case TokenType.End:
        // Guard: Don't pop CODE_BLOCK if END appears in structural columns
        if (this.shouldProtectFromBeginEnd()) {
          break;
        }
        // Guard: END inside brackets is just text, not code end
        if (this.bracketDepth > 0) {
          break;
        }

        // In property values for non-triggers, END is just an identifier value
        if (this.inPropertyValue && !this.isTriggerProperty(this.lastPropertyName)) {
          break;
        }

        // Pop the appropriate context based on what we're in
        // The context stack naturally handles nesting:
        // - BEGIN pushes CODE_BLOCK
        // - CASE pushes CASE_BLOCK
        // - END pops whichever is on top
        // Unmatched END outside CODE_BLOCK/CASE_BLOCK will be caught by popContext underflow detection
        this.popContext();
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
          const oldInPropertyValue = this.inPropertyValue;
          this.inPropertyValue = true;
          if (oldInPropertyValue !== this.inPropertyValue) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: startLine, column: startColumn, offset: startPos },
              data: { flag: 'inPropertyValue', from: oldInPropertyValue, to: this.inPropertyValue }
            }));
          }
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
        // End of property value (only if not inside brackets)
        // Brackets are used in multi-language properties like CaptionML=[DAN=...;ENU=...]
        if (this.bracketDepth === 0) {
          const oldInPropertyValue = this.inPropertyValue;
          const oldLastPropertyName = this.lastPropertyName;
          this.inPropertyValue = false;
          this.lastPropertyName = '';
          if (oldInPropertyValue !== this.inPropertyValue) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: startLine, column: startColumn, offset: startPos },
              data: { flag: 'inPropertyValue', from: oldInPropertyValue, to: this.inPropertyValue }
            }));
          }
          if (oldLastPropertyName !== this.lastPropertyName) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: startLine, column: startColumn, offset: startPos },
              data: { flag: 'lastPropertyName', from: oldLastPropertyName, to: this.lastPropertyName }
            }));
          }
        }
        // Advance column tracking
        if (this.fieldDefColumn !== FieldDefColumn.NONE) {
          const oldFieldDefColumn = this.fieldDefColumn;
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
          if (oldFieldDefColumn !== this.fieldDefColumn) {
            this.invokeTraceCallback(() => ({
              type: 'flag-change',
              position: { line: startLine, column: startColumn, offset: startPos },
              data: { flag: 'fieldDefColumn', from: this.fieldDefColumnToString(oldFieldDefColumn), to: this.fieldDefColumnToString(this.fieldDefColumn) }
            }));
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
        // Track bracket depth when in property value (for CaptionML, etc.)
        if (this.inPropertyValue) {
          const oldBracketDepth = this.bracketDepth;
          this.bracketDepth++;
          this.invokeTraceCallback(() => ({
            type: 'flag-change',
            position: { line: startLine, column: startColumn, offset: startPos },
            data: { flag: 'bracketDepth', from: oldBracketDepth, to: this.bracketDepth }
          }));
        }
        break;
      case ']':
        this.addToken(TokenType.RightBracket, ch, startPos, this.position, startLine, startColumn);
        // Decrement bracket depth when in property value, but never go negative
        if (this.inPropertyValue && this.bracketDepth > 0) {
          const oldBracketDepth = this.bracketDepth;
          this.bracketDepth--;
          this.invokeTraceCallback(() => ({
            type: 'flag-change',
            position: { line: startLine, column: startColumn, offset: startPos },
            data: { flag: 'bracketDepth', from: oldBracketDepth, to: this.bracketDepth }
          }));
        }
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
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    // Skip until end of line
    while (this.position < this.input.length && this.currentChar() !== '\n' && this.currentChar() !== '\r') {
      this.advance();
    }

    this.invokeTraceCallback(() => ({
      type: 'skip',
      position: { line: startLine, column: startColumn, offset: startPos },
      data: { reason: 'line-comment', length: this.position - startPos }
    }));
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
    } else {
      this.invokeTraceCallback(() => ({
        type: 'skip',
        position: { line: startLine, column: startColumn, offset: startPos },
        data: { reason: 'block-comment', length: this.position - startPos }
      }));
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
    } else {
      this.invokeTraceCallback(() => ({
        type: 'skip',
        position: { line: startLine, column: startColumn, offset: startPos },
        data: { reason: 'c-style-comment', length: this.position - startPos }
      }));
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
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    while (this.isWhitespace(this.currentChar())) {
      this.advance();
    }

    if (this.position > startPos) {
      this.invokeTraceCallback(() => ({
        type: 'skip',
        position: { line: startLine, column: startColumn, offset: startPos },
        data: { reason: 'whitespace', length: this.position - startPos }
      }));
    }
  }

  private handleNewLine(): void {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    if (this.currentChar() === '\r' && this.peek() === '\n') {
      this.advance();
      this.advance();
    } else {
      this.advance();
    }
    this.line++;
    this.column = 1;

    this.invokeTraceCallback(() => ({
      type: 'skip',
      position: { line: startLine, column: startColumn, offset: startPos },
      data: { reason: 'newline', length: this.position - startPos }
    }));
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

    // Emit attempt-failed trace event for debugging
    const reason = nextWord === '' ? 'empty-second' : 'mismatch';
    this.invokeTraceCallback(() => ({
      type: 'attempt-failed',
      position: { line: startLine, column: startColumn, offset: startPos },
      data: {
        attempt: 'compound-token',
        firstWord,
        separator,
        expectedSecond,
        actualSecond: nextWord,
        reason
      }
    }));

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
    this.invokeTraceCallback(() => ({
      type: 'token',
      position: { line, column, offset: startOffset },
      data: { tokenType: type, value }
    }));

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
   * Resolve the object type from the token following the OBJECT keyword.
   * Uses lazy evaluation - looks at committed token stream.
   * @returns Uppercase object type string or null if not determinable
   */
  private resolveObjectType(): 'TABLE' | 'CODEUNIT' | 'PAGE' | 'REPORT' | 'QUERY' | 'XMLPORT' | 'MENUSUITE' | null {
    if (this.objectTokenIndex < 0) {
      return null;
    }
    const typeTokenIndex = this.objectTokenIndex + 1;
    if (typeTokenIndex >= this.tokens.length) {
      return null;
    }
    const typeToken = this.tokens[typeTokenIndex];
    // Map TokenType to uppercase string for API consistency
    switch (typeToken.type) {
      case TokenType.Table: return 'TABLE';
      case TokenType.Codeunit: return 'CODEUNIT';
      case TokenType.Page: return 'PAGE';
      case TokenType.Report: return 'REPORT';
      case TokenType.Query: return 'QUERY';
      case TokenType.XMLport: return 'XMLPORT';
      case TokenType.MenuSuite: return 'MENUSUITE';
      default: return null;  // Malformed input or not an object type
    }
  }

  /**
   * Convert LexerContext enum value to string name.
   * Throws error on unknown values to catch corruption early.
   * @param context The LexerContext enum value
   * @returns The string name of the context
   */
  private contextToString(context: LexerContext): string {
    switch (context) {
      case LexerContext.NORMAL: return 'NORMAL';
      case LexerContext.OBJECT_LEVEL: return 'OBJECT_LEVEL';
      case LexerContext.SECTION_LEVEL: return 'SECTION_LEVEL';
      case LexerContext.CODE_BLOCK: return 'CODE_BLOCK';
      case LexerContext.CASE_BLOCK: return 'CASE_BLOCK';
      default:
        throw new Error(`Unknown LexerContext value: ${context}`);
    }
  }

  /**
   * Convert FieldDefColumn enum value to string name.
   * Throws error on unknown values to catch corruption early.
   * @param column The FieldDefColumn enum value
   * @returns The string name of the column
   */
  private fieldDefColumnToString(column: FieldDefColumn): string {
    switch (column) {
      case FieldDefColumn.NONE: return 'NONE';
      case FieldDefColumn.COL_1: return 'COL_1';
      case FieldDefColumn.COL_2: return 'COL_2';
      case FieldDefColumn.COL_3: return 'COL_3';
      case FieldDefColumn.COL_4: return 'COL_4';
      case FieldDefColumn.PROPERTIES: return 'PROPERTIES';
      default:
        throw new Error(`Unknown FieldDefColumn value: ${column}`);
    }
  }

  /**
   * Get all tokens (for debugging)
   */
  public getTokens(): Token[] {
    return this.tokens;
  }

  /**
   * Get current lexer context state for validation and debugging.
   * Returns a read-only snapshot of internal state with enum values as strings.
   *
   * Note: The returned object is a snapshot copy. Modifying it does not affect lexer state.
   * The string values (e.g., 'NORMAL', 'CODE_BLOCK') are derived from internal enum names.
   *
   * @returns A snapshot of the current lexer state
   */
  public getContextState(): LexerContextState {
    return {
      contextStack: this.contextStack.map(ctx => this.contextToString(ctx)),
      braceDepth: this.braceDepth,
      bracketDepth: this.bracketDepth,
      inPropertyValue: this.inPropertyValue,
      fieldDefColumn: this.fieldDefColumnToString(this.fieldDefColumn),
      currentSectionType: this.currentSectionType,
      contextUnderflowDetected: this.contextUnderflowDetected,
      objectType: this.resolveObjectType(),
    };
  }

  /**
   * Validates whether the lexer exited in a clean state after tokenization.
   *
   * IMPORTANT: This method must be called AFTER tokenize() to produce meaningful
   * results. Calling it before tokenize() will return passed=true for the initial
   * state, which is not a useful validation.
   *
   * A clean exit indicates that:
   * - Context stack returned to ['NORMAL']
   * - All braces and brackets are balanced (depth = 0)
   * - Not in the middle of parsing a property value
   * - Not in the middle of parsing a field definition
   * - No context stack underflow was detected
   *
   * This method collects ALL validation failures rather than stopping at
   * the first one, making it easier to diagnose multi-faceted issues.
   *
   * Based on empirical analysis of 7,677 real NAV C/AL files, 99.92% exit
   * with the canonical clean state.
   *
   * @param options - Validation options
   * @returns CleanExitResult with passed status, all violations, and failure categories
   *
   * @example
   * ```typescript
   * const lexer = new Lexer(code);
   * lexer.tokenize();  // MUST call this first
   * const result = lexer.isCleanExit();
   * if (!result.passed) {
   *   for (const v of result.violations) {
   *     console.error(`${v.category}: ${v.message}`);
   *   }
   * }
   * ```
   */
  public isCleanExit(options?: CleanExitOptions): CleanExitResult {
    const violations: ExitViolation[] = [];
    const categories = new Set<ExitCategory>();
    const state = this.getContextState();

    // Check context stack
    if (state.contextStack.length !== 1 || state.contextStack[0] !== 'NORMAL') {
      const violation: ExitViolation = {
        category: ExitCategory.STACK_MISMATCH,
        message: `Context stack mismatch: expected ['NORMAL'], got ${JSON.stringify(state.contextStack)}`,
        expected: JSON.stringify(['NORMAL']),
        actual: JSON.stringify(state.contextStack)
      };
      violations.push(violation);
      categories.add(ExitCategory.STACK_MISMATCH);
    }

    // Check brace depth
    if (state.braceDepth !== 0) {
      const violation: ExitViolation = {
        category: ExitCategory.UNBALANCED_BRACES,
        message: `Unbalanced braces: depth is ${state.braceDepth}, expected 0`,
        expected: 0,
        actual: state.braceDepth
      };
      violations.push(violation);
      categories.add(ExitCategory.UNBALANCED_BRACES);
    }

    // Check bracket depth
    if (state.bracketDepth !== 0) {
      const violation: ExitViolation = {
        category: ExitCategory.UNBALANCED_BRACKETS,
        message: `Unbalanced brackets: depth is ${state.bracketDepth}, expected 0`,
        expected: 0,
        actual: state.bracketDepth
      };
      violations.push(violation);
      categories.add(ExitCategory.UNBALANCED_BRACKETS);
    }

    // Check property value state
    if (state.inPropertyValue) {
      const violation: ExitViolation = {
        category: ExitCategory.INCOMPLETE_PROPERTY,
        message: 'Incomplete property: still in property value at end of file',
        expected: false,
        actual: true
      };
      violations.push(violation);
      categories.add(ExitCategory.INCOMPLETE_PROPERTY);
    }

    // Check field definition state
    if (state.fieldDefColumn !== 'NONE') {
      const violation: ExitViolation = {
        category: ExitCategory.INCOMPLETE_FIELD,
        message: `Incomplete field definition: column is ${state.fieldDefColumn}, expected NONE`,
        expected: 'NONE',
        actual: state.fieldDefColumn
      };
      violations.push(violation);
      categories.add(ExitCategory.INCOMPLETE_FIELD);
    }

    // Check context underflow (unless lenient mode enabled)
    if (state.contextUnderflowDetected && !options?.allowRdldataUnderflow) {
      const violation: ExitViolation = {
        category: ExitCategory.CONTEXT_UNDERFLOW,
        message: 'Context stack underflow detected during tokenization',
        expected: false,
        actual: true
      };
      violations.push(violation);
      categories.add(ExitCategory.CONTEXT_UNDERFLOW);
    }

    return {
      passed: violations.length === 0,
      violations,
      categories
    };
  }
}
