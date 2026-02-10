/**
 * Attribute Data
 *
 * Registry of known C/AL procedure attributes (NAV 2013 - BC14).
 * Provides case-insensitive lookup for attribute validation.
 */

/**
 * Known C/AL procedure attributes (NAV 2013 - BC14)
 *
 * Valid attributes:
 * - External: Public API marker (NAV 2016+)
 * - TryFunction: Error-handling function (all C/AL versions)
 * - Integration: Integration event publisher (NAV 2016+)
 * - EventSubscriber: Event subscriber registration (NAV 2016+)
 *
 * AL-only attributes NOT supported in C/AL:
 * - Internal (BC 19+)
 * - Scope (BC 15+)
 * - BusinessEvent (BC 15+)
 * - IntegrationEvent (BC 15+)
 * - Obsolete (BC 15+)
 */
export const KNOWN_CAL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'external',
  'tryfunction',
  'integration',
  'eventsubscriber'
]);

/**
 * Known C/AL procedure attributes with proper casing
 * Used for suggestions in diagnostics
 */
export const KNOWN_CAL_ATTRIBUTES_CASED: readonly string[] = [
  'External',
  'TryFunction',
  'Integration',
  'EventSubscriber'
];

/**
 * Check if an attribute name is a known C/AL attribute.
 * Case-insensitive comparison.
 *
 * @param name - Attribute name to check
 * @returns true if the attribute is known in C/AL, false otherwise
 */
export function isKnownAttribute(name: string): boolean {
  return KNOWN_CAL_ATTRIBUTES.has(name.toLowerCase());
}
