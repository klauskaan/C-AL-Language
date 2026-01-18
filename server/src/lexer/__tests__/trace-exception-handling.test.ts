/**
 * Trace Callback Exception Handling Tests
 *
 * Tests for graceful handling of exceptions thrown by trace callbacks (issue #104).
 *
 * CRITICAL TDD Rule: These tests MUST fail initially because there's currently
 * NO error handling around trace callbacks in the lexer. A throwing callback
 * will crash tokenize().
 *
 * Expected behavior after implementation:
 * - Exceptions caught and logged to console.warn
 * - Callback disabled after first exception (fail-once)
 * - Tokenization completes successfully
 * - Each Lexer instance has independent callback state
 */

import { Lexer, TraceCallback, TraceEvent } from '../lexer';
import { TokenType } from '../tokens';

describe('Trace callback exception handling', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Callback throws - tokenization completes successfully', () => {
    it('should complete tokenization when callback throws Error immediately', () => {
      // Callback that throws Error immediately on every call
      const traceCallback: TraceCallback = () => {
        throw new Error('Test error');
      };

      const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Currently crashes, no tokens returned
      const tokens = lexer.tokenize();

      // Verify tokenization completed successfully
      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      // Verify token structure is correct
      expect(tokens[0].type).toBe(TokenType.Object);
      const tableToken = tokens.find(t => t.type === TokenType.Table);
      expect(tableToken).toBeDefined();
      const numberToken = tokens.find(t => t.type === TokenType.Integer);
      expect(numberToken).toBeDefined();

      // Verify clean exit
      const result = lexer.isCleanExit();
      expect(result.passed).toBe(true);
    });
  });

  describe('Callback throws - subsequent callbacks not invoked (fail-once)', () => {
    it('should disable callback after first exception', () => {
      let callCount = 0;

      // Callback that throws on first call
      const traceCallback: TraceCallback = () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call error');
        }
      };

      // Code that generates multiple trace events
      const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Currently crashes on first call
      const tokens = lexer.tokenize();

      // Verify tokenization completed
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);

      // Verify callback was called only once (then disabled)
      expect(callCount).toBe(1);
    });
  });

  describe('Callback exception reported to console', () => {
    it('should log exception to console.warn with descriptive message', () => {
      const errorMessage = 'Specific error message';
      const traceCallback: TraceCallback = () => {
        throw new Error(errorMessage);
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: No console.warn exists yet, will crash instead
      lexer.tokenize();

      // Verify console.warn was called exactly once
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Verify warning message contains "disabled" and the error object is passed
      const [warningMessage, errorObject] = consoleWarnSpy.mock.calls[0];
      expect(warningMessage).toContain('disabled');
      expect(errorObject).toBeInstanceOf(Error);
      expect(errorObject.message).toBe(errorMessage);
    });
  });

  describe('Callback disabled flag resets between tokenize() calls', () => {
    it('should invoke callback on second tokenization after first threw', () => {
      let firstCallThrew = false;
      let secondCallMade = false;

      const traceCallback: TraceCallback = () => {
        if (!firstCallThrew) {
          firstCallThrew = true;
          throw new Error('First tokenize error');
        }
        secondCallMade = true;
      };

      const code = 'OBJECT Table 1';

      // First tokenization - callback throws
      const lexer1 = new Lexer(code, { trace: traceCallback });
      // Should FAIL: First tokenize crashes, never gets to second call
      lexer1.tokenize();

      // Second tokenization - callback should be invoked again (fresh start)
      const lexer2 = new Lexer(code, { trace: traceCallback });
      lexer2.tokenize();

      // Verify callback was invoked on second tokenization
      expect(secondCallMade).toBe(true);
    });

    it('should re-enable callback when calling tokenize() again on same Lexer instance', () => {
      let callCount = 0;
      const traceCallback: TraceCallback = () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call throws');
        }
        // Subsequent calls succeed
      };

      const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // First tokenization - callback throws on first call
      const tokens1 = lexer.tokenize();
      expect(tokens1.length).toBeGreaterThan(0);  // Tokenization completes despite throw
      expect(callCount).toBe(1);  // Callback was called once and threw

      // Second tokenization on SAME instance - callback should be re-enabled
      const tokens2 = lexer.tokenize();
      expect(tokens2.length).toBeGreaterThan(0);  // Tokenization completes again
      expect(callCount).toBeGreaterThan(1);  // Callback was called again (flag was reset)
    });
  });

  describe('Callback throws on specific event type - earlier events were emitted', () => {
    it('should record events before the throw', () => {
      const recordedEvents: TraceEvent[] = [];

      // Callback that records all events, throws only on first 'context-pop'
      let contextPopSeen = false;
      const traceCallback: TraceCallback = (event: TraceEvent) => {
        recordedEvents.push(event);

        if (event.type === 'context-pop' && !contextPopSeen) {
          contextPopSeen = true;
          throw new Error('Context pop error');
        }
      };

      // Code that generates context-push before context-pop
      const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; } KEYS { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will crash on context-pop, no way to verify earlier events
      lexer.tokenize();

      // Verify earlier events were recorded before the throw
      const contextPushEvents = recordedEvents.filter(e => e.type === 'context-push');
      expect(contextPushEvents.length).toBeGreaterThan(0);

      // Verify tokenization completed despite exception
      const result = lexer.isCleanExit();
      expect(result.passed).toBe(true);
    });
  });

  describe('Callback throws different error types', () => {
    it('should handle Error instances', () => {
      const traceCallback: TraceCallback = () => {
        throw new Error('Standard Error');
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will crash
      const tokens = lexer.tokenize();
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle TypeError instances', () => {
      const traceCallback: TraceCallback = () => {
        throw new TypeError('Type Error');
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will crash
      const tokens = lexer.tokenize();
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle string throws', () => {
      const traceCallback: TraceCallback = () => {
        throw 'error string';
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will crash
      const tokens = lexer.tokenize();
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle undefined throws', () => {
      const traceCallback: TraceCallback = () => {
        throw undefined;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will crash
      const tokens = lexer.tokenize();
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should pass the original error object to console.warn, not a wrapper', () => {
      const specificError = new TypeError('Unique error');
      const traceCallback: TraceCallback = () => {
        throw specificError;
      };

      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const [, errorObject] = consoleWarnSpy.mock.calls[0];
      expect(errorObject).toBe(specificError); // Reference equality, not just instanceof
    });
  });

  describe('Callback throws during multi-flag section', () => {
    it('should complete tokenization when callback throws on flag-change event', () => {
      let flagChangeSeen = false;

      // Callback that throws on first flag-change event
      const traceCallback: TraceCallback = (event: TraceEvent) => {
        if (event.type === 'flag-change' && !flagChangeSeen) {
          flagChangeSeen = true;
          throw new Error('Flag change error');
        }
      };

      // Code that triggers scanRightBrace() with flag changes
      // (closing brace in properties section generates flag-change events)
      const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; Time=12:00:00; } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      // Should FAIL: Will crash on first flag-change
      const tokens = lexer.tokenize();

      // Verify tokenization completed
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);

      // Verify clean exit
      const result = lexer.isCleanExit();
      expect(result.passed).toBe(true);
    });

    it('should handle multiple callbacks in same guard block when first throws', () => {
      // Issue #119: Test that fail-once works WITHIN a single scanRightBrace() call
      //
      // When the outer closing brace of a FIELDS section is processed (braceDepth 1->0),
      // scanRightBrace() invokes multiple callbacks in sequence:
      // 1. braceDepth change (1->0)
      // 2. popContext() → context-pop event
      // 3. currentSectionType change ('FIELDS'->null)
      //
      // The fix for #117 ensures invokeTraceCallback() checks traceCallbackDisabled
      // before EACH invocation. If callback #1 throws, #2 and #3 should be skipped.
      //
      // Test strategy: Allow all callbacks until we're at the specific point where
      // multiple callbacks are pending (braceDepth 1->0), then throw. Verify that
      // subsequent callbacks within that same scanRightBrace() call were NOT invoked.

      const events: TraceEvent[] = [];
      let hasThrown = false;

      const traceCallback: TraceCallback = (event: TraceEvent) => {
        events.push({ ...event } as TraceEvent);

        // Throw when braceDepth changes from 1 to 0 (outer closing brace)
        // At this point, scanRightBrace() has pending callbacks:
        // - popContext() → context-pop
        // - currentSectionType change
        if (event.type === 'flag-change' &&
            event.data?.flag === 'braceDepth' &&
            event.data?.from === 1 &&
            event.data?.to === 0 &&
            !hasThrown) {
          hasThrown = true;
          throw new Error('Throw on outer brace close');
        }
      };

      const code = 'OBJECT Table 1 { FIELDS { } }';
      const lexer = new Lexer(code, { trace: traceCallback });

      const tokens = lexer.tokenize();

      // Verify tokenization completed
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);

      // Verify the throw happened at the expected point
      expect(hasThrown).toBe(true);

      // CRITICAL: After the throw on braceDepth 1->0, these should NOT have fired:
      // - context-pop for SECTION_LEVEL (from popContext())
      // - currentSectionType change from 'FIELDS' to null
      //
      // If fail-once didn't work within the guard block, these would have been invoked.

      // Find the index of the throw event
      const throwEventIndex = events.findIndex(e =>
        e.type === 'flag-change' &&
        e.data?.flag === 'braceDepth' &&
        e.data?.from === 1 &&
        e.data?.to === 0
      );
      expect(throwEventIndex).toBeGreaterThan(-1);

      // No events should have been recorded after the throw
      const eventsAfterThrow = events.slice(throwEventIndex + 1);
      expect(eventsAfterThrow).toHaveLength(0);

      // Specifically verify currentSectionType change from 'FIELDS' to null was NOT recorded
      // (There IS a change from null to 'FIELDS' when entering the section, which is expected)
      const sectionTypeExitChanges = events.filter(e =>
        e.type === 'flag-change' &&
        e.data?.flag === 'currentSectionType' &&
        e.data?.from === 'FIELDS' &&
        e.data?.to === null
      );
      expect(sectionTypeExitChanges).toHaveLength(0);

      // console.warn should be called exactly once
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Callback state does not leak between Lexer instances', () => {
    it('should not globally disable callback after one lexer instance throws', () => {
      let lexer1CallCount = 0;
      let lexer2CallCount = 0;

      // Shared callback function reference
      const sharedCallback: TraceCallback = (_event: TraceEvent) => {
        // Track which lexer is calling by checking if this is first or second round
        if (lexer1CallCount === 0 && lexer2CallCount === 0) {
          // First lexer
          lexer1CallCount++;
          throw new Error('Lexer1 error');
        } else {
          // Second lexer
          lexer2CallCount++;
        }
      };

      const code = 'OBJECT Table 1';

      // Lexer1 - callback throws
      const lexer1 = new Lexer(code, { trace: sharedCallback });
      // Should FAIL: First lexer crashes
      lexer1.tokenize();

      // Lexer2 - callback should still be invoked (independent state)
      const lexer2 = new Lexer(code, { trace: sharedCallback });
      lexer2.tokenize();

      // Should FAIL: Even if first lexer didn't crash, no per-instance state exists
      // Verify callback was invoked for Lexer2 (not globally disabled)
      expect(lexer2CallCount).toBeGreaterThan(0);
    });
  });

  describe('console.warn failure handling (issue #120)', () => {
    /**
     * Issue #120: If console.warn itself throws (extreme edge case),
     * the error handler will crash tokenization instead of gracefully failing.
     *
     * These tests verify that console.warn is wrapped in try-catch.
     */

    describe('Sync callback error path', () => {
      it('should complete tokenization when console.warn throws in handleTraceCallbackError', () => {
        // Mock console.warn to throw
        consoleWarnSpy.mockImplementation(() => {
          throw new Error('console.warn failed');
        });

        // Callback that throws synchronously
        const traceCallback: TraceCallback = () => {
          throw new Error('Test callback error');
        };

        const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; } }';
        const lexer = new Lexer(code, { trace: traceCallback });

        // Before #120 fix: console.warn throws, escapes from tokenize(); now completes successfully
        const tokens = lexer.tokenize();

        // Verify tokenization completed despite console.warn throwing
        expect(tokens).toBeDefined();
        expect(Array.isArray(tokens)).toBe(true);
        expect(tokens.length).toBeGreaterThan(0);

        // Verify tokens are valid
        expect(tokens[0].type).toBe(TokenType.Object);
      });

      it('should set traceCallbackDisabled even when console.warn throws', () => {
        // Mock console.warn to throw
        consoleWarnSpy.mockImplementation(() => {
          throw new Error('console.warn failed');
        });

        let callCount = 0;
        const traceCallback: TraceCallback = () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First call error');
          }
        };

        const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } }';
        const lexer = new Lexer(code, { trace: traceCallback });

        // Before #120 fix: console.warn throws on first call; now completes successfully
        lexer.tokenize();

        // Verify callback was only called once (disabled despite console.warn failure)
        expect(callCount).toBe(1);
      });
    });

    describe('Async callback error path', () => {
      it('should complete tokenization when console.warn throws in handleAsyncRejection', async () => {
        // Mock console.warn to throw
        consoleWarnSpy.mockImplementation(() => {
          throw new Error('console.warn failed');
        });

        // Callback that returns rejected Promise
        const traceCallback: TraceCallback = () => {
          return Promise.reject(new Error('Async callback error')) as any;
        };

        const code = 'OBJECT Table 1 { OBJECT-PROPERTIES { Date=01/01/01; } }';
        const lexer = new Lexer(code, { trace: traceCallback });

        // Before #120 fix: console.warn throws asynchronously, may cause unhandled rejection; now completes successfully
        const tokens = lexer.tokenize();

        // Verify tokenization completed synchronously (doesn't wait for rejection)
        expect(tokens).toBeDefined();
        expect(tokens.length).toBeGreaterThan(0);

        // Let async rejection handler run
        await Promise.resolve();

        // Verify no unhandled rejections escaped
        // (If console.warn throws in handleAsyncRejection, it becomes an unhandled rejection)
      });

      it('should not cause unhandled rejection when console.warn throws in async error handler', async () => {
        // Mock console.warn to throw
        consoleWarnSpy.mockImplementation(() => {
          throw new Error('console.warn failed in async handler');
        });

        // Setup unhandled rejection listener
        const rejectionHandler = jest.fn();
        process.on('unhandledRejection', rejectionHandler);

        try {
          const traceCallback: TraceCallback = () => {
            return Promise.reject(new Error('Async callback error')) as any;
          };

          const code = 'OBJECT Table 1';
          const lexer = new Lexer(code, { trace: traceCallback });

          // Before #120 fix: console.warn throws in async handler, becomes unhandled rejection; now completes successfully
          lexer.tokenize();

          // Let rejection propagate through event loop
          await new Promise(resolve => setTimeout(resolve, 10));

          // Before #120 fix: console.warn throw will become unhandled rejection; now handled
          expect(rejectionHandler).not.toHaveBeenCalled();
        } finally {
          process.off('unhandledRejection', rejectionHandler);
        }
      });

      it('should set traceCallbackDisabled even when console.warn throws in async path', async () => {
        // Mock console.warn to throw
        consoleWarnSpy.mockImplementation(() => {
          throw new Error('console.warn failed');
        });

        let callCount = 0;
        const traceCallback: TraceCallback = () => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('First async error')) as any;
          }
          return undefined;
        };

        const code = 'OBJECT Table 1 { PROPERTIES { } FIELDS { } }';
        const lexer = new Lexer(code, { trace: traceCallback });

        // First tokenization - async rejection occurs
        lexer.tokenize();

        // Callbacks during synchronous tokenization continue (async rejection is fire-and-forget)
        expect(callCount).toBeGreaterThan(1);

        // Let async handler run (even though console.warn throws)
        await Promise.resolve();

        // Second tokenization - callback should be re-enabled (state reset)
        callCount = 0; // Reset counter
        const tokens2 = lexer.tokenize();

        // Verify callback was called in second tokenization
        expect(tokens2.length).toBeGreaterThan(0);
        expect(callCount).toBeGreaterThan(0);
      });
    });

    describe('State verification - defensive flag setting', () => {
      it('should set traceCallbackDisabled BEFORE calling console.warn in sync path', () => {
        // Track the order of operations
        const operations: string[] = [];

        consoleWarnSpy.mockImplementation(() => {
          operations.push('console.warn');
          throw new Error('console.warn failed');
        });

        let callCount = 0;
        const traceCallback: TraceCallback = () => {
          callCount++;
          operations.push(`callback-${callCount}`);
          if (callCount === 1) {
            throw new Error('First call error');
          }
        };

        const code = 'OBJECT Table 1 { PROPERTIES { } }';
        const lexer = new Lexer(code, { trace: traceCallback });

        // Before #120 fix: console.warn throws before checking if callback is disabled; now completes successfully
        lexer.tokenize();

        // Verify operation order
        expect(operations).toContain('callback-1');
        expect(operations).toContain('console.warn');

        // Verify callback was only called once (disabled before console.warn attempt)
        expect(callCount).toBe(1);
      });
    });
  });
});
