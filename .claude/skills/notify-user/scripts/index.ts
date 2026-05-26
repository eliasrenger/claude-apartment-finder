import { DiscordBotNotifier, DiscordWebhookNotifier } from "./discord";
import type { NotificationPayload } from "./notifier";

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const botToken = Bun.env.DISCORD_BOT_TOKEN;
  const channelId = Bun.env.DISCORD_LISTING_CHANNEL_ID;
  const webhook = Bun.env.DISCORD_FORUM_WEBHOOK_URL ?? Bun.env.DISCORD_WEBHOOK_URL;

  if (botToken && channelId) {
    await new DiscordBotNotifier(channelId).notify(payload);
    return;
  }

  if (webhook) {
    log("warn", "DISCORD_BOT_TOKEN/DISCORD_LISTING_CHANNEL_ID not set — falling back to webhook (reaction tracking disabled)");
    await new DiscordWebhookNotifier(webhook).notify(payload);
    return;
  }

  log("warn", "No Discord configuration set (DISCORD_BOT_TOKEN+DISCORD_LISTING_CHANNEL_ID or DISCORD_FORUM_WEBHOOK_URL) — skipping notification");
}

function log(level: string, message: string): void {
  console.log(JSON.stringify({ level, message, ts: new Date().toISOString() }));
}
