import { describe, expect, it } from 'vitest';

import { emptyScores } from './attributes';
import {
  attrDistance,
  bubbleMass,
  densityGrid,
  relevance,
  rivalry,
} from './positioning';

describe('attrDistance', () => {
  it('is zero for identical score vectors', () => {
    expect(attrDistance(emptyScores(50), emptyScores(50))).toBe(0);
  });

  it('is symmetric', () => {
    const a = emptyScores(20);
    const b = { ...emptyScores(80), price: 10 };
    expect(attrDistance(a, b)).toBeCloseTo(attrDistance(b, a));
  });

  it('weighs a heavier attribute more', () => {
    const a = emptyScores(0);
    const b = emptyScores(0);
    b.price = 100;
    b.speed = 100;

    const unweighted = attrDistance(a, b);
    const priceWeighted = attrDistance(a, b, { price: 5 });
    // Same two attributes differ by 100 either way, but weighting one of
    // them more should pull the aggregate distance up.
    expect(priceWeighted).toBeGreaterThan(unweighted);
  });

  it('stays within 0..100 for maximally opposite vectors', () => {
    const d = attrDistance(emptyScores(0), emptyScores(100));
    expect(d).toBeCloseTo(100);
  });
});

describe('densityGrid', () => {
  it('returns a 20x20 grid of all zeros for no points', () => {
    const grid = densityGrid([]);
    expect(grid.length).toBe(20);
    expect(grid[0].length).toBe(20);
    expect(grid.every((row) => row.every((v) => v === 0))).toBe(true);
  });

  it('peaks near a single point and decays with distance', () => {
    const grid = densityGrid([{ x: 50, y: 50, mass: 10 }]);
    const centerCell = grid[9][9]; // cell centered near (47.5, 47.5)
    const cornerCell = grid[0][0]; // cell centered near (2.5, 2.5)
    expect(centerCell).toBeGreaterThan(cornerCell);
  });

  it('is additive across overlapping points', () => {
    const one = densityGrid([{ x: 50, y: 50, mass: 5 }]);
    const two = densityGrid([
      { x: 50, y: 50, mass: 5 },
      { x: 50, y: 50, mass: 5 },
    ]);
    expect(two[9][9]).toBeCloseTo(one[9][9] * 2);
  });
});

describe('bubbleMass', () => {
  it('is smaller for a chain than an independent with the same review count', () => {
    expect(bubbleMass(500, true)).toBeLessThan(bubbleMass(500, false));
  });

  it('is zero for zero reviews', () => {
    expect(bubbleMass(0, false)).toBe(0);
  });
});

describe('relevance', () => {
  it('scores a close, exact-match, reviewed, complete listing near the top', () => {
    const score = relevance({
      distanceM: 100,
      serviceRadiusM: 8047,
      categoryMatch: 'EXACT',
      ratingsTotal: 500,
      ratingsTotalInSet: [0, 50, 500],
      hasWebsite: true,
      hasPublishedHours: true,
    });
    expect(score).toBeGreaterThan(0.8);
  });

  it('scores a far, keyword-only, unreviewed, incomplete listing near the bottom', () => {
    const score = relevance({
      distanceM: 8000,
      serviceRadiusM: 8047,
      categoryMatch: 'KEYWORD_ONLY',
      ratingsTotal: 0,
      ratingsTotalInSet: [0, 50, 500],
      hasWebsite: false,
      hasPublishedHours: false,
    });
    expect(score).toBeLessThan(0.2);
  });

  it('does not blow up when every candidate has the same review count', () => {
    const score = relevance({
      distanceM: 100,
      serviceRadiusM: 8047,
      categoryMatch: 'EXACT',
      ratingsTotal: 10,
      ratingsTotalInSet: [10],
      hasWebsite: true,
      hasPublishedHours: true,
    });
    expect(Number.isFinite(score)).toBe(true);
  });

  it('clamps proximity for a candidate outside the service radius instead of going negative', () => {
    const score = relevance({
      distanceM: 50000,
      serviceRadiusM: 8047,
      categoryMatch: 'RELATED',
      ratingsTotal: 5,
      ratingsTotalInSet: [5],
      hasWebsite: false,
      hasPublishedHours: false,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('rivalry', () => {
  it('weighs proximity more heavily for STOREFRONT than SERVICE_AREA', () => {
    // Very close (proximity ~1) but positionally dissimilar (closeness ~0):
    // STOREFRONT leans on proximity more, SERVICE_AREA leans on positional
    // closeness more, so the two weightings should land visibly apart.
    const base = {
      distanceM: 50,
      serviceRadiusM: 8047,
      attrDistance: 95,
      ratingsTotal: 20,
      ratingsTotalInSet: [20],
      isChain: false,
    };
    const storefront = rivalry({ ...base, businessType: 'STOREFRONT' });
    const serviceArea = rivalry({ ...base, businessType: 'SERVICE_AREA' });
    expect(storefront).toBeGreaterThan(serviceArea);
  });

  it('penalizes chains', () => {
    const base = {
      businessType: 'STOREFRONT' as const,
      distanceM: 1000,
      serviceRadiusM: 8047,
      attrDistance: 20,
      ratingsTotal: 100,
      ratingsTotalInSet: [100],
    };
    expect(rivalry({ ...base, isChain: true })).toBeLessThan(rivalry({ ...base, isChain: false }));
  });

  it('never goes negative even for a distant, dissimilar chain', () => {
    const score = rivalry({
      businessType: 'STOREFRONT',
      distanceM: 50000,
      serviceRadiusM: 8047,
      attrDistance: 100,
      ratingsTotal: 0,
      ratingsTotalInSet: [0],
      isChain: true,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('scores a close, positionally identical independent business highest', () => {
    const base = {
      businessType: 'STOREFRONT' as const,
      serviceRadiusM: 8047,
      ratingsTotal: 50,
      ratingsTotalInSet: [50],
      isChain: false,
    };
    const near = rivalry({ ...base, distanceM: 200, attrDistance: 5 });
    const far = rivalry({ ...base, distanceM: 7000, attrDistance: 80 });
    expect(near).toBeGreaterThan(far);
  });
});
