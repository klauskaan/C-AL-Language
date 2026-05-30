import { Token } from '../lexer/tokens';
import { SymbolTable } from '../symbols/symbolTable';
import { findTokenAtOffset } from './tokenSearch';

export interface ScopeFilterOptions {
  /**
   * Policy for an occurrence whose token resolves to NO in-scope symbol.
   * - true  (references / CodeLens): KEEP it. Protects member-expression
   *         properties with no same-named in-scope symbol, WITH-block fields,
   *         and cross-object names from being wrongly dropped (#786).
   * - false (rename, via #792): DROP it (fail closed).
   */
  keepUnresolved: boolean;
}

/**
 * Resolve the origin symbol's identity = its declaration-token offset.
 * Returns undefined when there is no symbol table or no symbol resolves
 * (caller then applies its permissive/fail-closed fallback).
 * Identity basis matches rename (renameProvider.ts:362-374).
 */
export function resolveOriginIdentity(
  symbolTable: SymbolTable | undefined,
  originName: string,
  originOffset: number
): number | undefined {
  if (!symbolTable) return undefined;
  return symbolTable.getSymbolAtOffset(originName, originOffset)?.token.startOffset;
}

/**
 * Decide whether a single name-matched candidate occurrence belongs to the
 * same symbol as the origin. Identity on both sides = resolved symbol's
 * token.startOffset.
 */
export function keepCandidate(
  candidateStartOffset: number,
  originIdentity: number,
  symbolTable: SymbolTable,
  tokens: readonly Token[],
  options: ScopeFilterOptions
): boolean {
  const refToken = findTokenAtOffset(tokens, candidateStartOffset);
  if (!refToken) return options.keepUnresolved;
  const refSymbol = symbolTable.getSymbolAtOffset(refToken.value, refToken.startOffset);
  if (!refSymbol) return options.keepUnresolved;
  return refSymbol.token.startOffset === originIdentity;
}
