import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tasks } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')!

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) throw createError({ statusCode: 404, statusMessage: 'タスクが見つかりません' })

  await db.delete(tasks).where(eq(tasks.id, id))
  return { success: true }
})
