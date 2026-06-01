import { desc } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { importedFiles } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const files = await db
    .select()
    .from(importedFiles)
    .orderBy(desc(importedFiles.createdAt))
    .all()

  return { files }
})
