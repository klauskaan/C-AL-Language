/**
 * DocumentChecker function type
 * @param uri - Document URI to check
 * @returns Document info with version number, or undefined if not found
 */
export type DocumentChecker = (uri: string) => { version: number } | undefined;

/**
 * Per-URI debounce timer utility
 *
 * Manages separate debounce timers for each document URI to prevent race conditions
 * when multiple documents are edited simultaneously.
 *
 * When a timer fires, it verifies that:
 * 1. The document still exists
 * 2. The document version matches the version at schedule time
 *
 * Only calls the callback if both checks pass.
 */
export class DocumentDebouncer {
  private readonly delay: number;
  private readonly timers: Map<string, NodeJS.Timeout>;

  /**
   * @param delay - Debounce delay in milliseconds
   */
  constructor(delay: number) {
    this.delay = delay;
    this.timers = new Map();
  }

  /**
   * Schedule a debounced callback for a specific URI
   *
   * Cancels any existing timer for that URI before scheduling the new one.
   * When the timer fires, verifies document existence and version before calling callback.
   *
   * @param uri - Document URI
   * @param version - Document version at schedule time
   * @param documentChecker - Function to check if document still exists and get current version
   * @param callback - Function to call when timer fires (if validation passes)
   */
  schedule(
    uri: string,
    version: number,
    documentChecker: DocumentChecker,
    callback: () => void
  ): void {
    // Cancel existing timer for this URI
    this.cancel(uri);

    // Schedule new timer
    const timer = setTimeout(() => {
      this.timers.delete(uri);

      // Verify document still exists and version matches
      const doc = documentChecker(uri);
      if (!doc || doc.version !== version) {
        // Document was closed or modified again - skip callback
        return;
      }

      // Document is stable - run callback
      callback();
    }, this.delay);

    this.timers.set(uri, timer);
  }

  /**
   * Cancel pending timer for a specific URI
   * @param uri - Document URI
   */
  cancel(uri: string): void {
    const timer = this.timers.get(uri);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(uri);
    }
  }

  /**
   * Cancel all pending timers
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Check if a timer is pending for a URI
   * @param uri - Document URI
   * @returns true if timer is pending
   */
  hasPending(uri: string): boolean {
    return this.timers.has(uri);
  }
}
