/**
 * ESLint Local Rules Loader
 *
 * This file exports custom ESLint rules for the C/AL Language extension.
 * The eslint-plugin-local-rules package requires this file to be at the
 * project root with this specific name.
 */

module.exports = {
  'no-direct-parse-error': require('./eslint-rules/no-direct-parse-error'),
};
