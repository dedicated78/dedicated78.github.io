CREATE TABLE "api_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"occurred_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"usage_date" text NOT NULL,
	"organization_id" text,
	"project_id" text,
	"user_id" text,
	"provider" text NOT NULL,
	"api_family" text,
	"endpoint" text,
	"operation" text,
	"execution_source" text DEFAULT 'app' NOT NULL,
	"correlation_id" text,
	"outcome" text NOT NULL,
	"error_code" text,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"from_cache" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"occurred_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"organization_id" text,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"result" text NOT NULL,
	"correlation_id" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "spend_controls" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"scope_id" text NOT NULL,
	"daily_limit_usd" real,
	"enabled" boolean DEFAULT true NOT NULL,
	"note" text,
	"updated_by" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_controls" ADD CONSTRAINT "spend_controls_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_usage_occurred_idx" ON "api_usage" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "api_usage_org_date_idx" ON "api_usage" USING btree ("organization_id","usage_date");--> statement-breakpoint
CREATE INDEX "api_usage_project_date_idx" ON "api_usage" USING btree ("project_id","usage_date");--> statement-breakpoint
CREATE INDEX "api_usage_provider_date_idx" ON "api_usage" USING btree ("provider","usage_date");--> statement-breakpoint
CREATE INDEX "audit_log_occurred_idx" ON "audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_org_occurred_idx" ON "audit_log" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "spend_controls_scope_idx" ON "spend_controls" USING btree ("scope","scope_id");