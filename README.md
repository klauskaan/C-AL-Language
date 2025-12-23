# C/AL Language for Visual Studio Code

This extension provides comprehensive language support for Microsoft Dynamics NAV C/AL programming language.

## Features

### Syntax Highlighting (Enhanced in v0.2.2!)
- Full syntax highlighting for C/AL keywords, data types, operators, and functions
- Support for comments (single-line `//`, multi-line `/* */`, and curly brace `{ }`)
- **@ Numbering System**: Highlights C/AL's unique `@` numbering for variables and procedures
- **Field Definitions**: Smart detection of FIELDS/KEYS/CONTROLS definitions (prevents treating them as comments)
- **TextConst Language Codes**: Highlights language codes (ENU, FRA, DEU, etc.) in multi-language strings
- **OBJECT-PROPERTIES**: Proper highlighting for OBJECT-PROPERTIES section
- **Enhanced Number Support**: Hexadecimal (`0xFF`), scientific notation (`1.5e10`), and decimals (`.5`)
- **Punctuation Highlighting**: Clear visual separation with dedicated semicolon, colon, and comma highlighting
- **Improved String Handling**: Better escape sequence recognition and error recovery
- **Procedure Name Capture**: Enhanced highlighting for PROCEDURE/TRIGGER declarations with dotted names
- String highlighting with escape character support
- Number literals including BigInteger (with `L` or `l` suffix)
- Proper handling of double-quoted identifiers (e.g., `"No."`, `"Customer No."`)

### Language Features (NEW in v0.2.1!)
- **Keyword Bracket Matching**: Jump between matching `BEGIN`/`END` and `CASE`/`END` blocks with `Ctrl+Shift+\`
  - Works with all case variations (BEGIN/begin/Begin, CASE/case/Case)
  - Visual indicators for mismatched keyword blocks
- **Smart Auto-Closing**: Automatic completion of keyword blocks
  - Type `BEGIN` → automatically adds `END;`
  - Type `CASE` → automatically adds `END;`
  - Type `THEN BEGIN` → automatically adds `END`
- **Bracket Matching**: Automatic matching for `{}`, `[]`, `()`, and keyword pairs
- **Auto-Closing Pairs**: Automatic closing of brackets, quotes, comments, and keyword blocks
- **Comment Toggle**: Use `Ctrl+/` (or `Cmd+/` on Mac) to toggle line comments
- **Code Folding**: Support for region markers (`//#region`, `#region`, `//#endregion`, `#endregion`)
- **Smart Indentation**: Automatic indentation based on C/AL code structure
- **Improved Word Selection**: Double-click quoted identifiers like `"Customer No."` to select the entire identifier

### Supported File Extensions
- `.cal` - C/AL source files
- `.txt` - NAV object exports in text format

## Supported C/AL Elements

### Keywords
- Control flow: `IF`, `THEN`, `ELSE`, `BEGIN`, `END`, `CASE`, `OF`
- Loops: `REPEAT`, `UNTIL`, `WHILE`, `DO`, `FOR`, `TO`, `DOWNTO`
- Functions: `PROCEDURE`, `FUNCTION`, `TRIGGER`, `EXIT`
- Object types: `TABLE`, `FORM`, `REPORT`, `DATAPORT`, `CODEUNIT`, `XMLPORT`, `PAGE`, `QUERY`

### Data Types
All C/AL fundamental and complex data types including:
- Numeric: `Integer`, `BigInteger`, `Decimal`, `Byte`, `Char`
- String: `Text`, `Code`
- Temporal: `Date`, `DateTime`, `Time`, `Duration`
- Complex: `Record`, `RecordRef`, `Page`, `Report`, `Codeunit`, `BLOB`, `BigText`, and more

### Built-in Functions
Over 100+ built-in C/AL functions including:
- String functions: `COPYSTR`, `STRLEN`, `UPPERCASE`, `LOWERCASE`, `STRSUBSTNO`
- Record functions: `FIND`, `GET`, `INSERT`, `MODIFY`, `DELETE`, `SETRANGE`, `SETFILTER`
- UI functions: `MESSAGE`, `ERROR`, `CONFIRM`, `DIALOG`
- Date/Time functions: `TODAY`, `TIME`, `CALCDATE`, `DATE2DMY`
- System functions: `USERID`, `COMPANYNAME`, `WORKDATE`, `RUN`

## Installation

1. Download and install Visual Studio Code
2. Install this extension from the VS Code Marketplace
3. Open any `.cal` or `.txt` file containing C/AL code

## Usage

Simply open a C/AL file in VS Code, and syntax highlighting will be applied automatically.

### Tips
- Use `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to access the command palette
- Press `F1` to see all available commands
- Use `Ctrl+Space` for basic word completion

## Important: Understanding C/AL Format

**This extension supports C/AL text exports (`.txt` files) from Dynamics NAV C/SIDE, NOT modern AL code for Business Central.**

C/AL has unique syntax features:
- Curly braces `{ }` serve multiple purposes (structural delimiters AND comments)
- `@` numbering system for variables and procedures
- Fixed-width FIELDS/KEYS/CONTROLS sections
- `BEGIN END.` notation (note the period)

For detailed information about C/AL format, see [`cal.md`](../documentation/cal/cal.md) in the repository.

## Known Limitations

### Curly Brace Context Awareness

**Important**: The extension uses heuristics to detect field definitions vs. comments:
- Field definitions starting with `{ Number ;` are correctly highlighted as structured data
- Other curly braces `{ }` are treated as comments
- In rare edge cases, this heuristic may be incorrect

This is a limitation of TextMate grammars, which cannot fully understand C/AL's context-dependent syntax. The extension prioritizes correct highlighting for the most common cases (FIELDS sections).

### Language Server Features (v0.4.1)

The extension includes a full Language Server Protocol (LSP) implementation with intelligent IDE features:

**Code Completion (IntelliSense)** - NEW in v0.4.0!
- **54 C/AL keywords** with descriptions
- **65+ built-in functions** (MESSAGE, ERROR, STRSUBSTNO, etc.) with signatures
- **55+ Record methods** (GET, FIND, FINDSET, INSERT, MODIFY, DELETE, etc.)
- **Symbol completion** for variables, fields, and procedures
- **Dot-trigger completion** for Record methods and table fields
- Automatic quoting for field names with spaces

**Hover Information** - NEW in v0.4.1!
- **Type information** for variables and fields
- **Documentation** for 65+ built-in functions with signatures
- **Record method documentation** after dot (e.g., `Rec.GET`)
- **Keyword descriptions** for control flow, data types, and operators

**Semantic Highlighting** - v0.3.0
- **Quoted Identifier Visual Consistency**: Quoted identifiers like `"Line No."` now appear with the same color as regular identifiers
- **Intelligent Syntax Analysis**: The language server parses your C/AL code for accurate highlighting

**Coming in Future Releases:**
- Signature Help (parameter hints)
- Go to definition
- Find all references
- Enhanced diagnostics

The language server activates automatically when you open C/AL files. See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Testing

**Status:** v0.4.1 - Comprehensive test infrastructure

The C/AL Language Server includes a robust test suite to ensure reliability and prevent regressions:

### Test Coverage

- **397 automated tests** covering lexer, parser, semantic tokens, completion, hover, and regression scenarios
- **Fast execution:** All tests complete in ~7 seconds
- **High coverage:** 98%+ lexer coverage, 90% semantic tokens coverage
- **Real-world validation:** 9 production C/AL files from Microsoft's cal-open-library

### Running Tests

```bash
# Navigate to server directory
cd c-al-extension/server

# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Categories

1. **Lexer Tests (~150 tests)**
   - Quoted identifiers vs strings
   - Case-insensitive keywords
   - Context-aware tokenization
   - Comments, operators, literals

2. **Parser Tests (~100 tests)**
   - Object parsing (Table, Page, Codeunit, etc.)
   - AST structure validation
   - Error recovery

3. **Completion Tests (31 tests)**
   - Keyword completion
   - Built-in function completion
   - Record method completion
   - Dot-trigger completion

4. **Hover Tests (34 tests)**
   - Symbol hover
   - Keyword documentation
   - Built-in function documentation

5. **Regression Tests (66 tests)**
   - Snapshot testing with real C/AL files
   - 9 AST snapshots

For detailed testing information, see [documentation/testing/](../documentation/testing/).

## Development

### Contributing

Before submitting changes:

1. Run tests: `npm test`
2. Ensure all tests pass
3. Add tests for new features
4. Update documentation as needed

### Project Structure

```
c-al-extension/
├── src/                    # Extension client (TypeScript)
├── server/                 # Language server (TypeScript)
│   ├── src/
│   │   ├── lexer/         # Tokenization
│   │   ├── parser/        # AST generation
│   │   ├── semantic/      # Semantic tokens
│   │   ├── symbols/       # Symbol table
│   │   ├── completion/    # Code completion
│   │   ├── hover/         # Hover information
│   │   └── __tests__/     # Test suites
│   └── package.json       # Server dependencies
├── syntaxes/              # TextMate grammar
└── test/fixtures/         # Test data files
```

## Feedback and Contributions

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/klauskaan/messing-around).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

## License

MIT

---

**Enjoy coding in C/AL!**
