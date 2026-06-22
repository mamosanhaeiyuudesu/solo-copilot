import { asc, desc, eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { messages } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : undefined

  const db = getDb(event)

  const rows = limit
    ? (await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(desc(messages.createdAt)).limit(limit)).reverse()
    : await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt))

  return rows.map(r => ({
    id: r.id,
    role: r.role,
    content: r.content,
    timestamp: r.createdAt,
  }))
})
