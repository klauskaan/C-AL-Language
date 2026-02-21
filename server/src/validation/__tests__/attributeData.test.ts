/**
 * Attribute Data Tests
 *
 * Tests for the attribute registry data structure that tracks known C/AL attributes.
 * This is a foundational unit test before building the validator.
 *
 * Valid C/AL attributes (NAV 2013 through BC14):
 * - [External]
 * - [TryFunction]
 * - [Integration(TRUE/FALSE)]
 * - [EventSubscriber(...)]
 * - [Internal] - NAV 2017+
 * - [ServiceEnabled] - NAV 2017+
 *
 * Note: AL-only attributes like [Scope('OnPrem')], [BusinessEvent]
 * are NOT supported in C/AL and should return false.
 */

import { isKnownAttribute } from '../attributeData';

describe('attributeData - isKnownAttribute', () => {
  describe('Known C/AL Attributes', () => {
    it('should return true for [External]', () => {
      expect(isKnownAttribute('External')).toBe(true);
    });

    it('should return true for [TryFunction]', () => {
      expect(isKnownAttribute('TryFunction')).toBe(true);
    });

    it('should return true for [Integration]', () => {
      expect(isKnownAttribute('Integration')).toBe(true);
    });

    it('should return true for [EventSubscriber]', () => {
      expect(isKnownAttribute('EventSubscriber')).toBe(true);
    });
  });

  describe('Case Insensitivity', () => {
    it('should return true for lowercase "external"', () => {
      expect(isKnownAttribute('external')).toBe(true);
    });

    it('should return true for uppercase "EXTERNAL"', () => {
      expect(isKnownAttribute('EXTERNAL')).toBe(true);
    });

    it('should return true for mixed case "External"', () => {
      expect(isKnownAttribute('External')).toBe(true);
    });

    it('should return true for lowercase "tryfunction"', () => {
      expect(isKnownAttribute('tryfunction')).toBe(true);
    });

    it('should return true for uppercase "TRYFUNCTION"', () => {
      expect(isKnownAttribute('TRYFUNCTION')).toBe(true);
    });

    it('should return true for mixed case "TryFunction"', () => {
      expect(isKnownAttribute('TryFunction')).toBe(true);
    });

    it('should return true for lowercase "integration"', () => {
      expect(isKnownAttribute('integration')).toBe(true);
    });

    it('should return true for uppercase "INTEGRATION"', () => {
      expect(isKnownAttribute('INTEGRATION')).toBe(true);
    });

    it('should return true for lowercase "eventsubscriber"', () => {
      expect(isKnownAttribute('eventsubscriber')).toBe(true);
    });

    it('should return true for uppercase "EVENTSUBSCRIBER"', () => {
      expect(isKnownAttribute('EVENTSUBSCRIBER')).toBe(true);
    });
  });

  describe('Unknown Attributes', () => {
    it('should return true for [Internal] (NAV 2017+, C/AL)', () => {
      expect(isKnownAttribute('Internal')).toBe(true);
    });

    it('should return true for [ServiceEnabled] (NAV 2017+, C/AL)', () => {
      expect(isKnownAttribute('ServiceEnabled')).toBe(true);
    });

    it('should return false for [Scope] (AL-only)', () => {
      expect(isKnownAttribute('Scope')).toBe(false);
    });

    it('should return false for [BusinessEvent] (AL-only)', () => {
      expect(isKnownAttribute('BusinessEvent')).toBe(false);
    });

    it('should return false for [IntegrationEvent] (AL-only)', () => {
      expect(isKnownAttribute('IntegrationEvent')).toBe(false);
    });

    it('should return false for typo "Extrnal"', () => {
      expect(isKnownAttribute('Extrnal')).toBe(false);
    });

    it('should return false for typo "TryFunctin"', () => {
      expect(isKnownAttribute('TryFunctin')).toBe(false);
    });

    it('should return false for completely unknown "CustomAttribute"', () => {
      expect(isKnownAttribute('CustomAttribute')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isKnownAttribute('')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should return false for whitespace-only string', () => {
      expect(isKnownAttribute('   ')).toBe(false);
    });

    it('should return false for null/undefined-like strings', () => {
      expect(isKnownAttribute('null')).toBe(false);
      expect(isKnownAttribute('undefined')).toBe(false);
    });
  });
});
