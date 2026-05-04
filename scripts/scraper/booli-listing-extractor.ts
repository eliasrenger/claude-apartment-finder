import type { Listing } from "./types";
import type { Extractor } from "./scraper";

const BASE_URL = "https://www.booli.se";

export class BooliListingExtractor implements Extractor<Listing> {
  extract(html: string, url: string): Listing | null {
    const href = url.replace(BASE_URL, "");
    const identity = parseHref(href);
    if (!identity) return null;

    const apollo = parseApolloState(html);
    if (!apollo) return null;

    const listing = findListingEntry(apollo);
    if (!listing) return null;

    return buildListing(listing, apollo, identity, href);
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseHref(href: string): { booliId: number; listingType: "bostad" | "annons" } | null {
  const match = href.match(/^\/(bostad|annons)\/(\d+)$/);
  if (!match) return null;
  return { booliId: Number(match[2]), listingType: match[1] as "bostad" | "annons" };
}

function parseApolloState(html: string): Record<string, any> | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (!match) return null;
  try {
    const nextData = JSON.parse(match[1]!);
    return nextData?.props?.pageProps?.__APOLLO_STATE__ ?? null;
  } catch {
    return null;
  }
}

function findListingEntry(apollo: Record<string, any>): Record<string, any> | null {
  const key = Object.keys(apollo).find((k) => k.startsWith("Listing:"));
  return key ? apollo[key] : null;
}

function buildListing(
  l: Record<string, any>,
  apollo: Record<string, any>,
  identity: { booliId: number; listingType: "bostad" | "annons" },
  href: string,
): Listing {
  return {
    booli_id: identity.booliId,
    listing_type: identity.listingType,
    url: `${BASE_URL}${l.url ?? href}`,
    address: l.streetAddress ?? null,
    neighbourhood: l.primaryArea?.name ?? (l.location?.namedAreas as string[] | undefined)?.[0] ?? null,
    municipality: l.location?.region?.municipalityName ?? null,
    postal_code: extractPostalCode(l, apollo),
    brf_name: extractBrfName(l),
    living_area_m2: rawNum(l.livingArea),
    rooms: rawNum(l.rooms),
    floor: l.floor?.raw != null ? Math.round(l.floor.raw) : null,
    total_floors: l.buildingFloors ?? null,
    construction_year: l.constructionYear ?? null,
    list_price: rawNum(l.listPrice),
    price_per_m2: rawNum(l.listSqmPrice),
    monthly_fee: rawNum(l.rent),
    operating_cost: rawNum(l.operatingCost),
    booli_estimate_low: parseEstimate(l.estimate?.low),
    booli_estimate_mid: parseEstimate(l.estimate?.price),
    booli_estimate_high: parseEstimate(l.estimate?.high),
    has_balcony: hasAmenity(l, apollo, "balcony"),
    has_patio: hasAmenity(l, apollo, "patio"),
    has_elevator: hasAmenity(l, apollo, "elevator"),
    has_fireplace: hasAmenity(l, apollo, "fireplace"),
    has_storage: hasAmenity(l, apollo, "storage"),
    published_date: l.published ?? null,
    showing_date: (l.showings as any[] | undefined)?.[0]?.startTime ?? null,
    scraped_at: new Date().toISOString(),
  };
}

function extractPostalCode(l: Record<string, any>, apollo: Record<string, any>): string | null {
  return (l.areas ?? [])
    .map((a: { __ref: string }) => {
      const entry = apollo[a.__ref];
      return entry?.type === "postcode" ? String(entry.name) : null;
    })
    .find(Boolean) ?? null;
}

function extractBrfName(l: Record<string, any>): string | null {
  const breadcrumb = (l.breadcrumbs ?? []).find((b: { url?: string }) =>
    b.url?.startsWith("/bostadsrattsforening/")
  );
  return breadcrumb?.label ?? null;
}

function hasAmenity(l: Record<string, any>, apollo: Record<string, any>, key: string): boolean {
  return (l.amenities ?? []).some(
    (a: { __ref: string }) => apollo[a.__ref]?.key === key
  );
}

function rawNum(val: { raw?: number } | null | undefined): number | null {
  return val?.raw ?? null;
}

function parseEstimate(val: { raw?: number; value?: string } | null | undefined): number | null {
  if (!val) return null;
  if (val.raw !== undefined) return val.raw;
  const n = Number(String(val.value ?? "").replace(/\s/g, ""));
  return isNaN(n) ? null : n;
}
