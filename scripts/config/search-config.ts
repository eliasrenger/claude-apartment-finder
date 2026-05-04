import { z } from "zod";
import { parse } from "yaml";
import { readFileSync } from "fs";

export const OBJECT_TYPES = [
  "Lägenhet",
  "Villa",
  "Gård",
  "Fritidshus",
  "Kedjehus-Parhus-Radhus",
  "Tomt/Mark",
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

const SearchConfigSchema = z.object({
  areaIds: z.array(z.number().int().positive()),
  extendAreas: z.number().nonnegative(),
  objectType: z.enum(OBJECT_TYPES),
  minListPrice: z.number().int().positive(),
  maxListPrice: z.number().int().positive(),
  minLivingArea: z.number().positive(),
  maxLivingArea: z.number().positive(),
  minRooms: z.number().positive(),
  maxRooms: z.number().positive(),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export function parseSearchConfig(raw: unknown): SearchConfig {
  return SearchConfigSchema.parse(raw);
}

export function loadSearchConfig(path: string): SearchConfig {
  const content = readFileSync(path, "utf-8");
  const file = parse(content) as { search?: unknown };
  return parseSearchConfig(file?.search);
}

const AnalysisConfigSchema = z.object({
  scoreThreshold: z.number().int().min(0).max(100).default(70),
  maxSteps: z.number().int().positive().default(20),
});

export type AnalysisConfig = z.infer<typeof AnalysisConfigSchema>;

export function parseAnalysisConfig(raw: unknown): AnalysisConfig {
  return AnalysisConfigSchema.parse(raw ?? {});
}

export function loadAnalysisConfig(path: string): AnalysisConfig {
  const content = readFileSync(path, "utf-8");
  const file = parse(content) as { analysis?: unknown };
  return parseAnalysisConfig(file?.analysis);
}

const BOOLI_SEARCH_URL = "https://www.booli.se/sok/till-salu";

export function buildSearchUrl(config: SearchConfig, page: number): string {
  const params = new URLSearchParams({
    extendAreas: String(config.extendAreas),
    maxListPrice: String(config.maxListPrice),
    maxLivingArea: String(config.maxLivingArea),
    maxRooms: String(config.maxRooms),
    minListPrice: String(config.minListPrice),
    minLivingArea: String(config.minLivingArea),
    minRooms: String(config.minRooms),
    objectType: config.objectType,
    page: String(page),
  });

  // areaIds uses unencoded commas per booli.se convention
  return `${BOOLI_SEARCH_URL}?areaIds=${config.areaIds.join(",")}&${params.toString()}`;
}
