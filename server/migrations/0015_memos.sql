CREATE TABLE `memos` (
  `id` text PRIMARY KEY NOT NULL,
  `memo_date` text,
  `content` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
