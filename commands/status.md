---
description: Show current Usage HUD status and diagnostics
---

# Usage HUD Status

## Instructions

1. Read `~/.claude/settings.json` and check `statusLine` configuration
2. Check if `usage-hud.mjs` exists at the plugin root
3. Check OAuth token availability
4. Read `.usage-cache.json` from `${CLAUDE_PLUGIN_DATA}` and show:
   - Last fetch time
   - Cached 5h/7d utilization values
   - Cache age (fresh/stale)
5. Read `.update-cache.json` and show:
   - Current version vs latest version
   - Update available: yes/no
6. Print a compact diagnostic summary
