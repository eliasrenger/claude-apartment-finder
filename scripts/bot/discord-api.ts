const BASE = "https://discord.com/api/v10";

function authHeaders() {
  const token = Bun.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not set");
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

export interface PostedMessage {
  threadId: string;
  messageId: string;
  channelId: string;
}

export async function postForumThread(
  channelId: string,
  name: string,
  content: string,
): Promise<PostedMessage> {
  const res = await fetch(`${BASE}/channels/${channelId}/threads`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: name.slice(0, 100),
      message: { content },
      auto_archive_duration: 10080, // 7 days
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { id: string; message?: { id: string } };
  const threadId = data.id;
  // For forum channels the starter message ID equals the thread ID
  const messageId = data.message?.id ?? threadId;
  return { threadId, messageId, channelId };
}

export async function postToChannel(
  channelId: string,
  content: string,
): Promise<PostedMessage> {
  const res = await fetch(`${BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return { threadId: channelId, messageId: data.id, channelId };
}

export async function getReactionCount(
  threadId: string,
  messageId: string,
  emoji: string,
): Promise<number> {
  const encoded = encodeURIComponent(emoji);
  const res = await fetch(
    `${BASE}/channels/${threadId}/messages/${messageId}/reactions/${encoded}?limit=100`,
    { headers: authHeaders() },
  );
  if (res.status === 404) return 0;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as unknown[];
  return data.length;
}

export interface DiscordMessage {
  id: string;
  content: string;
  author: { id: string; bot?: boolean };
  timestamp: string;
}

export async function getNonBotMessages(
  threadId: string,
  afterId: string,
): Promise<DiscordMessage[]> {
  const res = await fetch(
    `${BASE}/channels/${threadId}/messages?after=${afterId}&limit=50`,
    { headers: authHeaders() },
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as DiscordMessage[];
  return data.filter((m) => !m.author.bot);
}
