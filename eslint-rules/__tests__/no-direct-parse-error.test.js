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

    // Import alias - out of scope (requires ImportBinding analysis)
    // Note: Not detected by this rule, but caught by Jest CI guard
    {
      code: `
        import { ParseError as PE } from './errors';
        function handleError() {
          new PE('message', null);
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
  ],

  invalid: [
    // Direct construction in throw statement
    {
      code: `throw new ParseError('Unexpected token', token);`,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
        },
      ],
    },

    // Direct construction pushed to array
    {
      code: `this.errors.push(new ParseError('Invalid syntax', token));`,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
        },
      ],
    },

    // Aliased ParseError with const - basic violation
    {
      code: `const PE = ParseError; new PE('message', token);`,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
        },
      ],
    },

    // Aliased ParseError with let - basic violation
    {
      code: `let Err = ParseError; new Err('message', token);`,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
        },
      ],
    },

    // Aliased ParseError with var - basic violation
    {
      code: `var E = ParseError; throw new E('error', token);`,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
        },
      ],
    },

    // Alias in class method (non-factory) - violation
    {
      code: `
        class Parser {
          parse() {
            const E = ParseError;
            return new E('error', this.token);
          }
        }
      `,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
        },
      ],
    },

    // Alias via default parameter - violation
    {
      code: `const handleError = (E = ParseError) => new E('msg', null);`,
      errors: [
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
          // NO suggestions - not in a Parser class
        },
      ],
    },

    // 10. SHOULD NOT SUGGEST: Aliased construction (complex case deferred)
    // Note: This is explicitly deferred per the plan - alias detection for suggestions
    // adds significant complexity and should be handled in a future enhancement
    {
      code: `
        class Parser {
          parse() {
            const PE = ParseError;
            throw new PE('Aliased error', token);
          }
        }
      `,
      errors: [
        {
          messageId: 'useFactory',
          // NO suggestions - alias handling deferred to future enhancement
        },
      ],
    },

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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
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
          messageId: 'useFactory',
          // NO suggestions - anonymous ClassExpression has no name, so not detected as Parser
        },
      ],
    },
  ],
});
