/**
 * Tests for WorkspaceIndex.getObjectList() and ObjectMetadata interface.
 *
 * These tests verify that getObjectList() returns per-object metadata
 * (type, id, name, uri, line) for all indexed files, supporting Object Explorer.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pathToFileURL } from 'url';
import { WorkspaceIndex } from '../workspaceIndex';

describe('WorkspaceIndex.getObjectList', () => {
  let tempDir: string;
  let workspaceIndex: WorkspaceIndex;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-index-objectlist-test-'));
    workspaceIndex = new WorkspaceIndex();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('empty index', () => {
    it('should return an empty array when no files are indexed', () => {
      const result = workspaceIndex.getObjectList();

      expect(result).toEqual([]);
    });
  });

  describe('single-object file', () => {
    it('should return one entry with correct type for a Table object', async () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Table');
    });

    it('should return one entry with correct id for a Table object', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(18);
    });

    it('should return one entry with correct name for a Table object', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Customer');
    });

    it('should return one entry with correct uri matching pathToFileURL', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      expect(result[0].uri).toBe(pathToFileURL(filePath).href);
    });

    it('should return line 0 when the OBJECT declaration is on the first line', async () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      // OBJECT keyword is on the first line of the file — 0-based index is 0
      expect(result[0].line).toBe(0);
    });

    it('should return correct metadata for a Codeunit object', async () => {
      const filePath = path.join(tempDir, 'Codeunit50000.cal');
      fs.writeFileSync(filePath, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.type).toBe('Codeunit');
      expect(entry.id).toBe(50000);
      expect(entry.name).toBe('Utils');
    });

    it('should return correct metadata for a Page object', async () => {
      const filePath = path.join(tempDir, 'Page21.cal');
      fs.writeFileSync(filePath, `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const entry = result.find(e => e.type === 'Page');
      expect(entry).toBeDefined();
      expect(entry!.id).toBe(21);
      expect(entry!.name).toBe('Customer Card');
    });

    it('should not populate optional date/time/modified/versionList fields', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.date).toBeUndefined();
      expect(entry.time).toBeUndefined();
      expect(entry.modified).toBeUndefined();
      expect(entry.versionList).toBeUndefined();
    });
  });

  describe('multi-object file (two OBJECT blocks in one file)', () => {
    it('should return two entries when a file contains two OBJECT blocks', async () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const filePath = path.join(tempDir, 'MultiObject.cal');
      // OBJECT Table 18 Customer starts at line 0 (0-based)
      // OBJECT Codeunit 50000 Utils starts at line 7 (0-based), after closing } and blank line
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(2);
    });

    it('should assign the same uri to both entries from a multi-object file', async () => {
      const filePath = path.join(tempDir, 'MultiObject.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const expectedUri = pathToFileURL(filePath).href;
      for (const entry of result) {
        expect(entry.uri).toBe(expectedUri);
      }
    });

    it('should return the Table entry on line 0 and the Codeunit entry on a later line', async () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const filePath = path.join(tempDir, 'MultiObject.cal');
      // Line 0: OBJECT Table 18 Customer
      // Line 1: {
      // Line 2:   FIELDS
      // Line 3:   {
      // Line 4:     { 1   ;   ;"No."             ;Code20        }
      // Line 5:   }
      // Line 6: }
      // Line 7: OBJECT Codeunit 50000 Utils
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const tableEntry = result.find(e => e.type === 'Table');
      const codeunitEntry = result.find(e => e.type === 'Codeunit');

      expect(tableEntry).toBeDefined();
      expect(codeunitEntry).toBeDefined();
      // Table OBJECT declaration is on the very first line — 0-based index 0
      expect(tableEntry!.line).toBe(0);
      // Codeunit OBJECT declaration follows the closing } of the Table, no blank line
      expect(codeunitEntry!.line).toBe(7);
    });

    it('should return correct type, id, and name for each entry in a multi-object file', async () => {
      const filePath = path.join(tempDir, 'MultiObject.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const tableEntry = result.find(e => e.type === 'Table');
      const codeunitEntry = result.find(e => e.type === 'Codeunit');

      expect(tableEntry).toBeDefined();
      expect(tableEntry!.id).toBe(18);
      expect(tableEntry!.name).toBe('Customer');

      expect(codeunitEntry).toBeDefined();
      expect(codeunitEntry!.id).toBe(50000);
      expect(codeunitEntry!.name).toBe('Utils');
    });
  });

  describe('multiple files', () => {
    it('should return one entry per object across multiple files', async () => {
      const file1 = path.join(tempDir, 'Table18.cal');
      const file2 = path.join(tempDir, 'Page21.cal');
      const file3 = path.join(tempDir, 'Codeunit50000.cal');

      fs.writeFileSync(file1, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      fs.writeFileSync(file2, `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
  }
}`);
      fs.writeFileSync(file3, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(file1);
      await workspaceIndex.add(file2);
      await workspaceIndex.add(file3);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(3);
    });

    it('should include entries from all indexed files with correct uris', async () => {
      const file1 = path.join(tempDir, 'Table18.cal');
      const file2 = path.join(tempDir, 'Codeunit50000.cal');

      fs.writeFileSync(file1, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      fs.writeFileSync(file2, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(file1);
      await workspaceIndex.add(file2);

      const result = workspaceIndex.getObjectList();
      const tableEntry = result.find(e => e.type === 'Table');
      const codeunitEntry = result.find(e => e.type === 'Codeunit');

      expect(tableEntry).toBeDefined();
      expect(tableEntry!.uri).toBe(pathToFileURL(file1).href);

      expect(codeunitEntry).toBeDefined();
      expect(codeunitEntry!.uri).toBe(pathToFileURL(file2).href);
    });
  });

  describe('remove()', () => {
    it('should remove all entries for a file after remove() is called', async () => {
      const file1 = path.join(tempDir, 'Table18.cal');
      const file2 = path.join(tempDir, 'Codeunit50000.cal');

      fs.writeFileSync(file1, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      fs.writeFileSync(file2, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(file1);
      await workspaceIndex.add(file2);

      workspaceIndex.remove(file1);

      const result = workspaceIndex.getObjectList();
      const tableEntry = result.find(e => e.type === 'Table');
      expect(tableEntry).toBeUndefined();
    });

    it('should keep entries from other files after remove() removes one file', async () => {
      const file1 = path.join(tempDir, 'Table18.cal');
      const file2 = path.join(tempDir, 'Codeunit50000.cal');

      fs.writeFileSync(file1, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      fs.writeFileSync(file2, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(file1);
      await workspaceIndex.add(file2);

      workspaceIndex.remove(file1);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      const codeunitEntry = result.find(e => e.type === 'Codeunit');
      expect(codeunitEntry).toBeDefined();
      expect(codeunitEntry!.id).toBe(50000);
    });

    it('should remove all entries for a multi-object file after remove()', async () => {
      const filePath = path.join(tempDir, 'MultiObject.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const beforeRemove = workspaceIndex.getObjectList();
      expect(beforeRemove).toHaveLength(2);

      workspaceIndex.remove(filePath);

      const afterRemove = workspaceIndex.getObjectList();
      expect(afterRemove).toHaveLength(0);
    });
  });

  describe('OBJECT-PROPERTIES fields', () => {
    it('should populate all four fields from a complete OBJECT-PROPERTIES section', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Time=12:00:00;
    Modified=Yes;
    Version List=NAVW114.00,NAVDK14.00;
  }
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.date).toBe('24-03-19');
      expect(entry.time).toBe('12:00:00');
      expect(entry.modified).toBe(true);
      expect(entry.versionList).toBe('NAVW114.00,NAVDK14.00');
    });

    it('should populate only present fields from a partial OBJECT-PROPERTIES section', async () => {
      const filePath = path.join(tempDir, 'Codeunit50000.cal');
      fs.writeFileSync(filePath, `OBJECT Codeunit 50000 Utils
{
  OBJECT-PROPERTIES
  {
    Date=01-01-20;
    Modified=No;
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.date).toBe('01-01-20');
      expect(entry.modified).toBe(false);
      expect(entry.time).toBeUndefined();
      expect(entry.versionList).toBeUndefined();
    });

    it('should set modified=false when Modified=No in OBJECT-PROPERTIES', async () => {
      const filePath = path.join(tempDir, 'Page21.cal');
      fs.writeFileSync(filePath, `OBJECT Page 21 Customer Card
{
  OBJECT-PROPERTIES
  {
    Modified=No;
  }
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const entry = result.find(e => e.type === 'Page');
      expect(entry).toBeDefined();
      expect(entry!.modified).toBe(false);
      expect(entry!.date).toBeUndefined();
      expect(entry!.time).toBeUndefined();
      expect(entry!.versionList).toBeUndefined();
    });

    it('should set versionList to empty string when Version List= has an empty value', async () => {
      const filePath = path.join(tempDir, 'Table19.cal');
      fs.writeFileSync(filePath, `OBJECT Table 19 Item
{
  OBJECT-PROPERTIES
  {
    Version List=;
  }
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const entry = result.find(e => e.id === 19);
      expect(entry).toBeDefined();
      expect(entry!.versionList).toBe('');
    });

    it('should match objectProperties to the correct type when both type and id are checked', async () => {
      // The find() predicate uses both id and type (m.id === objectId && m.type === objectKind).
      // This guards against a future multi-object parser where two objects with the same id
      // but different types could coexist. This test exercises the type===objectKind branch
      // for a non-Table object (Codeunit 50000).
      const filePath = path.join(tempDir, 'Codeunit50000.cal');
      fs.writeFileSync(filePath, `OBJECT Codeunit 50000 TypeIdMatch
{
  OBJECT-PROPERTIES
  {
    Date=15-06-21;
    Version List=TEST;
  }
  CODE
  {
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const entry = result.find(e => e.type === 'Codeunit' && e.id === 50000);
      expect(entry).toBeDefined();
      expect(entry!.date).toBe('15-06-21');
      expect(entry!.versionList).toBe('TEST');
    });

    it('should populate objectProperties for the second object in a multi-object file', async () => {
      const filePath = path.join(tempDir, 'MultiObjectWithProps.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Time=12:00:00;
    Modified=Yes;
    Version List=NAVW114.00;
  }
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  OBJECT-PROPERTIES
  {
    Date=01-06-21;
    Time=09:30:00;
    Modified=No;
    Version List=NAVDK14.00;
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(2);

      const tableEntry = result.find(e => e.type === 'Table');
      const codeunitEntry = result.find(e => e.type === 'Codeunit');

      expect(tableEntry).toBeDefined();
      expect(tableEntry!.date).toBe('24-03-19');
      expect(tableEntry!.time).toBe('12:00:00');
      expect(tableEntry!.modified).toBe(true);
      expect(tableEntry!.versionList).toBe('NAVW114.00');

      expect(codeunitEntry).toBeDefined();
      expect(codeunitEntry!.date).toBe('01-06-21');
      expect(codeunitEntry!.time).toBe('09:30:00');
      expect(codeunitEntry!.modified).toBe(false);
      expect(codeunitEntry!.versionList).toBe('NAVDK14.00');
    });
  });

  describe('objectProperties chunk parse error handling', () => {
    it('should preserve first object indexing when chunk parse throws for second object', async () => {
      const filePath = path.join(tempDir, 'MultiObjectChunkError.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Version List=NAVW114.00;
  }
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}
OBJECT Codeunit 50000 Utils
{
  OBJECT-PROPERTIES
  {
    Date=01-06-21;
    Version List=NAVDK14.00;
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Import Parser to spy on it
      const { Parser } = await import('../../parser/parser');
      const originalParse = Parser.prototype.parse;
      let callCount = 0;
      const parseSpy = jest.spyOn(Parser.prototype, 'parse').mockImplementation(function (this: InstanceType<typeof Parser>) {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated chunk parse failure');
        }
        return originalParse.call(this);
      });

      try {
        await workspaceIndex.add(filePath);
      } finally {
        parseSpy.mockRestore();
      }

      const result = workspaceIndex.getObjectList();

      // Both entries must be present (regex scan is unaffected by parse failure)
      expect(result).toHaveLength(2);

      const tableEntry = result.find(e => e.type === 'Table');
      const codeunitEntry = result.find(e => e.type === 'Codeunit');

      // First object: fully indexed
      expect(tableEntry).toBeDefined();
      expect(tableEntry!.date).toBe('24-03-19');
      expect(tableEntry!.versionList).toBe('NAVW114.00');

      // Second object: entry exists but objectProperties skipped due to parse failure
      expect(codeunitEntry).toBeDefined();
      expect(codeunitEntry!.date).toBeUndefined();
      expect(codeunitEntry!.versionList).toBeUndefined();
    });
  });

  describe('objectPattern regex boundary behaviour', () => {
    it('should parse a normal OBJECT declaration correctly (regression guard)', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Table');
      expect(result[0].id).toBe(18);
      expect(result[0].name).toBe('Customer');
    });

    it('should correctly parse an OBJECT declaration from a file with CRLF line endings', async () => {
      // NAV exports use Windows OEM codepages and CRLF line endings.
      // In JavaScript, . does not match \r (CR is a LineTerminator per ECMAScript spec),
      // so (.*?) also never captures \r. The [^\r\n]*? change is explicit defense-in-depth
      // that makes the intent visible to future readers, not a fix for an active bug.
      // This test confirms CRLF files are indexed correctly.
      const filePath = path.join(tempDir, 'Table18Crlf.cal');
      // Build the content with explicit CRLF line endings
      const content = [
        'OBJECT Table 18 Customer',
        '{',
        '  FIELDS',
        '  {',
        '    { 1   ;   ;"No."             ;Code20        }',
        '  }',
        '}',
      ].join('\r\n');
      fs.writeFileSync(filePath, content);

      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      // Name must be exactly 'Customer' — no trailing \r
      expect(result[0].name).toBe('Customer');
    });
  });

  describe('re-indexing replaces previous entries', () => {
    it('should not append entries when the same file is re-indexed', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(filePath);
      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
    });

    it('should reflect updated content after re-indexing the same file path with different content', async () => {
      const filePath = path.join(tempDir, 'Object.cal');

      // First index: Table 18
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      await workspaceIndex.add(filePath);

      // Overwrite with different content: Page 21
      fs.writeFileSync(filePath, `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
  }
}`);
      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.type).toBe('Page');
      expect(entry.id).toBe(21);
      expect(entry.name).toBe('Customer Card');
    });

    it('should not contain old entries after re-indexing replaces file content', async () => {
      const filePath = path.join(tempDir, 'Object.cal');

      // First: Table 18
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      await workspaceIndex.add(filePath);

      // Then: Page 21 (different object type, same file)
      fs.writeFileSync(filePath, `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
  }
}`);
      await workspaceIndex.add(filePath);

      const result = workspaceIndex.getObjectList();
      const tableEntry = result.find(e => e.type === 'Table');
      expect(tableEntry).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should wipe all object metadata so getObjectList() returns empty', async () => {
      const filePath = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(filePath, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);
      await workspaceIndex.add(filePath);
      expect(workspaceIndex.getObjectList()).toHaveLength(1);

      workspaceIndex.clear();

      expect(workspaceIndex.getObjectList()).toHaveLength(0);
    });
  });
});
