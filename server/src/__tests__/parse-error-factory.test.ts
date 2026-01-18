/**
 * CI Guard for ParseError Factory Enforcement
 *
 * This test ensures all ParseError instantiation goes through a factory method
 * rather than direct `new ParseError(...)` calls. This enables consistent error
 * handling and prevents content leakage.
 *
 * Background:
 * - ParseError messages may contain sensitive content from parsed files
 * - Direct construction makes it difficult to apply sanitization uniformly
 * - Factory pattern allows centralized sanitization and error handling
 * - Issue #131: Enforce ParseError factory method pattern
 *
 * Implementation:
 * Enforces that parser.ts has exactly ONE `new ParseError` construction
 * (inside the createParseError factory method). All other error construction
 * sites must use the factory to ensure consistent handling.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('ParseError Factory Enforcement', () => {
  const parserFilePath = path.resolve(__dirname, '../parser/parser.ts');

  it('should only instantiate ParseError through factory method', () => {
    // Read parser.ts file
    expect(fs.existsSync(parserFilePath)).toBe(true);
    const parserContent = fs.readFileSync(parserFilePath, 'utf-8');
    const lines = parserContent.split('\n');

    // Find all occurrences of `new ParseError(` (case-insensitive to prevent bypass)
    const regex = /new\s+ParseError\s*\(/gi;
    const matches: Array<{ line: number; content: string; match: string }> = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      let match;
      while ((match = regex.exec(line)) !== null) {
        matches.push({
          line: lineNumber,
          content: line.trim(),
          match: match[0]
        });
      }
      // Reset regex for next line
      regex.lastIndex = 0;
    });

    // We expect EXACTLY 1 match - inside the factory method
    if (matches.length !== 1) {
      const violationLines = matches.map(m => m.line).join(', ');
      const violationDetails = matches.map(m =>
        `  Line ${m.line}: ${m.content}`
      ).join('\n');

      expect(matches.length).toBe(1);
      console.error(
        `Found ${matches.length} ParseError instantiations. Expected only 1 (inside factory).\n\n` +
        `Violations at lines: ${violationLines}\n\n` +
        `Details:\n${violationDetails}\n\n` +
        `Fix: Replace direct 'new ParseError(...)' calls with factory method:\n` +
        `  - Instead of: throw new ParseError(message, token)\n` +
        `  - Use:        throw this.createParseError(message, token)\n\n` +
        `  - Instead of: this.errors.push(new ParseError(message, token))\n` +
        `  - Use:        this.errors.push(this.createParseError(message, token))`
      );
    }

    // We have exactly 1 match - verify it's inside createParseError factory
    const singleMatch = matches[0];
    const matchLine = singleMatch.line;

    // Check surrounding context (10 lines before and after)
    const contextStart = Math.max(0, matchLine - 11);
    const contextEnd = Math.min(lines.length, matchLine + 10);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    // Verify the match is within a method named createParseError
    const isInFactory = context.includes('createParseError') ||
                        context.includes('private createParseError') ||
                        context.includes('public createParseError');

    if (!isInFactory) {
      console.error(
        `Found ParseError instantiation at line ${matchLine}, but it's not inside a factory method.\n\n` +
        `Line ${matchLine}: ${singleMatch.content}\n\n` +
        `Expected: The only 'new ParseError' should be inside a 'createParseError' factory method.\n\n` +
        `Context (lines ${contextStart + 1}-${contextEnd}):\n${context}\n\n` +
        `Fix: Move this instantiation into a createParseError factory method.`
      );
    }
    expect(isInFactory).toBe(true);

    // Success case
    expect(matches.length).toBe(1);
    expect(isInFactory).toBe(true);
  });

  it('should have a createParseError factory method defined', () => {
    const parserContent = fs.readFileSync(parserFilePath, 'utf-8');

    // Look for factory method definition
    const factoryMethodPattern = /\b(private|public|protected)\s+createParseError\s*\(/;
    const hasFactory = factoryMethodPattern.test(parserContent);

    expect(hasFactory).toBe(true);
  });

  describe('Factory method requirements', () => {
    it('should sanitize message content in createParseError', () => {
      const parserContent = fs.readFileSync(parserFilePath, 'utf-8');
      const lines = parserContent.split('\n');

      // Find createParseError method
      const methodStartPattern = /\b(private|public|protected)\s+createParseError\s*\(/;
      let methodStartLine = -1;

      for (let i = 0; i < lines.length; i++) {
        if (methodStartPattern.test(lines[i])) {
          methodStartLine = i;
          break;
        }
      }

      if (methodStartLine === -1) {
        // This will fail if factory method doesn't exist
        // Covered by previous test
        return;
      }

      // Extract method body (approximate - until next method or closing brace)
      let methodEndLine = methodStartLine;
      let braceCount = 0;
      let foundOpeningBrace = false;

      for (let i = methodStartLine; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
          if (char === '{') {
            braceCount++;
            foundOpeningBrace = true;
          } else if (char === '}') {
            braceCount--;
            if (foundOpeningBrace && braceCount === 0) {
              methodEndLine = i;
              break;
            }
          }
        }
        if (foundOpeningBrace && braceCount === 0) break;
      }

      const methodBody = lines.slice(methodStartLine, methodEndLine + 1).join('\n');

      // Check for sanitization call
      const hasSanitization = methodBody.includes('sanitizeContent') ||
                             methodBody.includes('sanitize(') ||
                             methodBody.includes('stripPaths');

      expect(hasSanitization).toBe(true);
    });
  });
});
