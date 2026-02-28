/**
 * Tests for WorkspaceIndex system table seeding and userTablesIndexed flag
 *
 * These tests validate:
 * 1. WorkspaceIndex pre-seeds system/virtual table definitions on construction
 * 2. userTablesIndexed flag lifecycle (false on construction, true after indexDirectory, false after clear)
 * 3. System table seeding is preserved across clear() calls
 *
 * These tests FAIL before implementation because:
 * - seedSystemTables() does not exist yet
 * - userTablesIndexed property does not exist yet
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

  it('should have userTablesIndexed as true after indexDirectory completes on empty directory', async () => {
    await workspaceIndex.indexDirectory(tempDir);
    expect(workspaceIndex.userTablesIndexed).toBe(true);
  });

  it('should have userTablesIndexed as true after indexDirectory completes with files', async () => {
    const tableFile = path.join(tempDir, 'Table18.cal');
    fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

    await workspaceIndex.indexDirectory(tempDir);
    expect(workspaceIndex.userTablesIndexed).toBe(true);
  });

  it('should have userTablesIndexed as false after clear() is called', async () => {
    await workspaceIndex.indexDirectory(tempDir);
    expect(workspaceIndex.userTablesIndexed).toBe(true);

    workspaceIndex.clear();
    expect(workspaceIndex.userTablesIndexed).toBe(false);
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
