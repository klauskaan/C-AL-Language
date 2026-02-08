/**
 * Trace Callback Async Support Tests
 *
 * Tests for graceful handling of async trace callbacks (issue #116).
 *
 * Expected behavior:
 * - Async callback rejections caught via Promise.resolve().catch()
 * - Callback disabled after first rejection (fail-once)
 * - Session ID prevents stale rejections from affecting new tokenizations
 * - No unhandled promise rejections
 * - Tokenization completes successfully
 */

import { Lexer, TraceCallback, TraceEvent } from '../lexer';

describe('Trace callback async support', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Core async behavior', () => {
    it('should log warning and disable callback when async callback rejects', async () => {
      // Async callback that returns rejected Promise
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        return Promise.reject(new Error('Async error')) as any;
      };

      const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Currently no async handling, rejection will be unhandled
      const tokens = lexer.tokenize();

      // Verify tokenization completed
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);

      // Let async rejection propagate
      await Promise.resolve();

      // Should FAIL: No console.warn exists for async rejections yet
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const [warningMessage, errorObject] = consoleWarnSpy.mock.calls[0];
      expect(warningMessage).toContain('disabled');
      expect(errorObject).toBeInstanceOf(Error);
      expect(errorObject.message).toBe('Async error');
    });

    it('should continue working when async callback resolves', async () => {
      let callCount = 0;

      // Async callback that returns resolved Promise
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        callCount++;
        return Promise.resolve() as any;
      };

      const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Currently doesn't handle Promise returns
      const tokens = lexer.tokenize();

      // Let any async operations complete
      await Promise.resolve();

      // Verify tokenization completed
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);

      // Verify callback was called multiple times (not disabled)
      expect(callCount).toBeGreaterThan(1);

      // No warnings should be logged for successful async callbacks
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not cause unhandled promise rejection in Node', async () => {
      // Setup unhandled rejection listener
      const rejectionHandler = jest.fn();
      process.on('unhandledRejection', rejectionHandler);

      try {
        const traceCallback: TraceCallback = (_event: TraceEvent) => {
          return Promise.reject(new Error('Test rejection')) as any;
        };

        const code = 'OBJECT Table 1';
        const lexer = new Lexer(code, { trace: traceCallback });

        // Should FAIL: Currently will cause unhandled rejection
        lexer.tokenize();

        // Let rejection propagate through event loop
        await new Promise(resolve => setTimeout(resolve, 10));

        // Should FAIL: Rejection will be unhandled
        expect(rejectionHandler).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', rejectionHandler);
      }
    });
  });

  describe('Session ID and race condition handling', () => {
    it('should ignore stale rejection after new tokenization started on same instance', async () => {
      let rejectFirstCallback: ((error: Error) => void) | null = null;
      let firstCallbackPromise: Promise<void> | null = null;
      let tokenizeCount = 0;

      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Only create the pending promise on the FIRST event of the FIRST tokenization
        if (tokenizeCount === 1 && firstCallbackPromise === null) {
          // Return a Promise that we'll reject later (simulating slow async operation)
          firstCallbackPromise = new Promise<void>((_resolve, reject) => {
            rejectFirstCallback = reject;
          });
          return firstCallbackPromise;
        }
        // All other calls: work normally
        return undefined;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // First tokenization - starts async operation (session 1)
      tokenizeCount = 1;
      lexer.tokenize();

      // Second tokenization on SAME instance - increments session (session 2)
      tokenizeCount = 2;
      const tokens2 = lexer.tokenize();

      // Now reject the first (stale) Promise from session 1
      rejectFirstCallback!(new Error('Stale rejection'));
      await Promise.resolve();

      // Session ID tracking: rejection from session 1 should be ignored
      // because we're now on session 2
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      // Verify second tokenization completed successfully
      expect(tokens2.length).toBeGreaterThan(0);
    });

    it('should log warning for rejection in current session', async () => {
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Reject immediately in current session
        return Promise.reject(new Error('Current session error')) as any;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No async handling yet
      lexer.tokenize();

      await Promise.resolve();

      // Should FAIL: No warning logged yet
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const [message] = consoleWarnSpy.mock.calls[0];
      expect(message).toContain('disabled');
    });
  });

  describe('Concurrent rejection handling', () => {
    it('should log only one warning when multiple async callbacks reject', async () => {
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Every callback returns rejected Promise
        return Promise.reject(new Error('Multiple rejections')) as any;
      };

      // Code that generates multiple trace events
      const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } KEYS { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No async rejection handling yet
      lexer.tokenize();

      // Let all rejections propagate
      await Promise.resolve();
      await Promise.resolve();

      // Should FAIL: Will have multiple warnings or unhandled rejections
      // Verify only ONE warning (first rejection disables callback)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed thenable without .catch() method', async () => {
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Return thenable without .catch() method (duck typing edge case)
        return {
          then: (onFulfilled: any) => {
            // Immediately reject, but no .catch method available
            setTimeout(() => onFulfilled(), 0);
          }
        } as any;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will throw TypeError: .catch is not a function
      expect(() => lexer.tokenize()).not.toThrow(TypeError);

      const tokens = lexer.tokenize();
      expect(tokens.length).toBeGreaterThan(0);

      await Promise.resolve();
    });

    it('should handle thenable duck typing with rejection', async () => {
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Custom thenable that rejects
        return {
          then: (_onFulfilled: any, onRejected: any) => {
            setTimeout(() => onRejected(new Error('Thenable rejection')), 0);
            return { then: () => {}, catch: () => {} };
          },
          catch: (onRejected: any) => {
            onRejected(new Error('Thenable rejection'));
            return { then: () => {}, catch: () => {} };
          }
        } as any;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No async thenable handling yet
      lexer.tokenize();

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should FAIL: No warning logged yet for thenable rejection
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('disabled');
    });

    it('should prioritize sync throw over async return', () => {
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Create a Promise (async path) - but never return it
        void Promise.resolve();
        // Then throw synchronously - this should take precedence
        throw new Error('Sync error');
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: But sync error handling already exists (from issue #104)
      // This test verifies sync errors still work with async handling added
      const tokens = lexer.tokenize();

      // Verify sync error path was taken (callback disabled immediately)
      expect(tokens.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const [message, error] = consoleWarnSpy.mock.calls[0];
      expect(message).toContain('disabled');
      expect(error.message).toBe('Sync error');
    });

    it('should log async rejection with reentrancy message without rethrowing', async () => {
      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Reject with reentrancy violation message
        return Promise.reject(
          new Error('Lexer reentrancy violation: test case')
        ) as any;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No async handling yet
      // Sync reentrancy violations are rethrown, but async should just log
      expect(() => lexer.tokenize()).not.toThrow();

      await Promise.resolve();

      // Verify warning logged but not rethrown
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const [message, error] = consoleWarnSpy.mock.calls[0];
      expect(message).toContain('disabled');
      expect(error.message).toContain('reentrancy');
    });

    it('should handle rejection with non-Error values', async () => {
      const testCases = [
        { name: 'string', value: 'error string' },
        { name: 'undefined', value: undefined },
        { name: 'null', value: null },
        { name: 'number', value: 42 },
        { name: 'object', value: { error: 'custom' } }
      ];

      for (const testCase of testCases) {
        consoleWarnSpy.mockClear();

        const traceCallback: TraceCallback = (_event: TraceEvent) => {
          return Promise.reject(testCase.value) as any;
        };

        const code = 'OBJECT Table 1';
        const lexer = new Lexer(code, { trace: traceCallback });

        // Should FAIL: No async handling for non-Error rejections yet
        const tokens = lexer.tokenize();

        await Promise.resolve();

        // Verify warning logged with non-Error value
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should reset traceCallbackDisabled between tokenize() calls', async () => {
      let callCount = 0;

      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        callCount++;
        if (callCount === 1) {
          // First tokenization - reject
          return Promise.reject(new Error('First tokenize rejection')) as any;
        }
        // Second tokenization - should be re-enabled
        return undefined;
      };

      const code = 'OBJECT Table 1 { PROPERTIES { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // First tokenization - callback rejects and gets disabled
      const tokens1 = lexer.tokenize();
      await Promise.resolve();

      expect(tokens1.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockClear();

      // Second tokenization - callback should be re-enabled
      const tokens2 = lexer.tokenize();
      await Promise.resolve();

      // Should FAIL: Callback not re-enabled for async case yet
      expect(tokens2.length).toBeGreaterThan(0);
      expect(callCount).toBeGreaterThan(1); // Callback was called again
    });
  });

  describe('Mixed sync and async callback behavior', () => {
    it('should handle callback that sometimes returns Promise, sometimes undefined', async () => {
      let callCount = 0;

      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        callCount++;
        // Alternate between sync (undefined) and async (Promise)
        if (callCount % 2 === 0) {
          return Promise.resolve() as any;
        }
        return undefined;
      };

      const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No handling for mixed sync/async returns yet
      const tokens = lexer.tokenize();

      await Promise.resolve();

      expect(tokens.length).toBeGreaterThan(0);
      expect(callCount).toBeGreaterThan(2);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle mixed sync and async behavior during tokenization', async () => {
      // NOTE: Async rejections are fire-and-forget - they don't block synchronous tokenization.
      // All callbacks during the current tokenization WILL be called because tokenization is sync.
      // The async rejection handler only runs after tokenization completes.
      let callCount = 0;

      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        callCount++;
        if (callCount === 3) {
          // Third call: async rejection (fire-and-forget)
          return Promise.reject(new Error('Third call async error')) as any;
        }
        // All other calls: sync, no error
        return undefined;
      };

      const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } KEYS { } CODE { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Tokenization is synchronous - all callbacks fire during this call
      lexer.tokenize();

      // All callbacks during tokenization are called (not blocked by async rejection)
      expect(callCount).toBeGreaterThan(3);

      // Let async rejection handler run
      await Promise.resolve();

      // Verify async rejection was caught and logged
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('disabled');
    });
  });

  describe('Session isolation', () => {
    it('should not disable callback across different Lexer instances', async () => {
      let lexer1CallCount = 0;
      let lexer2CallCount = 0;

      // Shared callback that rejects for first lexer, succeeds for second
      const sharedCallback: TraceCallback = (_event: TraceEvent) => {
        if (lexer1CallCount === 0 && lexer2CallCount === 0) {
          // First lexer, first call
          lexer1CallCount++;
          return Promise.reject(new Error('Lexer1 async error')) as any;
        } else {
          // Second lexer
          lexer2CallCount++;
          return undefined;
        }
      };

      const code = 'OBJECT Table 1';

      // Lexer1 - callback rejects asynchronously
      const lexer1 = new Lexer(code, { trace: sharedCallback });
      lexer1.tokenize();

      await Promise.resolve();

      // Lexer2 - callback should still work (independent instance)
      const lexer2 = new Lexer(code, { trace: sharedCallback });
      lexer2.tokenize();

      await Promise.resolve();

      // Should FAIL: No per-instance session tracking yet
      expect(lexer2CallCount).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1); // Only Lexer1 logged warning
    });
  });

  describe('Delayed async rejection', () => {
    it('should handle rejection that occurs after tokenization completes', async () => {
      let rejectLater: ((error: Error) => void) | null = null;

      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Return Promise that will be rejected later (after tokenize() returns)
        return new Promise((_resolve, reject) => {
          rejectLater = reject;
        }) as any;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No async handling yet
      const tokens = lexer.tokenize();

      expect(tokens.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // Not rejected yet

      // Reject after tokenization completed
      rejectLater!(new Error('Delayed rejection'));
      await Promise.resolve();

      // Should FAIL: Delayed rejection not handled yet
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const [message] = consoleWarnSpy.mock.calls[0];
      expect(message).toContain('disabled');
    });

    it('should ignore delayed rejection if new tokenization already started on same instance', async () => {
      let rejectDelayed: ((error: Error) => void) | null = null;
      let tokenizeCount = 0;
      let delayedPromiseCreated = false;

      const traceCallback: TraceCallback = (_event: TraceEvent) => {
        // Only create the pending promise on the FIRST event of the FIRST tokenization
        if (tokenizeCount === 1 && !delayedPromiseCreated) {
          delayedPromiseCreated = true;
          // First call: return Promise that will reject later
          return new Promise<void>((_resolve, reject) => {
            rejectDelayed = reject;
          });
        }
        // Subsequent calls: work normally
        return undefined;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // First tokenization (session 1)
      tokenizeCount = 1;
      lexer.tokenize();

      // Second tokenization on SAME instance (session 2)
      tokenizeCount = 2;
      lexer.tokenize();

      // Now reject the delayed Promise from session 1
      rejectDelayed!(new Error('Stale delayed rejection'));
      await Promise.resolve();

      // Session ID tracking: rejection from session 1 should be ignored
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
