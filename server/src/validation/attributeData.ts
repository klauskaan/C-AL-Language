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
 * - Test: Test function marker (NAV 2016+)
 * - CheckPrecondition: Precondition check for upgrade codeunits (NAV 2016+)
 * - TableSyncSetup: Table sync setup for upgrade codeunits (NAV 2016+)
 * - Internal: Internal access modifier (NAV 2017+, 10.0 through BC14)
 * - ServiceEnabled: Web service method marker (NAV 2017+, 10.0 through BC14)
 *
 * AL-only attributes NOT supported in C/AL:
 * - Scope (BC 15+)
 * - BusinessEvent (BC 15+)
 * - IntegrationEvent (BC 15+)
 * - Obsolete (BC 15+)
 */
export const KNOWN_CAL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'external',
  'tryfunction',
  'integration',
  'eventsubscriber',
  'test',
  'checkprecondition',
  'tablesyncsetup',
  'internal',
  'serviceenabled'
]);

/**
 * Known C/AL procedure attributes with proper casing
 * Used for suggestions in diagnostics
 */
export const KNOWN_CAL_ATTRIBUTES_CASED: readonly string[] = [
  'External',
  'TryFunction',
  'Integration',
  'EventSubscriber',
  'Test',
  'CheckPrecondition',
  'TableSyncSetup',
  'Internal',
  'ServiceEnabled'
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
