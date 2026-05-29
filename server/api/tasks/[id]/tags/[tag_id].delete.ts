import { eq, and } from 'drizzle-orm'
import { getDb } from '../../../../utils/db'
import { taskTags } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const taskId = getRouterParam(event, 'id')!
  const tagId = getRouterParam(event, 'tag_id')!

  await db
    .delete(taskTags)
    .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))

  return { success: true }
})
