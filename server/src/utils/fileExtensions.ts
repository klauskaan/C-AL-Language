/**
 * File extension utility functions for C/AL Language Server
 */

/**
 * Checks if a filename has a .txt extension (case-insensitive)
 * @param filename - The filename or path to check
 * @returns true if the filename ends with .txt (any case), false otherwise.
 *          Returns false for non-string values (null, undefined, numbers, objects, etc.)
 *          to enable safe usage in filter callbacks.
 */
export function hasTxtExtension(filename: string): boolean {
  return typeof filename === 'string' && filename.toLowerCase().endsWith('.txt');
}

/**
 * Checks if a filename has a .cal extension (case-insensitive)
 * @param filename - The filename or path to check
 * @returns true if the filename ends with .cal (any case), false otherwise.
 *          Returns false for non-string values (null, undefined, numbers, objects, etc.)
 *          to enable safe usage in filter callbacks.
 */
export function hasCalExtension(filename: string): boolean {
  return typeof filename === 'string' && filename.toLowerCase().endsWith('.cal');
}
