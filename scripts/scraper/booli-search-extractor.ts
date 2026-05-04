import type { Extractor } from "./scraper";

const LISTING_HREF_PATTERN = /href="(\/(bostad|annons)\/\d+)"/g;

export class BooliSearchExtractor implements Extractor<string[]> {
  extract(html: string): string[] {
    const hrefs: string[] = [];
    const re = new RegExp(LISTING_HREF_PATTERN.source, "g");
    let match;
    while ((match = re.exec(html)) !== null) {
      hrefs.push(match[1]!);
    }
    return [...new Set(hrefs)];
  }
}
