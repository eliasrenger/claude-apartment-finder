# Claude Apartment Finder

An autonomous daily agent that scrapes new apartment listings from Booli, evaluates them for livability and financial potential, and notifies you via Discord when something is worth a closer look.

## What it does

Every morning a cron job triggers Claude Code to:

1. Fetch new listings from a configured Booli search URL
2. Score each listing on livability and financial potential
3. Route each listing into one of three buckets:
   - **Notify** — high-scoring listings sent to Discord with a score, one-sentence verdict, and written case for why it's worth your time
   - **Watch** — borderline or financially interesting listings tracked over time to observe price changes, days on market, and final sale price
   - **Skip** — rejected listings logged with a short explanation

Between runs the agent reads and writes a `memory/` directory to get sharper over time — accumulating your preferences from feedback, market trends, pricing comps, and macro context like interest rate movements.

## Scoring

Each listing is evaluated on two axes:

- **Livability** — floor level, balcony, condition/renovation year, layout, transit proximity, and other factors you define
- **Financial potential** — price vs. area median price/m², recent sold comps from Booli, and monthly avgift adjusted into the total cost of ownership

## Output files

| Path | Contents |
|---|---|
| `listings/notified/YYYY-MM-DD-<id>.md` | Full argumentation for notified apartments |
| `listings/watchlist/<id>.md` | Ongoing tracking log for watched listings |
| `listings/skipped/YYYY-MM-DD.md` | Daily rejection log with short reasons |
| `memory/preferences.md` | Your evolving preferences based on feedback |
| `memory/market.md` | Market trends, typical price/m², days on market |
| `memory/macro.md` | Interest rate trends and broader context |

## Setup

> Setup instructions will be added once the implementation is complete.

## Configuration

- **Booli query URL** — paste your filtered search URL (area, price, size, rooms already set) into the config
- **Discord webhook URL** — for morning notifications
- **Scoring weights** — tune the relative importance of livability vs. financial factors

## Feedback loop

Reply to a Discord notification or add a note to the relevant `.md` file. The agent reads these before each run and updates `memory/preferences.md` so future evaluations reflect what you actually care about.
