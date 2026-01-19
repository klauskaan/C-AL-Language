/**
 * ESLint rule: no-direct-parse-error
 *
 * Disallows direct ParseError construction outside factory methods.
 * Detects both direct usage and aliased construction patterns.
 *
 * Background:
 * - Issue #131: Enforce ParseError factory method pattern
 * - Issue #141: ESLint rule implementation
 * - Issue #149: Alias detection enhancement
 * - Direct construction bypasses centralized error sanitization
 * - Factory pattern enables consistent content sanitization
 * - Prevents sensitive content leakage in error messages
 *
 * Valid:
 *   - this.createParseError('message', token)
 *   - Inside functions/methods matching /^create.*Error$/
 *   - Aliases inside factory methods: const PE = ParseError; return new PE(...)
 *
 * Invalid:
 *   - new ParseError('message', token) in regular methods
 *   - throw new ParseError(...) outside factory methods
 *   - const PE = ParseError; new PE(...) in regular methods (alias detected)
 *   - let Err = ParseError; throw new Err(...) outside factories
 *
 * Out of scope (intentionally not detected, covered by Jest CI guard):
 *   - Import aliases: import { ParseError as PE } from './errors'; new PE(...)
 *   - Chained aliases: const A = ParseError; const B = A; new B(...)
 *   - Reassignment: let E = Other; E = ParseError; new E(...)
 *   - Property access: const obj = { PE: ParseError }; new obj.PE(...)
 *   - Dynamic assignments, destructuring patterns
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct ParseError construction outside factory methods',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      useFactory:
        'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
    },
    schema: [],
  },

  create(context) {
    /**
     * Checks if a function/method name matches the factory pattern.
     * Factory pattern: /^create.*Error$/
     *
     * @param {string} name - The function/method name
     * @returns {boolean} True if name matches factory pattern
     */
    function isFactoryMethod(name) {
      if (!name) return false;
      return /^create.*Error$/.test(name);
    }

    /**
     * Checks if the callee is 'ParseError' or an alias to it.
     * Uses ESLint's scope analysis to detect variable assignments.
     *
     * Examples:
     *   - new ParseError('msg', token)           → true (direct)
     *   - const PE = ParseError; new PE(...)     → true (alias)
     *   - let Err = ParseError; new Err(...)     → true (alias)
     *   - (E = ParseError) => new E(...)         → true (default param alias)
     *
     * Out of scope (intentionally not detected):
     *   - const obj = { PE: ParseError }         → false (property)
     *   - errors.ParseError = ParseError         → false (dynamic)
     *
     * @param {Node} callee - The callee node from NewExpression
     * @param {object} context - ESLint context
     * @returns {boolean} True if callee is ParseError or an alias
     */
    function isParseErrorOrAlias(callee, context) {
      if (!callee || callee.type !== 'Identifier') {
        return false;
      }

      // Check if directly named 'ParseError'
      if (callee.name === 'ParseError') {
        return true;
      }

      // Check if it's an alias using scope analysis
      const scope = context.sourceCode.getScope(callee);
      const variable = findVariableInScope(scope, callee.name);

      if (!variable) {
        return false;
      }

      // Check all definitions of this variable
      for (const def of variable.defs) {
        // For variable declarations like: const PE = ParseError
        if (def.type === 'Variable' && def.node.init) {
          const init = def.node.init;
          if (init.type === 'Identifier' && init.name === 'ParseError') {
            return true;
          }
        }
        // For default parameters like: (E = ParseError) => ...
        // Note: For parameters, def.node is the containing function, not the parameter itself.
        // The AssignmentPattern is found at def.name.parent
        if (def.type === 'Parameter') {
          const nameParent = def.name?.parent;
          if (nameParent?.type === 'AssignmentPattern') {
            const right = nameParent.right;
            if (right && right.type === 'Identifier' && right.name === 'ParseError') {
              return true;
            }
          }
        }
      }

      return false;
    }

    /**
     * Finds a variable in the scope chain.
     * Handles scoping correctly (var/let/const, shadowing).
     *
     * @param {Scope} scope - The starting scope
     * @param {string} name - Variable name to find
     * @returns {Variable|null} The variable object or null
     */
    function findVariableInScope(scope, name) {
      let currentScope = scope;

      while (currentScope) {
        const variable = currentScope.variables.find((v) => v.name === name);
        if (variable) {
          return variable;
        }

        // Check upper scope (for closures)
        currentScope = currentScope.upper;
      }

      return null;
    }

    // Stack to track current function context
    const functionStack = [];

    return {
      // Track entry into class methods
      MethodDefinition(node) {
        const functionName = node.key && node.key.name;
        functionStack.push(functionName);
      },

      'MethodDefinition:exit'() {
        functionStack.pop();
      },

      // Track entry into function declarations
      FunctionDeclaration(node) {
        const functionName = node.id && node.id.name;
        functionStack.push(functionName);
      },

      'FunctionDeclaration:exit'() {
        functionStack.pop();
      },

      // Track entry into named function expressions
      FunctionExpression(node) {
        // Only track if it has a name AND is not inside a MethodDefinition
        // (MethodDefinition already handles the method name)
        const ancestors = context.sourceCode.getAncestors(node);
        const isInsideMethodDef = ancestors.some((n) => n.type === 'MethodDefinition');

        if (!isInsideMethodDef) {
          const functionName = node.id && node.id.name;
          functionStack.push(functionName);
        }
      },

      'FunctionExpression:exit'(node) {
        const ancestors = context.sourceCode.getAncestors(node);
        const isInsideMethodDef = ancestors.some((n) => n.type === 'MethodDefinition');

        if (!isInsideMethodDef) {
          functionStack.pop();
        }
      },

      // Track entry into arrow functions
      ArrowFunctionExpression(node) {
        // Look at parent VariableDeclarator
        const ancestors = context.sourceCode.getAncestors(node);
        let functionName = null;

        for (let i = ancestors.length - 1; i >= 0; i--) {
          if (ancestors[i].type === 'VariableDeclarator' && ancestors[i].id) {
            functionName = ancestors[i].id.name;
            break;
          }
        }

        functionStack.push(functionName);
      },

      'ArrowFunctionExpression:exit'() {
        functionStack.pop();
      },

      NewExpression(node) {
        // Check if this is `new ParseError(...)` or `new PE(...)` where PE is an alias
        if (!isParseErrorOrAlias(node.callee, context)) {
          return; // Not a ParseError construction
        }

        // Get current function name from stack
        const currentFunctionName = functionStack[functionStack.length - 1];

        // Check if function name matches factory pattern
        if (isFactoryMethod(currentFunctionName)) {
          return; // Allowed: inside factory method
        }

        // Report violation
        context.report({
          node,
          messageId: 'useFactory',
        });
      },
    };
  },
};
