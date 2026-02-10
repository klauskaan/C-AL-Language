/**
 * DocumentSymbol provider for C/AL language server
 * Populates the VS Code Outline view with document structure
 */

import { DocumentSymbol, SymbolKind, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CALDocument,
  ObjectDeclaration,
  FieldSection,
  KeySection,
  CodeSection,
  FieldDeclaration,
  KeyDeclaration,
  ProcedureDeclaration,
  TriggerDeclaration,
  VariableDeclaration
} from '../parser/ast';
import { ProviderBase } from '../providers/providerBase';
import { ASTVisitor } from '../visitor/astVisitor';
import { ASTWalker } from '../visitor/astWalker';
import { Token, TokenType } from '../lexer/tokens';
import { formatAttributeTokenValue } from '../shared/attributeFormat';

/**
 * Visitor that collects document symbols in a hierarchical structure
 */
class DocumentSymbolCollectorVisitor implements Partial<ASTVisitor> {
  /** Root symbol (the object declaration) */
  public root: DocumentSymbol | null = null;

  /** Current container for adding child symbols */
  private currentContainer: DocumentSymbol | null = null;

  /** Group containers for Fields, Keys, Triggers, Procedures */
  private fieldsGroup: DocumentSymbol | null = null;
  private keysGroup: DocumentSymbol | null = null;
  private triggersGroup: DocumentSymbol | null = null;
  private proceduresGroup: DocumentSymbol | null = null;
  private variablesGroup: DocumentSymbol | null = null;

  /**
   * Visit object declaration - creates the root symbol
   */
  visitObjectDeclaration(node: ObjectDeclaration): void | false {
    this.root = this.createSymbol(
      `${node.objectKind} ${node.objectId} "${node.objectName}"`,
      SymbolKind.Class,
      node.startToken,
      node.endToken
    );
    this.root.children = [];
    this.currentContainer = this.root;
  }

  /**
   * Visit field section - creates a "Fields" group
   */
  visitFieldSection(node: FieldSection): void | false {
    if (!this.root) return;

    this.fieldsGroup = this.createSymbol(
      'FIELDS',
      SymbolKind.Namespace,
      node.startToken,
      node.endToken
    );
    this.fieldsGroup.children = [];
    this.pushChild(this.root, this.fieldsGroup);
  }

  /**
   * Visit key section - creates a "Keys" group
   */
  visitKeySection(node: KeySection): void | false {
    if (!this.root) return;

    this.keysGroup = this.createSymbol(
      'KEYS',
      SymbolKind.Namespace,
      node.startToken,
      node.endToken
    );
    this.keysGroup.children = [];
    this.pushChild(this.root, this.keysGroup);
  }

  /**
   * Visit code section - creates groups for Variables, Triggers, and Procedures
   */
  visitCodeSection(node: CodeSection): void | false {
    if (!this.root) return;

    // Create global variables group if there are any
    if (node.variables.length > 0) {
      this.variablesGroup = this.createSymbol(
        'VAR',
        SymbolKind.Namespace,
        node.startToken,
        node.endToken
      );
      this.variablesGroup.children = [];
      this.pushChild(this.root, this.variablesGroup);
    }

    // Create triggers group if there are any
    if (node.triggers.length > 0) {
      this.triggersGroup = this.createSymbol(
        'TRIGGERS',
        SymbolKind.Namespace,
        node.startToken,
        node.endToken
      );
      this.triggersGroup.children = [];
      this.pushChild(this.root, this.triggersGroup);
    }

    // Create procedures group if there are any
    if (node.procedures.length > 0) {
      this.proceduresGroup = this.createSymbol(
        'PROCEDURES',
        SymbolKind.Namespace,
        node.startToken,
        node.endToken
      );
      this.proceduresGroup.children = [];
      this.pushChild(this.root, this.proceduresGroup);
    }
  }

  /**
   * Visit field declaration - adds field to Fields group
   */
  visitFieldDeclaration(node: FieldDeclaration): void | false {
    if (!this.fieldsGroup || !node.startToken) return;

    const fieldName = node.fieldName || `Field ${node.fieldNo}`;
    const typeName = node.dataType ? this.formatDataType(node.dataType.typeName, node.dataType.length) : '';
    const symbol = this.createSymbol(
      `${node.fieldNo} "${fieldName}"`,
      SymbolKind.Field,
      node.startToken,
      node.endToken,
      typeName
    );
    this.pushChild(this.fieldsGroup, symbol);
  }

  /**
   * Visit key declaration - adds key to Keys group
   */
  visitKeyDeclaration(node: KeyDeclaration): void | false {
    if (!this.keysGroup || !node.startToken) return;

    const keyName = node.fields?.join(', ') || '(unnamed key)';
    // Skip if name is empty (VS Code requires non-empty names)
    if (!keyName.trim()) return;

    const symbol = this.createSymbol(
      keyName,
      SymbolKind.Key,
      node.startToken,
      node.endToken
    );
    this.pushChild(this.keysGroup, symbol);
  }

  /**
   * Visit procedure declaration - adds procedure to Procedures group
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): void | false {
    if (!this.proceduresGroup || !node.startToken || !node.name) return;

    // Build attribute prefix if attributes present
    let attributePrefix = '';
    if (node.attributes && node.attributes.length > 0) {
      attributePrefix = node.attributes.map(a => {
        const args = a.rawTokens.map(t => formatAttributeTokenValue(t)).join('');
        return `[${a.name}${args}]`;
      }).join(' ') + ' ';
    }

    // Build signature
    const params = (node.parameters || []).map(p => {
      const prefix = p.isVar ? 'VAR ' : '';
      return `${prefix}${p.name || '?'}: ${p.dataType?.typeName || '?'}`;
    }).join('; ');

    const returnType = node.returnType ? ` : ${node.returnType.typeName}` : '';
    const localPrefix = node.isLocal ? 'LOCAL ' : '';
    const name = `${attributePrefix}${localPrefix}${node.name}(${params})${returnType}`;

    const symbol = this.createSymbol(
      name,
      SymbolKind.Method,
      node.startToken,
      node.endToken
    );
    this.pushChild(this.proceduresGroup, symbol);

    // Skip children - we don't want to show local variables in the outline
    return false;
  }

  /**
   * Visit trigger declaration - adds trigger to Triggers group
   */
  visitTriggerDeclaration(node: TriggerDeclaration): void | false {
    if (!this.triggersGroup || !node.startToken || !node.name) return;

    const symbol = this.createSymbol(
      node.name,
      SymbolKind.Event,
      node.startToken,
      node.endToken
    );
    this.pushChild(this.triggersGroup, symbol);

    // Skip children - we don't want to show local variables in the outline
    return false;
  }

  /**
   * Visit variable declaration - adds to global Variables group only
   * (local variables are skipped by returning false from procedure/trigger visitors)
   */
  visitVariableDeclaration(node: VariableDeclaration): void | false {
    if (!this.variablesGroup || !node.startToken || !node.name) return;

    const typeName = node.dataType ? this.formatDataType(node.dataType.typeName, node.dataType.length) : '';
    const symbol = this.createSymbol(
      node.name,
      SymbolKind.Variable,
      node.startToken,
      node.endToken,
      typeName
    );
    this.pushChild(this.variablesGroup, symbol);
  }

  /**
   * Format a data type with optional length
   * Handles both embedded sizes (Code20) and separate length (Code, 20)
   */
  private formatDataType(typeName: string, length?: number): string {
    if (length !== undefined) {
      // Check if typeName already contains the size (e.g., Code20)
      // If it does, extract the base type and format with brackets
      const sizeMatch = typeName.match(/^([A-Za-z]+)(\d+)$/);
      if (sizeMatch) {
        const baseType = sizeMatch[1];
        // If the extracted size matches our length, use just base type with brackets
        const extractedSize = parseInt(sizeMatch[2], 10);
        if (extractedSize === length) {
          return `${baseType}[${length}]`;
        }
      }
      // Otherwise, just append the brackets
      return `${typeName}[${length}]`;
    }
    return typeName;
  }

  /**
   * Create a DocumentSymbol from token positions
   * @param name - Display name
   * @param kind - Symbol kind
   * @param startToken - Start token (1-based positions)
   * @param endToken - End token (1-based positions)
   * @param detail - Optional detail string (e.g., type)
   */
  private createSymbol(
    name: string,
    kind: SymbolKind,
    startToken: Token,
    endToken: Token,
    detail?: string
  ): DocumentSymbol {
    // Defensive: use startToken as fallback if endToken is missing
    const effectiveEndToken = endToken || startToken;

    // Convert from 1-based (token) to 0-based (LSP)
    const range: Range = {
      start: { line: startToken.line - 1, character: startToken.column - 1 },
      end: { line: effectiveEndToken.line - 1, character: effectiveEndToken.column - 1 + (effectiveEndToken.value?.length || 1) }
    };

    // Selection range is just the start token (for clicking in outline)
    const selectionRange: Range = {
      start: { line: startToken.line - 1, character: startToken.column - 1 },
      end: { line: startToken.line - 1, character: startToken.column - 1 + (startToken.value?.length || 1) }
    };

    const symbol: DocumentSymbol = {
      name,
      kind,
      range,
      selectionRange
    };

    if (detail) {
      symbol.detail = detail;
    }

    return symbol;
  }

  /**
   * Safely push a child symbol to a parent's children array.
   * Initializes children array if undefined (lazy initialization).
   * This preserves the LSP convention where leaf symbols have undefined children.
   */
  private pushChild(parent: DocumentSymbol, child: DocumentSymbol): void {
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(child);
  }
}

/**
 * DocumentSymbol provider class
 * Provides document outline for C/AL files
 */
export class DocumentSymbolProvider extends ProviderBase {
  /** Shared ASTWalker instance (stateless, can be reused) */
  private readonly walker = new ASTWalker();

  /**
   * Get document symbols for a C/AL document
   *
   * @param document - The text document
   * @param ast - The parsed AST
   * @returns Array of DocumentSymbol items (hierarchical)
   */
  public getDocumentSymbols(document: TextDocument, ast: CALDocument): DocumentSymbol[] {
    // Collect symbols using visitor pattern
    const visitor = new DocumentSymbolCollectorVisitor();
    this.walker.walk(ast, visitor);

    // Return root symbol wrapped in array (or empty if no object found)
    if (visitor.root) {
      return [visitor.root];
    }
    return [];
  }
}
