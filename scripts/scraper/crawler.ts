import type { Extractor, PaginationPolicy, PaginationStats, Scraper } from "./scraper";
import { isBlockedResponse } from "./booli-pagination-policy";

const DEFAULT_DELAY_MS = 3_000;
const DEFAULT_CONCURRENCY = 3;

export class Crawler {
  constructor(
    private readonly scraper: Scraper,
    private readonly delayMs: number = DEFAULT_DELAY_MS,
    private readonly concurrency: number = DEFAULT_CONCURRENCY,
  ) {}

  async paginate(policy: PaginationPolicy, extractor: Extractor<string[]>): Promise<string[]> {
    const allNewHrefs: string[] = [];
    let consecutiveLowYield = 0;

    for (let page = 1; ; page++) {
      if (page > 1) await sleep(this.delayMs);

      const html = await this.fetchWithRetry(policy.urlForPage(page));
      if (!html) break;

      const found = extractor.extract(html, policy.urlForPage(page)) ?? [];
      const newHrefs = policy.filterNew(found);
      allNewHrefs.push(...newHrefs);

      const yieldRatio = found.length > 0 ? newHrefs.length / found.length : 0;
      consecutiveLowYield = yieldRatio < 0.1 ? consecutiveLowYield + 1 : 0;

      const stats: PaginationStats = {
        page,
        found: found.length,
        new: newHrefs.length,
        consecutiveLowYield,
        blocked: isBlockedResponse(html),
      };

      logPaginationStats(stats);

      if (!policy.shouldContinue(stats)) break;
    }

    return allNewHrefs;
  }

  async scrapeMany<T>(
    urls: string[],
    extractor: Extractor<T>,
  ): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    const worker = async (): Promise<void> => {
      while (index < urls.length) {
        const url = urls[index++]!;
        await sleep(this.delayMs);
        try {
          const html = await this.fetchWithRetry(url);
          if (!html) continue;
          const result = extractor.extract(html, url);
          if (result !== null) results.push(result);
        } catch (err) {
          log("error", "Failed to scrape page, skipping", { url, err: String(err) });
        }
      }
    };

    const workerCount = Math.min(this.concurrency, urls.length);
    if (workerCount > 0) {
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }

    return results;
  }

  private async fetchWithRetry(url: string): Promise<string | null> {
    try {
      return await this.scraper.fetch(url);
    } catch (err) {
      log("warn", "Fetch failed, retrying once", { url, err: String(err) });
      await sleep(this.delayMs);
      try {
        return await this.scraper.fetch(url);
      } catch (retryErr) {
        log("error", "Fetch failed after retry, skipping", { url, err: String(retryErr) });
        return null;
      }
    }
  }
}

function logPaginationStats(stats: PaginationStats): void {
  if (stats.blocked) {
    log("error", "Scraper is blocked — stopping pagination", stats);
  } else if (stats.found === 0 && stats.page === 1) {
    log("warn", "Page 1 returned no listings — check search config or site availability", stats);
  } else if (!stats.page) {
    log("info", "Early stop: consecutive low-yield pages", stats);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(level: string, message: string, data?: unknown): void {
  console.log(JSON.stringify({ level, message, ...(data as object), ts: new Date().toISOString() }));
}
