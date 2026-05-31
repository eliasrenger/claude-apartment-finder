import { buildSearchUrl } from "../config/search-config";
import type { SearchConfig } from "../config/search-config";
import type { PaginationPolicy, PaginationStats } from "./scraper";

const MAX_PAGES = 30;
const MAX_CONSECUTIVE_LOW_YIELD = 3;

// Patterns are anchored tightly to avoid false positives from embedded JS config.
// "captcha" and "rate limit" were removed — both appear in Booli's own __NEXT_DATA__ config.
const BLOCK_SIGNALS = [
  "<title>just a moment",    // Cloudflare JS challenge page title
  "cf-browser-verification", // Cloudflare browser verification element
  "challenge-platform",      // Cloudflare challenge platform script
  "are you a robot",         // bot challenge body text (very unlikely in normal content)
  "<title>access denied",    // access-denied error page
  "<title>403",              // 403 error page
  "too many requests",       // 429 error page body
];

export function findBlockSignal(html: string): string | null {
  const lower = html.toLowerCase();
  return BLOCK_SIGNALS.find((signal) => lower.includes(signal)) ?? null;
}

export function isBlockedResponse(html: string): boolean {
  return findBlockSignal(html) !== null;
}

export class BooliPaginationPolicy implements PaginationPolicy {
  constructor(
    private readonly config: SearchConfig,
    private readonly isAlreadySeen: (href: string) => boolean,
  ) {}

  urlForPage(page: number): string {
    return buildSearchUrl(this.config, page);
  }

  filterNew(hrefs: string[]): string[] {
    return hrefs.filter((href) => !this.isAlreadySeen(href));
  }

  shouldContinue(stats: PaginationStats): boolean {
    if (stats.blocked) return false;
    if (stats.page >= MAX_PAGES) return false;
    if (stats.consecutiveLowYield >= MAX_CONSECUTIVE_LOW_YIELD) return false;
    return true;
  }
}
