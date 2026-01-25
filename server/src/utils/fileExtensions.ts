/**
 * File extension utility functions for C/AL Language Server
 */

/**
 * Checks if a filename has a .txt extension (case-insensitive)
 * @param filename - The filename or path to check
 * @returns true if the filename ends with .txt (any case), false otherwise.
 *          Returns false for non-string values (null, undefined, numbers, objects, etc.)
 *          to enable safe usage in filter callbacks.
 *
 * @example
 * hasTxtExtension("document.txt")
 * // => true
 *
 * @example
 * hasTxtExtension("EXPORT.TXT")
 * // => true
 *
 * @example
 * hasTxtExtension("code.al")
 * // => false
 *
 * @example
 * hasTxtExtension(null as unknown as string)
 * // => false
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
 *
 * @example
 * hasCalExtension("source.cal")
 * // => true
 *
 * @example
 * hasCalExtension("CODE.CAL")
 * // => true
 *
 * @example
 * hasCalExtension("document.txt")
 * // => false
 *
 * @example
 * hasCalExtension(null as unknown as string)
 * // => false
 */
export function hasCalExtension(filename: string): boolean {
  return typeof filename === 'string' && filename.toLowerCase().endsWith('.cal');
}
