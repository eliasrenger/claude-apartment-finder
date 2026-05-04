import type { Notifier } from "./notifier";

export class DiscordNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(message: string): Promise<void> {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: this.buildBody(message),
    });
  }

  private buildBody(message: string): string {
    return JSON.stringify({ content: message });
  }
}
