# C/AL Language for Visual Studio Code

Comprehensive language support for Microsoft Dynamics NAV C/AL programming language, providing intelligent code editing features through a full Language Server Protocol implementation.

## Features

### Code Intelligence

**Code Completion (v0.4.9)** - Context-aware IntelliSense suggestions
- 54 C/AL keywords with descriptions
- 65+ built-in functions (MESSAGE, ERROR, STRSUBSTNO, etc.) with signatures
- 55+ Record methods (GET, FIND, FINDSET, INSERT, MODIFY, DELETE, etc.)
- Symbol completion for variables, fields, and procedures
- Dot-trigger completion for Record methods and table fields
- Automatic quoting for field names with spaces

**Hover Information (v0.4.1)** - Documentation on hover
- Type information for variables and fields
- Documentation for 65+ built-in functions with signatures
- Record method documentation after dot (e.g., `Rec.GET`)
- Keyword descriptions for control flow, data types, and operators

**Signature Help (v0.4.2)** - Parameter hints while typing
- Parameter hints for 70+ built-in C/AL functions
- 55+ Record method signatures
- Active parameter highlighting
- Nested function call support

### Navigation

**Go to Definition (v0.4.3)** - Jump to symbol definitions
- F12 to navigate to variable, field, and procedure definitions
- Case-insensitive symbol lookup
- Accurate location ranges

**Find All References (v0.4.4)** - Locate all symbol usages
- Shift+F12 to find all usages of variables, fields, and procedures
- Expression context support (assignments, conditions, function calls)
- Include/exclude declaration option

**Document Symbol (v0.5.0)** - Code outline navigation
- Hierarchical outline in Explorer sidebar (Ctrl+Shift+O)
- Object-level symbols (Tables, Pages, Codeunits)
- Section-level symbols (FIELDS, KEYS, CODE)
- Quick jump to procedures and fields

**Workspace Symbol (v0.5.0)** - Workspace-wide symbol search
- Ctrl+T to search for symbols across entire workspace
- Find procedures, fields, objects by name
- Fuzzy matching support

### Refactoring

**Rename Symbol (v0.5.0)** - Safe symbol renaming
- F2 to rename variables, fields, procedures across document
- Multi-token field name support (e.g., `Entry No.`)
- Handles both quoted and unquoted identifiers
- Scope-aware refactoring

### Code Visualization

**Semantic Highlighting (v0.3.0)** - Intelligent syntax coloring
- AST-based semantic analysis for accurate highlighting
- Quoted identifiers like `"Line No."` match regular identifier colors
- Context-aware token classification

**Code Lens (v0.5.0)** - Inline reference indicators
- Reference count indicators above procedures
- Click to navigate to references
- Jump to references directly from declaration

**Folding Ranges (v0.5.0)** - Code folding support
- Code folding for BEGIN...END blocks
- Procedure and function folding
- Section folding (FIELDS, KEYS, CODE)

### Diagnostics

**Parse Error Detection** - Real-time syntax validation
- Identifies syntax errors as you type
- Detailed error messages with line/column information
- Error recovery for continued analysis

**Empty Set Validation (v0.5.0)** - Logic error detection
- Detects empty sets in `IN` expressions: `IF X IN [] THEN`
- Warns about unreachable code paths
- Configurable severity (warning/error)

**Depth Warnings (v0.5.0)** - Stack overflow protection
- Prevents crashes on deeply nested AST structures
- Handles complex Action hierarchies in Page objects
- Graceful degradation with error reporting

**AL-Only Feature Detection (v0.5.0)** - Version compatibility warnings
- Warns when AL-only syntax is used in C/AL files
- Prevents NAV compilation errors
- Helps maintain C/AL vs AL boundaries

### Syntax Highlighting

Full syntax highlighting powered by TextMate grammar:
- C/AL keywords, data types, operators, and functions
- Comments (single-line `//`, multi-line `/* */`, and curly brace `{ }`)
- @ Numbering System for variables and procedures
- Field definitions with smart detection (prevents treating structural braces as comments)
- TextConst language codes (ENU, FRA, DEU, etc.)
- Number literals (hexadecimal, scientific notation, decimals)
- String highlighting with escape character support
- Proper handling of double-quoted identifiers (e.g., `"No."`, `"Customer No."`)

### Language Features

Editor enhancements for C/AL development:
- **Keyword Bracket Matching** - Jump between matching BEGIN/END and CASE/END blocks with Ctrl+Shift+\
- **Smart Auto-Closing** - Automatic completion of keyword blocks (BEGIN → END;, CASE → END;)
- **Bracket Matching** - Automatic matching for `{}`, `[]`, `()`, and keyword pairs
- **Comment Toggle** - Use Ctrl+/ (or Cmd+/ on Mac) to toggle line comments
- **Code Folding** - Support for region markers (`//#region`, `#region`)
- **Smart Indentation** - Automatic indentation based on C/AL code structure
- **Improved Word Selection** - Double-click quoted identifiers like `"Customer No."` to select entire identifier

## Supported File Extensions

- `.cal` - C/AL source files
- `.txt` - NAV object exports in text format

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `cal.languageServer.enabled` | boolean | `true` | Enable/disable the C/AL Language Server |
| `cal.semanticHighlighting.enabled` | boolean | `true` | Enable/disable semantic highlighting |

Access settings via File > Preferences > Settings (Ctrl+,) and search for "C/AL".

## File Encoding Configuration

### Background

C/AL files exported from NAV use legacy single-byte encodings based on Windows regional settings:
- **Western European systems:** Typically CP850 (DOS Latin 1)
- **US systems:** Typically CP437 (DOS US)
- **NAV 2015+:** Can export UTF-8 with BOM (depends on export settings; CP850 output is still possible)

This affects characters like Nordic letters (ø, æ, å), German umlauts (ä, ö, ü), and currency symbols.

### Recommended Setup

**Option 1: Enable Auto-Detection (Recommended)**

Add to your VS Code settings (Ctrl+, or Cmd+,):

```json
{
  "files.autoGuessEncoding": true
}
```

This works for most files but may struggle to distinguish between similar single-byte codepages.

**Option 2: Manual Encoding Selection (Fallback)**

If characters still appear garbled:

1. Click the encoding indicator in the VS Code status bar (bottom right, shows "UTF-8" or similar)
2. Select "Reopen with Encoding"
3. Try these encodings based on file origin:
   - `Western (CP 850)` - Western European NAV installations
   - `Western (CP 437)` - US NAV installations
   - `UTF-8` - NAV 2015+ exports with BOM

**Tip:** If you know your NAV installation's regional settings, you can set a workspace default:

```json
{
  "files.encoding": "cp850"
}
```

## Important: Understanding C/AL Format

**This extension supports C/AL text exports (.txt files) from Dynamics NAV C/SIDE, NOT modern AL code for Business Central.**

C/AL has unique syntax features:
- Curly braces `{ }` serve multiple purposes (structural delimiters AND comments)
- `@` numbering system for variables and procedures
- Fixed-width FIELDS/KEYS/CONTROLS sections
- `BEGIN END.` notation (note the period)

## Testing

The C/AL Language Server includes a comprehensive test suite with **4,710 passing tests across 118 suites**, executing in ~7-14 seconds.

### Test Coverage

- **High coverage:** 98%+ lexer coverage, 90% semantic tokens coverage
- **Real-world validation:** 9 production C/AL files from Microsoft's cal-open-library
- **Categories covered:**
  - Lexer: Quoted identifiers, keywords, comments, operators, literals (150+ tests)
  - Parser: Object parsing, AST validation, error recovery (100+ tests)
  - Completion: Keywords, built-in functions, Record methods, dot-trigger (31 tests)
  - Hover: Symbol info, keyword docs, built-in function docs (34 tests)
  - Signature Help: Function signatures, parameter tracking (35 tests)
  - Definition: Variable, field, procedure navigation (25+ tests)
  - References: Usage tracking across all expression contexts (35+ tests)
  - Regression: Snapshot testing with real C/AL files (66 tests)

### Running Tests

```bash
# Navigate to server directory
cd server

# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests in watch mode (during development)
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage
```

## Development

### Project Structure

```
c-al-extension/
├── src/                    # Extension client (TypeScript)
│   └── extension.ts        # LSP client entry point
├── server/                 # Language server (TypeScript)
│   ├── src/
│   │   ├── lexer/         # Tokenization
│   │   ├── parser/        # AST generation
│   │   ├── types/         # Type definitions
│   │   ├── symbols/       # Symbol table
│   │   ├── visitor/       # AST visitor pattern
│   │   ├── trivia/        # Whitespace and comment handling
│   │   ├── providers/     # Base provider class
│   │   ├── completion/    # Code completion (IntelliSense)
│   │   ├── hover/         # Hover information
│   │   ├── definition/    # Go-to-definition
│   │   ├── references/    # Find all references
│   │   ├── signatureHelp/ # Parameter hints
│   │   ├── semantic/      # Semantic highlighting
│   │   ├── documentSymbol/# Document outline
│   │   ├── workspaceSymbol/# Workspace symbol search
│   │   ├── rename/        # Rename refactoring
│   │   ├── codelens/      # Code lens actions
│   │   ├── foldingRange/  # Code folding
│   │   ├── validation/    # Diagnostics and validators
│   │   ├── utils/         # Utility functions
│   │   ├── __tests__/     # Test suites
│   │   └── server.ts      # LSP server entry point
│   └── package.json       # Server dependencies
├── syntaxes/              # TextMate grammar
│   └── cal.tmLanguage.json
└── test/
    ├── fixtures/          # Synthetic test files
    └── regression/        # Regression test cases
```

### Contributing

Before submitting changes:

1. Run tests: `npm test` (from server directory)
2. Ensure all tests pass
3. Add tests for new features
4. Update documentation as needed

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

## License

MIT

---

**Enjoy coding in C/AL!**
