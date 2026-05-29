import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const body = await readBody(event)

  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'タグ名は必須です' })

  const id = crypto.randomUUID()
  await db.insert(tags).values({
    id,
    name: body.name.trim(),
    description: body.description ?? null,
    color: body.color ?? null,
  })

  return db.select().from(tags).where(eq(tags.id, id)).get()
})
