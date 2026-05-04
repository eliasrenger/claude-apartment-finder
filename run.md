# Daily Run Instructions

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

This outputs all new listings (not in `state/last_run.json`) as a JSON array to `/tmp/listings.json`.

## 4. Load context

Read the following before evaluating any listings:
- `CLAUDE.md` — scoring rubric and decision thresholds
- `config.yaml` — score thresholds
- `memory/preferences.md` — user preferences from past feedback
- `memory/market.md` — area pricing trends and comps
- `memory/macro.md` — interest rate and macro context
- `memory/calibration.md` — how past picks played out

## 5. Evaluate and route each listing

For each listing in `/tmp/listings.json`, apply the scoring rubric from `CLAUDE.md` and route it:

**Score ≥ notify threshold:**
- Write full write-up to `listings/notified/YYYY-MM-DD-<booli_id>.md`
- Send Discord notification via `bun run scripts/notifier/index.ts` with the formatted message

**Score ≥ watch threshold (but below notify):**
- Create or update `listings/watchlist/<booli_id>.md` with current data
- Update `state/watchlist.json` with the listing ID and latest price

**Below watch threshold:**
- Append a short entry to `listings/skipped/YYYY-MM-DD.md` with the key reasons

## 6. Update state

Write the seen listing IDs and current timestamp to `state/last_run.json`:

```json
{
  "last_run": "YYYY-MM-DDTHH:MM:SSZ",
  "seen_ids": [<all booli_id values from this run>]
}
```

Merge with any IDs already in `state/last_run.json` so previously seen listings are never re-evaluated.

## 7. Update memory

If this run surfaced notable signals, update the relevant memory file:
- Pricing patterns or area trends → `memory/market.md`
- Interest rate or macro observations → `memory/macro.md`
- User feedback received since last run → `memory/preferences.md`
- Calibration signals (watched listing sold, notified listing rejected by user) → `memory/calibration.md`
