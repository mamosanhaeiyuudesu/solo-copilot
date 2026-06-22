import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { messages, intermediateRecords, extractionLogs } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'ids は必須です' })
  }

  const db = getDb(event)

  // 中間データの ID を収集（sourceId 経由 + extractionLogs 経由）
  const intermediateIds = new Set<string>()

  const bySource = await db.select({ id: intermediateRecords.id })
    .from(intermediateRecords)
    .where(and(
      eq(intermediateRecords.sourceType, 'chat_message'),
      inArray(intermediateRecords.sourceId, body.ids),
    ))
  bySource.forEach(r => intermediateIds.add(r.id))

  const logs = await db.select({ intermediateRecordId: extractionLogs.intermediateRecordId })
    .from(extractionLogs)
    .where(and(
      eq(extractionLogs.sourceType, 'chat_message'),
      inArray(extractionLogs.sourceId, body.ids),
    ))
  logs.forEach(l => { if (l.intermediateRecordId) intermediateIds.add(l.intermediateRecordId) })

  if (intermediateIds.size > 0) {
    await db.delete(intermediateRecords).where(inArray(intermediateRecords.id, [...intermediateIds]))
  }

  await db.delete(extractionLogs).where(and(
    eq(extractionLogs.sourceType, 'chat_message'),
    inArray(extractionLogs.sourceId, body.ids),
  ))

  await db.delete(messages).where(and(
    eq(messages.conversationId, conversationId),
    inArray(messages.id, body.ids),
  ))

  return { deleted: body.ids.length }
})
