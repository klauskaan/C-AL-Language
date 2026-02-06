/**
 * BuiltinRegistry
 *
 * Central registry of C/AL builtin functions and record methods.
 * Provides case-insensitive lookup for semantic validation.
 *
 * IMPORTANT: This registry contains CALLABLE identifiers only.
 * It does NOT include syntactic keywords like IF, THEN, BEGIN, END, etc.
 */

import { BUILTIN_FUNCTIONS, RECORD_METHODS } from './builtinData';

export class BuiltinRegistry {
  /**
   * Global builtin functions that can be called without a receiver
   * Examples: MESSAGE, ERROR, CONFIRM, FORMAT, STRLEN
   * Maps function name (uppercase) to deprecation reason (undefined if not deprecated)
   */
  private globalFunctions: Map<string, string | undefined> = new Map();

  /**
   * Record methods that can be called on Record variables
   * Examples: FIND, GET, INSERT, MODIFY, DELETE, SETRANGE, FINDSET, NEXT
   * Maps method name (uppercase) to deprecation reason (undefined if not deprecated)
   */
  private recordMethods: Map<string, string | undefined> = new Map();

  constructor() {
    // Build maps from the data arrays
    for (const fn of BUILTIN_FUNCTIONS) {
      this.globalFunctions.set(fn.name.toUpperCase(), fn.deprecated);
    }
    for (const method of RECORD_METHODS) {
      this.recordMethods.set(method.name.toUpperCase(), method.deprecated);
    }
  }

  /**
   * Check if a name is a global builtin function (case-insensitive)
   */
  public isGlobalFunction(name: string): boolean {
    return this.globalFunctions.has(name.toUpperCase());
  }

  /**
   * Check if a name is a record method (case-insensitive)
   */
  public isRecordMethod(name: string): boolean {
    return this.recordMethods.has(name.toUpperCase());
  }

  /**
   * Check if a name is any kind of builtin (case-insensitive)
   */
  public isKnownBuiltin(name: string): boolean {
    return this.isGlobalFunction(name) || this.isRecordMethod(name);
  }

  /**
   * Get deprecation reason for a builtin (case-insensitive)
   * Returns undefined if the builtin is not deprecated or not found
   */
  public getDeprecationReason(name: string): string | undefined {
    const key = name.toUpperCase();

    // Check global functions first
    if (this.globalFunctions.has(key)) {
      return this.globalFunctions.get(key);
    }

    // Check record methods
    if (this.recordMethods.has(key)) {
      return this.recordMethods.get(key);
    }

    return undefined;
  }
}
