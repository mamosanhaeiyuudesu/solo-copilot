import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { importedFiles, intermediateRecords, extractionLogs } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'ids は必須です' })
  }

  const db = getDb(event)

  await db.delete(intermediateRecords).where(and(
    eq(intermediateRecords.sourceType, 'imported_file'),
    inArray(intermediateRecords.sourceId, body.ids),
  ))

  await db.delete(extractionLogs).where(and(
    eq(extractionLogs.sourceType, 'imported_file'),
    inArray(extractionLogs.sourceId, body.ids),
  ))

  await db.delete(importedFiles).where(inArray(importedFiles.id, body.ids))

  return { deleted: body.ids.length }
})
