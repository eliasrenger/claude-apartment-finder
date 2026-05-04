#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

echo "=== Run started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG_FILE"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

cd "$PROJECT_DIR"

# Run Claude — output and errors go to the daily log
/home/ubuntu/.claude/local/claude \
  -p "$(cat run.md)" \
  --dangerously-skip-permissions \
  >> "$LOG_FILE" 2>&1

echo "=== Run finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG_FILE"
