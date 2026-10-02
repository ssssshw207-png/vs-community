ALTER TABLE `profiles` ADD `nickname` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_comments_user_created` ON `comments` (`user`,`created`);