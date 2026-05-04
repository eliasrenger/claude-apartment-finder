# Daily Run Instructions

## How to invoke

```bash
claude -p "$(cat run.md)" --dangerously-skip-permissions
```

`.claude/settings.json` pre-approves all required tools (Bash, Read, Edit, Write, WebSearch, WebFetch) so Claude never prompts during the run. `--dangerously-skip-permissions` ensures fully unattended execution in a cron context.

For the cron entry (runs at 07:00 daily):
```
0 7 * * * cd /Users/eliasrenger/CodeProjects/claude-apartment-finder && claude -p "$(cat run.md)" --dangerously-skip-permissions
```

---

Execute the following steps in order.

## 1. Update the repository

```bash
git pull
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

Outputs all new listings (not in `state/last_run.json`) as a JSON array to `/tmp/listings.json`. If the file is empty or the scraper errors, check for a block signal and stop the run — do not proceed with stale data.

## 4. Load context

Read the following before evaluating any listings:
- `CLAUDE.md` — scoring rubric, research checklist, output formats
- `config.yaml` — `notifyThreshold` and `watchThreshold`
- `memory/preferences.md` — user preferences from past feedback
- `memory/market.md` — area pricing trends and comps
- `memory/macro.md` — interest rate and macro context
- `memory/calibration.md` — how past picks played out

## 5. Initial scoring

For each listing in `/tmp/listings.json`, apply the financial and livability rubric from `CLAUDE.md` using only the scraped data. Assign a preliminary score 0–100. This determines which listings receive deep research.

## 6. Deep research

For every listing with a preliminary score ≥ `watchThreshold`, run the full research checklist from `CLAUDE.md`:

1. **BRF economy** — search for `"<brf_name>" årsredovisning`, extract debt per apartment, fee trend, maintenance fund, planned renovations
2. **Realtor page** — fetch the listing URL for the full description, renovation details, floor plan notes, and showing times
3. **Area trends** — search for recent sold comps in the neighbourhood, overbidding ratios, and development news
4. **Macro** — check if `memory/macro.md` is stale (>7 days); if so, search for current Riksbanken rate and Stockholm market forecasts and update the file

Adjust the preliminary score based on research findings before routing.

## 7. Route each listing

**Final score ≥ `notifyThreshold`:**
- Write full write-up to `listings/notified/YYYY-MM-DD-<booli_id>.md` using the format in `CLAUDE.md`
- Send Discord notification:
  ```bash
  echo "<formatted message>" | bun run scripts/notifier/send.ts
  ```

**Final score ≥ `watchThreshold` (but below notify):**
- Create or update `listings/watchlist/<booli_id>.md`
- Update `state/watchlist.json` with the listing ID and current price

**Below `watchThreshold`:**
- Append a short entry to `listings/skipped/YYYY-MM-DD.md`

## 8. Update state

Merge today's `booli_id` values with those already in `state/last_run.json`:

```json
{
  "last_run": "YYYY-MM-DDTHH:MM:SSZ",
  "seen_ids": [/* all IDs, merged */]
}
```

## 9. Update memory

After routing all listings, update relevant memory files if new signals were observed:
- New area price/m² data or overbidding pattern → `memory/market.md`
- Macro shift → `memory/macro.md`
- User feedback received since last run → `memory/preferences.md`
- Watched listing sold or notified listing rejected by user → `memory/calibration.md`
