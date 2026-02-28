/**
 * Tests for WorkspaceIndex system table seeding and userTablesIndexed flag
 *
 * These tests validate:
 * 1. WorkspaceIndex pre-seeds system/virtual table definitions on construction
 * 2. userTablesIndexed flag lifecycle (false on construction, true after markIndexingComplete, false after clear)
 * 3. System table seeding is preserved across clear() calls
 *
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceIndex } from '../workspaceIndex';

describe('WorkspaceIndex - System Table Seeding', () => {
  let workspaceIndex: WorkspaceIndex;

  beforeEach(() => {
    workspaceIndex = new WorkspaceIndex();
  });

  it('should have Integer system table (2000000026) in table registry on fresh construction', () => {
    const registry = workspaceIndex.getTableRegistry();
    expect(registry.has(2000000026)).toBe(true);
  });

  it('should have Date system table (2000000007) in table registry on fresh construction', () => {
    const registry = workspaceIndex.getTableRegistry();
    expect(registry.has(2000000007)).toBe(true);
  });

  it('should have Field system table (2000000041) in table registry on fresh construction', () => {
    const registry = workspaceIndex.getTableRegistry();
    expect(registry.has(2000000041)).toBe(true);
  });

  it('should have AllObjWithCaption system table (2000000058) in table registry on fresh construction', () => {
    const registry = workspaceIndex.getTableRegistry();
    expect(registry.has(2000000058)).toBe(true);
  });

  it('should have Date table fields in field registry on fresh construction', () => {
    const fieldRegistry = workspaceIndex.getFieldRegistry();
    const dateFields = fieldRegistry.get(2000000007);
    expect(dateFields).toBeDefined();
    expect(dateFields!.has('PERIOD START')).toBe(true);
    expect(dateFields!.has('PERIOD END')).toBe(true);
  });

  it('should have Integer table Number field in field registry on fresh construction', () => {
    const fieldRegistry = workspaceIndex.getFieldRegistry();
    const integerFields = fieldRegistry.get(2000000026);
    expect(integerFields).toBeDefined();
    expect(integerFields!.has('NUMBER')).toBe(true);
  });

  it('should have system table entries with IDs >= 2,000,000,000 only from seeding', () => {
    const registry = workspaceIndex.getTableRegistry();
    // On fresh construction (no user files indexed), all entries should be system tables
    for (const id of registry.keys()) {
      expect(id).toBeGreaterThanOrEqual(2_000_000_000);
    }
  });
});

describe('WorkspaceIndex - userTablesIndexed flag', () => {
  let tempDir: string;
  let workspaceIndex: WorkspaceIndex;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-index-flag-test-'));
    workspaceIndex = new WorkspaceIndex();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should have userTablesIndexed as false on fresh construction', () => {
    expect(workspaceIndex.userTablesIndexed).toBe(false);
  });

  it('should have userTablesIndexed as false after indexDirectory (markIndexingComplete not called)', async () => {
    await workspaceIndex.indexDirectory(tempDir);
    expect(workspaceIndex.userTablesIndexed).toBe(false);
  });

  it('should have userTablesIndexed as true only after markIndexingComplete is called', async () => {
    const tableFile = path.join(tempDir, 'Table18.cal');
    fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

    await workspaceIndex.indexDirectory(tempDir);
    expect(workspaceIndex.userTablesIndexed).toBe(false);

    workspaceIndex.markIndexingComplete();
    expect(workspaceIndex.userTablesIndexed).toBe(true);
  });

  it('should have userTablesIndexed as false after clear() is called', async () => {
    await workspaceIndex.indexDirectory(tempDir);
    workspaceIndex.markIndexingComplete();
    expect(workspaceIndex.userTablesIndexed).toBe(true);

    workspaceIndex.clear();
    expect(workspaceIndex.userTablesIndexed).toBe(false);
  });

  it('should have userTablesIndexed as true after markIndexingComplete without indexDirectory', () => {
    workspaceIndex.markIndexingComplete();
    expect(workspaceIndex.userTablesIndexed).toBe(true);
  });

  it('should re-seed system tables after clear() so Integer table is still present', () => {
    workspaceIndex.clear();
    const registry = workspaceIndex.getTableRegistry();
    expect(registry.has(2000000026)).toBe(true);
  });

  it('should re-seed system table fields after clear() so Date table Period Start is still present', () => {
    workspaceIndex.clear();
    const fieldRegistry = workspaceIndex.getFieldRegistry();
    const dateFields = fieldRegistry.get(2000000007);
    expect(dateFields).toBeDefined();
    expect(dateFields!.has('PERIOD START')).toBe(true);
  });

  it('should not expose user-indexed tables after clear() even if previously indexed', async () => {
    const tableFile = path.join(tempDir, 'Table18.cal');
    fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

    await workspaceIndex.indexDirectory(tempDir);
    expect(workspaceIndex.getTableRegistry().has(18)).toBe(true);

    workspaceIndex.clear();
    // User table should be gone, but system tables remain
    expect(workspaceIndex.getTableRegistry().has(18)).toBe(false);
    expect(workspaceIndex.getTableRegistry().has(2000000026)).toBe(true);
  });
});

describe('WorkspaceIndex - System table seed immutability', () => {
  let tempDir: string;
  let workspaceIndex: WorkspaceIndex;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-index-guard-test-'));
    workspaceIndex = new WorkspaceIndex();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should not overwrite seeded Integer table name when a workspace file declares table 2000000026', async () => {
    const seededName = workspaceIndex.getTableRegistry().get(2000000026);

    const fakeFile = path.join(tempDir, 'FakeSystemTable.cal');
    fs.writeFileSync(fakeFile, `OBJECT Table 2000000026 "Fake Integer"
{
  FIELDS
  {
    { 1   ;   ;FakeField         ;Integer       }
  }
}`);

    await workspaceIndex.add(fakeFile);

    expect(workspaceIndex.getTableRegistry().get(2000000026)).toBe(seededName);
  });

  it('should not overwrite seeded Integer table field registry when a workspace file declares table 2000000026', async () => {
    const fakeFile = path.join(tempDir, 'FakeSystemTable.cal');
    fs.writeFileSync(fakeFile, `OBJECT Table 2000000026 "Fake Integer"
{
  FIELDS
  {
    { 1   ;   ;FakeField         ;Integer       }
  }
}`);

    await workspaceIndex.add(fakeFile);

    const fields = workspaceIndex.getFieldRegistry().get(2000000026);
    expect(fields).toBeDefined();
    expect(fields!.has('NUMBER')).toBe(true);
    expect(fields!.has('FAKEFIELD')).toBe(false);
  });

  it('should still index normal user tables (ID < 2,000,000,000) from workspace files', async () => {
    const tableFile = path.join(tempDir, 'Table18.cal');
    fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

    await workspaceIndex.add(tableFile);

    expect(workspaceIndex.getTableRegistry().has(18)).toBe(true);
    expect(workspaceIndex.getTableRegistry().get(18)).toBe('Customer');
  });

  it('should leave seeded registries unchanged when add() is called twice on a system-table-ID file', async () => {
    const seededName = workspaceIndex.getTableRegistry().get(2000000026);
    const seededFields = workspaceIndex.getFieldRegistry().get(2000000026);

    const fakeFile = path.join(tempDir, 'FakeSystemTable.cal');
    fs.writeFileSync(fakeFile, `OBJECT Table 2000000026 "Fake Integer"
{
  FIELDS
  {
    { 1   ;   ;FakeField         ;Integer       }
  }
}`);

    await workspaceIndex.add(fakeFile);
    await workspaceIndex.add(fakeFile);

    expect(workspaceIndex.getTableRegistry().get(2000000026)).toBe(seededName);
    const fields = workspaceIndex.getFieldRegistry().get(2000000026);
    expect(fields).toBe(seededFields);
    expect(fields!.has('NUMBER')).toBe(true);
    expect(fields!.has('FAKEFIELD')).toBe(false);
  });

  it('should not delete seeded registry entries when remove() is called on a system-table-ID file', async () => {
    const fakeFile = path.join(tempDir, 'FakeSystemTable.cal');
    fs.writeFileSync(fakeFile, `OBJECT Table 2000000026 "Fake Integer"
{
  FIELDS
  {
    { 1   ;   ;FakeField         ;Integer       }
  }
}`);

    await workspaceIndex.add(fakeFile);
    workspaceIndex.remove(fakeFile);

    expect(workspaceIndex.getTableRegistry().get(2000000026)).toBeDefined();
    const fields = workspaceIndex.getFieldRegistry().get(2000000026);
    expect(fields).toBeDefined();
    expect(fields!.has('NUMBER')).toBe(true);
  });
});
