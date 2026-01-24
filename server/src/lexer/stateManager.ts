/**
 * LexerStateManager - Encapsulates lexer state tracking logic
 *
 * This class manages all stateful aspects of the lexer, including:
 * - Context stack (NORMAL, OBJECT_LEVEL, SECTION_LEVEL, CODE_BLOCK, CASE_BLOCK)
 * - Brace and bracket depth tracking
 * - Property value mode tracking
 * - Section type tracking
 * - Field definition column tracking
 * - Protection guards for BEGIN/END and section keywords
 *
 * Extracted from Lexer class as part of issue #62 refactoring.
 */

/**
 * Lexer contexts - hierarchical state machine
 */
export enum LexerContext {
  NORMAL = 0,        // Document start, outside any object
  OBJECT_LEVEL = 1,  // Inside OBJECT { ... } top level
  SECTION_LEVEL = 2, // Inside FIELDS/KEYS/CONTROLS/PROPERTIES/etc. { ... }
  CODE_BLOCK = 3,    // Inside BEGIN ... END blocks (braces are comments)
  CASE_BLOCK = 4,    // Inside CASE ... END blocks (braces are comments)
}

/**
 * Field definition column positions
 * Tracks position within semicolon-delimited field/key/control definitions
 */
export enum FieldDefColumn {
  NONE = 0,       // Not in field definition
  COL_1 = 1,      // First column (field number/ID)
  COL_2 = 2,      // Second column (reserved/enabled)
  COL_3 = 3,      // Third column (field name/type)
  COL_4 = 4,      // Fourth column (data type/subtype)
  PROPERTIES = 5, // Properties section (Name=Value pairs)
}

/**
 * Section types in C/AL objects
 */
export type SectionType =
  | 'FIELDS'
  | 'KEYS'
  | 'CONTROLS'
  | 'ELEMENTS'
  | 'DATAITEMS'
  | 'ACTIONS'
  | 'DATASET'
  | 'REQUESTPAGE'
  | 'LABELS';

/**
 * Complete lexer state snapshot
 */
/**
 * Internal state snapshot from LexerStateManager
 * This is the raw internal state, not the public API format
 */
export interface InternalLexerState {
  contextStack: LexerContext[];
  braceDepth: number;
  bracketDepth: number;
  inPropertyValue: boolean;
  lastPropertyName: string;
  lastWasSectionKeyword: boolean;
  currentSectionType: SectionType | null;
  fieldDefColumn: FieldDefColumn;
  contextUnderflowDetected: boolean;
  objectTokenIndex: number;
}

/**
 * LexerStateManager - Encapsulates all lexer state tracking
 */
export class LexerStateManager {
  private static readonly MIN_CONTEXT_STACK_SIZE = 1;

  /**
   * Trigger properties that contain executable code (case-insensitive)
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

  // State variables
  private contextStack: LexerContext[] = [LexerContext.NORMAL];
  private braceDepth: number = 0;
  private bracketDepth: number = 0;
  private inPropertyValue: boolean = false;
  private lastPropertyName: string = '';
  private lastWasSectionKeyword: boolean = false;
  private currentSectionType: SectionType | null = null;
  private fieldDefColumn: FieldDefColumn = FieldDefColumn.NONE;
  private contextUnderflowDetected: boolean = false;
  private objectTokenIndex: number = -1;

  /**
   * Reset all state to initial values
   */
  public reset(): void {
    this.contextStack.length = 0;
    this.contextStack.push(LexerContext.NORMAL);
    this.braceDepth = 0;
    this.bracketDepth = 0;
    this.inPropertyValue = false;
    this.lastPropertyName = '';
    this.lastWasSectionKeyword = false;
    this.currentSectionType = null;
    this.fieldDefColumn = FieldDefColumn.NONE;
    this.contextUnderflowDetected = false;
    this.objectTokenIndex = -1;
  }

  /**
   * Clean up context stack at end of tokenization
   * Pops OBJECT_LEVEL and well-formed outer SECTION_LEVELs (braceDepth === 0)
   * Leaves malformed inner SECTION_LEVELs for isCleanExit() to detect
   */
  public cleanupContextStack(): void {
    while (this.contextStack.length > 1) {
      const top = this.contextStack[this.contextStack.length - 1];
      if (top === LexerContext.OBJECT_LEVEL ||
          (top === LexerContext.SECTION_LEVEL && this.braceDepth === 0)) {
        this.contextStack.pop();
      } else {
        break;
      }
    }
  }

  /**
   * Get complete state snapshot
   */
  public getState(): InternalLexerState {
    return {
      contextStack: [...this.contextStack],
      braceDepth: this.braceDepth,
      bracketDepth: this.bracketDepth,
      inPropertyValue: this.inPropertyValue,
      lastPropertyName: this.lastPropertyName,
      lastWasSectionKeyword: this.lastWasSectionKeyword,
      currentSectionType: this.currentSectionType,
      fieldDefColumn: this.fieldDefColumn,
      contextUnderflowDetected: this.contextUnderflowDetected,
      objectTokenIndex: this.objectTokenIndex,
    };
  }

  /**
   * Get current context (top of stack)
   */
  public getCurrentContext(): LexerContext {
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
    if (this.contextStack.length > LexerStateManager.MIN_CONTEXT_STACK_SIZE) {
      this.contextStack.pop();
    } else {
      this.contextUnderflowDetected = true;
    }
  }

  /**
   * Check if a property name is a trigger property (contains executable code)
   */
  public isTriggerProperty(): boolean {
    return LexerStateManager.TRIGGER_PROPERTIES.has(this.lastPropertyName.toLowerCase());
  }

  /**
   * Check if current column should be protected from BEGIN/END context changes
   * Section-aware protection:
   * - FIELDS: Protect COL_1-4 (structural columns)
   * - KEYS: Protect COL_1-2 (structural columns)
   * - CONTROLS: Protect COL_1-3 (structural columns)
   * - ELEMENTS: Protect COL_1-4 (structural columns)
   * - DATAITEMS: Protect COL_1-4 (structural columns)
   * - ACTIONS: Protect COL_1-3 (structural columns)
   */
  public shouldProtectFromBeginEnd(): boolean {
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
        return false;
    }
  }

  /**
   * Check if current column should be protected from section keyword context changes
   * Same protection logic as shouldProtectFromBeginEnd
   */
  public shouldProtectFromSectionKeyword(): boolean {
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
        return false;
    }
  }

  // ========== Operation methods (called by Lexer) ==========

  /**
   * Handle OBJECT keyword
   */
  public onObjectKeyword(tokenIndex: number): void {
    if (this.getCurrentContext() === LexerContext.NORMAL) {
      this.pushContext(LexerContext.OBJECT_LEVEL);
    }
    // Always update objectTokenIndex (allows handling multiple OBJECT keywords)
    this.objectTokenIndex = tokenIndex;
  }

  /**
   * Handle section keyword (FIELDS, KEYS, CONTROLS, etc.)
   */
  public onSectionKeyword(sectionType: SectionType): void {
    this.lastWasSectionKeyword = true;
    this.currentSectionType = sectionType;
  }

  /**
   * Handle opening brace '{'
   */
  public onOpenBrace(): void {
    this.braceDepth++;

    // Push SECTION_LEVEL context when we just saw a section keyword (FIELDS, PROPERTIES, etc.)
    const justPushedSectionLevel = this.lastWasSectionKeyword;

    if (justPushedSectionLevel) {
      this.pushContext(LexerContext.SECTION_LEVEL);
      this.lastWasSectionKeyword = false;
    }

    // Start column tracking when opening a field/key/control/element/dataitem/action definition
    // ONLY if:
    // 1. We're in SECTION_LEVEL context
    // 2. We're not already tracking columns (fieldDefColumn is NONE)
    // 3. We're in a columnar section type (FIELDS, KEYS, etc.)
    // 4. We did NOT just push SECTION_LEVEL (this is a nested brace, i.e., field definition)
    if (this.getCurrentContext() === LexerContext.SECTION_LEVEL &&
        this.fieldDefColumn === FieldDefColumn.NONE &&
        !justPushedSectionLevel &&
        (this.currentSectionType === 'FIELDS' ||
         this.currentSectionType === 'KEYS' ||
         this.currentSectionType === 'CONTROLS' ||
         this.currentSectionType === 'ELEMENTS' ||
         this.currentSectionType === 'DATAITEMS' ||
         this.currentSectionType === 'ACTIONS')) {
      this.fieldDefColumn = FieldDefColumn.COL_1;
    }
  }

  /**
   * Handle closing brace '}'
   * Atomically resets multiple state variables
   */
  public onCloseBrace(): void {
    // Prevent negative braceDepth from unmatched closing braces
    if (this.braceDepth > 0) {
      this.braceDepth--;
    }

    // Pop context when closing a section
    // A section is closed when we're at SECTION_LEVEL and closing a brace
    // for a specific section type (FIELDS, KEYS, etc.)
    if (this.getCurrentContext() === LexerContext.SECTION_LEVEL &&
        this.currentSectionType !== null) {
      this.popContext();
      this.currentSectionType = null;
    }

    // Reset property tracking (atomic operation)
    this.inPropertyValue = false;
    this.lastPropertyName = '';
    this.bracketDepth = 0;

    // Reset column tracking
    this.fieldDefColumn = FieldDefColumn.NONE;
  }

  /**
   * Handle opening bracket '['
   * Only tracks depth when in property value mode
   */
  public onOpenBracket(): void {
    if (this.inPropertyValue) {
      this.bracketDepth++;
    }
  }

  /**
   * Handle closing bracket ']'
   * Only tracks depth when in property value mode
   */
  public onCloseBracket(): void {
    if (this.inPropertyValue && this.bracketDepth > 0) {
      this.bracketDepth--;
    }
  }

  /**
   * Handle equals sign '='
   * Enters property value mode when lastPropertyName is set
   * (lastPropertyName is only set at SECTION_LEVEL, so no need to double-check context)
   */
  public onEquals(): void {
    if (this.lastPropertyName !== '') {
      this.inPropertyValue = true;
    }
  }

  /**
   * Handle semicolon ';'
   * Exits property value mode (if not inside brackets) and advances column tracking
   */
  public onSemicolon(): void {
    // Exit property value mode (only if not inside brackets)
    if (this.bracketDepth === 0) {
      this.inPropertyValue = false;
      this.lastPropertyName = '';
    }

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
  }

  /**
   * Handle identifier at SECTION_LEVEL (potential property name)
   */
  public onIdentifier(identifier: string, context: LexerContext): void {
    // Track identifier as potential property name only at SECTION_LEVEL
    if (!this.inPropertyValue &&
        context === LexerContext.SECTION_LEVEL) {
      this.lastPropertyName = identifier;
    }
  }

  /**
   * Handle BEGIN keyword
   * @param currentContext - The lexer's current context (passed from Lexer.getCurrentContext())
   */
  public onBeginKeyword(currentContext: LexerContext): void {
    // Guard: Don't push CODE_BLOCK if BEGIN appears in structural columns
    if (this.shouldProtectFromBeginEnd()) {
      return;
    }

    // Guard: BEGIN inside brackets is just text, not code start
    if (this.bracketDepth > 0) {
      return;
    }

    // Only push CODE_BLOCK for ACTUAL code blocks, not property values
    // If we're in a property value, only enter CODE_BLOCK if it's a trigger property
    if (this.inPropertyValue) {
      if (this.isTriggerProperty()) {
        this.pushContext(LexerContext.CODE_BLOCK);
      }
      // Otherwise: BEGIN is just a property value identifier, don't change context
    } else {
      // Not in property value - use passed context to decide
      if (currentContext === LexerContext.NORMAL ||
          currentContext === LexerContext.SECTION_LEVEL ||
          currentContext === LexerContext.CODE_BLOCK ||
          currentContext === LexerContext.CASE_BLOCK) {
        this.pushContext(LexerContext.CODE_BLOCK);
      }
    }
  }

  /**
   * Handle END keyword
   * @param currentContext - The lexer's current context (passed from Lexer.getCurrentContext())
   */
  public onEndKeyword(currentContext: LexerContext): void {
    // Guard: Don't pop CODE_BLOCK if END appears in structural columns
    if (this.shouldProtectFromBeginEnd()) {
      return;
    }

    // Guard: END inside brackets is just text, not code end
    if (this.bracketDepth > 0) {
      return;
    }

    // In property values for non-triggers, END is just an identifier value
    if (this.inPropertyValue && !this.isTriggerProperty()) {
      return;
    }

    // Pop the appropriate context based on what we're in (use passed context)
    // The context stack naturally handles nesting:
    // - CODE_BLOCK inside CODE_BLOCK pops to CODE_BLOCK
    // - CASE_BLOCK pops to CODE_BLOCK
    // - CODE_BLOCK at top level pops to SECTION_LEVEL or NORMAL
    // For malformed input (currentContext = NORMAL), attempt to pop anyway to trigger underflow detection
    if (currentContext === LexerContext.CODE_BLOCK ||
        currentContext === LexerContext.CASE_BLOCK ||
        currentContext === LexerContext.NORMAL) {
      this.popContext();
    }
  }

  /**
   * Handle CASE keyword
   * @param currentContext - The lexer's current context (passed from Lexer.getCurrentContext())
   */
  public onCaseKeyword(currentContext: LexerContext): void {
    // Push CASE_BLOCK when in any code execution context
    // Guard against malformed input (only push when already in code)
    if (currentContext === LexerContext.CODE_BLOCK ||
        currentContext === LexerContext.CASE_BLOCK) {
      this.pushContext(LexerContext.CASE_BLOCK);
    }
  }
}
