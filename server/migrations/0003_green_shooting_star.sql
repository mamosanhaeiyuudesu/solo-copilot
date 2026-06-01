CREATE TABLE `extraction_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_type` text NOT NULL,
	`intermediate_record_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`intermediate_record_id`) REFERENCES `intermediate_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extraction_logs_source_unique` ON `extraction_logs` (`source_id`,`source_type`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intermediate_records` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`source_type` text,
	`date` text,
	`polarity` text,
	`tag` text,
	`what` text,
	`why` text,
	`summary` text,
	`intensity` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`period_type` text NOT NULL,
	`period_start` text,
	`period_end` text,
	`achievements` text,
	`struggles` text,
	`interests` text,
	`ai_summary` text,
	`recommended_focus` text,
	`integrated_advice` text,
	`finance_summary` text,
	`health_trend` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `raw_external_data` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`file_name` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
