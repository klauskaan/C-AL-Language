/**
 * BuiltinRegistry
 *
 * Central registry of C/AL builtin functions and record methods.
 * Provides case-insensitive lookup for semantic validation.
 *
 * IMPORTANT: This registry contains CALLABLE identifiers only.
 * It does NOT include syntactic keywords like IF, THEN, BEGIN, END, etc.
 */

export class BuiltinRegistry {
  /**
   * Global builtin functions that can be called without a receiver
   * Examples: MESSAGE, ERROR, CONFIRM, FORMAT, STRLEN
   */
  private globalFunctions: Set<string> = new Set();

  /**
   * Record methods that can be called on Record variables
   * Examples: FIND, GET, INSERT, MODIFY, DELETE, SETRANGE, FINDSET, NEXT
   */
  private recordMethods: Set<string> = new Set();

  constructor() {
    this.initializeGlobalFunctions();
    this.initializeRecordMethods();
  }

  /**
   * Initialize the set of global builtin functions
   */
  private initializeGlobalFunctions(): void {
    // Dialog and messaging functions
    this.addGlobalFunction('MESSAGE');
    this.addGlobalFunction('ERROR');
    this.addGlobalFunction('CONFIRM');

    // String functions
    this.addGlobalFunction('FORMAT');
    this.addGlobalFunction('STRSUBSTNO');
    this.addGlobalFunction('STRLEN');
    this.addGlobalFunction('STRPOS');
    this.addGlobalFunction('COPYSTR');
    this.addGlobalFunction('DELSTR');
    this.addGlobalFunction('INSSTR');
    this.addGlobalFunction('UPPERCASE');
    this.addGlobalFunction('LOWERCASE');
    this.addGlobalFunction('CONVERTSTR');
    this.addGlobalFunction('PADSTR');
    this.addGlobalFunction('DELCHR');
    this.addGlobalFunction('INCSTR');

    // Math functions
    this.addGlobalFunction('ROUND');
    this.addGlobalFunction('ABS');
    this.addGlobalFunction('POWER');
    this.addGlobalFunction('RANDOM');
    this.addGlobalFunction('RANDOMIZE');

    // Date/Time functions
    this.addGlobalFunction('TODAY');
    this.addGlobalFunction('TIME');
    this.addGlobalFunction('WORKDATE');
    this.addGlobalFunction('CALCDATE');
    this.addGlobalFunction('CALCTIME');
    this.addGlobalFunction('DATE2DMY');
    this.addGlobalFunction('DATE2DWY');
    this.addGlobalFunction('DMY2DATE');
    this.addGlobalFunction('DWY2DATE');

    // System functions
    this.addGlobalFunction('USERID');
    this.addGlobalFunction('COMPANYNAME');
    this.addGlobalFunction('SERIALNUMBER');
    this.addGlobalFunction('GUIALLOWED');
    this.addGlobalFunction('SLEEP');
    this.addGlobalFunction('CLEAR');
    this.addGlobalFunction('CLEARALL');
    this.addGlobalFunction('EVALUATE');
    this.addGlobalFunction('CREATEGUIDS');
  }

  /**
   * Initialize the set of record methods
   */
  private initializeRecordMethods(): void {
    // Query methods
    this.addRecordMethod('FIND');
    this.addRecordMethod('FINDFIRST');
    this.addRecordMethod('FINDLAST');
    this.addRecordMethod('FINDSET');
    this.addRecordMethod('GET');
    this.addRecordMethod('NEXT');

    // Filter methods
    this.addRecordMethod('SETRANGE');
    this.addRecordMethod('SETFILTER');
    this.addRecordMethod('SETCURRENTKEY');
    this.addRecordMethod('GETRANGEMIN');
    this.addRecordMethod('GETRANGEMAX');
    this.addRecordMethod('GETFILTER');
    this.addRecordMethod('FILTERGROUP');
    this.addRecordMethod('RESET');

    // Modification methods
    this.addRecordMethod('INSERT');
    this.addRecordMethod('MODIFY');
    this.addRecordMethod('MODIFYALL');
    this.addRecordMethod('DELETE');
    this.addRecordMethod('DELETEALL');
    this.addRecordMethod('RENAME');

    // Table/field methods
    this.addRecordMethod('TESTFIELD');
    this.addRecordMethod('VALIDATE');
    this.addRecordMethod('INIT');
    this.addRecordMethod('CALCFIELDS');
    this.addRecordMethod('CALCSUMS');

    // Meta information methods
    this.addRecordMethod('TABLENAME');
    this.addRecordMethod('FIELDNAME');
    this.addRecordMethod('FIELDCAPTION');
    this.addRecordMethod('COUNT');
    this.addRecordMethod('ISEMPTY');

    // Locking and state methods
    this.addRecordMethod('LOCKTABLE');
    this.addRecordMethod('CONSISTENT');
    this.addRecordMethod('CURRENTKEY');
    this.addRecordMethod('HASFILTER');
    this.addRecordMethod('GETPOSITION');
    this.addRecordMethod('SETPOSITION');
  }

  /**
   * Add a global function to the registry (case-insensitive)
   */
  private addGlobalFunction(name: string): void {
    this.globalFunctions.add(name.toUpperCase());
  }

  /**
   * Add a record method to the registry (case-insensitive)
   */
  private addRecordMethod(name: string): void {
    this.recordMethods.add(name.toUpperCase());
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
}
