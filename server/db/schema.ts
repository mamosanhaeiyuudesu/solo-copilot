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

// インポートファイル / チャットメッセージをAIで分析して抽出した中間記憶。
// 「何を考えていたか（what）」「感情の方向（polarity）」「感情タグ（emotion_tags）」「テーマタグ（theme_tags）」
// 「理由（why）」「要約（summary）」「重要度（intensity）」を保持し、長期記憶生成の入力データとなる。
// emotion_tags / theme_tags は JSON 配列文字列で保存（例: '["不安","自己不信"]'）。
export const intermediateRecords = sqliteTable('intermediate_records', {
  id: text('id').primaryKey(),
  sourceId: text('source_id'),
  sourceType: text('source_type', { enum: ['imported_file', 'chat_message'] }),
  date: text('date'),
  polarity: text('polarity', { enum: ['positive', 'negative', 'neutral'] }),
  emotionTags: text('emotion_tags'),
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
  sourceType: text('source_type', { enum: ['imported_file', 'chat_message'] }).notNull(),
  intermediateRecordId: text('intermediate_record_id').references(() => intermediateRecords.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  sourceUnique: uniqueIndex('extraction_logs_source_unique').on(t.sourceId, t.sourceType),
}))

// AIが定期生成するユーザーの長期記憶（週次・月次・年次・手動・過去振り返り）。
// intermediateRecords を集約して「できていること・苦しんでいること・関心・推奨フォーカス」などを保持する。
export const memorySnapshots = sqliteTable('memory_snapshots', {
  id: text('id').primaryKey(),
  periodType: text('period_type', { enum: ['weekly', 'monthly', 'yearly', 'manual', 'past', 'living_profile'] }).notNull(),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  achievements: text('achievements'),
  struggles: text('struggles'),
  interests: text('interests'),
  aiSummary: text('ai_summary'),
  recommendedFocus: text('recommended_focus'),
  integratedAdvice: text('integrated_advice'),
  financeSummary: text('finance_summary'),
  healthTrend: text('health_trend'),
  // タイムライン可視化用。すべて JSON 文字列または短文。
  headline: text('headline'), // 主要イベント見出し（10〜15文字。複数の場合は JSON 配列文字列）
  topThemes: text('top_themes'), // JSON: [{theme, count}]（themeTags 集計）
  emotionSummary: text('emotion_summary'), // JSON: [{emotion, count}]（emotionTags 集計）
  polaritySummary: text('polarity_summary'), // JSON: {positive, negative, neutral}
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
