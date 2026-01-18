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
        },
        {
          message: 'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
          type: 'NewExpression',
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
  ],
});
