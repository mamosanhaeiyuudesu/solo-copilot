CREATE TABLE `imported_files` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `imported_files` (`id`, `file_name`, `content`, `status`, `created_at`, `updated_at`)
SELECT red.id, red.file_name, red.content, red.status, ib.created_at, ib.updated_at
FROM raw_external_data red
JOIN import_batches ib ON red.batch_id = ib.id;
--> statement-breakpoint
UPDATE `intermediate_records` SET `source_type` = 'imported_file' WHERE `source_type` = 'raw_external_data';
--> statement-breakpoint
UPDATE `extraction_logs` SET `source_type` = 'imported_file' WHERE `source_type` = 'raw_external_data';
--> statement-breakpoint
DROP TABLE `raw_external_data`;
--> statement-breakpoint
DROP TABLE `import_batches`;
