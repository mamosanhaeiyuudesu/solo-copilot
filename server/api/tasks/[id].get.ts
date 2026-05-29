import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tasks, tags, taskTags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')!

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) throw createError({ statusCode: 404, statusMessage: 'タスクが見つかりません' })

  const tagRows = await db
    .select({ tag: tags })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(eq(taskTags.taskId, id))
    .all()

  const today = new Date().toISOString().slice(0, 10)
  return {
    ...task,
    tags: tagRows.map((r) => r.tag),
    isOverdue: !!task.dueDate && task.dueDate < today && task.status !== 'done',
  }
})
