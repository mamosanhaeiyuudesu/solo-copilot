import { eq, and } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { voiceRecords, intermediateRecords, extractionLogs } from '../../db/schema'
import { getClaudeClient } from '../../utils/claude'
import { extractIntermediateItems } from '../../utils/extraction'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const claude = getClaudeClient(event)

  const pending = await db
    .select()
    .from(voiceRecords)
    .where(eq(voiceRecords.extractionStatus, 'pending'))
    .all()

  const result = { success: 0, error: 0, skipped: 0, total: pending.length }

  for (const record of pending) {
    const existingLog = await db
      .select()
      .from(extractionLogs)
      .where(
        and(
          eq(extractionLogs.sourceId, record.id),
          eq(extractionLogs.sourceType, 'voice_record'),
        ),
      )
      .get()

    if (existingLog) {
      result.skipped++
      continue
    }

    try {
      const items = await extractIntermediateItems(claude, record.transcript)

      let firstRecordId: string | null = null

      for (const item of items) {
        const id = crypto.randomUUID()
        if (!firstRecordId) firstRecordId = id

        await db.insert(intermediateRecords).values({
          id,
          sourceId: record.id,
          sourceType: 'voice_record',
          date: item.date ?? null,
          polarity: item.polarity,
          tag: item.tag,
          what: item.what,
          intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
        })
      }

      await db.insert(extractionLogs).values({
        id: crypto.randomUUID(),
        sourceId: record.id,
        sourceType: 'voice_record',
        intermediateRecordId: firstRecordId,
      })

      await db
        .update(voiceRecords)
        .set({ extractionStatus: 'done' })
        .where(eq(voiceRecords.id, record.id))

      result.success++
    }
    catch {
      await db
        .update(voiceRecords)
        .set({ extractionStatus: 'error' })
        .where(eq(voiceRecords.id, record.id))
      result.error++
    }
  }

  return result
})
