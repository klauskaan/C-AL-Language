# Highlighting Test Modes

Quick guide to toggle between different syntax highlighting modes for testing.

## Quick Start

```bash
# Show current mode
npm run mode

# Switch to TextMate only
npm run mode:textmate

# Switch to Semantic tokens only
npm run mode:semantic

# Switch to both (default)
npm run mode:both
```

**After switching modes:** Reload the Extension Development Host window (close it, reload main VS Code with Ctrl+Shift+P → Reload Window, then press F5).

## The Three Modes

### Mode 1: TextMate Only
```bash
npm run mode:textmate
```

**What it does:**
- ✓ TextMate grammar highlighting enabled
- ✗ Language Server disabled (no LSP features)
- ✗ Semantic tokens disabled

**Use this to:**
- Test TextMate grammar (`syntaxes/cal.tmLanguage.json`) in isolation
- Debug regex patterns and scopes
- Verify initial/fallback highlighting

**What you'll see:**
- Syntax coloring from TextMate grammar only
- No IntelliSense, hover, go-to-definition, etc.
- Fast, instant highlighting

### Mode 2: Semantic Tokens Only
```bash
npm run mode:semantic
```

**What it does:**
- ✗ TextMate grammar disabled (commented out in `package.json`)
- ✓ Language Server enabled
- ✓ Semantic tokens enabled

**Use this to:**
- Test semantic token highlighting in isolation
- See exactly what the LSP is coloring
- Debug lexer tokenization issues

**What you'll see:**
- Most text is white/default color
- Only tokens explicitly handled by semantic provider are colored
- Full LSP features (IntelliSense, hover, etc.)
- Highlighting appears after ~1 second (requires parsing)

### Mode 3: Both Enabled (Default)
```bash
npm run mode:both
```

**What it does:**
- ✓ TextMate grammar enabled
- ✓ Language Server enabled
- ✓ Semantic tokens enabled

**Use this to:**
- Test the complete two-stage highlighting
- Verify semantic tokens properly override TextMate
- Production-like experience

**What you'll see:**
- Brief TextMate highlighting first (Stage 1)
- Semantic tokens override after ~1 second (Stage 2)
- Full LSP features
- The actual user experience

## Manual Mode Switching

If you prefer to manually edit files:

### TextMate Only
1. Edit `.vscode/settings.json`:
   ```json
   {
     "cal.languageServer.enabled": false,
     "cal.semanticHighlighting.enabled": false
   }
   ```
2. Ensure `grammars` section is NOT commented in `package.json`
3. Reload window

### Semantic Only
1. Edit `.vscode/settings.json`:
   ```json
   {
     "cal.languageServer.enabled": true,
     "cal.semanticHighlighting.enabled": true
   }
   ```
2. Comment out `grammars` section in `package.json`:
   ```json
   /* "grammars": [
     {
       "language": "cal",
       "scopeName": "source.cal",
       "path": "./syntaxes/cal.tmLanguage.json",
       ...
     }
   ], */
   ```
3. Reload window

### Both Enabled
1. Edit `.vscode/settings.json`:
   ```json
   {
     "cal.languageServer.enabled": true,
     "cal.semanticHighlighting.enabled": true
   }
   ```
2. Ensure `grammars` section is NOT commented in `package.json`
3. Reload window

## Checking Current Mode

```bash
npm run mode
```

Output shows:
- Language Server status
- Semantic Tokens status
- TextMate Grammar status
- Detected active mode

## Testing OBJECT-PROPERTIES Bug Fix

### With TextMate Only
```bash
npm run mode:textmate
# Reload window, press F5
# Look at OBJECT-PROPERTIES on line 3
# Hyphen should be same color as rest of keyword (purple/pink)
```

### With Semantic Only
```bash
npm run mode:semantic
# Reload window, press F5
# Look at OBJECT-PROPERTIES on line 3
# Hyphen should be same color as rest of keyword
# Most other text will be white
```

### With Both
```bash
npm run mode:both
# Reload window, press F5
# Watch for two-stage highlighting
# Final result: hyphen should match keyword color
```

## Files Modified by Mode Script

The `toggle-highlighting-mode.js` script modifies:
1. `.vscode/settings.json` - LSP and semantic token settings
2. `package.json` - Comments/uncomments the `grammars` section

Always commit from a clean state (mode:both) unless testing.

## Troubleshooting

**Q: Mode switch doesn't seem to work?**
- Make sure you reloaded the Extension Development Host window
- Close EDH completely, reload main VS Code (Ctrl+Shift+P → Reload Window), then press F5

**Q: Can't see any colors in semantic-only mode?**
- This is normal! Only tokens handled by semantic provider are colored
- Keywords, types, operators should have color
- Punctuation, whitespace, etc. will be white

**Q: Script gives permission error?**
```bash
chmod +x toggle-highlighting-mode.js
```

**Q: Want to see what settings are active?**
- Check Developer Tools console: "C/AL Settings: languageServer.enabled=..."
- Or run: `npm run mode`
