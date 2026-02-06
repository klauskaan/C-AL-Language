/**
 * Signature help provider for C/AL language server
 * Shows parameter hints when typing function calls
 */

import {
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  Position,
  MarkupKind
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';
import { BuiltinFunction, BuiltinRegistry } from '../builtins';
import { ProviderBase } from '../providers/providerBase';

/**
 * Context for a function call being typed
 */
interface FunctionCallContext {
  functionName: string;
  isMethodCall: boolean;  // true if called after a dot (e.g., Rec.FIND)
  parameterIndex: number; // which parameter we're typing (0-based)
}

/**
 * Parsed parameter from a signature string
 */
interface ParsedParameter {
  label: string;
  documentation?: string;
}

/**
 * Main signature help provider class
 * Extends ProviderBase for shared text scanning utilities
 */
export class SignatureHelpProvider extends ProviderBase {
  private registry = new BuiltinRegistry();

  /**
   * Get signature help for a function call at the cursor position
   */
  public getSignatureHelp(
    document: TextDocument,
    position: Position,
    ast?: CALDocument,
    symbolTable?: SymbolTable
  ): SignatureHelp | null {
    // Find the function call context at current position
    const context = this.findFunctionCallContext(document, position);
    if (!context) {
      return null;
    }

    // Look up the function signature
    let func: BuiltinFunction | undefined;

    if (context.isMethodCall) {
      // Look in record methods
      func = this.registry.getRecordMethod(context.functionName);
    }

    if (!func) {
      // Look in built-in functions
      func = this.registry.getGlobalFunction(context.functionName);
    }

    // Check user-defined procedures from symbol table using scope-aware lookup
    if (!func && symbolTable) {
      const offset = document.offsetAt(position);
      const symbol = symbolTable.getSymbolAtOffset(context.functionName, offset);
      if (symbol && (symbol.kind === 'procedure' || symbol.kind === 'function')) {
        // For user-defined procedures, we create a simple signature
        return this.buildUserProcedureSignature(symbol.name, context.parameterIndex);
      }
    }

    if (!func) {
      return null;
    }

    return this.buildSignatureHelp(func, context.parameterIndex, context.isMethodCall);
  }

  /**
   * Find the function call context at the cursor position
   * Returns the function name, whether it's a method call, and which parameter we're in
   */
  private findFunctionCallContext(document: TextDocument, position: Position): FunctionCallContext | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Search backwards for opening parenthesis, counting nested parens
    // Track string/comment context to ignore commas inside them
    let parenDepth = 0;
    let commaCount = 0;
    let openParenPos = -1;

    // Context tracking (scanning backwards, so we "exit" when we see opening delimiter)
    let inSingleQuoteString = false;
    let inDoubleQuoteString = false;
    let inBlockComment = false;  // { } style comments

    for (let i = offset - 1; i >= 0; i--) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';

      // Handle block comments { } - scanning backwards
      if (char === '}' && !inSingleQuoteString && !inDoubleQuoteString) {
        inBlockComment = true;
        continue;
      }
      if (char === '{' && inBlockComment) {
        inBlockComment = false;
        continue;
      }
      if (inBlockComment) {
        continue;
      }

      // Handle single-quoted strings 'text' - scanning backwards
      if (char === "'" && !inDoubleQuoteString) {
        // Check for escaped quote '' - if prev char is also ', skip both
        if (prevChar === "'") {
          i--; // Skip the escaped quote pair
          continue;
        }
        inSingleQuoteString = !inSingleQuoteString;
        continue;
      }
      if (inSingleQuoteString) {
        continue;
      }

      // Handle double-quoted identifiers "identifier" - scanning backwards
      if (char === '"' && !inSingleQuoteString) {
        inDoubleQuoteString = !inDoubleQuoteString;
        continue;
      }
      if (inDoubleQuoteString) {
        continue;
      }

      // Now we're outside strings and comments - process normally
      if (char === ')') {
        parenDepth++;
      } else if (char === '(') {
        if (parenDepth === 0) {
          openParenPos = i;
          break;
        }
        parenDepth--;
      } else if (char === ',' && parenDepth === 0) {
        commaCount++;
      } else if (char === ';') {
        // Semicolon is always a statement boundary
        break;
      }
      // Note: newlines don't break because function calls can span multiple lines
    }

    if (openParenPos < 0) {
      return null;
    }

    // Find the function name before the opening parenthesis
    let nameEnd = openParenPos;

    // Skip whitespace before paren using base class method
    const wsEnd = this.scanBackward(text, nameEnd - 1, c => /\s/.test(c));
    nameEnd = wsEnd;

    // Collect identifier characters using base class method and pattern
    const nameStart = this.scanBackward(text, nameEnd - 1, c => ProviderBase.IDENTIFIER_PATTERN.test(c));

    if (nameStart >= nameEnd) {
      return null;
    }

    const functionName = text.substring(nameStart, nameEnd);

    // Check if this is a method call (preceded by a dot)
    // Skip whitespace before identifier and check for dot
    const checkPos = this.scanBackward(text, nameStart - 1, c => /\s/.test(c)) - 1;
    const isMethodCall = checkPos >= 0 && text[checkPos] === '.';

    return {
      functionName,
      isMethodCall,
      parameterIndex: commaCount
    };
  }

  /**
   * Build SignatureHelp from a built-in function
   */
  private buildSignatureHelp(
    func: BuiltinFunction,
    activeParameter: number,
    _isMethodCall: boolean
  ): SignatureHelp {
    const parameters = this.parseSignatureParameters(func.signature);

    // Build the full signature string
    const signatureLabel = `${func.name}${func.signature}`;

    // Create parameter information
    const parameterInfos: ParameterInformation[] = parameters.map(param => ({
      label: param.label,
      documentation: param.documentation
    }));

    const signature: SignatureInformation = {
      label: signatureLabel,
      documentation: {
        kind: MarkupKind.Markdown,
        value: func.documentation
      },
      parameters: parameterInfos
    };

    // Clamp activeParameter to valid range [0, maxParameterIndex]
    // (maxParameterIndex is 0 for empty parameter list)
    const maxParameterIndex = Math.max(0, parameters.length - 1);

    return {
      signatures: [signature],
      activeSignature: 0,
      activeParameter: Math.max(0, Math.min(activeParameter, maxParameterIndex))
    };
  }

  /**
   * Build signature help for user-defined procedures
   */
  private buildUserProcedureSignature(
    name: string,
    _activeParameter: number
  ): SignatureHelp {
    // For user-defined procedures, we just show the name
    // Full parameter support would require AST parsing of procedure declarations
    const signature: SignatureInformation = {
      label: `${name}(...)`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: '*User-defined procedure*'
      },
      parameters: []
    };

    return {
      signatures: [signature],
      activeSignature: 0,
      activeParameter: 0
    };
  }

  /**
   * Parse a signature string into individual parameters
   * Examples:
   *   "(String [, Value1, ...])" -> ["String", "Value1", "..."]
   *   "(Field, String [, Value1, ...])" -> ["Field", "String", "Value1", "..."]
   *   "(): Date" -> []
   */
  private parseSignatureParameters(signature: string): ParsedParameter[] {
    if (!signature || signature === '') {
      return [];
    }

    // Extract content between parentheses
    const match = signature.match(/^\(([^)]*)\)/);
    if (!match) {
      return [];
    }

    const content = match[1].trim();
    if (!content) {
      return [];
    }

    // First, remove all square brackets to normalize the signature
    // "[, Value1, ...]" becomes ", Value1, ..."
    const normalized = content.replace(/[\[\]]/g, '');

    const params: ParsedParameter[] = [];

    // Split by comma
    const parts = normalized.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        params.push(this.createParameter(trimmed));
      }
    }

    return params;
  }

  /**
   * Create a parameter from a label string
   */
  private createParameter(label: string): ParsedParameter {
    // Clean up the label - remove leading comma that might remain
    let cleanLabel = label.trim();
    if (cleanLabel.startsWith(',')) {
      cleanLabel = cleanLabel.substring(1).trim();
    }

    // Handle variadic parameters like "..."
    if (cleanLabel === '...') {
      return {
        label: '...',
        documentation: 'Additional optional parameters'
      };
    }

    return {
      label: cleanLabel
    };
  }
}
