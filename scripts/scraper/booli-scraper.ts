import { chromium } from "playwright";
import type { BrowserContext } from "playwright";
import type { Scraper } from "./scraper";

export class BooliScraper implements Scraper {
  private constructor(private readonly context: BrowserContext) {}

  static async launch(): Promise<BooliScraper> {
    const browser = await chromium.launch({
      headless: true,
    });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      locale: "sv-SE",
      viewport: { width: 1280, height: 800 },
    });
    await acceptCookieConsent(context);
    return new BooliScraper(context);
  }

  async fetch(url: string): Promise<string> {
    const page = await this.context.newPage();
    try {
      const response = await page.goto(url, { waitUntil: "load" });
      if (response && response.status() !== 200) {
        log("warn", "Non-200 response from booli.se", { url, status: response.status() });
      }
      return await page.content();
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.context.close();
    await this.context.browser()?.close();
  }
}

async function acceptCookieConsent(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto("https://www.booli.se", { waitUntil: "domcontentloaded" });
    await page.locator("#didomi-notice-agree-button").click({ timeout: 10_000 }).catch(() => {
      log("warn", "Could not accept cookie consent — listings may have missing data");
    });
  } finally {
    await page.close();
  }
}

function log(level: string, message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, message, ...data, ts: new Date().toISOString() }));
}
