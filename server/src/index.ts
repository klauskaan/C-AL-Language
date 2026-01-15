/**
 * Public API for cal-language-server
 *
 * This module exports types and interfaces for external consumers
 * who want to use the C/AL lexer/parser programmatically.
 *
 * Exports added in #100 to expose clean exit criteria types from #91.
 */

// Clean exit validation types from #91
export { ExitCategory } from './lexer';
export type {
  ExitViolation,
  CleanExitResult,
  CleanExitOptions
} from './lexer';
