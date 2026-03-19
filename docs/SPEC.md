# Claude Usage HUD — SPEC.md

## Overview

Claude Code 하단 statusline에 **사용량 + 컨텍스트 + 비용 + 업데이트 알림**을 실시간으로 표시하는 경량 Claude Code Plugin. `/plugin install` 한 방이면 끝. Zero bloat — statusline만.

### 설치

```bash
/plugin marketplace add YOUR_USERNAME/cap
/plugin install cap
# Claude Code 재시작 → 자동으로 statusLine 설정됨
```

### 목표 출력

```
🐙 Opus 4.6 │ 🧺 73%(4h32m) │ 📅 Week: 45%(3d21h)
🗃️ 42% ctx │ 💰 $0.47 | 기존 Claude Code 기본 메세지
```

Sonnet 사용 시:

```
☄️ Sonnet 4.6 │ 🧺 31%(3h12m) │ 📅 Week: 22%(5d8h)
🗃️ 18% ctx │ 💰 $0.12 | 기존 Claude Code 기본 메세지
```

업데이트가 필요한 경우:

```
🐙 Opus 4.6 │ 🧺 73%(4h32m) │ 📅 Week: 45%(3d21h)
🗃️ 42% ctx │ 💰 $0.47 │ Update 👾 | 기존 Claude Code 기본 메세지
```

---

## 1. Architecture

### Plugin으로 배포

이 프로젝트는 Claude Code Plugin 시스템을 통해 배포한다. `/plugin install`로 설치하면 SessionStart 훅이 자동으로 `settings.json`의 `statusLine`을 설정한다.

```
┌──────────────────────┐
│  /plugin install     │
│  cap    │
│  @your-marketplace   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     SessionStart Hook
│ ~/.claude/plugins/   │ ──────────────────────→  settings.json에
│   cache/...          │                          statusLine 자동 등록
│   cap/  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     stdin (JSON)     ┌──────────────────┐
│ Claude Code          │ ──────────────────→ │  scripts/        │
│  statusLine engine   │                     │  usage-hud.mjs   │
│                      │ ←────────────────── │                  │
└──────────────────────┘     stdout (text)    │  + fetch() API   │
                                              └────────┬─────────┘
                                                       │ cached
                                              ┌────────▼─────────┐
                                              │ $CLAUDE_PLUGIN   │
                                              │ _DATA/            │
                                              │  .usage-cache    │
                                              │  .update-cache   │
                                              └──────────────────┘
```

### GitHub Repository 구조

```
cap/                          # GitHub repo root
├── .claude-plugin/
│   └── plugin.json                        # Plugin manifest (필수)
├── commands/
│   ├── setup.md                           # /cap:setup
│   └── status.md                          # /cap:status
├── hooks/
│   └── hooks.json                         # SessionStart 훅 정의
├── scripts/
│   ├── usage-hud.mjs                      # 메인 statusline 스크립트
│   ├── setup-statusline.sh                # SessionStart 훅이 실행하는 설정 스크립트
│   └── check-update.mjs                   # 업데이트 체크 모듈
├── skills/
│   └── usage-hud/
│       └── SKILL.md                       # HUD 설정 가이드 skill
├── package.json                           # version 관리 (npm deps 없음)
├── SPEC.md
├── README.md
└── LICENSE
```

### 런타임 데이터 위치

Plugin 설치 후 캐시 파일은 `${CLAUDE_PLUGIN_DATA}` 디렉토리에 저장된다:

```
~/.claude/plugins/data/cap/
├── .usage-cache.json                      # Usage API 응답 캐시 (자동 생성)
└── .update-cache.json                     # 업데이트 체크 캐시 (자동 생성)
```

---

## 2. Display Format — 세그먼트 정의

출력은 `│` (공백 + pipe + 공백)로 구분된 세그먼트를 한 줄로 이어 붙인 형태이다.

**세그먼트 순서**: Model → Session(5h) → Week(7d) → Context → Cost → [Update]

### 2.1 Model Indicator

```
🐙 Opus 4.6
```

- stdin JSON의 `model.display_name`에서 추출
- "Claude " prefix는 제거: `"Claude Opus 4.6"` → `"Opus 4.6"`
- 모델별 이모지 prefix:

| model.display_name 포함 문자열 | 이모지 | 예시            |
| ------------------------------ | ------ | --------------- |
| `Opus`                         | 🐙     | `🐙 Opus 4.6`   |
| `Sonnet`                       | ☄️     | `☄️ Sonnet 4.6` |
| `Haiku`                        | 💨     | `💨 Haiku 4.5`  |
| 그 외                          | ⬥      | `⬥ Unknown`     |

- ANSI: **Bold + Magenta**

### 2.2 Session Usage (5-hour window)

```
🧺 73%(4h32m)
```

- Usage API의 `five_hour.utilization` (0–100 float → 정수 반올림)
- `🧺` 이모지 prefix (레이블 텍스트 없음, 아이콘만)
- **괄호 안 시간**: `five_hour.resets_at`에서 계산한 **5시간 윈도우 리셋까지 남은 시간**
  - 포맷: `XhYm` (예: `4h32m`, `58m`, `2h0m`)
  - 1시간 미만이면 분만 표시: `58m`
  - 데이터 없으면 괄호째 생략: `73%`
- 색상 규칙 (퍼센트 값에 적용):
  - < 50%: Green
  - 50–69%: Yellow
  - 70–84%: Yellow(Bold)
  - ≥ 85%: Red(Bold)
- 괄호 안 시간 텍스트: `DIM`
- 데이터 없으면 `🧺 --` (Dim)

### 2.3 Weekly Usage (7-day window)

```
📅 Week: 45%(3d21h)
```

- Usage API의 `seven_day.utilization`
- `📅` 이모지 + 공백 + `Week:` 레이블 + 공백 + 퍼센트
- **괄호 안 시간**: `seven_day.resets_at`에서 계산한 **7일 윈도우 리셋까지 남은 시간**
  - 포맷: `XdYh` (예: `3d21h`, `1d5h`, `22h`)
  - 1일 미만이면 시간만 표시: `22h`
  - 데이터 없으면 괄호째 생략: `45%`
- 색상 규칙: 2.2와 동일
- 괄호 안 시간 텍스트: `DIM`
- 데이터 없으면 `📅 Week: --` (Dim)

### 2.4 Context Window

```
42% ctx
```

- stdin JSON의 `context_window.used_percentage` 사용
- 프로그레스 바 **없음** — 퍼센트 숫자 + `ctx` 텍스트만
- 색상 규칙:
  - < 50%: Green
  - 50–69%: Yellow
  - 70–84%: Yellow(Bold)
  - ≥ 85%: Red(Bold)

### 2.5 Session Cost

```
$0.47
```

- stdin JSON의 `cost.total_cost_usd`
- 소수점 2자리까지 표시
- ANSI: Dim (어두운 회색)
- 값이 null이면 이 세그먼트 생략

### 2.6 Update Indicator (조건부)

```
Update 👾
```

- 업데이트가 필요할 때**만** 표시, 불필요하면 세그먼트 자체를 생략
- ANSI: **Bold + Cyan**
- 판정 로직은 §4 참고

### 2.7 Separator

- 세그먼트 사이: `│` (공백 + `│` + 공백)
- ANSI: Dim 처리

---

## 3. Data Sources

### 3.1 stdin JSON (Claude Code 제공)

Claude Code가 statusLine command 실행 시 stdin으로 전달하는 JSON 구조:

```json
{
  "session_id": "...",
  "model": {
    "id": "claude-opus-4-6",
    "display_name": "Claude Opus 4.6"
  },
  "cost": {
    "total_cost_usd": 0.477
  },
  "context_window": {
    "used_percentage": 42,
    "remaining_percentage": 58,
    "context_window_size": 200000,
    "current_usage": { "input_tokens": 1, "output_tokens": 147 },
    "total_input_tokens": 7104,
    "total_output_tokens": 5237
  },
  "workspace": { "current_dir": "/path/to/project" },
  "version": "2.1.79"
}
```

- `readFileSync(0, "utf8")`로 stdin 전체를 한 번에 읽고 `JSON.parse`
- 파싱 실패 시 해당 세그먼트를 `--`로 표시하되 스크립트는 종료하지 않음

### 3.2 Usage API

```
GET https://api.anthropic.com/api/oauth/usage
```

Headers:

```
Authorization: Bearer <oauth_token>
anthropic-beta: oauth-2025-04-20
Content-Type: application/json
User-Agent: cap/1.0
```

Response:

```json
{
  "five_hour": { "utilization": 73.0, "resets_at": "2026-03-19T17:00:00Z" },
  "seven_day": { "utilization": 45.0, "resets_at": "2026-03-24T00:00:00Z" },
  "seven_day_opus": { "utilization": 12.0, "resets_at": null }
}
```

⚠️ 비공식 엔드포인트. Rate limit이 공격적이므로 반드시 캐싱 필수.

### 3.3 OAuth Token 획득

우선순위:

1. **macOS Keychain** — `security find-generic-password -s "Claude Code-credentials" -w`
   - 결과를 JSON parse → `claudeAiOauth.accessToken`
   - `execSync` + timeout 3초
2. **Credentials file** — `~/.claude/.credentials.json` (또는 `$CLAUDE_CONFIG_DIR/.credentials.json`)
   - 같은 JSON 구조에서 `claudeAiOauth.accessToken`
3. 둘 다 실패 시 → usage 세그먼트를 `--`로 표시, 에러 출력 없음

---

## 4. Update Check

### 4.1 메커니즘

GitHub repository의 `package.json`에서 latest version을 가져와 로컬 version과 비교한다.

```
GET https://raw.githubusercontent.com/{OWNER}/{REPO}/main/package.json
```

- `{OWNER}/{REPO}`는 `package.json`의 `repository` 필드 또는 하드코딩
- 응답에서 `version` 필드 추출
- 로컬 version은 `~/.claude/hud/usage-hud.mjs`와 같은 디렉토리의 `package.json`에서 읽거나, 스크립트 상단의 `const VERSION = "x.y.z"` 상수에서 읽음

### 4.2 캐싱

- 캐시 파일: `~/.claude/hud/.update-cache.json`
- 캐시 TTL: **6시간** (21,600,000ms)
- 구조:

```json
{
  "ts": 1711036800000,
  "latest": "1.2.0",
  "current": "1.1.0",
  "updateAvailable": true
}
```

### 4.3 표시 조건

- `updateAvailable === true`일 때만 `Update 👾` 세그먼트 추가
- fetch 실패 시 → 세그먼트 생략 (에러 없이 스킵)
- `AbortSignal.timeout(3000)` 적용 (타임아웃 3초)

### 4.4 package.json (repo root)

```json
{
  "name": "cap",
  "version": "1.0.0",
  "type": "module",
  "description": "Lightweight Claude Code statusline HUD — usage, context, cost, update check",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/cap"
  },
  "license": "MIT"
}
```

- `version` 필드는 업데이트 체크(§4.1)와 plugin.json의 version과 동기화해야 한다
- npm dependencies 없음 — `node_modules` 불필요
- `"type": "module"` — usage-hud.mjs에서 `import` 사용

> ⚠️ `YOUR_USERNAME`은 실제 GitHub 유저명으로 치환할 것.

---

## 5. Caching Strategy

| Cache        | File                 | Location                 | TTL   | Fallback                       |
| ------------ | -------------------- | ------------------------ | ----- | ------------------------------ |
| Usage API    | `.usage-cache.json`  | `${CLAUDE_PLUGIN_DATA}/` | 60초  | stale 데이터 서빙 (429 시에도) |
| Update Check | `.update-cache.json` | `${CLAUDE_PLUGIN_DATA}/` | 6시간 | 세그먼트 생략                  |

> `${CLAUDE_PLUGIN_DATA}`는 `~/.claude/plugins/data/cap/`로 해석된다. 플러그인 업데이트 시에도 데이터가 유지된다.

### 캐시 경로 결정 (usage-hud.mjs 내부)

```javascript
// CLAUDE_PLUGIN_DATA가 없으면 (수동 설치 등) fallback
const CACHE_DIR =
  process.env.CLAUDE_PLUGIN_DATA ||
  join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "hud");
```

### Cache 파일 구조 (공통)

```json
{
  "ts": 1711036800000,
  "data": { ... }
}
```

### Stale-While-Revalidate 로직

1. 캐시 읽기
2. `Date.now() - ts < TTL` → 캐시 데이터 사용 (API 호출 안 함)
3. TTL 초과 → API 호출 시도
   - 성공 → 캐시 갱신, 새 데이터 반환
   - 실패 (429, timeout, network error) → stale 캐시 데이터 반환
4. 캐시 파일 자체가 없으면 → API 호출, 실패 시 `null`

---

## 6. ANSI Color Reference

스크립트에서 사용할 ANSI 이스케이프 코드:

```javascript
const RST = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";
```

### 세그먼트별 스타일

| Segment                      | Style                   |
| ---------------------------- | ----------------------- |
| `🐙`/`☄️`/`💨` (model emoji) | 그대로 출력 (ANSI 없음) |
| `Opus 4.6` (model name)      | `BOLD + MAGENTA`        |
| `🧺` (session emoji)         | 그대로 출력             |
| `73%` (session value)        | color by threshold      |
| `(4h32m)` (5h reset time)    | `DIM`                   |
| `📅 Week:`                   | `WHITE`                 |
| `45%` (week value)           | color by threshold      |
| `(3d21h)` (7d reset time)    | `DIM`                   |
| `42%` (ctx pct)              | color by threshold      |
| `ctx`                        | color by threshold      |
| `$0.47`                      | `DIM`                   |
| `Update 👾`                  | `BOLD + CYAN`           |
| `│` (separator)              | `DIM`                   |

---

## 7. Plugin Manifest — `.claude-plugin/plugin.json`

```json
{
  "name": "cap",
  "version": "1.0.0",
  "description": "Lightweight statusline HUD showing usage (5h/7d), context window, cost, and update alerts. Zero bloat — just the statusline.",
  "author": {
    "name": "Peter Cha",
    "url": "https://github.com/YOUR_USERNAME"
  },
  "repository": "https://github.com/YOUR_USERNAME/cap",
  "license": "MIT",
  "keywords": ["statusline", "usage", "hud", "rate-limit", "context"]
}
```

> Components (`commands/`, `hooks/`, `skills/`)는 디렉토리 convention으로 자동 발견된다. `plugin.json`에 명시적으로 등록할 필요 없음.

---

## 8. Hooks — `hooks/hooks.json`

### SessionStart: statusLine 자동 설정

플러그인 설치 후 Claude Code 세션이 시작될 때 `settings.json`의 `statusLine`을 자동으로 설정한다.

```json
{
  "description": "Auto-configure statusLine on session start",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup-statusline.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### `scripts/setup-statusline.sh` 동작

```bash
#!/bin/bash
# SessionStart 훅에서 실행됨
# 1. settings.json에 statusLine이 이미 usage-hud로 설정되어 있으면 스킵
# 2. 없거나 다른 값이면 설정 추가 (기존값은 _statusLine_backup으로 보존)
# 3. 변경 시 stderr로 "[usage-hud] statusLine configured. Restart Claude Code." 출력

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CONFIG_DIR/settings.json"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
HUD_SCRIPT="$PLUGIN_ROOT/scripts/usage-hud.mjs"

# node를 사용해 settings.json을 안전하게 수정
node -e "
  const fs = require('fs');
  const path = '$SETTINGS';
  const hudCmd = 'node ${CLAUDE_PLUGIN_ROOT}/scripts/usage-hud.mjs';

  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}

  const current = settings.statusLine?.command || '';
  if (current.includes('usage-hud')) process.exit(0); // 이미 설정됨

  if (settings.statusLine) {
    settings._statusLine_backup = settings.statusLine;
  }

  settings.statusLine = { type: 'command', command: hudCmd };
  fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
  process.stderr.write('[usage-hud] statusLine configured. Restart Claude Code to activate.\n');
"
```

> ⚠️ `${CLAUDE_PLUGIN_ROOT}`는 플러그인 설치 경로로 자동 치환된다. 하드코딩 금지.

---

## 9. Slash Commands

### `/cap:setup` — `commands/setup.md`

```markdown
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
```

### `/cap:status` — `commands/status.md`

```markdown
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
```

---

## 10. Marketplace 배포

### 단독 GitHub repo로 배포 (추천)

가장 간단한 방법. repo 자체가 plugin이자 marketplace.

```bash
# 사용자 설치 방법
/plugin marketplace add YOUR_USERNAME/cap
/plugin install cap
```

이 방식은 repo root에 `.claude-plugin/plugin.json`만 있으면 동작한다.

### Marketplace repo에 포함시키는 경우

여러 플러그인을 한 repo에 묶는 경우:

```
your-marketplace/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── cap/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── commands/
        ├── hooks/
        ├── scripts/
        └── ...
```

`marketplace.json`:

```json
{
  "name": "your-marketplace",
  "owner": { "name": "Peter Cha" },
  "metadata": {
    "description": "Peter's Claude Code plugins",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "cap",
      "source": "./plugins/cap",
      "description": "Lightweight statusline HUD — usage, context, cost",
      "version": "1.0.0"
    }
  ]
}
```

---

## 11. Skills — `skills/usage-hud/SKILL.md`

HUD 설정 및 커스터마이징을 도와주는 skill:

```markdown
---
name: usage-hud
description: Configure and customize the Usage HUD statusline display
---

# Usage HUD Skill

Configure the cap statusline display.

## Quick Commands

| Command                    | Description                      |
| -------------------------- | -------------------------------- |
| `/cap:setup`  | Install or repair HUD statusline |
| `/cap:status` | Show HUD diagnostics             |

## Customization

Edit the thresholds in `scripts/usage-hud.mjs`:

- `CACHE_TTL_MS`: Usage API cache TTL (default: 60000ms). Increase to 120000 if hitting 429s.
- Color thresholds: < 50% green, 50-69% yellow, 70-84% yellow bold, ≥ 85% red
- Progress bar width: Change the `width` parameter in `progressBar(pct, 10)` calls

## Troubleshooting

- HUD not showing → Run `/cap:setup`, then restart Claude Code
- Usage shows `--` → Check OAuth token with `/cap:status`
- Frequent `[API 429]` → Increase `CACHE_TTL_MS` to 120000 or higher
```

---

## 12. Error Handling

### 원칙

- **절대 crash하지 않는다** — 모든 외부 호출은 try-catch로 감싼다
- **에러 시 graceful degradation** — 해당 세그먼트만 `--`로 표시, 나머지는 정상 출력
- **stderr로 에러 출력 금지** — statusline에 에러 메시지가 섞이면 안 됨
- **timeout 설정** — API fetch: 5초, Keychain exec: 3초, Update check: 3초

### 실패 시나리오별 동작

| 실패                     | 동작                                   |
| ------------------------ | -------------------------------------- |
| stdin JSON 파싱 실패     | model, ctx, cost 세그먼트 모두 생략    |
| OAuth 토큰 없음          | usage 세그먼트 `🧺 --` / `📅 Week: --` |
| Usage API 429            | stale 캐시 서빙                        |
| Usage API timeout/error  | stale 캐시 서빙, 캐시 없으면 `--`      |
| Update check 실패        | `Update 👾` 세그먼트 생략              |
| 캐시 파일 읽기/쓰기 실패 | 무시, 매번 API 호출                    |

---

## 13. Constraints

- **Node.js 순수 구현** — 외부 npm dependency 없음 (`node:fs`, `node:os`, `node:path`, `node:child_process`, `node:url` 만 사용)
- **단일 스크립트** — `scripts/usage-hud.mjs` 하나가 statusline 전체 로직 담당
- **ES Module** — `import` 사용 (`"type": "module"` in package.json)
- **Node 18+** — `fetch()` built-in, `AbortSignal.timeout()` 사용
- **실행 시간 < 1초** — statusline은 ~300ms마다 호출될 수 있으므로, 캐시 히트 시 즉시 반환
- **stdout 한 줄** — 개행 없이 단일 라인 출력
- **경로는 `${CLAUDE_PLUGIN_ROOT}` 사용** — hooks/scripts 내에서 절대경로 하드코딩 금지
- **캐시는 `${CLAUDE_PLUGIN_DATA}` 사용** — 플러그인 업데이트 시에도 캐시 유지
- **zero bloat** — omc처럼 에이전트, 오케스트레이션, 팀 모드 등 불필요한 기능 포함 금지. statusline 하나만.

---

## 14. Remaining Time Format — `formatRemainingTime(resets_at)`

`resets_at` (ISO 8601 문자열)을 받아 현재 시각으로부터 남은 시간을 계산하는 유틸리티 함수.

### 포맷 규칙

| 남은 시간                    | 출력                                 | 예시            |
| ---------------------------- | ------------------------------------ | --------------- |
| ≥ 1일                        | `XdYh`                               | `3d21h`, `1d0h` |
| ≥ 1시간 & < 1일              | `XhYm`                               | `4h32m`, `1h5m` |
| < 1시간                      | `Xm`                                 | `58m`, `3m`     |
| ≤ 0 (이미 지남)              | `"now"`                              | `now`           |
| null / undefined / 파싱 실패 | `null` 반환 → 호출부에서 괄호째 생략 | —               |

### 사용처

- **Session Usage 세그먼트 (§2.2)**: `five_hour.resets_at` → `(4h32m)`
- **Week 세그먼트 (§2.3)**: `seven_day.resets_at` → `(3d21h)`

### 렌더링

괄호 안 시간은 항상 `DIM` 스타일이며, 퍼센트 숫자 바로 뒤에 붙는다 (공백 없음):

```
73%(4h32m)    ← 올바름
73% (4h32m)   ← 잘못됨 (공백 없어야 함)
```

---

## 15. Testing Checklist

구현 완료 후 아래를 확인:

### Plugin 구조

- [ ] `.claude-plugin/plugin.json` 존재 및 필수 필드 (`name`, `version`, `description`) 확인
- [ ] `hooks/hooks.json` 유효한 JSON, `SessionStart` 훅 정의됨
- [ ] `commands/setup.md`, `commands/status.md` 존재
- [ ] `skills/usage-hud/SKILL.md` 존재
- [ ] `scripts/usage-hud.mjs`, `scripts/setup-statusline.sh` 존재 및 실행 권한
- [ ] `claude --plugin-dir ./` 로 로컬 테스트 시 플러그인 로드 확인

### StatusLine 스크립트

- [ ] `echo '{}' | node scripts/usage-hud.mjs` — crash 없이 최소 출력
- [ ] `echo '{"model":{"display_name":"Claude Opus 4.6"},"context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.47}}' | node scripts/usage-hud.mjs` — `🐙 Opus 4.6` + `42% ctx` + `$0.47` 출력
- [ ] `display_name`이 `Sonnet`이면 `☄️`, `Haiku`면 `💨` 이모지 확인
- [ ] OAuth 토큰이 있을 때 `🧺 73%(4h32m)` 형태로 세션 사용량 + 남은 시간 표시
- [ ] `📅 Week: 45%(3d21h)` 형태로 주간 사용량 + 남은 시간 표시
- [ ] usage 데이터 없을 때 `🧺 --` / `📅 Week: --` 으로 표시
- [ ] 세그먼트 순서: Model → Session → Week → Context → Cost → [Update]
- [ ] `.usage-cache.json`이 `$CLAUDE_PLUGIN_DATA` 경로에 생성되는지 확인
- [ ] 60초 내 재실행 시 API 미호출 (캐시 히트)
- [ ] 네트워크 끊긴 상태에서 stale 캐시 서빙 확인
- [ ] `package.json` version을 낮추면 `Update 👾` 표시

### Hooks & Commands

- [ ] SessionStart 훅 실행 시 `settings.json`에 `statusLine` 자동 설정
- [ ] 이미 `usage-hud`로 설정된 경우 재설정 스킵
- [ ] 기존 다른 statusLine이 있을 때 `_statusLine_backup`으로 백업
- [ ] `/cap:setup` 실행 시 진단 결과 출력
- [ ] `/cap:status` 실행 시 캐시 상태 + 토큰 상태 출력

### E2E

- [ ] `claude --plugin-dir ./` → 세션 시작 → statusline에 HUD 표시
- [ ] Claude Code 재시작 후 statusline 정상 유지
