<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge" alt="Claude Code Plugin" />
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/github/license/PeterCha90/CAP?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🧢 CAP</h1>
<h3 align="center">Claude Allowance Pulse</h3>

<p align="center">
  A lightweight Claude Code statusline plugin that displays<br/>
  <b>usage limits, context window, cost, and update alerts</b> in real time.
</p>

<p align="center">
  Zero bloat. Zero dependencies. Just the statusline.
</p>

---

```
🐙 Opus 4.6 │ 🧺 73%(4h32m) │ 📅 Week: 45%(3d21h)
🗃️ 42% ctx │ 💰 $0.47 │ Update 👾
```

---

**[🇰🇷 한국어 문서](docs/README-ko.md)**

---

## What It Shows

| Segment               | Description                                  |
| --------------------- | -------------------------------------------- |
| `🐙 Opus 4.6`         | Current model (Opus=🐙, Sonnet=☄️, Haiku=💨) |
| `🧺 73%(4h32m)`       | 5-hour window utilization + time until reset |
| `📅 Week: 45%(3d21h)` | 7-day window utilization + time until reset  |
| `🗃️ 42% ctx`          | Context window usage                         |
| `💰 $0.47`            | Session cost so far                          |
| `Update 👾`           | Shown only when a new version is available   |

**Line 1** displays model, 5-hour session usage (with reset countdown), and weekly usage.

**Line 2** displays context window percentage, accumulated session cost, and update alerts.

### Color Coding

Usage percentages change color as they increase:

| Utilization | Color            |
| ----------- | ---------------- |
| < 50%       | 🟢 Green         |
| 50–69%      | 🟡 Yellow        |
| 70–84%      | 🟡 Yellow (Bold) |
| >= 85%      | 🔴 Red (Bold)    |

---

## Installation

Inside Claude Code:

```
/plugin marketplace add PeterCha90/CAP
/plugin install cap
```

Then apply the statusline with one of these methods:

1. Run `/cap:setup` inside Claude Code (recommended — works on all platforms)
2. Run `/reload-plugins` to reload plugins
3. Restart Claude Code

The HUD will appear at the bottom of your terminal.

---

## Customization

Edit `scripts/usage-hud.mjs`:

| Setting          | Default         | Description                                                                             |
| ---------------- | --------------- | --------------------------------------------------------------------------------------- |
| `USAGE_TTL`      | `60000` (60s)   | How long to cache Usage API responses. Increase to `120000` if you hit 429 rate limits. |
| `UPDATE_TTL`     | `21600000` (6h) | How often to check for new versions                                                     |
| Color thresholds | 50/70/85%       | Breakpoints for green/yellow/red color transitions                                      |

---

## Uninstall

Inside Claude Code:

```
/cap:uninstall
```

Or manually:

```bash
bash ~/.claude/plugins/cap/scripts/uninstall.sh
```

This will:

- Restore your previous `statusLine` setting (if a backup exists)
- Remove all cache files
- Delete the plugin directory

Restart Claude Code after running the script.

---

## Troubleshooting

| Problem             | Solution                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| HUD not showing     | Run `/cap:setup` to configure the statusline, then restart Claude Code                                |
| HUD not showing after `/reload-plugins` (Windows) | `/reload-plugins` may not configure the statusline on Windows. Run `/cap:setup` instead |
| Usage shows `--`    | OAuth token not found — verify with `security find-generic-password -s "Claude Code-credentials" -w` |
| Frequent 429 errors | Increase `USAGE_TTL` to `120000` or higher                                                           |
| Stale data          | Delete cache files in `~/.claude/hud/` and restart                                                   |

---

## Project Structure

```
cap/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Marketplace manifest
├── commands/
│   ├── setup.md             # /cap:setup
│   ├── status.md            # /cap:status
│   └── uninstall.md         # /cap:uninstall
├── hooks/
│   └── hooks.json           # SessionStart hook
├── scripts/
│   ├── usage-hud.mjs        # Main statusline script
│   ├── setup-statusline.sh  # Auto-config on session start
│   └── uninstall.sh         # Clean uninstall script
├── skills/
│   └── usage-hud/
│       └── SKILL.md         # HUD configuration skill
├── package.json
└── LICENSE
```

---

## License

[MIT](LICENSE)

---

<p align="center">
  Made by <a href="https://github.com/PeterCha90">Peter Cha</a>
</p>
