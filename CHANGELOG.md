# Change Log

All notable changes to the C/AL Language extension will be documented in this file.

## [0.5.0] - 2026-01-27

### Major Release - LSP Feature Suite & Comprehensive Parser Coverage

This is a major release delivering 5 new LSP providers, comprehensive parser improvements, advanced diagnostics, and significant infrastructure enhancements. The extension now provides a complete language server experience with intelligent code completion, navigation, refactoring, and validation capabilities.

**Note:** Code Completion was shipped in v0.4.9 but was not documented in that release.

### Added

#### LSP Features

**Code Completion (v0.4.9, documented here)**
- IntelliSense for keywords, variables, procedures, fields
- Built-in function completion with signatures
- Record method completion
- Context-aware suggestions

**Code Lens**
- Reference count indicators above procedures
- "Find All References" quick links
- Jump to references directly from declaration

**Document Symbol (Outline View)**
- Hierarchical outline in Explorer sidebar
- Object-level symbols (Tables, Pages, Codeunits)
- Section-level symbols (FIELDS, KEYS, CODE)
- Procedure and field navigation
- Quick jump to any symbol

**Rename Refactoring (F2)**
- Rename variables, fields, procedures across document
- Multi-token field name support (e.g., `Entry No.`)
- Handles both quoted and unquoted identifiers
- Safe refactoring with scope awareness

**Workspace Symbol Search (Ctrl+T)**
- Search for symbols across entire workspace
- Find procedures, fields, objects by name
- Fuzzy matching support
- Quick navigation to symbol definitions

**Folding Ranges**
- Code folding for BEGIN...END blocks
- Procedure and function folding
- Section folding (FIELDS, KEYS, CODE)
- Improved code organization

#### Diagnostics and Validation

**Empty Set Validation**
- Detects empty sets in `IN` expressions: `IF X IN [] THEN`
- Warns about unreachable code paths
- Helps catch logic errors early
- Configurable severity (warning/error)

**Depth-Limited Walker**
- Stack overflow protection for deeply nested AST structures
- Handles complex Action hierarchies in Page objects
- Prevents language server crashes on malformed code
- Graceful degradation with error reporting

**AL-Only Feature Detection**
- Warns when AL-only syntax is used in C/AL files
- Prevents NAV compilation errors
- Helps maintain C/AL vs AL boundaries
- Educates developers on version differences

#### Parser - Language Constructs

**WITH-DO Statements**
- Full parsing of `WITH record DO statement` syntax
- Nested WITH-DO support
- Proper scope tracking for record shortcuts

**CASE Statement Ranges**
- Range expressions in CASE branches: `CASE X OF 1..10:`
- Single values and ranges intermixed
- Proper AST representation

**Array Declarations**
- Array syntax: `MyArray : ARRAY [10] OF Integer`
- Multi-dimensional arrays
- Array indexing expressions

**Variable Modifiers**
- `TEMPORARY` - In-memory Record variables
- `SECURITYFILTERING` - Record-level security control
- `INDATASET` - Page variable binding
- `WITHEVENTS` - .NET event subscription
- `RUNONCLIENT` - Client-side .NET execution

**Procedure Modifiers**
- `LOCAL` - Private procedure visibility
- Procedure attributes: `[External]`, `[TryFunction]`, `[Integration]`, `[EventSubscriber]`
- Attribute validation and error reporting

**FOR Loop Enhancements**
- `DOWNTO` keyword support for descending loops
- Complex loop expressions
- Member access in loop bounds

**BREAK Statement**
- Break keyword parsing
- Proper AST node type
- Allows `Break` as procedure name (C/AL permits keyword reuse)

**DotNet Declarations**
- `DotNet` variable type with assembly/type paths
- Escaped quotes in type names
- Optional WITHEVENTS and RUNONCLIENT modifiers

**Automation Declarations**
- `Automation` variable type
- TypeLibName property with escaped quotes

**FOREACH Loops (NAV 2016+)**
- `FOREACH element IN collection DO` syntax
- .NET collection iteration
- Full AST support

**EVENT Declarations**
- Event trigger syntax for .NET interop
- Event parameter parsing

#### Parser - Object Section Coverage

**ACTIONS Section (Page Objects)**
- Complete Action hierarchy parsing
- ActionContainer, ActionGroup, Action, Separator
- Nested action structures
- Property parsing within actions
- Deeply nested action support with stack overflow protection

**CONTROLS Section (Page Objects)**
- Complete control hierarchy parsing
- Container, Group, Field, Part controls
- Nested control structures
- Property parsing within controls

**ELEMENTS Section (XMLport Objects)**
- Element hierarchy parsing
- Element properties
- Field mappings
- Nested element structures

**FIELDGROUPS Section**
- FieldGroup definitions
- Field lists within groups
- DropDown and Brick field groups

**KEYS Section Enhancements**
- Key field lists
- Key properties (Clustered, SumIndexFields, etc.)
- Multi-field key support

**Property Parsing Enhancements**
- CalcFormula property with token capture
- TableRelation property with token capture
- Multi-line property values
- Brace depth tracking in complex properties
- Empty/malformed property detection
- Escaped quotes in property values

#### Lexer Improvements

**Context-Aware Tokenization**
- `Code` keyword classification: data type vs statement starter
- `Date`, `Time`, `Boolean` keyword classification: data type vs identifier
- Section keyword support: `MENUNODES` for MenuSuite objects
- Comment detection inside bracket contexts

**State Management**
- Lexer state manager integration
- Reduced state complexity
- Property name tracking
- CODE_BLOCK transition handling

**Token Type Additions**
- `DOWNTO` token
- `BREAK` token
- `FOREACH` token
- `EVENT` token
- Section-specific tokens

#### Semantic Highlighting

**Set Literals**
- Syntax highlighting for set expressions: `[1, 2, 3]`
- Empty set highlighting: `[]`

**Range Expressions**
- Range operator highlighting: `1..10`
- Range expressions in CASE and set contexts

**Improved Token Classification**
- Quoted identifier length calculation fixes
- Proper scoping for all token types
- Consistent semantic token mapping

#### Infrastructure

**LexerStateManager**
- Centralized lexer state management
- Reduces lexer complexity
- Improves maintainability
- Better state transition handling

**Encoding Configuration**
- CP850 encoding detection for NAV exports
- UTF-8 with BOM support
- Encoding configuration guide

**Test Infrastructure**
- 4,710 tests passing across 118 suites
- Comprehensive regression coverage
- Performance benchmarks
- Snapshot testing for AST stability

**Lexer Health Script**
- Validates lexer performance on large file sets
- Memory usage optimization
- Tokenization time statistics (min/max/avg)
- CI integration with failure thresholds

**Type Safety Improvements**
- Enhanced type safety in test utilities
- Static imports replacing runtime requires
- Better TypeScript inference

**Documentation**
- JSDoc improvements with `@example` tags
- Encoding configuration guide
- Sanitization test documentation
- Parser development guides updated

#### Security Hardening

**Path Sanitization**
- Strip confidential paths from error messages
- Prevent test/REAL/ path leakage in diagnostics
- Windows path handling in sanitization
- Stack trace sanitization

**SkippedRegion Token Isolation**
- Security boundary for unparsed content
- Prevents accidental exposure of skipped regions

**ESLint Security Rules**
- `no-direct-parse-error` rule prevents ParseError construction bypass
- Detects aliased ParseError construction
- Auto-fix suggestions for violations
- Chained alias detection
- Import alias detection
- Variable reassignment detection
- Context-aware error messages
- Same-line safety guards

### Fixed

#### Parser Fixes

**IF-ELSE Statement Attribution**
- Fixed misattribution of ELSE to wrong IF when semicolons present
- Proper handling of `IF...THEN BEGIN...END; ELSE` syntax
- Comprehensive test coverage for semicolon termination cases

**Field/Object Name Spacing**
- Preserve exact spacing in multi-token field names
- Maintain original formatting for display purposes
- Fixes alignment issues in property editors

**Procedure Name Validation**
- Validate procedure name token before consumption
- Better error messages for invalid procedure declarations
- Prevents crashes on malformed procedure syntax

**Property Parsing Robustness**
- Report errors for empty/malformed property values
- Brace depth tracking in ActionList properties
- Align field property parsing with general property parsing
- Handle multiple consecutive malformed properties

**DotNet and Automation Parsing**
- Handle escaped quotes in type names: `'System.String'` → `'System.String'`
- Handle empty type names gracefully
- Proper error reporting for malformed declarations

**Error Recovery**
- Attribute warnings when discarded during error recovery
- Attribute validation when preceding triggers/events
- Better error positioning for invalid FOR loop variables
- Restore brace depth after token backup

**Expression Parsing**
- Deeply nested FOR loop member expressions
- Code and Decimal as statement starters
- Improved operator precedence handling

#### Lexer Fixes

**Comment Detection**
- Prevent comment detection inside bracket contexts
- Clear property name tracking on state transitions
- Multi-line string line ending edge cases

**Token Type Disambiguation**
- Emit `Code_Type` for Code in data type contexts
- Proper classification of Date/Time/Boolean in code contexts
- Keyword vs identifier disambiguation

#### Rename Fixes

**Rename Completeness**
- Include field definitions in rename operations
- Include procedure definitions in rename operations
- Multi-token unquoted field name support
- Proper scope handling for all rename targets

#### Semantic Token Fixes

**Token Length Calculation**
- Correct token length for quoted identifiers
- Fixes misaligned semantic highlighting
- Proper handling of escaped quotes in token length

#### Sanitization Fixes

**Path Stripping**
- Handle Windows paths with backslashes
- Handle consecutive slashes in paths
- Case-insensitive path matching
- Allow parentheses in test/REAL paths

**Error Formatting**
- Handle empty string stack in formatError
- typeof guard for undefined values
- Better fallback error messages

#### ESLint Fixes

**TypeScript Parsing**
- Fix parsing errors in script files
- Proper ES6 module support
- Convert require() to import statements

**Warning Cleanup**
- Fixed 97 warnings in test files
- Fixed 20 warnings in production code
- Escape JSDoc comment terminators

### Changed

**ESLint Configuration**
- Harmonized message tone for custom rules
- Improved actionability of rule messages
- Context-aware error messages with compound contexts
- Auto-fix suggestions for common violations

**Test Infrastructure**
- Improved type safety in test utilities
- Static imports replacing dynamic requires
- Better test organization and coverage
- Regression test suite expansion

**Code Quality**
- Extract helper functions from complex logic
- Remove duplicate declarations
- Improve code readability
- Better error handling patterns

## [0.4.9] - 2025-12-22

**Note:** This release included Code Completion functionality that was not documented at the time. See v0.5.0 changelog above for Code Completion details.

### Fixed - Integer Parsing Exception Handling (#62)

This release fixes a critical bug where invalid integer values could throw unhandled exceptions, potentially crashing the LSP server.

#### The Problem

The `parseInteger` method threw a `ParseError` when encountering invalid integers. This exception could escape error handling in several call sites (object ID, field number, array size, record ID, type length), potentially crashing the LSP server.

#### The Fix

Changed `parseInteger` from throwing exceptions to recording errors and returning a safe default value (0):

```typescript
// Before: throws exception
if (isNaN(value)) {
  throw new ParseError(`Invalid integer value: ${token.value}`, token);
}

// After: records error and continues
if (isNaN(value)) {
  this.recordError(`Invalid integer value: ${token.value}`, token);
  return 0;
}
```

#### Benefits

- **No more crashes**: Invalid integers are handled gracefully
- **Better error recovery**: Parser continues and collects all errors
- **Clear diagnostics**: Users see "Invalid integer value" errors in VS Code

#### Test Coverage

- 6 new tests for invalid integer handling
- Tests verify no exceptions are thrown for invalid integers in: object ID, field number, array size, type length
- Tests verify parsing continues after errors
- Total: 526 tests passing

## [0.4.6] - 2025-12-22

### Added - TEMPORARY Variable Support

This release adds parser support for the TEMPORARY keyword in variable declarations.

#### Key Features

- **TEMPORARY variable detection**: Parser correctly identifies `TEMPORARY` keyword for Record variables
- **isTemporary AST flag**: VariableDeclaration nodes now have accurate `isTemporary` property
- **Works with @number syntax**: `TempCustomer@1009 : TEMPORARY Record 50000;`
- **Works with quoted identifiers**: `"Temp Buffer" : TEMPORARY Record 100;`

#### Examples

```cal
VAR
  TempCustomer : TEMPORARY Record 18;
  TempBuffer@1009 : TEMPORARY Record 50000;
  "Temp Entry" : TEMPORARY Record 21;
```

#### Implementation Details

**Modified Files:**
- `server/src/parser/parser.ts` - Added TEMPORARY token detection after colon

**Test Coverage:**
- 6 new tests for TEMPORARY variable parsing
- Tests cover: TEMPORARY Record, regular Record, @number syntax, mixed variables, local procedure variables, quoted identifiers
- Snapshot updated for isTemporary field
- Total: 501 tests passing

#### Benefits

- Distinguishes temporary vs persistent Record variables
- Enables future diagnostics for TEMPORARY variable scope
- Hover information can show "TEMPORARY Record" vs "Record"

## [0.4.5] - 2025-12-22

### Added - LOCAL Keyword Support for Procedures

This release adds parser support for the LOCAL keyword before PROCEDURE and FUNCTION declarations.

#### Key Features

- **LOCAL PROCEDURE detection**: Parser correctly identifies `LOCAL PROCEDURE` declarations
- **LOCAL FUNCTION detection**: Parser correctly identifies `LOCAL FUNCTION` declarations
- **isLocal AST flag**: ProcedureDeclaration nodes now have accurate `isLocal` property
- **Edge case handling**: Fixed parsing when global VAR section precedes LOCAL procedure

#### Examples

```cal
LOCAL PROCEDURE CheckCreditLimit@2() : Boolean;
LOCAL FUNCTION GetValue() : Integer;
```

#### Implementation Details

**Modified Files:**
- `server/src/parser/parser.ts` - Added LOCAL token detection and handling

**Test Coverage:**
- 9 new tests for LOCAL procedure parsing
- Tests cover: LOCAL PROCEDURE, LOCAL FUNCTION, mixed visibility, @number syntax, parameters, local variables
- Edge case test: global VAR section followed by LOCAL PROCEDURE
- Total: 495 tests passing

#### Benefits

- Distinguishes public vs private procedures for future IntelliSense improvements
- Enables scope-aware completions (show LOCAL procs only within same object)
- Accurate AST representation of procedure visibility

## [0.4.4] - 2025-12-10

### Added - Find All References (Shift+F12)

This release adds Find All References support to the C/AL Language Server, allowing users to find all usages of a symbol across the document.

#### Key Features

- **Find All References**: Shift+F12 shows all locations where a symbol is used
- **Variable References**: Find all usages of local and global variables
- **Field References**: Find all usages of table fields, including member access (Rec.FieldName)
- **Procedure References**: Find all calls to procedures and functions
- **Parameter References**: Find all usages of procedure parameters
- **Include/Exclude Declaration**: Option to include or exclude the definition location

#### Expression Context Support

References are found in all expression contexts:
- Binary expressions (A + B, X > Y)
- Assignment statements (MyVar := Value)
- IF/WHILE/REPEAT conditions
- CASE statements
- Function call arguments
- Array access expressions
- EXIT statements
- Member expressions (Rec.Field)

#### Implementation Details

**New Files:**
- `server/src/references/referenceProvider.ts` (~320 lines)
- `server/src/references/index.ts`
- `server/src/references/__tests__/references.test.ts` (35+ tests)

**Modified Files:**
- `server/src/server.ts` - Added references capability and handler

**Test Coverage:**
- 35+ new reference tests covering all expression contexts
- Tests for case insensitivity, include/exclude declaration
- Edge case tests (empty document, unknown symbols, special characters)

#### Features by Category

| Category | Feature |
|----------|---------|
| Variables | Global and local variable reference tracking |
| Fields | Field definition and member access references |
| Procedures | Procedure definition and call references |
| Parameters | Procedure parameter references |
| Expressions | Full AST traversal for all expression types |
| Case | Case-insensitive symbol matching |

## [0.4.3] - 2025-11-29

### Added - Go to Definition (F12)

This release adds Go to Definition support to the C/AL Language Server.

#### Key Features

- **Jump to variable definitions**: Navigate from usage to declaration
- **Jump to field definitions**: Find field declarations in FIELDS section
- **Jump to procedure definitions**: Navigate to procedure declarations
- **Case-insensitive symbol lookup**: Works regardless of case
- **Accurate location ranges**: Precise cursor positioning

#### Implementation Details

- 21 comprehensive tests
- Supports symbols in VAR sections, FIELDS section, and procedures

## [0.4.2] - 2025-11-29

### Added - Signature Help (Parameter Hints)

This release adds signature help support to the C/AL Language Server, showing parameter hints when typing function calls.

#### Key Features

- **Parameter Hints**: Shows function signatures while typing inside parentheses
- **Active Parameter Highlighting**: Highlights the current parameter based on cursor position
- **Built-in Function Support**: 70+ C/AL functions with parameter documentation
- **Record Method Support**: 55+ Record methods with signatures
- **Nested Function Support**: Properly handles nested function calls
- **User-defined Procedures**: Basic support for user-defined procedure signatures

#### Trigger Characters

- `(` - Opens signature help when starting a function call
- `,` - Re-triggers to update active parameter when typing next argument

#### Implementation Details

**New Files:**
- `server/src/signatureHelp/signatureHelpProvider.ts` (~280 lines)
- `server/src/signatureHelp/index.ts`
- `server/src/signatureHelp/__tests__/signatureHelp.test.ts` (35 tests)

**Modified Files:**
- `server/src/server.ts` - Added signature help capability and handler

**Test Coverage:**
- 35 new signature help tests
- Total tests: 432 (up from 397 in v0.4.1)
- All tests passing in ~7.5 seconds

#### Features by Category

| Category | Feature |
|----------|---------|
| Functions | 70+ built-in function signatures with documentation |
| Methods | 55+ Record method signatures |
| Parameters | Active parameter index tracking |
| Nesting | Proper handling of nested function calls |
| Format | Markdown formatted documentation |

## [0.4.1] - 2025-11-29

### Added - Hover Information

This release adds hover support to the C/AL Language Server, showing type information and documentation when hovering over code elements.

#### Key Features

- **Variable Type Information**: Hover over variables to see their type
- **Field Type Information**: Hover over fields to see data type
- **Procedure/Function Names**: Hover to see procedure declarations
- **Built-in Function Documentation**: 65+ C/AL functions with signatures and descriptions
- **Record Method Documentation**: 55+ Record methods shown when hovering after dot
- **Keyword Documentation**: All C/AL keywords with descriptions (data types, control flow, operators)

#### Implementation Details

**New Files:**
- `server/src/hover/hoverProvider.ts` (~370 lines)
- `server/src/hover/index.ts`
- `server/src/hover/__tests__/hover.test.ts` (34 tests)

**Modified Files:**
- `server/src/server.ts` - Added hover capability and handler

**Test Coverage:**
- 34 new hover tests
- Total tests: 397 (up from 363 in v0.4.0)
- All tests passing in ~7.5 seconds

#### Features by Category

| Category | Feature |
|----------|---------|
| Symbols | Variable type info, field type info, procedure names |
| Built-ins | 65+ function signatures with documentation |
| Methods | 55+ Record methods with signatures |
| Keywords | Data types, control flow, operators, object types |
| Format | Markdown formatted with code blocks |

## [0.3.4] - 2025-11-14

### Added - Complete C/AL Language Coverage (NAV 2018)

This release completes the C/AL language coverage by implementing remaining NAV 2018 features.

#### New Language Features

1. **C-Style Comments (`/* */`)** - NAV 2013+
   - Multi-line comment support using `/* ... */` syntax
   - Properly handles asterisks inside comments
   - Compatible with existing `//` line comments and `{ }` block comments
   - 16 comprehensive tests added

2. **Compound Assignment Operators** - NAV 2018
   - `+=` (plus-assign)
   - `-=` (minus-assign)
   - `*=` (multiply-assign)
   - `/=` (divide-assign)
   - Used in real NAV 2018 code (Microsoft cal-open-library)
   - 10 comprehensive tests added

3. **Date/Time/DateTime Literals**
   - Date literals: `MMDDYY[YY]D` format (e.g., `060120D`, `06012020D`, `0D`)
   - Time literals: `HHMMSS[ms]T` format (e.g., `120000T`, `235959999T`)
   - DateTime literals: Combined format (e.g., `060120D120000T`)
   - Proper validation for literal formats
   - 28 comprehensive tests added in new `literals.test.ts`

#### Implementation Details

**Lexer Enhancements:**
- Added `scanCStyleComment()` method for `/* */` comment handling
- Extended `scanOperatorOrPunctuation()` to recognize compound operators
- Enhanced `scanNumber()` to detect and parse date/time literals
- Added new token types: `PlusAssign`, `MinusAssign`, `MultiplyAssign`, `DivideAssign`
- Proper handling of edge cases (e.g., `5-digit + D` is not a date)

**Test Coverage:**
- Total tests: 332 (up from 284 in v0.3.3)
- New test file: `literals.test.ts` with 28 tests
- Updated `comments.test.ts` with C-style comment and compound operator tests
- All existing tests continue to pass
- Test execution time: ~5.5 seconds

#### NAV Version Compatibility

- ✅ C-style comments available since NAV 2013
- ✅ Compound operators confirmed in NAV 2018
- ✅ Date/time literals available in all NAV versions
- ✅ Complete feature parity with NAV 2018 C/AL

## [0.3.3] - 2025-11-14

### Fixed - Context-Aware Lexer Implementation

This release resolves a fundamental parser limitation discovered during testing, enabling full parsing of all C/AL object sections.

#### Problem Resolved

The lexer previously treated **all** `{` and `}` characters as block comment delimiters, which prevented parsing of PROPERTIES, FIELDS, KEYS, and CODE sections. C/AL uses braces for two different purposes:
- **Structural delimiters** in object/section definitions
- **Block comments** in CODE sections (BEGIN...END blocks)

#### Solution Implemented

**Context-Aware Lexer with State Machine Architecture:**

1. **New Token Types**
   - Added `LeftBrace` token type for structural `{`
   - Added `RightBrace` token type for structural `}`

2. **State Machine Implementation**
   - `LexerContext` enum with 4 states: `NORMAL`, `OBJECT_LEVEL`, `SECTION_LEVEL`, `CODE_BLOCK`
   - Stack-based context tracking for nested BEGIN...END blocks
   - Brace depth tracking for proper nesting

3. **Context-Aware Token Emission**
   - In object/section contexts: `{` and `}` → `LeftBrace`/`RightBrace` tokens
   - In CODE_BLOCK context: `{` and `}` → treated as block comments (skipped)

4. **Parser Updates**
   - All section parsers now use `LeftBrace`/`RightBrace` instead of `LeftBracket`/`RightBracket`
   - Updated: `parsePropertySection`, `parseFieldSection`, `parseField`, `parseKeySection`, `parseKey`, `parseFieldGroupSection`

#### What Now Works

- ✅ **PROPERTIES section parsing** - Fully functional
- ✅ **FIELDS section parsing** - Fully functional
- ✅ **KEYS section parsing** - Fully functional
- ✅ **CODE section parsing** - Fully functional
- ✅ **Field definitions with nested braces** - Correctly parsed
- ✅ **Block comments in CODE sections** - Properly skipped
- ✅ **All 9 real-world C/AL regression fixtures** - Parse with complete AST

#### Testing

**New Tests:**
- `context-aware.test.ts` - 19 comprehensive tests covering structural braces, comment braces, mixed contexts, edge cases, and context stack management

**Updated Tests:**
- `comments.test.ts` - Updated to properly test context-aware behavior

**Results:**
- **284/284 tests passing** (up from 265 in v0.3.2)
- All tests run in ~4.3 seconds
- No performance regression
- AST snapshots updated with complete structure

#### Impact

This fix enables:
1. **Complete AST Construction** - Parser can fully parse all C/AL object sections
2. **Phase 2 Readiness** - Code completion, go-to-definition, and other advanced features are now feasible
3. **Better Semantic Analysis** - Language server can analyze field definitions, properties, and code structure
4. **Improved User Experience** - More comprehensive code intelligence for C/AL developers

#### Backward Compatibility

✅ **100% backward compatible**
- All existing tests continue to pass
- No breaking changes to public APIs
- Progressive enhancement without disrupting existing functionality

---

## [0.3.2] - 2025-11-14

### Added - Testing Infrastructure (Minimal Viable Testing Strategy)

This release establishes a comprehensive testing foundation for the C/AL Language Server, implementing all 8 tasks from the Minimal Viable Testing Strategy.

#### Test Infrastructure Setup

- **Jest Testing Framework** - Complete test infrastructure setup
  - Configured Jest with TypeScript support (ts-jest)
  - Test scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`
  - Fast execution: 265 tests complete in ~5 seconds
  - Fixed TypeScript configuration to avoid IDE errors while maintaining Jest functionality

#### Lexer Tests (122 tests)

- **Quoted Identifiers Tests** (23 tests)
  - Double-quoted identifiers vs single-quoted strings distinction
  - Edge cases: empty quotes, unclosed quotes, multiline handling
  - Position tracking and offset validation
  - Real-world C/AL expressions with mixed quotes

- **General Lexer Tests** (42 tests)
  - Case-insensitive keyword matching (`BEGIN`/`begin`/`Begin`)
  - Scope operator (`::`) for Option types
  - Numbers, operators, delimiters
  - Complex expressions and tokenization
  - Documented date/time literals as future enhancement

- **Comments and Operators Tests** (52 tests)
  - Line comments (`//`) and block comments (`{ }`)
  - Scope operator edge cases
  - Comment-operator interactions
  - **Implementation gaps discovered and documented:**
    - C-style comments (`/* */`) - NAV 2013+ feature (added to backlog)
    - Compound assignment operators (`+=`, `-=`, `*=`, `/=`) - NAV 2018 (added to backlog)

- **Coverage:** Lexer module achieves 98.94% statement coverage

#### Parser Tests (61 tests)

- **Basic Parser Tests** (35 tests)
  - Basic functionality and error recovery
  - AST structure validation
  - Object type recognition
  - Graceful handling of syntax errors (never crashes)

- **Object-Specific Tests** (26 tests)
  - Table, Page, Codeunit object parsing
  - Report, Query, XMLport, MenuSuite objects
  - Edge cases and error conditions
  - AST structure validation

- **Coverage:** Parser achieves 38% statement coverage (appropriate for smoke testing phase)

#### Regression Snapshot Tests (66 tests)

- **Real-World C/AL Fixtures** - 9 production-quality files from Microsoft's cal-open-library
  - 3 Table objects (simple, medium with CalcFormulas, complex)
  - 3 Codeunit objects (simple, medium, complex business logic)
  - 2 Page objects (list part, dashboard with actions)
  - 1 XMLport object (complex import/export)
  - Total: ~130KB of real Microsoft C/AL code

- **Snapshot Testing Benefits:**
  - Automatic detection of unintended parsing changes
  - Regression protection during refactoring
  - Performance validation (all fixtures parse in < 5 seconds)

#### LSP Smoke Tests (16 tests)

- Module loading verification (3 tests)
- Semantic tokens legend validation (3 tests)
- End-to-end semantic tokens generation (4 tests)
- Error handling and graceful degradation (4 tests)
- Integration sanity checks (2 tests)
- **Coverage:** Semantic tokens module achieves 90% statement coverage

#### Test Statistics

- **Total Tests:** 265 tests, all passing
- **Test Execution Time:** ~5 seconds
- **Snapshot Tests:** 9 AST snapshots
- **Overall Coverage:** 65.84% statements, 68.43% branches, 60.27% functions
- **Module Coverage Breakdown:**
  - Lexer: 98.94% (excellent)
  - Semantic Tokens: 90% (great)
  - Parser: 38% (appropriate for smoke testing)

#### Documentation

- Comprehensive testing documentation in `documentation/testing/`
  - Minimal Viable Testing Strategy (reference document)
  - Running Tests guide (updated with actual results)
  - Test Fixtures documentation
- Added testing section to README.md
- Updated task tracking in Current.md and Completed.md

### Changed

- Test dependencies now installed via npm (Jest, @types/jest, ts-jest)
- TypeScript configuration refined to separate test and build contexts

### Known Limitations Documented

- C-style comments (`/* */`) not yet implemented in lexer (Backlog task #14)
- Compound assignment operators (`+=`, `-=`, etc.) not yet in lexer (Backlog task #15)
- Parser section parsing limited by lexer treating `{ }` as comments (documented in PARSER_TEST_FINDINGS.md)

### Impact

- ✅ **Regression Protection** - Future refactoring won't break existing functionality
- ✅ **Quality Assurance** - 265 automated tests validate core functionality
- ✅ **Fast Feedback** - Tests complete in ~5 seconds
- ✅ **Documentation** - Clear testing guide for contributors
- ✅ **Foundation** - Ready for Phase 2 development with test coverage

## [0.3.0] - 2025-11-07

### Added - Language Server Protocol (LSP) Implementation

This is a major release that adds a Language Server Protocol implementation to the C/AL extension, enabling semantic highlighting and advanced IDE features.

#### Key Features

- **Semantic Token Provider** - The Core Feature
  - Provides semantic highlighting that overrides TextMate grammar colors
  - **Solves the quoted identifier visual inconsistency issue**
  - Both `"Line No."` (quoted) and `Description` (unquoted) now appear with the same color
  - TextMate grammar still provides bracket matching protection (scoping quoted identifiers as `string.*`)
  - Semantic tokens override the visual appearance while preserving bracket matching functionality
  - Quoted identifiers now correctly appear as identifiers, not strings

- **C/AL Lexer (Tokenizer)**
  - Complete tokenization of C/AL syntax
  - Handles all C/AL keywords, operators, and literals
  - Supports quoted identifiers with spaces
  - Case-insensitive keyword matching
  - Proper handling of comments (line and block)
  - Number literals (integer and decimal)
  - String literals with escaped quotes

- **C/AL Parser**
  - Parses OBJECT declarations (Table, Page, Report, Codeunit, etc.)
  - Parses PROPERTIES, FIELDS, KEYS, FIELDGROUPS, and CODE sections
  - Parses procedure/function declarations
  - Parses variable declarations (VAR sections)
  - Constructs Abstract Syntax Tree (AST) for semantic analysis
  - Error recovery for incomplete/invalid code

- **Symbol Table**
  - Tracks variables, fields, procedures, and functions
  - Foundation for future features (go-to-definition, find references, etc.)
  - Case-insensitive symbol lookup (matches C/AL semantics)

- **Language Server Infrastructure**
  - Full LSP client-server architecture
  - Communication via JSON-RPC over IPC
  - Document synchronization and caching
  - Real-time parsing and analysis
  - Foundation for future IDE features

#### Technical Implementation

**Project Structure:**
```
c-al-extension/
├── src/
│   └── extension.ts          # Language client
├── server/
│   └── src/
│       ├── server.ts          # Language server main
│       ├── lexer/             # Tokenization
│       │   ├── tokens.ts
│       │   └── lexer.ts
│       ├── parser/            # Parsing and AST
│       │   ├── ast.ts
│       │   └── parser.ts
│       ├── semantic/          # Semantic tokens
│       │   └── semanticTokens.ts
│       └── symbols/           # Symbol table
│           └── symbolTable.ts
└── syntaxes/
    └── cal.tmLanguage.json   # TextMate grammar (still used)
```

**How It Works:**
1. Extension activates when a .cal file is opened
2. Language client starts language server as a separate process
3. Server parses document using lexer → parser → AST
4. Semantic tokens are generated and sent to client
5. Client applies semantic colors, overriding TextMate appearance
6. TextMate grammar continues to provide bracket matching

**Benefits:**
- Quoted identifiers now visually consistent with regular identifiers
- Foundation for advanced features (completion, go-to-definition, etc.)
- Better error detection and diagnostics
- Maintains all existing TextMate functionality
- No breaking changes for existing users

#### Future Enhancements (Not in This Release)

The language server architecture enables these future features:
- IntelliSense / Code completion
- Go to definition
- Find all references
- Hover information (type info, documentation)
- Rename refactoring
- Advanced diagnostics (type checking, unused variables)

### Changed

- Added TypeScript compilation step (`npm run compile`)
- Extension now has both client and server components
- Increased minimum VS Code version to 1.80.0 (for LSP support)

### Dependencies

- Added `vscode-languageclient` (^8.1.0) - client library
- Added `vscode-languageserver` (^8.1.0) - server library
- Added `vscode-languageserver-textdocument` (^1.0.8) - document handling
- Added `typescript` (^5.0.0) - TypeScript compiler
- Added `@types/node` (^18.0.0) - Node.js type definitions

## [0.2.12] - 2025-11-06

### Fixed - Option Value Pattern Not Working (Pattern Ordering Issue)

- **Fixed Option Value Pattern Added in v0.2.11 Was Completely Non-Functional**
  - **Problem**: Option values like `"Totaling Type"::"Posting Accounts"` were highlighted as orange strings, not constants
  - **Examples from COD9.TXT that were broken**:
    - Line 96: `"Totaling Type"::Formula` - "Formula" appeared white
    - Line 96: `"Totaling Type"::"Set Base For Percent"` - quoted value appeared orange
    - Line 107-108: `"Posting Accounts"`, `"Total Accounts"` - appeared orange
    - Line 117: `"Account Type"::Total` - "Total" appeared white
    - Line 128-129: `"Cost Type"`, `"Cost Type Total"` - appeared orange
  - **All option values after `::` were incorrectly scoped as strings or identifiers, not constants**

- **Root Cause: Pattern Ordering in Main Patterns Array**
  - TextMate grammars match patterns top-to-bottom in the patterns array
  - In v0.2.11, pattern order was:
    - Line 13: `{ "include": "#strings" }` ← matched FIRST
    - Line 22: `{ "include": "#constants" }` ← matched LATER (too late!)
  - When TextMate encountered `"Value"::Something`:
    1. String pattern immediately matched `"Value"` as `string.quoted.double.identifier.cal`
    2. Operator `::` matched separately
    3. String pattern matched next part as string
    4. Option value pattern in #constants never had a chance - text already tokenized!

- **The Fix: Move Constants Before Strings**
  - **Solution**: Reordered main patterns array to match constants BEFORE strings
  - New pattern order:
    - Line 13: `{ "include": "#constants" }` ← now matches FIRST
    - Line 14: `{ "include": "#strings" }` ← matches LATER
  - Now option value pattern can match the entire construct `"Type"::"Value"` before individual parts are tokenized
  - Option values now correctly scoped as `constant.other.option-value.cal`

### Technical Details

**Pattern Array Change:**
```json
Before:
  { "include": "#comments" },
  { "include": "#strings" },        ← position 13
  ...
  { "include": "#constants" },      ← position 22

After:
  { "include": "#comments" },
  { "include": "#constants" },      ← position 13 (moved up!)
  { "include": "#strings" },        ← position 14
```

**Why Order Matters in TextMate Grammars:**
- TextMate processes patterns sequentially from top to bottom
- Once text is tokenized, it's scoped and won't be re-matched by later patterns
- Longer/more specific patterns must come before shorter/general patterns
- Option value pattern matches `"Type"::"Value"` as one unit (more specific)
- String pattern matches `"Type"` as individual string (more general)

### Impact

- ✅ **Option values now correctly highlighted as constants**
- ✅ **Better semantic accuracy** - option references distinguished from regular strings
- ✅ **Theme compatibility** - themes can now style option values distinctly using `constant.other.option-value.cal` scope
- ✅ **No breaking changes** - Only affects option value highlighting

### Lesson Learned

**Pattern ordering is critical in TextMate grammars!** Always place more specific patterns before more general ones in the main patterns array. The option value pattern was perfect - it just needed to run before the string pattern tokenized the text.

## [0.2.11] - 2025-11-06

### Added - Option Value Pattern and Simplified Function Patterns

- **Added Option Value Pattern for Better Semantic Highlighting**
  - **Feature**: New pattern to recognize option value references using `::` operator
  - **Scope**: `constant.other.option-value.cal`
  - **Pattern**: Matches both simple and quoted identifiers on both sides of `::`
  - **Examples**:
    - `Status::Open` - Simple identifier option value
    - `"Account Type"::"End-Total"` - Quoted identifiers on both sides
    - `GLAcc."Account Type"::"Begin-Total"` - Member access with option value
  - **Benefits**:
    - Better semantic meaning - option values are now scoped as constants
    - Improved theme compatibility - themes can style option values distinctly
    - More accurate highlighting of C/AL-specific syntax

- **Simplified Function Patterns (Inspired by cal1)**
  - **Change**: Simplified function call patterns using actual match instead of lookahead
  - **Before**: `([A-Za-z_][A-Za-z0-9_]*)\\s*(?=\\()` - used lookahead assertion
  - **After**: `([A-Za-z_][A-Za-z0-9_]*)\\s*\\(` - actual match with capture groups
  - **Applied to**:
    - Member function calls: `.LOOKUPMODE()`, `.SetSelection()`
    - Regular function calls: `MESSAGE()`, `CONFIRM()`
  - **Benefits**:
    - Simpler pattern logic - easier to understand and maintain
    - Better theme compatibility - some themes work better with actual matches
    - Inspired by analysis of cal1 extension in inspiration folder

### Inspiration Folder Analysis

- **Research**: Analyzed alternative approaches in inspiration folder
  - Official AL extension configuration
  - cal1 extension (simpler patterns, avoids keyword-based brackets)
  - cal2 extension
  - Official AL syntax files
- **Key Findings**:
  - cal1 uses simpler function patterns with actual matches instead of lookaheads
  - cal1 has option value pattern that we were missing
  - cal1 avoids "End-Total" problem by not using keyword-based brackets
  - Our v0.2.10 fix (using `string.quoted.*` scope) was correct approach
- **Adopted Best Practices**: Implemented option value pattern and simplified function patterns from cal1

## [0.2.10] - 2025-11-06

### Fixed - Bracket Matching in Quoted Identifiers (The REAL Fix)

- **Fixed Bracket Matching Treating "End" Inside Quoted Identifiers as END Keyword**
  - **Problem**: Keywords like "End" in `"End-Total"` showed as red (unmatched END bracket)
  - **Root Cause Analysis**: The v0.2.9 fix addressed syntax highlighting but NOT bracket matching
    - **Two separate systems in VS Code**:
      1. Syntax highlighting (controlled by `.tmLanguage.json` - keyword patterns)
      2. Bracket matching (controlled by `language-configuration.json` - bracket pairs)
    - Double-quoted identifiers were scoped as `variable.other.quoted-identifier.cal`
    - VS Code's bracket matcher has `notIn: ["string", "comment"]` protection
    - But `variable.*` scopes are NOT recognized as "string" context
    - So bracket matcher still matched "End" in `"End-Total"` as a bracket!

- **The Real Solution: Change Scope to String**
  - Changed double-quoted identifier scope: `variable.other.quoted-identifier.cal` → `string.quoted.double.identifier.cal`
  - Now VS Code recognizes quoted identifiers as "string" context
  - Bracket matcher respects `notIn: ["string"]` and ignores text inside
  - The `.identifier` suffix preserves semantic meaning in the scope name

- **Why v0.2.9 Fix Didn't Work**
  - v0.2.9 added negative lookahead `(?!-)` to keyword patterns
  - This fixed **syntax highlighting** (keyword coloring)
  - But didn't fix **bracket matching** (red END markers)
  - Bracket matching uses `language-configuration.json`, not keyword patterns
  - Bracket pairs like `["Begin", "End"]` search for literal text matches
  - No regex or negative lookaheads in bracket matching
  - Only protection is `notIn: ["string", "comment"]`

### Technical Details

**Scope Change:**
```json
Before: "name": "variable.other.quoted-identifier.cal"
After:  "name": "string.quoted.double.identifier.cal"
```

**Why This Works:**
- VS Code's bracket matcher checks token scopes
- Scope names starting with `string.` are treated as string context
- The `notIn: ["string"]` configuration now applies
- Bracket matching skips over any text inside `string.*` scopes

**Punctuation Scopes Updated:**
- `punctuation.definition.identifier.*` → `punctuation.definition.string.*`
- Consistent with standard TextMate scope naming conventions

**Examples Fixed (COD8.TXT):**
- Line 1333: `GLAcc."Account Type"::"End-Total"` ✅ no more red END
- Line 1335: `AccSchedLine."Totaling Type"::"Total Accounts"` ✅ fixed
- All quoted identifiers with keyword-like text ✅ fixed

### Impact

- ✅ **Bracket matching now correct** - No false red markers in quoted identifiers
- ✅ **"End-Total", "Begin-Total"** and similar option values work correctly
- ✅ **notIn: ["string"]** protection now applies to double-quoted identifiers
- ✅ **Semantically accurate** - Scope name still indicates identifier purpose
- ✅ **No breaking changes** - Syntax highlighting unchanged, only scope name

### Lesson Learned

**VS Code has two separate systems:**
1. **Syntax Highlighting** - Uses TextMate grammar (`.tmLanguage.json`)
   - Controlled by regex patterns and scopes
   - Determines token colors

2. **Bracket Matching** - Uses language configuration (`language-configuration.json`)
   - Controlled by literal text pairs and `notIn` contexts
   - Determines bracket pairs and red error markers
   - Only checks if token scope starts with `string.` or `comment.`

**To fix bracket matching issues, must use proper scope names that VS Code recognizes!**

## [0.2.9] - 2025-11-06

### Fixed - Critical Keyword Matching in Hyphenated Identifiers

- **Fixed Keywords Being Matched Inside Hyphenated Option Values**
  - **Problem**: Keywords like `END` were being matched inside option value identifiers like `"End-Total"`
  - **Impact**: Caused bracket matching errors - END appeared in red indicating missing BEGIN
  - **Example from COD8.TXT**:
    - Line 1333: `GLAcc."Account Type"::"End-Total"` - "End" was incorrectly matched as END keyword
    - Line 1335: `AccSchedLine."Totaling Type"::"Total Accounts"` - similar issue
  - **Root Cause**: Word boundary `\b` treats hyphens as boundaries, so `End` in `End-Total` was matched
  - **Solution**: Added negative lookahead `(?!-|[A-Za-z0-9_])` to all keyword patterns
  - **Result**: Keywords only match when truly standalone, not as part of hyphenated identifiers

- **Updated All Keyword Patterns for Consistency**
  - Control keywords: `IF`, `THEN`, `ELSE`, `BEGIN`, `END`, `CASE`, etc.
  - Other keywords: `PROCEDURE`, `FUNCTION`, `TRIGGER`, `VAR`, etc.
  - Logical operators: `AND`, `OR`, `NOT`, `XOR`, `IN`
  - Object types: `TABLE`, `PAGE`, `REPORT`, `CODEUNIT`, etc.
  - Storage modifiers: `PROPERTIES`, `FIELDS`, `KEYS`, `CODE`, etc.
  - Property keywords: `FIELD`, `FILTER`, `SUM`, `COUNT`, etc.

### Technical Details

**Pattern Change:**
- Before: `\b(END)\b` - Word boundary on both sides
- After: `\b(END)(?!-|[A-Za-z0-9_])\b` - Word boundary + negative lookahead

**Negative Lookahead Explanation:**
- `(?!-)` - Not followed by hyphen (prevents matching in "End-Total")
- `(?![A-Za-z0-9_])` - Not followed by identifier characters (prevents false positives)

**Affected Patterns:**
- 6 keyword pattern groups updated
- All patterns now use consistent negative lookahead
- Maintains correct matching for actual keywords

### Impact

- ✅ Option values like `"End-Total"`, `"Begin-Total"` no longer incorrectly highlight keywords
- ✅ Bracket matching now works correctly (no false red END markers)
- ✅ Hyphenated identifiers treated as single units
- ✅ All keywords still match correctly when used as actual keywords
- ✅ No breaking changes to valid keyword highlighting

## [0.2.8] - 2025-11-06

### Fixed - Critical Function Highlighting Issues

- **Fixed Method/Function Calls After Dot Operator Not Being Highlighted**
  - **Problem**: Functions called on objects (e.g., `GLAccList1.LOOKUPMODE()`, `GLAccList.SetSelection()`) were not highlighted
  - **Root Cause**: Function pattern used `\b` (word boundary) which failed after dot operators
  - **Solution**: Added dedicated pattern for method calls after dot: `\.([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()`
  - **Impact**: All member function calls now properly highlighted
  - **Affected Code Examples from COD8.TXT**:
    - Line 1305: `GLAccList1.LOOKUPMODE(TRUE);` - now highlights `LOOKUPMODE`
    - Line 1308: `GLAccList1.RUNMODAL` - now highlights `RUNMODAL`
    - Line 1311: `GLAccList.SetSelection(GLAcc);` - now highlights `SetSelection`
    - Line 1317: `MovedSchedLine(AccSchedLine,AccCounter);` - now highlights `MovedSchedLine`
    - Line 1323: `MAXSTRLEN(AccSchedLine."Row No.")` - now highlights `MAXSTRLEN`

- **Added Missing Page/Form Built-in Functions**
  - `LOOKUPMODE` - Set page to lookup mode
  - `EDITABLE` - Set page editability
  - `SETTABLEVIEW` - Apply filters to page
  - `GETRECORD` - Get record from page
  - `SETRECORD` - Set record in page
  - `LOOKUPOK` - Lookup OK constant
  - These are commonly used in C/AL for Page/Form manipulation

- **Improved Function Pattern Matching**
  - Changed generic function pattern from word boundary (`\b`) to negative lookbehind (`(?<![A-Za-z0-9_])`)
  - Ensures functions are matched correctly in all contexts
  - Three-tier matching strategy:
    1. Built-in functions (highest priority)
    2. Member functions after dot (medium priority)
    3. Regular function calls (standard priority)

### Technical Details

**Pattern Changes:**
- Added: `\.([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()` for member function calls
- Changed: `\b([A-Za-z_][A-Za-z0-9_]*)` → `(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)` for regular functions
- Maintained: Built-in function list with word boundaries (works correctly)

**Testing Source:**
- Real-world code: COD8.TXT (Codeunit 8 - AccSchedManagement)
- Screenshot analysis revealed multiple highlighting failures
- All identified issues now resolved

### Impact

- ✅ Member function calls (`.function()`) now highlighted correctly
- ✅ Built-in Page/Form functions properly recognized
- ✅ Function highlighting now consistent across all contexts
- ✅ No breaking changes to existing highlighting

## [0.2.7] - 2025-11-06

### Added - Comprehensive Function and Type Library

- **Expanded Built-in Function Library**: Added 40+ missing C/AL functions
  - **Bulk Operations**: `MODIFYALL`, `DELETEALL` - Modify/delete multiple records at once
  - **Range Functions**: `GETRANGEMIN`, `GETRANGEMAX`, `GETFILTER`, `GETFILTERS` - Query active filters
  - **Field Functions**: `FIELDERROR`, `FIELDNAME`, `FIELDCAPTION` - Field metadata access
  - **Table Functions**: `TABLENAME`, `TABLECAPTION` - Table metadata access
  - **Record Management**: `TRANSFERFIELDS`, `COPY`, `RENAME`, `DUPLICATE` - Advanced record operations
  - **Filter Management**: `FILTERGROUP`, `HASFILTER`, `COPYFILTERS`, `SETPERMISSIONFILTER` - Filter control
  - **Multi-Company**: `CHANGECOMPANY` - Cross-company operations
  - **Record Marking**: `MARK`, `MARKEDONLY` - Temporary record marking
  - **Links**: `COPYLINKS`, `DELETELINKS`, `HASLINKS` - Record link management
  - **Performance**: `SETAUTOCALCFIELDS`, `SETLOADFIELDS`, `RECORDLEVELLOCKING` - Optimization
  - **Position**: `GETPOSITION`, `SETPOSITION` - Record position management
  - **Metadata**: `RECORDID`, `CAPTION`, `CONSISTENCY`, `ASCENDING` - Record and table metadata
  - All functions verified against NAV 2018 C/AL reference documentation

- **Enhanced Data Type Library**: Added 15+ missing NAV 2018 data types
  - **NAV 2013+ Types**: `ClientType`, `DefaultLayout`, `TestPage`, `TableConnectionType`
  - **NAV 2016+ Types**: `TransactionType`
  - **NAV 2018+ Types**: `DataClassification`, `DataScope`, `LogLevel`, `Verbosity`, `SessionSettings`, `Notification`, `NotificationScope`, `WebServiceActionContext`
  - All types properly scoped and documented with version requirements

### Documentation - Comprehensive AL vs C/AL Guidance

- **New File: AL-vs-CAL.md** - Complete feature comparison document (300+ lines)
  - ✅ **C/AL Features Section**: Complete catalog of supported C/AL language features
    - Object types, language constructs, operators, data types, built-in functions
    - Version-specific features with NAV version requirements
  - ❌ **AL-Only Features Section**: Comprehensive list of unsupported AL features
    - Modern object types (ENUM, INTERFACE, extensions, etc.)
    - Extension metadata keywords (EXTENDS, MODIFY, ADD, etc.)
    - Modern access modifiers (INTERNAL, PROTECTED)
    - Modern data types (SecretText, ErrorInfo, ErrorType, etc.)
    - Preprocessor directives and modern syntax features
  - 🔄 **Features That Changed**: Detailed comparison of syntax differences
    - Event declaration syntax (C/AL vs AL)
    - Case sensitivity differences
    - Object file format differences
    - Comment handling differences
  - 📅 **Version-Specific Features Table**: Clear NAV version requirements
  - 🎓 **Development Guidelines**: Best practices for C/AL development
  - 📖 **Resource Links**: Official documentation and references

- **Updated: cal.md** - Added comprehensive warning section
  - ⚠️ **"Warning: Common Mistakes from Failed Prototypes"** section
  - Lists all AL-only features found in failed "cal2" prototype
  - Explains why each feature should NOT be added to C/AL highlighting
  - Documents features initially misidentified (compound operators correction)
  - **Development Best Practices** subsection with verification methods
  - **Quick Reference Table** for verifying C/AL vs AL features
  - **"Why This Matters"** section explaining consequences of incorrect highlighting

### Impact

- ✅ **Function Coverage**: ~140 total C/AL functions now supported (was ~90)
- ✅ **Type Coverage**: ~45 data types now supported (was ~30)
- ✅ **Better AL Awareness**: Clear documentation prevents AL contamination
- ✅ **Developer Guidance**: Two comprehensive reference documents
- ✅ **Error Prevention**: Warnings prevent incorrect syntax highlighting
- ✅ **Version Clarity**: All features documented with NAV version requirements

### Technical Details

**Files Modified:**
- `c-al-extension/syntaxes/cal.tmLanguage.json`
  - Functions: Expanded from 90 to ~140 functions
  - Data types: Expanded from 30 to ~45 types
  - All additions verified against NAV 2018 documentation

**Files Created:**
- `AL-vs-CAL.md` - Complete AL vs C/AL feature comparison (300+ lines)

**Files Enhanced:**
- `cal.md` - Added 80+ lines of warning documentation about AL-only features

## [0.2.6] - 2025-11-06

### Added - Enhanced Syntax Support

- **CalcFormula and Query Property Keywords**: Added syntax highlighting for C/AL property keywords used in FlowField and Query definitions
  - Filter keywords: `FIELD`, `FILTER`, `CONST`, `WHERE`, `TABLEDATA`
  - Aggregation functions: `SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`, `LOOKUP`, `EXIST`
  - Ordering keywords: `ASCENDING`, `DESCENDING`, `ORDER`, `SORTING`, `UPPERLIMIT`
  - These keywords are essential for CalcFormula expressions like: `Sum("Table".Field WHERE (Filter1=FIELD(SourceField),Filter2=CONST(value)))`

- **Compound Assignment Operators**: Added support for compound assignment operators (NAV 2018+)
  - Operators: `+=`, `-=`, `*=`, `/=`
  - These operators were found in real NAV 2018 code (COD9.TXT) and are confirmed C/AL compatible
  - Example: `"No." += 1;` or `Result += GetCellValueWithDimFilter(...);`

- **Date/Time Literal Formats**: Added syntax highlighting for C/AL date and time literal constants
  - Date literals: `MMDDYY[YY]D` format (e.g., `010125D`, `01012025D`, `0D` for undefined)
  - DateTime literals: `MMDDYY[YY]DT` format
  - Time literals: `HHMMSS[ms]T` format
  - Proper scoping: `constant.numeric.date.cal`, `constant.numeric.datetime.cal`, `constant.numeric.time.cal`

- **.NET Interop Keywords**: Added syntax highlighting for C/AL .NET Framework interoperability (NAV 2016+)
  - `FOREACH` - Iterate through .NET collections/arrays
  - `EVENT` - .NET event trigger declarations
  - `WITHEVENTS` - DotNet variable property for event subscription
  - Example: `FOREACH element IN collection DO BEGIN ... END;`

- **Option Value Operators**: Enhanced operator support for Option type syntax
  - Scope operator `::` for option value references (e.g., `"Account Type"::"Begin-Total"`)
  - Pipe operator `|` for OptionString property definitions (e.g., `Open|Released|Pending Approval`)

### Improved - Language Configuration

- **Enhanced Folding**: Added keyword-based folding in addition to #region markers
  - Start markers: `BEGIN`, `CASE`, `REPEAT`, `PROCEDURE`, `FUNCTION`, `TRIGGER`
  - End markers: `END`
  - More appropriate for C/AL code than AL-only #region markers
  - Still supports #region/#endregion for compatibility

- **Smart Indentation Rules**: Improved automatic code formatting
  - Increase indent after: `BEGIN`, `THEN`, `ELSE`, `DO`, `REPEAT`, `VAR`
  - Decrease indent on: `END`, `UNTIL`
  - Better handling of nested BEGIN/END blocks
  - More accurate indentation for C/AL control structures

### Impact

- ✅ CalcFormula expressions now have proper syntax highlighting
- ✅ Compound assignment operators correctly recognized (NAV 2018+)
- ✅ Date/Time literals properly highlighted
- ✅ .NET interop code (FOREACH, EVENT, WITHEVENTS) correctly highlighted
- ✅ Option value references with `::` operator highlighted
- ✅ Better code folding based on C/AL keywords
- ✅ Improved auto-indentation for cleaner code formatting

## [0.2.5] - 2025-11-06

### Fixed - Curly Brace Comments (Definitive Solution)

- **BREAKING FIX**: Curly brace comments `{ }` are now **ONLY** allowed inside `BEGIN...END` blocks
  - **Root Cause Identified**: Previous approaches (v0.2.3, v0.2.4) used negative lookaheads and section-specific patterns, but still incorrectly treated structural braces as comments
  - **Key Insight**: After analyzing real C/AL code and the C/SIDE compiler behavior, curly brace comments are ONLY valid within executable code blocks (BEGIN/END), never at the structural level
  - **Structural Braces**: All curly braces outside BEGIN/END blocks are structural delimiters (object wrapper, section wrappers, field definitions)

### Technical Implementation

**New Grammar Architecture:**

1. **OBJECT Declaration Pattern**: Top-level pattern matching entire object structure
   - Matches: `OBJECT <Type> <ID> <Name>`
   - Captures opening `{` as structural delimiter
   - Wraps everything until final closing `}`
   - Contains: section-blocks and non-curly-comments only

2. **BEGIN/END Block Pattern**: Dedicated code block pattern
   - Matches: `BEGIN ... END` (with optional `.` terminator)
   - **Only place where curly brace comments are allowed**
   - Supports nested BEGIN/END blocks
   - Contains: all code patterns + curly-brace-comments

3. **Curly Brace Comments Pattern**: Isolated comment pattern
   - Simple pattern: `\{ ... \}`
   - **ONLY included within begin-end-block patterns**
   - Never included at top level or in sections

4. **Updated Section Patterns**: All sections now include BEGIN/END blocks
   - OBJECT-PROPERTIES, PROPERTIES, CODE, FIELDS, KEYS, etc.
   - Each section can contain BEGIN/END blocks (for property values like `OnValidate=BEGIN...END`)
   - Curly braces in sections are structural unless inside BEGIN/END

**Removed**: Curly brace comment pattern from top-level `comments` repository

### Documentation

- **Added comprehensive section to cal.md**: "Where Curly Brace Comments Are Allowed"
  - Clear rules on allowed vs. not allowed locations
  - Examples of valid curly brace comment usage
  - Explanation of why this matters (dual nature of curly braces)
  - Recommendation to use `//` or `/* */` to avoid ambiguity

### Impact

- ✅ **OBJECT declaration braces**: No longer treated as comments
- ✅ **Section opening braces**: Correctly recognized as structural punctuation
- ✅ **Field definition braces**: Still working correctly as structural format
- ✅ **BEGIN/END block comments**: `{ }` comments work only where they should
- ✅ **Multi-file support**: Handles malformed spacing (blank lines between sections)
- ✅ **All test files**: COD93.TXT, malformed-test.txt, example.cal now highlight correctly

### Why This Is The Definitive Fix

Previous versions attempted to use negative lookaheads to exclude specific patterns from being treated as comments. This approach was fundamentally flawed because:

1. It tried to enumerate all non-comment cases (impossible to be exhaustive)
2. It didn't account for formatting variations (blank lines, spacing)
3. It placed curly brace comments at the wrong precedence level

The v0.2.5 solution is correct because:

1. It follows C/AL's actual language rules (curly comments only in BEGIN/END)
2. It uses proper pattern hierarchy (OBJECT → sections → BEGIN/END → comments)
3. It treats structural braces as punctuation, not as "non-comments"
4. It's maintainable and won't require future patches for edge cases

## [0.2.4] - 2025-11-05

### Fixed - Section Block Structure (Proper Fix for Curly Brace Issue)

- **Complete Rewrite of Section Handling**: Fixed curly brace syntax highlighting with proper begin/end patterns
  - **Previous Approach (v0.2.3):** Used negative lookaheads in comment pattern - INCOMPLETE
  - **Problem:** When section keywords like `OBJECT-PROPERTIES` appeared on a line BEFORE the `{`, the negative lookahead failed because the brace wasn't followed by the keyword
  - **New Solution:** Created dedicated `section-blocks` patterns that properly capture:
    - The section keyword (OBJECT-PROPERTIES, PROPERTIES, CODE, etc.)
    - The opening `{` (even if on next line)
    - The content inside with appropriate sub-patterns
    - The closing `}`
  - **Priority Order:** Section-blocks now processed BEFORE comments, so they take precedence

### Technical Implementation

**Iteration 1:** Tried nested begin/end with lookaheads - partially worked but had edge cases

**Iteration 2 (Final):** Simplified pattern structure:
- Outer `begin`: Matches section keyword on its own line `^\s*(KEYWORD)\s*$`
- Outer `end`: Matches closing brace on its own line `^\s*\}\s*$`
- Inner `match`: Matches opening brace on its own line `^\s*\{\s*$`
- Content patterns: Include appropriate sub-patterns for each section type

Created four distinct section block patterns:

1. **OBJECT-PROPERTIES Section**: Dedicated pattern with object property sub-patterns
2. **PROPERTIES Section**: General properties with keywords and values
3. **CODE Section**: Full code patterns (variables, procedures, keywords, operators)
4. **Generic Sections**: FIELDS, KEYS, FIELDGROUPS, CONTROLS, ELEMENTS, etc.

Each section properly scopes the curly braces as `punctuation.section.block.begin/end.cal` instead of comment delimiters.

**Simplified curly brace comment pattern** from complex negative lookaheads to just:
```regex
\{(?!\s*\d+\s*;)  // Only exclude field definitions
```

All section structures are now handled by dedicated patterns, making the grammar more maintainable and robust.

### Impact
- ✅ OBJECT-PROPERTIES sections now highlight correctly
- ✅ PROPERTIES sections display properly
- ✅ CODE sections show correct syntax highlighting
- ✅ All structural curly braces recognized as punctuation, not comments
- ✅ True comments still work as expected

## [0.2.3] - 2025-11-05

### Fixed - Critical Bug Fix

- **Curly Brace Comment Pattern**: Fixed major issue where structural curly braces were incorrectly treated as comments
  - **Problem:** Opening curly braces for OBJECT bodies, PROPERTIES sections, and CODE sections were being matched as comment start markers
  - **Impact:** Entire codeunits and other objects were displayed as comments (blueish grey text)
  - **Root Cause:** Negative lookahead `(?!\s*\d+\s*;)` only excluded field definitions, not structural sections
  - **Solution:** Extended negative lookahead to exclude all section keywords:
    - OBJECT-PROPERTIES, PROPERTIES, CODE, FIELDS, KEYS, FIELDGROUPS
    - CONTROLS, ELEMENTS, DATASET, REQUESTPAGE, LABELS
  - **Test Case:** COD93.TXT (Codeunit 93) now highlights correctly

### Technical Details
Updated curly brace comment pattern from:
```regex
\{(?!\s*\d+\s*;)
```

To:
```regex
\{(?!\s*\d+\s*;)(?!\s*OBJECT-PROPERTIES)(?!\s*PROPERTIES)(?!\s*CODE)(?!\s*FIELDS)...
```

This ensures curly braces are only treated as comments when they're actually comments, not structural markers.

## [0.2.2] - 2025-11-05

### Added - Grammar Pattern Improvements (from AL TextMate Grammar Analysis)

#### Phase 1: High Priority Enhancements

- **Enhanced Number Patterns**: Comprehensive numeric literal support
  - Hexadecimal literals: `0x1F`, `0xFF`, `0xABCD` (used in C/AL for BLOB/binary data)
  - Scientific notation: `1.5e10`, `3.14E-5`, `2.5e+3` (valid in C/AL expressions)
  - Floating point without leading zero: `.5`, `.125`, `.999` (valid C/AL syntax)
  - Case-insensitive BigInteger suffix: Both `100L` and `100l` now recognized

- **Punctuation Pattern**: Dedicated highlighting for code structure elements
  - Semicolons (`;`) as statement terminators
  - Colons (`:`) as type separators
  - Commas (`,`) as list separators
  - Improves visual separation in dense code sections

- **Better String Escape Handling**: Enhanced string processing
  - Added `applyEndPatternLast` flag for better error recovery
  - Separate begin/end captures for quote punctuation
  - Specific naming for escape sequences (`constant.character.escape.apostrophe.cal`)
  - Better theme support with granular scoping

#### Phase 2: Refinement Enhancements

- **Improved Comment Whitespace Handling**: Better indentation preservation
  - Captures leading whitespace separately for improved formatting
  - Uses lookahead patterns for more accurate line handling
  - Separate punctuation scope for `//` comment markers
  - Improved comment folding behavior

- **Procedure/Function Name Capture**: Enhanced semantic highlighting
  - Explicitly captures PROCEDURE/TRIGGER keywords
  - Better function name highlighting with optional parameters
  - Handles dotted names for external calls (e.g., `Customer.Get`)
  - Preparation for future outline view and navigation features

- **Range Operator Improvements**: Enhanced operator highlighting
  - Separate scope for range operator `..` (used in ranges like `1..10`)
  - Added `&` operator highlighting (text concatenation in C/AL)
  - More granular operator type distinction

### Improved
- Overall syntax highlighting is now more comprehensive and accurate
- Better visual separation of code elements
- Improved theme compatibility with more specific scopes
- Enhanced error recovery in string and comment parsing

### Technical Details
All improvements were derived from analyzing Microsoft's official AL extension TextMate grammar (`alsyntax.tmlanguage`) and adapting patterns for C/AL syntax differences.

## [0.2.1] - 2025-11-05

### Added - Language Configuration Enhancements (from AL Extension Analysis)
- **BEGIN/END/CASE Bracket Pairs**: Added keyword-based bracket matching for `BEGIN`/`END` and `CASE`/`END`
  - Enables bracket matching with `Ctrl+Shift+\` on keyword blocks
  - Jump between matching BEGIN/END with keyboard shortcuts
  - Visual indicators for mismatched blocks
  - Supports all case variations: `BEGIN`/`begin`/`Begin`, `THEN BEGIN`/`then begin`/`Then Begin`, `CASE`/`case`/`Case`

- **Smart Auto-Closing Pairs**: Automatic completion of keyword blocks
  - `BEGIN` → automatically inserts `END;`
  - `CASE` → automatically inserts `END;`
  - `THEN BEGIN` → automatically inserts `END`
  - Works with all case variations (uppercase, lowercase, titlecase)
  - Respects context (disabled in strings and comments)

- **Improved wordPattern**: Better handling of quoted identifiers
  - Double-quoted identifiers like `"Customer No."` are treated as single words
  - Better double-click selection behavior
  - Improved "Find All" and "Rename Symbol" operations

- **Flexible Region Markers**: Support for multiple folding marker formats
  - Now supports both `//#region` and `#region` formats
  - More flexible code folding options
  - Compatible with various coding styles

- **Semantic Highlighting**: Added flag for future language server support
  - Enables advanced token-based highlighting when language server is available
  - Future-proofs extension for enhanced features

### Improved
- Language configuration now matches AL extension's battle-tested patterns
- Better editor experience with smart keyword completion
- More intuitive code navigation and selection

## [0.2.0] - 2025-11-05

### Added - P0 Critical Fixes
- **@ Numbering System**: Highlights C/AL's unique `@` numbering for variables and procedures (e.g., `@1000`, `@1001`)
- **OBJECT-PROPERTIES Section**: Proper keyword highlighting for OBJECT-PROPERTIES section
- **Field Definition Detection**: Heuristic-based detection of field/key/control definitions to prevent treating them as comments
  - Pattern `{ Number ;` is correctly recognized as structural, not a comment
  - Applies to FIELDS, KEYS, CONTROLS, and FIELDGROUPS sections
- **Curly Brace Comments**: Support for `{ }` comment style (traditional C/AL)
  - Context-aware handling using negative lookahead
  - Prioritizes field definitions over comments
- **TextConst Language Codes**: Highlights multi-language codes (ENU, FRA, DEU, ESP, ITA, NLD, DAN, SVE, NOR, FIN, etc.)
- **Additional Section Keywords**: OBJECT-PROPERTIES, FIELDGROUPS, LABELS, DATASET, REQUESTPAGE
- **Procedure Attributes**: Highlights `[External]`, `[TryFunction]`, `[Integration]`, `[EventSubscriber]`
- **Field Classes**: Highlights FlowField, FlowFilter types
- **TextConst Type**: Specific highlighting for TextConst variable declarations
- **Improved Data Type Patterns**: Better support for both `Code20` and `Code[20]` formats

### Improved
- Double-quoted identifiers now properly highlighted as variables, not strings (e.g., `"No."`, `"Customer No."`)
- Comments in grammar include explanatory notes about context-dependent behavior

### Documentation
- Added detailed "Important: Understanding C/AL Format" section to README
- Documented curly brace context awareness limitations
- Added reference to cal.md for detailed C/AL format information

### Known Limitations
- Curly brace context awareness uses heuristics and may have edge cases
- Advanced IDE features (IntelliSense, navigation) require language server (future work)

## [0.1.0] - 2025-11-05

### Added
- Initial release of C/AL Language Support extension
- Comprehensive syntax highlighting for C/AL language
  - All C/AL keywords (control flow, loops, functions, object types)
  - All fundamental and complex data types
  - 100+ built-in functions
  - Operators (arithmetic, comparison, logical, assignment)
  - Comments (single-line and multi-line)
  - String literals with escape character support
  - Number literals (integer, decimal, BigInteger)
- Language configuration features
  - Bracket matching for `{}`, `[]`, `()`
  - Auto-closing pairs for brackets, quotes, and comments
  - Comment toggling support (`Ctrl+/`)
  - Code folding with region markers
  - Smart indentation rules
- Support for `.cal` and `.txt` file extensions
- Basic TextMate grammar implementation

### Known Issues
- No IntelliSense/code completion yet (planned for future release)
- No go-to-definition support (planned for future release)
- No code navigation features (planned for future release)
- No debugging support (planned for future release)

