import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { getClaudeClient } from '../../../utils/claude'
import { conversations, messages, intermediateRecords, extractionLogs } from '../../../db/schema'
import { extractIntermediateItems } from '../../../utils/extraction'

const MIN_INTENSITY = 2

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

  // アシスタントメッセージ保存後に直前のペアで抽出
  let extracted = 0
  if (body.role === 'assistant') {
    const pair = (await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(2)).reverse()

    if (pair.length === 2 && pair[0]?.role === 'user' && pair[1]?.role === 'assistant') {
      const pairIds = pair.map(m => m.id)

      const alreadyLogged = await db.select()
        .from(extractionLogs)
        .where(and(
          eq(extractionLogs.sourceType, 'chat_message'),
          inArray(extractionLogs.sourceId, pairIds),
        ))

      if (alreadyLogged.length === 0) {
        const content = pair
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n\n')

        try {
          const claude = getClaudeClient(event)
          const items = await extractIntermediateItems(claude, content)
          const significant = items.filter(item => item.intensity >= MIN_INTENSITY)

          let firstRecordId: string | null = null
          for (const item of significant) {
            const id = crypto.randomUUID()
            if (!firstRecordId) firstRecordId = id
            await db.insert(intermediateRecords).values({
              id,
              sourceId: pair[1]!.id,
              sourceType: 'chat_message',
              date: item.date ?? null,
              polarity: item.polarity,
              themeTags: JSON.stringify(item.theme_tags),
              what: item.what,
              why: item.why ?? null,
              intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
            })
          }

          for (const msg of pair) {
            await db.insert(extractionLogs).values({
              id: crypto.randomUUID(),
              sourceId: msg.id,
              sourceType: 'chat_message',
              intermediateRecordId: firstRecordId,
            })
          }

          extracted = significant.length
        }
        catch {
          // 抽出失敗はメッセージ保存の成否に影響させない
        }
      }
    }
  }

  return { id: msgId, extracted }
})
