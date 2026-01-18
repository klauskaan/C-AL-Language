/**
 * File extension utility functions for C/AL Language Server
 */

/**
 * Checks if a filename has a .txt extension (case-insensitive)
 * @param filename - The filename or path to check
 * @returns true if the filename ends with .txt (any case), false otherwise
 */
export function hasTxtExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith('.txt');
}

/**
 * Checks if a filename has a .cal extension (case-insensitive)
 * @param filename - The filename or path to check
 * @returns true if the filename ends with .cal (any case), false otherwise
 */
export function hasCalExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith('.cal');
}
