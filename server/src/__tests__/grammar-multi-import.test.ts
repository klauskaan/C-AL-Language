/**
 * Test file to exercise multi-file import of the grammar helper.
 *
 * This test file imports the grammar helper alongside grammar.snapshot.test.ts.
 * With default Jest config (separate worker processes, resetModules: false),
 * multiple test files can safely import the helper due to process isolation
 * and module-level guards. This test exercises that import path.
 *
 * The globalThis guard in grammar.ts provides defense-in-depth for future
 * Jest configuration changes (e.g., runInBand + resetModules: true).
 */
import { initializeGrammar, tokenizeLines } from './helpers/grammar';

describe('Grammar helper multi-file import', () => {
  beforeAll(async () => {
    await initializeGrammar();
  });

  it('should initialize and tokenize when imported from multiple test files', async () => {
    // Exercises the multi-file import path. With current Jest config
    // (separate worker processes), this runs in isolation from
    // grammar.snapshot.test.ts, so both can safely initialize.
    const result = await tokenizeLines('CODE x;');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should tokenize simple C/AL code', async () => {
    const result = await tokenizeLines('LOCAL PROCEDURE Test();');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].length).toBeGreaterThan(0);
  });
});
