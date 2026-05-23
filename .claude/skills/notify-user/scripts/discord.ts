import type { Notifier, NotificationPayload } from "./notifier";

export class DiscordNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(payload: NotificationPayload): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_name: payload.title.slice(0, 100), // forum channel thread title, 100 char max
        content: payload.body,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${text}`);
    }
  }
}
