# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2025-12-23 19:09]
Token interface uses startOffset/endOffset properties, not offset. When accessing token offsets, always use token.startOffset and token.endOffset, not token.offset.

_Context: Found in symbolTable.ts when creating procedure and trigger scopes - the code was using procedure.startToken.offset which doesn't exist on the Token interface. Fixed to use procedure.startToken.startOffset and procedure.endToken.endOffset._
