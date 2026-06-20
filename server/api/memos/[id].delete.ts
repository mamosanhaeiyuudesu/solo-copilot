import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { memos, intermediateRecords, extractionLogs } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id は必須です' })

  const db = getDb(event)

  await db.delete(intermediateRecords).where(eq(intermediateRecords.sourceId, id))
  await db.delete(extractionLogs).where(eq(extractionLogs.sourceId, id))
  await db.delete(memos).where(eq(memos.id, id))

  return { deleted: id }
})
