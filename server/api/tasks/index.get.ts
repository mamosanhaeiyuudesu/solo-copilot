import { eq, and, inArray } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { tasks, tags, taskTags } from '../../db/schema'

type TaskStatus = 'todo' | 'doing' | 'done'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const query = getQuery(event)

  const conditions = []
  if (query.status) conditions.push(eq(tasks.status, query.status as TaskStatus))
  if (query.priority) conditions.push(eq(tasks.priority, Number(query.priority)))

  let taskRows = await db
    .select()
    .from(tasks)
    .where(conditions.length ? and(...conditions) : undefined)
    .all()

  if (query.tag_id) {
    const taggedIds = (
      await db
        .select({ taskId: taskTags.taskId })
        .from(taskTags)
        .where(eq(taskTags.tagId, query.tag_id as string))
        .all()
    ).map((r) => r.taskId)
    taskRows = taskRows.filter((t) => taggedIds.includes(t.id))
  }

  const tagRows = await db
    .select({ taskId: taskTags.taskId, tag: tags })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .all()

  const tagsByTask: Record<string, (typeof tags.$inferSelect)[]> = {}
  for (const row of tagRows) {
    const list = tagsByTask[row.taskId]
    if (list) list.push(row.tag)
    else tagsByTask[row.taskId] = [row.tag]
  }

  const today = new Date().toISOString().slice(0, 10)

  return taskRows.map((task) => ({
    ...task,
    tags: tagsByTask[task.id] ?? [],
    isOverdue: !!task.dueDate && task.dueDate < today && task.status !== 'done',
  }))
})
