import { desc } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { conversations } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)

  const latest = await db.select({ id: conversations.id })
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .limit(1)
    .get()

  if (latest) return { id: latest.id }

  const id = crypto.randomUUID()
  await db.insert(conversations).values({ id, title: '' })
  return { id }
})
