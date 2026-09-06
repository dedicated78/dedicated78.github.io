CREATE TABLE `api_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` text DEFAULT (current_timestamp) NOT NULL,
	`usage_date` text NOT NULL,
	`organization_id` text,
	`project_id` text,
	`user_id` text,
	`provider` text NOT NULL,
	`api_family` text,
	`endpoint` text,
	`operation` text,
	`execution_source` text DEFAULT 'app' NOT NULL,
	`correlation_id` text,
	`outcome` text NOT NULL,
	`error_code` text,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`from_cache` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `api_usage_occurred_idx` ON `api_usage` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `api_usage_org_date_idx` ON `api_usage` (`organization_id`,`usage_date`);--> statement-breakpoint
CREATE INDEX `api_usage_project_date_idx` ON `api_usage` (`project_id`,`usage_date`);--> statement-breakpoint
CREATE INDEX `api_usage_provider_date_idx` ON `api_usage` (`provider`,`usage_date`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` text DEFAULT (current_timestamp) NOT NULL,
	`actor_user_id` text,
	`actor_label` text,
	`organization_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`result` text NOT NULL,
	`correlation_id` text,
	`metadata` text,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_occurred_idx` ON `audit_log` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_log_org_occurred_idx` ON `audit_log` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE TABLE `spend_controls` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scope_id` text NOT NULL,
	`daily_limit_usd` real,
	`enabled` integer DEFAULT true NOT NULL,
	`note` text,
	`updated_by` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spend_controls_scope_idx` ON `spend_controls` (`scope`,`scope_id`);