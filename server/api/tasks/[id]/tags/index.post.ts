import { eq, and } from 'drizzle-orm'
import { getDb } from '../../../../utils/db'
import { tasks, tags, taskTags } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const taskId = getRouterParam(event, 'id')!
  const body = await readBody(event)

  if (!body.tagId) throw createError({ statusCode: 400, statusMessage: 'tagId は必須です' })

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
  if (!task) throw createError({ statusCode: 404, statusMessage: 'タスクが見つかりません' })

  const tag = await db.select().from(tags).where(eq(tags.id, body.tagId)).get()
  if (!tag) throw createError({ statusCode: 404, statusMessage: 'タグが見つかりません' })

  const exists = await db
    .select()
    .from(taskTags)
    .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, body.tagId)))
    .get()
  if (!exists) {
    await db.insert(taskTags).values({ taskId, tagId: body.tagId })
  }

  return { success: true }
})
