export interface Scraper {
  fetch(url: string): Promise<string>;
  close(): Promise<void>;
}

export interface Extractor<T> {
  extract(html: string, url: string): T | null;
}

export interface PaginationStats {
  page: number;
  found: number;
  new: number;
  consecutiveLowYield: number;
  blocked: boolean;
}

export interface PaginationPolicy {
  urlForPage(page: number): string;
  filterNew(hrefs: string[]): string[];
  shouldContinue(stats: PaginationStats): boolean;
}
