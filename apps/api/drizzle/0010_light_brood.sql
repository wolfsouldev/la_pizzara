CREATE TABLE `task_dependencies` (
	`blocking_task_id` text NOT NULL,
	`blocked_task_id` text NOT NULL,
	PRIMARY KEY(`blocking_task_id`, `blocked_task_id`),
	FOREIGN KEY (`blocking_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_dependency_not_self" CHECK("task_dependencies"."blocking_task_id" != "task_dependencies"."blocked_task_id")
);
--> statement-breakpoint
CREATE INDEX `task_dependencies_blocked_idx` ON `task_dependencies` (`blocked_task_id`);--> statement-breakpoint
CREATE TABLE `task_parents` (
	`child_id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_parent_not_self" CHECK("task_parents"."child_id" != "task_parents"."parent_id")
);
--> statement-breakpoint
CREATE INDEX `task_parents_parent_idx` ON `task_parents` (`parent_id`);--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`due_in_days` integer,
	`checklist` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_template_priority_check" CHECK("task_templates"."priority" in ('LOW','NORMAL','HIGH','URGENT')),
	CONSTRAINT "task_template_due_days_check" CHECK("task_templates"."due_in_days" is null or ("task_templates"."due_in_days" >= 0 and "task_templates"."due_in_days" <= 3650))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_templates_board_name_unique` ON `task_templates` (`board_id`,`name_key`);