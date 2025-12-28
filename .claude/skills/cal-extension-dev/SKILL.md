---
name: cal-extension-dev
description: Guidelines for implementing and maintaining the VS Code C/AL extension including architecture, syntax highlighting priorities, testing strategy, and common development pitfalls
allowed-tools: Read, Grep, Glob, Bash(npm:*), Bash(git:*)
---

# C/AL Extension Development

Guidelines for implementing and maintaining this VS Code extension.

## Architecture

```
c-al-extension/
├── package.json              # Extension manifest, contributes languages/grammars
├── cal.language-configuration.json  # Brackets, comments, folding
├── syntaxes/
│   └── cal.tmLanguage.json   # TextMate grammar for syntax highlighting
├── src/
│   └── extension.ts          # Extension entry point, starts language client
├── server/
│   ├── package.json          # Server dependencies (Jest here)
│   ├── jest.config.js        # Test configuration
│   ├── tsconfig.json         # TypeScript config
│   └── src/
│       ├── server.ts         # Language server entry point
│       ├── lexer/            # Tokenizer
│       ├── parser/           # AST builder
│       ├── completion/       # Autocomplete provider
│       ├── hover/            # Hover information
│       ├── definition/       # Go to definition
│       ├── references/       # Find all references
│       └── signatureHelp/    # Parameter hints
└── out/                      # Compiled JavaScript
```

## Syntax Highlighting Priorities

### Must Have
- `OBJECT` declarations with type/ID/name
- Section keywords: `OBJECT-PROPERTIES`, `PROPERTIES`, `FIELDS`, `KEYS`, `CODE`
- Control flow: `BEGIN`, `END`, `IF`, `THEN`, `ELSE`, `CASE`, `WHILE`, etc.
- Data types: `Code`, `Text`, `Integer`, `Decimal`, `Record`, etc.
- `@` numbering pattern
- Strings (single quotes: `'text'`)
- All operators: `:=`, `+=`, `-=`, `*=`, `/=`, `::`, `..`, comparisons
- Comments: `//`, `/* */`, context-aware `{ }`

### Should Have
- Built-in functions: `CALCFIELDS`, `FIND`, `INSERT`, `MODIFY`, `DELETE`, `SETRANGE`
- TextConst language codes (ENU, FRA, DEU)
- Field/Control numbers in definitions
- Property names vs values
- `[External]` attribute
- Date/time literals: `060120D`, `0D`
- CalcFormula keywords: `FIELD`, `FILTER`, `CONST`, `WHERE`, `SUM`
- .NET keywords (NAV 2016+): `FOREACH`, `EVENT`, `WITHEVENTS`

### Context-Aware Handling (Critical)
- Inside `FIELDS`: `{ }` are structural, not comments
- Inside `KEYS`: `{ }` are structural
- Inside `CONTROLS`: `{ }` are structural
- Inside `CODE` between statements: `{ }` can be comments
- Pattern `{ Number ;` indicates structure, not comment

## Code Folding Regions

Fold these constructs:
- `OBJECT-PROPERTIES { ... }`
- `PROPERTIES { ... }`
- `FIELDS { ... }`, `KEYS { ... }`, `CONTROLS { ... }`, `CODE { ... }`
- `PROCEDURE ... BEGIN ... END;`
- `IF ... THEN ... BEGIN ... END;`
- `CASE ... END;`
- Multi-line comments

## Bracket Matching

| Bracket | Notes |
|---------|-------|
| `{ }` | Context-dependent (structural OR comments) |
| `( )` | Parameters, expressions |
| `[ ]` | Array indices |
| `BEGIN END` | Treat as bracket pair |

## Language Server Features

### Implemented
- **Lexer**: Tokenizes C/AL source with context awareness
- **Parser**: Builds AST for objects, procedures, variables
- **Completion**: Keywords, symbols, built-in functions, record methods
- **Hover**: Symbol types, function documentation, keyword help
- **Go to Definition**: Variables, procedures, fields
- **Find References**: All usages of a symbol
- **Signature Help**: Parameter hints for function calls
- **Semantic Tokens**: Intelligent highlighting based on AST (v0.3.0+)

### Testing
Run from `server/` directory:
```bash
npm test                 # Run all 398 tests (~7s)
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report
```

Test files location: `server/src/<feature>/__tests__/*.test.ts`

## Recent Architectural Patterns (v0.4.x)

### Visitor Pattern
- Base visitor class for AST traversal in `utils/visitor.ts`
- Used by providers for consistent node processing
- Enables clean separation of traversal from business logic

### Provider Base Class
- Abstract base in `providers/baseProvider.ts`
- Shared symbol resolution, error handling, document management
- All LSP providers extend this base

### Semantic Tokens Provider
- Intelligent syntax highlighting based on parsed AST
- Token types: namespace, class, function, variable, parameter, property
- Modifiers: declaration, readonly, static, deprecated

## Performance Testing (v0.4.9+)

Performance regression testing with baselines:

```bash
npm run perf:quick      # Quick performance check
npm run perf:standard   # Standard benchmark suite
npm run perf:stress     # Stress testing with large files
npm run perf:memory     # Memory profiling with v8-profiler
```

Benchmarks cover:
- Lexer tokenization speed
- Parser AST generation
- Symbol table resolution
- Full integration pipeline

Test count: **398 tests** across:
- Lexer (~150 tests)
- Parser (~100 tests)
- Providers (~100 tests)
- Regression (66 snapshot tests)
- Performance benchmarks

## File Type Detection

Challenges:
- `.txt` is too generic
- `.cal` not standard (C/SIDE didn't use it)

Detection patterns:
- `OBJECT Table|Page|Report|Codeunit` at start
- `OBJECT-PROPERTIES` presence
- `BEGIN END.` with period

Currently supports: `.cal` and `.txt` extensions

## Known Limitations

Cannot support without significant effort:
- **Full IntelliSense** - Needs complete object model parsing
- **Cross-file navigation** - Needs workspace-wide indexing
- **Syntax validation** - Needs C/AL compiler rules
- **Auto-formatting** - Complex due to fixed-width sections

## Testing Strategy

### Test Sources
- [Microsoft cal-open-library](https://github.com/microsoft/cal-open-library)
- Exports from NAV demo databases
- Regression fixtures in `server/src/__tests__/fixtures/`

### Test Scenarios
- Single/multi-object files
- Different NAV versions (2013-2018)
- All object types (Table, Page, Codeunit, Report, etc.)
- Unicode characters
- Long procedures (>1000 lines)
- Edge cases (empty sections, malformed input)

## Common Development Pitfalls

1. **Don't confuse C/AL with AL** - Different languages
2. **Don't treat all `{ }` as comments** - Context matters
3. **Don't ignore `@` numbering** - Essential for symbol tracking
4. **Don't forget `BEGIN END.`** - Period is mandatory
5. **Don't add AL-only features** - See cal-al-boundaries skill
6. **Don't skip version checks** - Some features are NAV 2016+ only

## Build Commands

```bash
# From c-al-extension/
npm run compile       # Build extension + server
npm run watch         # Watch mode

# From c-al-extension/server/
npm test              # Run Jest tests
npm run test:coverage # With coverage
```

## Debugging

1. Open `c-al-extension/` in VS Code
2. Press F5 to launch Extension Development Host
3. Open a `.cal` file to test
4. Use Debug Console for language server logs
