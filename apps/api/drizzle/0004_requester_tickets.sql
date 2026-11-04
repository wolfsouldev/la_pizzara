CREATE TABLE `ticket_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`visibility` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "comment_visibility_check" CHECK("ticket_comments"."visibility" in ('PUBLIC','INTERNAL'))
);
--> statement-breakpoint
CREATE INDEX `ticket_comments_visibility_created_idx` ON `ticket_comments` (`ticket_id`,`visibility`,`created_at`);--> statement-breakpoint
CREATE TABLE `ticket_counters` (
	`key` text PRIMARY KEY NOT NULL,
	`next_value` integer NOT NULL,
	CONSTRAINT "counter_positive" CHECK("ticket_counters"."next_value" >= 1)
);
--> statement-breakpoint
CREATE TABLE `ticket_events` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`actor_id` text,
	`event_type` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_event_type_check" CHECK("ticket_events"."event_type" in ('CREATED','ASSIGNED','REASSIGNED','STATUS_CHANGED','PRIORITY_CHANGED','COMMENT_ADDED','RESOLVED','REOPENED','CLOSED'))
);
--> statement-breakpoint
CREATE INDEX `ticket_events_ticket_created_idx` ON `ticket_events` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`requester_id` text NOT NULL,
	`department_id` text NOT NULL,
	`category_id` text NOT NULL,
	`assigned_to_id` text,
	`status` text NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`assigned_at` integer,
	`resolved_at` integer,
	`closed_at` integer,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `ticket_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_status_check" CHECK("tickets"."status" in ('OPEN','ASSIGNED','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')),
	CONSTRAINT "ticket_priority_check" CHECK("tickets"."priority" in ('LOW','NORMAL','HIGH','URGENT')),
	CONSTRAINT "ticket_number_positive" CHECK("tickets"."ticket_number" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_number_unique` ON `tickets` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `tickets_requester_created_idx` ON `tickets` (`requester_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_department_status_idx` ON `tickets` (`department_id`,`status`);--> statement-breakpoint
CREATE INDEX `tickets_assignee_status_idx` ON `tickets` (`assigned_to_id`,`status`);--> statement-breakpoint
CREATE INDEX `tickets_category_idx` ON `tickets` (`category_id`);--> statement-breakpoint
CREATE INDEX `tickets_priority_idx` ON `tickets` (`priority`);--> statement-breakpoint
CREATE INDEX `tickets_created_idx` ON `tickets` (`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);