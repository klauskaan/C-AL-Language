/**
 * BuiltinRegistry
 *
 * Central registry of C/AL builtin functions and record methods.
 * Provides case-insensitive lookup for semantic validation.
 *
 * IMPORTANT: This registry contains CALLABLE identifiers only.
 * It does NOT include syntactic keywords like IF, THEN, BEGIN, END, etc.
 */

import { BUILTIN_FUNCTIONS, RECORD_METHODS, BuiltinFunction } from './builtinData';

export class BuiltinRegistry {
  /**
   * Global builtin functions that can be called without a receiver
   * Examples: MESSAGE, ERROR, CONFIRM, FORMAT, STRLEN
   * Maps function name (uppercase) to full function object
   */
  private globalFunctions: Map<string, BuiltinFunction> = new Map();

  /**
   * Record methods that can be called on Record variables
   * Examples: FIND, GET, INSERT, MODIFY, DELETE, SETRANGE, FINDSET, NEXT
   * Maps method name (uppercase) to full function object
   */
  private recordMethods: Map<string, BuiltinFunction> = new Map();

  constructor() {
    // Build maps from the data arrays
    for (const fn of BUILTIN_FUNCTIONS) {
      this.globalFunctions.set(fn.name.toUpperCase(), fn);
    }
    for (const method of RECORD_METHODS) {
      this.recordMethods.set(method.name.toUpperCase(), method);
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
   * Get the full function object for a global function (case-insensitive)
   * Returns undefined if not found
   */
  public getGlobalFunction(name: string): BuiltinFunction | undefined {
    return this.globalFunctions.get(name.toUpperCase());
  }

  /**
   * Get the full function object for a record method (case-insensitive)
   * Returns undefined if not found
   */
  public getRecordMethod(name: string): BuiltinFunction | undefined {
    return this.recordMethods.get(name.toUpperCase());
  }

  /**
   * Get deprecation reason for a global function (case-insensitive)
   * Returns undefined if the function is not deprecated or not found
   */
  public getGlobalFunctionDeprecation(name: string): string | undefined {
    return this.globalFunctions.get(name.toUpperCase())?.deprecated;
  }

  /**
   * Get deprecation reason for a record method (case-insensitive)
   * Returns undefined if the method is not deprecated or not found
   */
  public getRecordMethodDeprecation(name: string): string | undefined {
    return this.recordMethods.get(name.toUpperCase())?.deprecated;
  }

  /**
   * Get deprecation reason for a builtin (case-insensitive)
   * Returns undefined if the builtin is not deprecated or not found
   */
  public getDeprecationReason(name: string): string | undefined {
    const key = name.toUpperCase();
    const func = this.globalFunctions.get(key) || this.recordMethods.get(key);
    return func?.deprecated;
  }
}
