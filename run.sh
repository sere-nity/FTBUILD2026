#!/usr/bin/env bash
# Overnight loop for Waypoint. Each iteration is a fresh Claude Code session that
# reads CLAUDE.md / PROGRESS.md / CHECKS.md, does one unit of work, verifies, commits.
#
# Usage:   ./run.sh [max_iterations]      (default 60)
# Stop:    Ctrl-C, or `touch STOP` in the repo.
#
# Run this in a fresh clone on a machine you're happy to let an agent use a shell on.
# Needs: claude (v2.1.259+ for --permission-prompts), node 20+, git configured.

set -u
MAX="${1:-60}"
LOG="run.log"
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  git init -q && git add -A && git commit -qm "chore: kickoff kit" && echo "initialised repo"
fi

for i in $(seq 1 "$MAX"); do
  [ -f STOP ] && { echo "STOP file found, exiting"; break; }
  echo "=== iteration $i  $(date '+%H:%M:%S') ===" | tee -a "$LOG"

  claude -p "$(cat PROMPT.md)" \
    --permission-mode acceptEdits \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --output-format text \
    2>&1 | tee -a "$LOG"

  # Rate limit: don't burn iterations while the session limit is in force.
  if tail -5 "$LOG" | grep -q "session limit"; then
    echo "rate limited; sleeping 10 min" | tee -a "$LOG"; sleep 600; continue
  fi

  # Safety net: make sure nothing is left uncommitted between iterations.
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A && git commit -qm "chore: iteration $i autosave" && echo "autosaved" | tee -a "$LOG"
  fi

  # Stop when every check is done and the UX log has grown a lot. Crude but fine.
  if ! grep -q '^- \[ \]' CHECKS.md && [ "$(grep -c '^### ' PROGRESS.md)" -gt 120 ]; then
    echo "all checks green and UX log long; exiting" | tee -a "$LOG"; break
  fi
  sleep 5
done
