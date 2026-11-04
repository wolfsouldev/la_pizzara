CREATE TABLE `ticket_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`department_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_department_slug_unique` ON `ticket_categories` (`department_id`,`slug`);--> statement-breakpoint
CREATE INDEX `categories_department_active_idx` ON `ticket_categories` (`department_id`,`is_active`);