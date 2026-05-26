---
name: notify-user
description: Send a notification to the user about an apartment listing. Use when a listing has been evaluated and routes to notify.
---

# Notify User

Send a JSON payload by piping it to the notifier script:

```bash
echo '{"title":"...","body":"..."}' | bun run ${CLAUDE_SKILL_DIR}/scripts/send.ts
```

The script delivers to Discord. Requires either:
- `DISCORD_BOT_TOKEN` + `DISCORD_LISTING_FORUM_ID` — preferred; enables reaction tracking and creates a forum thread per notification
- `DISCORD_FORUM_WEBHOOK_URL` (or `DISCORD_WEBHOOK_URL`) — fallback; sends via webhook, no reaction tracking

When using the bot, include `booli_id` in the payload so the Discord thread ID is saved to `state/discord_messages.json` for later reaction polling.

---

## Title format

Plain text, max 100 characters. Used as the Discord thread name.

```
🏠 <Address> — <neighbourhood> | Score: <X>/100
```

Example: `🏠 Skånegatan 80B — Södermalm | Score: 71/100`

---

## Body format

Discord markdown. This is what opens when the user clicks the thread. Keep it under ~1500 characters. Do not repeat the title line.

```
<One sentence verdict — the specific, unusual thing that makes this worth acting on today>

**Score: <X>/100** · Finansiellt: <XX>/50 · Boendekomfort: <XX>/50

**BRF: <brf_name>**
Skuld/m²: <X> SEK · Avgift: <fee_trend> · Stambyte: <status> · Underhållsfond: <status>

**<neighbourhood>, <municipality>**
Medianpris: <area_median> SEK/m² · <nearest_station> (<line>) <N> min · Mataffär <N> min

**Varför notifiera**
<2–3 sentences from the research — the financial case and the key livability strength>

**Risker**
• <risk 1>
• <risk 2>
• <risk 3 if relevant>

**Visning:** <showing date and time, or "ej annonserad ännu">
<url>
```

### What makes a good verdict line
Name a specific, unusual combination — not what the listing contains, but why it's interesting *today*:
- "Listad 10% under Booli-uppskattning i SoFo med BRF-avgift på 2 162 SEK — marknadens lägsta för ett sådant läge."
- "17% under estimat med stambytet avklarat och skuld på 2 835 SEK/m² — ett av de bäst skötta BRF:erna vi sett."

---

## Example payload

```bash
echo '{
  "title": "🏠 Skånegatan 80B — Södermalm | Score: 71/100",
  "body": "Listad 10% under Booli-uppskattning i SoFo med kommersiella hyresgäster som subventionerar avgiften till 2 162 SEK/mån.\n\n**Score: 71/100** · Finansiellt: 37/50 · Boendekomfort: 34/50\n\n**BRF Bondetorpet 80**\nSkuld/m²: 8 660 SEK · Avgift +4% 2024, +5% apr 2025 · Stambyte klart 2002 ✅ · Underhållsfond: ej bekräftad\n\n**SoFo, Södermalm**\nMedianpris: ~110 000 SEK/m² · Skanstull (T13/T14) 4 min · Hemköp 5 min\n\n**Varför notifiera**\nListat 5 195 000 SEK mot Booli-estimat 5 790 000 SEK (−10,3%). Jämförbar lägenhet på samma adress såldes feb 2025 för 5 300 000 SEK — detta är billigare. Kommersiella hyresgäster (restaurang + klädbutik) bidrar med >1,1 MSEK/år vilket håller avgiften exceptionellt låg.\n\n**Risker**\n• Avgiften höjd två år i rad — läs årsredovisningen på skanegatan80.se\n• Balkongläge okänt\n• 1930 byggnad — fasad/tak okänd status\n\n**Visning:** Ej annonserad ännu\nhttps://www.booli.se/bostad/736794",
  "booli_id": "736794"
}' | bun run ${CLAUDE_SKILL_DIR}/scripts/send.ts
```
