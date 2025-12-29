# Debugging Syntax Highlighting

## Two-Stage Highlighting Architecture

VS Code uses a two-stage highlighting system:

1. **Stage 1: TextMate Grammar** (Fast, regex-based)
   - File: `syntaxes/cal.tmLanguage.json`
   - Applies immediately as you type
   - Fallback for tokens not covered by semantic highlighting

2. **Stage 2: Semantic Tokens** (Slower, AST-based)
   - Files: `server/src/lexer/*`, `server/src/semantic/semanticTokens.ts`
   - Requires parsing and lexical analysis
   - Overrides TextMate for covered tokens
   - More accurate, context-aware

## Settings for Testing/Debugging

### 1. Disable Semantic Highlighting Only

**Built-in VS Code setting:**
```json
{
  "editor.semanticHighlighting.enabled": false
}
```

**Effect:**
- Only TextMate grammar highlighting is used
- Useful for testing TextMate grammar changes
- All LSP features still work (IntelliSense, hover, etc.)

### 2. Disable Language Server Completely

**C/AL extension setting:**
```json
{
  "cal.languageServer.enabled": false
}
```

**Effect:**
- No LSP features (no IntelliSense, hover, go-to-definition, etc.)
- Only TextMate grammar highlighting
- Extension loads faster
- Useful for isolating TextMate grammar issues
- **Requires window reload** after changing

### 3. Disable Semantic Highlighting via C/AL Setting

**C/AL extension setting:**
```json
{
  "cal.semanticHighlighting.enabled": false
}
```

**Effect:**
- Language Server runs but doesn't provide semantic tokens
- All other LSP features work (IntelliSense, hover, etc.)
- Only TextMate grammar highlighting for syntax
- **Requires window reload** after changing

## Common Debugging Workflows

### Testing TextMate Grammar Changes

1. Set `"cal.semanticHighlighting.enabled": false`
2. Reload window (Ctrl+Shift+P → "Reload Window")
3. Open a `.cal` file
4. Observe only TextMate grammar highlighting

**What to look for:**
- Initial brief highlighting (before semantic tokens load)
- Behavior when semantic tokens are disabled

### Testing Semantic Tokens Changes

1. Ensure `"cal.semanticHighlighting.enabled": true`
2. Watch for two-stage highlighting:
   - Brief TextMate highlighting
   - Semantic tokens override after ~1 second
3. Compare with semantic highlighting disabled

**What to look for:**
- Final highlighting after semantic tokens apply
- Differences from TextMate-only

### Isolating Highlighting Issues

**Problem: Incorrect highlighting**

1. Disable semantic highlighting
2. If still wrong → TextMate grammar issue
3. If now correct → Semantic tokens issue

**Problem: Performance issues**

1. Disable semantic highlighting
2. If faster → Semantic token provider is slow
3. If still slow → TextMate grammar is complex

## How Settings Work

### `cal.languageServer.enabled`

Location: `package.json` configuration
```json
"cal.languageServer.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable the C/AL Language Server..."
}
```

Implementation: `src/extension.ts`
```typescript
const config = workspace.getConfiguration('cal');
const lsEnabled = config.get<boolean>('languageServer.enabled', true);

if (!lsEnabled) {
  console.log('C/AL Language Server is disabled');
  return; // Don't start server
}
```

### `cal.semanticHighlighting.enabled`

Location: `package.json` configuration
```json
"cal.semanticHighlighting.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable semantic highlighting from the Language Server..."
}
```

Implementation:
- Client (`src/extension.ts`): Passes via `initializationOptions`
- Server (`server/src/server.ts`): Checks and conditionally registers provider

```typescript
// Client
initializationOptions: {
  semanticHighlighting: semanticHighlightingEnabled
}

// Server
const semanticHighlightingEnabled = initOptions?.semanticHighlighting ?? true;
semanticTokensProvider: semanticHighlightingEnabled ? {
  legend: getSemanticTokensLegend(),
  full: true
} : undefined
```

## Accessing Settings in VS Code

### Via Settings UI

1. Open Settings (Ctrl+,)
2. Search for "cal"
3. Find "C/AL Language Support" section
4. Toggle checkboxes

### Via settings.json

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Preferences: Open Settings (JSON)"
3. Add settings:

```json
{
  "cal.languageServer.enabled": true,
  "cal.semanticHighlighting.enabled": true,
  "editor.semanticHighlighting.enabled": true
}
```

## Example: OBJECT-PROPERTIES Hyphen Bug

The hyphen highlighting bug was fixed at both layers:

1. **TextMate Grammar Fix:**
   - Modified operator pattern to not match hyphens in keywords
   - Explicitly scoped hyphen parts in `OBJECT-PROPERTIES`

2. **Semantic Tokens Fix:**
   - Added `ObjectProperties` token type
   - Lexer now emits single token (not three)
   - Semantic provider maps it as keyword

**To verify each layer:**

```bash
# Test TextMate only
Set: "cal.semanticHighlighting.enabled": false
Result: Hyphen correctly colored (Stage 1 fix works)

# Test Semantic Tokens
Set: "cal.semanticHighlighting.enabled": true
Result: Hyphen correctly colored (Stage 2 fix works)
```

## Tips

- **Always test both layers** when fixing highlighting issues
- **Use Output panel** (View → Output → "C/AL Language Server") to see logs
- **Check console** in Extension Development Host for client-side logs
- **Reload window** after changing settings (required for LSP changes)
- **Compare with/without** semantic tokens to isolate issues

## Related Files

- Extension settings: `package.json` (`contributes.configuration`)
- Client code: `src/extension.ts`
- Server initialization: `server/src/server.ts`
- Semantic provider: `server/src/semantic/semanticTokens.ts`
- TextMate grammar: `syntaxes/cal.tmLanguage.json`
