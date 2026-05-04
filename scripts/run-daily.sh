#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

echo "=== Run started at $(TZ="Europe/Stockholm" date +%Y-%m-%dT%H:%M:%S) ===" >> "$LOG_FILE"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

cd "$PROJECT_DIR"

CLAUDE_BIN="${CLAUDE_BIN:-$(which claude)}"

# Run Claude — output goes to log and terminal
"$CLAUDE_BIN" \
  -p "$(cat run.md)" \
  --dangerously-skip-permissions \
  2>&1 | tee -a "$LOG_FILE"

echo "=== Run finished at $(TZ="Europe/Stockholm" date +%Y-%m-%dT%H:%M:%S) ===" >> "$LOG_FILE"
