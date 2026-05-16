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

  // Already pointing at the current install path — nothing to do.
  if (current === hudCmd) process.exit(0);

  const isCapAlready = current.includes('usage-hud');

  // Only back up the user's original statusLine the first time we touch it,
  // and never overwrite the backup with a CAP-owned statusLine (which would
  // happen on every plugin upgrade if we weren't careful).
  if (settings.statusLine && !isCapAlready && !settings._statusLine_backup) {
    settings._statusLine_backup = settings.statusLine;
  }

  settings.statusLine = { type: 'command', command: hudCmd };
  fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
  if (isCapAlready) {
    process.stderr.write('[usage-hud] statusLine repinned to current plugin version.\n');
  } else {
    process.stderr.write('[usage-hud] statusLine configured. Restart Claude Code to activate.\n');
  }
"
