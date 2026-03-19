#!/bin/bash
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CONFIG_DIR/settings.json"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"

node -e "
  const fs = require('fs');
  const path = '$SETTINGS';
  const hudCmd = 'node ${CLAUDE_PLUGIN_ROOT}/scripts/usage-hud.mjs';

  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}

  const current = settings.statusLine?.command || '';
  if (current.includes('usage-hud')) process.exit(0);

  if (settings.statusLine) {
    settings._statusLine_backup = settings.statusLine;
  }

  settings.statusLine = { type: 'command', command: hudCmd };
  fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
  process.stderr.write('[usage-hud] statusLine configured. Restart Claude Code to activate.\n');
"
