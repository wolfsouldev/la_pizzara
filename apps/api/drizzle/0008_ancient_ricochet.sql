CREATE TABLE `service_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`visibility` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `university_services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "service_note_visibility_check" CHECK("service_notes"."visibility" in ('PUBLIC','INTERNAL'))
);
--> statement-breakpoint
CREATE INDEX `service_notes_service_visibility_created_idx` ON `service_notes` (`service_id`,`visibility`,`created_at`);--> statement-breakpoint
CREATE TABLE `university_services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'UNKNOWN' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`status_updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "service_status_check" CHECK("university_services"."status" in ('OPERATIONAL','DEGRADED','OUTAGE','MAINTENANCE','UNKNOWN'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `university_services_name_unique` ON `university_services` (`name_key`);--> statement-breakpoint
CREATE INDEX `university_services_active_status_idx` ON `university_services` (`is_active`,`status`);--> statement-breakpoint
ALTER TABLE `tickets` ADD `service_id` text REFERENCES university_services(id);--> statement-breakpoint
CREATE INDEX `tickets_service_idx` ON `tickets` (`service_id`);