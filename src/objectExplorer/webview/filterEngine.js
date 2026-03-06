/**
 * Object Explorer Filter Engine
 *
 * Implements C/SIDE-compatible filter expression evaluation.
 * UMD-lite module: works in both Node.js (Jest via require()) and the browser (webview).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(); // Node.js / Jest
  } else {
    root.filterEngine = factory(); // Browser / webview
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Convert wildcard pattern to RegExp.
   * Escapes all regex-special characters except * and ?, then converts
   * * -> .* and ? -> .
   *
   * @param {string} pattern
   * @param {boolean} caseInsensitive
   * @returns {RegExp}
   */
  function wildcardToRegex(pattern, caseInsensitive) {
    // Step 1: Escape ALL regex-special characters EXCEPT * and ?
    var escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Step 2: Collapse consecutive * to prevent ReDoS (** -> *, *** -> *, etc.)
    var deduped = escaped.replace(/\*+/g, '*');
    // Step 3: Convert wildcards to regex equivalents
    var regexStr = deduped.replace(/\*/g, '.*').replace(/\?/g, '.');
    // Step 4: Anchor and apply flags
    var flags = caseInsensitive ? 'i' : '';
    return new RegExp('^' + regexStr + '$', flags);
  }

  /**
   * Compare two values, numerically if both parse as numbers, otherwise lexicographically.
   *
   * @param {string|number} a
   * @param {string|number} b
   * @param {boolean} isNumeric
   * @returns {number} negative if a < b, 0 if equal, positive if a > b
   */
  function compareValues(a, b, isNumeric) {
    if (isNumeric) {
      var na = parseFloat(String(a));
      var nb = parseFloat(String(b));
      if (!isNaN(na) && !isNaN(nb)) {
        return na < nb ? -1 : na > nb ? 1 : 0;
      }
    }
    var sa = String(a);
    var sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }

  /**
   * Evaluate a single atomic condition against a field value.
   * The condition has already had its @ prefix stripped; caseInsensitive is passed in.
   *
   * @param {string|number} fieldValue  Already normalized (boolean -> "Yes"/"No")
   * @param {string} condition          Trimmed, no @ prefix
   * @param {boolean} caseInsensitive
   * @param {boolean} isNumeric
   * @returns {boolean}
   */
  function evaluateCondition(fieldValue, condition, caseInsensitive, isNumeric) {
    // 1. <> with wildcard: starts with <> and remainder contains * or ?
    if (condition.indexOf('<>') === 0) {
      var notRemainder = condition.slice(2);
      if (notRemainder.indexOf('*') !== -1 || notRemainder.indexOf('?') !== -1) {
        var notRegex = wildcardToRegex(notRemainder, caseInsensitive);
        return !notRegex.test(String(fieldValue));
      }
    }

    // 2. Comparison operators: <>, >=, <=, >, <
    if (condition.indexOf('<>') === 0) {
      var cmpVal = condition.slice(2);
      if (cmpVal === '') {
        // <> alone: matches any non-empty value (NAV convention)
        return String(fieldValue) !== '';
      }
      return compareValues(fieldValue, cmpVal, isNumeric) !== 0;
    }
    if (condition.indexOf('>=') === 0) {
      var cmpVal = condition.slice(2);
      return compareValues(fieldValue, cmpVal, isNumeric) >= 0;
    }
    if (condition.indexOf('<=') === 0) {
      var cmpVal = condition.slice(2);
      return compareValues(fieldValue, cmpVal, isNumeric) <= 0;
    }
    if (condition.indexOf('>') === 0) {
      var cmpVal = condition.slice(1);
      return compareValues(fieldValue, cmpVal, isNumeric) > 0;
    }
    if (condition.indexOf('<') === 0) {
      var cmpVal = condition.slice(1);
      return compareValues(fieldValue, cmpVal, isNumeric) < 0;
    }

    // 3. Range: contains ..
    var dotDotIdx = condition.indexOf('..');
    if (dotDotIdx !== -1) {
      var left = condition.slice(0, dotDotIdx);
      var right = condition.slice(dotDotIdx + 2);
      // Open range both sides — always matches
      if (left === '' && right === '') {
        return true;
      }
      if (left !== '' && compareValues(fieldValue, left, isNumeric) < 0) {
        return false;
      }
      if (right !== '' && compareValues(fieldValue, right, isNumeric) > 0) {
        return false;
      }
      return true;
    }

    // 4. Wildcard: contains * or ?
    if (condition.indexOf('*') !== -1 || condition.indexOf('?') !== -1) {
      var regex = wildcardToRegex(condition, caseInsensitive);
      return regex.test(String(fieldValue));
    }

    // 5. Exact match
    if (caseInsensitive) {
      return String(fieldValue).toLowerCase() === condition.toLowerCase();
    }
    if (isNumeric) {
      return compareValues(fieldValue, condition, isNumeric) === 0;
    }
    return String(fieldValue) === condition;
  }

  /**
   * Test a field value against a single AND-branch (may contain & conditions).
   *
   * @param {string|number} normalizedValue
   * @param {string} branch
   * @param {boolean} isNumeric
   * @returns {boolean}
   */
  function evaluateAndBranch(normalizedValue, branch, isNumeric) {
    var conditions = branch.split('&');
    for (var i = 0; i < conditions.length; i++) {
      var raw = conditions[i].trim();
      var caseInsensitive = false;
      if (raw.charAt(0) === '@') {
        caseInsensitive = true;
        raw = raw.slice(1);
      }
      if (!evaluateCondition(normalizedValue, raw, caseInsensitive, isNumeric)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Test whether a field value matches a C/SIDE filter expression.
   *
   * @param {string|number|boolean} fieldValue  The field value to test
   * @param {string} expression                 The C/SIDE filter expression
   * @returns {boolean}
   */
  function matchesFilter(fieldValue, expression) {
    // 1. Trim the expression
    var expr = expression.trim();

    // 2. Empty → always match
    if (expr === '') {
      return true;
    }

    // Normalize the field value
    var isNumeric = typeof fieldValue === 'number';
    var normalized;
    if (typeof fieldValue === 'boolean') {
      normalized = fieldValue ? 'Yes' : 'No';
      isNumeric = false;
    } else {
      normalized = fieldValue;
    }

    // 3. Split by | → OR-branches
    var branches = expr.split('|');
    for (var i = 0; i < branches.length; i++) {
      var branch = branches[i].trim();
      if (evaluateAndBranch(normalized, branch, isNumeric)) {
        return true;
      }
    }
    return false;
  }

  return { matchesFilter: matchesFilter };
});
