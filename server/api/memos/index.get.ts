import { desc, sql } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { memos } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)

  return db.select({
    id: memos.id,
    memoDate: memos.memoDate,
    content: memos.content,
    status: memos.status,
    createdAt: memos.createdAt,
    intermediateCount: sql<number>`(SELECT COUNT(*) FROM intermediate_records WHERE source_id = ${memos.id} AND source_type = 'memo')`,
  }).from(memos).orderBy(desc(memos.createdAt))
})
