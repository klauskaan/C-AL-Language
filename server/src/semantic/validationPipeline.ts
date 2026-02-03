/**
 * ValidationPipeline
 *
 * Orchestrates execution of multiple validators.
 * Collects diagnostics from all registered validators and handles errors gracefully.
 */

import { Diagnostic } from 'vscode-languageserver';
import { Validator, ValidationContext } from './types';

export class ValidationPipeline {
  /** Registered validators */
  private validators: Validator[] = [];

  /**
   * Register a validator to run in the pipeline (alias for registerValidator)
   */
  public addValidator(validator: Validator): void {
    this.registerValidator(validator);
  }

  /**
   * Register a validator to run in the pipeline
   */
  public registerValidator(validator: Validator): void {
    this.validators.push(validator);
  }

  /**
   * Validate the document using all registered validators (alias for run)
   * @param context - Validation context to pass to each validator
   * @returns Combined array of diagnostics from all validators
   */
  public validate(context: ValidationContext): Diagnostic[] {
    return this.run(context);
  }

  /**
   * Run all validators and collect diagnostics.
   * Handles validator errors gracefully - logs and continues.
   *
   * @param context - Validation context to pass to each validator
   * @returns Combined array of diagnostics from all validators
   */
  public run(context: ValidationContext): Diagnostic[] {
    const allDiagnostics: Diagnostic[] = [];

    for (const validator of this.validators) {
      try {
        const diagnostics = validator.validate(context);
        // Defensive: Handle validators that incorrectly return null/undefined
        if (diagnostics) {
          allDiagnostics.push(...diagnostics);
        }
      } catch (error) {
        // Log error but continue with other validators
        console.error(`Validator '${validator.name}' failed:`, error);
        // In production, consider adding an internal error diagnostic
        // For now, gracefully continue
      }
    }

    return allDiagnostics;
  }

  /**
   * Get the list of registered validators (for testing/debugging)
   */
  public getValidators(): readonly Validator[] {
    return this.validators;
  }

  /**
   * Clear all registered validators
   */
  public clear(): void {
    this.validators = [];
  }
}
