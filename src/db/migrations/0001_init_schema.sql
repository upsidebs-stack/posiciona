CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "attribute_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"competitor_id" uuid,
	"kind" text NOT NULL,
	"scores" jsonb NOT NULL,
	"confidence" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_scores_subject_competitor_check" CHECK ("attribute_scores"."subject_type" = 'SELF' OR "attribute_scores"."competitor_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anon_session_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category_slug" text NOT NULL,
	"business_type" text NOT NULL,
	"google_place_id" text,
	"formatted_address" text,
	"state_code" char(2),
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"service_radius_m" integer NOT NULL,
	"declared_benefit" text,
	"primary_attribute" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"google_place_id" text NOT NULL,
	"name" text NOT NULL,
	"formatted_address" text,
	"lat" double precision,
	"lng" double precision,
	"distance_m" integer NOT NULL,
	"primary_type" text,
	"types" text[],
	"rating" numeric(2, 1),
	"ratings_total" integer,
	"price_level" integer,
	"website" text,
	"opening_hours" jsonb,
	"site_extract" jsonb,
	"site_fetched_at" timestamp with time zone,
	"is_chain" boolean DEFAULT false NOT NULL,
	"declared_benefit" text,
	"primary_attribute" text,
	"relevance_score" numeric(5, 2) NOT NULL,
	"rivalry_score" numeric(5, 2),
	"is_free_visible" boolean DEFAULT false NOT NULL,
	"places_content_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitors_business_place_unique" UNIQUE("business_id","google_place_id")
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"cycle_number" integer DEFAULT 1 NOT NULL,
	"stage" text DEFAULT 'DIAGNOSIS' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "cycles_business_cycle_unique" UNIQUE("business_id","cycle_number")
);
--> statement-breakpoint
CREATE TABLE "desired_positioning" (
	"cycle_id" uuid PRIMARY KEY NOT NULL,
	"statement" text NOT NULL,
	"target_scores" jsonb NOT NULL,
	"primary_axis" text NOT NULL,
	"secondary_axis" text NOT NULL,
	"proof_points" jsonb NOT NULL,
	"origin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_analysis" (
	"cycle_id" uuid PRIMARY KEY NOT NULL,
	"strengths" jsonb NOT NULL,
	"weaknesses" jsonb NOT NULL,
	"capacity_score" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_axes" (
	"cycle_id" uuid PRIMARY KEY NOT NULL,
	"x_attribute" text NOT NULL,
	"y_attribute" text NOT NULL,
	"x_label_low" text NOT NULL,
	"x_label_high" text NOT NULL,
	"y_label_low" text NOT NULL,
	"y_label_high" text NOT NULL,
	"rationale" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis" (
	"cycle_id" uuid PRIMARY KEY NOT NULL,
	"segments" jsonb NOT NULL,
	"target_segment" text NOT NULL,
	"target_profile" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_mix" (
	"cycle_id" uuid PRIMARY KEY NOT NULL,
	"product" jsonb NOT NULL,
	"price" jsonb NOT NULL,
	"place" jsonb NOT NULL,
	"promotion" jsonb NOT NULL,
	"people" jsonb NOT NULL,
	"process" jsonb NOT NULL,
	"physical_evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodic_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"period" date NOT NULL,
	"gap_per_attribute" jsonb NOT NULL,
	"gap_score" numeric(5, 2) NOT NULL,
	"primary_gap" numeric(5, 2) NOT NULL,
	"trend" text NOT NULL,
	"verdict" text NOT NULL,
	"narrative" text NOT NULL,
	"recommended_actions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "periodic_evaluations_cycle_period_unique" UNIQUE("cycle_id","period")
);
--> statement-breakpoint
CREATE TABLE "plan_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"quarter" integer NOT NULL,
	"p" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_attribute" text NOT NULL,
	"effort" text NOT NULL,
	"cost_band" text NOT NULL,
	"kpi" text NOT NULL,
	"kpi_target" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_actions_quarter_check" CHECK ("plan_actions"."quarter" BETWEEN 1 AND 4)
);
--> statement-breakpoint
CREATE TABLE "position_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"title" text NOT NULL,
	"statement" text NOT NULL,
	"target_scores" jsonb NOT NULL,
	"attractiveness" numeric(5, 2) NOT NULL,
	"feasibility" numeric(5, 2) NOT NULL,
	"demand_evidence" jsonb NOT NULL,
	"risks" jsonb NOT NULL,
	CONSTRAINT "position_options_cycle_rank_unique" UNIQUE("cycle_id","rank")
);
--> statement-breakpoint
CREATE TABLE "review_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"competitor_id" uuid,
	"source" text NOT NULL,
	"period" date NOT NULL,
	"rating" numeric(2, 1),
	"ratings_total" integer,
	"ratings_delta" integer,
	"theme_counts" jsonb,
	CONSTRAINT "review_metrics_business_competitor_source_period_unique" UNIQUE("business_id","competitor_id","source","period")
);
--> statement-breakpoint
CREATE TABLE "review_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"competitor_id" uuid,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"rating" integer,
	"text_excerpt" text,
	"source_url" text,
	"themes" jsonb,
	"sentiment" numeric(3, 2),
	"published_at" timestamp with time zone,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "review_snapshots_source_external_unique" UNIQUE("source","external_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "structural_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"statement" text NOT NULL,
	"coverage" jsonb NOT NULL,
	"attribute" text NOT NULL,
	"strength" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"provider_subscription_id" text,
	"price_id" text,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_subscription_id_unique" UNIQUE("provider_subscription_id"),
	CONSTRAINT "subscriptions_provider_customer_unique" UNIQUE("provider","provider_customer_id")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anon_session_id" text,
	"kind" text NOT NULL,
	"business_id" uuid,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"name" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deletion_requested_at" timestamp with time zone,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_scores" ADD CONSTRAINT "attribute_scores_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_scores" ADD CONSTRAINT "attribute_scores_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desired_positioning" ADD CONSTRAINT "desired_positioning_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_analysis" ADD CONSTRAINT "internal_analysis_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_axes" ADD CONSTRAINT "map_axes_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis" ADD CONSTRAINT "market_analysis_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_mix" ADD CONSTRAINT "marketing_mix_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodic_evaluations" ADD CONSTRAINT "periodic_evaluations_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_actions" ADD CONSTRAINT "plan_actions_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_options" ADD CONSTRAINT "position_options_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_metrics" ADD CONSTRAINT "review_metrics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_metrics" ADD CONSTRAINT "review_metrics_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_snapshots" ADD CONSTRAINT "review_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_snapshots" ADD CONSTRAINT "review_snapshots_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structural_gaps" ADD CONSTRAINT "structural_gaps_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attribute_scores_cycle_subject_kind_idx" ON "attribute_scores" USING btree ("cycle_id","subject_type","kind");--> statement-breakpoint
CREATE INDEX "competitors_business_rivalry_idx" ON "competitors" USING btree ("business_id","rivalry_score");--> statement-breakpoint
CREATE INDEX "plan_actions_cycle_quarter_idx" ON "plan_actions" USING btree ("cycle_id","quarter");--> statement-breakpoint
CREATE INDEX "review_snapshots_business_collected_idx" ON "review_snapshots" USING btree ("business_id","collected_at");--> statement-breakpoint
CREATE INDEX "review_snapshots_expires_idx" ON "review_snapshots" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_events_user_kind_created_idx" ON "usage_events" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_anon_created_idx" ON "usage_events" USING btree ("anon_session_id","created_at");