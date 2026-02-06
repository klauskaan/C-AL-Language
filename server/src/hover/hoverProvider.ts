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
import { CALDocument, ProcedureDeclaration } from '../parser/ast';
import { Token, KEYWORDS, TokenType } from '../lexer/tokens';
import { BuiltinFunction, BuiltinRegistry } from '../builtins';
import { ProviderBase } from '../providers/providerBase';
import { getMetadataByTokenType, getHoverLabel } from '../shared/keywordMetadata';
import { findTokenAtOffset } from '../shared/tokenSearch';

/**
 * Get hover information for a keyword
 */
function getKeywordHover(keyword: string, tokenType?: TokenType): string | null {
  let metadata;
  if (tokenType !== undefined) {
    metadata = getMetadataByTokenType(tokenType);
  } else {
    // Fallback: look up keyword in KEYWORDS map to get default token type
    const defaultTokenType = KEYWORDS.get(keyword.toLowerCase());
    if (defaultTokenType !== undefined) {
      metadata = getMetadataByTokenType(defaultTokenType);
    }
  }

  if (!metadata) {
    return null;
  }

  const label = getHoverLabel(metadata.category);
  const description = metadata.description || '';
  return `**${label}**: ${keyword.toUpperCase()}\n\n${description}`;
}

/**
 * Main hover provider class
 * Extends ProviderBase to reuse common text scanning utilities
 */
export class HoverProvider extends ProviderBase {
  private registry: BuiltinRegistry;

  constructor(builtins: BuiltinRegistry) {
    super();
    this.registry = builtins;
  }

  /**
   * Get hover information for a position in the document
   */
  public getHover(
    document: TextDocument,
    position: Position,
    ast?: CALDocument,
    symbolTable?: SymbolTable,
    tokens?: Token[]
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
        return this.buildSymbolHover(symbol, ast);
      }
    }

    // Check for built-in function
    const builtinHover = this.getBuiltinFunctionHover(word);
    if (builtinHover) {
      return builtinHover;
    }

    // Check for keyword
    if (KEYWORDS.has(lowerWord)) {
      // Find token at cursor position for accurate disambiguation
      let tokenAtCursor: Token | undefined;
      if (tokens && tokens.length > 0) {
        const offset = document.offsetAt(position);
        tokenAtCursor = findTokenAtOffset(tokens, offset);
      }

      const keywordHoverContent = getKeywordHover(word, tokenAtCursor?.type);
      if (keywordHoverContent) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: keywordHoverContent
          }
        };
      }
    }

    return null;
  }

  /**
   * Build hover content for a symbol
   */
  private buildSymbolHover(symbol: Symbol, ast?: CALDocument): Hover {
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
      case 'function':
        // Look up full procedure declaration to get attributes
        const procedureDecl = this.findProcedureInAST(symbol.name, ast);
        if (procedureDecl) {
          content = this.buildProcedureHover(procedureDecl);
        } else {
          content += `*Procedure*`;
        }
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
   * Find a procedure declaration in the AST by name
   */
  private findProcedureInAST(name: string, ast?: CALDocument): ProcedureDeclaration | null {
    if (!ast?.object?.code?.procedures) {
      return null;
    }

    const lowerName = name.toLowerCase();
    return ast.object.code.procedures.find(
      proc => proc.name.toLowerCase() === lowerName
    ) || null;
  }

  /**
   * Build hover content for a procedure declaration with attributes
   */
  private buildProcedureHover(proc: ProcedureDeclaration): string {
    let content = '';

    // Add attributes on separate lines before the signature
    if (proc.attributes && proc.attributes.length > 0) {
      for (const attr of proc.attributes) {
        content += `\`[${attr.name}]\`\n`;
      }
    }

    // Build procedure signature
    const localPrefix = proc.isLocal ? 'LOCAL ' : '';
    const params = proc.parameters.map(p => {
      const varPrefix = p.isVar ? 'VAR ' : '';
      return `${varPrefix}${p.name}: ${p.dataType.typeName}`;
    }).join('; ');
    const returnType = proc.returnType ? ` : ${proc.returnType.typeName}` : '';

    content += `\`${localPrefix}PROCEDURE ${proc.name}(${params})${returnType}\`\n\n`;
    content += '*Procedure*';

    return content;
  }

  /**
   * Get hover information for a built-in function
   */
  private getBuiltinFunctionHover(name: string): Hover | null {
    const func = this.registry.getGlobalFunction(name);
    if (func) {
      return this.buildBuiltinHover(func);
    }

    return null;
  }

  /**
   * Get hover information for a Record method
   */
  private getRecordMethodHover(name: string): Hover | null {
    const method = this.registry.getRecordMethod(name);
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
    let content = `**${func.name}**${func.signature}\n\n*${categoryLabel}*\n\n${func.documentation}`;

    // Add deprecation warning if the function is deprecated
    if (func.deprecated) {
      content += `\n\n**Deprecated:** ${func.deprecated}`;
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content
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