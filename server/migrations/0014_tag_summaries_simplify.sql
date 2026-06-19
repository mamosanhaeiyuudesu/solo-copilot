ALTER TABLE `intermediate_records` DROP COLUMN `emotion_tags`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` ADD COLUMN `tag_summaries` text;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `achievements`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `struggles`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `interests`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `ai_summary`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `recommended_focus`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `integrated_advice`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `finance_summary`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `health_trend`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `headline`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `top_themes`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `emotion_summary`;--> statement-breakpoint
ALTER TABLE `memory_snapshots` DROP COLUMN `polarity_summary`;--> statement-breakpoint
DELETE FROM `memory_snapshots` WHERE `period_type` = 'living_profile';
