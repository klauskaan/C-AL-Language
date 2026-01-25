/**
 * Unescapes a C/AL string literal content.
 *
 * In C/AL, single quotes within strings are escaped by doubling them.
 * For example: 'It''s working' represents the string "It's working"
 *
 * @param content - The raw string content (without surrounding quotes)
 * @returns The unescaped string with '' converted to '
 *
 * @example
 * unescapeCalString("Hello ''World''")
 * // => "Hello 'World'"
 *
 * @example
 * unescapeCalString("It''s a test")
 * // => "It's a test"
 */
export function unescapeCalString(content: string): string {
    return content.replace(/''/g, "'");
}
