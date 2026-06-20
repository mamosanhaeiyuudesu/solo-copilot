// ローカル開発用 SQLite DB の初期化（nuxt dev 時のみ動作）
// 本番ビルド（Cloudflare Workers）では import.meta.dev = false でデッドコード除去される

export default defineNitroPlugin(async () => {
  if (!import.meta.dev) return

  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { setLocalDb } = await import('../utils/db')
  const schema = await import('../db/schema')
  const {
    seedConversations,
    seedMessages,
    seedImportedFiles,
    seedIntermediateRecords,
    seedMemorySnapshots,
  } = await import('../dev/seed-data')

  const sqlite = new Database(':memory:')

  // テーブル作成
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS imported_files (
      id TEXT PRIMARY KEY NOT NULL,
      file_name TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS intermediate_records (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT,
      source_type TEXT,
      date TEXT,
      polarity TEXT,
      theme_tags TEXT,
      what TEXT,
      why TEXT,
      intensity INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS extraction_logs (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      intermediate_record_id TEXT REFERENCES intermediate_records(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_id, source_type)
    );
    CREATE TABLE IF NOT EXISTS memory_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      period_type TEXT NOT NULL,
      period_start TEXT,
      period_end TEXT,
      tag_summaries TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS memos (
      id TEXT PRIMARY KEY NOT NULL,
      memo_date TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const db = drizzle(sqlite, { schema })

  // サンプルデータを投入
  for (const row of seedConversations) {
    db.insert(schema.conversations).values(row).run()
  }
  for (const row of seedMessages) {
    db.insert(schema.messages).values(row).run()
  }
  for (const row of seedImportedFiles) {
    db.insert(schema.importedFiles).values(row).run()
  }
  for (const row of seedIntermediateRecords) {
    db.insert(schema.intermediateRecords).values(row).run()
  }
  for (const row of seedMemorySnapshots) {
    db.insert(schema.memorySnapshots).values(row).run()
  }

  setLocalDb(db)
  console.log('[local-db] ローカルSQLite初期化完了（サンプルデータ投入済み）')
})
