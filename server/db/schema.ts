import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// 個人利用のためユーザー管理なし。パスワード認証のみ。

// AIとのチャット会話セッション。
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default(''),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// conversations に紐づく個々のメッセージ（user / assistant）。
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ChatGPT・Claude・日記などのインポートファイル。ファイル名・原文・処理ステータスを一元管理する。
export const importedFiles = sqliteTable('imported_files', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  content: text('content').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'done', 'error'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ユーザーが手入力したメモ（日時＋本文）。中間記憶の生成元となる。
export const memos = sqliteTable('memos', {
  id: text('id').primaryKey(),
  memoDate: text('memo_date'),
  content: text('content').notNull(),
  status: text('status', { enum: ['pending', 'done', 'error'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// インポートファイル / チャットメッセージ / メモをAIで分析して抽出した中間記憶。
// 「何を考えていたか（what）」「感情の方向（polarity: positive|negative）」「テーマタグ（theme_tags）」
// 「理由（why）」「重要度（intensity）」を保持し、長期記憶生成の入力データとなる。
// theme_tags は固定リストの JSON 配列文字列で保存（例: '["AI","会社"]'）。
export const intermediateRecords = sqliteTable('intermediate_records', {
  id: text('id').primaryKey(),
  sourceId: text('source_id'),
  sourceType: text('source_type', { enum: ['imported_file', 'chat_message', 'memo'] }),
  date: text('date'),
  polarity: text('polarity', { enum: ['positive', 'negative'] }),
  themeTags: text('theme_tags'),
  what: text('what'),
  why: text('why'),
  intensity: integer('intensity'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// intermediateRecords の生成ログ。UNIQUE(sourceId, sourceType) で同一ソースの二重処理を防ぐ。
export const extractionLogs = sqliteTable('extraction_logs', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  sourceType: text('source_type', { enum: ['imported_file', 'chat_message', 'memo'] }).notNull(),
  intermediateRecordId: text('intermediate_record_id').references(() => intermediateRecords.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  sourceUnique: uniqueIndex('extraction_logs_source_unique').on(t.sourceId, t.sourceType),
}))

// AIが定期生成するユーザーの長期記憶（週次・月次・年次・手動・過去振り返り）。
// intermediateRecords をテーマタグ別に集約し、各テーマのポジ/ネガ要約を tag_summaries に保持する。
export const memorySnapshots = sqliteTable('memory_snapshots', {
  id: text('id').primaryKey(),
  periodType: text('period_type', { enum: ['weekly', 'monthly', 'yearly', 'manual', 'past'] }).notNull(),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  // テーマタグ別サマリ（タイムライン可視化・詳細表示の本体）。
  // JSON: [{ tag, posCount, negCount, positive, negative, shortLabel }]
  //   positive/negative = そのテーマで良かったこと/苦労したことの要約（文）
  //   shortLabel = タイムラインテーブルのセル表示用（10文字以内）
  tagSummaries: text('tag_summaries'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
