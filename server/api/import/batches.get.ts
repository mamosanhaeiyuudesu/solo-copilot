import { desc } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { importBatches } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const batches = await db
    .select()
    .from(importBatches)
    .orderBy(desc(importBatches.createdAt))
    .all()

  return { batches }
})
