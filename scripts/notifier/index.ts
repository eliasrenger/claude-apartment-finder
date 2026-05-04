import { DiscordNotifier } from "./discord";

export async function sendNotification(message: string): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    log("warn", "DISCORD_WEBHOOK_URL not set — skipping notification");
    return;
  }
  const notifier = new DiscordNotifier(webhook);
  await notifier.notify(message);
}

function log(level: string, message: string): void {
  console.log(JSON.stringify({ level, message, ts: new Date().toISOString() }));
}
