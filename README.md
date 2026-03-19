<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge" alt="Claude Code Plugin" />
  <img src="https://img.shields.io/github/v/tag/PeterCha90/CAP?style=for-the-badge&label=version&color=blue" alt="Version" />
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/github/license/PeterCha90/CAP?style=for-the-badge" alt="License" />
</p>

<h1 align="center">CAP</h1>
<h3 align="center">Claude Anthropic Power-meter</h3>

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

<details>
<summary><b>🇰🇷 한국어 README</b></summary>

## CAP — Claude Anthropic Power-meter

Claude Code 하단 statusline에 **사용량 + 컨텍스트 + 비용 + 업데이트 알림**을 실시간으로 표시하는 경량 플러그인입니다.

### 출력 예시

```
🐙 Opus 4.6 │ 🧺 73%(4h32m) │ 📅 Week: 45%(3d21h)
🗃️ 42% ctx │ 💰 $0.47
```

**Line 1** — 모델명 + 5시간 윈도우 사용량(리셋까지 남은 시간) + 7일 윈도우 사용량

**Line 2** — 컨텍스트 윈도우 사용률 + 세션 누적 비용 + (업데이트 알림)

### 세그먼트 설명

| 세그먼트 | 설명 |
|----------|------|
| `🐙 Opus 4.6` | 현재 모델 (Opus=🐙, Sonnet=☄️, Haiku=💨) |
| `🧺 73%(4h32m)` | 5시간 윈도우 사용률 + 리셋까지 남은 시간 |
| `📅 Week: 45%(3d21h)` | 7일 윈도우 사용률 + 리셋까지 남은 시간 |
| `🗃️ 42% ctx` | 컨텍스트 윈도우 사용률 |
| `💰 $0.47` | 현재 세션 누적 비용 |
| `Update 👾` | 새 버전이 있을 때만 표시 |

### 색상 규칙

| 사용률 | 색상 |
|--------|------|
| < 50% | 🟢 Green |
| 50–69% | 🟡 Yellow |
| 70–84% | 🟡 Yellow (Bold) |
| >= 85% | 🔴 Red (Bold) |

### 설치

Claude Code 안에서:

```
/install-plugin PeterCha90/CAP
```

Claude Code를 재시작하면 statusline이 자동으로 활성화됩니다.

### 커스터마이징

`scripts/usage-hud.mjs`에서 조정 가능:

- `USAGE_TTL` — Usage API 캐시 TTL (기본 60초). 429 에러가 잦으면 120초로 증가
- 색상 임계값 — 50% / 70% / 85% 기준으로 Green → Yellow → Red 전환

### 삭제

깔끔하게 제거하려면:

```bash
bash ~/.claude/plugins/cap/scripts/uninstall.sh
```

이 스크립트는 다음을 수행합니다:
- `settings.json`의 `statusLine`을 이전 설정으로 복원 (백업이 있으면)
- 캐시 파일 삭제
- 플러그인 디렉토리 삭제

실행 후 Claude Code를 재시작하면 완전히 제거됩니다.

### 문제 해결

| 문제 | 해결 |
|------|------|
| HUD가 안 보임 | `settings.json`에 `statusLine` 설정 확인 후 Claude Code 재시작 |
| 사용량이 `--`로 표시 | OAuth 토큰 확인 — `security find-generic-password -s "Claude Code-credentials" -w` |
| `[API 429]` 빈발 | `USAGE_TTL`을 120000 이상으로 증가 |

### 라이선스

MIT

</details>

---

## What It Shows

| Segment | Description |
|---------|-------------|
| `🐙 Opus 4.6` | Current model (Opus=🐙, Sonnet=☄️, Haiku=💨) |
| `🧺 73%(4h32m)` | 5-hour window utilization + time until reset |
| `📅 Week: 45%(3d21h)` | 7-day window utilization + time until reset |
| `🗃️ 42% ctx` | Context window usage |
| `💰 $0.47` | Session cost so far |
| `Update 👾` | Shown only when a new version is available |

**Line 1** displays model, 5-hour session usage (with reset countdown), and weekly usage.

**Line 2** displays context window percentage, accumulated session cost, and update alerts.

### Color Coding

Usage percentages change color as they increase:

| Utilization | Color |
|-------------|-------|
| < 50% | 🟢 Green |
| 50–69% | 🟡 Yellow |
| 70–84% | 🟡 Yellow (Bold) |
| >= 85% | 🔴 Red (Bold) |

---

## Installation

Inside Claude Code:

```
/install-plugin PeterCha90/CAP
```

Restart Claude Code. The HUD will appear at the bottom of your terminal.

---

## How It Works

```
┌──────────────────┐      stdin (JSON)      ┌──────────────────┐
│   Claude Code    │ ────────────────────→  │  usage-hud.mjs   │
│   statusLine     │                        │                  │
│   engine         │ ←──────────────────── │  + fetch() API   │
└──────────────────┘      stdout (text)     └────────┬─────────┘
                                                     │
                                            ┌────────▼─────────┐
                                            │  Cache files      │
                                            │  .usage-cache     │
                                            │  .update-cache    │
                                            └──────────────────┘
```

1. Claude Code pipes session data (model, context, cost) via **stdin** as JSON
2. The script fetches usage data from the **Anthropic OAuth API** (cached for 60s)
3. Checks for updates against the GitHub repo's `package.json` (cached for 6h)
4. Outputs a formatted two-line statusline to **stdout**

All external calls are cached and fail gracefully — the script never crashes, never blocks, and never prints errors.

---

## Customization

Edit `scripts/usage-hud.mjs`:

| Setting | Default | Description |
|---------|---------|-------------|
| `USAGE_TTL` | `60000` (60s) | How long to cache Usage API responses. Increase to `120000` if you hit 429 rate limits. |
| `UPDATE_TTL` | `21600000` (6h) | How often to check for new versions |
| Color thresholds | 50/70/85% | Breakpoints for green/yellow/red color transitions |

---

## Uninstall

To completely remove CAP:

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

| Problem | Solution |
|---------|----------|
| HUD not showing | Check `statusLine` in `~/.claude/settings.json`, then restart Claude Code |
| Usage shows `--` | OAuth token not found — verify with `security find-generic-password -s "Claude Code-credentials" -w` |
| Frequent 429 errors | Increase `USAGE_TTL` to `120000` or higher |
| Stale data | Delete cache files in `~/.claude/hud/` and restart |

---

## Project Structure

```
cap/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
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
