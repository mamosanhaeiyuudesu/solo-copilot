import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { getClaudeClient } from '../../../utils/claude'
import { tasks, tags, taskTags, intermediateRecords, extractionLogs } from '../../../db/schema'
import { extractIntermediateItems } from '../../../utils/extraction'

const EXTRACTION_THRESHOLD = 10

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
  }
  else if (task.status === 'done') {
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

  // DONEになったとき、未処理DONEタスクが閾値以上なら自動抽出
  if (body.status === 'done') {
    const doneTasks = await db.select({ id: tasks.id, title: tasks.title, description: tasks.description, completedAt: tasks.completedAt, estimatedHours: tasks.estimatedHours, actualHours: tasks.actualHours })
      .from(tasks)
      .where(eq(tasks.status, 'done'))
      .all()

    const doneIds = doneTasks.map(t => t.id)
    if (doneIds.length > 0) {
      const processedLogs = await db.select({ sourceId: extractionLogs.sourceId })
        .from(extractionLogs)
        .where(and(
          eq(extractionLogs.sourceType, 'task'),
          inArray(extractionLogs.sourceId, doneIds),
        ))
        .all()

      const processedIds = new Set(processedLogs.map(l => l.sourceId))
      const unprocessed = doneTasks.filter(t => !processedIds.has(t.id))

      if (unprocessed.length >= EXTRACTION_THRESHOLD) {
        const content = unprocessed.map((t) => {
          const lines = [`## ${t.title}`]
          if (t.description) lines.push(`内容: ${t.description}`)
          if (t.completedAt) lines.push(`完了日: ${t.completedAt.slice(0, 10)}`)
          if (t.estimatedHours != null) lines.push(`予定工数: ${t.estimatedHours}h`)
          if (t.actualHours != null) lines.push(`実績工数: ${t.actualHours}h`)
          return lines.join('\n')
        }).join('\n\n')

        try {
          const claude = getClaudeClient(event)
          const items = await extractIntermediateItems(claude, content)

          let firstRecordId: string | null = null
          for (const item of items) {
            const recordId = crypto.randomUUID()
            if (!firstRecordId) firstRecordId = recordId
            await db.insert(intermediateRecords).values({
              id: recordId,
              sourceId: unprocessed[0]!.id,
              sourceType: 'task',
              date: item.date ?? null,
              polarity: item.polarity,
              emotionTags: JSON.stringify(item.emotion_tags),
              themeTags: JSON.stringify(item.theme_tags),
              what: item.what,
              why: item.why ?? null,
              summary: item.summary,
              intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
            })
          }

          for (const t of unprocessed) {
            await db.insert(extractionLogs).values({
              id: crypto.randomUUID(),
              sourceId: t.id,
              sourceType: 'task',
              intermediateRecordId: firstRecordId,
            })
          }
        }
        catch {
          // 抽出失敗はタスク更新の成否に影響させない
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  return {
    ...updated,
    tags: tagRows.map(r => r.tag),
    isOverdue: !!updated!.dueDate && updated!.dueDate < today && updated!.status !== 'done',
  }
})
