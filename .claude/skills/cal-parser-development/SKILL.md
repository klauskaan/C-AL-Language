---
name: cal-parser-development
description: Guide for working on lexer and parser including visitor pattern implementation, AST structure, error recovery strategies, context-aware parsing for curly braces, and adding new language constructs
allowed-tools: Read, Grep, Glob, Edit, Bash(npm test*)
---

# C/AL Parser Development

Comprehensive guide for developing and maintaining the C/AL lexer and parser.

## Lexer Architecture

### Location
`server/src/lexer/lexer.ts`

### State Machine

The lexer is a context-aware state machine that tracks:

```typescript
interface LexerState {
  position: number;           // Current position in source
  line: number;               // Current line number
  column: number;             // Current column
  context: ParseContext[];    // Context stack
}

enum ParseContext {
  OBJECT_LEVEL,      // Top level
  FIELDS_SECTION,    // Inside FIELDS { }
  KEYS_SECTION,      // Inside KEYS { }
  CONTROLS_SECTION,  // Inside CONTROLS { }
  CODE_SECTION,      // Inside CODE { }
  BEGIN_END_BLOCK    // Inside BEGIN...END
}
```

### Context Tracking

**Critical for `{ }` handling:**

```typescript
// In FIELDS section: { } are structural
if (context === ParseContext.FIELDS_SECTION) {
  if (char === '{') {
    return Token.LBRACE_STRUCTURAL;
  }
}

// In CODE section, inside BEGIN/END: { } are comments
if (context === ParseContext.BEGIN_END_BLOCK) {
  if (char === '{') {
    return scanComment();
  }
}
```

### Token Types

```typescript
enum TokenType {
  // Keywords
  BEGIN, END, IF, THEN, ELSE, CASE, WHILE,
  TEMPORARY, LOCAL, PROCEDURE, FUNCTION,

  // Object Types
  TABLE, PAGE, CODEUNIT, REPORT, XMLPORT,

  // Structural
  LBRACE_STRUCTURAL,    // { in FIELDS/KEYS/CONTROLS
  RBRACE_STRUCTURAL,    // } in FIELDS/KEYS/CONTROLS
  LBRACE_COMMENT,       // { in CODE blocks
  RBRACE_COMMENT,       // } in CODE blocks

  // Operators
  ASSIGN,               // :=
  COMPOUND_ADD,         // +=
  SCOPE_RESOLUTION,     // ::

  // Literals
  NUMBER, STRING, IDENTIFIER,

  // Special
  AT_NUMBER,            // @1000
  EOF
}
```

### Scanning Methods

```typescript
class Lexer {
  scanToken(): Token {
    const char = this.peek();

    if (isAlpha(char)) return this.scanIdentifier();
    if (isDigit(char)) return this.scanNumber();
    if (char === "'") return this.scanString();
    if (char === '@') return this.scanAtNumber();
    if (char === '/') return this.scanCommentOrOperator();
    // ...
  }

  scanIdentifier(): Token {
    const start = this.position;
    while (isAlphanumeric(this.peek())) this.advance();

    const text = this.source.substring(start, this.position);
    const type = KEYWORDS.get(text.toUpperCase()) || TokenType.IDENTIFIER;

    return { type, lexeme: text, line, column };
  }

  scanAtNumber(): Token {
    this.advance(); // consume @
    const start = this.position;
    while (isDigit(this.peek())) this.advance();

    const number = this.source.substring(start, this.position);
    return { type: TokenType.AT_NUMBER, lexeme: `@${number}` };
  }
}
```

## Parser Architecture

### Location
`server/src/parser/parser.ts`

### AST Node Types

Located in `server/src/types/ast.ts`:

```typescript
interface ASTNode {
  type: string;
  location: SourceLocation;
}

interface ObjectDeclaration extends ASTNode {
  type: 'ObjectDeclaration';
  objectType: 'Table' | 'Page' | 'Codeunit' | 'Report';
  objectId: number;
  objectName: string;
  properties: Property[];
  sections: Section[];
}

interface FieldDeclaration extends ASTNode {
  type: 'FieldDeclaration';
  fieldNumber: number;
  fieldName: string;
  dataType: string;
  properties: Property[];
}

interface ProcedureDeclaration extends ASTNode {
  type: 'ProcedureDeclaration';
  name: string;
  atNumber: number;
  parameters: Parameter[];
  returnType?: string;
  isLocal: boolean;
  body: Statement[];
}
```

### Recursive Descent Parsing

```typescript
class Parser {
  parseObject(): ObjectDeclaration {
    this.expect(TokenType.OBJECT);
    const objectType = this.parseObjectType();
    const objectId = this.expect(TokenType.NUMBER);
    const objectName = this.expect(TokenType.IDENTIFIER);

    this.expect(TokenType.LBRACE_STRUCTURAL);

    const properties = this.parseObjectProperties();
    const sections = this.parseSections(objectType);

    this.expect(TokenType.RBRACE_STRUCTURAL);

    return {
      type: 'ObjectDeclaration',
      objectType,
      objectId: parseInt(objectId.lexeme),
      objectName: objectName.lexeme,
      properties,
      sections
    };
  }

  parseFieldsSection(): FieldDeclaration[] {
    this.pushContext(ParseContext.FIELDS_SECTION);
    this.expect(TokenType.FIELDS);
    this.expect(TokenType.LBRACE_STRUCTURAL);

    const fields: FieldDeclaration[] = [];

    while (!this.check(TokenType.RBRACE_STRUCTURAL)) {
      fields.push(this.parseField());
    }

    this.expect(TokenType.RBRACE_STRUCTURAL);
    this.popContext();

    return fields;
  }

  parseField(): FieldDeclaration {
    this.expect(TokenType.LBRACE_STRUCTURAL);

    const fieldNumber = this.expect(TokenType.NUMBER);
    this.expect(TokenType.SEMICOLON);
    this.expect(TokenType.SEMICOLON); // Reserved column
    const fieldName = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.SEMICOLON);
    const dataType = this.parseDataType();

    const properties = this.parseProperties();

    this.expect(TokenType.RBRACE_STRUCTURAL);

    return {
      type: 'FieldDeclaration',
      fieldNumber: parseInt(fieldNumber.lexeme),
      fieldName: fieldName.lexeme,
      dataType,
      properties
    };
  }
}
```

### Error Recovery

```typescript
class Parser {
  synchronize(): void {
    this.panicMode = false;

    // Skip tokens until we find a synchronization point
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.PROCEDURE:
        case TokenType.FUNCTION:
        case TokenType.BEGIN:
        case TokenType.VAR:
          return;
      }

      this.advance();
    }
  }

  error(message: string): ParseError {
    const error = new ParseError(message, this.peek());
    this.errors.push(error);

    if (!this.panicMode) {
      this.panicMode = true;
      this.synchronize();
    }

    return error;
  }
}
```

## Visitor Pattern

### Location
`server/src/utils/visitor.ts`

### Base Visitor

```typescript
abstract class ASTVisitor<T = void> {
  visit(node: ASTNode): T {
    const method = `visit${node.type}`;
    if (typeof this[method] === 'function') {
      return this[method](node);
    }
    return this.visitDefault(node);
  }

  visitObjectDeclaration(node: ObjectDeclaration): T {
    return this.visitDefault(node);
  }

  visitFieldDeclaration(node: FieldDeclaration): T {
    return this.visitDefault(node);
  }

  visitProcedureDeclaration(node: ProcedureDeclaration): T {
    node.body.forEach(stmt => this.visit(stmt));
    return this.visitDefault(node);
  }

  abstract visitDefault(node: ASTNode): T;
}
```

### Implementing Custom Visitors

```typescript
class SymbolCollector extends ASTVisitor<void> {
  symbols: Map<string, Symbol> = new Map();

  visitProcedureDeclaration(node: ProcedureDeclaration): void {
    this.symbols.set(node.name, {
      name: node.name,
      kind: 'procedure',
      location: node.location
    });

    // Continue traversing
    super.visitProcedureDeclaration(node);
  }

  visitVariableDeclaration(node: VariableDeclaration): void {
    this.symbols.set(node.name, {
      name: node.name,
      kind: 'variable',
      type: node.dataType,
      location: node.location
    });
  }

  visitDefault(node: ASTNode): void {
    // No-op for unhandled nodes
  }
}

// Usage
const collector = new SymbolCollector();
collector.visit(ast);
console.log(collector.symbols);
```

## Adding New Language Constructs

### Step-by-Step Guide

**Example: Adding support for `TEMPORARY` keyword**

#### Step 1: Add Token Type to Lexer

```typescript
// lexer/lexer.ts
enum TokenType {
  // ...existing tokens
  TEMPORARY,
  // ...
}

const KEYWORDS = new Map([
  // ...existing keywords
  ['TEMPORARY', TokenType.TEMPORARY],
  // ...
]);
```

#### Step 2: Update Parser Grammar

```typescript
// parser/parser.ts
parseVariableDeclaration(): VariableDeclaration {
  const isTemporary = this.match(TokenType.TEMPORARY);

  const name = this.expect(TokenType.IDENTIFIER);
  const atNumber = this.expect(TokenType.AT_NUMBER);
  this.expect(TokenType.COLON);
  const dataType = this.parseDataType();

  return {
    type: 'VariableDeclaration',
    name: name.lexeme,
    atNumber: parseInt(atNumber.lexeme.substring(1)),
    dataType,
    isTemporary,
    location: this.getLocation()
  };
}
```

#### Step 3: Add AST Node Type

```typescript
// types/ast.ts
interface VariableDeclaration extends ASTNode {
  type: 'VariableDeclaration';
  name: string;
  atNumber: number;
  dataType: string;
  isTemporary?: boolean;  // New property
  location: SourceLocation;
}
```

#### Step 4: Update Visitor Pattern (if needed)

```typescript
// utils/visitor.ts
abstract class ASTVisitor<T = void> {
  visitVariableDeclaration(node: VariableDeclaration): T {
    if (node.isTemporary) {
      // Handle temporary variable
    }
    return this.visitDefault(node);
  }
}
```

#### Step 5: Write Tests

```typescript
// lexer/__tests__/lexer.test.ts
describe('TEMPORARY keyword', () => {
  it('should tokenize TEMPORARY correctly', () => {
    const tokens = tokenize('TEMPORARY Customer@1000 : Record 18;');

    expect(tokens[0].type).toBe(TokenType.TEMPORARY);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe('Customer');
  });

  it('should handle TEMPORARY case-insensitively', () => {
    expect(tokenize('TEMPORARY')[0].type).toBe(TokenType.TEMPORARY);
    expect(tokenize('temporary')[0].type).toBe(TokenType.TEMPORARY);
    expect(tokenize('Temporary')[0].type).toBe(TokenType.TEMPORARY);
  });
});

// parser/__tests__/parser.test.ts
describe('Variable declaration parsing', () => {
  it('should parse TEMPORARY variable', () => {
    const ast = parse('TEMPORARY Customer@1000 : Record 18;');

    expect(ast.variables[0].isTemporary).toBe(true);
    expect(ast.variables[0].name).toBe('Customer');
  });
});
```

## Common Parsing Challenges

### Challenge 1: Context-Dependent `{ }` Braces

```typescript
// Problem: Distinguishing structural vs comment braces

// Solution: Track parser context
class Parser {
  parseSection(sectionType: string): Section {
    if (sectionType === 'FIELDS') {
      this.pushContext(ParseContext.FIELDS_SECTION);
      // In this context, { } are structural
    }

    // Parse content

    this.popContext();
  }
}
```

### Challenge 2: @ Numbering Extraction

```typescript
// Problem: @numbers can appear in multiple contexts

// Solution: Unified scanning
scanAtNumber(): Token {
  this.advance(); // consume @
  const start = this.position;

  while (isDigit(this.peek())) {
    this.advance();
  }

  const number = parseInt(this.source.substring(start, this.position));
  return {
    type: TokenType.AT_NUMBER,
    value: number,
    lexeme: `@${number}`
  };
}
```

### Challenge 3: Multi-line Property Values

```typescript
// Problem: Properties can span multiple lines
CalcFormula=Sum("Cust. Ledger Entry".Amount
             WHERE ("Customer No."=FIELD(No.)))

// Solution: Track nesting level
parseProperty(): Property {
  const name = this.expect(TokenType.IDENTIFIER);
  this.expect(TokenType.EQUALS);

  const value = this.parsePropertyValue();

  return { name: name.lexeme, value };
}

parsePropertyValue(): string {
  let depth = 0;
  let value = '';

  while (true) {
    if (this.check(TokenType.LPAREN)) depth++;
    if (this.check(TokenType.RPAREN)) {
      depth--;
      if (depth < 0) break;
    }
    if (this.check(TokenType.SEMICOLON) && depth === 0) break;

    value += this.advance().lexeme + ' ';
  }

  return value.trim();
}
```

### Challenge 4: Nested BEGIN/END Blocks

```typescript
// Problem: BEGIN/END can be nested arbitrarily deep

// Solution: Stack-based tracking
parseBeginEnd(): Statement[] {
  this.expect(TokenType.BEGIN);
  this.pushContext(ParseContext.BEGIN_END_BLOCK);

  const statements: Statement[] = [];

  while (!this.check(TokenType.END)) {
    if (this.check(TokenType.BEGIN)) {
      // Nested BEGIN/END
      statements.push(this.parseBeginEnd());
    } else {
      statements.push(this.parseStatement());
    }
  }

  this.expect(TokenType.END);
  this.popContext();

  return statements;
}
```

## Debugging Parser Issues

### Enable Debug Logging

```typescript
class Parser {
  private debug = process.env.DEBUG_PARSER === 'true';

  parse(): AST {
    if (this.debug) {
      console.log('Starting parse...');
      console.log('Tokens:', this.tokens);
    }

    const ast = this.parseObject();

    if (this.debug) {
      console.log('AST:', JSON.stringify(ast, null, 2));
    }

    return ast;
  }
}
```

### Run with Debug Mode

```bash
DEBUG_PARSER=true npm test -- parser.test.ts
```

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Unexpected token | Context mismatch | Check context stack |
| Missing nodes | Forgot to call parser method | Review grammar rules |
| Infinite loop | No advancement in loop | Add `this.advance()` |
| Stack overflow | Unbounded recursion | Add depth limit or iterative approach |

## Best Practices

✅ **Do:**
- Always track parser context
- Handle errors gracefully (don't crash)
- Write tests for edge cases
- Use visitor pattern for AST traversal
- Preserve source location information
- Validate AST structure

❌ **Don't:**
- Assume input is well-formed
- Ignore context when parsing `{ }`
- Forget error recovery
- Modify AST during traversal (use transformers instead)
- Parse without tests

## Quick Reference

```bash
# Testing
npm test -- lexer.test.ts       # Test lexer only
npm test -- parser.test.ts      # Test parser only
npm test -- --watch             # TDD mode

# Debugging
DEBUG_PARSER=true npm test      # Enable debug logging
npm test -- --verbose           # Detailed output
```
