/**
 * The eight canonical positioning attributes.
 *
 * These are FIXED. The LLM may propose colloquial axis labels per category
 * (`price` -> "Budget-friendly / Premium dentistry") but never adds, renames,
 * merges, or drops an attribute. Everything downstream — the map, the gap
 * calculation, the whitespace detection, the monthly verdict — assumes exactly
 * these eight keys in this order.
 */

export const ATTRIBUTES = [
  'price',
  'specialization',
  'convenience',
  'speed',
  'relationship',
  'reliability',
  'modernity',
  'breadth',
] as const;

export type Attribute = (typeof ATTRIBUTES)[number];

export type Scores = Record<Attribute, number>;

export interface AttributeDef {
  key: Attribute;
  /** Default axis label at 0. The LLM may override per category. */
  low: string;
  /** Default axis label at 100. The LLM may override per category. */
  high: string;
  /** Shown in the UI next to the axis selector. */
  hint: string;
  /**
   * Whether review VOLUME can move this score. Only `reliability` is even
   * partially review-driven, and there it is the average rating that matters,
   * not the count. See PLANO.md section 3.1 — this is a load-bearing property
   * of the product, not a detail.
   */
  movedByReviewVolume: false;
}

export const ATTRIBUTE_DEFS: Record<Attribute, AttributeDef> = {
  price: {
    key: 'price',
    low: 'Budget',
    high: 'Premium',
    hint: 'Where they sit on price, relative to this set',
    movedByReviewVolume: false,
  },
  specialization: {
    key: 'specialization',
    low: 'Generalist',
    high: 'Specialist',
    hint: 'How narrow their offering is',
    movedByReviewVolume: false,
  },
  convenience: {
    key: 'convenience',
    low: 'Hard to use',
    high: 'Easy to use',
    hint: 'Hours, booking, location, web presence',
    movedByReviewVolume: false,
  },
  speed: {
    key: 'speed',
    low: 'Weeks out',
    high: 'Same-day',
    hint: 'How fast they can see you',
    movedByReviewVolume: false,
  },
  relationship: {
    key: 'relationship',
    low: 'Transactional',
    high: 'Personal',
    hint: 'How personal the service is',
    movedByReviewVolume: false,
  },
  reliability: {
    key: 'reliability',
    low: 'Inconsistent',
    high: 'Dependable',
    hint: 'Average rating relative to this set — not review count',
    movedByReviewVolume: false,
  },
  modernity: {
    key: 'modernity',
    low: 'Traditional',
    high: 'Modern',
    hint: 'Equipment, facilities, web presence',
    movedByReviewVolume: false,
  },
  breadth: {
    key: 'breadth',
    low: 'Focused',
    high: 'Full-service',
    hint: 'How much they cover',
    movedByReviewVolume: false,
  },
};

/** Runtime guard for LLM output. Reject anything that is not exactly these keys. */
export function isCompleteScores(v: unknown): v is Scores {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== ATTRIBUTES.length) return false;
  return ATTRIBUTES.every((a) => {
    const n = obj[a];
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  });
}

export function emptyScores(fill = 50): Scores {
  return Object.fromEntries(ATTRIBUTES.map((a) => [a, fill])) as Scores;
}
