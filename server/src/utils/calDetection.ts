/**
 * C/AL Content Detection
 *
 * Heuristic detection to determine if a .txt file contains C/AL object definition.
 * Checks if file starts with "OBJECT " (case-insensitive, 7 chars including trailing space).
 *
 * Why only 64 bytes?
 * - NAV exports always start with "OBJECT Type ID Name" at or near the beginning
 * - Allows for UTF-8 BOM (3 bytes) and leading whitespace
 * - Fast enough for workspace indexing (avoids reading large files)
 *
 * Returns false on any error (file not found, permission denied, etc.)
 */

import * as fs from 'fs/promises';

/**
 * Checks if a file contains C/AL object definition by reading first 64 bytes
 * and checking for "OBJECT " prefix.
 *
 * @param filePath - Absolute path to the file to check
 * @returns Promise<boolean> - true if file starts with "OBJECT " (case-insensitive),
 *                             false otherwise or on any error
 *
 * @example
 * // C/AL file exported from NAV
 * await isCalContent('/path/to/Table18.txt')
 * // => true
 *
 * @example
 * // README file
 * await isCalContent('/path/to/README.txt')
 * // => false
 *
 * @example
 * // Non-existent file
 * await isCalContent('/path/to/missing.txt')
 * // => false
 */
export async function isCalContent(filePath: string): Promise<boolean> {
  let fileHandle: fs.FileHandle | undefined;

  try {
    // Open file for reading
    fileHandle = await fs.open(filePath, 'r');

    // Read first 64 bytes
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await fileHandle.read(buffer, 0, 64, 0);

    // Extract actual content read
    const content = buffer.subarray(0, bytesRead);

    // Strip UTF-8 BOM if present (0xEF 0xBB 0xBF)
    let text = content;
    if (bytesRead >= 3 && content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
      text = content.subarray(3);
    }

    // Convert to ASCII string (handles UTF-8 gracefully)
    const str = text.toString('utf8');

    // Trim leading whitespace
    const trimmed = str.trimStart();

    // Check if starts with "OBJECT " (7 chars, case-insensitive, WITH trailing space)
    const startsWithObject = trimmed.length >= 7 &&
                             trimmed.substring(0, 7).toUpperCase() === 'OBJECT ';

    return startsWithObject;
  } catch (error) {
    // Return false on any error (file not found, permission denied, etc.)
    return false;
  } finally {
    // Close file handle if opened
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
