/**
 * Utility to flatten hierarchical DocumentSymbol trees into SymbolInformation arrays
 * Used by both WorkspaceSymbolProvider and WorkspaceIndex
 */

import { DocumentSymbol, SymbolInformation, Location, SymbolKind } from 'vscode-languageserver';

/**
 * Flatten hierarchical DocumentSymbol tree into SymbolInformation array
 * Excludes namespace containers (FIELDS, KEYS, TRIGGERS, etc.) and object declaration
 *
 * @param symbolOrSymbols - Root DocumentSymbol or array of DocumentSymbols to flatten
 * @param uri - Document URI
 * @param containerName - Parent container name (propagated through recursion)
 * @param isRoot - Whether this is the root object declaration (should be excluded)
 * @returns Flattened array of SymbolInformation
 *
 * @example
 * const documentSymbol = {
 *   name: "Customer",
 *   kind: SymbolKind.Class,
 *   children: [
 *     {
 *       name: "FIELDS",
 *       kind: SymbolKind.Namespace,
 *       children: [
 *         { name: "No.", kind: SymbolKind.Field }
 *       ]
 *     }
 *   ]
 * };
 * flattenDocumentSymbols(documentSymbol, "file:///test.cal")
 * // => [{ name: "No.", kind: SymbolKind.Field, containerName: "FIELDS" }]
 */
export function flattenDocumentSymbols(
  symbolOrSymbols: DocumentSymbol | DocumentSymbol[],
  uri: string,
  containerName?: string,
  isRoot = true
): SymbolInformation[] {
  // Handle array input by flattening each symbol
  if (Array.isArray(symbolOrSymbols)) {
    const results: SymbolInformation[] = [];
    for (const symbol of symbolOrSymbols) {
      results.push(...flattenDocumentSymbols(symbol, uri, containerName, isRoot));
    }
    return results;
  }

  const symbol = symbolOrSymbols;
  const results: SymbolInformation[] = [];

  // Check if this is a namespace container that should be filtered out
  const isNamespaceContainer = symbol.kind === SymbolKind.Namespace;

  // Check if this is the root object declaration (Class kind)
  const isObjectDeclaration = isRoot && symbol.kind === SymbolKind.Class;

  // Add current symbol to results (unless it's a namespace or object declaration)
  if (!isNamespaceContainer && !isObjectDeclaration) {
    const symbolInfo: SymbolInformation = {
      name: symbol.name,
      kind: symbol.kind,
      location: Location.create(uri, symbol.selectionRange)
    };

    // Add container name if present
    if (containerName) {
      symbolInfo.containerName = containerName;
    }

    results.push(symbolInfo);
  }

  // Recursively process children
  if (symbol.children) {
    // Determine container name for children:
    // - If current is namespace, use namespace name as container (FIELDS, KEYS, etc.)
    // - If current is object declaration, don't set container (skip it)
    // - Otherwise, use current symbol name as new containerName
    let childContainer: string | undefined;
    if (isNamespaceContainer) {
      childContainer = symbol.name;
    } else if (isObjectDeclaration) {
      childContainer = undefined;
    } else {
      childContainer = symbol.name;
    }

    for (const child of symbol.children) {
      const childResults = flattenDocumentSymbols(child, uri, childContainer, false);
      results.push(...childResults);
    }
  }

  return results;
}
