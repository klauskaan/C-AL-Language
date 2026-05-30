/**
 * sortText bucketing for completion items.
 *
 * VS Code orders items lexicographically by sortText (falling back to label).
 * Prefixing each label with a single bucket digit clusters semantically-related
 * items and floats the user's own symbols above the ~300 language builtins, while
 * keeping alphabetical order within a bucket. The label is lowercased so ordering
 * is case-insensitive; for quoted/spaced identifiers pass the UNQUOTED bare name
 * (the embedded 0x20 space sorts naturally).
 *
 * NOTE on member access (after `.`): fields and record methods deliberately share
 * the Member bucket so they INTERLEAVE alphabetically, matching how C# presents a
 * member list (it does not segregate fields above methods).
 *
 * Known limitation: `getVisibleSymbols` flattens scope origin, so global variables
 * share the `Local` bucket with true locals/params. Still a large improvement (all
 * rank above builtins). Deferred to a later bundle.
 */
// INVARIANT: all SortBucket values must remain single-digit (0-9) — makeSortText concatenates the digit directly, so multi-digit buckets would break lexical ordering.
export const SortBucket = {
  Local: 0,    // locals, parameters (and, unavoidably, globals — see limitation)
  Member: 1,   // user procedures + table fields; AND dot-context fields + record methods
  Builtin: 2,  // global builtin functions
  Keyword: 3,  // keywords + data types
  Action: 4,   // action types / properties / property values
} as const;
export type SortBucket = (typeof SortBucket)[keyof typeof SortBucket];

export function makeSortText(bucket: SortBucket, label: string): string {
  return `${bucket}${label.toLowerCase()}`;
}
