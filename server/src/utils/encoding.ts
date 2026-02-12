/**
 * CP850 Encoding Detection and Conversion
 *
 * Handles detection and conversion of C/AL files exported from NAV with
 * CP850 (DOS Latin 1) encoding vs UTF-8 encoding.
 *
 * Background:
 * - NAV 2009-2013 exported C/AL files in CP850 (DOS Latin 1)
 * - NAV 2015+ can export in UTF-8 with BOM
 * - Nordic characters (ø, æ, å) and German umlauts differ between encodings
 */

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';

/**
 * Result of encoding detection
 */
export interface EncodingResult {
  content: string;
  encoding: 'utf-8' | 'cp850';
}

/**
 * Full CP850 to Unicode mapping table (256 entries)
 * Bytes 0x00-0x7F are standard ASCII (pass through unchanged)
 * Bytes 0x80-0xFF need mapping to Unicode
 */
const CP850_TO_UNICODE: number[] = [
  // 0x00-0x7F: Standard ASCII (0-127)
  0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007,
  0x0008, 0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
  0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017,
  0x0018, 0x0019, 0x001A, 0x001B, 0x001C, 0x001D, 0x001E, 0x001F,
  0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027,
  0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
  0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037,
  0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
  0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047,
  0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
  0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057,
  0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
  0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067,
  0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
  0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077,
  0x0078, 0x0079, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0x007F,

  // 0x80-0xFF: Extended CP850 characters
  0x00C7, // 0x80: Ç - C with cedilla
  0x00FC, // 0x81: ü - u with diaeresis
  0x00E9, // 0x82: é - e with acute
  0x00E2, // 0x83: â - a with circumflex
  0x00E4, // 0x84: ä - a with diaeresis
  0x00E0, // 0x85: à - a with grave
  0x00E5, // 0x86: å - a with ring (Nordic)
  0x00E7, // 0x87: ç - c with cedilla
  0x00EA, // 0x88: ê - e with circumflex
  0x00EB, // 0x89: ë - e with diaeresis
  0x00E8, // 0x8A: è - e with grave
  0x00EF, // 0x8B: ï - i with diaeresis
  0x00EE, // 0x8C: î - i with circumflex
  0x00EC, // 0x8D: ì - i with grave
  0x00C4, // 0x8E: Ä - A with diaeresis (German)
  0x00C5, // 0x8F: Å - A with ring (Nordic)
  0x00C9, // 0x90: É - E with acute
  0x00E6, // 0x91: æ - ae ligature (Nordic)
  0x00C6, // 0x92: Æ - AE ligature (Nordic)
  0x00F4, // 0x93: ô - o with circumflex
  0x00F6, // 0x94: ö - o with diaeresis (German)
  0x00F2, // 0x95: ò - o with grave
  0x00FB, // 0x96: û - u with circumflex
  0x00F9, // 0x97: ù - u with grave
  0x00FF, // 0x98: ÿ - y with diaeresis
  0x00D6, // 0x99: Ö - O with diaeresis (German)
  0x00DC, // 0x9A: Ü - U with diaeresis (German)
  0x00F8, // 0x9B: ø - o with stroke (Nordic)
  0x00A3, // 0x9C: £ - pound sign
  0x00D8, // 0x9D: Ø - O with stroke (Nordic)
  0x00D7, // 0x9E: × - multiplication sign
  0x0192, // 0x9F: ƒ - florin
  0x00E1, // 0xA0: á - a with acute
  0x00ED, // 0xA1: í - i with acute
  0x00F3, // 0xA2: ó - o with acute
  0x00FA, // 0xA3: ú - u with acute
  0x00F1, // 0xA4: ñ - n with tilde
  0x00D1, // 0xA5: Ñ - N with tilde
  0x00AA, // 0xA6: ª - feminine ordinal
  0x00BA, // 0xA7: º - masculine ordinal
  0x00BF, // 0xA8: ¿ - inverted question mark
  0x00AE, // 0xA9: ® - registered sign
  0x00AC, // 0xAA: ¬ - not sign
  0x00BD, // 0xAB: ½ - half
  0x00BC, // 0xAC: ¼ - quarter
  0x00A1, // 0xAD: ¡ - inverted exclamation
  0x00AB, // 0xAE: « - left angle quotes
  0x00BB, // 0xAF: » - right angle quotes
  0x2591, // 0xB0: ░ - light shade
  0x2592, // 0xB1: ▒ - medium shade
  0x2593, // 0xB2: ▓ - dark shade
  0x2502, // 0xB3: │ - box vertical
  0x2524, // 0xB4: ┤ - box vertical left
  0x00C1, // 0xB5: Á - A with acute
  0x00C2, // 0xB6: Â - A with circumflex
  0x00C0, // 0xB7: À - A with grave
  0x00A9, // 0xB8: © - copyright
  0x2563, // 0xB9: ╣ - box double vertical left
  0x2551, // 0xBA: ║ - box double vertical
  0x2557, // 0xBB: ╗ - box double down left
  0x255D, // 0xBC: ╝ - box double up left
  0x00A2, // 0xBD: ¢ - cent sign
  0x00A5, // 0xBE: ¥ - yen sign
  0x2510, // 0xBF: ┐ - box down left
  0x2514, // 0xC0: └ - box up right
  0x2534, // 0xC1: ┴ - box up horizontal
  0x252C, // 0xC2: ┬ - box down horizontal
  0x251C, // 0xC3: ├ - box vertical right
  0x2500, // 0xC4: ─ - box horizontal
  0x253C, // 0xC5: ┼ - box cross
  0x00E3, // 0xC6: ã - a with tilde
  0x00C3, // 0xC7: Ã - A with tilde
  0x255A, // 0xC8: ╚ - box double up right
  0x2554, // 0xC9: ╔ - box double down right
  0x2569, // 0xCA: ╩ - box double up horizontal
  0x2566, // 0xCB: ╦ - box double down horizontal
  0x2560, // 0xCC: ╠ - box double vertical right
  0x2550, // 0xCD: ═ - box double horizontal
  0x256C, // 0xCE: ╬ - box double cross
  0x00A4, // 0xCF: ¤ - currency sign
  0x00F0, // 0xD0: ð - eth
  0x00D0, // 0xD1: Ð - ETH
  0x00CA, // 0xD2: Ê - E with circumflex
  0x00CB, // 0xD3: Ë - E with diaeresis
  0x00C8, // 0xD4: È - E with grave
  0x0131, // 0xD5: ı - dotless i
  0x00CD, // 0xD6: Í - I with acute
  0x00CE, // 0xD7: Î - I with circumflex
  0x00CF, // 0xD8: Ï - I with diaeresis
  0x2518, // 0xD9: ┘ - box up left
  0x250C, // 0xDA: ┌ - box down right
  0x2588, // 0xDB: █ - full block
  0x2584, // 0xDC: ▄ - lower half block
  0x00A6, // 0xDD: ¦ - broken bar
  0x00CC, // 0xDE: Ì - I with grave
  0x2580, // 0xDF: ▀ - upper half block
  0x00D3, // 0xE0: Ó - O with acute
  0x00DF, // 0xE1: ß - sharp s
  0x00D4, // 0xE2: Ô - O with circumflex
  0x00D2, // 0xE3: Ò - O with grave
  0x00F5, // 0xE4: õ - o with tilde
  0x00D5, // 0xE5: Õ - O with tilde
  0x00B5, // 0xE6: µ - micro sign
  0x00FE, // 0xE7: þ - thorn
  0x00DE, // 0xE8: Þ - THORN
  0x00DA, // 0xE9: Ú - U with acute
  0x00DB, // 0xEA: Û - U with circumflex
  0x00D9, // 0xEB: Ù - U with grave
  0x00FD, // 0xEC: ý - y with acute
  0x00DD, // 0xED: Ý - Y with acute
  0x00AF, // 0xEE: ¯ - macron
  0x00B4, // 0xEF: ´ - acute accent
  0x00AD, // 0xF0: ­ - soft hyphen
  0x00B1, // 0xF1: ± - plus-minus
  0x2017, // 0xF2: ‗ - double low line
  0x00BE, // 0xF3: ¾ - three quarters
  0x00B6, // 0xF4: ¶ - pilcrow
  0x00A7, // 0xF5: § - section sign
  0x00F7, // 0xF6: ÷ - division sign
  0x00B8, // 0xF7: ¸ - cedilla
  0x00B0, // 0xF8: ° - degree sign
  0x00A8, // 0xF9: ¨ - diaeresis
  0x00B7, // 0xFA: · - middle dot
  0x00B9, // 0xFB: ¹ - superscript 1
  0x00B3, // 0xFC: ³ - superscript 3
  0x00B2, // 0xFD: ² - superscript 2
  0x25A0, // 0xFE: ■ - black square
  0x00A0  // 0xFF: non-breaking space
];

/**
 * Decode a CP850 buffer to Unicode string
 *
 * @param buffer - Buffer containing CP850-encoded bytes
 * @returns Unicode string
 *
 * @example
 * decodeCp850(Buffer.from([0x9B]))
 * // => "ø"
 *
 * @example
 * decodeCp850(Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]))
 * // => "Hello"
 */
export function decodeCp850(buffer: Buffer): string {
  if (buffer.length === 0) {
    return '';
  }

  const chars: string[] = [];
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const unicode = CP850_TO_UNICODE[byte];
    chars.push(String.fromCharCode(unicode));
  }

  return chars.join('');
}

/**
 * Detect encoding from a buffer and decode to string
 *
 * Detection algorithm:
 * 1. Check for UTF-8 BOM (0xEF 0xBB 0xBF)
 * 2. If no high bytes (0x80-0xFF), it's pure ASCII (valid in both encodings)
 * 3. Try UTF-8 decode
 * 4. If UTF-8 decode produces replacement characters (U+FFFD), it's CP850
 * 5. Count isolated high bytes (not part of UTF-8 multi-byte sequences):
 *    - CP850: High bytes appear as single isolated bytes (e.g., ø=0x9B)
 *    - UTF-8: High bytes appear in sequences (e.g., ø=0xC3 0xB8, both marked as part of sequence)
 *    If ANY isolated high bytes found, it's likely CP850
 * 6. For ambiguous cases (all high bytes in valid UTF-8 sequences):
 *    - Check high-byte density (percentage of bytes >= 0x80)
 *    - Threshold: 30% (tunes heuristic for edge cases vs real files)
 *      - Real NAV files: ~1-5% (mostly ASCII structure/keywords)
 *      - Short accent-heavy strings: ~20-25% (ambiguous, could be either)
 *      - Very short sequences: ~50-100% (default to CP850 for historical compatibility)
 * 7. Otherwise, it's UTF-8
 *
 * The high-byte density check prevents false UTF-8 detection when CP850 bytes
 * accidentally form valid UTF-8 sequences (e.g., CP850 0xC3 0xB8 = UTF-8 'ø' but
 * should decode as CP850 'Ã©').
 *
 * @param buffer - Buffer containing file contents
 * @returns EncodingResult with content and detected encoding
 *
 * @example
 * detectEncoding(Buffer.from("OBJECT Table 18..."))
 * // => { content: "OBJECT Table 18 Customer...", encoding: "cp850" }
 */
export function detectEncoding(buffer: Buffer): EncodingResult {

  // Handle empty file
  if (buffer.length === 0) {
    return { content: '', encoding: 'utf-8' };
  }

  // 1. Check for UTF-8 BOM (0xEF 0xBB 0xBF)
  if (buffer.length >= 3 &&
      buffer[0] === 0xEF &&
      buffer[1] === 0xBB &&
      buffer[2] === 0xBF) {
    return {
      content: buffer.subarray(3).toString('utf-8'),
      encoding: 'utf-8'
    };
  }

  // 2. Count high bytes (0x80-0xFF)
  let highByteCount = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] >= 0x80) {
      highByteCount++;
    }
  }

  // 3. If no high bytes, it's pure ASCII (valid in both encodings)
  if (highByteCount === 0) {
    return { content: buffer.toString('utf-8'), encoding: 'utf-8' };
  }

  // 4. Try UTF-8 decode
  const utf8Content = buffer.toString('utf-8');

  // 5. If UTF-8 decode produces replacement characters, it's CP850
  if (utf8Content.includes('\uFFFD')) {
    return { content: decodeCp850(buffer), encoding: 'cp850' };
  }

  // 6. Count isolated high bytes (not part of valid UTF-8 multi-byte sequences)
  // In CP850: High bytes appear as single isolated bytes (e.g., ø = 0x9B)
  // In UTF-8: High bytes appear in sequences (e.g., ø = 0xC3 0xB8)
  // We need to track which bytes are part of UTF-8 sequences
  const isPartOfUtf8Sequence = new Array(buffer.length).fill(false);

  // Mark all bytes that are part of valid UTF-8 sequences
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    // UTF-8 sequence start bytes (0xC0-0xFD)
    if (byte >= 0xC0 && byte <= 0xDF) {
      // 2-byte sequence
      isPartOfUtf8Sequence[i] = true;
      if (i + 1 < buffer.length) isPartOfUtf8Sequence[i + 1] = true;
    } else if (byte >= 0xE0 && byte <= 0xEF) {
      // 3-byte sequence
      isPartOfUtf8Sequence[i] = true;
      if (i + 1 < buffer.length) isPartOfUtf8Sequence[i + 1] = true;
      if (i + 2 < buffer.length) isPartOfUtf8Sequence[i + 2] = true;
    } else if (byte >= 0xF0 && byte <= 0xF7) {
      // 4-byte sequence
      isPartOfUtf8Sequence[i] = true;
      if (i + 1 < buffer.length) isPartOfUtf8Sequence[i + 1] = true;
      if (i + 2 < buffer.length) isPartOfUtf8Sequence[i + 2] = true;
      if (i + 3 < buffer.length) isPartOfUtf8Sequence[i + 3] = true;
    }
  }

  // Count high bytes that are NOT part of UTF-8 sequences
  let isolatedHighBytes = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] >= 0x80 && !isPartOfUtf8Sequence[i]) {
      isolatedHighBytes++;
    }
  }

  // 7. If ANY isolated high bytes found, it's likely CP850
  // Rationale: Valid UTF-8 files have all high bytes in sequences.
  // CP850 files have single-byte chars in the 0x80-0xFF range.
  if (isolatedHighBytes > 0) {
    return { content: decodeCp850(buffer), encoding: 'cp850' };
  }

  // 8. All high bytes are in UTF-8 sequences, but could still be accidental
  // Check high-byte density: CP850 bytes that accidentally form UTF-8 create high density
  // Example: 'Opgørelse' in CP850 (9 bytes, 1 high) vs UTF-8 (10 bytes, 2 high)
  //          But 'Ã©' in CP850 (2 bytes, 2 high = 100%!) vs UTF-8 'ø' (2 bytes, 2 high = 100%)
  // For ambiguous SHORT files, default to CP850 (historical NAV default)
  // For longer files with low density, it's likely legitimate UTF-8
  const highBytePercentage = (highByteCount / buffer.length) * 100;

  // If >30% of bytes are high AND all are in valid UTF-8 sequences:
  // - Very short files with many accents (ambiguous) → default to CP850
  // - Real UTF-8 files have lower density due to ASCII keywords/structure
  if (highBytePercentage > 30) {
    return { content: decodeCp850(buffer), encoding: 'cp850' };
  }

  // 9. Low high-byte density and all bytes in valid UTF-8 sequences → it's UTF-8
  return { content: utf8Content, encoding: 'utf-8' };
}

/**
 * Read a file and detect its encoding (UTF-8 vs CP850) - Synchronous version
 *
 * @param filePath - Path to the file to read
 * @returns EncodingResult with content and detected encoding
 * @throws Error if file cannot be read
 *
 * @example
 * readFileWithEncoding("/path/to/file.txt")
 * // => { content: "OBJECT Table 18 Customer...", encoding: "cp850" }
 *
 * @example
 * readFileWithEncoding("/path/to/utf8-file.txt")
 * // => { content: "OBJECT Table 18 Customer...", encoding: "utf-8" }
 */
export function readFileWithEncoding(filePath: string): EncodingResult {
  // Read file as raw buffer
  const buffer = readFileSync(filePath);
  return detectEncoding(buffer);
}

/**
 * Read a file and detect its encoding (UTF-8 vs CP850) - Async version
 *
 * @param filePath - Path to the file to read
 * @returns Promise resolving to EncodingResult with content and detected encoding
 * @throws Error if file cannot be read
 *
 * @example
 * await readFileWithEncodingAsync("/path/to/file.txt")
 * // => { content: "OBJECT Table 18 Customer...", encoding: "cp850" }
 *
 * @example
 * await readFileWithEncodingAsync("/path/to/utf8-file.txt")
 * // => { content: "OBJECT Table 18 Customer...", encoding: "utf-8" }
 */
export async function readFileWithEncodingAsync(filePath: string): Promise<EncodingResult> {
  // Read file as raw buffer
  const buffer = await readFile(filePath);
  return detectEncoding(buffer);
}
