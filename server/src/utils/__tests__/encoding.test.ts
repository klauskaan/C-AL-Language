/**
 * CP850 Encoding Detection Tests
 *
 * Tests for the encoding detection utility that handles C/AL files exported
 * from NAV with CP850 (DOS Latin 1) encoding vs UTF-8 encoding.
 *
 * Background:
 * - NAV 2009-2013 exported C/AL files in CP850 (DOS Latin 1)
 * - NAV 2015+ can export in UTF-8 with BOM
 * - Nordic characters (ø, æ, å) differ between CP850 and UTF-8:
 *   CP850: ø=0x9B, æ=0x91, å=0x86
 *   UTF-8: ø=0xC3B8, æ=0xC3A6, å=0xC3A5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  readFileWithEncoding,
  readFileWithEncodingAsync,
  decodeCp850
} from '../encoding';

describe('CP850 Encoding Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'encoding-test-'));
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('readFileWithEncoding', () => {
    describe('UTF-8 BOM detection', () => {
      it('should detect UTF-8 BOM and strip it from content', () => {
        const testFile = path.join(tempDir, 'utf8-bom.cal');
        const content = 'OBJECT Table 18 Customer';
        // UTF-8 BOM: 0xEF 0xBB 0xBF
        const bufferWithBom = Buffer.concat([
          Buffer.from([0xEF, 0xBB, 0xBF]),
          Buffer.from(content, 'utf8')
        ]);
        fs.writeFileSync(testFile, bufferWithBom);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe(content);
        expect(result.content.charCodeAt(0)).not.toBe(0xFEFF); // BOM should be stripped
      });

      it('should handle UTF-8 BOM with Danish characters', () => {
        const testFile = path.join(tempDir, 'utf8-bom-danish.cal');
        const content = 'Opgørelse'; // Danish: ø = U+00F8
        const bufferWithBom = Buffer.concat([
          Buffer.from([0xEF, 0xBB, 0xBF]),
          Buffer.from(content, 'utf8')
        ]);
        fs.writeFileSync(testFile, bufferWithBom);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Opgørelse');
        expect(result.content).toContain('ø');
      });
    });

    describe('Pure ASCII detection', () => {
      it('should detect pure ASCII file as UTF-8', () => {
        const testFile = path.join(tempDir, 'ascii.cal');
        const content = 'OBJECT Table 18 Customer\nFIELDS\nBEGIN\nEND.';
        fs.writeFileSync(testFile, content, 'ascii');

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe(content);
      });

      it('should handle ASCII with only bytes 0x00-0x7F', () => {
        const testFile = path.join(tempDir, 'ascii-strict.cal');
        // Create buffer with only ASCII bytes (0-127)
        const asciiBytes = Buffer.from([
          0x4F, 0x42, 0x4A, 0x45, 0x43, 0x54, // "OBJECT"
          0x20, // space
          0x54, 0x61, 0x62, 0x6C, 0x65 // "Table"
        ]);
        fs.writeFileSync(testFile, asciiBytes);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('OBJECT Table');
      });
    });

    describe('UTF-8 without BOM detection', () => {
      it('should detect valid UTF-8 with Danish characters', () => {
        const testFile = path.join(tempDir, 'utf8-no-bom.cal');
        const content = 'Opgørelse'; // UTF-8: ø = 0xC3 0xB8
        fs.writeFileSync(testFile, content, 'utf8');

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Opgørelse');
        expect(result.content.charCodeAt(3)).toBe(0x00F8); // ø = U+00F8
      });

      it('should detect UTF-8 with mixed Nordic characters', () => {
        const testFile = path.join(tempDir, 'utf8-nordic.cal');
        const content = 'Størrelse Beløb Måned'; // Danish/Norwegian
        fs.writeFileSync(testFile, content, 'utf8');

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Størrelse Beløb Måned');
      });
    });

    describe('CP850 detection', () => {
      it('should detect CP850 Danish characters and decode correctly', () => {
        const testFile = path.join(tempDir, 'cp850-danish.cal');
        // CP850: ø=0x9B, æ=0x91, å=0x86
        const cp850Bytes = Buffer.from([
          0x4F, 0x70, 0x67, // "Opg"
          0x9B, // ø in CP850
          0x72, 0x65, 0x6C, 0x73, 0x65 // "relse"
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('Opgørelse');
        expect(result.content.charCodeAt(3)).toBe(0x00F8); // ø = U+00F8
      });

      it('should detect and decode CP850 identifier with Nordic chars', () => {
        const testFile = path.join(tempDir, 'cp850-identifier.cal');
        // "OpgørelseRec" in CP850
        const cp850Bytes = Buffer.from([
          0x4F, 0x70, 0x67, // "Opg"
          0x9B, // ø
          0x72, 0x65, 0x6C, 0x73, 0x65, // "relse"
          0x52, 0x65, 0x63 // "Rec"
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('OpgørelseRec');
      });

      it('should handle all Nordic CP850 characters', () => {
        const testFile = path.join(tempDir, 'cp850-all-nordic.cal');
        // Test: æ ø å Æ Ø Å
        const cp850Bytes = Buffer.from([
          0x91, // æ
          0x20,
          0x9B, // ø
          0x20,
          0x86, // å
          0x20,
          0x92, // Æ
          0x20,
          0x9D, // Ø
          0x20,
          0x8F  // Å
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('æ ø å Æ Ø Å');
      });

      it('should handle CP850 with German umlauts', () => {
        const testFile = path.join(tempDir, 'cp850-german.cal');
        // ä=0x84, ö=0x94, ü=0x81
        const cp850Bytes = Buffer.from([
          0x84, // ä
          0x20,
          0x94, // ö
          0x20,
          0x81  // ü
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('ä ö ü');
      });
    });

    describe('Empty file handling', () => {
      it('should handle empty file gracefully', () => {
        const testFile = path.join(tempDir, 'empty.cal');
        fs.writeFileSync(testFile, '');

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('');
      });
    });

    describe('Edge cases', () => {
      it('should handle file with only newlines', () => {
        const testFile = path.join(tempDir, 'newlines.cal');
        fs.writeFileSync(testFile, '\n\n\n');

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('\n\n\n');
      });

      it('should handle mixed content with CP850 and ASCII', () => {
        const testFile = path.join(tempDir, 'cp850-mixed.cal');
        // "OBJECT Table 18 Opgørelse"
        const cp850Bytes = Buffer.concat([
          Buffer.from('OBJECT Table 18 Opg', 'ascii'),
          Buffer.from([0x9B]), // ø in CP850
          Buffer.from('relse', 'ascii')
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('OBJECT Table 18 Opgørelse');
      });

      it('should prioritize UTF-8 BOM over ambiguous content', () => {
        const testFile = path.join(tempDir, 'bom-priority.cal');
        // UTF-8 BOM + content that could be ambiguous
        const bufferWithBom = Buffer.concat([
          Buffer.from([0xEF, 0xBB, 0xBF]),
          Buffer.from('Test', 'utf8')
        ]);
        fs.writeFileSync(testFile, bufferWithBom);

        const result = readFileWithEncoding(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Test');
      });
    });

    describe('Error handling', () => {
      it('should throw error for non-existent file', () => {
        const nonExistent = path.join(tempDir, 'does-not-exist.cal');

        expect(() => {
          readFileWithEncoding(nonExistent);
        }).toThrow();
      });
    });
  });

  describe('decodeCp850', () => {
    describe('Nordic character mappings', () => {
      it('should decode CP850 ø (0x9B) to Unicode U+00F8', () => {
        const buffer = Buffer.from([0x9B]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('ø');
        expect(decoded.charCodeAt(0)).toBe(0x00F8);
      });

      it('should decode CP850 æ (0x91) to Unicode U+00E6', () => {
        const buffer = Buffer.from([0x91]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('æ');
        expect(decoded.charCodeAt(0)).toBe(0x00E6);
      });

      it('should decode CP850 å (0x86) to Unicode U+00E5', () => {
        const buffer = Buffer.from([0x86]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('å');
        expect(decoded.charCodeAt(0)).toBe(0x00E5);
      });

      it('should decode CP850 Ø (0x9D) to Unicode U+00D8', () => {
        const buffer = Buffer.from([0x9D]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Ø');
        expect(decoded.charCodeAt(0)).toBe(0x00D8);
      });

      it('should decode CP850 Æ (0x92) to Unicode U+00C6', () => {
        const buffer = Buffer.from([0x92]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Æ');
        expect(decoded.charCodeAt(0)).toBe(0x00C6);
      });

      it('should decode CP850 Å (0x8F) to Unicode U+00C5', () => {
        const buffer = Buffer.from([0x8F]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Å');
        expect(decoded.charCodeAt(0)).toBe(0x00C5);
      });
    });

    describe('German character mappings', () => {
      it('should decode CP850 ä (0x84) to Unicode U+00E4', () => {
        const buffer = Buffer.from([0x84]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('ä');
        expect(decoded.charCodeAt(0)).toBe(0x00E4);
      });

      it('should decode CP850 ö (0x94) to Unicode U+00F6', () => {
        const buffer = Buffer.from([0x94]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('ö');
        expect(decoded.charCodeAt(0)).toBe(0x00F6);
      });

      it('should decode CP850 ü (0x81) to Unicode U+00FC', () => {
        const buffer = Buffer.from([0x81]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('ü');
        expect(decoded.charCodeAt(0)).toBe(0x00FC);
      });

      it('should decode CP850 Ä (0x8E) to Unicode U+00C4', () => {
        const buffer = Buffer.from([0x8E]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Ä');
        expect(decoded.charCodeAt(0)).toBe(0x00C4);
      });

      it('should decode CP850 Ö (0x99) to Unicode U+00D6', () => {
        const buffer = Buffer.from([0x99]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Ö');
        expect(decoded.charCodeAt(0)).toBe(0x00D6);
      });

      it('should decode CP850 Ü (0x9A) to Unicode U+00DC', () => {
        const buffer = Buffer.from([0x9A]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Ü');
        expect(decoded.charCodeAt(0)).toBe(0x00DC);
      });
    });

    describe('ASCII passthrough', () => {
      it('should pass through ASCII characters unchanged', () => {
        const buffer = Buffer.from('OBJECT Table 18', 'ascii');
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('OBJECT Table 18');
      });

      it('should handle mixed ASCII and CP850', () => {
        // "Opgørelse" - Opg in ASCII, ø in CP850, relse in ASCII
        const buffer = Buffer.from([
          0x4F, 0x70, 0x67, // Opg
          0x9B, // ø
          0x72, 0x65, 0x6C, 0x73, 0x65 // relse
        ]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Opgørelse');
      });
    });

    describe('Empty buffer', () => {
      it('should return empty string for empty buffer', () => {
        const buffer = Buffer.from([]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('');
      });
    });

    describe('Real-world identifiers', () => {
      it('should decode identifier "OpgørelseRec" correctly', () => {
        const buffer = Buffer.from([
          0x4F, 0x70, 0x67, 0x9B, 0x72, 0x65, 0x6C, 0x73, 0x65,
          0x52, 0x65, 0x63
        ]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('OpgørelseRec');
      });

      it('should decode identifier "Månedsstatistik" correctly', () => {
        // M=0x4D, å=0x86, nedsstatistik in ASCII
        const buffer = Buffer.from([
          0x4D, 0x86, 0x6E, 0x65, 0x64, 0x73,
          0x73, 0x74, 0x61, 0x74, 0x69, 0x73, 0x74, 0x69, 0x6B
        ]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Månedsstatistik');
      });

      it('should decode identifier "Bogføring" correctly', () => {
        // Bogf in ASCII, ø=0x9B, ring in ASCII
        const buffer = Buffer.from([
          0x42, 0x6F, 0x67, 0x66, 0x9B, 0x72, 0x69, 0x6E, 0x67
        ]);
        const decoded = decodeCp850(buffer);

        expect(decoded).toBe('Bogføring');
      });
    });
  });

  describe('readFileWithEncodingAsync', () => {
    describe('UTF-8 BOM detection', () => {
      it('should detect UTF-8 BOM and strip it from content', async () => {
        const testFile = path.join(tempDir, 'utf8-bom-async.cal');
        const content = 'OBJECT Table 18 Customer';
        // UTF-8 BOM: 0xEF 0xBB 0xBF
        const bufferWithBom = Buffer.concat([
          Buffer.from([0xEF, 0xBB, 0xBF]),
          Buffer.from(content, 'utf8')
        ]);
        fs.writeFileSync(testFile, bufferWithBom);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe(content);
        expect(result.content.charCodeAt(0)).not.toBe(0xFEFF);
      });

      it('should handle UTF-8 BOM with Danish characters', async () => {
        const testFile = path.join(tempDir, 'utf8-bom-danish-async.cal');
        const content = 'Opgørelse'; // Danish: ø = U+00F8
        const bufferWithBom = Buffer.concat([
          Buffer.from([0xEF, 0xBB, 0xBF]),
          Buffer.from(content, 'utf8')
        ]);
        fs.writeFileSync(testFile, bufferWithBom);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Opgørelse');
        expect(result.content).toContain('ø');
      });
    });

    describe('Pure ASCII detection', () => {
      it('should detect pure ASCII file as UTF-8', async () => {
        const testFile = path.join(tempDir, 'ascii-async.cal');
        const content = 'OBJECT Table 18 Customer\nFIELDS\nBEGIN\nEND.';
        fs.writeFileSync(testFile, content, 'ascii');

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe(content);
      });

      it('should handle ASCII with only bytes 0x00-0x7F', async () => {
        const testFile = path.join(tempDir, 'ascii-strict-async.cal');
        // Create buffer with only ASCII bytes (0-127)
        const asciiBytes = Buffer.from([
          0x4F, 0x42, 0x4A, 0x45, 0x43, 0x54, // "OBJECT"
          0x20, // space
          0x54, 0x61, 0x62, 0x6C, 0x65 // "Table"
        ]);
        fs.writeFileSync(testFile, asciiBytes);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('OBJECT Table');
      });
    });

    describe('UTF-8 without BOM detection', () => {
      it('should detect valid UTF-8 with Danish characters', async () => {
        const testFile = path.join(tempDir, 'utf8-no-bom-async.cal');
        const content = 'Opgørelse'; // UTF-8: ø = 0xC3 0xB8
        fs.writeFileSync(testFile, content, 'utf8');

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Opgørelse');
        expect(result.content.charCodeAt(3)).toBe(0x00F8);
      });

      it('should detect UTF-8 with mixed Nordic characters', async () => {
        const testFile = path.join(tempDir, 'utf8-nordic-async.cal');
        const content = 'Størrelse Beløb Måned'; // Danish/Norwegian
        fs.writeFileSync(testFile, content, 'utf8');

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Størrelse Beløb Måned');
      });
    });

    describe('CP850 detection', () => {
      it('should detect CP850 Danish characters and decode correctly', async () => {
        const testFile = path.join(tempDir, 'cp850-danish-async.cal');
        // CP850: ø=0x9B, æ=0x91, å=0x86
        const cp850Bytes = Buffer.from([
          0x4F, 0x70, 0x67, // "Opg"
          0x9B, // ø in CP850
          0x72, 0x65, 0x6C, 0x73, 0x65 // "relse"
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('Opgørelse');
        expect(result.content.charCodeAt(3)).toBe(0x00F8);
      });

      it('should detect and decode CP850 identifier with Nordic chars', async () => {
        const testFile = path.join(tempDir, 'cp850-identifier-async.cal');
        // "OpgørelseRec" in CP850
        const cp850Bytes = Buffer.from([
          0x4F, 0x70, 0x67, // "Opg"
          0x9B, // ø
          0x72, 0x65, 0x6C, 0x73, 0x65, // "relse"
          0x52, 0x65, 0x63 // "Rec"
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('OpgørelseRec');
      });

      it('should handle all Nordic CP850 characters', async () => {
        const testFile = path.join(tempDir, 'cp850-all-nordic-async.cal');
        // Test: æ ø å Æ Ø Å
        const cp850Bytes = Buffer.from([
          0x91, // æ
          0x20,
          0x9B, // ø
          0x20,
          0x86, // å
          0x20,
          0x92, // Æ
          0x20,
          0x9D, // Ø
          0x20,
          0x8F  // Å
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('æ ø å Æ Ø Å');
      });

      it('should handle CP850 with German umlauts', async () => {
        const testFile = path.join(tempDir, 'cp850-german-async.cal');
        // ä=0x84, ö=0x94, ü=0x81
        const cp850Bytes = Buffer.from([
          0x84, // ä
          0x20,
          0x94, // ö
          0x20,
          0x81  // ü
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('ä ö ü');
      });
    });

    describe('Empty file handling', () => {
      it('should handle empty file gracefully', async () => {
        const testFile = path.join(tempDir, 'empty-async.cal');
        fs.writeFileSync(testFile, '');

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('');
      });
    });

    describe('Edge cases', () => {
      it('should handle file with only newlines', async () => {
        const testFile = path.join(tempDir, 'newlines-async.cal');
        fs.writeFileSync(testFile, '\n\n\n');

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('\n\n\n');
      });

      it('should handle mixed content with CP850 and ASCII', async () => {
        const testFile = path.join(tempDir, 'cp850-mixed-async.cal');
        // "OBJECT Table 18 Opgørelse"
        const cp850Bytes = Buffer.concat([
          Buffer.from('OBJECT Table 18 Opg', 'ascii'),
          Buffer.from([0x9B]), // ø in CP850
          Buffer.from('relse', 'ascii')
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('cp850');
        expect(result.content).toBe('OBJECT Table 18 Opgørelse');
      });

      it('should prioritize UTF-8 BOM over ambiguous content', async () => {
        const testFile = path.join(tempDir, 'bom-priority-async.cal');
        // UTF-8 BOM + content that could be ambiguous
        const bufferWithBom = Buffer.concat([
          Buffer.from([0xEF, 0xBB, 0xBF]),
          Buffer.from('Test', 'utf8')
        ]);
        fs.writeFileSync(testFile, bufferWithBom);

        const result = await readFileWithEncodingAsync(testFile);

        expect(result.encoding).toBe('utf-8');
        expect(result.content).toBe('Test');
      });
    });

    describe('Error handling', () => {
      it('should reject promise for non-existent file', async () => {
        const nonExistent = path.join(tempDir, 'does-not-exist-async.cal');

        await expect(readFileWithEncodingAsync(nonExistent)).rejects.toThrow();
      });
    });

    describe('Behavioral Equivalence with Sync Version', () => {
      it('should produce identical results to sync version for UTF-8', async () => {
        const testFile = path.join(tempDir, 'equivalence-utf8.cal');
        const content = 'OBJECT Table 18 Størrelse\nFIELDS\n{\n}';
        fs.writeFileSync(testFile, content, 'utf8');

        const syncResult = readFileWithEncoding(testFile);
        const asyncResult = await readFileWithEncodingAsync(testFile);

        expect(asyncResult.encoding).toBe(syncResult.encoding);
        expect(asyncResult.content).toBe(syncResult.content);
      });

      it('should produce identical results to sync version for CP850', async () => {
        const testFile = path.join(tempDir, 'equivalence-cp850.cal');
        // "Opgørelse" in CP850
        const cp850Bytes = Buffer.from([
          0x4F, 0x70, 0x67, 0x9B, 0x72, 0x65, 0x6C, 0x73, 0x65
        ]);
        fs.writeFileSync(testFile, cp850Bytes);

        const syncResult = readFileWithEncoding(testFile);
        const asyncResult = await readFileWithEncodingAsync(testFile);

        expect(asyncResult.encoding).toBe(syncResult.encoding);
        expect(asyncResult.content).toBe(syncResult.content);
      });

      it('should produce identical results to sync version for empty file', async () => {
        const testFile = path.join(tempDir, 'equivalence-empty.cal');
        fs.writeFileSync(testFile, '');

        const syncResult = readFileWithEncoding(testFile);
        const asyncResult = await readFileWithEncodingAsync(testFile);

        expect(asyncResult.encoding).toBe(syncResult.encoding);
        expect(asyncResult.content).toBe(syncResult.content);
      });
    });
  });
});
