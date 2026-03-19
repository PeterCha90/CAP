---
description: Install or repair the Usage HUD statusline
---

# Setup Usage HUD

## Instructions

1. Read `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`)
2. Check if `statusLine.command` contains `usage-hud`
3. If not configured:
   - Back up existing `statusLine` to `_statusLine_backup`
   - Set `statusLine` to `{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/usage-hud.mjs" }`
   - Save settings.json
4. Verify OAuth token is accessible (macOS Keychain or credentials file)
5. Report status and tell user to restart Claude Code if changes were made

## Output

Report:
- ✅ or ❌ statusLine configuration
- ✅ or ❌ OAuth token found
- ✅ or ❌ usage-hud.mjs exists at plugin path
