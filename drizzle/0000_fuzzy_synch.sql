CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`day` text NOT NULL,
	`choice` integer NOT NULL,
	`country` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`parent` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_comments_day_created` ON `comments` (`day`,`created`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`user` text NOT NULL,
	`comment` text NOT NULL,
	`kind` text NOT NULL,
	PRIMARY KEY(`user`, `comment`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`user` text NOT NULL,
	`day` text NOT NULL,
	`choice` integer NOT NULL,
	`country` text NOT NULL,
	`reflection` text,
	`created` text NOT NULL,
	PRIMARY KEY(`user`, `day`)
);
--> statement-breakpoint
CREATE INDEX `idx_votes_day_country` ON `votes` (`day`,`country`);