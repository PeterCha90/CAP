<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge" alt="Claude Code Plugin" />
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/github/license/PeterCha90/CAP?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🧢 CAP</h1>
<h3 align="center">Claude Allowance Pulse</h3>

- Claude Code 하단 statusline에 **사용량 + 컨텍스트 + 비용 + 업데이트 알림**을 실시간으로 표시하는 경량 플러그인입니다.

### 출력 예시

```
🐙 Opus 4.6 │ 🧺 73%(4h32m) │ 📅 Week: 45%(3d21h)
🗃️ 42% ctx │ 💰 $0.47
```

**Line 1** — 모델명 + 5시간 윈도우 사용량(리셋까지 남은 시간) + 7일 윈도우 사용량

**Line 2** — 컨텍스트 윈도우 사용률 + 세션 누적 비용 + (업데이트 알림)

### 세그먼트 설명

| 세그먼트              | 설명                                     |
| --------------------- | ---------------------------------------- |
| `🐙 Opus 4.6`         | 현재 모델 (Opus=🐙, Sonnet=☄️, Haiku=💨) |
| `🧺 73%(4h32m)`       | 5시간 윈도우 사용률 + 리셋까지 남은 시간 |
| `📅 Week: 45%(3d21h)` | 7일 윈도우 사용률 + 리셋까지 남은 시간   |
| `🗃️ 42% ctx`          | 컨텍스트 윈도우 사용률                   |
| `💰 $0.47`            | 현재 세션 누적 비용                      |
| `Update 👾`           | 새 버전이 있을 때만 표시                 |

### 색상 규칙

| 사용률 | 색상             |
| ------ | ---------------- |
| < 50%  | 🟢 Green         |
| 50–69% | 🟡 Yellow        |
| 70–84% | 🟡 Yellow (Bold) |
| >= 85% | 🔴 Red (Bold)    |

### 설치

Claude Code 안에서:

```
/plugin marketplace add PeterCha90/CAP
/plugin install cap
```

Claude Code를 재시작하면 statusline이 자동으로 활성화됩니다.

### 커스터마이징

`scripts/usage-hud.mjs`에서 조정 가능:

- `USAGE_TTL` — Usage API 캐시 TTL (기본 60초). 429 에러가 잦으면 120초로 증가
- 색상 임계값 — 50% / 70% / 85% 기준으로 Green → Yellow → Red 전환

### 삭제

Claude Code 안에서:

```
/cap:uninstall
```

또는 직접 실행:

```bash
bash ~/.claude/plugins/cap/scripts/uninstall.sh
```

이 스크립트는 다음을 수행합니다:

- `settings.json`의 `statusLine`을 이전 설정으로 복원 (백업이 있으면)
- 캐시 파일 삭제
- 플러그인 디렉토리 삭제

실행 후 Claude Code를 재시작하면 완전히 제거됩니다.

### 문제 해결

| 문제                 | 해결                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| HUD가 안 보임        | `settings.json`에 `statusLine` 설정 확인 후 Claude Code 재시작                     |
| 사용량이 `--`로 표시 | OAuth 토큰 확인 — `security find-generic-password -s "Claude Code-credentials" -w` |
| `[API 429]` 빈발     | `USAGE_TTL`을 120000 이상으로 증가                                                 |

### 라이선스

MIT
