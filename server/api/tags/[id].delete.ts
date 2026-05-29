import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')!

  const tag = await db.select().from(tags).where(eq(tags.id, id)).get()
  if (!tag) throw createError({ statusCode: 404, statusMessage: 'タグが見つかりません' })

  await db.delete(tags).where(eq(tags.id, id))
  return { success: true }
})
