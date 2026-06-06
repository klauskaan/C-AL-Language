/**
 * Unit tests for the exported applyDeprecation helper (Issue #809).
 *
 * This file will fail to COMPILE until applyDeprecation is exported from
 * completionProvider.ts — that compile failure is the intended red state.
 */

import { applyDeprecation } from '../completionProvider';
import { BuiltinFunction } from '../builtins';
import { CompletionItem, CompletionItemTag } from 'vscode-languageserver';

describe('applyDeprecation helper (Issue #809)', () => {
  it('applies Deprecated tag and appends deprecation text when func.deprecated is set', () => {
    const func: BuiltinFunction = {
      name: 'EVALUATE',
      signature: '(Variable, String [, FormatNumber]): Boolean',
      documentation: 'Doc.',
      category: 'system',
      deprecated: 'Use X instead.',
    };

    // The builder sets documentation from func immediately before calling applyDeprecation,
    // so item.documentation === func.documentation at the point of the call.
    const item: CompletionItem = {
      label: 'EVALUATE',
      documentation: func.documentation,
    };

    applyDeprecation(item, func);

    expect(item.tags).toBeDefined();
    expect(item.tags).toContain(CompletionItemTag.Deprecated);
    expect(item.documentation).toContain('**Deprecated:** Use X instead.');
  });

  it('preserves original documentation text when deprecation is appended', () => {
    const func: BuiltinFunction = {
      name: 'EVALUATE',
      signature: '(Variable, String [, FormatNumber]): Boolean',
      documentation: 'Doc.',
      category: 'system',
      deprecated: 'Use X instead.',
    };

    const item: CompletionItem = {
      label: 'EVALUATE',
      documentation: func.documentation,
    };

    applyDeprecation(item, func);

    expect(item.documentation).toContain('Doc.');
  });

  it('does not modify tags or documentation when func.deprecated is not set', () => {
    const func: BuiltinFunction = {
      name: 'EVALUATE',
      signature: '(Variable, String [, FormatNumber]): Boolean',
      documentation: 'Doc.',
      category: 'system',
    };

    const item: CompletionItem = {
      label: 'EVALUATE',
      documentation: func.documentation,
    };

    applyDeprecation(item, func);

    const hasTags = item.tags !== undefined && item.tags.length > 0;
    expect(hasTags).toBe(false);
    expect(item.documentation).toBe('Doc.');
  });
});
