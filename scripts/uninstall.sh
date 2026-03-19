#!/bin/bash
# CAP uninstall script
# 1. Restore statusLine backup in settings.json (or remove it)
# 2. Remove cache files
# 3. Remove plugin directory

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CONFIG_DIR/settings.json"
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-$CONFIG_DIR/hud}"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

echo "🗑️  Uninstalling CAP..."

# 1. Restore settings.json
node -e "
  const fs = require('fs');
  const path = '$SETTINGS';

  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(path, 'utf8')); } catch { process.exit(0); }

  const current = settings.statusLine?.command || '';
  if (!current.includes('usage-hud')) {
    console.log('   statusLine is not set to CAP — skipping.');
    process.exit(0);
  }

  if (settings._statusLine_backup) {
    settings.statusLine = settings._statusLine_backup;
    delete settings._statusLine_backup;
    console.log('   Restored previous statusLine from backup.');
  } else {
    delete settings.statusLine;
    console.log('   Removed statusLine.');
  }

  fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
"

# 2. Remove cache files
if [ -d "$PLUGIN_DATA" ]; then
  rm -f "$PLUGIN_DATA/.usage-cache.json" "$PLUGIN_DATA/.update-cache.json"
  # Only remove dir if it's empty and is the hud fallback dir
  rmdir "$PLUGIN_DATA" 2>/dev/null
  echo "   Removed cache files."
fi

# 3. Remove plugin directory
if [ -d "$PLUGIN_ROOT" ] && [ -f "$PLUGIN_ROOT/.claude-plugin/plugin.json" ]; then
  rm -rf "$PLUGIN_ROOT"
  echo "   Removed plugin directory: $PLUGIN_ROOT"
fi

echo ""
echo "✅ CAP uninstalled. Restart Claude Code to apply."
