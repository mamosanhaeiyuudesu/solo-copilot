import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { memos, intermediateRecords, extractionLogs } from '../../db/schema'
import { getClaudeClient } from '../../utils/claude'
import { extractIntermediateItems } from '../../utils/extraction'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ memoDate?: string; content: string }>(event)
  if (!body?.content?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'content は必須です' })
  }

  const db = getDb(event)
  const claude = getClaudeClient(event)
  const id = crypto.randomUUID()

  await db.insert(memos).values({
    id,
    memoDate: body.memoDate ?? null,
    content: body.content.trim(),
    status: 'pending',
  })

  try {
    const contextualContent = body.memoDate
      ? `[参考期間: ${body.memoDate}]\n---\n${body.content.trim()}`
      : body.content.trim()

    const items = await extractIntermediateItems(claude, contextualContent)

    let firstRecordId: string | null = null
    for (const item of items) {
      const recordId = crypto.randomUUID()
      if (!firstRecordId) firstRecordId = recordId

      await db.insert(intermediateRecords).values({
        id: recordId,
        sourceId: id,
        sourceType: 'memo',
        date: item.date ?? body.memoDate ?? null,
        polarity: item.polarity,
        themeTags: JSON.stringify(item.theme_tags),
        what: item.what,
        why: item.why ?? null,
        intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
      })
    }

    await db.insert(extractionLogs).values({
      id: crypto.randomUUID(),
      sourceId: id,
      sourceType: 'memo',
      intermediateRecordId: firstRecordId,
    }).onConflictDoNothing()

    await db.update(memos).set({ status: 'done' }).where(eq(memos.id, id))

    return { id, extracted: items.length }
  }
  catch {
    await db.update(memos).set({ status: 'error' }).where(eq(memos.id, id))
    return { id, extracted: 0 }
  }
})
