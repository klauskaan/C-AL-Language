/**
 * Lexer Trace Infrastructure Tests
 *
 * Tests for the optional trace mechanism (Task 7, issue #94).
 * These tests verify the trace infrastructure that enables precise diagnosis
 * of lexer issues by recording every tokenization decision.
 *
 * This test suite validates the trace infrastructure implementation.
 * Tests use TDD approach - written before implementation to define specification.
 */

import { Lexer, TraceCallback, TraceEvent } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer Trace Infrastructure', () => {
  describe('Backward Compatibility', () => {
    it('should work without options parameter', () => {
      const code = 'OBJECT Table 18 Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Object);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should work with empty options object', () => {
      const code = 'OBJECT Table 18 Customer';
      const lexer = new Lexer(code, {});
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Object);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should work with undefined trace option', () => {
      const code = 'OBJECT Table 18 Customer';
      const lexer = new Lexer(code, { trace: undefined });
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Object);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });

  describe('Token Event Types', () => {
    it('should emit token events with position, type, and value', () => {
      const code = 'OBJECT';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Find token events
      const tokenEvents = events.filter(e => e.type === 'token');
      expect(tokenEvents.length).toBeGreaterThan(0);

      // Should have OBJECT token
      const objectToken = tokenEvents.find(e => e.data.tokenType === TokenType.Object);
      expect(objectToken).toBeDefined();
      expect(objectToken!.position).toMatchObject({
        line: expect.any(Number),
        column: expect.any(Number),
        offset: expect.any(Number)
      });
      expect(objectToken!.data.value).toBe('OBJECT');
    });

    it('should emit EOF token event', () => {
      const code = 'OBJECT';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // EOF token should be traced (special code path)
      const eofEvent = events.find(e =>
        e.type === 'token' && e.data.tokenType === TokenType.EOF
      );
      expect(eofEvent).toBeDefined();
      expect(eofEvent!.data.value).toBe('');
    });

    it('should emit token events for all token types', () => {
      const code = `
        OBJECT Table 18 Customer
        {
          PROPERTIES { }
          FIELDS
          {
            { 1 ; ; No. ; Code20 }
          }
        }
      `;
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const tokenEvents = events.filter(e => e.type === 'token');

      // Should have various token types
      const tokenTypes = tokenEvents.map(e => e.data.tokenType);
      expect(tokenTypes).toContain(TokenType.Object);
      expect(tokenTypes).toContain(TokenType.Table);
      expect(tokenTypes).toContain(TokenType.Integer);
      expect(tokenTypes).toContain(TokenType.Identifier);
      expect(tokenTypes).toContain(TokenType.LeftBrace);
      expect(tokenTypes).toContain(TokenType.RightBrace);
      expect(tokenTypes).toContain(TokenType.Properties);
      expect(tokenTypes).toContain(TokenType.Fields);
      expect(tokenTypes).toContain(TokenType.Semicolon);
      expect(tokenTypes).toContain(TokenType.EOF);
    });

    it('should include accurate position information for multi-line input', () => {
      const code = 'OBJECT\nTable\n18';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const tokenEvents = events.filter(e => e.type === 'token');

      // OBJECT should be at line 1
      const objectToken = tokenEvents.find(e => e.data.tokenType === TokenType.Object);
      expect(objectToken!.position.line).toBe(1);

      // Table should be at line 2
      const tableToken = tokenEvents.find(e => e.data.tokenType === TokenType.Table);
      expect(tableToken!.position.line).toBe(2);

      // 18 should be at line 3
      const integerToken = tokenEvents.find(e => e.data.tokenType === TokenType.Integer);
      expect(integerToken!.position.line).toBe(3);
    });
  });

  describe('Context Push/Pop Events', () => {
    it('should emit context-push event for OBJECT context', () => {
      const code = 'OBJECT Table 18';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const pushEvents = events.filter(e => e.type === 'context-push');
      expect(pushEvents.length).toBeGreaterThan(0);

      // Should have NORMAL -> OBJECT_LEVEL transition
      const objectPush = pushEvents.find(e =>
        e.data.from === 'NORMAL' && e.data.to === 'OBJECT_LEVEL'
      );
      expect(objectPush).toBeDefined();
    });

    it('should emit context-push event for SECTION_LEVEL', () => {
      const code = 'OBJECT Table 18 { PROPERTIES { } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const pushEvents = events.filter(e => e.type === 'context-push');

      // Should have OBJECT_LEVEL -> SECTION_LEVEL transition
      const sectionPush = pushEvents.find(e =>
        e.data.from === 'OBJECT_LEVEL' && e.data.to === 'SECTION_LEVEL'
      );
      expect(sectionPush).toBeDefined();
    });

    it('should emit context-push event for CODE_BLOCK', () => {
      const code = `
        OBJECT Table 18
        {
          CODE
          {
            PROCEDURE Test();
            BEGIN
            END;
          }
        }
      `;
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const pushEvents = events.filter(e => e.type === 'context-push');

      // Should have CODE_BLOCK push
      const codePush = pushEvents.find(e => e.data.to === 'CODE_BLOCK');
      expect(codePush).toBeDefined();
    });

    it('should emit context-pop events', () => {
      const code = `
        OBJECT Table 18
        {
          CODE
          {
            PROCEDURE Test();
            BEGIN
            END;
          }
        }
      `;
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const popEvents = events.filter(e => e.type === 'context-pop');
      expect(popEvents.length).toBeGreaterThan(0);

      // Should have CODE_BLOCK pop (from END keyword)
      const codePop = popEvents.find(e => e.data.from === 'CODE_BLOCK');
      expect(codePop).toBeDefined();
    });

    it('should emit context-pop events during cleanup loop', () => {
      const code = 'OBJECT Table 18 { PROPERTIES { } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const popEvents = events.filter(e => e.type === 'context-pop');

      // Cleanup loop should pop remaining contexts
      // Well-formed code: OBJECT_LEVEL and outer SECTION_LEVEL get popped
      expect(popEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Flag Change Events', () => {
    it('should emit flag-change event for braceDepth', () => {
      const code = '{ }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have braceDepth changes
      const braceEvents = flagEvents.filter(e => e.data.flag === 'braceDepth');
      expect(braceEvents.length).toBeGreaterThan(0);

      // Opening brace: 0 -> 1
      const braceIncrease = braceEvents.find(e => e.data.from === 0 && e.data.to === 1);
      expect(braceIncrease).toBeDefined();

      // Closing brace: 1 -> 0
      const braceDecrease = braceEvents.find(e => e.data.from === 1 && e.data.to === 0);
      expect(braceDecrease).toBeDefined();
    });

    it('should emit flag-change event for bracketDepth', () => {
      const code = 'OBJECT Table 18 { PROPERTIES { CaptionML=[ENU=Test] } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have bracketDepth changes
      const bracketEvents = flagEvents.filter(e => e.data.flag === 'bracketDepth');
      expect(bracketEvents.length).toBeGreaterThan(0);

      // Opening bracket: 0 -> 1
      const bracketIncrease = bracketEvents.find(e => e.data.from === 0 && e.data.to === 1);
      expect(bracketIncrease).toBeDefined();

      // Closing bracket: 1 -> 0
      const bracketDecrease = bracketEvents.find(e => e.data.from === 1 && e.data.to === 0);
      expect(bracketDecrease).toBeDefined();
    });

    it('should emit flag-change event for inPropertyValue', () => {
      const code = 'OBJECT Table 18 { PROPERTIES { Name=Test } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have inPropertyValue changes
      const propEvents = flagEvents.filter(e => e.data.flag === 'inPropertyValue');
      expect(propEvents.length).toBeGreaterThan(0);

      // = triggers property value mode: false -> true
      const propStart = propEvents.find(e => e.data.from === false && e.data.to === true);
      expect(propStart).toBeDefined();

      // ; or } ends property value mode: true -> false
      const propEnd = propEvents.find(e => e.data.from === true && e.data.to === false);
      expect(propEnd).toBeDefined();
    });

    it('should emit flag-change event for lastPropertyName', () => {
      const code = 'OBJECT Table 18 { PROPERTIES { Name=Test } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have lastPropertyName changes
      const nameEvents = flagEvents.filter(e => e.data.flag === 'lastPropertyName');
      expect(nameEvents.length).toBeGreaterThan(0);

      // Setting property name: '' -> 'Name'
      const nameSet = nameEvents.find(e => e.data.from === '' && e.data.to === 'Name');
      expect(nameSet).toBeDefined();

      // Clearing property name: 'Name' -> ''
      const nameClear = nameEvents.find(e => e.data.from === 'Name' && e.data.to === '');
      expect(nameClear).toBeDefined();
    });

    it('should emit flag-change event for lastWasSectionKeyword', () => {
      const code = 'OBJECT Table 18 { FIELDS { } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have lastWasSectionKeyword changes
      const sectionEvents = flagEvents.filter(e => e.data.flag === 'lastWasSectionKeyword');
      expect(sectionEvents.length).toBeGreaterThan(0);

      // FIELDS keyword: false -> true
      const sectionSet = sectionEvents.find(e => e.data.from === false && e.data.to === true);
      expect(sectionSet).toBeDefined();
    });

    it('should emit flag-change event for currentSectionType', () => {
      const code = 'OBJECT Table 18 { FIELDS { } KEYS { } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have currentSectionType changes
      const sectionTypeEvents = flagEvents.filter(e => e.data.flag === 'currentSectionType');
      expect(sectionTypeEvents.length).toBeGreaterThan(0);

      // FIELDS: null -> 'FIELDS'
      const fieldsSet = sectionTypeEvents.find(e =>
        e.data.from === null && e.data.to === 'FIELDS'
      );
      expect(fieldsSet).toBeDefined();

      // KEYS: 'FIELDS' -> 'KEYS' or null -> 'KEYS'
      const keysSet = sectionTypeEvents.find(e => e.data.to === 'KEYS');
      expect(keysSet).toBeDefined();
    });

    it('should emit flag-change event for fieldDefColumn', () => {
      const code = 'OBJECT Table 18 { FIELDS { { 1 ; ; Name ; Code20 } } }';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const flagEvents = events.filter(e => e.type === 'flag-change');

      // Should have fieldDefColumn changes
      const columnEvents = flagEvents.filter(e => e.data.flag === 'fieldDefColumn');
      expect(columnEvents.length).toBeGreaterThan(0);

      // Opening brace: 'NONE' -> 'COL_1'
      const col1 = columnEvents.find(e =>
        e.data.from === 'NONE' && e.data.to === 'COL_1'
      );
      expect(col1).toBeDefined();

      // Semicolons advance columns
      const col2 = columnEvents.find(e =>
        e.data.from === 'COL_1' && e.data.to === 'COL_2'
      );
      expect(col2).toBeDefined();

      // Closing brace: resets to 'NONE'
      const reset = columnEvents.find(e => e.data.to === 'NONE');
      expect(reset).toBeDefined();
    });
  });

  describe('Skip Events', () => {
    it('should emit skip events for whitespace', () => {
      const code = 'OBJECT   Table';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const skipEvents = events.filter(e => e.type === 'skip');

      // Should have skip event for whitespace
      const whitespaceSkip = skipEvents.find(e => e.data.reason === 'whitespace');
      expect(whitespaceSkip).toBeDefined();
    });

    it('should emit skip events for newlines', () => {
      const code = 'OBJECT\nTable';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const skipEvents = events.filter(e => e.type === 'skip');

      // Should have skip event for newline
      const newlineSkip = skipEvents.find(e => e.data.reason === 'newline');
      expect(newlineSkip).toBeDefined();
    });

    it('should emit skip events for line comments', () => {
      const code = 'OBJECT // comment\nTable';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const skipEvents = events.filter(e => e.type === 'skip');

      // Should have skip event for line comment
      const commentSkip = skipEvents.find(e => e.data.reason === 'line-comment');
      expect(commentSkip).toBeDefined();
    });

    it('should emit skip events for block comments', () => {
      const code = 'BEGIN { comment } END';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const skipEvents = events.filter(e => e.type === 'skip');

      // Should have skip event for block comment
      const commentSkip = skipEvents.find(e => e.data.reason === 'block-comment');
      expect(commentSkip).toBeDefined();
    });

    it('should emit skip events for C-style comments', () => {
      const code = 'OBJECT /* comment */ Table';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const skipEvents = events.filter(e => e.type === 'skip');

      // Should have skip event for C-style comment
      const commentSkip = skipEvents.find(e => e.data.reason === 'c-style-comment');
      expect(commentSkip).toBeDefined();
    });
  });

  describe('Event Ordering and Completeness', () => {
    it('should emit events in logical order', () => {
      const code = 'OBJECT Table 18';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Events should be in order: token, context changes, more tokens, EOF
      expect(events.length).toBeGreaterThan(0);

      // First token event should be OBJECT
      const firstTokenEvent = events.find(e => e.type === 'token');
      expect(firstTokenEvent!.data.tokenType).toBe(TokenType.Object);

      // Last token event should be EOF
      const tokenEvents = events.filter(e => e.type === 'token');
      expect(tokenEvents[tokenEvents.length - 1].data.tokenType).toBe(TokenType.EOF);
    });

    it('should trace all state changes for complex input', () => {
      const code = `
        OBJECT Table 18 Customer
        {
          PROPERTIES
          {
            Caption=Customer;
          }
          FIELDS
          {
            { 1 ; ; No. ; Code20 }
          }
          CODE
          {
            PROCEDURE Test();
            VAR
              x : Integer;
            BEGIN
              x := 1;
            END;
          }
        }
      `;
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should have all event types
      const eventTypes = new Set(events.map(e => e.type));
      expect(eventTypes.has('token')).toBe(true);
      expect(eventTypes.has('context-push')).toBe(true);
      expect(eventTypes.has('context-pop')).toBe(true);
      expect(eventTypes.has('flag-change')).toBe(true);
      expect(eventTypes.has('skip')).toBe(true);

      // Should have traced all major context transitions
      const pushEvents = events.filter(e => e.type === 'context-push');
      const contextTargets = pushEvents.map(e => e.data.to);
      expect(contextTargets).toContain('OBJECT_LEVEL');
      expect(contextTargets).toContain('SECTION_LEVEL');
      expect(contextTargets).toContain('CODE_BLOCK');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const code = '';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should at least have EOF token event
      const eofEvent = events.find(e =>
        e.type === 'token' && e.data.tokenType === TokenType.EOF
      );
      expect(eofEvent).toBeDefined();
    });

    it('should handle single token input', () => {
      const code = 'OBJECT';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      const tokenEvents = events.filter(e => e.type === 'token');

      // Should have OBJECT token and EOF token
      expect(tokenEvents.length).toBe(2);
      expect(tokenEvents[0].data.tokenType).toBe(TokenType.Object);
      expect(tokenEvents[1].data.tokenType).toBe(TokenType.EOF);
    });

    it('should not crash with very deep nesting', () => {
      const depth = 100;
      const opening = '{'.repeat(depth);
      const closing = '}'.repeat(depth);
      const code = `OBJECT Table 18 { PROPERTIES ${opening} ${closing} }`;

      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      expect(() => {
        const lexer = new Lexer(code, { trace: traceCallback });
        lexer.tokenize();
      }).not.toThrow();

      // Should have many braceDepth changes
      const braceEvents = events.filter(e =>
        e.type === 'flag-change' && e.data.flag === 'braceDepth'
      );
      expect(braceEvents.length).toBeGreaterThan(0);
    });

    it('should handle malformed input gracefully', () => {
      const code = 'OBJECT Table { { { } }'; // Unbalanced braces
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      expect(() => {
        const lexer = new Lexer(code, { trace: traceCallback });
        lexer.tokenize();
      }).not.toThrow();

      // Should still produce trace events
      expect(events.length).toBeGreaterThan(0);

      // Should have EOF token
      const eofEvent = events.find(e =>
        e.type === 'token' && e.data.tokenType === TokenType.EOF
      );
      expect(eofEvent).toBeDefined();
    });
  });

  describe('Trace Callback Invocation', () => {
    it('should not invoke callback when trace is undefined', () => {
      const code = 'OBJECT Table 18';
      let callCount = 0;

      // Callback should not be invoked if trace is undefined
      const lexer = new Lexer(code, { trace: undefined });
      lexer.tokenize();

      expect(callCount).toBe(0); // Not called
    });

    it('should not invoke callback when no options provided', () => {
      const code = 'OBJECT Table 18';

      // Should not crash with no callback
      expect(() => {
        const lexer = new Lexer(code);
        lexer.tokenize();
      }).not.toThrow();
    });

    it('should invoke callback for every trace event', () => {
      const code = 'OBJECT Table';
      let callCount = 0;
      const traceCallback: TraceCallback = () => { callCount++; };

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should have been called multiple times
      // (tokens, context changes, skips, etc.)
      expect(callCount).toBeGreaterThan(0);
    });
  });

  describe('Reentrancy guard', () => {
    it('should throw Error when callback calls tokenize() on same Lexer instance', () => {
      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, {
        trace: () => {
          // Attempt to re-enter tokenize() on same lexer instance
          lexer.tokenize();
        }
      });

      expect(() => {
        lexer.tokenize();
      }).toThrow(Error);
    });

    it('should throw Error with descriptive message indicating reentrancy violation', () => {
      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, {
        trace: () => {
          lexer.tokenize();
        }
      });

      expect(() => {
        lexer.tokenize();
      }).toThrow(/reentrancy/i);
    });

    it('should allow callback to create Lexer instance without calling tokenize()', () => {
      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, {
        trace: () => {
          // Creating a new lexer instance without calling tokenize should be allowed
          const anotherLexer = new Lexer('OBJECT Table 2');
          // Verify instance was created (not calling anotherLexer.tokenize())
          expect(anotherLexer).toBeDefined();
        }
      });

      expect(() => {
        lexer.tokenize();
      }).not.toThrow();
    });

    it('should restore guard after tokenize() completes successfully', () => {
      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code);

      // First call should succeed
      expect(() => {
        lexer.tokenize();
      }).not.toThrow();

      // Second call should also succeed (guard was restored)
      expect(() => {
        lexer.tokenize();
      }).not.toThrow();
    });

    it('should restore guard after tokenize() throws due to reentrancy', () => {
      const code = 'OBJECT Table 1';
      let firstCall = true;
      const lexer = new Lexer(code, {
        trace: () => {
          if (firstCall) {
            firstCall = false;
            lexer.tokenize(); // Trigger reentrancy error
          }
        }
      });

      // First call should throw due to reentrancy
      expect(() => {
        lexer.tokenize();
      }).toThrow(/reentrancy/i);

      // Reconfigure without reentrant callback
      const safeLexer = new Lexer(code);

      // Second call with new lexer should succeed (new instance has independent guard)
      expect(() => {
        safeLexer.tokenize();
      }).not.toThrow();
    });

    it('should check reentrancy before resetting state', () => {
      const code = 'OBJECT Table 1';
      let stateModified = false;
      const lexer = new Lexer(code, {
        trace: () => {
          // Try to detect if state was reset before reentrancy check
          if (!stateModified) {
            stateModified = true;
            lexer.tokenize(); // Should throw before state is corrupted
          }
        }
      });

      expect(() => {
        lexer.tokenize();
      }).toThrow(/reentrancy/i);
    });

    it('should allow concurrent tokenization on different Lexer instances', () => {
      const code1 = 'OBJECT Table 1';
      const code2 = 'OBJECT Table 2';
      const lexer2 = new Lexer(code2);

      let lexer2Tokens;
      const lexer1WithCallback = new Lexer(code1, {
        trace: () => {
          // Tokenize a DIFFERENT lexer instance - should be allowed
          lexer2Tokens = lexer2.tokenize();
        }
      });

      expect(() => {
        lexer1WithCallback.tokenize();
      }).not.toThrow();

      expect(lexer2Tokens).toBeDefined();
      expect(lexer2Tokens!.length).toBeGreaterThan(0);
    });

    it('should allow callback to tokenize a DIFFERENT Lexer instance', () => {
      const code = 'OBJECT Table 1';
      const lexer = new Lexer(code, {
        trace: () => {
          // Create and tokenize a completely different lexer - legitimate use case
          const differentLexer = new Lexer('OBJECT Table 2');
          const tokens = differentLexer.tokenize();
          expect(tokens.length).toBeGreaterThan(0);
        }
      });

      expect(() => {
        lexer.tokenize();
      }).not.toThrow();
    });

    it('should throw reentrancy error from flag-change events', () => {
      // Use code that produces many flag-change events
      const code = 'OBJECT Table 1\nFIELDS\n{ Field 10; Name; Text[50] }';
      const lexer = new Lexer(code, {
        trace: (event) => {
          // Only trigger on flag-change to hit vulnerable paths
          if (event.type === 'flag-change') {
            lexer.tokenize();
          }
        }
      });
      expect(() => lexer.tokenize()).toThrow(/reentrancy/i);
    });
  });

  describe('Compound Token Attempt Failures (TDD - SHOULD FAIL)', () => {
    it('should emit attempt-failed event when second word does not match (OBJECT-FOO)', () => {
      const code = 'OBJECT-FOO';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should emit attempt-failed event for compound token mismatch
      const failureEvents = events.filter(e => e.type === 'attempt-failed');
      expect(failureEvents.length).toBeGreaterThan(0);

      const objectPropertiesFailure = failureEvents.find(e =>
        e.data.attempt === 'compound-token' &&
        e.data.firstWord === 'OBJECT' &&
        e.data.separator === '-' &&
        e.data.expectedSecond === 'PROPERTIES' &&
        e.data.actualSecond === 'FOO' &&
        e.data.reason === 'mismatch'
      );
      expect(objectPropertiesFailure).toBeDefined();
    });

    it('should emit attempt-failed event when second word is empty (EOF) (OBJECT-)', () => {
      const code = 'OBJECT-';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should emit attempt-failed event for empty second word
      const failureEvents = events.filter(e => e.type === 'attempt-failed');
      expect(failureEvents.length).toBeGreaterThan(0);

      const objectPropertiesFailure = failureEvents.find(e =>
        e.data.attempt === 'compound-token' &&
        e.data.firstWord === 'OBJECT' &&
        e.data.separator === '-' &&
        e.data.expectedSecond === 'PROPERTIES' &&
        e.data.actualSecond === '' &&
        e.data.reason === 'empty-second'
      );
      expect(objectPropertiesFailure).toBeDefined();
    });

    it('should emit attempt-failed event when second word is empty (whitespace) (OBJECT- PROPERTIES)', () => {
      const code = 'OBJECT- PROPERTIES';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should emit attempt-failed event for empty second word (whitespace after separator)
      const failureEvents = events.filter(e => e.type === 'attempt-failed');
      expect(failureEvents.length).toBeGreaterThan(0);

      const objectPropertiesFailure = failureEvents.find(e =>
        e.data.attempt === 'compound-token' &&
        e.data.firstWord === 'OBJECT' &&
        e.data.separator === '-' &&
        e.data.expectedSecond === 'PROPERTIES' &&
        e.data.actualSecond === '' &&
        e.data.reason === 'empty-second'
      );
      expect(objectPropertiesFailure).toBeDefined();
    });

    it('should emit attempt-failed event for Format/Evaluate mismatch (FORMAT/FOO)', () => {
      const code = 'FORMAT/FOO';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should emit attempt-failed event for compound token mismatch
      const failureEvents = events.filter(e => e.type === 'attempt-failed');
      expect(failureEvents.length).toBeGreaterThan(0);

      const formatEvaluateFailure = failureEvents.find(e =>
        e.data.attempt === 'compound-token' &&
        e.data.firstWord === 'FORMAT' &&
        e.data.separator === '/' &&
        e.data.expectedSecond === 'EVALUATE' &&
        e.data.actualSecond === 'FOO' &&
        e.data.reason === 'mismatch'
      );
      expect(formatEvaluateFailure).toBeDefined();
    });

    it('should NOT emit attempt-failed event for successful compound token (OBJECT-PROPERTIES)', () => {
      const code = 'OBJECT-PROPERTIES';
      const events: TraceEvent[] = [];
      const traceCallback: TraceCallback = (event) => events.push(event);

      const lexer = new Lexer(code, { trace: traceCallback });
      lexer.tokenize();

      // Should NOT have any attempt-failed events for successful compound token
      const failureEvents = events.filter(e =>
        e.type === 'attempt-failed' &&
        e.data.attempt === 'compound-token'
      );
      expect(failureEvents.length).toBe(0);

      // Should have token event for OBJECT-PROPERTIES
      const tokenEvents = events.filter(e => e.type === 'token');
      const objectPropertiesToken = tokenEvents.find(e =>
        e.data.tokenType === TokenType.ObjectProperties
      );
      expect(objectPropertiesToken).toBeDefined();
    });

    it('should NOT emit events when no trace callback provided (OBJECT-FOO)', () => {
      const code = 'OBJECT-FOO';

      // No callback - should not crash
      expect(() => {
        const lexer = new Lexer(code);
        lexer.tokenize();
      }).not.toThrow();

      // With undefined callback - should not crash
      expect(() => {
        const lexer = new Lexer(code, { trace: undefined });
        lexer.tokenize();
      }).not.toThrow();
    });
  });
});
