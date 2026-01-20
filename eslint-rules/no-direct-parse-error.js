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
 * - Issue #162: Variable reassignment detection
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
 *   - let E = Other; E = ParseError; new E(...) outside factories (reassignment detected)
 *
 * Out of scope (intentionally not detected, covered by Jest CI guard):
 *   - Re-exports: export { ParseError as PE } from './errors'
 *   - Default imports: import PE from './errors'; new PE(...)
 *   - Property access: const obj = { PE: ParseError }; new obj.PE(...)
 *   - Destructuring reassignment: [E] = [ParseError]; new E(...)
 *   - Dynamic assignments
 *
 * Known false positive (accepted trade-off):
 *   - const B = A; A = ParseError; new B(...) - B captured A's value before A was tainted
 *   - Reassignment detection uses conservative over-approximation for simplicity
 */

/**
 * Context types for ParseError construction violations.
 * Used to provide context-specific messageIds and suggestions.
 */
const CONTEXT = Object.freeze({
  // Valid contexts where suggestions are offered
  PARSER_INSTANCE_METHOD: 'parserInstanceMethod',
  PARSER_ARROW_FIELD: 'parserArrowField',

  // Invalid contexts where only guidance is provided
  STATIC_METHOD: 'staticMethod',
  NON_PARSER_CLASS: 'nonParserClass',
  NESTED_FUNCTION: 'nestedFunction',
  TOP_LEVEL: 'topLevel',
  STATIC_METHOD_NON_PARSER: 'staticMethodNonParser',
  NESTED_FUNCTION_NON_PARSER: 'nestedFunctionNonParser',
});

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
      useFactoryStaticMethod: 'Do not directly instantiate ParseError in static methods. Static methods cannot use this.createParseError(). Move this code to an instance method where this.createParseError() is available.',
      useFactoryNonParserClass: 'Do not directly instantiate ParseError. This class does not have a createParseError() method. Add a factory method to this class, or use a different error type.',
      useFactoryNestedFunction: 'Do not directly instantiate ParseError in nested functions. The `this` binding is not available here. Convert to an arrow function to preserve this binding, or move error creation to the outer method.',
      useFactoryTopLevel: 'Do not directly instantiate ParseError. Import and use a factory function for error creation, or wrap this in a class with a factory method.',
      useFactoryStaticMethodNonParser: 'Do not directly instantiate ParseError in static methods. This class does not have a createParseError() method. Consider adding a factory method to this class, or use a different error type.',
      useFactoryNestedFunctionNonParser: 'Do not directly instantiate ParseError in nested functions. This class does not have a createParseError() method. Add a factory method to this class, or move error creation to the enclosing method.',
      suggestUseFactory: 'Replace with this.createParseError(...)',
      suggestUseFactoryAndRemoveAlias: 'Replace with this.createParseError(...) and remove unused alias declaration',
    },
    schema: [],
  },

  create(context) {
    // Track variables reassigned to ParseError or its aliases (Issue #162)
    // Key: ESLint Scope object (using object identity)
    // Value: Set of variable names tainted in that scope
    const taintedVariables = new Map();

    /**
     * Gets the appropriate scope key for tracking a variable.
     * For 'var' declarations, returns variableScope (function scope due to hoisting).
     * For 'let'/'const', returns the current block scope.
     */
    function getScopeKey(scope, kind) {
      if (kind === 'var' && scope.variableScope) {
        return scope.variableScope;
      }
      return scope;
    }

    /**
     * Marks a variable as tainted (assigned to ParseError or alias) in its scope.
     */
    function markTainted(scope, name) {
      if (!taintedVariables.has(scope)) {
        taintedVariables.set(scope, new Set());
      }
      taintedVariables.get(scope).add(name);
    }

    /**
     * Checks if a variable is tainted in the given scope or any parent scope.
     */
    function isTainted(scope, name) {
      let currentScope = scope;
      while (currentScope) {
        if (taintedVariables.has(currentScope)) {
          if (taintedVariables.get(currentScope).has(name)) {
            return true;
          }
        }
        currentScope = currentScope.upper;
      }
      return false;
    }

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

      // Check if this variable was reassigned to ParseError/alias (Issue #162)
      // This catches: let E = Other; E = ParseError; new E(...)
      // NOTE: Only flags uses AFTER reassignment. Uses before reassignment are not
      // flagged because ESLint visits nodes in source order, so the taint Map is
      // populated as we traverse. This is intentional - we want to catch the pattern
      // where a variable is reassigned and THEN used, not accidental early uses.
      if (isTainted(scope, callee.name)) {
        return true;
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
     * Gets metadata about an alias declaration for the given callee.
     * Also finds the reassignment node if the variable was reassigned to ParseError.
     *
     * @param {Node} callee - The callee node from NewExpression
     * @param {object} context - ESLint context
     * @returns {object|null} - { variable, declarationNode, declarationType, isReassignment } or null
     */
    function getAliasDeclarationInfo(callee, context) {
      if (!callee || callee.type !== 'Identifier') {
        return null;
      }

      // Direct ParseError usage is not an alias
      if (callee.name === 'ParseError') {
        return null;
      }

      // Look up the variable using scope analysis
      const scope = context.sourceCode.getScope(callee);
      const variable = findVariableInScope(scope, callee.name);

      if (!variable || variable.defs.length === 0) {
        return null;
      }

      // Check if this is a reassignment pattern (tainted variable)
      // For reassignment: let E = OtherClass; E = ParseError; new E(...)
      if (isTainted(scope, callee.name)) {
        // Find the reassignment node
        for (const ref of variable.references) {
          if (ref.isWrite() && !ref.init) {
            const parent = ref.identifier.parent;
            if (parent && parent.type === 'AssignmentExpression') {
              const rightSide = parent.right;
              if (rightSide && isParseErrorOrAlias(rightSide, context, new Set(), 0)) {
                // Found the reassignment
                return {
                  variable,
                  declarationNode: parent, // AssignmentExpression
                  declarationType: 'AssignmentExpression',
                  isReassignment: true,
                };
              }
            }
          }
        }
      }

      // Get the declaration definition
      const def = variable.defs[0];

      // Handle VariableDeclarator: const PE = ParseError;
      if (def.type === 'Variable' && def.node.type === 'VariableDeclarator') {
        return {
          variable,
          declarationNode: def.node,
          declarationType: 'VariableDeclarator',
          isReassignment: false,
        };
      }

      // Handle ImportSpecifier: import { ParseError as PE } from './errors';
      if (def.type === 'ImportBinding' && def.node.type === 'ImportSpecifier') {
        return {
          variable,
          declarationNode: def.node,
          declarationType: 'ImportSpecifier',
          isReassignment: false,
        };
      }

      return null;
    }

    /**
     * Checks if an alias variable has only a single usage (the current node).
     *
     * @param {Variable} variable - ESLint variable object
     * @param {Node} currentNode - The current NewExpression node's callee
     * @param {Node} declarationNode - The declaration node (to check for exports)
     * @param {boolean} isReassignment - Whether this is a reassignment pattern
     * @returns {boolean} True if alias has only one usage and is safe to remove
     */
    function isSingleUsage(variable, currentNode, declarationNode, isReassignment) {
      // Filter out initialization references (where the variable is being declared)
      // For reassignments, also filter out the reassignment itself
      const usageRefs = variable.references.filter(ref => {
        if (ref.init) return false; // Skip initialization

        // For reassignment pattern, skip the reassignment write
        if (isReassignment && ref.isWrite() && ref.identifier.parent === declarationNode) {
          return false;
        }

        return true;
      });

      // Check if the declaration is exported
      if (declarationNode.parent && declarationNode.parent.parent) {
        const grandParent = declarationNode.parent.parent;
        if (grandParent.type === 'ExportNamedDeclaration' || grandParent.type === 'ExportDefaultDeclaration') {
          return false; // Exported - not safe to remove
        }
      }

      // Single usage means exactly one reference and it's the current node
      return usageRefs.length === 1 && usageRefs[0].identifier === currentNode;
    }

    /**
     * Generates a fixer to remove a VariableDeclarator from a VariableDeclaration.
     * Handles comma positions (first, middle, last) and entire declaration removal.
     *
     * @param {object} fixer - ESLint fixer object
     * @param {object} sourceCode - ESLint sourceCode object
     * @param {Node} declaratorNode - The VariableDeclarator node to remove
     * @returns {object} Fixer object
     */
    function getDeclaratorRemovalFix(fixer, sourceCode, declaratorNode) {
      const declarationNode = declaratorNode.parent;
      const declarators = declarationNode.declarations;

      // If this is the only declarator, remove the entire declaration statement
      if (declarators.length === 1) {
        // Find the statement node (handles both VariableDeclaration directly and wrapped in ExpressionStatement)
        let statementNode = declarationNode;
        if (declarationNode.parent && declarationNode.parent.type === 'ExpressionStatement') {
          statementNode = declarationNode.parent;
        }

        // Guard: Don't offer removal if other VariableDeclarations on same line
        // (removing the line would delete those too)
        if (hasOtherVariableDeclarationsOnSameLine(sourceCode, statementNode)) {
          return null;
        }

        // Check if there are other statements on the same line
        if (hasOtherStatementsOnSameLine(sourceCode, statementNode)) {
          // Other statements exist - remove statement and any trailing whitespace
          // (preserves indentation and other statements on the line)
          const text = sourceCode.getText();
          let end = statementNode.range[1];

          // Skip any trailing spaces after the statement (but not newlines)
          while (end < text.length && (text[end] === ' ' || text[end] === '\t')) {
            end++;
          }

          // Remove from statement start to end of trailing whitespace
          return fixer.removeRange([statementNode.range[0], end]);
        } else {
          // No other statements - use line removal (cleans up indentation and newline)
          const [lineStart, lineEnd] = getLineRemovalRange(sourceCode, statementNode);
          return fixer.removeRange([lineStart, lineEnd]);
        }
      }

      // Multiple declarators - need to handle commas carefully
      const index = declarators.indexOf(declaratorNode);

      if (index === 0) {
        // First declarator: remove from start to just before the next declarator
        const nextDeclarator = declarators[1];
        const rangeStart = declaratorNode.range[0];
        const rangeEnd = nextDeclarator.range[0];
        return fixer.removeRange([rangeStart, rangeEnd]);
      } else {
        // Middle or last: remove from after previous declarator (including comma) to end of this one
        const prevDeclarator = declarators[index - 1];
        const rangeStart = prevDeclarator.range[1];
        const rangeEnd = declaratorNode.range[1];
        return fixer.removeRange([rangeStart, rangeEnd]);
      }
    }

    /**
     * Generates a fixer to remove an ImportSpecifier from an ImportDeclaration.
     * Handles comma positions and converts "as X" aliases back to direct imports.
     *
     * @param {object} fixer - ESLint fixer object
     * @param {object} sourceCode - ESLint sourceCode object
     * @param {Node} specifierNode - The ImportSpecifier node to remove/modify
     * @returns {object} Fixer object
     */
    function getImportSpecifierRemovalFix(fixer, sourceCode, specifierNode) {
      const importNode = specifierNode.parent;
      const specifiers = importNode.specifiers.filter(s => s.type === 'ImportSpecifier');

      // Check if this specifier is aliased (import { ParseError as PE })
      const isAliased = specifierNode.imported.name !== specifierNode.local.name;

      if (isAliased) {
        // Convert "ParseError as PE" to just "ParseError"
        const importedName = specifierNode.imported.name;
        return fixer.replaceText(specifierNode, importedName);
      }

      // Not aliased - this case shouldn't happen per plan, but handle gracefully
      // (Direct imports like "import { ParseError }" don't get removal suggestions)
      return null;
    }

    /**
     * Calculates the range to remove an entire line containing a statement,
     * including leading indentation and trailing newline.
     *
     * Used for removing single-declarator variable declarations and
     * standalone assignment expression statements.
     *
     * @param {object} sourceCode - ESLint sourceCode object
     * @param {Node} statementNode - The statement node whose line should be removed (must have .range property)
     * @returns {[number, number]} Range tuple [start, end] for fixer.removeRange()
     */
    function getLineRemovalRange(sourceCode, statementNode) {
      const text = sourceCode.getText();

      // Find the start of the line (including indentation)
      let lineStart = statementNode.range[0];
      while (lineStart > 0 && text[lineStart - 1] !== '\n' && text[lineStart - 1] !== '\r') {
        lineStart--;
      }

      // Find the end of the line (including semicolon and newline)
      let lineEnd = statementNode.range[1];
      while (lineEnd < text.length && text[lineEnd] !== '\n' && text[lineEnd] !== '\r') {
        lineEnd++;
      }
      if (lineEnd < text.length && text[lineEnd] === '\r') lineEnd++;
      if (lineEnd < text.length && text[lineEnd] === '\n') lineEnd++;

      return [lineStart, lineEnd];
    }

    /**
     * Checks if there are other VariableDeclarations on the same line as the given node.
     * Used to determine if line-based removal would be destructive to other declarations.
     *
     * This function specifically checks for other VariableDeclaration statements that would
     * be deleted if we removed the entire line. Other types of statements (like throw, return, etc.)
     * won't be affected because we can use statement-range removal instead of line removal.
     *
     * @param {object} sourceCode - ESLint sourceCode object
     * @param {Node} node - The VariableDeclaration statement node to check
     * @returns {boolean} True if other VariableDeclarations exist on the same line
     */
    function hasOtherVariableDeclarationsOnSameLine(sourceCode, node) {
      const text = sourceCode.getText();
      const nodeStart = node.range[0];
      const nodeEnd = node.range[1];

      // Find line boundaries
      let lineStart = nodeStart;
      while (lineStart > 0 && text[lineStart - 1] !== '\n' && text[lineStart - 1] !== '\r') {
        lineStart--;
      }

      let lineEnd = nodeEnd;
      while (lineEnd < text.length && text[lineEnd] !== '\n' && text[lineEnd] !== '\r') {
        lineEnd++;
      }

      // Check for 'const', 'let', or 'var' keywords before the node on the same line
      const beforeNode = text.slice(lineStart, nodeStart);
      const hasDeclarationBefore = /\b(const|let|var)\b/.test(beforeNode);

      // Check for 'const', 'let', or 'var' keywords after the node on the same line
      const afterNode = text.slice(nodeEnd, lineEnd);
      const hasDeclarationAfter = /\b(const|let|var)\b/.test(afterNode);

      return hasDeclarationBefore || hasDeclarationAfter;
    }

    /**
     * Checks if there are any other statements on the same line as the given node.
     * Used to determine if we should use statement-range removal instead of line removal.
     *
     * @param {object} sourceCode - ESLint sourceCode object
     * @param {Node} node - The statement node to check
     * @returns {boolean} True if any other statements exist on the same line
     */
    function hasOtherStatementsOnSameLine(sourceCode, node) {
      const text = sourceCode.getText();
      const nodeStart = node.range[0];
      const nodeEnd = node.range[1];

      // Find line boundaries
      let lineStart = nodeStart;
      while (lineStart > 0 && text[lineStart - 1] !== '\n' && text[lineStart - 1] !== '\r') {
        lineStart--;
      }

      let lineEnd = nodeEnd;
      while (lineEnd < text.length && text[lineEnd] !== '\n' && text[lineEnd] !== '\r') {
        lineEnd++;
      }

      // Check for non-whitespace content before or after the node on the same line
      // This detects other code sharing the line
      const beforeNode = text.slice(lineStart, nodeStart).trim();
      const afterNode = text.slice(nodeEnd, lineEnd).trim();

      return beforeNode.length > 0 || afterNode.length > 0;
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
     * Checks if the node is inside a nested regular function that loses `this` binding.
     * @param {Node} node - The node to check
     * @param {Node[]} ancestors - Ancestor nodes
     * @param {Node|null} enclosingMethodOrProperty - The enclosing method/property
     * @returns {boolean} True if inside a nested regular function
     */
    function checkForNestedRegularFunction(node, ancestors, enclosingMethodOrProperty) {
      // Check if inside a nested regular function that loses `this`
      // We need to check all ancestors between the method/property and the node
      // Regular functions (FunctionDeclaration/FunctionExpression) break `this` binding
      // Arrow functions preserve `this`, so they're OK
      //
      // Note: MethodDefinition.value is a FunctionExpression - this is the method's
      // own function and should NOT be counted as a nested function

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
          const isMethodFunction = enclosingMethodOrProperty?.type === 'MethodDefinition' && enclosingMethodOrProperty.value === ancestor;

          if (!isMethodFunction) {
            // This is a nested function that breaks `this` binding
            return true;
          }
        }
      }

      return false;
    }

    /**
     * Classifies the context where a ParseError construction occurs.
     * Returns a CONTEXT constant value used to select appropriate messageIds.
     *
     * @param {Node} node - The NewExpression node
     * @param {object} context - The ESLint rule context
     * @returns {string} One of the CONTEXT constant values
     */
    function classifyContext(node, context) {
      const ancestors = context.sourceCode.getAncestors(node);
      const inParserClass = isInsideParserClass(node);

      // Find enclosing method or property definition
      let enclosingMethodOrProperty = null;
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor.type === 'MethodDefinition' || ancestor.type === 'PropertyDefinition') {
          enclosingMethodOrProperty = ancestor;
          break;
        }
      }

      // 1. TOP_LEVEL: No class context at all (MUST be checked FIRST)
      const hasClassContext = ancestors.some(
        n => n.type === 'ClassDeclaration' || n.type === 'ClassExpression'
      );

      if (!hasClassContext) {
        return CONTEXT.TOP_LEVEL;
      }

      // Pre-compute conditions for clarity
      const isStatic = enclosingMethodOrProperty?.static;
      const hasNestedFunction = checkForNestedRegularFunction(node, ancestors, enclosingMethodOrProperty);

      // 2. NON-PARSER CLASS branch (compound contexts)
      if (!inParserClass) {
        // Static takes priority over nested (static is more fundamental limitation)
        if (isStatic) {
          return CONTEXT.STATIC_METHOD_NON_PARSER;
        }
        if (hasNestedFunction) {
          return CONTEXT.NESTED_FUNCTION_NON_PARSER;
        }
        // Plain instance method in non-Parser class
        return CONTEXT.NON_PARSER_CLASS;
      }

      // 3. PARSER CLASS branch
      if (isStatic) {
        return CONTEXT.STATIC_METHOD;
      }

      if (hasNestedFunction) {
        return CONTEXT.NESTED_FUNCTION;
      }

      // Valid contexts in Parser class
      if (enclosingMethodOrProperty?.type === 'PropertyDefinition') {
        return CONTEXT.PARSER_ARROW_FIELD;
      }

      return CONTEXT.PARSER_INSTANCE_METHOD;
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

      AssignmentExpression(node) {
        // Only handle simple identifier assignments (skip destructuring)
        if (node.left.type !== 'Identifier') {
          return;
        }

        // Check if right-hand side is ParseError or an alias
        if (!isParseErrorOrAlias(node.right, context, new Set(), 0)) {
          return;
        }

        // Find the variable being assigned to
        const scope = context.sourceCode.getScope(node);
        const variable = findVariableInScope(scope, node.left.name);

        if (!variable) {
          return; // Undeclared variable, skip
        }

        // Determine the variable's declaration kind for scope key calculation
        // Use defensive fallback for parameters (no .kind property)
        const kind = variable.defs[0]?.kind || 'var';

        const scopeKey = getScopeKey(scope, kind);
        markTainted(scopeKey, node.left.name);
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

        // Classify the context to determine appropriate messageId
        const ctx = classifyContext(node, context);

        // Map context to messageId
        const messageIdMap = {
          [CONTEXT.STATIC_METHOD]: 'useFactoryStaticMethod',
          [CONTEXT.STATIC_METHOD_NON_PARSER]: 'useFactoryStaticMethodNonParser',
          [CONTEXT.NON_PARSER_CLASS]: 'useFactoryNonParserClass',
          [CONTEXT.NESTED_FUNCTION]: 'useFactoryNestedFunction',
          [CONTEXT.NESTED_FUNCTION_NON_PARSER]: 'useFactoryNestedFunctionNonParser',
          [CONTEXT.TOP_LEVEL]: 'useFactoryTopLevel',
          [CONTEXT.PARSER_INSTANCE_METHOD]: 'useFactory',
          [CONTEXT.PARSER_ARROW_FIELD]: 'useFactory',
        };

        // Build report object
        const report = {
          node,
          messageId: messageIdMap[ctx] || 'useFactory', // Fallback to default
        };

        // Only offer suggestions for valid Parser contexts
        if (ctx === CONTEXT.PARSER_INSTANCE_METHOD || ctx === CONTEXT.PARSER_ARROW_FIELD) {
          const sourceCode = context.sourceCode;
          const args = node.arguments
            .map((arg) => sourceCode.getText(arg))
            .join(', ');

          const suggestions = [];

          // Suggestion 1: Always offer replace
          suggestions.push({
            messageId: 'suggestUseFactory',
            fix(fixer) {
              return fixer.replaceText(node, `this.createParseError(${args})`);
            },
          });

          // Suggestion 2: If alias + single usage, offer replace + remove
          const aliasInfo = getAliasDeclarationInfo(node.callee, context);
          if (aliasInfo && isSingleUsage(aliasInfo.variable, node.callee, aliasInfo.declarationNode, aliasInfo.isReassignment || false)) {
            // Check if removal is possible (not blocked by same-line conflicts)
            let canRemove = false;

            if (aliasInfo.declarationType === 'VariableDeclarator') {
              // For VariableDeclarator, check if it can be removed
              const declarationNode = aliasInfo.declarationNode.parent;
              const declarators = declarationNode.declarations;

              if (declarators.length === 1) {
                // Single declarator - check if removal would be safe
                let statementNode = declarationNode;
                if (declarationNode.parent && declarationNode.parent.type === 'ExpressionStatement') {
                  statementNode = declarationNode.parent;
                }
                // Can remove unless there are other VariableDeclarations on the same line
                canRemove = !hasOtherVariableDeclarationsOnSameLine(sourceCode, statementNode);
              } else {
                // Multiple declarators - can always remove one declarator safely
                canRemove = true;
              }
            } else if (aliasInfo.declarationType === 'ImportSpecifier') {
              // Import aliases can always be converted back to direct imports
              canRemove = true;
            } else if (aliasInfo.declarationType === 'AssignmentExpression') {
              // For reassignment, check if line removal would be safe
              const assignmentStmt = aliasInfo.declarationNode.parent;
              if (assignmentStmt && assignmentStmt.type === 'ExpressionStatement') {
                canRemove = !hasOtherStatementsOnSameLine(sourceCode, assignmentStmt);
              }
            }

            // Only offer the removal suggestion if removal is possible
            if (canRemove) {
              suggestions.push({
                messageId: 'suggestUseFactoryAndRemoveAlias',
                fix(fixer) {
                  const fixes = [];

                  // Fix 1: Replace the NewExpression
                  fixes.push(fixer.replaceText(node, `this.createParseError(${args})`));

                  // Fix 2: Remove the alias declaration or reassignment
                  if (aliasInfo.declarationType === 'VariableDeclarator') {
                    const removalFix = getDeclaratorRemovalFix(fixer, sourceCode, aliasInfo.declarationNode);
                    if (removalFix) {
                      fixes.push(removalFix);
                    }
                  } else if (aliasInfo.declarationType === 'ImportSpecifier') {
                    const removalFix = getImportSpecifierRemovalFix(fixer, sourceCode, aliasInfo.declarationNode);
                    if (removalFix) {
                      fixes.push(removalFix);
                    }
                  } else if (aliasInfo.declarationType === 'AssignmentExpression') {
                    const assignmentStmt = aliasInfo.declarationNode.parent;
                    if (assignmentStmt && assignmentStmt.type === 'ExpressionStatement') {
                      const [lineStart, lineEnd] = getLineRemovalRange(sourceCode, assignmentStmt);
                      fixes.push(fixer.removeRange([lineStart, lineEnd]));
                    }
                  }

                  return fixes;
                },
              });
            }
          }

          report.suggest = suggestions;
        }

        // Report violation
        context.report(report);
      },
    };
  },
};
