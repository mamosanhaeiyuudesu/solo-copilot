import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tasks, tags, taskTags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const body = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'タイトルは必須です' })
  if (body.title.length > 200) throw createError({ statusCode: 400, statusMessage: 'タイトルは200文字以内です' })
  if (body.priority !== undefined && (body.priority < 1 || body.priority > 5))
    throw createError({ statusCode: 400, statusMessage: '優先度は1〜5の整数です' })
  if (body.estimatedHours !== undefined && body.estimatedHours < 0)
    throw createError({ statusCode: 400, statusMessage: '見積工数は0以上の数値です' })

  const id = crypto.randomUUID()
  await db.insert(tasks).values({
    id,
    title: body.title.trim(),
    description: body.description ?? null,
    status: body.status ?? 'todo',
    priority: body.priority ?? 3,
    dueDate: body.dueDate ?? null,
    estimatedHours: body.estimatedHours ?? null,
  })

  if (body.tagIds?.length) {
    await db.insert(taskTags).values(
      body.tagIds.map((tagId: string) => ({ taskId: id, tagId }))
    )
  }

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
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
    isOverdue: !!task!.dueDate && task!.dueDate < today && task!.status !== 'done',
  }
})
