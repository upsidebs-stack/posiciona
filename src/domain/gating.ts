import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

import { db } from '@/db';
import { competitors, structuralGaps, subscriptions } from '@/db/schema';

export type Tier = 'FREE' | 'PRO';

/**
 * PLANO.md section 9. Free until proven otherwise: no user, no active
 * subscription, or an expired period all fall through to FREE.
 */
export async function getTier(userId: string | null): Promise<Tier> {
  if (!userId) return 'FREE';
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  const active =
    !!sub &&
    ['active', 'trialing'].includes(sub.status) &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
  return active ? 'PRO' : 'FREE';
}

export type Competitor = InferSelectModel<typeof competitors>;
export type StructuralGap = InferSelectModel<typeof structuralGaps>;

export interface FullAnalysis {
  business: unknown;
  axes: unknown;
  selfScores: unknown;
  competitors: Competitor[];
  desiredPositioning: unknown;
  positionOptions: unknown[];
  structuralGaps: StructuralGap[];
  plan: unknown;
  evaluations: unknown;
}

/** What a FREE user is allowed to see about each of the 3 visible competitors. */
export type PublicCompetitor = Omit<
  Competitor,
  'businessId' | 'relevanceScore' | 'placesContentExpiresAt' | 'siteFetchedAt'
>;

function pickPublicFields(c: Competitor): PublicCompetitor {
  const { businessId, relevanceScore, placesContentExpiresAt, siteFetchedAt, ...rest } = c;
  return rest;
}

export interface FreeAnalysis {
  business: unknown;
  axes: unknown;
  selfScores: unknown;
  competitors: PublicCompetitor[];
  hiddenCompetitorCount: number;
  structuralGapCount: number;
  desiredPositioning: null;
  positionOptions: null;
  structuralGaps: null;
  plan: null;
  evaluations: null;
  locked: string[];
}

const LOCKED_FIELDS = [
  'desiredPositioning',
  'positionOptions',
  'structuralGaps',
  'plan',
  'evaluations',
  'axisSwap',
];

/**
 * PLANO.md section 9 — the paywall happens here, on the server, at
 * serialization. A FREE payload must never carry a hidden competitor or a
 * structural_gap at any depth; the free tier only ever learns the *count*.
 */
export function serializeAnalysis(full: FullAnalysis, tier: Tier): FullAnalysis | FreeAnalysis {
  if (tier === 'PRO') return full;

  const visible = [...full.competitors]
    .sort((a, b) => Number(b.rivalryScore ?? 0) - Number(a.rivalryScore ?? 0))
    .slice(0, 3)
    .map(pickPublicFields);

  return {
    business: full.business,
    axes: full.axes,
    selfScores: full.selfScores,
    competitors: visible,
    hiddenCompetitorCount: full.competitors.length - visible.length,
    structuralGapCount: full.structuralGaps.length,
    desiredPositioning: null,
    positionOptions: null,
    structuralGaps: null,
    plan: null,
    evaluations: null,
    locked: LOCKED_FIELDS,
  };
}
