import type { Notifier, NotificationPayload } from "./notifier";
import { postForumThread } from "../../../../scripts/bot/discord-api";

interface TrackedMessage {
  title: string;
  thread_id: string;
  message_id: string;
  channel_id: string;
  posted_at: string;
}

interface DiscordMessages {
  messages: Record<string, TrackedMessage>;
}

async function saveMessageId(
  booliId: string,
  title: string,
  threadId: string,
  messageId: string,
  channelId: string,
): Promise<void> {
  const path = "state/discord_messages.json";
  let state: DiscordMessages = { messages: {} };
  try {
    const file = Bun.file(path);
    if (await file.exists()) state = (await file.json()) as DiscordMessages;
  } catch {}
  state.messages[booliId] = {
    title,
    thread_id: threadId,
    message_id: messageId,
    channel_id: channelId,
    posted_at: new Date().toISOString(),
  };
  await Bun.write(path, JSON.stringify(state, null, 2));
}

export class DiscordBotNotifier implements Notifier {
  constructor(private readonly channelId: string) {}

  async notify(payload: NotificationPayload): Promise<void> {
    const { threadId, messageId, channelId } = await postForumThread(
      this.channelId,
      payload.title,
      payload.body,
    );
    if (payload.booli_id) {
      await saveMessageId(
        payload.booli_id,
        payload.title,
        threadId,
        messageId,
        channelId,
      );
    }
  }
}

export class DiscordWebhookNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(payload: NotificationPayload): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_name: payload.title.slice(0, 100),
        content: payload.body,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${text}`);
    }
  }
}
