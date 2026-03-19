---
name: usage-hud
description: Configure and customize the Usage HUD statusline display
---

# Usage HUD Skill

Configure the claude-usage-hud statusline display.

## Quick Commands

| Command | Description |
|---------|-------------|
| `/claude-usage-hud:setup` | Install or repair HUD statusline |
| `/claude-usage-hud:status` | Show HUD diagnostics |

## Customization

Edit the thresholds in `scripts/usage-hud.mjs`:

- `CACHE_TTL_MS`: Usage API cache TTL (default: 60000ms). Increase to 120000 if hitting 429s.
- Color thresholds: < 50% green, 50-69% yellow, 70-84% yellow bold, ≥ 85% red
- Progress bar width: Change the `width` parameter in `progressBar(pct, 10)` calls

## Troubleshooting

- HUD not showing → Run `/claude-usage-hud:setup`, then restart Claude Code
- Usage shows `--` → Check OAuth token with `/claude-usage-hud:status`
- Frequent `[API 429]` → Increase `CACHE_TTL_MS` to 120000 or higher
