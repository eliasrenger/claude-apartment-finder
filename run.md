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

## 3. Poll Discord and act on feedback

```bash
bun run scripts/bot/reaction-poll.ts
```

Reads emoji reactions and thread replies from Discord for all tracked listing notifications since the last check. Writes `state/pending_feedback.json`. If `DISCORD_BOT_TOKEN` is not set, the script exits immediately — continue to step 4.

Emoji meanings: ✅ positive (good pick) · ❌ negative (not interesting) · 👀 watch (keep monitoring) · 🔥 strong interest (move fast)

Read `state/pending_feedback.json`. If it has entries, process them now before scraping:

- ✅ or 🔥 reactions → append a positive calibration note to `memory/calibration.md` and a preference signal to `memory/preferences.md` (e.g. "User reacted positively to listings with X trait")
- ❌ reaction → append a negative calibration note and preference signal (e.g. "User rejected listing with Y — note the area/price/BRF")
- 👀 reaction → note the user wants continued monitoring (update watchlist entry if applicable)
- Text replies → classify each reply as one of:
  - **Question** — answer it using your knowledge of the listing, BRF, and area. Post the answer back to the same thread:
    ```bash
    echo '{"thread_id":"<thread_id from entry>","content":"<your answer>"}' | bun run scripts/bot/reply.ts
    ```
  - **Preference or feedback** — extract the signal and append to `memory/preferences.md` under `## User feedback`, dated today. Then acknowledge in the thread:
    ```bash
    echo '{"thread_id":"<thread_id>","content":"Got it — saved to preferences."}' | bun run scripts/bot/reply.ts
    ```
  - **Command** (e.g. "skip this", "add to watchlist") — execute the action and confirm in the thread

After processing, write `state/pending_feedback.json` back with `"feedback": []` to clear processed entries.

## 4. Scrape listings

```bash
bun run scripts/scraper/index.ts > /tmp/listings.json
```

Outputs all new listings (not in `state/last_run.json`) as a JSON array to `/tmp/listings.json`. If the file is empty or the scraper errors, check for a block signal and stop — do not proceed with stale data.

## 5. Load context

Read the following once and hold it in context — you will pass summaries to subagents, do not tell subagents to read these files themselves:
- `config.yaml` — `notifyThreshold` and `watchThreshold`
- `memory/preferences.md` — user preferences (already updated in step 3 if feedback was present)
- `memory/market.md` — area pricing trends and comps
- `memory/macro.md` — interest rate and macro context (note the date of last update)
- `memory/calibration.md` — how past picks played out (already updated in step 3 if feedback was present)

## 6. Pre-filter

Read `/tmp/listings.json`. For each listing, apply a quick score using only the scraped data and the rubric in `.claude/skills/evaluate-listing/SKILL.md`.

- **Score clearly below `watchThreshold`** — append a short entry to `listings/skipped/YYYY-MM-DD.md` and move on. No subagent needed.
- **Score at or above `watchThreshold`** — queue for subagent evaluation.

After scoring all listings, if the queue exceeds `maxEvaluations`, keep only the top `maxEvaluations` by pre-filter score and skip the rest (log them in the skipped file with reason "below cap"). This caps the number of subagents spawned per run regardless of how many listings are scraped.

## 7. Spawn evaluation subagents

For all queued listings, spawn one subagent per listing **in parallel** (all in the same turn). Use `model: sonnet` for every subagent. Each subagent receives a self-contained prompt — do not tell it to read files from disk.

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

## 8. Route results

For each subagent result (a JSON object per the evaluate-listing skill output format):

**`route: notify`:**
- The subagent has already written the write-up file (path is in the `writeup` field). Verify the file exists.
- Send notification using the skill at `.claude/skills/notify-user/SKILL.md`. **Include `booli_id` in the payload** so the Discord thread is tracked for reaction feedback.

**`route: watch`:**
- The subagent has already written the watchlist file (path is in the `writeup` field). Verify the file exists.
- Update `state/watchlist.json` with the listing ID and current price

**`route: skip` or `disqualified: true`:**
- Append a short entry to `listings/skipped/YYYY-MM-DD.md` with the score and reason

## 9. Update state

Merge today's `booli_id` values with those already in `state/last_run.json`:

```json
{
  "last_run": "YYYY-MM-DDTHH:MM:SSZ",
  "seen_ids": [/* all IDs, merged */]
}
```

## 10. Update memory

After routing all results, apply any updates from subagent findings:
- If any result includes `macro_update` → overwrite the body of `memory/macro.md`, keeping the `## Last updated: YYYY-MM-DD` header set to today's date
- If any result includes `area_update` → upsert the row for that area in the `memory/market.md` table, updating the median, source, and `Last researched` date. If the area is not yet in the table, add a new row.
- If a watched listing sold or a notified listing was rejected → update `memory/calibration.md`

## Agent inbox

Any communication that is not a listing presentation must go to the agent-inbox channel via:

```bash
echo '{"title":"<subject>","body":"<detail>"}' | bun run scripts/bot/inbox.ts
```

Send a message to the inbox whenever:
- A step fails or produces unexpected output (include the step name and error)
- An env var is missing or misconfigured (name the variable and what it should contain)
- The scraper returns zero listings unexpectedly (could be a Booli layout change or a block)
- A preference or config question arises that only the user can resolve (e.g. conflicting signals, scope ambiguity)
- A macro or market shift is significant enough to warrant a heads-up outside the normal notification
- Anything else that requires human attention before the next run

Do not use the listings forum channel for these — that channel is only for evaluated listing threads.
