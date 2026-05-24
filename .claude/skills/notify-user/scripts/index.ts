import { DiscordNotifier } from "./discord";
import type { NotificationPayload } from "./notifier";

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const webhook = Bun.env.DISCORD_FORUM_WEBHOOK_URL ?? Bun.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    log("warn", "No Discord webhook URL set (DISCORD_FORUM_WEBHOOK_URL or DISCORD_WEBHOOK_URL) — skipping notification");
    return;
  }
  const notifier = new DiscordNotifier(webhook);
  await notifier.notify(payload);
}

function log(level: string, message: string): void {
  console.log(JSON.stringify({ level, message, ts: new Date().toISOString() }));
}
