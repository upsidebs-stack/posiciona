import { describe, expect, it } from 'vitest';

import type { Attribute } from './attributes';
import {
  type CompetitorView,
  type OpeningPeriod,
  type SelfView,
  detectGaps,
  gapsForAxes,
  topGaps,
} from './gaps';

const FIVE_MILES_M = 8047;

function weekdayHours(closeHour = 17): OpeningPeriod[] {
  // Mon(1)-Fri(5), 8am to `closeHour`.
  return [1, 2, 3, 4, 5].map((day) => ({
    open: { day, hour: 8, minute: 0 },
    close: { day, hour: closeHour, minute: 0 },
  }));
}

function competitor(overrides: Partial<CompetitorView> & { id: string }): CompetitorView {
  return {
    name: overrides.id,
    types: ['dentist'],
    priceLevel: 2,
    website: 'https://example.com',
    openingHours: { periods: weekdayHours() },
    siteExtract: null,
    isChain: false,
    distanceM: 1000,
    ...overrides,
  };
}

function self(overrides: Partial<SelfView> = {}): SelfView {
  return {
    id: 'self',
    name: 'My Practice',
    types: ['dentist'],
    priceLevel: 2,
    website: 'https://mypractice.com',
    openingHours: { periods: weekdayHours() },
    siteExtract: null,
    isChain: false,
    distanceM: 0,
    categorySlug: 'dentist',
    serviceRadiusM: FIVE_MILES_M,
    ...overrides,
  };
}

function many(n: number, build: (i: number) => Partial<CompetitorView> & { id: string }): CompetitorView[] {
  return Array.from({ length: n }, (_, i) => competitor(build(i)));
}

function attrsOf(gaps: { attribute: Attribute }[]): Attribute[] {
  return gaps.map((g) => g.attribute);
}

describe('detectGaps — set size guard', () => {
  it('returns no gaps when the competitive set is smaller than MIN_SET', () => {
    // Every competitor here is closed all weekend, which would otherwise
    // read as a screaming HOURS gap — the point is that a 5-business set is
    // too small to claim "none of the N competitors" credibly.
    const competitors = many(5, (i) => ({ id: `c${i}` }));
    expect(detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }))).toEqual([]);
  });
});

describe('detectGaps — HOURS', () => {
  it('flags a uniform market that is closed evenings, weekends, and never 24h', () => {
    const competitors = many(20, (i) => ({ id: `c${i}` }));
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));

    const hoursGaps = gaps.filter((g) => g.kind === 'HOURS');
    const statements = hoursGaps.map((g) => g.statement);
    expect(statements.some((s) => /Saturday/.test(s))).toBe(true);
    expect(statements.some((s) => /Sunday/.test(s))).toBe(true);
    expect(statements.some((s) => /past 6pm/.test(s))).toBe(true);
    expect(statements.some((s) => /24 hours/.test(s))).toBe(true);
    // Every HOURS statement should carry the actual count, not a vague claim.
    for (const g of hoursGaps) {
      expect(g.coverage.of).toBe(20);
      expect(g.coverage.covering).toBe(0);
    }
  });

  it('does not flag Saturday when most of the set already opens Saturday', () => {
    const openSaturday = (id: string): Partial<CompetitorView> & { id: string } => ({
      id,
      openingHours: {
        periods: [...weekdayHours(), { open: { day: 6, hour: 9, minute: 0 }, close: { day: 6, hour: 13, minute: 0 } }],
      },
    });
    const competitors = [
      ...many(15, (i) => openSaturday(`sat${i}`)),
      ...many(5, (i) => ({ id: `closed${i}` })),
    ];
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));
    const hoursGaps = gaps.filter((g) => g.kind === 'HOURS');

    expect(hoursGaps.some((g) => /Saturday/.test(g.statement))).toBe(false);
    // Sunday is still uncovered by everyone, so that gap should survive.
    expect(hoursGaps.some((g) => /Sunday/.test(g.statement))).toBe(true);
  });

  it('skips HOURS entirely when most competitors do not publish hours at all', () => {
    const competitors = [
      ...many(3, (i) => ({ id: `hours${i}` })),
      ...many(7, (i) => ({ id: `nohours${i}`, openingHours: null })),
    ];
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));
    expect(gaps.some((g) => g.kind === 'HOURS')).toBe(false);
  });
});

describe('detectGaps — SERVICE_TYPE', () => {
  it('flags a subtype with zero or one occupant', () => {
    const competitors = many(10, (i) => ({ id: `c${i}`, types: ['dentist'] }));
    const gaps = detectGaps(competitors, self());
    const serviceTypeGaps = gaps.filter((g) => g.kind === 'SERVICE_TYPE');

    // None of the 10 generalists is any of the four dentist subtypes.
    expect(serviceTypeGaps.length).toBe(4);
    expect(attrsOf(serviceTypeGaps)).toEqual(serviceTypeGaps.map(() => 'specialization'));
  });

  it('does not flag a subtype with two or more occupants', () => {
    const competitors = [
      ...many(2, (i) => ({ id: `ortho${i}`, types: ['dentist', 'orthodontist'] })),
      ...many(8, (i) => ({ id: `c${i}`, types: ['dentist'] })),
    ];
    const gaps = detectGaps(competitors, self());
    const serviceTypeGaps = gaps.filter((g) => g.kind === 'SERVICE_TYPE');

    expect(serviceTypeGaps.some((g) => g.id.includes('orthodontist'))).toBe(false);
    // The other three subtypes are still open.
    expect(serviceTypeGaps.length).toBe(3);
  });

  it('never flags a subtype the business itself already is', () => {
    const competitors = many(10, (i) => ({ id: `c${i}`, types: ['dentist'] }));
    const gaps = detectGaps(
      competitors,
      self({ types: ['dentist', 'pediatric_dentist'] }),
    );
    const serviceTypeGaps = gaps.filter((g) => g.kind === 'SERVICE_TYPE');
    expect(serviceTypeGaps.some((g) => g.id.includes('pediatric_dentist'))).toBe(false);
  });
});

describe('detectGaps — PRICE_BAND', () => {
  it('flags an empty band sitting next to a full one', () => {
    // 20 competitors, all mid-market (band 2). Self is also band 2, so it's
    // skipped; budget (1) and upper (3) are both empty and adjacent.
    const competitors = many(20, (i) => ({ id: `c${i}`, priceLevel: 2 }));
    const gaps = detectGaps(competitors, self({ priceLevel: 2 }));
    const priceGaps = gaps.filter((g) => g.kind === 'PRICE_BAND');

    expect(priceGaps.map((g) => g.coverage.band).sort()).toEqual(['budget', 'upper']);
    for (const g of priceGaps) expect(g.attribute).toBe('price');
  });

  it('ignores an empty band with nothing occupied nearby', () => {
    // Everyone is premium (band 4); budget (band 1) is empty but isolated —
    // its only neighbour (band 0, "free") is never checked, band 2 is empty too.
    const competitors = many(20, (i) => ({ id: `c${i}`, priceLevel: 4 }));
    const gaps = detectGaps(competitors, self({ priceLevel: 3 }));
    const priceGaps = gaps.filter((g) => g.kind === 'PRICE_BAND');
    expect(priceGaps.some((g) => g.coverage.band === 'budget')).toBe(false);
  });
});

describe('detectGaps — DIGITAL', () => {
  it('flags a market where a third or more have no website', () => {
    const competitors = [
      ...many(4, (i) => ({ id: `nosite${i}`, website: null })),
      ...many(6, (i) => ({ id: `site${i}` })),
    ];
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));
    expect(gaps.some((g) => g.kind === 'DIGITAL' && g.attribute === 'modernity')).toBe(true);
  });

  it('flags a market where a third or more publish no hours', () => {
    const competitors = [
      ...many(4, (i) => ({ id: `nohours${i}`, openingHours: null })),
      ...many(6, (i) => ({ id: `hours${i}` })),
    ];
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));
    expect(
      gaps.some((g) => g.kind === 'DIGITAL' && g.attribute === 'convenience'),
    ).toBe(true);
  });
});

describe('detectGaps — SPEED', () => {
  it('flags a market with no emergency or same-day signal', () => {
    const competitors = many(10, (i) => ({ id: `c${i}`, name: `Practice ${i}` }));
    const gaps = detectGaps(competitors, self());
    expect(gaps.some((g) => g.kind === 'SPEED')).toBe(true);
  });

  it('does not flag speed once the business itself advertises urgency', () => {
    const competitors = many(10, (i) => ({ id: `c${i}`, name: `Practice ${i}` }));
    const gaps = detectGaps(
      competitors,
      self({ siteExtract: { title: '24/7 Emergency Dental Care' } }),
    );
    expect(gaps.some((g) => g.kind === 'SPEED')).toBe(false);
  });

  it('does not flag speed once enough competitors already advertise it', () => {
    const competitors = [
      ...many(3, (i) => ({ id: `urgent${i}`, siteExtract: { title: 'Same-day emergency visits' } })),
      ...many(7, (i) => ({ id: `c${i}` })),
    ];
    const gaps = detectGaps(competitors, self());
    expect(gaps.some((g) => g.kind === 'SPEED')).toBe(false);
  });
});

describe('topGaps', () => {
  it('caps the total and the count per attribute', () => {
    const competitors = many(10, (i) => ({ id: `c${i}`, types: ['dentist'] }));
    const gaps = detectGaps(competitors, self());
    const top = topGaps(gaps, 5, 2);

    expect(top.length).toBeLessThanOrEqual(5);
    const perAttribute = new Map<Attribute, number>();
    for (const g of top) perAttribute.set(g.attribute, (perAttribute.get(g.attribute) ?? 0) + 1);
    for (const count of perAttribute.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it('keeps the strongest gaps first', () => {
    const competitors = many(20, (i) => ({ id: `c${i}` }));
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));
    const top = topGaps(gaps, 3, 3);
    const strengths = top.map((g) => g.strength);
    expect(strengths).toEqual([...strengths].sort((a, b) => b - a));
  });
});

describe('gapsForAxes', () => {
  it('keeps only gaps matching one of the two axis attributes', () => {
    const competitors = many(20, (i) => ({ id: `c${i}` }));
    const gaps = detectGaps(competitors, self({ categorySlug: 'plumber', types: ['plumber'] }));
    const filtered = gapsForAxes(gaps, 'convenience', 'speed');

    expect(filtered.length).toBeGreaterThan(0);
    for (const g of filtered) expect(['convenience', 'speed']).toContain(g.attribute);
  });
});
