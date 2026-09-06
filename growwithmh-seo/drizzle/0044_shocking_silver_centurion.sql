CREATE TABLE `organization_profiles` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'customer' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `platform_roles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`granted_by` text,
	`granted_at` text DEFAULT (current_timestamp) NOT NULL,
	`note` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
