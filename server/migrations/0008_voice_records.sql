CREATE TABLE `voice_records` (
	`id` text PRIMARY KEY NOT NULL,
	`transcript` text NOT NULL,
	`duration` integer,
	`extraction_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
