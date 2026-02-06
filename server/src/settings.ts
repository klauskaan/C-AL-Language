/**
 * Settings Types and Defaults
 *
 * Defines the shape of user settings and default values.
 */

export interface CALSettings {
  diagnostics: {
    warnDeprecated: boolean;
  };
}

export const defaultSettings: CALSettings = {
  diagnostics: {
    warnDeprecated: true
  }
};
