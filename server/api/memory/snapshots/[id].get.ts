import { eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { memorySnapshots } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'IDが必要です' })

  const snapshot = await db
    .select()
    .from(memorySnapshots)
    .where(eq(memorySnapshots.id, id))
    .get()

  if (!snapshot) throw createError({ statusCode: 404, statusMessage: 'スナップショットが見つかりません' })

  return snapshot
})
