import { inArray } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { intermediateRecords } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'ids は必須です' })
  }

  const db = getDb(event)
  await db.delete(intermediateRecords).where(inArray(intermediateRecords.id, body.ids))

  return { deleted: body.ids.length }
})
