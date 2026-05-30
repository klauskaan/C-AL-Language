/**
 * Tests for scopeFilter module (server/src/shared/scopeFilter.ts)
 *
 * This module provides identity-aware filtering of symbol references using
 * the SymbolTable and token stream. It is used by ReferenceProvider and
 * CodeLensProvider to limit matches to a single lexical identity rather
 * than all name-matches across the document.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../../symbols/symbolTable';
import { resolveOriginIdentity, keepCandidate } from '../scopeFilter';

/**
 * Helper to parse C/AL code and return AST, symbolTable, and token array.
 */
function parseContent(content: string) {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const ast = new Parser(tokens).parse();
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return { ast, symbolTable, tokens };
}

// ---------------------------------------------------------------------------
// Fixture: one global var + two procs, each with a same-named local
// ---------------------------------------------------------------------------
// prettier-ignore
// Location assertions depend on fixture structure - do not reformat
const FIXTURE_SIBLING_LOCALS = `OBJECT Codeunit 50000 ScopeTest
{
  CODE
  {
    VAR
      Counter : Integer;

    PROCEDURE ProcA@1();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 10;
    END;

    PROCEDURE ProcB@2();
    VAR
      Counter@1000 : Integer;
    BEGIN
      Counter := 20;
    END;

    BEGIN
    END.
  }
}`;

describe('resolveOriginIdentity()', () => {
  it('returns token.startOffset of the declaration for a known local variable', () => {
    const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

    // Find the offset of ProcA's local Counter declaration
    const procALocalOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
    expect(procALocalOffset).toBeGreaterThan(-1);

    const identity = resolveOriginIdentity(symbolTable, 'Counter', procALocalOffset);
    expect(identity).toBeDefined();
    expect(typeof identity).toBe('number');
  });

  it('returns token.startOffset of the declaration for a global variable', () => {
    const { symbolTable } = parseContent(FIXTURE_SIBLING_LOCALS);

    // The global Counter declaration offset (before the procedure scopes)
    const globalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter : Integer');
    expect(globalDeclOffset).toBeGreaterThan(-1);

    const identity = resolveOriginIdentity(symbolTable, 'Counter', globalDeclOffset);
    expect(identity).toBeDefined();
    expect(typeof identity).toBe('number');
  });

  it('returns undefined for an unknown name at the given offset', () => {
    const { symbolTable } = parseContent(FIXTURE_SIBLING_LOCALS);

    const anyOffset = 10;
    const identity = resolveOriginIdentity(symbolTable, 'NonExistentVar', anyOffset);
    expect(identity).toBeUndefined();
  });

  it('returns undefined when symbolTable is undefined', () => {
    const identity = resolveOriginIdentity(undefined, 'Counter', 0);
    expect(identity).toBeUndefined();
  });

  it('ProcA local and ProcB local resolve to DIFFERENT identities', () => {
    const { symbolTable } = parseContent(FIXTURE_SIBLING_LOCALS);

    // ProcA's local Counter
    const procALocalOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
    const procBLocalOffset = FIXTURE_SIBLING_LOCALS.lastIndexOf('Counter@1000 : Integer');

    // They must be different positions in the fixture
    expect(procALocalOffset).not.toBe(procBLocalOffset);

    const identityA = resolveOriginIdentity(symbolTable, 'Counter', procALocalOffset);
    const identityB = resolveOriginIdentity(symbolTable, 'Counter', procBLocalOffset);

    expect(identityA).toBeDefined();
    expect(identityB).toBeDefined();
    expect(identityA).not.toBe(identityB);
  });
});

describe('keepCandidate()', () => {
  // Fixture: a simple codeunit with two procs, each having Counter as a local.
  // We use offsets derived directly from content.indexOf() calls.

  describe('keepUnresolved: true  (Find-References policy)', () => {
    it('keeps a candidate when its resolved identity matches the origin identity', () => {
      const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

      const procALocalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', procALocalDeclOffset);
      expect(originIdentity).toBeDefined();

      // The usage "Counter := 10" inside ProcA should match ProcA's local
      const counterUseOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter := 10');
      expect(counterUseOffset).toBeGreaterThan(-1);

      const result = keepCandidate(
        counterUseOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: true }
      );
      expect(result).toBe(true);
    });

    it('drops a candidate that resolves to a DIFFERENT identity (same-named sibling local)', () => {
      const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

      // Origin = ProcA's Counter
      const procALocalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', procALocalDeclOffset);
      expect(originIdentity).toBeDefined();

      // Candidate = Counter usage inside ProcB (a different identity)
      const counterInProcBOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter := 20');
      expect(counterInProcBOffset).toBeGreaterThan(-1);

      const result = keepCandidate(
        counterInProcBOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: true }
      );
      expect(result).toBe(false);
    });

    it('keeps a candidate whose token does not resolve to any symbol (unresolved)', () => {
      // An offset where there IS a token (an identifier) but the symbol table
      // cannot resolve it (e.g. a method call on an external object that wasn't declared).
      // We simulate this with a fixture that has an expression the ST won't know about.
      const code = `OBJECT Codeunit 50001 UnresolvedTest
{
  CODE
  {
    VAR
      Counter@1000 : Integer;

    PROCEDURE ProcA@1();
    BEGIN
      Counter := 1;
      MESSAGE('hello');
    END;

    BEGIN
    END.
  }
}`;
      const { symbolTable, tokens } = parseContent(code);

      // Origin = the global Counter
      const counterDeclOffset = code.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', counterDeclOffset);
      expect(originIdentity).toBeDefined();

      // MESSAGE is a builtin not in the symbol table — use its offset as an "unresolved" candidate
      const messageOffset = code.indexOf('MESSAGE');
      expect(messageOffset).toBeGreaterThan(-1);

      // With keepUnresolved: true — unresolved candidate should be KEPT
      const result = keepCandidate(
        messageOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: true }
      );
      expect(result).toBe(true);
    });

    it('keeps a candidate when findTokenAtOffset returns undefined (gap in token stream)', () => {
      const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

      // Use an offset that falls in whitespace (gap between tokens)
      // The very start of the source (the 'O' in OBJECT) is a real token, but
      // position 0 might or might not be — use an offset we know is whitespace.
      // The newline after "OBJECT Codeunit 50000 ScopeTest" is a safe gap.
      const gapOffset = FIXTURE_SIBLING_LOCALS.indexOf('\n'); // newline after OBJECT line
      expect(gapOffset).toBeGreaterThan(-1);

      const procALocalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', procALocalDeclOffset);
      expect(originIdentity).toBeDefined();

      // With keepUnresolved: true — token-miss should be KEPT
      const result = keepCandidate(
        gapOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: true }
      );
      expect(result).toBe(true);
    });
  });

  describe('keepUnresolved: false  (Rename policy)', () => {
    it('keeps a candidate when its resolved identity matches the origin identity', () => {
      const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

      const procALocalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', procALocalDeclOffset);
      expect(originIdentity).toBeDefined();

      const counterUseOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter := 10');
      const result = keepCandidate(
        counterUseOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: false }
      );
      expect(result).toBe(true);
    });

    it('drops a candidate that resolves to a DIFFERENT identity', () => {
      const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

      const procALocalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', procALocalDeclOffset);
      expect(originIdentity).toBeDefined();

      const counterInProcBOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter := 20');
      const result = keepCandidate(
        counterInProcBOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: false }
      );
      expect(result).toBe(false);
    });

    it('drops a candidate whose token does not resolve to any symbol (unresolved)', () => {
      const code = `OBJECT Codeunit 50001 UnresolvedTest
{
  CODE
  {
    VAR
      Counter@1000 : Integer;

    PROCEDURE ProcA@1();
    BEGIN
      Counter := 1;
      MESSAGE('hello');
    END;

    BEGIN
    END.
  }
}`;
      const { symbolTable, tokens } = parseContent(code);

      const counterDeclOffset = code.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', counterDeclOffset);
      expect(originIdentity).toBeDefined();

      const messageOffset = code.indexOf('MESSAGE');

      // With keepUnresolved: false — unresolved candidate should be DROPPED
      const result = keepCandidate(
        messageOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: false }
      );
      expect(result).toBe(false);
    });

    it('drops a candidate when findTokenAtOffset returns undefined (gap in token stream)', () => {
      const { symbolTable, tokens } = parseContent(FIXTURE_SIBLING_LOCALS);

      const gapOffset = FIXTURE_SIBLING_LOCALS.indexOf('\n');
      const procALocalDeclOffset = FIXTURE_SIBLING_LOCALS.indexOf('Counter@1000 : Integer');
      const originIdentity = resolveOriginIdentity(symbolTable, 'Counter', procALocalDeclOffset);
      expect(originIdentity).toBeDefined();

      // With keepUnresolved: false — token-miss should be DROPPED
      const result = keepCandidate(
        gapOffset, originIdentity!, symbolTable, tokens, { keepUnresolved: false }
      );
      expect(result).toBe(false);
    });
  });
});
