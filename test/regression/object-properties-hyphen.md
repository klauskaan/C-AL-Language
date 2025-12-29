# Regression Test: OBJECT-PROPERTIES Hyphen Highlighting

## Issue
The hyphen in `OBJECT-PROPERTIES` was being highlighted differently than the surrounding keyword text.

## Root Cause
The issue had two layers:

1. **TextMate Grammar (Stage 1 highlighting)**: The arithmetic operator pattern was matching the hyphen `-` within `OBJECT-PROPERTIES`
2. **Semantic Tokens (Stage 2 highlighting)**: The lexer was tokenizing `OBJECT-PROPERTIES` as three separate tokens (`OBJECT`, `-`, `PROPERTIES`), and the semantic tokens provider was coloring the hyphen as an operator, overriding the TextMate grammar fix

VS Code uses a two-stage highlighting process:
- **Stage 1**: Fast TextMate grammar (regex-based)
- **Stage 2**: Semantic tokens from Language Server (AST-based) - this overrides Stage 1

## Fix
Three-part fix:

1. **Added `ObjectProperties` token type** ([server/src/lexer/tokens.ts:26](server/src/lexer/tokens.ts#L26))
   ```typescript
   ObjectProperties = 'OBJECT_PROPERTIES',
   ```

2. **Modified lexer to recognize `OBJECT-PROPERTIES` as single token** ([server/src/lexer/lexer.ts:350-375](server/src/lexer/lexer.ts#L350-L375))
   - Added special case handling in `scanIdentifier()`
   - When lexer encounters `OBJECT` followed by `-` and `PROPERTIES`, it emits a single `ObjectProperties` token
   - Includes proper position restoration if the pattern doesn't match

3. **Updated semantic tokens provider** ([server/src/semantic/semanticTokens.ts:110](server/src/semantic/semanticTokens.ts#L110))
   - Added `TokenType.ObjectProperties` to the keyword case
   - Now the hyphen is never separately highlighted as an operator

4. **TextMate grammar improvements** (for better Stage 1 highlighting):
   - Modified arithmetic operator pattern to avoid matching hyphens between uppercase letters
   - Explicitly scoped hyphen in `OBJECT-PROPERTIES` patterns

## Test Cases

### Case 1: OBJECT-PROPERTIES keyword should be uniformly colored
```cal
OBJECT Codeunit 1003 Test
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
  }
}
```
Expected: All characters in `OBJECT-PROPERTIES` have the same color (keyword color).

### Case 2: Minus operator in expressions should still work
```cal
  VAR
    Result@1000 : Integer;
  BEGIN
    Result := 10 - 5;  // minus operator should be highlighted
  END.
```
Expected: The `-` between `10` and `5` is highlighted as an operator.

### Case 3: Hyphenated identifiers should not have operator-colored hyphens
```cal
  VAR
    End-Total@1000 : Integer;
  BEGIN
  END.
```
Expected: The `-` in `End-Total` is part of the identifier, not highlighted as an operator.

## Manual Testing
1. Open Extension Development Host (F5)
2. Open a `.cal` file with `OBJECT-PROPERTIES`
3. Verify the hyphen has the same color as surrounding text
4. Verify arithmetic `-` operator still highlights correctly in code blocks

## Automated Testing
✅ **Comprehensive lexer tests added**: [server/src/lexer/__tests__/object-properties-tokenization.test.ts](server/src/lexer/__tests__/object-properties-tokenization.test.ts)

Tests verify:
- `OBJECT-PROPERTIES` tokenizes as single token (not three)
- Case-insensitive handling
- Correct tokenization in complete object structures
- No false positives (e.g., `OBJECT - 5` still has separate tokens)
- Proper handling of whitespace and following braces

All 6 tests passing ✅
