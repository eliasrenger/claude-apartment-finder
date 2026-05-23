---
name: evaluate-listing
description: Evaluate a single Booli apartment listing for financial potential and livability. Use for each listing that passes the initial pre-filter threshold. Performs baseline research plus autonomous deeper investigation when interesting signals are found. Returns a structured JSON result.
---

# Evaluate Listing

You are an autonomous research and evaluation agent. Your job is to assess a single apartment listing and return a structured verdict. You have access to WebSearch, WebFetch, and Write — use them actively.

You will receive:
- **Listing data** (scraped JSON from Booli)
- **User preferences** (inline summary)
- **Market context** (filtered to this listing's area)

---

## Search Budget

You have a combined budget of **6 WebSearch + WebFetch calls** before justification is required.

- **Calls 1–6:** Use freely for the baseline flow.
- **Calls 7–9:** Before each additional call, write one line naming the specific signal that justifies it (e.g. "stambyte vote mentioned in minutes — checking outcome"). Do not search out of habit.
- **Call 10+:** Hard stop. Return with what you have.

The baseline typically uses 5–6 calls: realtor fetch, BRF search, BRF fetch, transit search, area search (if stale), macro search (if stale). If area and macro are both fresh, you have headroom for autonomous investigation.

---

## Baseline Research Flow

Work through these steps in order. Do not skip any.

### 1. Initial score from scraped data
Score the listing 0–100 using the scoring rubric in CLAUDE.md (both axes: financial potential 0–50, livability 0–50). Use only the scraped data provided. This is your starting hypothesis — research will adjust it.

### 2. Realtor page
Fetch the listing URL. Extract:
- Full description text (renovation details, floor plan notes, condition signals)
- Balcony direction if mentioned
- Any features not in the Booli data
- Showing times

**If the description mentions anything unusual** — a renovation, a legal dispute, a noise source, a view, a specific neighbour situation, anything that could materially affect value — **follow that thread.** Search for more information before continuing.

### 3. BRF economy
Search: `"<brf_name>" årsredovisning`

Extract from the annual report:
- Skuld per lägenhet (debt per unit, in SEK)
- Skuld per m² (calculate: total debt per total living area)
- Årsavgift trend (fee change year-over-year)
- Underhållsfond balance (maintenance reserve)
- Planned major works (stambyte, fasad, tak, hiss)
- Operating surplus or deficit

**If BRF debt is unusually high or low, or if planned works are mentioned**, search for more context — how recent was the last major renovation, has the fee been rising fast, are there any news articles about the BRF.

Context for interpreting stambyte risk: a stambyte (pipe replacement) including bathroom renovation typically costs 250,000–500,000 SEK per apartment (4,000–7,000 SEK/m²) in Sweden as of 2026. A BRF with no maintenance fund facing a stambyte is looking at a fee increase or special assessment of that magnitude spread across owners.

### 4. Transit and walkability
Search: `"<address>" OR "<neighbourhood>" tunnelbana` and verify:
- Nearest green line (T17/T18/T19) or red line (T13/T14) station
- Walking distance in minutes (use Google Maps search if needed)
- Nearest grocery store and walking distance

If neither a subway station nor a grocery store is within 15 minutes walk, this is a hard disqualifier — note it clearly and stop deep research.

### 5. Area research

**Check staleness first.** Look up this listing's neighbourhood in the Market context table. Compare the `Last researched` date against today's date.

- **Fresh (≤14 days old):** Use the existing median and area notes from the Market context. Do not search. Set `area_median_price_per_m2` from the table and note in `area_notes` that cached data was used.
- **Stale (>14 days old) or area not in table:** Run the search below, then include the updated data in your JSON output so memory can be refreshed.

If searching:
Search: `"<neighbourhood>" Stockholm bostäder sålda 2026` and `"<neighbourhood>" Stockholm nyheter`

Extract:
- Recent sold prices for comparable listings (same area, ±10 m², ±1 room)
- Overbidding ratio if findable
- Any development news — new transit, demolitions, construction, gentrification signals, crime

**If local news surfaces something significant** (a major development project, infrastructure change, neighbourhood controversy) — research it further before scoring.

### 6. Macro check

**Check staleness first.** Read the `Last updated` date in the Macro context section. Compare against today's date.

- **Fresh (≤14 days old):** Use the existing macro data as-is. Do not search. Do not include `macro_update` in your output.
- **Stale (>14 days old):** Search `Riksbanken ränta 2026` and `Stockholm bostadspriser prognos 2026`. Summarise what changed and include it in `macro_update` so the main agent can refresh memory.

---

## Autonomous Research Triggers

Use calls 7–9 (with justification) when you find:

- A mention of a specific renovation year → verify what was done and what wasn't
- A BRF with unusually low debt → check if a recent stambyte already happened (good) or if one is overdue (bad)
- A listing that's been on the market a long time → search for the address to find out why
- A neighbourhood not in the market context → do a broader area assessment
- Anything in the realtor description that raises a question you can answer with one search

Each extra call needs a specific reason. "Being thorough" is not a reason.

---

## Output Format

**If route is `notify` or `watch`, write the writeup file to disk before returning JSON:**
- `notify` → write to `listings/notified/<today>-<booli_id>.md` using the notified listing format from CLAUDE.md
- `watch` → write to `listings/watchlist/<booli_id>.md` using the watchlist entry format from CLAUDE.md

Then return a single JSON object. Do not include any text outside the JSON.

```json
{
  "booli_id": 123456,
  "address": "Ringvägen 42",
  "score": 74,
  "route": "notify",
  "disqualified": false,
  "disqualifier_reason": null,
  "summary": "One sentence on why this is or isn't worth looking at.",
  "financial_score": 38,
  "livability_score": 36,
  "research": {
    "brf_name": "BRF Söderberg",
    "brf_debt_per_m2": 4200,
    "brf_fee_trend": "stable",
    "brf_planned_works": "none known",
    "brf_fund_balance": "adequate",
    "transit_nearest_station": "Skanstull (T13/T14)",
    "transit_walk_minutes": 7,
    "grocery_walk_minutes": 4,
    "area_median_price_per_m2": 82000,
    "area_overbidding_ratio": "8%",
    "area_notes": "Gentrifying, new café strip on Götgatan"
  },
  "writeup": "listings/notified/2026-05-23-123456.md",
  "macro_update": "Only include if macro was stale and you searched fresh data. Omit entirely if macro was fresh (≤14 days).",
  "area_update": "Only include if area data was stale or missing and you searched fresh data. Omit if cached. Format: { \"area\": \"<neighbourhood>\", \"median_price_per_m2\": <number>, \"source\": \"<source>\", \"researched\": \"<YYYY-MM-DD>\", \"notes\": \"<area signals>\" }",
  "extra_findings": "Optional. Autonomous research findings that don't fit the structured fields above."
}
```

**Route rules:**
- `notify` if score ≥ notifyThreshold AND at least one strong financial signal AND no hard disqualifier
- `watch` if score ≥ watchThreshold but below notify, OR if financially interesting despite mixed livability
- `skip` otherwise

If disqualified by a hard rule, set `route: "skip"`, `disqualified: true`, and populate `disqualifier_reason`. No writeup needed.
