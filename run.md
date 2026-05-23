# Daily Run Instructions

## How to invoke

```bash
claude -p "$(cat run.md)" --dangerously-skip-permissions
```

`.claude/settings.json` pre-approves all required tools (Bash, Read, Edit, Write, WebSearch, WebFetch) so Claude never prompts during the run. `--dangerously-skip-permissions` ensures fully unattended execution in a cron context.

For the cron entry (runs at 07:00 daily):
```
0 5 * * * cd /home/elias/claude-apartment-finder && bash scripts/run-daily.sh
```

---

Execute the following steps in order.

## 1. Update the repository

```bash
git stash && git pull --rebase && git stash pop
```

## 2. Install dependencies

```bash
bun install
bunx playwright install chromium
```

## 3. Scrape listings

```bash
bun run scripts/scraper/index.ts > /tmp/listings.json
```

Outputs all new listings (not in `state/last_run.json`) as a JSON array to `/tmp/listings.json`. If the file is empty or the scraper errors, check for a block signal and stop — do not proceed with stale data.

## 4. Load context

Read the following once and hold it in context — you will pass summaries to subagents, do not tell subagents to read these files themselves:
- `config.yaml` — `notifyThreshold` and `watchThreshold`
- `memory/preferences.md` — user preferences
- `memory/market.md` — area pricing trends and comps
- `memory/macro.md` — interest rate and macro context (note the date of last update)
- `memory/calibration.md` — how past picks played out

## 5. Pre-filter

Read `/tmp/listings.json`. For each listing, apply a quick score using only the scraped data and the rubric in `.claude/skills/evaluate-listing/SKILL.md`.

- **Score clearly below `watchThreshold`** — append a short entry to `listings/skipped/YYYY-MM-DD.md` and move on. No subagent needed.
- **Score at or above `watchThreshold`** — queue for subagent evaluation.

After scoring all listings, if the queue exceeds `maxEvaluations`, keep only the top `maxEvaluations` by pre-filter score and skip the rest (log them in the skipped file with reason "below cap"). This caps the number of subagents spawned per run regardless of how many listings are scraped.

## 6. Spawn evaluation subagents

For all queued listings, spawn one subagent per listing **in parallel** (all in the same turn). Each subagent receives a self-contained prompt — do not tell it to read files from disk.

The prompt for each subagent must include:

(Use today's date from your system context wherever `<today>` appears below.)

```
Read and follow the skill at .claude/skills/evaluate-listing/SKILL.md.

## Today's date
<today>

## Listing data
<paste the full JSON object for this listing>

## User preferences
<paste the full content of memory/preferences.md>

## Market context
<from memory/market.md: include the table header + note, then only the row(s) where Area matches this listing's neighbourhood or municipality, then only the area signals section for that neighbourhood if one exists. Omit all other rows and signal sections.>

## Thresholds
- notifyThreshold: <value from config.yaml>
- watchThreshold: <value from config.yaml>

## Macro context
Last updated: <date from memory/macro.md in YYYY-MM-DD format>
<paste the full content of memory/macro.md>
```

Wait for all subagents to complete before proceeding.

## 7. Route results

For each subagent result (a JSON object per the evaluate-listing skill output format):

**`route: notify`:**
- The subagent has already written the write-up file (path is in the `writeup` field). Verify the file exists.
- Send notification using the skill at `.claude/skills/notify-user/SKILL.md`

**`route: watch`:**
- The subagent has already written the watchlist file (path is in the `writeup` field). Verify the file exists.
- Update `state/watchlist.json` with the listing ID and current price

**`route: skip` or `disqualified: true`:**
- Append a short entry to `listings/skipped/YYYY-MM-DD.md` with the score and reason

## 8. Update state

Merge today's `booli_id` values with those already in `state/last_run.json`:

```json
{
  "last_run": "YYYY-MM-DDTHH:MM:SSZ",
  "seen_ids": [/* all IDs, merged */]
}
```

## 9. Update memory

After routing all results, apply any updates from subagent findings:
- If any result includes `macro_update` → overwrite the body of `memory/macro.md`, keeping the `## Last updated: YYYY-MM-DD` header set to today's date
- If any result includes `area_update` → upsert the row for that area in the `memory/market.md` table, updating the median, source, and `Last researched` date. If the area is not yet in the table, add a new row.
- If user feedback was received since last run → update `memory/preferences.md`
- If a watched listing sold or a notified listing was rejected → update `memory/calibration.md`
