import { ATTRIBUTES, type Scores } from './attributes';

/**
 * Weighted Euclidean distance between two score vectors, normalized to 0..100.
 * PLANO.md section 8.1 — used for the map's obtained→desired arrow and for
 * the monthly gapScore.
 */
export function attrDistance(a: Scores, b: Scores, weights?: Partial<Scores>): number {
  const w = { ...Object.fromEntries(ATTRIBUTES.map((k) => [k, 1])), ...weights } as Scores;
  const sum = ATTRIBUTES.reduce((s, k) => s + w[k] * (a[k] - b[k]) ** 2, 0);
  const wsum = ATTRIBUTES.reduce((s, k) => s + w[k], 0);
  return Math.sqrt(sum / wsum);
}

export interface DensityPoint {
  x: number;
  y: number;
  mass: number;
}

/**
 * Gaussian-kernel density over a 20x20 grid spanning the [0,100] map. PLANO.md
 * section 8.1 — the shaded density layer under the scatter plot.
 */
export function densityGrid(points: DensityPoint[], bandwidth = 12): number[][] {
  const G = 20;
  const grid: number[][] = [];
  for (let i = 0; i < G; i++) {
    grid[i] = [];
    for (let j = 0; j < G; j++) {
      const cx = (i + 0.5) * (100 / G);
      const cy = (j + 0.5) * (100 / G);
      grid[i][j] = points.reduce((s, p) => {
        const d2 = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        return s + p.mass * Math.exp(-d2 / (2 * bandwidth ** 2));
      }, 0);
    }
  }
  return grid;
}

/** log1p(ratingsTotal), halved for chains — PLANO.md section 8.1. */
export function bubbleMass(ratingsTotal: number, isChain: boolean): number {
  return Math.log1p(Math.max(0, ratingsTotal)) * (isChain ? 0.6 : 1);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export type CategoryMatch = 'EXACT' | 'RELATED' | 'KEYWORD_ONLY';

const CATEGORY_MATCH_SCORE: Record<CategoryMatch, number> = {
  EXACT: 1.0,
  RELATED: 0.6,
  KEYWORD_ONLY: 0.2,
};

export interface RelevanceInput {
  distanceM: number;
  serviceRadiusM: number;
  categoryMatch: CategoryMatch;
  ratingsTotal: number;
  /** ratingsTotal of every candidate in the discovery batch, for normalization. */
  ratingsTotalInSet: number[];
  hasWebsite: boolean;
  hasPublishedHours: boolean;
}

/**
 * Pre-LLM relevance score — who makes the candidate list at all.
 * PLANO.md section 6.4.
 */
export function relevance(input: RelevanceInput): number {
  const proximity = clamp01(1 - input.distanceM / input.serviceRadiusM);
  const categoryMatch = CATEGORY_MATCH_SCORE[input.categoryMatch];
  const salience = normalizedSalience(input.ratingsTotal, input.ratingsTotalInSet);
  const completeness = (input.hasWebsite ? 0.5 : 0) + (input.hasPublishedHours ? 0.5 : 0);

  return 0.35 * proximity + 0.3 * categoryMatch + 0.25 * salience + 0.1 * completeness;
}

/** log1p(ratingsTotal), min-max normalized against the rest of the set — 0 if the set is uniform. */
function normalizedSalience(ratingsTotal: number, ratingsTotalInSet: number[]): number {
  const logs = ratingsTotalInSet.map((n) => Math.log1p(Math.max(0, n)));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) return 0;
  return clamp01((Math.log1p(Math.max(0, ratingsTotal)) - lo) / (hi - lo));
}

export type BusinessType = 'STOREFRONT' | 'SERVICE_AREA';

export interface RivalryInput {
  businessType: BusinessType;
  distanceM: number;
  serviceRadiusM: number;
  /** 0..100 distance between self and competitor on the 8 attributes. */
  attrDistance: number;
  ratingsTotal: number;
  ratingsTotalInSet: number[];
  isChain: boolean;
}

/**
 * Rivalry score — who shows up in the free tier's top 3.
 * PLANO.md section 6.4. `positionalCloseness` is 1 minus the normalized
 * attribute distance (0..100 -> 0..1): close in attrDistance means the two
 * businesses are read as the same choice by a customer, which is what
 * "rivalry" is measuring here.
 */
export function rivalry(input: RivalryInput): number {
  const proximity = clamp01(1 - input.distanceM / input.serviceRadiusM);
  const positionalCloseness = clamp01(1 - input.attrDistance / 100);
  const salience = normalizedSalience(input.ratingsTotal, input.ratingsTotalInSet);
  const wProx = input.businessType === 'SERVICE_AREA' ? 0.25 : 0.45;

  const score =
    wProx * proximity + (0.85 - wProx) * positionalCloseness + 0.15 * salience - (input.isChain ? 0.15 : 0);
  return Math.max(0, score);
}
