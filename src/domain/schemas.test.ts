import { describe, expect, it } from 'vitest';

import { ATTRIBUTES } from './attributes';
import {
  AxesSchema,
  ClassificationSchema,
  CompetitorScoringSchema,
  PositionOptionsSchema,
} from './schemas';

function eightScores() {
  return Object.fromEntries(
    ATTRIBUTES.map((a) => [
      a,
      { value: 50, confidence: 0.7, evidence: [{ source: 'GOOGLE_HOURS', quote: 'Mon-Fri 8-5', url: null }] },
    ]),
  );
}

describe('ClassificationSchema', () => {
  it('accepts a well-formed classification', () => {
    const result = ClassificationSchema.safeParse({
      category_slug: 'dentist',
      category_label: 'Dentist',
      declared_benefit: 'Gentle, modern dentistry for anxious patients',
      primary_attribute: 'relationship',
      search_keywords: ['dentist', 'family dentist'],
      google_included_types: ['dentist'],
      suggested_radius_miles: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an attribute outside the fixed eight', () => {
    const result = ClassificationSchema.safeParse({
      category_slug: 'dentist',
      category_label: 'Dentist',
      declared_benefit: 'x',
      primary_attribute: 'trustworthiness', // not one of the 8
      search_keywords: ['dentist', 'family dentist'],
      google_included_types: ['dentist'],
      suggested_radius_miles: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe('CompetitorScoringSchema', () => {
  it('accepts a scored competitor with evidence on every attribute', () => {
    const result = CompetitorScoringSchema.safeParse({
      results: [
        {
          place_id: 'abc123',
          declared_benefit: 'Family-owned since 1990',
          primary_attribute: 'relationship',
          scores: eightScores(),
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a score with an empty evidence array — the invariant from the briefing', () => {
    const scores = eightScores();
    scores.price.evidence = [];
    const result = CompetitorScoringSchema.safeParse({
      results: [{ place_id: 'abc123', declared_benefit: 'x', primary_attribute: 'price', scores }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a score value outside 0..100', () => {
    const scores = eightScores();
    scores.reliability.value = 140;
    const result = CompetitorScoringSchema.safeParse({
      results: [{ place_id: 'abc123', declared_benefit: 'x', primary_attribute: 'reliability', scores }],
    });
    expect(result.success).toBe(false);
  });
});

describe('AxesSchema', () => {
  it('accepts two distinct attributes with short labels', () => {
    const result = AxesSchema.safeParse({
      x_attribute: 'price',
      y_attribute: 'convenience',
      x_label_low: 'Budget',
      x_label_high: 'Premium',
      y_label_low: 'Hard to reach',
      y_label_high: 'Easy to reach',
      rationale: 'These two attributes separate the set the most.',
    });
    expect(result.success).toBe(true);
  });
});

describe('PositionOptionsSchema', () => {
  it('requires exactly three options, each anchored to at least one gap', () => {
    const option = {
      title: 'Weekend-first',
      statement: 'Be the practice open when everyone else is closed.',
      target_scores: Object.fromEntries(ATTRIBUTES.map((a) => [a, 60])),
      why_now: 'No competitor within 5 miles opens Saturday.',
      gap_ids: ['HOURS:convenience:open-on-saturday'],
      demand_evidence: [{ source: 'GOOGLE_HOURS', quote: 'none open Saturday', url: null }],
      risks: ['Staffing weekends costs more'],
      feasibility_rationale: 'Requires only a schedule change.',
    };

    expect(PositionOptionsSchema.safeParse({ options: [option, option, option] }).success).toBe(true);
    expect(PositionOptionsSchema.safeParse({ options: [option, option] }).success).toBe(false);
  });

  it('rejects an option with no gap_ids — no gap, no option', () => {
    const option = {
      title: 'Weekend-first',
      statement: 'Be the practice open when everyone else is closed.',
      target_scores: Object.fromEntries(ATTRIBUTES.map((a) => [a, 60])),
      why_now: 'No competitor within 5 miles opens Saturday.',
      gap_ids: [],
      demand_evidence: [{ source: 'GOOGLE_HOURS', quote: 'none open Saturday', url: null }],
      risks: ['Staffing weekends costs more'],
      feasibility_rationale: 'Requires only a schedule change.',
    };
    expect(PositionOptionsSchema.safeParse({ options: [option, option, option] }).success).toBe(false);
  });
});
