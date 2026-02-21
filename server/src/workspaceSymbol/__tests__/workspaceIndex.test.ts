/**
 * Tests for WorkspaceIndex class
 *
 * The WorkspaceIndex discovers .cal files in a workspace and pre-computes their symbols
 * for fast workspace symbol search (Ctrl+T).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceIndex } from '../workspaceIndex';
import { SymbolKind, SymbolInformation } from 'vscode-languageserver';

describe('WorkspaceIndex', () => {
  let tempDir: string;
  let workspaceIndex: WorkspaceIndex;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-index-test-'));
    workspaceIndex = new WorkspaceIndex();
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('File Discovery', () => {
    it('should discover .cal files in directory', async () => {
      // Create test files
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
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`);

      await workspaceIndex.indexDirectory(tempDir);

      expect(workspaceIndex.fileCount).toBe(2);
      expect(workspaceIndex.has(file1)).toBe(true);
      expect(workspaceIndex.has(file2)).toBe(true);
    });

    it('should skip non-.cal files', async () => {
      // Create mixed files
      const calFile = path.join(tempDir, 'Test.cal');
      const txtFile = path.join(tempDir, 'Readme.txt');
      const jsFile = path.join(tempDir, 'script.js');

      fs.writeFileSync(calFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);
      fs.writeFileSync(txtFile, 'This is a text file');
      fs.writeFileSync(jsFile, 'console.log("test");');

      await workspaceIndex.indexDirectory(tempDir);

      expect(workspaceIndex.fileCount).toBe(1);
      expect(workspaceIndex.has(calFile)).toBe(true);
      expect(workspaceIndex.has(txtFile)).toBe(false);
      expect(workspaceIndex.has(jsFile)).toBe(false);
    });

    it('should handle empty directory', async () => {
      await workspaceIndex.indexDirectory(tempDir);

      expect(workspaceIndex.fileCount).toBe(0);
      expect(workspaceIndex.symbolCount).toBe(0);
    });

    it('should discover .cal files in subdirectories', async () => {
      // Create nested structure
      const subDir = path.join(tempDir, 'Tables');
      fs.mkdirSync(subDir);

      const rootFile = path.join(tempDir, 'Codeunit1.cal');
      const subFile = path.join(subDir, 'Table18.cal');

      fs.writeFileSync(rootFile, `OBJECT Codeunit 1 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`);
      fs.writeFileSync(subFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      await workspaceIndex.indexDirectory(tempDir);

      expect(workspaceIndex.fileCount).toBe(2);
      expect(workspaceIndex.has(rootFile)).toBe(true);
      expect(workspaceIndex.has(subFile)).toBe(true);
    });

    it('should handle directory with only non-.cal files', async () => {
      fs.writeFileSync(path.join(tempDir, 'readme.md'), '# Readme');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');

      await workspaceIndex.indexDirectory(tempDir);

      expect(workspaceIndex.fileCount).toBe(0);
      expect(workspaceIndex.symbolCount).toBe(0);
    });
  });

  describe('Symbol Extraction', () => {
    it('should extract symbols from indexed file', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`);

      await workspaceIndex.indexDirectory(tempDir);

      const symbols = workspaceIndex.getAllSymbols();

      // Should have 2 field symbols (FIELDS namespace excluded)
      // Symbol names include field number: '1 "No."', '2 "Name"'
      expect(symbols.length).toBe(2);
      expect(symbols.some((s: SymbolInformation) => s.name.includes('No.'))).toBe(true);
      expect(symbols.some((s: SymbolInformation) => s.name.includes('Name'))).toBe(true);
      expect(symbols.every((s: SymbolInformation) => s.kind === SymbolKind.Field)).toBe(true);
    });

    it('should extract symbols from multiple files', async () => {
      const file1 = path.join(tempDir, 'Table18.cal');
      const file2 = path.join(tempDir, 'Codeunit50000.cal');

      fs.writeFileSync(file1, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);
      fs.writeFileSync(file2, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`);

      await workspaceIndex.indexDirectory(tempDir);

      const symbols = workspaceIndex.getAllSymbols();

      expect(symbols.length).toBe(2);
      expect(symbols.some((s: SymbolInformation) => s.name.includes('Value') && s.kind === SymbolKind.Field)).toBe(true);
      expect(symbols.some((s: SymbolInformation) => s.name.includes('TestProc') && s.kind === SymbolKind.Method)).toBe(true);
    });

    it('should handle parse errors gracefully', async () => {
      const validFile = path.join(tempDir, 'Valid.cal');
      const invalidFile = path.join(tempDir, 'Invalid.cal');

      fs.writeFileSync(validFile, `OBJECT Table 18 Valid
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);
      fs.writeFileSync(invalidFile, `OBJECT Table 19 Broken
{
  FIELDS
  {
    { 1   ;   ;Value
    // Missing type and closing
`);

      await workspaceIndex.indexDirectory(tempDir);

      // Should index valid file despite errors in invalid file
      const symbols = workspaceIndex.getAllSymbols();
      expect(symbols.some((s: SymbolInformation) => s.name.includes('Value'))).toBe(true);
    });

    it('should extract symbols with correct URI locations', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`);

      await workspaceIndex.indexDirectory(tempDir);

      const symbols = workspaceIndex.getAllSymbols();
      const procSymbol = symbols.find((s: SymbolInformation) => s.name.includes('MyProc'));

      expect(procSymbol).toBeDefined();
      expect(procSymbol!.location.uri).toContain('Test.cal');
      expect(procSymbol!.location.uri).toContain(tempDir);
    });
  });

  describe('Entry Management', () => {
    it('should add new file entry', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      await workspaceIndex.add(testFile);

      expect(workspaceIndex.has(testFile)).toBe(true);
      expect(workspaceIndex.fileCount).toBe(1);
      expect(workspaceIndex.symbolCount).toBe(1);
    });

    it('should remove file entry', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      await workspaceIndex.add(testFile);
      expect(workspaceIndex.has(testFile)).toBe(true);

      workspaceIndex.remove(testFile);

      expect(workspaceIndex.has(testFile)).toBe(false);
      expect(workspaceIndex.fileCount).toBe(0);
      expect(workspaceIndex.symbolCount).toBe(0);
    });

    it('should update existing file entry', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      await workspaceIndex.add(testFile);
      const initialSymbolCount = workspaceIndex.symbolCount;

      // Update file with more symbols
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
    { 2   ;   ;Name            ;Text100       }
  }
}`);

      await workspaceIndex.add(testFile);

      expect(workspaceIndex.has(testFile)).toBe(true);
      expect(workspaceIndex.fileCount).toBe(1);
      expect(workspaceIndex.symbolCount).toBeGreaterThan(initialSymbolCount);
    });

    it('should handle removing non-existent file', () => {
      const nonExistentFile = path.join(tempDir, 'DoesNotExist.cal');

      // Should not throw
      expect(() => {
        workspaceIndex.remove(nonExistentFile);
      }).not.toThrow();

      expect(workspaceIndex.fileCount).toBe(0);
    });
  });

  describe('Race Condition Handling (updateIfNotFresher)', () => {
    it('should reject stale updates when file has newer timestamp', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      // Initial index
      await workspaceIndex.add(testFile);
      const initialSymbolCount = workspaceIndex.symbolCount;

      // Simulate stale update with old timestamp
      const staleTimestamp = Date.now() - 10000; // 10 seconds ago
      const wasUpdated = await workspaceIndex.updateIfNotFresher(testFile, staleTimestamp);

      expect(wasUpdated).toBe(false);
      expect(workspaceIndex.symbolCount).toBe(initialSymbolCount);
    });

    it('should accept update when file has older or equal timestamp', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update with current timestamp (should be accepted)
      const currentTimestamp = Date.now();
      const wasUpdated = await workspaceIndex.updateIfNotFresher(testFile, currentTimestamp);

      expect(wasUpdated).toBe(true);
      expect(workspaceIndex.has(testFile)).toBe(true);
    });

    it('should handle first-time index via updateIfNotFresher', async () => {
      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`);

      // First update should always succeed
      const wasUpdated = await workspaceIndex.updateIfNotFresher(testFile, Date.now());

      expect(wasUpdated).toBe(true);
      expect(workspaceIndex.has(testFile)).toBe(true);
      expect(workspaceIndex.symbolCount).toBe(1);
    });
  });

  describe('Properties', () => {
    it('should return correct fileCount', async () => {
      expect(workspaceIndex.fileCount).toBe(0);

      const file1 = path.join(tempDir, 'File1.cal');
      const file2 = path.join(tempDir, 'File2.cal');
      fs.writeFileSync(file1, 'OBJECT Table 18 Test\n{\n}');
      fs.writeFileSync(file2, 'OBJECT Table 19 Test2\n{\n}');

      await workspaceIndex.add(file1);
      expect(workspaceIndex.fileCount).toBe(1);

      await workspaceIndex.add(file2);
      expect(workspaceIndex.fileCount).toBe(2);

      workspaceIndex.remove(file1);
      expect(workspaceIndex.fileCount).toBe(1);
    });

    it('should return correct symbolCount', async () => {
      expect(workspaceIndex.symbolCount).toBe(0);

      const testFile = path.join(tempDir, 'Test.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Field1          ;Integer       }
    { 2   ;   ;Field2          ;Integer       }
    { 3   ;   ;Field3          ;Integer       }
  }
}`);

      await workspaceIndex.add(testFile);

      expect(workspaceIndex.symbolCount).toBe(3);
    });
  });

  describe('Encoding Support', () => {
    it('should handle UTF-8 encoded files', async () => {
      const testFile = path.join(tempDir, 'UTF8.cal');
      fs.writeFileSync(testFile, `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Størrelse       ;Integer       }
  }
}`, 'utf8');

      await workspaceIndex.indexDirectory(tempDir);

      const symbols = workspaceIndex.getAllSymbols();
      expect(symbols.some((s: SymbolInformation) => s.name.includes('Størrelse'))).toBe(true);
    });

    it('should handle CP850 encoded files', async () => {
      const testFile = path.join(tempDir, 'CP850.cal');
      // "Størrelse" in CP850: St=ASCII, ø=0x9B, rrelse=ASCII
      const cp850Content = Buffer.concat([
        Buffer.from('OBJECT Table 18 Test\n{\n  FIELDS\n  {\n    { 1   ;   ;St', 'ascii'),
        Buffer.from([0x9B]), // ø in CP850
        Buffer.from('rrelse       ;Integer       }\n  }\n}', 'ascii')
      ]);
      fs.writeFileSync(testFile, cp850Content);

      await workspaceIndex.indexDirectory(tempDir);

      const symbols = workspaceIndex.getAllSymbols();
      expect(symbols.some((s: SymbolInformation) => s.name.includes('Størrelse'))).toBe(true);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty .cal file', async () => {
      const testFile = path.join(tempDir, 'Empty.cal');
      fs.writeFileSync(testFile, '');

      await workspaceIndex.add(testFile);

      expect(workspaceIndex.has(testFile)).toBe(true);
      expect(workspaceIndex.symbolCount).toBe(0);
    });

    it('should handle file with only object declaration', async () => {
      const testFile = path.join(tempDir, 'EmptyObject.cal');
      fs.writeFileSync(testFile, `OBJECT Codeunit 50000 Empty
{
}`);

      await workspaceIndex.add(testFile);

      expect(workspaceIndex.has(testFile)).toBe(true);
      expect(workspaceIndex.symbolCount).toBe(0); // No symbols inside
    });

    it('should handle non-existent directory', async () => {
      const nonExistent = path.join(tempDir, 'DoesNotExist');

      // Should not throw
      await expect(workspaceIndex.indexDirectory(nonExistent)).rejects.toThrow();
    });
  });

  describe('Table Registry', () => {
    it('should add table entry to registry when indexing a Table object', async () => {
      const tableFile = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(tableFile);

      const registry = workspaceIndex.getTableRegistry();
      expect(registry.has(18)).toBe(true);
      expect(registry.get(18)).toBe('Customer');
    });

    it('should not add any entry to registry when indexing a non-Table object', async () => {
      const codeunitFile = path.join(tempDir, 'Codeunit50000.cal');
      fs.writeFileSync(codeunitFile, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(codeunitFile);

      const registry = workspaceIndex.getTableRegistry();
      expect(registry.size).toBe(0);
    });

    it('should replace old table entry when same file is re-indexed with a different table ID', async () => {
      const tableFile = path.join(tempDir, 'Table.cal');
      fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(tableFile);
      expect(workspaceIndex.getTableRegistry().has(18)).toBe(true);

      // Overwrite same file with a different table ID
      fs.writeFileSync(tableFile, `OBJECT Table 19 Item
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(tableFile);

      const registry = workspaceIndex.getTableRegistry();
      expect(registry.has(19)).toBe(true);
      expect(registry.get(19)).toBe('Item');
      expect(registry.has(18)).toBe(false);
      expect(registry.size).toBe(1);
    });

    it('should remove table entry from registry when file is removed', async () => {
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

      workspaceIndex.remove(tableFile);

      expect(workspaceIndex.getTableRegistry().has(18)).toBe(false);
      expect(workspaceIndex.getTableRegistry().size).toBe(0);
    });

    it('should leave registry unchanged when removing a non-Table file', async () => {
      const tableFile = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      const codeunitFile = path.join(tempDir, 'Codeunit50000.cal');
      fs.writeFileSync(codeunitFile, `OBJECT Codeunit 50000 Utils
{
  CODE
  {
    BEGIN
    END.
  }
}`);

      await workspaceIndex.add(tableFile);
      await workspaceIndex.add(codeunitFile);

      workspaceIndex.remove(codeunitFile);

      const registry = workspaceIndex.getTableRegistry();
      expect(registry.has(18)).toBe(true);
      expect(registry.get(18)).toBe('Customer');
      expect(registry.size).toBe(1);
    });

    it('should empty the registry when clear() is called', async () => {
      const tableFile = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(tableFile, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      await workspaceIndex.add(tableFile);
      expect(workspaceIndex.getTableRegistry().size).toBe(1);

      workspaceIndex.clear();

      expect(workspaceIndex.getTableRegistry().size).toBe(0);
    });

    it('should contain all table entries when multiple Table files are indexed', async () => {
      const tableFile18 = path.join(tempDir, 'Table18.cal');
      fs.writeFileSync(tableFile18, `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      const tableFile27 = path.join(tempDir, 'Table27.cal');
      fs.writeFileSync(tableFile27, `OBJECT Table 27 Item
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`);

      const tableFile36 = path.join(tempDir, 'Table36.cal');
      fs.writeFileSync(tableFile36, `OBJECT Table 36 "Sales Header"
{
  FIELDS
  {
    { 1   ;   ;"Document Type"   ;Option        }
  }
}`);

      await workspaceIndex.add(tableFile18);
      await workspaceIndex.add(tableFile27);
      await workspaceIndex.add(tableFile36);

      const registry = workspaceIndex.getTableRegistry();
      expect(registry.size).toBe(3);
      expect(registry.get(18)).toBe('Customer');
      expect(registry.get(27)).toBe('Item');
      expect(registry.get(36)).toBe('Sales Header');
    });
  });
});
