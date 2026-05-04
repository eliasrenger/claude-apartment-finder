# Daily Run Instructions

Execute the following steps in order:

1. **Load context** — read `CLAUDE.md`, `config.json`, and all files in `memory/`
2. **Check state** — read `state/last_run.json` to get the list of already-seen listing IDs
3. **Scrape** — run `scripts/scrape.py` with the BOOLI_QUERY_URL from `.env` to fetch today's listings
4. **Filter** — discard any listing IDs already present in `state/last_run.json`
5. **Score** — evaluate each new listing using the scoring rubric in `CLAUDE.md`
6. **Route each listing**:
   - Score ≥ notify threshold → write full write-up to `listings/notified/YYYY-MM-DD-<id>.md` and send Discord notification
   - Score ≥ watch threshold → update `listings/watchlist/<id>.md` and `state/watchlist.json`
   - Below watch threshold → append short entry to `listings/skipped/YYYY-MM-DD.md`
7. **Update state** — write today's seen listing IDs and timestamp to `state/last_run.json`
8. **Update memory** — if any notable market signals or patterns were observed, update the relevant file in `memory/`
