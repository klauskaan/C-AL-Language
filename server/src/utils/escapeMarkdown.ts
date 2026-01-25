/**
 * Escape markdown special characters to prevent rendering issues.
 * Backslash must be escaped FIRST to avoid double-escaping.
 * Newlines are replaced with visible \n to preserve list structure.
 *
 * Note: Use only for display text, not for URL paths in links.
 * Actual newlines become visible \n, while literal backslash-n
 * sequences get backslash-escaped to \\n.
 *
 * @param text - Text to escape
 * @returns Escaped text safe for markdown
 *
 * @example
 * escapeMarkdown("*bold* and _italic_")
 * // => "\\*bold\\* and \\_italic\\_"
 *
 * @example
 * escapeMarkdown("Code: `example`")
 * // => "Code: \\`example\\`"
 *
 * @example
 * escapeMarkdown("Line1\nLine2")
 * // => "Line1\\nLine2"
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')      // Backslash first!
    .replace(/\r\n/g, '\\n')     // Windows newlines (must be before \r and \n)
    .replace(/\n/g, '\\n')       // Unix newlines
    .replace(/\r/g, '\\n')       // Old Mac newlines
    .replace(/\|/g, '\\|')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/~/g, '\\~');
}
