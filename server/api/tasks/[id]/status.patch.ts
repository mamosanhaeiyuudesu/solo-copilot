import { eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { tasks, tags, taskTags } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const validStatuses = ['todo', 'doing', 'done']
  if (!validStatuses.includes(body.status))
    throw createError({ statusCode: 400, statusMessage: 'ステータスは todo / doing / done のいずれかです' })

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) throw createError({ statusCode: 404, statusMessage: 'タスクが見つかりません' })

  const updates: Partial<typeof task> = {
    status: body.status,
    updatedAt: new Date().toISOString(),
  }

  if (body.status === 'done') {
    updates.completedAt = body.completedAt ?? new Date().toISOString()
    updates.actualHours = body.actualHours ?? null
  } else if (task.status === 'done') {
    updates.completedAt = null
    updates.actualHours = null
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, id))

  const updated = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  const tagRows = await db
    .select({ tag: tags })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(eq(taskTags.taskId, id))
    .all()

  const today = new Date().toISOString().slice(0, 10)
  return {
    ...updated,
    tags: tagRows.map((r) => r.tag),
    isOverdue: !!updated!.dueDate && updated!.dueDate < today && updated!.status !== 'done',
  }
})
