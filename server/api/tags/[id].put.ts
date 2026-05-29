import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const tag = await db.select().from(tags).where(eq(tags.id, id)).get()
  if (!tag) throw createError({ statusCode: 404, statusMessage: 'タグが見つかりません' })

  const updates: Partial<typeof tag> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description
  if (body.color !== undefined) updates.color = body.color

  await db.update(tags).set(updates).where(eq(tags.id, id))
  return db.select().from(tags).where(eq(tags.id, id)).get()
})
