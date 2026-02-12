/**
 * C/AL Content Detection Tests
 *
 * Tests for the isCalContent heuristic that determines if a .txt file
 * contains C/AL object definition by checking for "OBJECT " prefix.
 *
 * Background:
 * - NAV exports C/AL objects to .txt files starting with "OBJECT Type ID Name"
 * - Function reads first 64 bytes to make the determination
 * - Strips UTF-8 BOM (0xEF 0xBB 0xBF) if present
 * - Checks case-insensitive for "OBJECT " (7 chars including trailing space)
 * - Returns false on any error (file not found, read error, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { isCalContent } from '../calDetection';

describe('isCalContent', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-detection-test-'));
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TRUE cases - valid C/AL content', () => {
    it('should return true for standard C/AL Table object', async () => {
      const testFile = path.join(tempDir, 'table.txt');
      const content = 'OBJECT Table 18 Customer\n{\n  FIELDS\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for C/AL Codeunit object', async () => {
      const testFile = path.join(tempDir, 'codeunit.txt');
      const content = 'OBJECT Codeunit 1 Test\n{\n  CODE\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for lowercase "object" keyword (case-insensitive)', async () => {
      const testFile = path.join(tempDir, 'lowercase.txt');
      const content = 'object table 18 test\n{\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for mixed case "ObJeCt" keyword', async () => {
      const testFile = path.join(tempDir, 'mixedcase.txt');
      const content = 'ObJeCt Table 18 Test\n{\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true with leading spaces before OBJECT', async () => {
      const testFile = path.join(tempDir, 'leading-spaces.txt');
      const content = '  OBJECT Table 18 Customer\n{\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true with leading CRLF + space', async () => {
      const testFile = path.join(tempDir, 'leading-crlf.txt');
      const content = '\r\n OBJECT Table 18 Customer\n{\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true with UTF-8 BOM prefix', async () => {
      const testFile = path.join(tempDir, 'with-bom.txt');
      const content = 'OBJECT Table 18 Customer\n{\n}';
      // UTF-8 BOM: 0xEF 0xBB 0xBF
      const bufferWithBom = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from(content, 'utf8')
      ]);
      fs.writeFileSync(testFile, bufferWithBom);

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true with leading tabs before OBJECT', async () => {
      const testFile = path.join(tempDir, 'leading-tabs.txt');
      const content = '\t\t OBJECT Table 18 Test\n{\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true with mixed whitespace (tabs, spaces, newlines)', async () => {
      const testFile = path.join(tempDir, 'mixed-whitespace.txt');
      const content = '\n  \t  OBJECT Table 18 Test\n{\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for C/AL Report object', async () => {
      const testFile = path.join(tempDir, 'report.txt');
      const content = 'OBJECT Report 101 Customer List\n{\n  PROPERTIES\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for C/AL Page object', async () => {
      const testFile = path.join(tempDir, 'page.txt');
      const content = 'OBJECT Page 21 Customer Card\n{\n  PROPERTIES\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for C/AL Query object', async () => {
      const testFile = path.join(tempDir, 'query.txt');
      const content = 'OBJECT Query 50000 Customer Query\n{\n  PROPERTIES\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for C/AL XMLport object', async () => {
      const testFile = path.join(tempDir, 'xmlport.txt');
      const content = 'OBJECT XMLport 50000 Import Data\n{\n  PROPERTIES\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for C/AL MenuSuite object', async () => {
      const testFile = path.join(tempDir, 'menusuite.txt');
      const content = 'OBJECT MenuSuite 1 Department\n{\n  PROPERTIES\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });
  });

  describe('FALSE cases - not C/AL content', () => {
    it('should return false for README file', async () => {
      const testFile = path.join(tempDir, 'readme.txt');
      const content = 'This is a README file\nIt contains documentation\nNot C/AL code';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for empty file', async () => {
      const testFile = path.join(tempDir, 'empty.txt');
      fs.writeFileSync(testFile, '', 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for "OBJECTIVES" (no space after OBJECT at position 7)', async () => {
      const testFile = path.join(tempDir, 'objectives.txt');
      const content = 'OBJECTIVES for Q4\n- Increase revenue\n- Reduce costs';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for truncated "OBJEC" (less than 7 chars)', async () => {
      const testFile = path.join(tempDir, 'truncated.txt');
      const content = 'OBJEC';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for binary content', async () => {
      const testFile = path.join(tempDir, 'binary.txt');
      // Random binary data
      const binaryData = Buffer.from([0x00, 0x01, 0xFF, 0xAA, 0x55, 0x7F, 0x80, 0xFE]);
      fs.writeFileSync(testFile, binaryData);

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const testFile = path.join(tempDir, 'does-not-exist.txt');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for file with only whitespace', async () => {
      const testFile = path.join(tempDir, 'whitespace-only.txt');
      const content = '   \n\t\t\n  \n';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for "object-oriented programming" text', async () => {
      const testFile = path.join(tempDir, 'oop.txt');
      const content = 'object-oriented programming is a paradigm\nthat uses objects';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for UTF-8 BOM with only whitespace after', async () => {
      const testFile = path.join(tempDir, 'bom-whitespace.txt');
      const bufferWithBom = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from('   \n\t\n  ', 'utf8')
      ]);
      fs.writeFileSync(testFile, bufferWithBom);

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for "OBJECT" without trailing space (OBJECT\\n)', async () => {
      const testFile = path.join(tempDir, 'object-no-space.txt');
      const content = 'OBJECT\nTable 18 Customer';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for "OBJECT:" with colon instead of space', async () => {
      const testFile = path.join(tempDir, 'object-colon.txt');
      const content = 'OBJECT: Table definitions\nCustomer\nVendor';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for text containing "OBJECT " later in content', async () => {
      const testFile = path.join(tempDir, 'object-later.txt');
      const content = 'Documentation about NAV\n\nOBJECT Table 18 Customer is defined below...';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for CSV file', async () => {
      const testFile = path.join(tempDir, 'data.txt');
      const content = 'ID,Name,Address\n1,John Doe,123 Main St\n2,Jane Smith,456 Oak Ave';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for JSON-like content', async () => {
      const testFile = path.join(tempDir, 'data.txt');
      const content = '{\n  "object": "table",\n  "id": 18,\n  "name": "Customer"\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for XML content', async () => {
      const testFile = path.join(tempDir, 'data.txt');
      const content = '<?xml version="1.0"?>\n<object type="Table" id="18" name="Customer" />';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should return true when OBJECT appears exactly at byte 64', async () => {
      const testFile = path.join(tempDir, 'object-at-64.txt');
      // Create 57 bytes of whitespace, then "OBJECT " (7 bytes) = exactly 64 bytes
      const padding = ' '.repeat(57);
      const content = padding + 'OBJECT Table 18 Customer';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return false when OBJECT starts at byte 65', async () => {
      const testFile = path.join(tempDir, 'object-after-64.txt');
      // Create 58 bytes of whitespace, then "OBJECT " - OBJECT starts at position 58
      const padding = ' '.repeat(58);
      const content = padding + 'OBJECT Table 18 Customer';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return true with UTF-8 BOM and whitespace within 64 byte window', async () => {
      const testFile = path.join(tempDir, 'bom-whitespace-object.txt');
      // BOM (3 bytes) + whitespace + "OBJECT " = within 64 bytes
      const bufferWithBom = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from('   \n\t  OBJECT Table 18 Customer', 'utf8')
      ]);
      fs.writeFileSync(testFile, bufferWithBom);

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return true for file with exactly 7 bytes "OBJECT "', async () => {
      const testFile = path.join(tempDir, 'exact-7-bytes.txt');
      const content = 'OBJECT ';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return false for file with exactly 6 bytes "OBJECT"', async () => {
      const testFile = path.join(tempDir, 'exact-6-bytes.txt');
      const content = 'OBJECT';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return true with NULL bytes before OBJECT', async () => {
      const testFile = path.join(tempDir, 'null-bytes.txt');
      // NULL bytes are treated as whitespace by trim
      const buffer = Buffer.concat([
        Buffer.from([0x00, 0x00]),
        Buffer.from('OBJECT Table 18 Customer', 'utf8')
      ]);
      fs.writeFileSync(testFile, buffer);

      const result = await isCalContent(testFile);

      // This should return false because NULL bytes are not valid whitespace in C/AL context
      // The implementation trims leading whitespace, but NULL bytes won't be trimmed
      expect(result).toBe(false);
    });

    it('should handle file with CRLF line endings', async () => {
      const testFile = path.join(tempDir, 'crlf.txt');
      const content = 'OBJECT Table 18 Customer\r\n{\r\n  FIELDS\r\n  {\r\n  }\r\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should handle file with only LF line endings', async () => {
      const testFile = path.join(tempDir, 'lf.txt');
      const content = 'OBJECT Table 18 Customer\n{\n  FIELDS\n  {\n  }\n}';
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return false when file path is empty string', async () => {
      const result = await isCalContent('');

      expect(result).toBe(false);
    });

    it('should return false when file is a directory', async () => {
      const result = await isCalContent(tempDir);

      expect(result).toBe(false);
    });

    it('should return false when file path contains invalid characters', async () => {
      const invalidPath = path.join(tempDir, 'invalid\0path.txt');

      const result = await isCalContent(invalidPath);

      expect(result).toBe(false);
    });

    it('should return false when file permissions deny read access', async () => {
      // Note: This test may behave differently on Windows
      if (process.platform !== 'win32') {
        const testFile = path.join(tempDir, 'no-read.txt');
        fs.writeFileSync(testFile, 'OBJECT Table 18 Customer', 'utf8');
        fs.chmodSync(testFile, 0o000); // Remove all permissions

        const result = await isCalContent(testFile);

        expect(result).toBe(false);

        // Restore permissions for cleanup
        fs.chmodSync(testFile, 0o644);
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should return true for exported NAV Table object', async () => {
      const testFile = path.join(tempDir, 'COD1.TXT');
      const content = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=01/01/20;
    Time=12:00:00;
    Modified=Yes;
    Version List=NAVW114.00;
  }
  PROPERTIES
  {
    DataCaptionFields=No.,Name;
    OnInsert=BEGIN
             END;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        ;CaptionML=ENU=No. }
    { 2   ;   ;Name                ;Text50        ;CaptionML=ENU=Name }
  }
  KEYS
  {
    {    ;No.                                     ;Clustered=Yes }
  }
}`;
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(true);
    });

    it('should return false for SQL script', async () => {
      const testFile = path.join(tempDir, 'script.txt');
      const content = `-- SQL Script to create table
CREATE TABLE Customer (
  No_ VARCHAR(20) PRIMARY KEY,
  Name VARCHAR(50)
);`;
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for PowerShell script', async () => {
      const testFile = path.join(tempDir, 'script.txt');
      const content = `# PowerShell script
$object = Get-Item "C:\\NAV\\Objects\\Table18.txt"
Write-Host "Processing object: $object"`;
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });

    it('should return false for Git diff output', async () => {
      const testFile = path.join(tempDir, 'diff.txt');
      const content = `diff --git a/Table18.txt b/Table18.txt
index abc123..def456 100644
--- a/Table18.txt
+++ b/Table18.txt
@@ -1,5 +1,5 @@
 OBJECT Table 18 Customer`;
      fs.writeFileSync(testFile, content, 'utf8');

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });
  });

  describe('Performance considerations', () => {
    it('should handle very large file by only reading first 64 bytes', async () => {
      const testFile = path.join(tempDir, 'large-file.txt');
      // Create a file with valid OBJECT header followed by 1MB of data
      const header = 'OBJECT Table 18 Customer\n{\n';
      const largeData = 'A'.repeat(1024 * 1024); // 1MB of 'A' characters
      fs.writeFileSync(testFile, header + largeData, 'utf8');

      const startTime = Date.now();
      const result = await isCalContent(testFile);
      const endTime = Date.now();

      expect(result).toBe(true);
      // Should complete quickly even with large file (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle file with OBJECT appearing after 64 bytes', async () => {
      const testFile = path.join(tempDir, 'object-after-64-bytes.txt');
      // BOM (3 bytes) + 70 spaces + "OBJECT " = OBJECT starts after 64 byte window
      const bufferWithBom = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from(' '.repeat(70) + 'OBJECT Table 18 Customer', 'utf8')
      ]);
      fs.writeFileSync(testFile, bufferWithBom);

      const result = await isCalContent(testFile);

      expect(result).toBe(false);
    });
  });
});
