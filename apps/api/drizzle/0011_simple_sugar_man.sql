PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_provider` text NOT NULL,
	`external_id` text,
	`username` text NOT NULL,
	`username_normalized` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`ad_department` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`directory_checked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" in ('USER','TECHNICIAN','ADMIN','SUPER_ADMIN')),
	CONSTRAINT "users_provider_check" CHECK("__new_users"."auth_provider" in ('local','ldap'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "auth_provider", "external_id", "username", "username_normalized", "display_name", "email", "ad_department", "role", "is_active", "last_login_at", "directory_checked_at", "created_at", "updated_at") SELECT "id", "auth_provider", "external_id", "username", "username_normalized", "display_name", "email", "ad_department", "role", "is_active", "last_login_at", "directory_checked_at", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_external_unique` ON `users` (`auth_provider`,`external_id`) WHERE "users"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`auth_provider`,`username_normalized`);--> statement-breakpoint
CREATE INDEX `users_role_active_idx` ON `users` (`role`,`is_active`);