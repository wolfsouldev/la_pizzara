CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`public_description` text,
	`internal_notes` text,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`visibility` text NOT NULL,
	`request_id` text,
	`created_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`cancelled_at` integer,
	FOREIGN KEY (`request_id`) REFERENCES `calendar_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "calendar_event_slot" CHECK("calendar_events"."end_at" > "calendar_events"."start_at"),
	CONSTRAINT "calendar_event_type" CHECK("calendar_events"."type" = 'VIDEOCONFERENCE'),
	CONSTRAINT "calendar_event_visibility" CHECK("calendar_events"."visibility" in ('PRIVATE', 'PUBLIC') and ("calendar_events"."request_id" is null or "calendar_events"."visibility" = 'PUBLIC'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_request_id_unique` ON `calendar_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `calendar_events_active_slot_idx` ON `calendar_events` (`start_at`,`end_at`) WHERE "calendar_events"."cancelled_at" is null;--> statement-breakpoint
CREATE TABLE `calendar_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`title` text NOT NULL,
	`purpose` text NOT NULL,
	`attendees` integer NOT NULL,
	`notes` text,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`decision_note` text,
	`decided_at` integer,
	`decided_by_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "calendar_request_slot" CHECK("calendar_requests"."end_at" > "calendar_requests"."start_at"),
	CONSTRAINT "calendar_request_attendees" CHECK("calendar_requests"."attendees" between 1 and 10000),
	CONSTRAINT "calendar_request_status" CHECK("calendar_requests"."status" in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'))
);
--> statement-breakpoint
CREATE INDEX `calendar_requests_owner_idx` ON `calendar_requests` (`requester_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `calendar_requests_queue_idx` ON `calendar_requests` (`status`,`created_at`);