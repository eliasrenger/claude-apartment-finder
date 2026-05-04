# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A daily autonomous agent that scrapes new Booli listings, scores them for livability and financial potential, researches promising ones in depth, and notifies the user via Discord. See `run.md` for the daily execution sequence and `README.md` for a full overview.

## Commands

```bash
bun install                          # install dependencies
bunx playwright install chromium     # install browser for scraper
bun run scripts/scraper/index.ts     # scrape and print new listings as JSON
bun run scripts/notifier/send.ts     # send a Discord message (reads from stdin)
```

## Architecture

The scraper (`scripts/scraper/`) uses Playwright to render Booli pages, then extracts structured listing data from the embedded `__NEXT_DATA__` Apollo JSON rather than scraping the DOM. It outputs new listings (not in `state/last_run.json`) as a JSON array to stdout.

The notifier (`scripts/notifier/`) is a thin Discord webhook wrapper. Claude formats the message and pipes it to `send.ts`.

All persistent state lives in plain files:
- `state/last_run.json` — seen listing IDs for deduplication
- `state/watchlist.json` — active watchlist with price history
- `memory/` — accumulated market knowledge, user preferences, calibration
- `listings/` — per-listing write-ups and rejection log

Search parameters are in `config.yaml`. Score thresholds (`notifyThreshold`, `watchThreshold`) are also in `config.yaml` under `analysis`.

---

## Scoring Rubric

Score each listing 0–100 across two equally weighted axes. Apply this before deep research using only scraped data, then adjust after research.

### Financial potential (0–50)

**Discount to Booli estimate (0–20 pts)**
Booli provides `booli_estimate_low`, `booli_estimate_mid`, `booli_estimate_high`. Compare `list_price` to `booli_estimate_mid`:
- >10% below estimate → 20 pts
- 5–10% below → 14 pts
- 0–5% below → 8 pts
- At or above estimate → 0–4 pts
- No estimate available → use price/m² comparison only, note the gap

**Price per m² vs area (0–15 pts)**
Compare `price_per_m2` against the area median stored in `memory/market.md`. If no data exists for the area yet, search for recent Booli sold listings in that neighbourhood and record the median.
- >15% below area median → 15 pts
- 10–15% below → 11 pts
- 5–10% below → 7 pts
- Within 5% of median → 4 pts
- Above median → 0–2 pts

**Monthly fee efficiency (0–10 pts)**
A high `monthly_fee` erodes financial potential even if the list price looks good. Normalise to fee/m²:
- <400 SEK/m²/month → 10 pts
- 400–600 → 7 pts
- 600–800 → 4 pts
- >800 → 0–2 pts

**BRF financial health (0–5 pts)** *(requires research)*
Populated after reading the årsredovisning. Key metric: debt per apartment (skuld per lägenhet) and maintenance fund adequacy.
- Debt <5,000 SEK/m², healthy fund → 5 pts
- Debt 5,000–10,000 SEK/m² → 3 pts
- Debt >10,000 SEK/m² or deferred maintenance → 0–1 pts

---

### Livability (0–50)

**Floor (0–10 pts)**
- Floor 4+ with elevator → 10 pts
- Floor 3–4 → 8 pts
- Floor 2 → 6 pts
- Floor 1 → 3 pts
- Ground floor / basement → 0–1 pts
- No elevator above floor 2 → deduct 3 pts

**Outdoor space (0–10 pts)**
- Balcony facing south/west (noted in description) → 10 pts
- Balcony direction unknown → 8 pts
- Patio → 6 pts
- No outdoor space → 0 pts

**Building and condition (0–10 pts)**
Use `construction_year` and renovation signals from the realtor description.
- Built or fully renovated after 2000 → 10 pts
- 1980–2000 → 7 pts
- 1960–1980, no known renovation → 4 pts
- Pre-1960 with documented renovations → 6 pts
- Pre-1960, unknown condition → 2 pts

**Area desirability and trajectory (0–10 pts)** *(informed by research)*
Cross-reference `neighbourhood` and `municipality` with `memory/market.md` and search results for development news (new transit, gentrification, school ratings).
- Established desirable area or up-and-coming with strong signals → 8–10 pts
- Stable average area → 5–7 pts
- Declining or low-demand area → 0–4 pts

**Layout and size efficiency (0–5 pts)**
Infer from `rooms` and `living_area_m2`. A 3-room apartment in 60 m² scores lower than 3 rooms in 75 m².
- Efficient, well-proportioned layout → 5 pts
- Average → 3 pts
- Cramped or awkward → 0–1 pts

**Amenities (0–5 pts)**
- Storage + elevator + good condition building → 5 pts
- Mix of amenities → 2–4 pts
- None → 0 pts

---

## Research Checklist

Run for every listing at or above `watchThreshold`. Use `WebSearch` and `WebFetch`.

### BRF economy
Search: `"<brf_name>" årsredovisning`
Extract:
- Skuld per lägenhet (debt per unit)
- Årsavgift trend (fee trend year-over-year)
- Underhållsfond (maintenance reserve balance)
- Planned major renovations (stambyte, fasad, tak)
- Operating surplus/deficit

Red flags: debt >10,000 SEK/m², no maintenance fund, planned stambyte within 5 years with no reserve.

### Realtor page
Fetch the listing URL from Booli. Look for:
- Full description text (balcony direction, renovation details, floor plan notes)
- Photos (condition signals, natural light, layout)
- Upcoming showing times
- Realtor name and agency (some agents have reputations worth noting)

### Area and market trends
Search: `"<neighbourhood>" bostadsmarknad 2025` and `"<neighbourhood>" Stockholm development`
Look for:
- Recent average sold prices vs list prices (overbidding ratio)
- New transit or infrastructure investments
- Gentrification or decline signals
- School quality if family-relevant

Also search Booli for recently sold comparable listings (same area, ±10 m², ±1 room) and record in `memory/market.md`.

### Macro context
Search: `Riksbanken ränta 2025` and `Stockholm bostadspriser prognos`
Look for:
- Current policy rate and direction
- Analyst forecasts for Stockholm apartment prices
- Any relevant economic events

Update `memory/macro.md` if the picture has shifted since the last recorded entry.

---

## Output Formats

### Notified listing — `listings/notified/YYYY-MM-DD-<booli_id>.md`

```markdown
# <Address> — Score: <X>/100

**Verdict:** <one sentence>

| Field | Value |
|---|---|
| Price | X,XXX,XXX SEK |
| Price/m² | XX,XXX SEK/m² |
| Monthly fee | X,XXX SEK |
| Size | XX m², X rooms |
| Floor | X of X |
| Built | XXXX |
| BRF | <name> |
| Area | <neighbourhood>, <municipality> |
| Booli estimate | XXX–XXX–XXX (low/mid/high) |
| URL | <url> |

## Why notify

<2–3 paragraphs on what makes this worth a closer look — financial case, livability strengths, and context from research>

## Risks and open questions

<Honest list of negatives or unknowns — BRF debt, missing renovation info, area concerns>

## BRF economy

<Key numbers from årsredovisning. Debt/m², fee trend, fund balance, renovation plans.>

## Market context

<Comparable sold listings, area overbidding ratio, neighbourhood trajectory>
```

### Discord notification message

```
🏠 **<Address>** — <neighbourhood> | Score: <X>/100
<One sentence verdict>

💰 <list_price> SEK | <price_per_m2> SEK/m² | Avgift: <monthly_fee> SEK/month
📐 <rooms> rum, <living_area_m2> m² | Våning <floor>/<total_floors> | Byggår <construction_year>
📊 Booli estimate: <booli_estimate_low>–<booli_estimate_high> SEK

<url>
```

### Watchlist entry — `listings/watchlist/<booli_id>.md`

```markdown
# <Address> — Watching

**Initial score:** <X>/100 | **First seen:** YYYY-MM-DD
**Status:** Active / Sold / Withdrawn

## Price history
| Date | Price | Change |
|---|---|---|
| YYYY-MM-DD | X,XXX,XXX SEK | — |

## Why watching
<One paragraph on what's interesting but not yet notify-worthy>

## Research notes
<BRF snippets, area notes, anything found during research>

## Updates
<!-- Append new entries as the listing progresses -->
```

### Skipped log — `listings/skipped/YYYY-MM-DD.md`

```markdown
# Skipped — YYYY-MM-DD

| ID | Address | Score | Reason |
|---|---|---|---|
| XXXXXXX | <address> | XX/100 | <one short phrase> |
```

---

## Key Signals

**Positive signals** (adjust score upward):
- List price below Booli estimate low
- BRF debt under 3,000 SEK/m² with a healthy maintenance fund
- Area with new or planned transit investment
- Price reduction since first listed
- Long time on market in a hot area (seller motivation)

**Red flags** (adjust score downward or skip):
- Monthly fee above 800 SEK/m² with high BRF debt
- Planned stambyte (pipe replacement) within 5 years, no reserve fund
- Ground floor on a busy street
- Construction year 1965–1975 without documented renovation (asbestos risk era)
- Listing active >60 days with no price reduction (may indicate hidden issues)

**Memory updates to make when relevant:**
- New area median price/m² → `memory/market.md`
- Overbidding pattern for an area → `memory/market.md`
- Rate decision or macro shift → `memory/macro.md`
- User feedback on a pick → `memory/preferences.md`
- Watched listing sold above/below estimate → `memory/calibration.md`
