import * as fs from 'fs';
import * as path from 'path';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

let registry: vsctm.Registry | null = null;

/**
 * Initialize the WASM-based oniguruma library and create the grammar registry.
 * Must be called before tokenizing any code.
 */
export async function initializeGrammar(): Promise<void> {
  if (registry) {
    return; // Already initialized
  }

  // Load the WASM binary
  const wasmBin = fs.readFileSync(
    require.resolve('vscode-oniguruma/release/onig.wasm')
  ).buffer;
  await oniguruma.loadWASM(wasmBin);

  // Create the registry with our C/AL grammar
  const grammarPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'syntaxes',
    'cal.tmLanguage.json'
  );

  registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
      createOnigString: (str) => new oniguruma.OnigString(str)
    }),
    loadGrammar: async (scopeName) => {
      if (scopeName === 'source.cal') {
        const grammarContent = fs.readFileSync(grammarPath, 'utf8');
        return vsctm.parseRawGrammar(grammarContent, grammarPath);
      }
      return null;
    }
  });
}

/**
 * Tokenize C/AL code and return the token results.
 * Returns an array of lines, each containing an array of tokens.
 */
export async function tokenizeLines(
  code: string
): Promise<Array<Array<{ text: string; scopes: string[] }>>> {
  if (!registry) {
    throw new Error('Grammar not initialized. Call initializeGrammar() first.');
  }

  const grammar = await registry.loadGrammar('source.cal');
  if (!grammar) {
    throw new Error('Failed to load C/AL grammar');
  }

  const lines = code.split('\n');
  const results: Array<Array<{ text: string; scopes: string[] }>> = [];

  let ruleStack = vsctm.INITIAL;
  for (const line of lines) {
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    ruleStack = lineTokens.ruleStack;

    const tokens: Array<{ text: string; scopes: string[] }> = [];
    for (let i = 0; i < lineTokens.tokens.length; i++) {
      const token = lineTokens.tokens[i];
      const startIndex = token.startIndex;
      const endIndex =
        i + 1 < lineTokens.tokens.length
          ? lineTokens.tokens[i + 1].startIndex
          : line.length;

      tokens.push({
        text: line.substring(startIndex, endIndex),
        scopes: token.scopes
      });
    }

    results.push(tokens);
  }

  return results;
}

/**
 * Format tokenization results as a snapshot string.
 * Lines prefixed with '>' show source code.
 * Token lines show the token text (JSON-quoted, left-padded) and innermost scope.
 */
export async function toGrammarSnapshot(code: string): Promise<string> {
  const tokenizedLines = await tokenizeLines(code);
  const lines = code.split('\n');
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    // Show source line prefixed with '>'
    output.push(`>${lines[i]}`);

    // Show tokens for this line
    const tokens = tokenizedLines[i];
    for (const token of tokens) {
      // Get innermost scope (last in the array)
      const innermostScope = token.scopes[token.scopes.length - 1];

      // Format: quoted text (padded to ~25 chars) + innermost scope
      const quotedText = JSON.stringify(token.text);
      const paddedText = quotedText.padEnd(25);

      output.push(` ${paddedText} ${innermostScope}`);
    }
  }

  return output.join('\n');
}
