# Project Organization

## File Structure

```
claude-apartment-finder/
│
├── CLAUDE.md                  # Agent brain — scoring rubric, decision thresholds, behavioral rules
├── README.md                  # Human overview
├── .env                       # DISCORD_WEBHOOK_URL, BOOLI_QUERY_URL (never committed)
│
├── config.json                # Scoring weights, notify threshold, watch threshold
│
├── run.md                     # The daily task prompt — what Claude reads when cron triggers it
│
├── scripts/
│   └── scrape.py              # Booli scraper (Claude calls this as a tool)
│
├── memory/                    # Persistent knowledge across runs
│   ├── preferences.md         # User preferences accumulated from feedback
│   ├── market.md              # Price/m² trends, days-on-market patterns, area observations
│   ├── macro.md               # Interest rate context, broader market signals
│   └── calibration.md        # How past notify/watch picks actually played out
│
├── state/
│   ├── last_run.json          # Timestamp + listing IDs seen last run (deduplication)
│   └── watchlist.json         # Active watched listings with price history
│
└── listings/
    ├── notified/
    │   └── YYYY-MM-DD-<id>.md # Full write-up per notified apartment
    ├── watchlist/
    │   └── <id>.md            # Ongoing tracking log per watched listing
    └── skipped/
        └── YYYY-MM-DD.md      # Daily rejection log
```

## Key Design Decisions

**`CLAUDE.md` is the agent's brain, not just docs.** Contains the scoring rubric with explicit weights, thresholds for notify vs watch vs skip, and behavioral rules like "always check `state/last_run.json` first to skip already-seen listings."

**`run.md` is the daily entry point.** The cron job calls `claude --print run.md` (or similar). This file tells Claude exactly what to do in sequence: load memory → scrape → score → write outputs → update state → notify. Kept separate from CLAUDE.md so the daily task can be tweaked without touching evaluation logic.

**Separate `memory/` (what I know) from `state/` (where I am).** Memory is slow-changing learned knowledge. State is operational — last run timestamp, seen IDs, watchlist data. They have different update frequencies and different risks if corrupted.

**`config.json` for tunable numbers, `.env` for secrets.** Scoring weights and thresholds belong in config so they can be adjusted without editing instructions. The Booli URL and Discord webhook stay in `.env`.
