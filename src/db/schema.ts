import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// citext — case-insensitive text, used for email. Requires the citext
// extension (see src/db/migrations/0000_extensions.sql).
const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

// =============================================================================
// Accounts and subscription — PLANO.md section 5
// =============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: citext('email').notNull().unique(),
  name: text('name'),
  timezone: text('timezone').notNull().default('America/New_York'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  // Not in PLANO.md section 5 — required by @auth/drizzle-adapter's Postgres
  // adapter contract (magic link sets emailVerified; Google OAuth sets
  // image). Logged in DECISIONS.md.
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'PADDLE' | 'LEMONSQUEEZY' | ...
    providerCustomerId: text('provider_customer_id').notNull(),
    providerSubscriptionId: text('provider_subscription_id').unique(),
    priceId: text('price_id'),
    status: text('status').notNull(), // active|trialing|past_due|canceled|paused
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subscriptions_user_id_idx').on(t.userId),
    unique('subscriptions_provider_customer_unique').on(t.provider, t.providerCustomerId),
  ],
);

// Idempotência de webhook — inserir ANTES de processar.
export const billingEvents = pgTable('billing_events', {
  id: text('id').primaryKey(), // id do evento no provedor
  provider: text('provider').notNull(),
  type: text('type').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

// =============================================================================
// Negócio
// =============================================================================

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonSessionId: text('anon_session_id'),
  name: text('name').notNull(),
  description: text('description').notNull(),
  categorySlug: text('category_slug').notNull(),
  businessType: text('business_type').notNull(), // 'STOREFRONT' | 'SERVICE_AREA'
  googlePlaceId: text('google_place_id'),
  formattedAddress: text('formatted_address'),
  stateCode: char('state_code', { length: 2 }),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  serviceRadiusM: integer('service_radius_m').notNull(),
  declaredBenefit: text('declared_benefit'),
  primaryAttribute: text('primary_attribute'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cycles = pgTable(
  'cycles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    cycleNumber: integer('cycle_number').notNull().default(1),
    stage: text('stage').notNull().default('DIAGNOSIS'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [unique('cycles_business_cycle_unique').on(t.businessId, t.cycleNumber)],
);

// =============================================================================
// DIAGNOSIS
// =============================================================================

export const marketAnalysis = pgTable('market_analysis', {
  cycleId: uuid('cycle_id')
    .primaryKey()
    .references(() => cycles.id, { onDelete: 'cascade' }),
  segments: jsonb('segments').notNull(),
  targetSegment: text('target_segment').notNull(),
  targetProfile: jsonb('target_profile').notNull(),
  rationale: text('rationale').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const internalAnalysis = pgTable('internal_analysis', {
  cycleId: uuid('cycle_id')
    .primaryKey()
    .references(() => cycles.id, { onDelete: 'cascade' }),
  strengths: jsonb('strengths').notNull(),
  weaknesses: jsonb('weaknesses').notNull(),
  // {[attribute]: 0..100} capacidade de MOVER cada atributo
  capacityScore: jsonb('capacity_score').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// =============================================================================
// Concorrentes
// =============================================================================

export const competitors = pgTable(
  'competitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    googlePlaceId: text('google_place_id').notNull(), // cacheável indefinidamente (ToS)
    name: text('name').notNull(),
    formattedAddress: text('formatted_address'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    distanceM: integer('distance_m').notNull(),
    primaryType: text('primary_type'),
    types: text('types').array(), // array completo: sinal forte de amplitude
    rating: numeric('rating', { precision: 2, scale: 1 }),
    ratingsTotal: integer('ratings_total'),
    priceLevel: integer('price_level'), // 0..4
    website: text('website'),
    openingHours: jsonb('opening_hours'), // horário por dia; base das lacunas estruturais
    siteExtract: jsonb('site_extract'), // {title, description, h1, h2} — declared benefit
    siteFetchedAt: timestamp('site_fetched_at', { withTimezone: true }),
    isChain: boolean('is_chain').notNull().default(false),
    declaredBenefit: text('declared_benefit'),
    primaryAttribute: text('primary_attribute'),
    relevanceScore: numeric('relevance_score', { precision: 5, scale: 2 }).notNull(),
    rivalryScore: numeric('rivalry_score', { precision: 5, scale: 2 }),
    isFreeVisible: boolean('is_free_visible').notNull().default(false),
    placesContentExpiresAt: timestamp('places_content_expires_at', { withTimezone: true }), // 30 dias, ToS Google
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('competitors_business_rivalry_idx').on(t.businessId, t.rivalryScore),
    unique('competitors_business_place_unique').on(t.businessId, t.googlePlaceId),
  ],
);

export const attributeScores = pgTable(
  'attribute_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'cascade' }),
    subjectType: text('subject_type').notNull(), // 'SELF' | 'COMPETITOR'
    competitorId: uuid('competitor_id').references(() => competitors.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'DESIRED' | 'OBTAINED'
    scores: jsonb('scores').notNull(),
    confidence: jsonb('confidence').notNull(),
    evidence: jsonb('evidence').notNull(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('attribute_scores_cycle_subject_kind_idx').on(t.cycleId, t.subjectType, t.kind),
    check(
      'attribute_scores_subject_competitor_check',
      sql`${t.subjectType} = 'SELF' OR ${t.competitorId} IS NOT NULL`,
    ),
  ],
);

// =============================================================================
// Posicionamento
// =============================================================================

export const desiredPositioning = pgTable('desired_positioning', {
  cycleId: uuid('cycle_id')
    .primaryKey()
    .references(() => cycles.id, { onDelete: 'cascade' }),
  statement: text('statement').notNull(),
  targetScores: jsonb('target_scores').notNull(),
  primaryAxis: text('primary_axis').notNull(),
  secondaryAxis: text('secondary_axis').notNull(),
  proofPoints: jsonb('proof_points').notNull(),
  origin: text('origin').notNull(), // 'DIAGNOSIS' | 'REPOSITION'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mapAxes = pgTable('map_axes', {
  cycleId: uuid('cycle_id')
    .primaryKey()
    .references(() => cycles.id, { onDelete: 'cascade' }),
  xAttribute: text('x_attribute').notNull(),
  yAttribute: text('y_attribute').notNull(),
  xLabelLow: text('x_label_low').notNull(),
  xLabelHigh: text('x_label_high').notNull(),
  yLabelLow: text('y_label_low').notNull(),
  yLabelHigh: text('y_label_high').notNull(),
  rationale: text('rationale').notNull(),
});

// Lacunas estruturais detectadas — base objetiva das posições alternativas.
export const structuralGaps = pgTable('structural_gaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => cycles.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // HOURS|SERVICE_TYPE|PRICE_BAND|DIGITAL|SPEED
  statement: text('statement').notNull(), // "None of the 23 competitors is open past 5pm"
  coverage: jsonb('coverage').notNull(), // números que sustentam a afirmação
  attribute: text('attribute').notNull(), // qual dos 8 atributos ela abre
  strength: numeric('strength', { precision: 5, scale: 2 }).notNull(),
});

export const positionOptions = pgTable(
  'position_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull(),
    title: text('title').notNull(),
    statement: text('statement').notNull(),
    targetScores: jsonb('target_scores').notNull(),
    attractiveness: numeric('attractiveness', { precision: 5, scale: 2 }).notNull(),
    feasibility: numeric('feasibility', { precision: 5, scale: 2 }).notNull(),
    demandEvidence: jsonb('demand_evidence').notNull(), // referencia structural_gaps e/ou temas de review
    risks: jsonb('risks').notNull(),
  },
  (t) => [unique('position_options_cycle_rank_unique').on(t.cycleId, t.rank)],
);

// =============================================================================
// 7 Ps + plano (PAGO)
// =============================================================================

export const marketingMix = pgTable('marketing_mix', {
  cycleId: uuid('cycle_id')
    .primaryKey()
    .references(() => cycles.id, { onDelete: 'cascade' }),
  product: jsonb('product').notNull(),
  price: jsonb('price').notNull(),
  place: jsonb('place').notNull(),
  promotion: jsonb('promotion').notNull(),
  people: jsonb('people').notNull(),
  process: jsonb('process').notNull(),
  physicalEvidence: jsonb('physical_evidence').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const planActions = pgTable(
  'plan_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'cascade' }),
    quarter: integer('quarter').notNull(),
    p: text('p').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    targetAttribute: text('target_attribute').notNull(),
    effort: text('effort').notNull(), // LOW|MEDIUM|HIGH
    costBand: text('cost_band').notNull(), // NO_COST|UNDER_500|UNDER_2000|OVER_2000 (USD)
    kpi: text('kpi').notNull(),
    kpiTarget: text('kpi_target').notNull(),
    status: text('status').notNull().default('PENDING'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('plan_actions_cycle_quarter_idx').on(t.cycleId, t.quarter),
    check('plan_actions_quarter_check', sql`${t.quarter} BETWEEN 1 AND 4`),
  ],
);

// =============================================================================
// Reviews (no MVP: só do próprio negócio)
// =============================================================================

export const reviewSnapshots = pgTable(
  'review_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    competitorId: uuid('competitor_id').references(() => competitors.id, { onDelete: 'cascade' }), // null = próprio negócio
    source: text('source').notNull(), // MVP: sempre 'GOOGLE'
    externalId: text('external_id').notNull(),
    rating: integer('rating'),
    textExcerpt: text('text_excerpt'), // <= 400 chars, autor anonimizado
    sourceUrl: text('source_url'),
    themes: jsonb('themes'),
    sentiment: numeric('sentiment', { precision: 3, scale: 2 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // GOOGLE = collected_at + 30d
  },
  (t) => [
    index('review_snapshots_business_collected_idx').on(t.businessId, t.collectedAt),
    index('review_snapshots_expires_idx').on(t.expiresAt),
    unique('review_snapshots_source_external_unique').on(t.source, t.externalId),
  ],
);

// Derivado, NAO expira.
export const reviewMetrics = pgTable(
  'review_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    competitorId: uuid('competitor_id').references(() => competitors.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    period: date('period').notNull(),
    rating: numeric('rating', { precision: 2, scale: 1 }),
    ratingsTotal: integer('ratings_total'),
    ratingsDelta: integer('ratings_delta'),
    themeCounts: jsonb('theme_counts'),
  },
  (t) => [
    unique('review_metrics_business_competitor_source_period_unique').on(
      t.businessId,
      t.competitorId,
      t.source,
      t.period,
    ),
  ],
);

// =============================================================================
// Avaliação periódica
// =============================================================================

export const periodicEvaluations = pgTable(
  'periodic_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => cycles.id, { onDelete: 'cascade' }),
    period: date('period').notNull(),
    gapPerAttribute: jsonb('gap_per_attribute').notNull(),
    gapScore: numeric('gap_score', { precision: 5, scale: 2 }).notNull(),
    primaryGap: numeric('primary_gap', { precision: 5, scale: 2 }).notNull(),
    trend: text('trend').notNull(), // IMPROVING|STABLE|WORSENING
    verdict: text('verdict').notNull(), // CONTINUE|REPOSITION|INSUFFICIENT_DATA
    narrative: text('narrative').notNull(),
    recommendedActions: jsonb('recommended_actions').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('periodic_evaluations_cycle_period_unique').on(t.cycleId, t.period)],
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    anonSessionId: text('anon_session_id'),
    kind: text('kind').notNull(),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    costCents: integer('cost_cents').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('usage_events_user_kind_created_idx').on(t.userId, t.kind, t.createdAt),
    index('usage_events_anon_created_idx').on(t.anonSessionId, t.createdAt),
  ],
);

// =============================================================================
// Auth.js (v5) — tabelas exigidas pelo @auth/drizzle-adapter.
// Não fazem parte do modelo de domínio da seção 5 do PLANO.md; são o
// contrato interno do Auth.js para sessão, OAuth account linking (Google) e
// o token do magic link. Registrado em DECISIONS.md.
// =============================================================================

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    // Snake_case JS property names here are required by
    // @auth/drizzle-adapter's Postgres adapter contract, not a style choice.
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
