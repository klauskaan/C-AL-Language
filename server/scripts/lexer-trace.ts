#!/usr/bin/env ts-node

/**
 * Lexer Trace Script
 *
 * Generates detailed trace output for lexer debugging (Task 7, issue #94).
 * Captures every lexer decision: tokens, context changes, flags, skips.
 *
 * Usage:
 *   npm run lexer:trace <file> [--sanitize]
 *
 * Options:
 *   --sanitize: Truncate token values to hide proprietary content
 *
 * Output:
 *   Writes trace to .lexer-health/<filename>-trace.txt
 *   Format: [line:col] EVENT: details
 *
 * Example:
 *   npm run lexer:trace test/REAL/TAB18.TXT --sanitize
 *   => .lexer-health/TAB18-trace.txt
 */

import { Lexer, TraceCallback, TraceEvent } from '../src/lexer/lexer';
import { readFileWithEncoding } from '../src/utils/encoding';
import { createWriteStream, WriteStream, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { KEYWORDS } from '../src/lexer/tokens';

// Parse arguments
const args = process.argv.slice(2);
const filePath = args.find(arg => !arg.startsWith('--'));
const sanitize = args.includes('--sanitize');

if (!filePath) {
  console.error('Usage: npm run lexer:trace <file> [--sanitize]');
  console.error('');
  console.error('Options:');
  console.error('  --sanitize: Truncate token values to hide content');
  console.error('');
  console.error('Example:');
  console.error('  npm run lexer:trace test/REAL/TAB18.TXT --sanitize');
  process.exit(1);
}

// Ensure output directory exists
const outputDir = join(__dirname, '../../.lexer-health');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = join(outputDir, basename(filePath).replace(/\.[^.]+$/, '-trace.txt'));
const stream: WriteStream = createWriteStream(outputPath);

// Write confidentiality warning banner
stream.write('<!-- WARNING: This file contains content from proprietary NAV objects.\n');
stream.write('     DO NOT commit to version control. -->\n\n');

/**
 * Allowlist of values that don't need sanitization.
 * Includes all C/AL keywords and common safe patterns.
 */
const SANITIZATION_ALLOWLIST = new Set<string>([
  // All C/AL keywords are safe (from KEYWORDS map)
  ...Array.from(KEYWORDS.keys()).map(k => k.toUpperCase()),
]);

/**
 * Check if a value should be sanitized.
 * Safe values: keywords, simple identifiers
 * Unsafe values: literals, strings, complex expressions
 *
 * @param value - Token value to check
 * @returns true if value should be sanitized
 */
function shouldSanitize(value: string): boolean {
  if (!sanitize) return false;

  // Skip sanitization for known-safe values (case-insensitive)
  if (SANITIZATION_ALLOWLIST.has(value.toUpperCase())) return false;

  // Skip sanitization for simple alphanumeric identifiers
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) return false;

  // Sanitize everything else (literals, strings, complex expressions)
  return true;
}

/**
 * Sanitize a token value by truncating to first/last 3 characters.
 * Preserves enough context for debugging while hiding content.
 *
 * @param value - Token value to sanitize
 * @returns Sanitized value (e.g., "Cus...mer")
 */
function sanitizeValue(value: string): string {
  if (!shouldSanitize(value)) return value;
  if (value.length <= 6) return value;
  return value.substring(0, 3) + '...' + value.substring(value.length - 3);
}

/**
 * Format a trace event as a human-readable, grep-able line.
 *
 * Format: [line:col] EVENT: details
 *
 * Examples:
 *   [1:1] TOKEN OBJECT: "OBJECT"
 *   [1:8] CONTEXT PUSH: NORMAL -> OBJECT_LEVEL
 *   [3:5] FLAG braceDepth: 0 -> 1
 *   [2:1] SKIP: whitespace (10 chars)
 *
 * @param event - Trace event to format
 * @returns Formatted line
 */
function formatTraceEvent(event: TraceEvent): string {
  const pos = `[${event.position.line}:${event.position.column}]`;

  switch (event.type) {
    case 'token':
      const value = sanitizeValue(String(event.data.value || ''));
      return `${pos} TOKEN ${event.data.tokenType}: ${JSON.stringify(value)}`;

    case 'context-push':
      return `${pos} CONTEXT PUSH: ${event.data.from} -> ${event.data.to}`;

    case 'context-pop':
      const reason = event.data.reason ? ` (${event.data.reason})` : '';
      return `${pos} CONTEXT POP: ${event.data.from} -> ${event.data.to}${reason}`;

    case 'flag-change':
      return `${pos} FLAG ${event.data.flag}: ${event.data.from} -> ${event.data.to}`;

    case 'skip':
      const length = event.data.length ? ` (${event.data.length} chars)` : '';
      return `${pos} SKIP: ${event.data.reason}${length}`;

    default:
      return `${pos} ${event.type}: ${JSON.stringify(event.data)}`;
  }
}

/**
 * Trace callback that writes events to output stream.
 */
const traceCallback: TraceCallback = (event: TraceEvent) => {
  stream.write(formatTraceEvent(event) + '\n');
};

try {
  console.log(`Reading: ${filePath}`);
  const { content } = readFileWithEncoding(filePath);
  console.log(`Lines: ${content.split('\n').length}`);

  console.log(`Tokenizing with trace enabled...`);
  const lexer = new Lexer(content, { trace: traceCallback });
  lexer.tokenize();

  stream.end();
  console.log(`Trace written to: ${outputPath}`);
  console.log(`Sanitization: ${sanitize ? 'enabled' : 'disabled'}`);
} catch (error) {
  console.error(`Error processing file: ${error}`);
  process.exit(1);
}
