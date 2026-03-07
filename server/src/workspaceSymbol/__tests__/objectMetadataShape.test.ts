import { ObjectMetadata } from '../workspaceIndex';

/**
 * Structural sync test for ObjectMetadata.
 *
 * ObjectMetadata is duplicated across the LSP boundary:
 *   - server/src/workspaceSymbol/workspaceIndex.ts  (this side)
 *   - src/objectExplorer/objectExplorerProvider.ts  (client side)
 *
 * This test acts as a compile-time tripwire: if you add OR remove a field on
 * the server side, TypeScript will error here because _syncCheck must have
 * exactly the fields of ObjectMetadata (no more, no less).
 *
 * To update: change _syncCheck below to match the new server interface,
 * then update src/objectExplorer/objectExplorerProvider.ts to match.
 */

// Mapped type: requires exactly all keys of ObjectMetadata — catches both
// field additions (missing key → compile error) and removals (extra key → compile error).
const _syncCheck: { [K in keyof Required<ObjectMetadata>]: K } = {
  type: 'type',
  id: 'id',
  name: 'name',
  uri: 'uri',
  line: 'line',
  date: 'date',
  time: 'time',
  modified: 'modified',
  versionList: 'versionList',
};

describe('ObjectMetadata structural sync', () => {
  it('has exactly the expected fields (update client copy if this fails)', () => {
    const fields = Object.keys(_syncCheck).sort();
    expect(fields).toEqual([
      'date',
      'id',
      'line',
      'modified',
      'name',
      'time',
      'type',
      'uri',
      'versionList',
    ]);
    expect(fields).toHaveLength(9);
  });
});
