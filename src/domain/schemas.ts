import { z } from 'zod';

import { ATTRIBUTES } from './attributes';

/**
 * LLM output contracts — PLANO.md section 7.2. Kept close to the source
 * text; the one deliberate addition is `.min(1)` on every `evidence` array,
 * which is the invariant from the briefing: a score without evidence must
 * never reach the database.
 */

const Score = z.number().int().min(0).max(100);

const Evidence = z.object({
  source: z.enum([
    'DESCRIPTION',
    'GOOGLE_ATTRIBUTE',
    'GOOGLE_HOURS',
    'GOOGLE_RATING',
    'WEBSITE',
    'OWN_REVIEW',
    'INFERENCE',
  ]),
  quote: z.string().max(300),
  url: z.string().nullable(),
});

const ScoreBlock = z.object({
  value: Score,
  confidence: z.number().min(0).max(1),
  evidence: z.array(Evidence).min(1), // sem evidência, o score não existe
});

const EightScores = z.object(
  Object.fromEntries(ATTRIBUTES.map((a) => [a, ScoreBlock])) as Record<
    (typeof ATTRIBUTES)[number],
    typeof ScoreBlock
  >,
);

export const ClassificationSchema = z.object({
  category_slug: z.string(),
  category_label: z.string(), // en-US
  declared_benefit: z.string().max(200),
  primary_attribute: z.enum(ATTRIBUTES),
  search_keywords: z.array(z.string()).min(2).max(6),
  google_included_types: z.array(z.string()).max(4),
  suggested_radius_miles: z.number(),
});

export const CompetitorScoringSchema = z.object({
  results: z.array(
    z.object({
      place_id: z.string(),
      declared_benefit: z.string().max(200),
      primary_attribute: z.enum(ATTRIBUTES),
      scores: EightScores,
    }),
  ),
});

export const AxesSchema = z.object({
  x_attribute: z.enum(ATTRIBUTES),
  y_attribute: z.enum(ATTRIBUTES),
  x_label_low: z.string().max(40),
  x_label_high: z.string().max(40),
  y_label_low: z.string().max(40),
  y_label_high: z.string().max(40),
  rationale: z.string().max(400),
});

export const DiagnosisSchema = z.object({
  market_analysis: z.object({
    segments: z
      .array(
        z.object({
          name: z.string(),
          share_estimate: z.number(),
          needs: z.array(z.string()),
          price_sensitivity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
          evidence: z.array(Evidence),
        }),
      )
      .min(2)
      .max(4),
    target_segment: z.string(),
    target_profile: z.object({
      who: z.string(),
      jobs_to_be_done: z.array(z.string()),
      triggers: z.array(z.string()),
      objections: z.array(z.string()),
    }),
    rationale: z.string(),
  }),
  internal_analysis: z.object({
    strengths: z.array(
      z.object({ attribute: z.enum(ATTRIBUTES), statement: z.string(), evidence: z.array(Evidence) }),
    ),
    weaknesses: z.array(
      z.object({ attribute: z.enum(ATTRIBUTES), statement: z.string(), evidence: z.array(Evidence) }),
    ),
    capacity_score: z.object(
      Object.fromEntries(ATTRIBUTES.map((a) => [a, Score])) as Record<(typeof ATTRIBUTES)[number], typeof Score>,
    ),
  }),
  desired_positioning: z.object({
    statement: z.string().max(180),
    target_scores: z.object(
      Object.fromEntries(ATTRIBUTES.map((a) => [a, Score])) as Record<(typeof ATTRIBUTES)[number], typeof Score>,
    ),
    primary_axis: z.enum(ATTRIBUTES),
    secondary_axis: z.enum(ATTRIBUTES),
    proof_points: z.array(z.string()).min(2).max(5),
  }),
});

export const PositionOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        title: z.string().max(60),
        statement: z.string().max(200),
        target_scores: z.object(
          Object.fromEntries(ATTRIBUTES.map((a) => [a, Score])) as Record<
            (typeof ATTRIBUTES)[number],
            typeof Score
          >,
        ),
        why_now: z.string(),
        gap_ids: z.array(z.string()).min(1), // referencia structural_gaps — obrigatório
        demand_evidence: z.array(Evidence).min(1),
        risks: z.array(z.string()).min(1),
        feasibility_rationale: z.string(),
      }),
    )
    .length(3),
});

const P = z.enum(['product', 'price', 'place', 'promotion', 'people', 'process', 'physical_evidence']);
const MIX_KEYS = ['product', 'price', 'place', 'promotion', 'people', 'process', 'physical_evidence'] as const;

export const PlanSchema = z.object({
  marketing_mix: z.object(
    Object.fromEntries(
      MIX_KEYS.map((k) => [k, z.object({ direction: z.string(), changes: z.array(z.string()) })]),
    ) as Record<(typeof MIX_KEYS)[number], z.ZodObject<{ direction: z.ZodString; changes: z.ZodArray<z.ZodString> }>>,
  ),
  actions: z
    .array(
      z.object({
        quarter: z.number().int().min(1).max(4),
        p: P,
        title: z.string().max(80),
        description: z.string().max(600),
        target_attribute: z.enum(ATTRIBUTES),
        effort: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        cost_band: z.enum(['NO_COST', 'UNDER_500', 'UNDER_2000', 'OVER_2000']),
        kpi: z.string(),
        kpi_target: z.string(),
      }),
    )
    .min(10)
    .max(16),
});
