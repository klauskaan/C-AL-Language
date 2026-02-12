/**
 * File discovery utilities for workspace indexing
 * Recursively discovers files in directories with filtering support
 */

import { readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Recursively discover files in a directory tree
 *
 * @param directory - Root directory to search
 * @param filter - Predicate function to filter filenames (true = include)
 * @returns Promise resolving to array of absolute file paths
 * @throws Error if directory doesn't exist or can't be read
 *
 * @example
 * // Find all .cal files
 * const calFiles = await discoverFiles('/workspace', filename => filename.endsWith('.cal'));
 * // => ['/workspace/Table18.cal', '/workspace/src/Codeunit1.cal']
 *
 * @example
 * // Find all files (no filter)
 * const allFiles = await discoverFiles('/workspace', () => true);
 */
export async function discoverFiles(
  directory: string,
  filter: (filename: string) => boolean
): Promise<string[]> {
  const results: string[] = [];

  try {
    // Read directory entries with file type information
    const entries = await readdir(directory, { withFileTypes: true });

    // Process each entry
    for (const entry of entries) {
      const fullPath = join(directory, entry.name);

      try {
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subResults = await discoverFiles(fullPath, filter);
          results.push(...subResults);
        } else if (entry.isFile() && filter(entry.name)) {
          // Add file if it passes filter
          results.push(fullPath);
        }
      } catch (error) {
        // Skip entries that can't be accessed (permission errors, etc.)
        // This is intentional - continue with other files
        continue;
      }
    }
  } catch (error) {
    // If the root directory can't be read, throw error
    throw new Error(`Cannot read directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return results;
}
