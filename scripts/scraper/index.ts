import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { BooliScraper } from "./booli-scraper";
import { BooliSearchExtractor } from "./booli-search-extractor";
import { BooliListingExtractor } from "./booli-listing-extractor";
import { BooliPaginationPolicy } from "./booli-pagination-policy";
import { Crawler } from "./crawler";
import { loadSearchConfig } from "../config/search-config";

export { BooliScraper, BooliSearchExtractor, BooliListingExtractor, BooliPaginationPolicy, Crawler };
export type { Scraper, Extractor, PaginationPolicy, PaginationStats } from "./scraper";

interface RunState {
  last_run: string | null;
  seen_ids: number[];
}

function loadSeenIds(): Set<number> {
  const statePath = resolve(process.cwd(), "state/last_run.json");
  if (!existsSync(statePath)) return new Set();
  try {
    const state: RunState = JSON.parse(readFileSync(statePath, "utf-8"));
    return new Set(state.seen_ids ?? []);
  } catch {
    return new Set();
  }
}

async function runScraper(): Promise<void> {
  const seenIds = loadSeenIds();
  const config = loadSearchConfig(resolve(process.cwd(), "config.yaml"));
  const scraper = await BooliScraper.launch();

  try {
    const crawler = new Crawler(scraper);
    const policy = new BooliPaginationPolicy(config, (href) => {
      const match = href.match(/^\/(bostad|annons)\/(\d+)$/);
      return match ? seenIds.has(Number(match[2])) : false;
    });

    const hrefs = await crawler.paginate(policy, new BooliSearchExtractor());
    const urls = hrefs.map(href => `https://www.booli.se${href}`);
    const listings = await crawler.scrapeMany(urls, new BooliListingExtractor());

    process.stdout.write(JSON.stringify(listings, null, 2));
  } finally {
    await scraper.close();
  }
}

await runScraper();
