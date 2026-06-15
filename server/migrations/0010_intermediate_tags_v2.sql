ALTER TABLE `intermediate_records` ADD COLUMN `emotion_tags` text;--> statement-breakpoint
ALTER TABLE `intermediate_records` ADD COLUMN `theme_tags` text;--> statement-breakpoint
ALTER TABLE `intermediate_records` ADD COLUMN `why` text;--> statement-breakpoint
ALTER TABLE `intermediate_records` ADD COLUMN `summary` text;--> statement-breakpoint
ALTER TABLE `intermediate_records` DROP COLUMN `tag`;
