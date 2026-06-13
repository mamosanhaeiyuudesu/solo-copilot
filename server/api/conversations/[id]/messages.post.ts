import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { getClaudeClient } from '../../../utils/claude'
import { conversations, messages, intermediateRecords, extractionLogs } from '../../../db/schema'
import { extractIntermediateItems } from '../../../utils/extraction'

const EXTRACTION_THRESHOLD = 10

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{ role: 'user' | 'assistant'; content: string }>(event)
  if (!body?.role || typeof body?.content !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'role and content are required' })
  }

  const db = getDb(event)

  const msgId = crypto.randomUUID()
  await db.insert(messages).values({
    id: msgId,
    conversationId,
    role: body.role,
    content: body.content,
  })

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.update(conversations)
    .set({ updatedAt: now })
    .where(eq(conversations.id, conversationId))

  // アシスタントメッセージ保存後に未処理数をチェックして自動抽出
  let extracted = 0
  if (body.role === 'assistant') {
    const allMsgs = await db.select({ id: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .all()

    const allIds = allMsgs.map(m => m.id)
    if (allIds.length > 0) {
      const processedLogs = await db.select({ sourceId: extractionLogs.sourceId })
        .from(extractionLogs)
        .where(and(
          eq(extractionLogs.sourceType, 'chat_message'),
          inArray(extractionLogs.sourceId, allIds),
        ))
        .all()

      const processedIds = new Set(processedLogs.map(l => l.sourceId))
      const unprocessedIds = allIds.filter(id => !processedIds.has(id))

      if (unprocessedIds.length >= EXTRACTION_THRESHOLD) {
        const unprocessedMsgs = await db.select()
          .from(messages)
          .where(and(
            eq(messages.conversationId, conversationId),
            inArray(messages.id, unprocessedIds),
          ))
          .orderBy(asc(messages.createdAt))
          .all()

        const content = unprocessedMsgs
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n\n')

        try {
          const claude = getClaudeClient(event)
          const items = await extractIntermediateItems(claude, content)

          let firstRecordId: string | null = null
          for (const item of items) {
            const id = crypto.randomUUID()
            if (!firstRecordId) firstRecordId = id
            await db.insert(intermediateRecords).values({
              id,
              sourceId: unprocessedMsgs[0]!.id,
              sourceType: 'chat_message',
              date: item.date ?? null,
              polarity: item.polarity,
              tag: item.tag,
              what: item.what,
              intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
            })
          }

          for (const msg of unprocessedMsgs) {
            await db.insert(extractionLogs).values({
              id: crypto.randomUUID(),
              sourceId: msg.id,
              sourceType: 'chat_message',
              intermediateRecordId: firstRecordId,
            })
          }

          extracted = items.length
        }
        catch {
          // 抽出失敗はメッセージ保存の成否に影響させない
        }
      }
    }
  }

  return { id: msgId, extracted }
})
