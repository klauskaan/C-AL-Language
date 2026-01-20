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
 * - Issue #160: Import alias detection
 * - Issue #161: Chained alias detection
 * - Direct construction bypasses centralized error sanitization
 * - Factory pattern enables consistent content sanitization
 * - Prevents sensitive content leakage in error messages
 *
 * Valid:
 *   - this.createParseError('message', token)
 *   - Inside functions/methods matching /^create.*Error$/
 *   - Aliases inside factory methods: const PE = ParseError; return new PE(...)
 *   - Import aliases inside factory methods: import { ParseError as PE } from './errors'; new PE(...)
 *
 * Invalid:
 *   - new ParseError('message', token) in regular methods
 *   - throw new ParseError(...) outside factory methods
 *   - const PE = ParseError; new PE(...) in regular methods (alias detected)
 *   - let Err = ParseError; throw new Err(...) outside factories
 *   - import { ParseError as PE } from './errors'; new PE(...) outside factories (import alias detected)
 *   - const A = ParseError; const B = A; new B(...) outside factories (chained alias detected)
 *
 * Out of scope (intentionally not detected, covered by Jest CI guard):
 *   - Re-exports: export { ParseError as PE } from './errors'
 *   - Default imports: import PE from './errors'; new PE(...)
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
    hasSuggestions: true,
    messages: {
      useFactory:
        'Do not directly instantiate ParseError. Use a factory method (e.g., createParseError) instead.',
      suggestUseFactory: 'Replace with this.createParseError(...)',
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
     * Recursively detects chained aliases with circular reference protection.
     *
     * Examples:
     *   - new ParseError('msg', token)           → true (direct)
     *   - const PE = ParseError; new PE(...)     → true (alias)
     *   - let Err = ParseError; new Err(...)     → true (alias)
     *   - (E = ParseError) => new E(...)         → true (default param alias)
     *   - import { ParseError as PE } from './errors'; new PE(...) → true (import alias)
     *   - const A = ParseError; const B = A; new B(...) → true (chained alias, 2 levels)
     *   - const A = ParseError; const B = A; const C = B; new C(...) → true (chained alias, 3+ levels)
     *
     * Out of scope (intentionally not detected):
     *   - const obj = { PE: ParseError }         → false (property)
     *   - errors.ParseError = ParseError         → false (dynamic)
     *
     * @param {Node} callee - The callee node from NewExpression
     * @param {object} context - ESLint context
     * @param {Set<string>} visited - Set of already-checked identifiers (for cycle detection)
     * @param {number} depth - Current recursion depth (for stack overflow protection)
     * @returns {boolean} True if callee is ParseError or an alias
     */
    function isParseErrorOrAlias(callee, context, visited = new Set(), depth = 0) {
      // Max depth protection: prevent stack overflow on pathologically deep (but non-circular) chains
      // In practice, alias chains > 3 levels are extremely rare; 10 is generous
      const MAX_ALIAS_DEPTH = 10;
      if (depth > MAX_ALIAS_DEPTH) {
        return false;
      }

      if (!callee || callee.type !== 'Identifier') {
        return false;
      }

      // Check if directly named 'ParseError'
      if (callee.name === 'ParseError') {
        return true;
      }

      // Circular reference protection: if we've already checked this identifier, stop.
      // Note: We track by name, not by variable instance. This is safe because:
      // 1. Each NewExpression gets a fresh visited Set (called from NewExpression handler)
      // 2. Recursion follows a single variable's definition chain within scope analysis
      // 3. Shadowed variables in different scopes have different Variable objects in ESLint
      if (visited.has(callee.name)) {
        return false;
      }

      // Add to visited set before recursing
      visited.add(callee.name);

      // Check if it's an alias using scope analysis
      const scope = context.sourceCode.getScope(callee);
      const variable = findVariableInScope(scope, callee.name);

      if (!variable) {
        return false;
      }

      // Check all definitions of this variable
      for (const def of variable.defs) {
        // For variable declarations like: const PE = ParseError or const B = A
        if (def.type === 'Variable' && def.node.init) {
          const init = def.node.init;
          if (init.type === 'Identifier') {
            // Base case: directly assigned to ParseError
            if (init.name === 'ParseError') {
              return true;
            }
            // Recursive case: assigned to another identifier - check if that's an alias
            if (isParseErrorOrAlias(init, context, visited, depth + 1)) {
              return true;
            }
          }
        }
        // For default parameters like: (E = ParseError) => ...
        // Note: For parameters, def.node is the containing function, not the parameter itself.
        // The AssignmentPattern is found at def.name.parent
        if (def.type === 'Parameter') {
          const nameParent = def.name?.parent;
          if (nameParent?.type === 'AssignmentPattern') {
            const right = nameParent.right;
            if (right && right.type === 'Identifier') {
              // Base case: directly assigned to ParseError
              if (right.name === 'ParseError') {
                return true;
              }
              // Recursive case: check if the right side is an alias
              if (isParseErrorOrAlias(right, context, visited, depth + 1)) {
                return true;
              }
            }
          }
        }
        // For import aliases like: import { ParseError as PE } from './errors'
        if (def.type === 'ImportBinding') {
          const importNode = def.node;
          if (importNode.type === 'ImportSpecifier') {
            const imported = importNode.imported;
            if (imported && imported.type === 'Identifier' && imported.name === 'ParseError') {
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

    /**
     * Checks if a node is inside a Parser class.
     * Uses dynamic ancestor walking to detect the class context.
     * Supports both ClassDeclaration and ClassExpression.
     *
     * @param {Node} node - The AST node to check
     * @returns {boolean} True if inside a class named 'Parser' (ClassDeclaration or named ClassExpression)
     */
    function isInsideParserClass(node) {
      const ancestors = context.sourceCode.getAncestors(node);

      for (const ancestor of ancestors) {
        if (
          (ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression') &&
          ancestor.id &&
          ancestor.id.name === 'Parser'
        ) {
          return true;
        }
      }

      return false;
    }

    /**
     * Checks if we should offer a suggestion to replace with this.createParseError.
     * Suggestion is only valid when:
     * 1. Inside a Parser class (ClassDeclaration or named ClassExpression)
     * 2. Inside an instance method (MethodDefinition, not static) OR class field arrow function (PropertyDefinition)
     * 3. Not inside a nested regular function (which loses `this` context)
     *    - Arrow functions are OK (they preserve `this`)
     *
     * @param {Node} node - The NewExpression node
     * @returns {boolean} True if suggestion should be offered
     */
    function shouldOfferSuggestion(node) {
      // Deferred: Don't offer suggestions for aliased construction
      // (complex case that requires more sophisticated code transformation)
      if (node.callee && node.callee.name !== 'ParseError') {
        return false; // This is an alias like `new PE(...)`, skip suggestion
      }

      // Must be inside Parser class
      if (!isInsideParserClass(node)) {
        return false;
      }

      const ancestors = context.sourceCode.getAncestors(node);

      // Find the enclosing method or property definition (if any)
      let enclosingMethodOrProperty = null;
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (ancestors[i].type === 'MethodDefinition' || ancestors[i].type === 'PropertyDefinition') {
          enclosingMethodOrProperty = ancestors[i];
          break;
        }
      }

      // Must be inside a method or property definition
      if (!enclosingMethodOrProperty) {
        return false;
      }

      // Cannot be a static method or property
      if (enclosingMethodOrProperty.static) {
        return false;
      }

      // For PropertyDefinition, the value must be an ArrowFunctionExpression
      if (enclosingMethodOrProperty.type === 'PropertyDefinition') {
        if (enclosingMethodOrProperty.value?.type !== 'ArrowFunctionExpression') {
          return false; // Only support arrow function class fields
        }
      }

      // Check if inside a nested regular function that loses `this`
      // We need to check all ancestors between the method/property and the node
      // Regular functions (FunctionDeclaration/FunctionExpression) break `this` binding
      // Arrow functions preserve `this`, so they're OK
      //
      // Note: MethodDefinition.value is a FunctionExpression - this is the method's
      // own function and should NOT be counted as a nested function
      let hasNestedRegularFunction = false;

      for (const ancestor of ancestors) {
        // Skip the method/property definition itself
        if (ancestor.type === 'MethodDefinition' || ancestor.type === 'PropertyDefinition') {
          continue;
        }

        // Check if this ancestor is a regular function or function expression
        if (
          ancestor.type === 'FunctionDeclaration' ||
          ancestor.type === 'FunctionExpression'
        ) {
          // Check if this function is the immediate child of the method definition
          // (which would make it the method's own function, not a nested one)
          const isMethodFunction = enclosingMethodOrProperty.type === 'MethodDefinition' && enclosingMethodOrProperty.value === ancestor;

          if (!isMethodFunction) {
            // This is a nested function that breaks `this` binding
            hasNestedRegularFunction = true;
            break;
          }
        }
      }

      return !hasNestedRegularFunction;
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

        // Build report object
        const report = {
          node,
          messageId: 'useFactory',
        };

        // Add suggestion if context allows
        if (shouldOfferSuggestion(node)) {
          const sourceCode = context.sourceCode;
          const args = node.arguments
            .map((arg) => sourceCode.getText(arg))
            .join(', ');

          report.suggest = [
            {
              messageId: 'suggestUseFactory',
              fix(fixer) {
                return fixer.replaceText(node, `this.createParseError(${args})`);
              },
            },
          ];
        }

        // Report violation
        context.report(report);
      },
    };
  },
};
