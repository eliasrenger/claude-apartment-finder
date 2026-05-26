import { postToChannel } from "./discord-api";

const channelId = Bun.env.DISCORD_AGENT_INBOX_CHANNEL_ID;
if (!channelId) {
  console.error("DISCORD_AGENT_INBOX_CHANNEL_ID not set — message not delivered");
  process.exit(0); // exit 0 so a missing config doesn't abort the daily run
}

const raw = await Bun.stdin.text();
if (!raw.trim()) {
  console.error("No content on stdin");
  process.exit(1);
}

// Accept {"title":"...","body":"..."} JSON or a plain string
let content: string;
try {
  const parsed = JSON.parse(raw.trim()) as { title?: string; body?: string };
  if (parsed.title && parsed.body) {
    content = `**${parsed.title}**\n${parsed.body}`;
  } else {
    content = parsed.title ?? parsed.body ?? raw.trim();
  }
} catch {
  content = raw.trim();
}

if (!content) {
  console.error("Empty message — nothing to send");
  process.exit(1);
}

await postToChannel(channelId, content);
console.log("Message sent to agent-inbox");
