#!/usr/bin/env node

/**
 * Toggle Highlighting Mode Script
 *
 * Easily switch between different highlighting test modes:
 * 1. TextMate only (LSP disabled)
 * 2. Semantic tokens only (TextMate disabled)
 * 3. Both enabled (default)
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, 'package.json');
const SETTINGS_JSON = path.join(__dirname, '.vscode', 'settings.json');

const modes = {
  'textmate': {
    name: 'TextMate Only',
    description: 'LSP disabled, only TextMate grammar highlighting',
    settings: {
      'cal.languageServer.enabled': false,
      'cal.semanticHighlighting.enabled': false
    },
    disableGrammar: false
  },
  'semantic': {
    name: 'Semantic Tokens Only',
    description: 'TextMate disabled, only LSP semantic highlighting',
    settings: {
      'cal.languageServer.enabled': true,
      'cal.semanticHighlighting.enabled': true
    },
    disableGrammar: true
  },
  'both': {
    name: 'Both Enabled',
    description: 'Full highlighting with TextMate + Semantic tokens (default)',
    settings: {
      'cal.languageServer.enabled': true,
      'cal.semanticHighlighting.enabled': true
    },
    disableGrammar: false
  }
};

function readJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function toggleGrammar(enable) {
  const pkg = readJSON(PACKAGE_JSON);

  if (!pkg.contributes || !pkg.contributes.grammars) {
    console.error('Could not find grammars section in package.json');
    return;
  }

  // Toggle between real path and disabled path
  const grammar = pkg.contributes.grammars[0];

  if (enable) {
    // Enable: use real path
    grammar.path = './syntaxes/cal.tmLanguage.json';
  } else {
    // Disable: use non-existent path so VS Code can't load it
    grammar.path = './syntaxes/.cal.tmLanguage.json.disabled';
  }

  writeJSON(PACKAGE_JSON, pkg);
}

function setMode(modeName) {
  const mode = modes[modeName];
  if (!mode) {
    console.error(`Unknown mode: ${modeName}`);
    console.log(`Available modes: ${Object.keys(modes).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🎨 Setting highlighting mode: ${mode.name}`);
  console.log(`   ${mode.description}\n`);

  // Update settings
  const settings = readJSON(SETTINGS_JSON);
  Object.assign(settings, mode.settings);
  writeJSON(SETTINGS_JSON, settings);
  console.log(`✓ Updated .vscode/settings.json`);

  // Toggle grammar in package.json
  toggleGrammar(!mode.disableGrammar);
  console.log(`✓ ${mode.disableGrammar ? 'Disabled' : 'Enabled'} TextMate grammar in package.json`);

  console.log(`\n⚠️  IMPORTANT: You must reload the Extension Development Host window!`);
  console.log(`   1. Close Extension Development Host (if open)`);
  console.log(`   2. In main VS Code: Ctrl+Shift+P → "Reload Window"`);
  console.log(`   3. Press F5 to launch Extension Development Host\n`);
}

function showStatus() {
  console.log('\n📊 Current Highlighting Configuration:\n');

  const settings = readJSON(SETTINGS_JSON);
  const lsEnabled = settings['cal.languageServer.enabled'] !== false;
  const semanticEnabled = settings['cal.semanticHighlighting.enabled'] !== false;

  const pkg = readJSON(PACKAGE_JSON);
  const grammarPath = pkg.contributes?.grammars?.[0]?.path || '';
  const grammarDisabled = grammarPath.includes('.disabled');

  console.log(`  Language Server:      ${lsEnabled ? '✓ enabled' : '✗ disabled'}`);
  console.log(`  Semantic Tokens:      ${semanticEnabled ? '✓ enabled' : '✗ disabled'}`);
  console.log(`  TextMate Grammar:     ${grammarDisabled ? '✗ disabled' : '✓ enabled'}`);

  // Determine current mode
  let currentMode = 'custom';
  for (const [name, mode] of Object.entries(modes)) {
    const settingsMatch = Object.entries(mode.settings).every(
      ([key, value]) => settings[key] === value
    );
    const grammarMatch = grammarDisabled === mode.disableGrammar;

    if (settingsMatch && grammarMatch) {
      currentMode = name;
      break;
    }
  }

  console.log(`\n  Active Mode: ${currentMode === 'custom' ? '⚙️  custom' : `🎨 ${modes[currentMode].name}`}\n`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'status') {
  showStatus();
  console.log('Usage:');
  console.log('  node toggle-highlighting-mode.js <mode>');
  console.log('  node toggle-highlighting-mode.js status\n');
  console.log('Available modes:');
  for (const [name, mode] of Object.entries(modes)) {
    console.log(`  ${name.padEnd(10)} - ${mode.description}`);
  }
  console.log('');
  process.exit(0);
}

setMode(command);
