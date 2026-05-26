import { getReactionCount, getNonBotMessages } from "./discord-api";

interface TrackedMessage {
  title: string;
  thread_id: string;
  message_id: string;
  channel_id: string;
  posted_at: string;
  last_checked?: string;
}

interface DiscordMessages {
  messages: Record<string, TrackedMessage>;
}

export interface FeedbackEntry {
  booli_id: string;
  title: string;
  thread_id: string; // Discord thread to post replies into
  reactions: { positive: number; negative: number; watch: number; strong: number };
  replies: string[];
  checked_at: string;
}

export interface PendingFeedback {
  feedback: FeedbackEntry[];
  last_updated: string | null;
}

const DISCORD_MESSAGES_PATH = "state/discord_messages.json";
const PENDING_FEEDBACK_PATH = "state/pending_feedback.json";

// Emoji meanings:
// ✅ positive — good pick, I'm interested
// ❌ negative — not interested / bad pick
// 👀 watch — add/keep on watchlist
// 🔥 strong — very interested, move fast
const EMOJIS = { positive: "✅", negative: "❌", watch: "👀", strong: "🔥" };

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const file = Bun.file(path);
    if (await file.exists()) return (await file.json()) as T;
  } catch {}
  return fallback;
}

async function main() {
  if (!Bun.env.DISCORD_BOT_TOKEN) {
    console.log("DISCORD_BOT_TOKEN not set — skipping reaction poll");
    return;
  }

  const tracked = await loadJson<DiscordMessages>(DISCORD_MESSAGES_PATH, {
    messages: {},
  });
  const entries = Object.entries(tracked.messages);

  if (entries.length === 0) {
    console.log("No tracked messages — nothing to poll");
    return;
  }

  const now = new Date().toISOString();
  const feedback: FeedbackEntry[] = [];

  for (const [booliId, msg] of entries) {
    console.log(`Polling ${booliId} — ${msg.title}`);
    try {
      const [positive, negative, watch, strong] = await Promise.all([
        getReactionCount(msg.thread_id, msg.message_id, EMOJIS.positive),
        getReactionCount(msg.thread_id, msg.message_id, EMOJIS.negative),
        getReactionCount(msg.thread_id, msg.message_id, EMOJIS.watch),
        getReactionCount(msg.thread_id, msg.message_id, EMOJIS.strong),
      ]);

      const replies = await getNonBotMessages(msg.thread_id, msg.message_id);
      const replyTexts = replies.map((r) => r.content.trim()).filter(Boolean);

      if (positive + negative + watch + strong + replyTexts.length > 0) {
        feedback.push({
          booli_id: booliId,
          title: msg.title,
          thread_id: msg.thread_id,
          reactions: { positive, negative, watch, strong },
          replies: replyTexts,
          checked_at: now,
        });
        const emojiStr = [
          positive && `✅×${positive}`,
          negative && `❌×${negative}`,
          watch && `👀×${watch}`,
          strong && `🔥×${strong}`,
        ]
          .filter(Boolean)
          .join(" ");
        const replyNote =
          replyTexts.length > 0
            ? ` + ${replyTexts.length} repl${replyTexts.length === 1 ? "y" : "ies"}`
            : "";
        console.log(`  ${emojiStr}${replyNote}`);
      }

      tracked.messages[booliId].last_checked = now;
    } catch (err) {
      console.error(`  Failed to poll ${booliId}:`, err);
    }
  }

  const pending: PendingFeedback = { feedback, last_updated: now };
  await Bun.write(PENDING_FEEDBACK_PATH, JSON.stringify(pending, null, 2));
  await Bun.write(DISCORD_MESSAGES_PATH, JSON.stringify(tracked, null, 2));

  if (feedback.length > 0) {
    console.log(
      `\nSaved feedback for ${feedback.length} listing(s) → ${PENDING_FEEDBACK_PATH}`,
    );
  } else {
    console.log("No user feedback found");
  }
}

await main();
