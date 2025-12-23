# Specification: Implement Scope Hierarchy in Symbol Table

## Overview

The current symbol table implementation uses a flat `Map<string, Symbol>` structure that stores all symbols globally without any scope awareness. This causes all navigation features (Go to Definition, Hover, Completion, Find All References) to return incorrect results when dealing with local variables, procedure parameters, or variable shadowing. This task implements a proper hierarchical scope structure that supports nested scopes, correct variable shadowing, and scope chain traversal for accurate symbol resolution.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that fundamentally changes the architecture of the symbol table from a flat structure to a hierarchical tree. It requires designing new data structures, modifying existing APIs, and updating all consumers of the symbol table to work with scope-aware lookups.

## Task Scope

### Services Involved
- **server** (primary) - Language server containing symbol table and all navigation providers

### This Task Will:
- [ ] Replace flat `Map<string, Symbol>` with hierarchical `Scope` class structure
- [ ] Implement parent-child scope relationships for scope chain traversal
- [ ] Add procedure parameters to their local scope during AST traversal
- [ ] Add local variables from procedures and triggers to their respective scopes
- [ ] Update symbol lookup to traverse scope hierarchy (innermost to outermost)
- [ ] Update all navigation features to query scope-aware symbol table
- [ ] Handle variable shadowing correctly (inner scope takes precedence)

### Out of Scope:
- Cross-file symbol resolution (symbols from other C/AL files)
- Type inference for variable types
- Symbol renaming refactoring
- Workspace-wide symbol indexing

## Service Context

### Server (Language Server)

**Tech Stack:**
- Language: TypeScript
- Framework: VS Code Language Server Protocol (vscode-languageserver)
- Key directories:
  - `server/src/symbols` - Symbol table implementation
  - `server/src/definition` - Go to Definition provider
  - `server/src/hover` - Hover provider
  - `server/src/completion` - Completion provider
  - `server/src/signatureHelp` - Signature help provider
  - `server/src/references` - Find All References provider
  - `server/src/parser` - AST definitions

**Entry Point:** `server/src/server.ts`

**How to Run:**
```bash
cd /home/klaus/Source/C-AL-Language
npm run compile
# Then launch the extension in VS Code
```

**Port:** N/A (LSP communication via stdio)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `server/src/symbols/symbolTable.ts` | server | Replace flat Map with hierarchical Scope class, update buildFromAST to create nested scopes |
| `server/src/definition/definitionProvider.ts` | server | Update getDefinition to use scope-aware lookup with position context |
| `server/src/hover/hoverProvider.ts` | server | Update getHover to use scope-aware lookup with position context |
| `server/src/completion/completionProvider.ts` | server | Update getCompletions to query symbols visible in current scope |
| `server/src/signatureHelp/signatureHelpProvider.ts` | server | Update procedure lookup to use scope-aware symbol table |
| `server/src/server.ts` | server | Pass position/context to symbol table lookups |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `server/src/parser/ast.ts` | AST node structure, how procedures/triggers define local variables |
| `server/src/references/referenceProvider.ts` | How to traverse AST for expressions and statements |
| `server/src/symbols/symbolTable.ts` | Current Symbol interface, normalizeIdentifier pattern |

## Patterns to Follow

### Current Symbol Interface

From `server/src/symbols/symbolTable.ts`:

```typescript
export interface Symbol {
  name: string;
  kind: 'variable' | 'parameter' | 'field' | 'procedure' | 'function';
  token: Token;
  type?: string;
}
```

**Key Points:**
- Keep the existing Symbol interface unchanged
- Add new Scope class to wrap symbol storage
- Maintain case-insensitive lookup via normalizeIdentifier()

### Procedure/Trigger Local Variables

From `server/src/parser/ast.ts`:

```typescript
export interface ProcedureDeclaration extends ASTNode {
  type: 'ProcedureDeclaration';
  name: string;
  parameters: ParameterDeclaration[];
  returnType: DataType | null;
  isLocal: boolean;
  variables: VariableDeclaration[];
  body: Statement[];
}

export interface TriggerDeclaration extends ASTNode {
  type: 'TriggerDeclaration';
  name: string;
  variables: VariableDeclaration[];
  body: Statement[];
}
```

**Key Points:**
- Procedures have `parameters` (input) and `variables` (local declarations)
- Triggers have `variables` (local declarations)
- These must be added to child scopes of the global scope

### AST Traversal Pattern

From `server/src/references/referenceProvider.ts`:

```typescript
private collectFromProcedure(proc: ProcedureDeclaration, refs: SymbolReference[]): void {
  // Parameters are definitions
  for (const param of proc.parameters) {
    refs.push({ name: param.name, token: param.startToken, isDefinition: true });
  }

  // Local variables are definitions
  for (const variable of proc.variables) {
    refs.push({ name: variable.name, token: variable.startToken, isDefinition: true });
  }

  // Body statements contain references
  for (const stmt of proc.body) {
    this.collectFromStatement(stmt, refs);
  }
}
```

**Key Points:**
- Traverse parameters and local variables when entering procedure scope
- Body statements can reference symbols from both local and outer scopes

## Requirements

### Functional Requirements

1. **Hierarchical Scope Structure**
   - Description: Implement a Scope class that contains a symbol map and references to parent/children scopes
   - Acceptance: Scopes can be nested; root scope holds global symbols; child scopes hold local symbols

2. **Scope-Aware Symbol Lookup**
   - Description: Symbol lookup traverses from current scope up through parent chain until found
   - Acceptance: `getSymbol("x")` in a procedure finds local `x` before global `x`

3. **Procedure Parameter Scoping**
   - Description: Procedure parameters are added to the procedure's scope, not global scope
   - Acceptance: Parameters are visible only within their procedure

4. **Local Variable Scoping**
   - Description: Local variables in procedures/triggers are added to their local scope
   - Acceptance: Local variables don't conflict with same-named global variables

5. **Variable Shadowing**
   - Description: Inner scope symbols shadow outer scope symbols of the same name
   - Acceptance: When hovering on a shadowed variable, the correct (inner) type is shown

6. **Position-Aware Navigation**
   - Description: Navigation features use cursor position to determine active scope
   - Acceptance: Go to Definition from inside a procedure jumps to local variable, not global

### Edge Cases

1. **Same name in multiple scopes** - Inner scope variable should shadow outer; lookup returns inner
2. **Reference before declaration** - C/AL allows using variables declared later; still resolve within scope
3. **Empty procedure scope** - Procedure with no local variables should still have a scope (for parameters)
4. **Nested blocks** - C/AL has BEGIN/END blocks; these don't create new scopes (only procedures/triggers do)
5. **Trigger local variables** - Triggers also have local variable sections; same scoping rules apply

## Implementation Notes

### DO
- Follow the pattern in `referenceProvider.ts` for AST traversal
- Reuse `normalizeIdentifier()` for case-insensitive lookups
- Keep Symbol interface unchanged for backward compatibility
- Store scope range (startToken/endToken) to determine which scope contains a position
- Create child scope when entering a procedure/trigger during AST traversal

### DON'T
- Create scopes for BEGIN/END blocks (C/AL doesn't have block-level scoping)
- Break existing `getAllSymbols()` API - it should return all symbols from all scopes
- Modify the AST structures - only the symbol table needs changes
- Add new dependencies - use existing TypeScript/LSP types

## Development Environment

### Start Services

```bash
cd /home/klaus/Source/C-AL-Language
npm install
npm run compile
# Launch extension via VS Code debug (F5)
```

### Run Tests

```bash
npm test
```

### Service URLs
- N/A (Language server uses stdio, not HTTP)

### Required Environment Variables
- None (self-contained TypeScript project)

## Success Criteria

The task is complete when:

1. [ ] Scope class implemented with parent/child references
2. [ ] buildFromAST creates nested scopes for procedures and triggers
3. [ ] Parameters and local variables added to procedure/trigger scopes
4. [ ] Symbol lookup traverses scope chain correctly
5. [ ] Go to Definition jumps to correct symbol based on scope
6. [ ] Hover shows correct type for shadowed variables
7. [ ] Completion suggests only in-scope symbols
8. [ ] No console errors
9. [ ] Existing tests still pass
10. [ ] New functionality verified via browser/API

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Scope hierarchy creation | `server/src/symbols/__tests__/symbolTable.test.ts` | Scope tree has correct structure for procedures |
| Scope-aware symbol lookup | `server/src/symbols/__tests__/symbolTable.test.ts` | getSymbol finds inner scope before outer |
| Variable shadowing | `server/src/symbols/__tests__/symbolTable.test.ts` | Inner variable shadows outer with same name |
| getAllSymbols includes all scopes | `server/src/symbols/__tests__/symbolTable.test.ts` | Returns symbols from all scopes |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Definition for local variable | definition ↔ symbolTable | F12 on local var jumps to local declaration |
| Definition for shadowed variable | definition ↔ symbolTable | F12 prefers local over global |
| Hover on local variable | hover ↔ symbolTable | Shows correct type for local var |
| Completion in procedure | completion ↔ symbolTable | Suggests local vars, params, and globals |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Local variable navigation | 1. Open table with procedure 2. Define local var 3. F12 on usage | Jumps to local var declaration |
| Shadowing works | 1. Create global var "x" 2. Create procedure with local "x" 3. Hover on local usage | Shows local type, not global |
| Parameter completion | 1. Create procedure with param 2. Type inside procedure body | Param appears in suggestions |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| N/A - Extension | VS Code | Test via debug extension |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | - | - |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (if applicable)
- [ ] Database state verified (if applicable)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced

## Technical Design

### Proposed Scope Class

```typescript
export class Scope {
  private symbols: Map<string, Symbol> = new Map();
  public parent: Scope | null = null;
  public children: Scope[] = [];
  public startOffset: number = 0;
  public endOffset: number = Number.MAX_SAFE_INTEGER;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  addSymbol(symbol: Symbol): void {
    this.symbols.set(normalizeIdentifier(symbol.name), symbol);
  }

  getSymbol(name: string): Symbol | undefined {
    const normalized = normalizeIdentifier(name);
    // First check this scope
    if (this.symbols.has(normalized)) {
      return this.symbols.get(normalized);
    }
    // Then check parent scope
    if (this.parent) {
      return this.parent.getSymbol(name);
    }
    return undefined;
  }

  getAllSymbols(): Symbol[] {
    const symbols = Array.from(this.symbols.values());
    for (const child of this.children) {
      symbols.push(...child.getAllSymbols());
    }
    return symbols;
  }
}
```

### Modified SymbolTable Class

```typescript
export class SymbolTable {
  private rootScope: Scope = new Scope(null);

  public buildFromAST(ast: CALDocument): void {
    this.rootScope = new Scope(null);

    if (!ast.object) return;

    const obj = ast.object;

    // Add fields to root scope
    if (obj.fields) {
      for (const field of obj.fields.fields) {
        this.rootScope.addSymbol({
          name: field.fieldName,
          kind: 'field',
          token: field.startToken,
          type: field.dataType.typeName
        });
      }
    }

    // Add code section
    if (obj.code) {
      // Global variables go to root scope
      for (const variable of obj.code.variables) {
        this.rootScope.addSymbol({
          name: variable.name,
          kind: 'variable',
          token: variable.startToken,
          type: variable.dataType.typeName
        });
      }

      // Procedures get their own scope
      for (const procedure of obj.code.procedures) {
        const procScope = new Scope(this.rootScope);
        // Set scope range based on procedure tokens
        procScope.startOffset = procedure.startToken.offset;
        procScope.endOffset = procedure.endToken.offset;

        // Add procedure name to parent scope
        this.rootScope.addSymbol({
          name: procedure.name,
          kind: 'procedure',
          token: procedure.startToken
        });

        // Add parameters to procedure scope
        for (const param of procedure.parameters) {
          procScope.addSymbol({
            name: param.name,
            kind: 'parameter',
            token: param.startToken,
            type: param.dataType.typeName
          });
        }

        // Add local variables to procedure scope
        for (const variable of procedure.variables) {
          procScope.addSymbol({
            name: variable.name,
            kind: 'variable',
            token: variable.startToken,
            type: variable.dataType.typeName
          });
        }
      }

      // Triggers also get their own scope
      for (const trigger of obj.code.triggers) {
        const triggerScope = new Scope(this.rootScope);
        triggerScope.startOffset = trigger.startToken.offset;
        triggerScope.endOffset = trigger.endToken.offset;

        // Add local variables to trigger scope
        for (const variable of trigger.variables) {
          triggerScope.addSymbol({
            name: variable.name,
            kind: 'variable',
            token: variable.startToken,
            type: variable.dataType.typeName
          });
        }
      }
    }
  }

  // Find the scope that contains a given offset
  public getScopeAtOffset(offset: number): Scope {
    return this.findScopeAtOffset(this.rootScope, offset);
  }

  private findScopeAtOffset(scope: Scope, offset: number): Scope {
    for (const child of scope.children) {
      if (offset >= child.startOffset && offset <= child.endOffset) {
        return this.findScopeAtOffset(child, offset);
      }
    }
    return scope;
  }

  // Backward compatible API
  public getSymbol(name: string): Symbol | undefined {
    return this.rootScope.getSymbol(name);
  }

  // Position-aware lookup
  public getSymbolAtOffset(name: string, offset: number): Symbol | undefined {
    const scope = this.getScopeAtOffset(offset);
    return scope.getSymbol(name);
  }

  public getAllSymbols(): Symbol[] {
    return this.rootScope.getAllSymbols();
  }
}
```

### Provider Updates

Each provider needs to:
1. Convert `Position` to document offset
2. Use `symbolTable.getSymbolAtOffset(name, offset)` instead of `symbolTable.getSymbol(name)`

Example for DefinitionProvider:
```typescript
public getDefinition(
  document: TextDocument,
  position: Position,
  ast?: CALDocument,
  symbolTable?: SymbolTable
): Location | null {
  const wordInfo = this.getWordAtPosition(document, position);
  if (!wordInfo) return null;

  const offset = document.offsetAt(position);

  // Use offset-aware lookup
  const symbol = symbolTable?.getSymbolAtOffset(wordInfo.word, offset);
  if (symbol) {
    return this.symbolToLocation(symbol, document.uri);
  }

  return null;
}
```
