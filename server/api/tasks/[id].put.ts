import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tasks, tags, taskTags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) throw createError({ statusCode: 404, statusMessage: 'タスクが見つかりません' })

  if (body.title !== undefined) {
    if (!body.title.trim()) throw createError({ statusCode: 400, statusMessage: 'タイトルは必須です' })
    if (body.title.length > 200) throw createError({ statusCode: 400, statusMessage: 'タイトルは200文字以内です' })
  }
  if (body.priority !== undefined && (body.priority < 1 || body.priority > 5))
    throw createError({ statusCode: 400, statusMessage: '優先度は1〜5の整数です' })
  if (body.estimatedHours !== undefined && body.estimatedHours < 0)
    throw createError({ statusCode: 400, statusMessage: '見積工数は0以上の数値です' })

  const updates: Partial<typeof task> = {
    updatedAt: new Date().toISOString(),
  }
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate
  if (body.estimatedHours !== undefined) updates.estimatedHours = body.estimatedHours

  await db.update(tasks).set(updates).where(eq(tasks.id, id))

  if (body.tagIds !== undefined) {
    await db.delete(taskTags).where(eq(taskTags.taskId, id))
    if (body.tagIds.length) {
      await db.insert(taskTags).values(
        body.tagIds.map((tagId: string) => ({ taskId: id, tagId }))
      )
    }
  }

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
