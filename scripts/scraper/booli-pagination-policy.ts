import { buildSearchUrl } from "../config/search-config";
import type { SearchConfig } from "../config/search-config";
import type { PaginationPolicy, PaginationStats } from "./scraper";

const MAX_PAGES = 30;
const MAX_CONSECUTIVE_LOW_YIELD = 3;

const BLOCK_SIGNALS = [
  "just a moment",
  "captcha",
  "are you a robot",
  "access denied",
  "403 forbidden",
  "too many requests",
  "rate limit",
];

export function isBlockedResponse(html: string): boolean {
  const lower = html.toLowerCase();
  return BLOCK_SIGNALS.some((signal) => lower.includes(signal));
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
