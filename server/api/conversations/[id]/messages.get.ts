import { asc, eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { messages } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const db = getDb(event)

  const rows = await db.select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .all()

  return rows.map(r => ({
    id: r.id,
    role: r.role,
    content: r.content,
    timestamp: r.createdAt,
  }))
})
