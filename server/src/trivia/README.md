# Trivia Module

## Overview

The trivia module provides lazy computation of non-token content (whitespace, newlines, and comments) between tokens. This enables round-trip source preservation without modifying the lexer or token interface.

## What is Trivia?

In lexical analysis, **trivia** refers to source content that does not contribute to program semantics but must be preserved for lossless round-trip reconstruction. In this C/AL extension, trivia includes:

- **Whitespace**: Spaces and tabs (horizontal whitespace)
- **Newlines**: Line terminators (CRLF, LF, or CR)
- **Line comments**: Double-slash comments (`// ...`)
- **Block comments**: Multi-line comments using slash-asterisk (`/* ... */`) or braces (`{ ... }`)

## Design Decisions

### Why Comments are Trivia

This implementation follows the **Roslyn/TypeScript convention** where comments are classified as trivia rather than tokens or AST nodes. Rationale:

1. **Semantic neutrality**: Comments do not affect program execution
2. **Consistent model**: All non-token content is handled uniformly
3. **Round-trip preservation**: Comments can be extracted and preserved using the same mechanism as whitespace
4. **Consumer flexibility**: Callers can filter by `TriviaType` if they need to distinguish comments from whitespace

### Lazy Computation

Trivia is computed on-demand from token position offsets rather than being tokenized by the lexer. Benefits:

- **No lexer modifications**: Token interface remains simple and focused
- **Performance**: Trivia is only computed when needed (e.g., for formatting or round-trip validation)
- **Simplicity**: Lexer can skip whitespace/comments without special handling

See [`docs/whitespace-tokenization-discussion.md`](../../docs/whitespace-tokenization-discussion.md) for the full design discussion.

### Context-Dependent Brace Comments

In C/AL, braces (`{` `}`) have dual meaning:
- **In code blocks**: Structural delimiters (tokenized)
- **In trivia gaps**: Block comment delimiters

The trivia computer only processes gaps between tokens, so by the time braces appear here, the lexer has already decided they're not structural tokens. However, if the lexer has bugs, brace content that looks like code might be misclassified as comments.

**Safeguard**: The `looksLikeCode()` heuristic detects when brace content contains code-like patterns (assignments, keywords, semicolons) and emits warnings. These warnings may indicate lexer bugs or context-detection errors.

## API Reference

### Core Functions

- **`computeTriviaBetween(document, tokens, index)`** - Extracts and classifies trivia before the token at `index`. Returns `TriviaResult` with spans and warnings.

- **`computeTrailingTrivia(document, tokens)`** - Extracts trivia after the last meaningful token (before EOF). Special case of `computeTriviaBetween`.

- **`getTriviaText(document, tokens, index)`** - Returns raw trivia text without classification. Convenience function for quick checks.

### Utility Functions

- **`looksLikeCode(content)`** - Heuristic to detect if brace content appears to be code rather than a comment. Used by `parseTriviaSpans` to emit warnings.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| First token (index 0) | Returns leading trivia from document start to first token |
| EOF token | Returns trailing trivia from last meaningful token to EOF |
| Adjacent tokens | Returns empty result (no gap, no trivia) |
| Out-of-bounds index | Returns empty result with no warnings |
| Unclosed block comments | Consumes remaining text as single trivia span |
| Mixed trivia | Returns multiple spans with correct classification |

## Usage Examples

### Example 1: Extract trivia before a specific token

```typescript
import { computeTriviaBetween } from './trivia/triviaComputer';
import { tokenize } from './lexer/lexer';

const source = 'PROCEDURE Test();\n// Comment\nBEGIN\nEND;';
const tokens = tokenize(source);

// Get trivia before the "BEGIN" token
const beginTokenIndex = tokens.findIndex(t => t.value === 'BEGIN');
const result = computeTriviaBetween(source, tokens, beginTokenIndex);

console.log(result.spans);
// [
//   { type: 'newline', text: '\n', ... },
//   { type: 'line-comment', text: '// Comment', ... },
//   { type: 'newline', text: '\n', ... }
// ]
```

### Example 2: Round-trip validation

```typescript
function reconstructSource(document: string, tokens: Token[]): string {
  let reconstructed = '';

  for (let i = 0; i < tokens.length; i++) {
    // Add trivia before this token
    const trivia = getTriviaText(document, tokens, i);
    reconstructed += trivia;

    // Add the token itself
    if (tokens[i].type !== TokenType.EOF) {
      reconstructed += tokens[i].value;
    }
  }

  return reconstructed;
}
```

### Example 3: Check for warnings

```typescript
const result = computeTriviaBetween(source, tokens, index);

if (result.warnings.length > 0) {
  console.warn('Trivia parsing issues detected:');
  result.warnings.forEach(w => console.warn(`  - ${w}`));
}
```

## Related Documentation

- [`docs/whitespace-tokenization-discussion.md`](../../docs/whitespace-tokenization-discussion.md) - Design rationale and alternatives considered
- [`docs/implementation-plan.md#task-3`](../../docs/implementation-plan.md) - Implementation details for trivia computer
- [`server/src/lexer/lexer.ts`](../lexer/lexer.ts) - Lexer implementation (skips trivia, doesn't tokenize it)

## Testing

Trivia computation is tested in:
- `server/src/trivia/__tests__/triviaComputer.test.ts` - Unit tests for all trivia types and edge cases
