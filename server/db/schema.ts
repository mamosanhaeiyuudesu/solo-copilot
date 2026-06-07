import { sqliteTable, text, integer, real, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// 個人利用のためユーザー管理なし。パスワード認証のみ。

// 音声入力の文字起こし履歴。保存後にAI抽出で中間データへ変換される。
export const voiceRecords = sqliteTable('voice_records', {
  id: text('id').primaryKey(),
  transcript: text('transcript').notNull(),
  duration: integer('duration'),
  extractionStatus: text('extraction_status', { enum: ['pending', 'done', 'error'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// AIとのチャット会話セッション。将来的にAIへの相談履歴を長期記憶の入力源として使う想定。
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

// タスク管理。見積もり・実績工数を持ち、AIによる振り返り分析の入力源になる。
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'doing', 'done'] }).notNull().default('todo'),
  priority: integer('priority').notNull().default(3),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  estimatedHours: real('estimated_hours'),
  actualHours: real('actual_hours'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// タスクに付与するラベル（キャリア・健康・副業など）。中間情報の tag とは独立した管理。
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// tasks と tags の多対多中間テーブル。
export const taskTags = sqliteTable('task_tags', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.tagId] }),
}))

// ChatGPT・Claude・日記などのインポートファイル。ファイル名・原文・処理ステータスを一元管理する。
export const importedFiles = sqliteTable('imported_files', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  content: text('content').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'done', 'error'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// rawExternalData / tasks をAIで分析して抽出した中間情報。
// 「何を考えていたか（what）」「感情の方向（polarity）」「テーマ（tag）」「重要度（intensity）」を保持し、
// 長期記憶スナップショット生成の入力データとなる。
export const intermediateRecords = sqliteTable('intermediate_records', {
  id: text('id').primaryKey(),
  sourceId: text('source_id'),
  sourceType: text('source_type', { enum: ['imported_file', 'task', 'voice_record', 'chat_message'] }),
  date: text('date'),
  polarity: text('polarity', { enum: ['positive', 'negative', 'neutral'] }),
  tag: text('tag'),
  what: text('what'),
  intensity: integer('intensity'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// intermediateRecords の生成ログ。UNIQUE(sourceId, sourceType) で同一ソースの二重処理を防ぐ。
export const extractionLogs = sqliteTable('extraction_logs', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  sourceType: text('source_type', { enum: ['imported_file', 'task', 'voice_record', 'chat_message'] }).notNull(),
  intermediateRecordId: text('intermediate_record_id').references(() => intermediateRecords.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  sourceUnique: uniqueIndex('extraction_logs_source_unique').on(t.sourceId, t.sourceType),
}))

// AIが定期生成するユーザーの長期記憶スナップショット（週次・月次・年次・手動・過去振り返り）。
// intermediateRecords を集約して「できていること・苦しんでいること・関心・推奨フォーカス」などを保持する。
export const memorySnapshots = sqliteTable('memory_snapshots', {
  id: text('id').primaryKey(),
  periodType: text('period_type', { enum: ['weekly', 'monthly', 'yearly', 'manual', 'past'] }).notNull(),
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
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
