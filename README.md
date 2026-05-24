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

### 1. Install dependencies

```bash
bun install
bunx playwright install chromium
```

### 2. Install Claude Code

This project runs via the [Claude Code](https://claude.ai/code) CLI. Install it and log in:

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `DISCORD_FORUM_WEBHOOK_URL` — webhook URL for the Discord forum channel where notifications are posted as threads

### 4. Configure your search

Edit `config.yaml` to set your Booli search parameters (area IDs, price range, size, rooms) and scoring thresholds.

### 5. Set up the cron job

The agent runs via `scripts/run-daily.sh`. Set up a cron job to call it on a schedule:

```bash
crontab -e
```

From the project root, run this to register the cron job automatically:

```bash
(crontab -l 2>/dev/null; echo "0 5 * * * cd $(pwd) && bash -l scripts/run-daily.sh") | crontab -
```

`$(pwd)` is evaluated immediately in your shell, so the correct project path is written into crontab without you having to type it. Change `0 5` to your preferred time — `0 7` runs at 07:00, for example.

- `bash -l` starts a login shell so your full `PATH` is available (needed for `claude`, `bun`, `git`)
- The script writes logs to `logs/YYYY-MM-DD.log` inside the project directory

To verify the cron job was registered:

```bash
crontab -l
```

To test the script manually before the first scheduled run:

```bash
bash -l scripts/run-daily.sh
```

## Configuration

- **Booli query URL** — paste your filtered search URL (area, price, size, rooms already set) into the config
- **Discord webhook URL** — for morning notifications
- **Scoring weights** — tune the relative importance of livability vs. financial factors

## Feedback loop

Reply to a Discord notification or add a note to the relevant `.md` file. The agent reads these before each run and updates `memory/preferences.md` so future evaluations reflect what you actually care about.
