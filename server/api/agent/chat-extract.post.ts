import { and, eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { intermediateRecords, extractionLogs } from '../../db/schema'
import { getClaudeClient } from '../../utils/claude'
import { extractIntermediateItems } from '../../utils/extraction'

type ChatMessageInput = { id: string; content: string; timestamp?: string }

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: ChatMessageInput[] }>(event)
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'messages は必須です' })
  }

  const db = getDb(event)
  const claude = getClaudeClient(event)

  const result = { processed: 0, skipped: 0, total: body.messages.length }

  const unprocessed: ChatMessageInput[] = []

  for (const msg of body.messages) {
    const existing = await db
      .select()
      .from(extractionLogs)
      .where(
        and(
          eq(extractionLogs.sourceId, msg.id),
          eq(extractionLogs.sourceType, 'chat_message'),
        ),
      )
      .get()

    if (existing) {
      result.skipped++
    }
    else {
      unprocessed.push(msg)
    }
  }

  if (unprocessed.length === 0) {
    return result
  }

  const combinedContent = unprocessed.map(m => m.content).join('\n\n')

  const items = await extractIntermediateItems(claude, combinedContent)

  let firstRecordId: string | null = null

  for (const item of items) {
    const id = crypto.randomUUID()
    if (!firstRecordId) firstRecordId = id

    await db.insert(intermediateRecords).values({
      id,
      sourceId: unprocessed[0]!.id,
      sourceType: 'chat_message',
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

  for (const msg of unprocessed) {
    await db.insert(extractionLogs).values({
      id: crypto.randomUUID(),
      sourceId: msg.id,
      sourceType: 'chat_message',
      intermediateRecordId: firstRecordId,
    })
  }

  result.processed = unprocessed.length

  return result
})
