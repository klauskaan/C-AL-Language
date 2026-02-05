/**
 * DocumentDebouncer Tests
 *
 * Tests for the per-URI debounce timer utility used by semantic validation.
 * Validates that:
 * - Timers are managed independently per document URI
 * - Callbacks only fire for valid documents with matching versions
 * - Cleanup operations (cancel, cancelAll) work correctly
 */

import { DocumentDebouncer } from '../utils/documentDebouncer';

describe('DocumentDebouncer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Debounce', () => {
    it('should fire callback after the delay', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(299);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should check document state before firing callback', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      jest.advanceTimersByTime(300);

      expect(documentChecker).toHaveBeenCalledWith('file:///test.cal');
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Reschedule Same URI', () => {
    it('should cancel previous timer when rescheduling same URI', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback1);

      jest.advanceTimersByTime(150);

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback2);

      // Advance to where first timer would have fired
      jest.advanceTimersByTime(150);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();

      // Advance to where second timer fires
      jest.advanceTimersByTime(150);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Independent URIs', () => {
    it('should manage timers independently for different URIs', () => {
      const debouncer = new DocumentDebouncer(300);
      const callbackA = jest.fn();
      const callbackB = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///a.cal', 1, documentChecker, callbackA);
      jest.advanceTimersByTime(100);
      debouncer.schedule('file:///b.cal', 1, documentChecker, callbackB);

      // After 200ms total: A timer at 200ms, B timer at 100ms
      jest.advanceTimersByTime(100);
      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).not.toHaveBeenCalled();

      // After 300ms total: A fires (300ms since schedule), B at 200ms
      jest.advanceTimersByTime(100);
      expect(callbackA).toHaveBeenCalledTimes(1);
      expect(callbackB).not.toHaveBeenCalled();

      // After 400ms total: B fires (300ms since schedule)
      jest.advanceTimersByTime(100);
      expect(callbackA).toHaveBeenCalledTimes(1);
      expect(callbackB).toHaveBeenCalledTimes(1);
    });
  });

  describe('Document Closed Before Fire', () => {
    it('should not fire callback if timer is cancelled', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      jest.advanceTimersByTime(150);

      debouncer.cancel('file:///test.cal');

      jest.advanceTimersByTime(200);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Document Version Changed', () => {
    it('should not fire callback if document version changed', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();

      // Schedule with version 1, but checker returns version 2 when timer fires
      const documentChecker = jest.fn(() => ({ version: 2 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      jest.advanceTimersByTime(300);

      expect(documentChecker).toHaveBeenCalledWith('file:///test.cal');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should fire callback if document version matches', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 5 }));

      debouncer.schedule('file:///test.cal', 5, documentChecker, callback);

      jest.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Document No Longer Exists', () => {
    it('should not fire callback if documentChecker returns undefined', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();

      const documentChecker = jest.fn(() => undefined);

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      jest.advanceTimersByTime(300);

      expect(documentChecker).toHaveBeenCalledWith('file:///test.cal');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Only Affects Target URI', () => {
    it('should only cancel the specified URI timer', () => {
      const debouncer = new DocumentDebouncer(300);
      const callbackA = jest.fn();
      const callbackB = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///a.cal', 1, documentChecker, callbackA);
      debouncer.schedule('file:///b.cal', 1, documentChecker, callbackB);

      debouncer.cancel('file:///a.cal');

      jest.advanceTimersByTime(300);

      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel All', () => {
    it('should cancel all pending timers', () => {
      const debouncer = new DocumentDebouncer(300);
      const callbackA = jest.fn();
      const callbackB = jest.fn();
      const callbackC = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///a.cal', 1, documentChecker, callbackA);
      debouncer.schedule('file:///b.cal', 1, documentChecker, callbackB);
      debouncer.schedule('file:///c.cal', 1, documentChecker, callbackC);

      debouncer.cancelAll();

      jest.advanceTimersByTime(300);

      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).not.toHaveBeenCalled();
      expect(callbackC).not.toHaveBeenCalled();
    });
  });

  describe('Has Pending', () => {
    it('should return true for scheduled URIs', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      expect(debouncer.hasPending('file:///test.cal')).toBe(false);

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      expect(debouncer.hasPending('file:///test.cal')).toBe(true);
    });

    it('should return false after timer fires', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      expect(debouncer.hasPending('file:///test.cal')).toBe(true);

      jest.advanceTimersByTime(300);

      expect(debouncer.hasPending('file:///test.cal')).toBe(false);
    });

    it('should return false after cancel', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);

      expect(debouncer.hasPending('file:///test.cal')).toBe(true);

      debouncer.cancel('file:///test.cal');

      expect(debouncer.hasPending('file:///test.cal')).toBe(false);
    });

    it('should return false for all URIs after cancelAll', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///a.cal', 1, documentChecker, callback);
      debouncer.schedule('file:///b.cal', 1, documentChecker, callback);

      expect(debouncer.hasPending('file:///a.cal')).toBe(true);
      expect(debouncer.hasPending('file:///b.cal')).toBe(true);

      debouncer.cancelAll();

      expect(debouncer.hasPending('file:///a.cal')).toBe(false);
      expect(debouncer.hasPending('file:///b.cal')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cancelling non-existent URI gracefully', () => {
      const debouncer = new DocumentDebouncer(300);

      expect(() => debouncer.cancel('file:///nonexistent.cal')).not.toThrow();
    });

    it('should handle multiple cancelAll calls', () => {
      const debouncer = new DocumentDebouncer(300);
      const callback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      debouncer.schedule('file:///test.cal', 1, documentChecker, callback);
      debouncer.cancelAll();
      debouncer.cancelAll();

      jest.advanceTimersByTime(300);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle rapid reschedule of same URI', () => {
      const debouncer = new DocumentDebouncer(300);
      const callbacks = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()];
      const documentChecker = jest.fn(() => ({ version: 1 }));

      for (let i = 0; i < 5; i++) {
        debouncer.schedule('file:///test.cal', 1, documentChecker, callbacks[i]);
        jest.advanceTimersByTime(50);
      }

      // Advance enough to fire the last scheduled callback
      jest.advanceTimersByTime(300);

      expect(callbacks[0]).not.toHaveBeenCalled();
      expect(callbacks[1]).not.toHaveBeenCalled();
      expect(callbacks[2]).not.toHaveBeenCalled();
      expect(callbacks[3]).not.toHaveBeenCalled();
      expect(callbacks[4]).toHaveBeenCalledTimes(1);
    });

    it('should support different delays per debouncer instance', () => {
      const fast = new DocumentDebouncer(100);
      const slow = new DocumentDebouncer(500);
      const fastCallback = jest.fn();
      const slowCallback = jest.fn();
      const documentChecker = jest.fn(() => ({ version: 1 }));

      fast.schedule('file:///test.cal', 1, documentChecker, fastCallback);
      slow.schedule('file:///test.cal', 1, documentChecker, slowCallback);

      jest.advanceTimersByTime(100);
      expect(fastCallback).toHaveBeenCalledTimes(1);
      expect(slowCallback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(400);
      expect(fastCallback).toHaveBeenCalledTimes(1);
      expect(slowCallback).toHaveBeenCalledTimes(1);
    });
  });
});
