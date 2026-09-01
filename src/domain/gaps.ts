/**
 * Structural gap detection.
 *
 * This is the evidence layer under every "alternative position" the product
 * sells. It is 100% deterministic — no LLM. A gap is a measurable coverage
 * hole in the competitive set, stated as a sentence a business owner can
 * verify in two clicks.
 *
 * "None of the 23 dentists within 5 miles is open on Saturday" is stronger
 * than any complaint mined out of a review, because it is checkable and it
 * converts directly into an action.
 *
 * Rule enforced downstream: a `position_option` with an empty `gap_ids` is
 * rejected. No gap, no option. If nothing here fires, the app tells the user
 * there is no defensible open position rather than inventing three.
 */

import type { Attribute } from './attributes';

// ---------------------------------------------------------------------------
// Input shapes — a trimmed view of what Google Places (New) returns.
// ---------------------------------------------------------------------------

export interface TimePoint {
  /** 0 = Sunday ... 6 = Saturday */
  day: number;
  hour: number;
  minute: number;
}

export interface OpeningPeriod {
  open: TimePoint;
  /** Absent means the place is open 24 hours from `open`. */
  close?: TimePoint;
}

export interface OpeningHours {
  periods?: OpeningPeriod[];
  weekdayDescriptions?: string[];
}

export type PriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export interface SiteExtract {
  title?: string | null;
  description?: string | null;
  h1?: string | null;
  h2?: string | null;
}

export interface CompetitorView {
  id: string;
  name: string;
  types: string[];
  priceLevel?: PriceLevel | number | null;
  website?: string | null;
  openingHours?: OpeningHours | null;
  siteExtract?: SiteExtract | null;
  isChain: boolean;
  distanceM: number;
}

export interface SelfView extends CompetitorView {
  categorySlug: string;
  serviceRadiusM: number;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type GapKind = 'HOURS' | 'SERVICE_TYPE' | 'PRICE_BAND' | 'DIGITAL' | 'SPEED';

export interface StructuralGap {
  /** Stable within a cycle; used as `gap_ids` on position_options. */
  id: string;
  kind: GapKind;
  /** One verifiable sentence, en-US, ready to render. */
  statement: string;
  /** The numbers behind the sentence, so the UI can show the receipts. */
  coverage: Record<string, number | string>;
  /** Which of the eight attributes this gap opens. */
  attribute: Attribute;
  /** 0..100. Higher = emptier and more actionable. */
  strength: number;
}

// ---------------------------------------------------------------------------
// Category registry: which sub-types are worth checking for absence.
// Extend as categories are added. Keys are `category_slug`.
// ---------------------------------------------------------------------------

const CATEGORY_SUBTYPES: Record<string, { type: string; label: string }[]> = {
  dentist: [
    { type: 'pediatric_dentist', label: 'a pediatric dentist' },
    { type: 'orthodontist', label: 'an orthodontist' },
    { type: 'endodontist', label: 'an endodontist' },
    { type: 'periodontist', label: 'a periodontist' },
  ],
  plumber: [{ type: 'plumber', label: 'a plumber' }],
  veterinary_care: [
    { type: 'emergency_veterinarian_service', label: 'an emergency vet' },
  ],
  physiotherapist: [{ type: 'chiropractor', label: 'a chiropractor' }],
  hair_salon: [{ type: 'barber_shop', label: 'a barber shop' }],
};

const EMERGENCY_PATTERNS =
  /\b(24[\s/-]?7|24 hour|24hr|emergency|same[\s-]day|around the clock|anytime|after hours)\b/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_SET = 6; // below this the set is too small for coverage claims

function priceToBand(p: CompetitorView['priceLevel']): number | null {
  if (p === null || p === undefined) return null;
  if (typeof p === 'number') return p >= 0 && p <= 4 ? p : null;
  const map: Record<PriceLevel, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[p] ?? null;
}

function hasPublishedHours(c: CompetitorView): boolean {
  return !!c.openingHours?.periods?.length;
}

function opensOnDay(c: CompetitorView, day: number): boolean {
  return (c.openingHours?.periods ?? []).some((p) => p.open.day === day);
}

/** Any period that is still open at or after `hour` on a weekday (Mon-Fri). */
function opensLateWeekday(c: CompetitorView, hour = 18): boolean {
  return (c.openingHours?.periods ?? []).some((p) => {
    const d = p.open.day;
    if (d === 0 || d === 6) return false;
    if (!p.close) return true; // no close = 24h
    // close.day !== open.day means it runs past midnight
    if (p.close.day !== d) return true;
    return p.close.hour >= hour;
  });
}

function isTwentyFourHour(c: CompetitorView): boolean {
  const periods = c.openingHours?.periods ?? [];
  return periods.length > 0 && periods.some((p) => !p.close);
}

function siteText(c: CompetitorView): string {
  const s = c.siteExtract;
  return [c.name, s?.title, s?.description, s?.h1, s?.h2]
    .filter(Boolean)
    .join(' ');
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function miles(m: number): string {
  const mi = m / 1609.34;
  return mi < 10 ? mi.toFixed(1) : String(Math.round(mi));
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * `slug` discriminates gaps of the same kind and attribute — without it,
 * the Saturday and Sunday HOURS gaps would collide on the same id and one
 * would silently overwrite the other in the position_options anchoring.
 */
function gap(
  kind: GapKind,
  attribute: Attribute,
  slug: string,
  statement: string,
  coverage: Record<string, number | string>,
  strength: number,
): StructuralGap {
  return {
    id: `${kind}:${attribute}:${slugify(slug)}`,
    kind,
    attribute,
    statement,
    coverage,
    strength: Math.max(0, Math.min(100, Math.round(strength))),
  };
}

// ---------------------------------------------------------------------------
// detectGaps
// ---------------------------------------------------------------------------

export function detectGaps(
  competitors: CompetitorView[],
  self: SelfView,
): StructuralGap[] {
  const gaps: StructuralGap[] = [];
  const n = competitors.length;
  if (n < MIN_SET) return gaps; // not enough of a set to claim coverage

  const radius = miles(self.serviceRadiusM);
  const withHours = competitors.filter(hasPublishedHours);
  const hoursN = withHours.length;

  // ---- HOURS -------------------------------------------------------------
  // Only claim an hours gap when most of the set actually publishes hours,
  // otherwise absence of data looks like absence of coverage.
  if (hoursN >= Math.max(MIN_SET, Math.ceil(n * 0.6))) {
    const checks: {
      test: (c: CompetitorView) => boolean;
      label: string;
      attribute: Attribute;
    }[] = [
      { test: (c) => opensOnDay(c, 6), label: 'open on Saturday', attribute: 'convenience' },
      { test: (c) => opensOnDay(c, 0), label: 'open on Sunday', attribute: 'convenience' },
      { test: (c) => opensLateWeekday(c, 18), label: 'open past 6pm on a weekday', attribute: 'convenience' },
      { test: isTwentyFourHour, label: 'open 24 hours', attribute: 'speed' },
    ];

    for (const { test, label, attribute } of checks) {
      const covering = withHours.filter(test).length;
      const share = covering / hoursN;
      if (share > 0.25) continue; // well covered, not a gap

      const statement =
        covering === 0
          ? `None of the ${hoursN} ${self.categorySlug.replace(/_/g, ' ')} businesses within ${radius} miles that publish hours is ${label}.`
          : `Only ${covering} of the ${hoursN} businesses within ${radius} miles that publish hours are ${label}.`;

      gaps.push(
        gap('HOURS', attribute, label, statement, { covering, of: hoursN, radiusMiles: radius, label }, 100 - share * 200),
      );
    }
  }

  // ---- SERVICE_TYPE ------------------------------------------------------
  const subtypes = CATEGORY_SUBTYPES[self.categorySlug] ?? [];
  for (const { type, label } of subtypes) {
    if (self.types.includes(type)) continue; // the customer already is one
    const occupants = competitors.filter((c) => c.types.includes(type)).length;
    if (occupants > 1) continue;

    const statement =
      occupants === 0
        ? `None of the ${n} competitors within ${radius} miles is listed as ${label}.`
        : `Only 1 of the ${n} competitors within ${radius} miles is listed as ${label}.`;

    gaps.push(
      gap('SERVICE_TYPE', 'specialization', type, statement, { occupants, of: n, type, radiusMiles: radius }, occupants === 0 ? 90 : 60),
    );
  }

  // ---- PRICE_BAND --------------------------------------------------------
  const bands = competitors
    .map((c) => priceToBand(c.priceLevel))
    .filter((b): b is number => b !== null);
  if (bands.length >= Math.max(MIN_SET, Math.ceil(n * 0.5))) {
    const hist = [0, 0, 0, 0, 0];
    for (const b of bands) hist[b]++;
    const selfBand = priceToBand(self.priceLevel);
    const names = ['free', 'budget', 'mid-market', 'upper', 'premium'];

    // Only interesting for bands adjacent to occupied ones — an empty
    // "premium" band next to a full "mid-market" band is a real opening;
    // an empty band with nothing anywhere near it is noise.
    for (let b = 1; b <= 4; b++) {
      if (hist[b] > 1) continue;
      if (b === selfBand) continue;
      const neighbours = (hist[b - 1] ?? 0) + (hist[b + 1] ?? 0);
      if (neighbours < 3) continue;

      const statement =
        hist[b] === 0
          ? `No competitor within ${radius} miles sits in the ${names[b]} price band, while ${neighbours} sit immediately next to it.`
          : `Only 1 competitor within ${radius} miles sits in the ${names[b]} price band, against ${neighbours} immediately next to it.`;

      gaps.push(
        gap('PRICE_BAND', 'price', names[b], statement, { band: names[b], occupants: hist[b], neighbours, of: bands.length }, hist[b] === 0 ? 75 : 50),
      );
    }
  }

  // ---- DIGITAL -----------------------------------------------------------
  const noSite = competitors.filter((c) => !c.website).length;
  if (pct(noSite, n) >= 35) {
    gaps.push(
      gap(
        'DIGITAL',
        'modernity',
        'no-website',
        `${noSite} of the ${n} competitors within ${radius} miles have no website at all.`,
        { noSite, of: n, percent: pct(noSite, n), radiusMiles: radius },
        Math.min(90, pct(noSite, n) + 20),
      ),
    );
  }

  const noHours = n - hoursN;
  if (pct(noHours, n) >= 35) {
    gaps.push(
      gap(
        'DIGITAL',
        'convenience',
        'no-published-hours',
        `${noHours} of the ${n} competitors within ${radius} miles do not publish their hours on Google.`,
        { noHours, of: n, percent: pct(noHours, n), radiusMiles: radius },
        Math.min(85, pct(noHours, n) + 15),
      ),
    );
  }

  // ---- SPEED -------------------------------------------------------------
  const urgent = competitors.filter((c) => EMERGENCY_PATTERNS.test(siteText(c))).length;
  if (pct(urgent, n) <= 15 && !EMERGENCY_PATTERNS.test(siteText(self))) {
    const statement =
      urgent === 0
        ? `No competitor within ${radius} miles advertises emergency or same-day service.`
        : `Only ${urgent} of the ${n} competitors within ${radius} miles advertise emergency or same-day service.`;

    gaps.push(
      gap('SPEED', 'speed', 'no-urgent-option', statement, { urgent, of: n, radiusMiles: radius }, 85 - pct(urgent, n) * 2),
    );
  }

  return gaps.sort((a, b) => b.strength - a.strength);
}

/**
 * What the UI should render. A uniform market can produce a dozen gaps and
 * a wall of them reads as noise; the strongest five carry the insight.
 * Keeps at most `perAttribute` from any single attribute so one lopsided
 * category (four missing dental specialties, say) cannot crowd out the rest.
 */
export function topGaps(gaps: StructuralGap[], limit = 5, perAttribute = 2): StructuralGap[] {
  const seen = new Map<Attribute, number>();
  const out: StructuralGap[] = [];
  for (const g of gaps) {
    const used = seen.get(g.attribute) ?? 0;
    if (used >= perAttribute) continue;
    seen.set(g.attribute, used + 1);
    out.push(g);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * Gaps that can anchor a position on the given map axes.
 * A candidate cell is only offered as a `position_option` when at least one
 * gap here matches one of its two axes.
 */
export function gapsForAxes(
  gaps: StructuralGap[],
  xAttribute: Attribute,
  yAttribute: Attribute,
): StructuralGap[] {
  return gaps.filter((g) => g.attribute === xAttribute || g.attribute === yAttribute);
}
