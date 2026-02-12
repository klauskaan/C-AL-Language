/**
 * Settings Types and Defaults
 *
 * Defines the shape of user settings and default values.
 */

export interface CALSettings {
  diagnostics: {
    warnDeprecated: boolean;
    warnUnknownAttributes: boolean;
  };
  workspaceIndexing: {
    includeTxtFiles: boolean;
  };
}

export const defaultSettings: CALSettings = {
  diagnostics: {
    warnDeprecated: true,
    warnUnknownAttributes: true
  },
  workspaceIndexing: {
    includeTxtFiles: true
  }
};
