---
name: cal-basics
description: Essential context for working on C/AL Language Support extension, including the critical distinction between C/AL and AL, supported versions, and project structure
---

# C/AL Basics

This skill provides essential context for working on this C/AL Language Support extension.

## Critical Distinction: C/AL is NOT AL

**C/AL** and **AL** are fundamentally different languages:

| Aspect | C/AL | AL |
|--------|------|-----|
| Era | NAV 2009-2018 | Business Central 2019+ |
| IDE | C/SIDE | VS Code |
| File format | `.txt` / `.cal` (text export) | `.al` (JSON-based) |
| Keywords | UPPERCASE convention | lowercase convention |
| This extension | Supported | NOT supported |

**This extension provides syntax highlighting for C/AL only.** AL features would cause compilation errors in NAV and should never be added.

## Supported Versions

| Version | Year | Status |
|---------|------|--------|
| NAV 2013 | 2012 | Minimum supported |
| NAV 2013 R2 | 2013 | Supported |
| NAV 2015 | 2014 | Supported |
| NAV 2016 | 2015 | Supported (added FOREACH, .NET events) |
| NAV 2017 | 2016 | Supported |
| NAV 2018 | 2017 | Supported (last pure C/AL) |
| BC 13/14 | 2018-2019 | Supported (last with C/AL) |
| BC 15+ | 2019+ | AL only - NOT supported |

## Project Structure

```
c-al-extension/
├── package.json           # Extension manifest
├── syntaxes/              # TextMate grammar
├── server/                # Language Server (TypeScript)
│   ├── src/
│   │   ├── lexer/         # Tokenizer
│   │   ├── parser/        # AST builder
│   │   ├── types/         # Type definitions
│   │   ├── utils/         # Symbol table, AST utils
│   │   ├── providers/     # Base provider class
│   │   ├── completion/    # Autocomplete
│   │   ├── hover/         # Hover info
│   │   ├── definition/    # Go to definition
│   │   ├── references/    # Find references
│   │   ├── signatureHelp/ # Parameter hints
│   │   └── semanticTokens/# Semantic highlighting (v0.3.0+)
│   ├── jest.config.js     # Tests (398 tests)
│   └── performance/       # Performance benchmarks
└── documentation/         # C/AL language docs
```

## Key Features

- **Semantic tokens** for intelligent highlighting (v0.3.0+)
- **Visitor pattern** for AST traversal
- **Provider base class** for LSP features
- **Performance regression testing** suite (v0.4.9+)
- **398 comprehensive tests** (~7s execution)

## Running Tests

Tests use Jest and must be run from the `server` directory:

```bash
cd server && npm test                 # Run all 398 tests
cd server && npm test -- --watch      # Watch mode
cd server && npm test -- --coverage   # Coverage report
```

Test files location: `server/src/<feature>/__tests__/*.test.ts`

## Key C/AL Characteristics

1. **Case-insensitive** - `BEGIN`, `Begin`, `begin` are equivalent (UPPERCASE is convention)
2. **@ numbering** - Variables and procedures have unique IDs: `Customer@1001`, `Calculate@1()`
3. **Single-quoted strings** - `'text here'` (not double quotes)
4. **Assignment operator** - `:=` (not `=`)
5. **Context-dependent braces** - `{ }` can be structural OR comments depending on location
