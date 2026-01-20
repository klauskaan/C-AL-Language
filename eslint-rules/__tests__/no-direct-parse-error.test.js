/**
 * Tests for no-direct-parse-error ESLint rule
 *
 * This rule prevents direct `new ParseError(...)` construction in favor of
 * factory methods matching the pattern /^create.*Error$/.
 *
 * TDD Note: These tests will FAIL initially because the rule doesn't exist yet.
 * This is expected and validates that we're testing the right behavior.
 *
 * Background:
 * - Issue #131: Enforce ParseError factory method pattern
 * - Direct construction makes error sanitization inconsistent
 * - Factory pattern enables centralized content sanitization
 * - Prevents sensitive content leakage in error messages
 */

const { RuleTester } = require('eslint');
const rule = require('../no-direct-parse-error');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-direct-parse-error', rule, {
  valid: [
    // Factory method call - NOT using `new` keyword
    {
      code: `this.createParseError('message', token);`,
      options: [],
    },

    // Helper method call
    {
      code: `this.recordError('message', token);`,
      options: [],
    },

    // Direct construction INSIDE a factory method - allowed
    {
      code: `
        class Parser {
          private createParseError(message: string, token: Token): ParseError {
            return new ParseError(message, token);
          }
        }
      `,
      options: [],
    },

    // Direct construction INSIDE a function named createParseError
    {
      code: `
        function createParseError(message: string, token: Token): ParseError {
          return new ParseError(message, token);
        }
      `,
      options: [],
    },

    // Direct construction INSIDE createLexerError - matches pattern
    {
      code: `
        class Lexer {
          private createLexerError(message: string): ParseError {
            return new ParseError(message, this.currentToken);
          }
        }
      `,
      options: [],
    },

    // Direct construction INSIDE createValidationError - matches pattern
    {
      code: `
        function createValidationError(msg: string): ParseError {
          return new ParseError(msg, null);
        }
      `,
      options: [],
    },

    // Public factory method
    {
      code: `
        class Parser {
          public createParseError(message: string): ParseError {
            return new ParseError(sanitize(message), this.token);
          }
        }
      `,
      options: [],
    },

    // Protected factory method
    {
      code: `
        class BaseParser {
          protected createSyntaxError(msg: string): ParseError {
            return new ParseError(msg, this.peek());
          }
        }
      `,
      options: [],
    },

    // Arrow function factory
    {
      code: `
        const createTokenError = (msg: string, token: Token): ParseError => {
          return new ParseError(msg, token);
        };
      `,
      options: [],
    },

    // Constructor of a different class (not ParseError)
    {
      code: `
        class Parser {
          parseExpression() {
            return new Expression(this.tokens);
          }
        }
      `,
      options: [],
    },

    // Multiple factory methods
    {
      code: `
        class ErrorFactory {
          createParseError(msg: string): ParseError {
            return new ParseError(msg, null);
          }

          createLexicalError(msg: string): ParseError {
            return new ParseError(msg, this.token);
          }
        }
      `,
      options: [],
    },

    // Alias in factory method - allowed (factory method pattern)
    {
      code: `
        function createParseError(msg: string): ParseError {
          const PE = ParseError;
          return new PE(msg, null);
        }
      `,
      options: [],
    },

    // Alias in class factory method - allowed (factory method pattern)
    {
      code: `
        class Parser {
          createParseError(msg: string): ParseError {
            const Err = ParseError;
            return new Err(msg, this.token);
          }
        }
      `,
      options: [],
    },

    // Shadowing - inner scope overrides outer alias
    {
      code: `
        const PE = ParseError;
        {
          const PE = SomeOtherClass;
          new PE('msg', token);
        }
      `,
      options: [],
    },

    // Non-ParseError alias - not our concern
    {
      code: `
        const E = SomeOtherClass;
        new E('message', token);
      `,
      options: [],
    },

    // Import alias in factory method - allowed (factory method pattern)
    {
      code: `
        import { ParseError as PE } from './errors';
        function createParseError(msg: string) {
          return new PE(msg, null);
        }
      `,
      options: [],
    },

    // Non-aliased direct import in factory method - allowed
    {
      code: `
        import { ParseError } from './errors';
        function createParseError(msg: string) {
          return new ParseError(msg, null);
        }
      `,
      options: [],
    },

    // Multiple import specifiers with ParseError alias in factory - allowed
    {
      code: `
        import { Token, ParseError as PE, Lexer } from './errors';
        function createCustomError(msg: string) {
          return new PE(msg, null);
        }
      `,
      options: [],
    },

    // Named ClassExpression with Parser name - allowed in factory method
    {
      code: `
        const Parser = class Parser {
          createParseError(msg: string): ParseError {
            return new ParseError(msg, this.token);
          }
        };
      `,
      options: [],
    },

    // ========== Chained Alias Detection - Valid Cases (Issue #161) ==========

    // Chained alias inside factory method - allowed (factory method pattern)
    {
      code: `
        function createParseError(msg: string) {
          const A = ParseError;
          const B = A;
          return new B(msg, null);
        }
      `,
      options: [],
    },

    // Chain that doesn't start from ParseError - not our concern
    {
      code: `
        const A = SomeOtherClass;
        const B = A;
        new B('message', token);
      `,
      options: [],
    },

    // Circular reference protection - should NOT crash, should NOT report (not a ParseError chain)
    {
      code: `
        const A = B;
        const B = A;
        new A('message', token);
      `,
      options: [],
    },
  ],

  invalid: [
    // Direct construction in throw statement
    {
      code: `throw new ParseError('Unexpected token', token);`,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Direct construction pushed to array
    {
      code: `this.errors.push(new ParseError('Invalid syntax', token));`,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Standalone direct construction
    {
      code: `
        class Parser {
          handleError() {
            const error = new ParseError('message', this.token);
            return error;
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          type: 'NewExpression',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          handleError() {
            const error = this.createParseError('message', this.token);
            return error;
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // Direct construction in return statement
    {
      code: `
        function parseToken(token: Token) {
          return new ParseError('Invalid', token);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Multiple violations in same function
    {
      code: `
        class Parser {
          validate() {
            this.errors.push(new ParseError('Error 1', token1));
            throw new ParseError('Error 2', token2);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          type: 'NewExpression',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          validate() {
            this.errors.push(this.createParseError('Error 1', token1));
            throw new ParseError('Error 2', token2);
          }
        }
      `,
            },
          ],
        },
        {
          messageId: 'useFactory',
          type: 'NewExpression',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          validate() {
            this.errors.push(new ParseError('Error 1', token1));
            throw this.createParseError('Error 2', token2);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // Direct construction in method that doesn't match factory pattern
    {
      code: `
        class Parser {
          handleSyntaxError(msg: string) {
            return new ParseError(msg, this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          type: 'NewExpression',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          handleSyntaxError(msg: string) {
            return this.createParseError(msg, this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // Direct construction in arrow function that doesn't match pattern
    {
      code: `
        const handleError = (msg: string) => {
          return new ParseError(msg, null);
        };
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Direct construction in if statement
    {
      code: `
        if (condition) {
          throw new ParseError('Bad condition', token);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Direct construction assigned to variable
    {
      code: `
        const error = new ParseError('Syntax error', currentToken);
        errors.push(error);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Direct construction in ternary
    {
      code: `
        const result = isError
          ? new ParseError('Error', token)
          : null;
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },
    // Nested function inside factory method - NOT exempt (documents current behavior)
    {
      code: `
        function createParseError(message: string): ParseError {
          const helper = () => {
            return new ParseError(message, null);
          };
          return helper();
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Aliased ParseError with const - basic violation
    {
      code: `const PE = ParseError; new PE('message', token);`,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Aliased ParseError with let - basic violation
    {
      code: `let Err = ParseError; new Err('message', token);`,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Aliased ParseError with var - basic violation
    {
      code: `var E = ParseError; throw new E('error', token);`,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Alias via default parameter - violation
    {
      code: `const handleError = (E = ParseError) => new E('msg', null);`,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Multiple aliases in declaration - violation on ParseError alias
    {
      code: `
        const A = ParseError, B = SomethingElse;
        new A('message', null);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // ========== Auto-fix Suggestion Tests ==========
    // These tests validate ESLint's suggest API for providing auto-fix suggestions.
    // Tests MUST fail initially because the feature hasn't been implemented yet.

    // 1. SHOULD SUGGEST: Direct construction in Parser instance method
    {
      code: `
        class Parser {
          parseExpression() {
            throw new ParseError('Unexpected token', this.currentToken);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parseExpression() {
            throw this.createParseError('Unexpected token', this.currentToken);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 2. SHOULD SUGGEST: Throw statement in Parser instance method
    {
      code: `
        class Parser {
          validate() {
            if (invalid) {
              throw new ParseError('Invalid syntax', token);
            }
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          validate() {
            if (invalid) {
              throw this.createParseError('Invalid syntax', token);
            }
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 3. SHOULD SUGGEST: Nested arrow function in Parser method (preserves this)
    {
      code: `
        class Parser {
          handleErrors() {
            const helper = () => {
              return new ParseError('Error from arrow', this.token);
            };
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          handleErrors() {
            const helper = () => {
              return this.createParseError('Error from arrow', this.token);
            };
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 4. SHOULD SUGGEST: Constructor context (has valid this)
    {
      code: `
        class Parser {
          constructor() {
            this.error = new ParseError('Init error', null);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          constructor() {
            this.error = this.createParseError('Init error', null);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 5. SHOULD SUGGEST: Multiple violations each get individual suggestion
    {
      code: `
        class Parser {
          process() {
            const err1 = new ParseError('Error 1', token1);
            const err2 = new ParseError('Error 2', token2);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          process() {
            const err1 = this.createParseError('Error 1', token1);
            const err2 = new ParseError('Error 2', token2);
          }
        }
      `,
            },
          ],
        },
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          process() {
            const err1 = new ParseError('Error 1', token1);
            const err2 = this.createParseError('Error 2', token2);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 6. SHOULD NOT SUGGEST: Static method in Parser class (no instance this)
    {
      code: `
        class Parser {
          static handleError() {
            return new ParseError('Static error', null);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryStaticMethod',
          // NO suggestions property - cannot use this.createParseError in static context
        },
      ],
    },

    // 7. SHOULD NOT SUGGEST: Method in non-Parser class (createParseError doesn't exist)
    {
      code: `
        class Lexer {
          tokenize() {
            throw new ParseError('Lexer error', token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNonParserClass',
          // NO suggestions - Lexer doesn't have createParseError method
        },
      ],
    },

    // 8. SHOULD NOT SUGGEST: Nested regular function (loses this binding)
    {
      code: `
        class Parser {
          parse() {
            function helper() {
              return new ParseError('Nested error', null);
            }
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNestedFunction',
          // NO suggestions - regular function doesn't preserve this
        },
      ],
    },

    // 9. SHOULD NOT SUGGEST: Object literal method (not in Parser class)
    {
      code: `
        const handler = {
          handle() {
            throw new ParseError('Handler error', token);
          }
        };
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          // NO suggestions - not in a Parser class
        },
      ],
    },

    // 10. REMOVED: Aliased construction test (redundant with auto-fix tests below)

    // 11. SHOULD SUGGEST: Private method in Parser (has valid this)
    {
      code: `
        class Parser {
          private handleError() {
            return new ParseError('Private method error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          private handleError() {
            return this.createParseError('Private method error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 12. SHOULD SUGGEST: Protected method in Parser (has valid this)
    {
      code: `
        class Parser {
          protected validate() {
            throw new ParseError('Protected error', token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          protected validate() {
            throw this.createParseError('Protected error', token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 13. SHOULD SUGGEST: Getter in Parser (has valid this)
    {
      code: `
        class Parser {
          get currentError() {
            return new ParseError('Getter error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          get currentError() {
            return this.createParseError('Getter error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 14. SHOULD SUGGEST: Setter in Parser (has valid this)
    {
      code: `
        class Parser {
          set error(msg) {
            this._error = new ParseError(msg, this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          set error(msg) {
            this._error = this.createParseError(msg, this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 15. SHOULD NOT SUGGEST: Top-level code (no class context)
    {
      code: `
        function parse() {
          throw new ParseError('Top level', token);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          // NO suggestions - not in any class
        },
      ],
    },

    // 16. SHOULD SUGGEST: Async method in Parser (has valid this)
    {
      code: `
        class Parser {
          async parseAsync() {
            throw new ParseError('Async error', token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          async parseAsync() {
            throw this.createParseError('Async error', token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 17. SHOULD SUGGEST: Generator method in Parser (has valid this)
    {
      code: `
        class Parser {
          *parseTokens() {
            yield new ParseError('Generator error', token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          *parseTokens() {
            yield this.createParseError('Generator error', token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 18. SHOULD NOT SUGGEST: Method in class extending Parser (class name check)
    // Note: This tests that we check for the exact "Parser" class name, not subclasses
    {
      code: `
        class ExtendedParser extends Parser {
          parse() {
            throw new ParseError('Extended error', token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNonParserClass',
          // NO suggestions - not in a class literally named "Parser"
          // (The plan specifies checking for Parser class context)
        },
      ],
    },

    // 19. SHOULD SUGGEST: Deeply nested arrow function in Parser (preserves this)
    {
      code: `
        class Parser {
          parse() {
            const outer = () => {
              const inner = () => {
                return new ParseError('Deep arrow', this.token);
              };
            };
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const outer = () => {
              const inner = () => {
                return this.createParseError('Deep arrow', this.token);
              };
            };
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 20. SHOULD NOT SUGGEST: Arrow function nested in regular function in Parser (loses this)
    {
      code: `
        class Parser {
          parse() {
            function helper() {
              const arrow = () => {
                return new ParseError('Arrow in function', null);
              };
            }
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNestedFunction',
          // NO suggestions - regular function breaks the this chain
        },
      ],
    },

    // 21. SHOULD SUGGEST: Named ClassExpression with non-factory method
    {
      code: `
        const Parser = class Parser {
          parse() {
            throw new ParseError('ClassExpression error', this.token);
          }
        };
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        const Parser = class Parser {
          parse() {
            throw this.createParseError('ClassExpression error', this.token);
          }
        };
      `,
            },
          ],
        },
      ],
    },

    // 22. SHOULD SUGGEST: Class field arrow function
    {
      code: `
        class Parser {
          handleError = () => {
            return new ParseError('Field arrow error', this.token);
          };
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          handleError = () => {
            return this.createParseError('Field arrow error', this.token);
          };
        }
      `,
            },
          ],
        },
      ],
    },

    // 23. SHOULD NOT SUGGEST: Class field non-arrow function (regular function expression)
    {
      code: `
        class Parser {
          handleError = function() {
            return new ParseError('Field function error', null);
          };
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNestedFunction',
          // NO suggestions - regular function in class field loses this binding
        },
      ],
    },

    // 24. SHOULD NOT SUGGEST: Anonymous ClassExpression (no class name)
    {
      code: `
        const MyParser = class {
          parse() {
            throw new ParseError('Anonymous class', this.token);
          }
        };
      `,
      errors: [
        {
          messageId: 'useFactoryNonParserClass',
          // NO suggestions - anonymous ClassExpression has no name, so not detected as Parser
        },
      ],
    },

    // ========== Import Alias Detection Tests (Issue #160) ==========
    // These tests verify that import aliases are detected just like variable aliases.

    // Basic import alias violation - should be detected
    {
      code: `
        import { ParseError as PE } from './errors';
        function handleError() {
          return new PE('message', null);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Non-aliased direct import violation - should be detected
    {
      code: `
        import { ParseError } from './errors';
        function handleError() {
          throw new ParseError('error', token);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Import alias in class method - should be detected
    {
      code: `
        import { ParseError as Err } from './errors';
        class Lexer {
          tokenize() {
            const error = new Err('Lexer error', this.currentToken);
            return error;
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNonParserClass',
          type: 'NewExpression',
        },
      ],
    },

    // Multiple import specifiers - only ParseError alias triggers violation
    {
      code: `
        import { Token, ParseError as PE, Lexer } from './errors';
        function validate() {
          return new PE('Validation failed', null);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Multiple aliases in same import (edge case) - both should be detected
    {
      code: `
        import { ParseError as PE, ParseError as Err } from './errors';
        function handleError() {
          const e1 = new PE('Error 1', null);
          const e2 = new Err('Error 2', null);
          return [e1, e2];
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // ========== Chained Alias Detection Tests (Issue #161) ==========
    // These tests verify that chains of aliases (A = ParseError; B = A; new B(...))
    // are detected and reported as violations.

    // Simple 2-level chained alias - should be detected
    {
      code: `
        const A = ParseError;
        const B = A;
        new B('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Deeper 3-level chain - should be detected
    {
      code: `
        const A = ParseError;
        const B = A;
        const C = B;
        new C('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Chained alias in throw statement - should be detected
    {
      code: `
        const ErrorAlias = ParseError;
        const ThrowableError = ErrorAlias;
        throw new ThrowableError('error', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Chained alias through default parameter - should be detected
    {
      code: `
        const A = ParseError;
        const handleError = (E = A) => new E('msg', null);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Import-to-variable chain - should be detected
    {
      code: `
        import { ParseError as PE } from './errors';
        const A = PE;
        new A('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // ========== Variable Reassignment Detection Tests (Issue #162) ==========
    // These tests verify that reassignment patterns like:
    // let E = OtherClass; E = ParseError; new E(...)
    // are detected and reported as violations.

    // Basic reassignment - let
    {
      code: `
        let E = OtherClass;
        E = ParseError;
        new E('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Basic reassignment - var
    {
      code: `
        var E = OtherClass;
        E = ParseError;
        new E('error', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Reassignment to alias
    {
      code: `
        const PE = ParseError;
        let E = OtherClass;
        E = PE;
        new E('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Multiple reassignments ending in ParseError
    {
      code: `
        let E = SafeClass;
        E = AnotherSafe;
        E = ParseError;
        new E('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Parameter reassignment
    {
      code: `
        function test(E) {
          E = ParseError;
          return new E('msg', null);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // Known false positive: Chain captured before reassignment
    // Per issue #162, this will report a violation even though B is not actually ParseError
    // at the point of construction. This is an accepted trade-off to avoid complex
    // control flow analysis. The rule errs on the side of flagging potential issues.
    {
      code: `
        let A = SafeClass;
        const B = A;
        A = ParseError;
        new B('message', token);
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // ========== Auto-fix: Alias Removal Tests (Issue #163) ==========
    // These tests verify that ESLint offers TWO suggestions when an alias has only one usage:
    // 1. Replace only: new PE(...) → this.createParseError(...)
    // 2. Replace + remove: Same replacement PLUS remove the unused alias declaration
    //
    // TDD Note: These tests will FAIL initially because the feature doesn't exist yet.

    // 1. Basic alias with single usage - should offer BOTH suggestions
    {
      code: `
        class Parser {
          parse() {
            const PE = ParseError;
            throw new PE('Syntax error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const PE = ParseError;
            throw this.createParseError('Syntax error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            throw this.createParseError('Syntax error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 2. Alias with multiple usages - should offer ONLY replace suggestion (no removal)
    {
      code: `
        class Parser {
          parse() {
            const PE = ParseError;
            throw new PE('Error 1', this.token);
            this.errors.push(new PE('Error 2', this.token));
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const PE = ParseError;
            throw this.createParseError('Error 1', this.token);
            this.errors.push(new PE('Error 2', this.token));
          }
        }
      `,
            },
            // NO suggestUseFactoryAndRemoveAlias - alias has multiple usages
          ],
        },
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const PE = ParseError;
            throw new PE('Error 1', this.token);
            this.errors.push(this.createParseError('Error 2', this.token));
          }
        }
      `,
            },
            // NO suggestUseFactoryAndRemoveAlias - alias has multiple usages
          ],
        },
      ],
    },

    // 3. Import alias with single usage - should offer both suggestions
    {
      code: `
        import { ParseError as PE } from './errors';
        class Parser {
          parse() {
            throw new PE('Import error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import { ParseError as PE } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Import error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        import { ParseError } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Import error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 4. Multi-declarator variable - remove suggestion should only remove the PE declarator
    {
      code: `
        class Parser {
          parse() {
            const A = OtherClass, PE = ParseError, B = AnotherClass;
            return new PE('Error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const A = OtherClass, PE = ParseError, B = AnotherClass;
            return this.createParseError('Error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            const A = OtherClass, B = AnotherClass;
            return this.createParseError('Error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 5. Multi-specifier import - remove suggestion should only remove the PE specifier
    {
      code: `
        import { Token, ParseError as PE, Lexer } from './errors';
        class Parser {
          parse() {
            throw new PE('Multi-import error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import { Token, ParseError as PE, Lexer } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Multi-import error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        import { Token, ParseError, Lexer } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Multi-import error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 6. Chained alias with single usage - should offer both suggestions
    {
      code: `
        class Parser {
          parse() {
            const A = ParseError;
            const B = A;
            return new B('Chained error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const A = ParseError;
            const B = A;
            return this.createParseError('Chained error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            const A = ParseError;
            return this.createParseError('Chained error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 7. Export case - exported alias is NOT unused, only offer replace
    {
      code: `
        export const PE = ParseError;
        class Parser {
          parse() {
            throw new PE('Exported error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        export const PE = ParseError;
        class Parser {
          parse() {
            throw this.createParseError('Exported error', this.token);
          }
        }
      `,
            },
            // NO suggestUseFactoryAndRemoveAlias - alias is exported (not safe to remove)
          ],
        },
      ],
    },

    // 8. Mixed import (default + named) - handle correctly (from adversarial review)
    {
      code: `
        import DefaultExport, { ParseError as PE } from './errors';
        class Parser {
          parse() {
            return new PE('Mixed import error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import DefaultExport, { ParseError as PE } from './errors';
        class Parser {
          parse() {
            return this.createParseError('Mixed import error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        import DefaultExport, { ParseError } from './errors';
        class Parser {
          parse() {
            return this.createParseError('Mixed import error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 9a. Multi-declarator edge case: first position
    {
      code: `
        class Parser {
          parse() {
            const PE = ParseError, B = OtherClass;
            throw new PE('First position', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const PE = ParseError, B = OtherClass;
            throw this.createParseError('First position', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            const B = OtherClass;
            throw this.createParseError('First position', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 9b. Multi-declarator edge case: middle position
    {
      code: `
        class Parser {
          parse() {
            const A = OtherClass, PE = ParseError, B = AnotherClass;
            throw new PE('Middle position', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const A = OtherClass, PE = ParseError, B = AnotherClass;
            throw this.createParseError('Middle position', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            const A = OtherClass, B = AnotherClass;
            throw this.createParseError('Middle position', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 9c. Multi-declarator edge case: last position
    {
      code: `
        class Parser {
          parse() {
            const A = OtherClass, PE = ParseError;
            throw new PE('Last position', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const A = OtherClass, PE = ParseError;
            throw this.createParseError('Last position', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            const A = OtherClass;
            throw this.createParseError('Last position', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 10. Let declaration with single usage - should offer both suggestions
    {
      code: `
        class Parser {
          parse() {
            let PE = ParseError;
            return new PE('Let error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            let PE = ParseError;
            return this.createParseError('Let error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            return this.createParseError('Let error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 11. Var declaration with single usage - should offer both suggestions
    {
      code: `
        class Parser {
          parse() {
            var PE = ParseError;
            throw new PE('Var error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            var PE = ParseError;
            throw this.createParseError('Var error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            throw this.createParseError('Var error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 12. Import with only ParseError specifier - remove should remove entire import
    {
      code: `
        import { ParseError as PE } from './errors';
        class Parser {
          parse() {
            throw new PE('Solo import error', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import { ParseError as PE } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Solo import error', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        import { ParseError } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Solo import error', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 13. Alias used in non-violation context - should NOT offer removal suggestion
    {
      code: `
        class Parser {
          parse() {
            const PE = ParseError;
            const isError = something instanceof PE;
            throw new PE('Mixed usage', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const PE = ParseError;
            const isError = something instanceof PE;
            throw this.createParseError('Mixed usage', this.token);
          }
        }
      `,
            },
            // NO suggestUseFactoryAndRemoveAlias - alias has other usages (instanceof)
          ],
        },
      ],
    },

    // 14. Multi-specifier import, first position
    {
      code: `
        import { ParseError as PE, Token, Lexer } from './errors';
        class Parser {
          parse() {
            throw new PE('First specifier', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import { ParseError as PE, Token, Lexer } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('First specifier', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        import { ParseError, Token, Lexer } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('First specifier', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 15. Multi-specifier import, last position
    {
      code: `
        import { Token, Lexer, ParseError as PE } from './errors';
        class Parser {
          parse() {
            throw new PE('Last specifier', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import { Token, Lexer, ParseError as PE } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Last specifier', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        import { Token, Lexer, ParseError } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Last specifier', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 16. Deeper chain (3 levels) with single usage - should offer both suggestions
    {
      code: `
        class Parser {
          parse() {
            const A = ParseError;
            const B = A;
            const C = B;
            return new C('Deep chain', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            const A = ParseError;
            const B = A;
            const C = B;
            return this.createParseError('Deep chain', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            const A = ParseError;
            const B = A;
            return this.createParseError('Deep chain', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // 17. Non-aliased direct import with single usage - only replace suggestion (no alias to remove)
    {
      code: `
        import { ParseError } from './errors';
        class Parser {
          parse() {
            throw new ParseError('Direct import', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        import { ParseError } from './errors';
        class Parser {
          parse() {
            throw this.createParseError('Direct import', this.token);
          }
        }
      `,
            },
            // NO suggestUseFactoryAndRemoveAlias - no alias to remove, just direct import
          ],
        },
      ],
    },

    // 18. Reassignment pattern with single usage - should offer both suggestions
    {
      code: `
        class Parser {
          parse() {
            let E = OtherClass;
            E = ParseError;
            return new E('Reassignment', this.token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          suggestions: [
            {
              messageId: 'suggestUseFactory',
              output: `
        class Parser {
          parse() {
            let E = OtherClass;
            E = ParseError;
            return this.createParseError('Reassignment', this.token);
          }
        }
      `,
            },
            {
              messageId: 'suggestUseFactoryAndRemoveAlias',
              output: `
        class Parser {
          parse() {
            let E = OtherClass;
            return this.createParseError('Reassignment', this.token);
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // ========== Context-Aware MessageIds Tests (Issue #164) ==========
    // These tests verify that different violation contexts produce different messageIds
    // to give developers context-specific guidance.
    //
    // TDD Note: These tests will FAIL initially because the messageIds don't exist yet.

    // 1. Async static method in Parser class - should use 'useFactoryStaticMethod'
    {
      code: `
        class Parser {
          static async handleErrorAsync() {
            return new ParseError('Async static error', null);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryStaticMethod',
          type: 'NewExpression',
        },
      ],
    },

    // 2. Generator static method in Parser class - should use 'useFactoryStaticMethod'
    {
      code: `
        class Parser {
          static *handleErrors() {
            yield new ParseError('Generator static error', null);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryStaticMethod',
          type: 'NewExpression',
        },
      ],
    },

    // 3. Nested regular function in Parser method - should use 'useFactoryNestedFunction'
    {
      code: `
        class Parser {
          parse() {
            function helper() {
              return new ParseError('Nested function error', null);
            }
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNestedFunction',
          type: 'NewExpression',
        },
      ],
    },

    // 4. Nested function in non-Parser class method - should use 'useFactoryNestedFunction'
    {
      code: `
        class Validator {
          validate() {
            function checkRule() {
              return new ParseError('Validation error', null);
            }
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNestedFunction',
          type: 'NewExpression',
        },
      ],
    },

    // 5. Top-level function - should use 'useFactoryTopLevel'
    {
      code: `
        function parseToken(token) {
          throw new ParseError('Top-level error', token);
        }
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // 6. Top-level arrow function - should use 'useFactoryTopLevel'
    {
      code: `
        const parseExpression = (expr) => {
          return new ParseError('Arrow function error', null);
        };
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // 7. Object literal method - should use 'useFactoryTopLevel' (not in class)
    {
      code: `
        const handler = {
          handle() {
            throw new ParseError('Object literal method', token);
          }
        };
      `,
      errors: [
        {
          messageId: 'useFactoryTopLevel',
          type: 'NewExpression',
        },
      ],
    },

    // 8. Static method in non-Parser class - should use 'useFactoryStaticMethod'
    {
      code: `
        class Validator {
          static validate() {
            return new ParseError('Static validator error', null);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryStaticMethod',
          type: 'NewExpression',
        },
      ],
    },

    // 9. Nested arrow in regular function in Parser - should use 'useFactoryNestedFunction'
    {
      code: `
        class Parser {
          parse() {
            function helper() {
              const arrow = () => {
                return new ParseError('Nested arrow in function', null);
              };
            }
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactoryNestedFunction',
          type: 'NewExpression',
        },
      ],
    },

    // 10. Static arrow function field - should use 'useFactoryStaticMethod'
    {
      code: `
        class Parser {
          static handler = () => {
            return new ParseError('Static arrow field', null);
          };
        }
      `,
      errors: [
        {
          messageId: 'useFactoryStaticMethod',
          type: 'NewExpression',
        },
      ],
    },
  ],
});
