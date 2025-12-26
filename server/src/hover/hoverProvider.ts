/**
 * Hover information provider for C/AL language server
 * Provides type information and documentation on hover
 */

import {
  Hover,
  Position,
  MarkupKind
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable, Symbol } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';
import { Token, KEYWORDS } from '../lexer/tokens';
import { BUILTIN_FUNCTIONS, RECORD_METHODS, BuiltinFunction } from '../completion/builtins';
import { ProviderBase } from '../providers/providerBase';

/** Keywords that represent data types */
const DATA_TYPE_KEYWORDS = new Set([
  'boolean', 'integer', 'decimal', 'text', 'code', 'date', 'time', 'datetime',
  'record', 'recordid', 'recordref', 'fieldref', 'biginteger', 'bigtext',
  'blob', 'guid', 'duration', 'option', 'char', 'byte', 'textconst'
]);

/** Keywords that represent control flow */
const CONTROL_FLOW_KEYWORDS = new Set([
  'if', 'then', 'else', 'case', 'of', 'while', 'do', 'repeat', 'until',
  'for', 'to', 'downto', 'exit', 'break', 'begin', 'end'
]);

/** Keywords that represent object types */
const OBJECT_TYPE_KEYWORDS = new Set([
  'table', 'page', 'report', 'codeunit', 'query', 'xmlport', 'menusuite'
]);

/** Keywords that represent declarations */
const DECLARATION_KEYWORDS = new Set([
  'procedure', 'function', 'local', 'var', 'trigger'
]);

/** Keywords that represent operators */
const OPERATOR_KEYWORDS = new Set([
  'div', 'mod', 'and', 'or', 'not', 'xor', 'in'
]);

/**
 * Get hover information for a keyword
 */
function getKeywordHover(keyword: string): Hover | null {
  const lowerKeyword = keyword.toLowerCase();

  // Check data types
  if (DATA_TYPE_KEYWORDS.has(lowerKeyword)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${keyword.toUpperCase()}**\n\n*C/AL Data Type*\n\n${getDataTypeDescription(lowerKeyword)}`
      }
    };
  }

  // Check control flow
  if (CONTROL_FLOW_KEYWORDS.has(lowerKeyword)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${keyword.toUpperCase()}**\n\n*Control Flow Keyword*\n\n${getControlFlowDescription(lowerKeyword)}`
      }
    };
  }

  // Check object types
  if (OBJECT_TYPE_KEYWORDS.has(lowerKeyword)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${keyword.toUpperCase()}**\n\n*C/AL Object Type*\n\n${getObjectTypeDescription(lowerKeyword)}`
      }
    };
  }

  // Check declarations
  if (DECLARATION_KEYWORDS.has(lowerKeyword)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${keyword.toUpperCase()}**\n\n*Declaration Keyword*\n\n${getDeclarationDescription(lowerKeyword)}`
      }
    };
  }

  // Check operators
  if (OPERATOR_KEYWORDS.has(lowerKeyword)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${keyword.toUpperCase()}**\n\n*Operator*\n\n${getOperatorDescription(lowerKeyword)}`
      }
    };
  }

  // Check boolean constants
  if (lowerKeyword === 'true' || lowerKeyword === 'false') {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${keyword.toUpperCase()}**\n\n*Boolean Constant*`
      }
    };
  }

  return null;
}

/**
 * Get description for data type keywords
 */
function getDataTypeDescription(keyword: string): string {
  const descriptions: Record<string, string> = {
    'boolean': 'Stores TRUE or FALSE values.',
    'integer': 'Stores whole numbers from -2,147,483,647 to 2,147,483,647.',
    'decimal': 'Stores decimal numbers with up to 18 significant digits.',
    'text': 'Stores alphanumeric strings up to 1024 characters.',
    'code': 'Stores alphanumeric strings, automatically converted to uppercase.',
    'date': 'Stores date values.',
    'time': 'Stores time values.',
    'datetime': 'Stores combined date and time values.',
    'record': 'Represents a row in a database table.',
    'recordid': 'Uniquely identifies a record in a table.',
    'recordref': 'Generic reference to any record type.',
    'fieldref': 'Generic reference to any field type.',
    'biginteger': 'Stores large integers from -9,223,372,036,854,775,807 to 9,223,372,036,854,775,807.',
    'bigtext': 'Stores large text values up to 2GB.',
    'blob': 'Stores binary large objects.',
    'guid': 'Stores globally unique identifiers.',
    'duration': 'Stores time spans in milliseconds.',
    'option': 'Stores a set of predefined values.',
    'char': 'Stores a single character.',
    'byte': 'Stores a single byte (0-255).',
    'textconst': 'Stores translatable text constants.'
  };
  return descriptions[keyword] || '';
}

/**
 * Get description for control flow keywords
 */
function getControlFlowDescription(keyword: string): string {
  const descriptions: Record<string, string> = {
    'if': 'Executes code conditionally. Use with THEN and optionally ELSE.',
    'then': 'Follows IF condition to specify code to execute when true.',
    'else': 'Specifies code to execute when IF condition is false.',
    'case': 'Multi-way branch based on expression value. Use with OF.',
    'of': 'Introduces case alternatives in a CASE statement.',
    'while': 'Executes code repeatedly while condition is true. Use with DO.',
    'do': 'Follows WHILE or FOR to introduce the loop body.',
    'repeat': 'Executes code at least once, then repeats while condition is false.',
    'until': 'Ends REPEAT loop when condition becomes true.',
    'for': 'Executes code a fixed number of times. Use with TO or DOWNTO.',
    'to': 'Increments loop counter in FOR loop.',
    'downto': 'Decrements loop counter in FOR loop.',
    'exit': 'Exits the current procedure/trigger, optionally returning a value.',
    'break': 'Exits the current loop immediately.',
    'begin': 'Starts a compound statement block.',
    'end': 'Ends a compound statement block.'
  };
  return descriptions[keyword] || '';
}

/**
 * Get description for object type keywords
 */
function getObjectTypeDescription(keyword: string): string {
  const descriptions: Record<string, string> = {
    'table': 'Defines a database table with fields, keys, and triggers.',
    'page': 'Defines a user interface for viewing and editing data.',
    'report': 'Defines a report for printing or exporting data.',
    'codeunit': 'Contains business logic as procedures and functions.',
    'query': 'Defines a database query combining data from multiple tables.',
    'xmlport': 'Imports and exports data in XML or text format.',
    'menusuite': 'Defines navigation menus (deprecated in newer versions).'
  };
  return descriptions[keyword] || '';
}

/**
 * Get description for declaration keywords
 */
function getDeclarationDescription(keyword: string): string {
  const descriptions: Record<string, string> = {
    'procedure': 'Declares a procedure that can be called from other code.',
    'function': 'Alias for PROCEDURE (same functionality).',
    'local': 'Marks a procedure as local (not visible outside the object).',
    'var': 'Declares variables or marks parameters as passed by reference.',
    'trigger': 'Declares an event handler triggered by system events.'
  };
  return descriptions[keyword] || '';
}

/**
 * Get description for operator keywords
 */
function getOperatorDescription(keyword: string): string {
  const descriptions: Record<string, string> = {
    'div': 'Integer division (discards remainder).',
    'mod': 'Modulo operator (returns remainder of division).',
    'and': 'Logical AND operator.',
    'or': 'Logical OR operator.',
    'not': 'Logical NOT operator (negation).',
    'xor': 'Logical exclusive OR operator.',
    'in': 'Tests if value is in a set or range.'
  };
  return descriptions[keyword] || '';
}

/**
 * Main hover provider class
 * Extends ProviderBase to reuse common text scanning utilities
 */
export class HoverProvider extends ProviderBase {
  /**
   * Get hover information for a position in the document
   */
  public getHover(
    document: TextDocument,
    position: Position,
    ast?: CALDocument,
    symbolTable?: SymbolTable,
    _tokens?: Token[]
  ): Hover | null {
    const wordInfo = this.getWordAtPosition(document, position);
    if (!wordInfo) {
      return null;
    }

    const word = wordInfo.word;
    const lowerWord = word.toLowerCase();

    // Check if we're after a dot (method context)
    if (this.isAfterDot(document, position)) {
      // Check for Record method
      const methodHover = this.getRecordMethodHover(word);
      if (methodHover) {
        return methodHover;
      }

      // Check for field from AST
      if (ast?.object?.fields) {
        const field = ast.object.fields.fields.find(
          f => f.fieldName.toLowerCase() === lowerWord
        );
        if (field) {
          return this.buildFieldHover(field.fieldName, field.dataType.typeName);
        }
      }
    }

    // Check for symbol in symbol table
    if (symbolTable) {
      const symbol = symbolTable.getSymbol(word);
      if (symbol) {
        return this.buildSymbolHover(symbol);
      }
    }

    // Check for built-in function
    const builtinHover = this.getBuiltinFunctionHover(word);
    if (builtinHover) {
      return builtinHover;
    }

    // Check for keyword
    if (KEYWORDS.has(lowerWord)) {
      const keywordHover = getKeywordHover(word);
      if (keywordHover) {
        return keywordHover;
      }
    }

    return null;
  }

  /**
   * Build hover content for a symbol
   */
  private buildSymbolHover(symbol: Symbol): Hover {
    let content = `**${symbol.name}**\n\n`;

    switch (symbol.kind) {
      case 'variable':
        content += `*Variable*`;
        if (symbol.type) {
          content += `\n\nType: \`${symbol.type}\``;
        }
        break;

      case 'parameter':
        content += `*Parameter*`;
        if (symbol.type) {
          content += `\n\nType: \`${symbol.type}\``;
        }
        break;

      case 'field':
        content += `*Field*`;
        if (symbol.type) {
          content += `\n\nType: \`${symbol.type}\``;
        }
        break;

      case 'procedure':
        content += `*Procedure*`;
        break;

      case 'function':
        content += `*Function*`;
        break;

      default:
        content += `*${symbol.kind}*`;
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content
      }
    };
  }

  /**
   * Build hover content for a field
   */
  private buildFieldHover(fieldName: string, dataType: string): Hover {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${fieldName}**\n\n*Field*\n\nType: \`${dataType}\``
      }
    };
  }

  /**
   * Get hover information for a built-in function
   */
  private getBuiltinFunctionHover(name: string): Hover | null {
    const lowerName = name.toLowerCase();

    const func = BUILTIN_FUNCTIONS.find(f => f.name.toLowerCase() === lowerName);
    if (func) {
      return this.buildBuiltinHover(func);
    }

    return null;
  }

  /**
   * Get hover information for a Record method
   */
  private getRecordMethodHover(name: string): Hover | null {
    const lowerName = name.toLowerCase();

    const method = RECORD_METHODS.find(m => m.name.toLowerCase() === lowerName);
    if (method) {
      return this.buildBuiltinHover(method, 'Record Method');
    }

    return null;
  }

  /**
   * Build hover content for a built-in function
   */
  private buildBuiltinHover(func: BuiltinFunction, label?: string): Hover {
    const categoryLabel = label || this.getCategoryLabel(func.category);

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${func.name}**${func.signature}\n\n*${categoryLabel}*\n\n${func.documentation}`
      }
    };
  }

  /**
   * Get human-readable label for function category
   */
  private getCategoryLabel(category: BuiltinFunction['category']): string {
    const labels: Record<string, string> = {
      'dialog': 'Dialog Function',
      'record': 'Record Method',
      'string': 'String Function',
      'math': 'Math Function',
      'date': 'Date/Time Function',
      'system': 'System Function',
      'file': 'File Function',
      'report': 'Report Function'
    };
    return labels[category] || 'Built-in Function';
  }
}