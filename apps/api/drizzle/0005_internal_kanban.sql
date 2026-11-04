CREATE TABLE `board_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`is_done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "column_position_check" CHECK("board_columns"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `columns_board_id_unique` ON `board_columns` (`board_id`,`id`);--> statement-breakpoint
CREATE INDEX `columns_board_position_idx` ON `board_columns` (`board_id`,`position`);--> statement-breakpoint
CREATE TABLE `board_members` (
	`board_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`board_id`, `user_id`),
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "board_permission_check" CHECK("board_members"."permission" in ('VIEW','EDIT','MANAGE'))
);
--> statement-breakpoint
CREATE INDEX `board_members_user_idx` ON `board_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`department_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by_id` text NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `boards_department_archived_idx` ON `boards` (`department_id`,`is_archived`);--> statement-breakpoint
CREATE TABLE `task_assignees` (
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `user_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_assignees_user_idx` ON `task_assignees` (`user_id`);--> statement-breakpoint
CREATE TABLE `task_checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `checklist_task_position_idx` ON `task_checklist_items` (`task_id`,`position`);--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_comments_created_idx` ON `task_comments` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `task_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`actor_id` text,
	`event_type` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_event_check" CHECK("task_events"."event_type" in ('CREATED','UPDATED','MOVED','ARCHIVED','ASSIGNEE_ADDED','ASSIGNEE_REMOVED','COMMENT_ADDED','CHECKLIST_CHANGED'))
);
--> statement-breakpoint
CREATE INDEX `task_events_created_idx` ON `task_events` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`column_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`position` integer NOT NULL,
	`due_at` integer,
	`created_by_id` text NOT NULL,
	`updated_by_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`column_id`) REFERENCES `board_columns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`board_id`,`column_id`) REFERENCES `board_columns`(`board_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_position_check" CHECK("tasks"."position" >= 0),
	CONSTRAINT "task_priority_check" CHECK("tasks"."priority" in ('LOW','NORMAL','HIGH','URGENT'))
);
--> statement-breakpoint
CREATE INDEX `tasks_board_archived_idx` ON `tasks` (`board_id`,`archived_at`);--> statement-breakpoint
CREATE INDEX `tasks_column_order_idx` ON `tasks` (`column_id`,`position`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_at`);