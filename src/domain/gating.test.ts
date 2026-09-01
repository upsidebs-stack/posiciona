import { describe, expect, it } from 'vitest';

import type { Competitor, FullAnalysis, StructuralGap } from './gating';
import { serializeAnalysis } from './gating';

function competitor(i: number, opts: { name: string; rivalryScore: number }): Competitor {
  return {
    id: `competitor-${i}`,
    businessId: 'business-1',
    googlePlaceId: `place-${i}`,
    name: opts.name,
    formattedAddress: `${i} Main St`,
    lat: 40 + i * 0.001,
    lng: -73 - i * 0.001,
    distanceM: 1000 + i,
    primaryType: 'dentist',
    types: ['dentist'],
    rating: '4.5',
    ratingsTotal: 10 + i,
    priceLevel: 2,
    website: `https://competitor-${i}.example`,
    openingHours: null,
    siteExtract: null,
    siteFetchedAt: null,
    isChain: i % 5 === 0,
    declaredBenefit: `Benefit statement for competitor ${i}`,
    primaryAttribute: 'price',
    relevanceScore: '50.00',
    rivalryScore: String(opts.rivalryScore),
    isFreeVisible: false,
    placesContentExpiresAt: null,
    createdAt: new Date(),
  };
}

function gap(i: number): StructuralGap {
  return {
    id: `gap-${i}`,
    cycleId: 'cycle-1',
    kind: 'HOURS',
    statement: `SECRET_GAP_STATEMENT_${i}: none of the competitors is open past 6pm`,
    coverage: { covering: 0, of: 20 },
    attribute: 'convenience',
    strength: '80',
  };
}

/** Deterministic synthetic analysis #i — varies shape, not just values. */
function synthesize(i: number): FullAnalysis {
  const competitorCount = i % 31; // 0..30, including the empty-set edge case
  const gapCount = i % 11; // 0..10, including zero gaps

  const pad = (n: number) => String(n).padStart(3, '0');
  const competitorList = Array.from({ length: competitorCount }, (_, k) =>
    competitor(k, { name: `HIDDEN_COMPETITOR_NAME_${pad(i)}_${pad(k)}_END`, rivalryScore: (k * 7919) % 100 }),
  );
  const gaps = Array.from({ length: gapCount }, (_, k) => gap(k + i * 100));

  return {
    business: { id: `business-${i}`, name: `Business ${i}` },
    axes: { xAttribute: 'price', yAttribute: 'convenience' },
    selfScores: { price: { value: 50, confidence: 0.8, evidence: [] } },
    competitors: competitorList,
    desiredPositioning: { statement: `SECRET_POSITIONING_${i}` },
    positionOptions: [{ title: `SECRET_OPTION_${i}` }],
    structuralGaps: gaps,
    plan: { actions: [{ title: `SECRET_ACTION_${i}` }] },
    evaluations: { verdict: 'CONTINUE' },
  };
}

describe('serializeAnalysis — paywall fuzz (PLANO.md section 9)', () => {
  it('PRO always gets the full object back, untouched', () => {
    const full = synthesize(3);
    expect(serializeAnalysis(full, 'PRO')).toBe(full);
  });

  it('FREE never leaks a hidden competitor, a gap statement, or any locked field, across 200 synthetic analyses', () => {
    for (let i = 0; i < 200; i++) {
      const full = synthesize(i);
      const free = serializeAnalysis(full, 'FREE');
      const serialized = JSON.stringify(free);

      // No locked section survives at all.
      expect(free).toMatchObject({
        desiredPositioning: null,
        positionOptions: null,
        structuralGaps: null,
        plan: null,
        evaluations: null,
      });
      expect(serialized).not.toContain('SECRET_POSITIONING');
      expect(serialized).not.toContain('SECRET_OPTION');
      expect(serialized).not.toContain('SECRET_ACTION');
      expect(serialized).not.toContain('SECRET_GAP_STATEMENT');

      // At most 3 competitors ever named, and never one outside the top 3
      // by rivalryScore.
      const visibleNames = full.competitors
        .slice()
        .sort((a, b) => Number(b.rivalryScore ?? 0) - Number(a.rivalryScore ?? 0))
        .slice(0, 3)
        .map((c) => c.name);
      const hiddenNames = full.competitors.map((c) => c.name).filter((n) => !visibleNames.includes(n));
      for (const hiddenName of hiddenNames) {
        expect(serialized).not.toContain(hiddenName);
      }

      // The count is public; the content behind it is not.
      expect('structuralGapCount' in free && free.structuralGapCount).toBe(full.structuralGaps.length);
      expect(
        'hiddenCompetitorCount' in free &&
          free.hiddenCompetitorCount === Math.max(0, full.competitors.length - 3),
      ).toBe(true);
    }
  });

  it('never returns more than 3 competitors for FREE, even with zero or one competitor total', () => {
    for (const count of [0, 1, 2, 3, 4]) {
      const full = synthesize(count); // synthesize(0..4) gives competitorCount === count
      const free = serializeAnalysis(full, 'FREE');
      if ('competitors' in free) {
        expect(free.competitors.length).toBeLessThanOrEqual(3);
        expect(free.competitors.length).toBeLessThanOrEqual(full.competitors.length);
      }
    }
  });
});
