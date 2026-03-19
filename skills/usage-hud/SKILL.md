---
name: usage-hud
description: Configure and customize the Usage HUD statusline display
---

# Usage HUD Skill

Configure the cap statusline display.

## Quick Commands

| Command | Description |
|---------|-------------|
| `/cap:setup` | Install or repair HUD statusline |
| `/cap:status` | Show HUD diagnostics |
| `/cap:uninstall` | Completely remove CAP and restore previous settings |

## Customization

Edit the thresholds in `scripts/usage-hud.mjs`:

- `CACHE_TTL_MS`: Usage API cache TTL (default: 60000ms). Increase to 120000 if hitting 429s.
- Color thresholds: < 50% green, 50-69% yellow, 70-84% yellow bold, ≥ 85% red
- Progress bar width: Change the `width` parameter in `progressBar(pct, 10)` calls

## Troubleshooting

- HUD not showing → Run `/cap:setup`, then restart Claude Code
- Usage shows `--` → Check OAuth token with `/cap:status`
- Frequent `[API 429]` → Increase `CACHE_TTL_MS` to 120000 or higher
