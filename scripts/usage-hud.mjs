#!/usr/bin/env node
// cap — statusline script
// No npm dependencies. Node.js built-ins only.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ── ANSI Colors ──────────────────────────────────────────────────────────────

const RST     = "\x1b[0m";
const BOLD    = "\x1b[1m";
const DIM     = "\x1b[2m";
const GREEN   = "\x1b[32m";
const YELLOW  = "\x1b[33m";
const RED     = "\x1b[31m";
const CYAN    = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const WHITE   = "\x1b[37m";

const SEP = ` ${DIM}│${RST} `;

// ── Cache Config ─────────────────────────────────────────────────────────────

const USAGE_TTL  = 60_000;        // 60 seconds
const UPDATE_TTL = 21_600_000;    // 6 hours

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const cacheDir = process.env.CLAUDE_PLUGIN_DATA
  || join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "hud");

const usageCachePath  = join(cacheDir, ".usage-cache.json");
const updateCachePath = join(cacheDir, ".update-cache.json");

// ── Helpers ──────────────────────────────────────────────────────────────────

function colorByThreshold(pct) {
  if (pct < 50)  return GREEN;
  if (pct < 70)  return YELLOW;
  if (pct < 85)  return YELLOW + BOLD;
  return RED + BOLD;
}

function formatRemainingTime(resetsAt) {
  if (resetsAt == null) return null;
  let target;
  try {
    target = new Date(resetsAt);
    if (isNaN(target.getTime())) return null;
  } catch {
    return null;
  }
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "now";

  const totalMin  = Math.floor(diffMs / 60_000);
  const totalHr   = Math.floor(totalMin / 60);
  const totalDays = Math.floor(totalHr / 24);

  if (totalDays >= 1) {
    const remainHr = totalHr - totalDays * 24;
    return `${totalDays}d${remainHr}h`;
  }
  if (totalHr >= 1) {
    const remainMin = totalMin - totalHr * 60;
    return `${totalHr}h${remainMin}m`;
  }
  return `${totalMin}m`;
}

function ensureCacheDir() {
  try {
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
  } catch { /* best effort */ }
}

function readCache(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(path, data) {
  try {
    ensureCacheDir();
    writeFileSync(path, JSON.stringify(data), "utf8");
  } catch { /* best effort */ }
}

// ── OAuth Token ──────────────────────────────────────────────────────────────

function getOAuthToken() {
  // 1. macOS Keychain
  try {
    const raw = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      { timeout: 3000, stdio: ["pipe", "pipe", "pipe"] }
    ).toString().trim();
    const parsed = JSON.parse(raw);
    const token = parsed?.claudeAiOauth?.accessToken;
    if (token) return token;
  } catch { /* fall through */ }

  // 2. Credentials file
  try {
    const credDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
    const credPath = join(credDir, ".credentials.json");
    const raw = readFileSync(credPath, "utf8");
    const parsed = JSON.parse(raw);
    const token = parsed?.claudeAiOauth?.accessToken;
    if (token) return token;
  } catch { /* fall through */ }

  return null;
}

// ── Usage API ────────────────────────────────────────────────────────────────

async function fetchUsage(token) {
  // Check cache first
  const cached = readCache(usageCachePath);
  if (cached && Date.now() - cached.ts < USAGE_TTL) {
    return cached.data;
  }

  if (!token) {
    return cached?.data || null;
  }

  try {
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
        "User-Agent": "cap/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return cached?.data || null;
    }

    const data = await res.json();
    writeCache(usageCachePath, { ts: Date.now(), data });
    return data;
  } catch {
    // Stale-while-revalidate
    return cached?.data || null;
  }
}

// ── Update Check ─────────────────────────────────────────────────────────────

async function checkUpdate() {
  const cached = readCache(updateCachePath);
  if (cached && Date.now() - cached.ts < UPDATE_TTL) {
    return cached.updateAvailable || false;
  }

  try {
    const localPkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
    const current = localPkg.version;

    const res = await fetch(
      "https://raw.githubusercontent.com/PeterCha90/CAP/main/package.json",
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return cached?.updateAvailable || false;

    const remotePkg = await res.json();
    const latest = remotePkg.version;
    const updateAvailable = latest !== current;

    writeCache(updateCachePath, { ts: Date.now(), latest, current, updateAvailable });
    return updateAvailable;
  } catch {
    return cached?.updateAvailable || false;
  }
}

// ── Build Segments ───────────────────────────────────────────────────────────

function buildOutput(stdin, usage, updateAvailable) {
  const line1 = [];
  const line2 = [];

  // ── Line 1: Model │ Session(5h) │ Week(7d) ──

  // 1. Model Indicator
  if (stdin?.model) {
    const displayName = stdin.model.display_name || stdin.model || "";
    let emoji = "\u2B25";  // ⬥
    if (typeof displayName === "string") {
      if (displayName.includes("Opus"))   emoji = "\uD83D\uDC19";  // 🐙
      if (displayName.includes("Sonnet")) emoji = "\u2604\uFE0F";  // ☄️
      if (displayName.includes("Haiku"))  emoji = "\uD83D\uDCA8";  // 💨
    }
    const name = typeof displayName === "string"
      ? displayName.replace(/^Claude\s+/i, "")
      : String(displayName);
    line1.push(`${emoji} ${BOLD}${MAGENTA}${name}${RST}`);
  }

  // 2. Session Usage (5h)
  if (usage?.five_hour != null) {
    const pct = Math.round(usage.five_hour.utilization);
    const color = colorByThreshold(pct);
    const remaining = formatRemainingTime(usage.five_hour.resets_at);
    const timePart = remaining != null ? `${DIM}(${remaining})${RST}` : "";
    line1.push(`\uD83E\uDDFA ${color}${pct}%${RST}${timePart}`);
  } else {
    line1.push(`\uD83E\uDDFA ${DIM}--${RST}`);
  }

  // 3. Weekly Usage (7d)
  if (usage?.seven_day != null) {
    const pct = Math.round(usage.seven_day.utilization);
    const color = colorByThreshold(pct);
    const remaining = formatRemainingTime(usage.seven_day.resets_at);
    const timePart = remaining != null ? `${DIM}(${remaining})${RST}` : "";
    line1.push(`\uD83D\uDCC5 ${WHITE}Week:${RST} ${color}${pct}%${RST}${timePart}`);
  } else {
    line1.push(`\uD83D\uDCC5 ${WHITE}Week:${RST} ${DIM}--${RST}`);
  }

  // ── Line 2: Context │ Cost │ [Update] ──

  // 4. Context Window
  if (stdin?.context_window?.used_percentage != null) {
    const pct = Math.round(stdin.context_window.used_percentage);
    const color = colorByThreshold(pct);
    line2.push(`\uD83D\uDDC3\uFE0F ${color}${pct}% ctx${RST}`);
  }

  // 5. Session Cost
  if (stdin?.cost?.total_cost_usd != null) {
    const cost = stdin.cost.total_cost_usd.toFixed(2);
    line2.push(`\uD83D\uDCB0 ${DIM}$${cost}${RST}`);
  }

  // 6. Update Indicator
  if (updateAvailable) {
    line2.push(`${BOLD}${CYAN}Update \uD83D\uDC7E${RST}`);
  }

  const parts = [line1.join(SEP)];
  if (line2.length > 0) {
    parts.push(line2.join(SEP));
  }
  return parts.join("\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse stdin
  let stdin = null;
  try {
    const raw = readFileSync(0, "utf8");
    stdin = JSON.parse(raw);
  } catch { /* stdin parse failure — graceful degrade */ }

  // Get OAuth token
  const token = getOAuthToken();

  // Parallel: fetch usage + check update
  const [usage, updateAvailable] = await Promise.all([
    fetchUsage(token).catch(() => null),
    checkUpdate().catch(() => false),
  ]);

  // Build and output
  const output = buildOutput(stdin, usage, updateAvailable);
  process.stdout.write(output);
}

main().catch(() => {
  // NEVER crash — output empty string on catastrophic failure
  process.stdout.write("");
});
