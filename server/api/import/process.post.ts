import { eq, and } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { rawExternalData, importBatches, intermediateRecords, extractionLogs } from '../../db/schema'
import { getClaudeClient } from '../../utils/claude'
import { extractIntermediateItems } from '../../utils/extraction'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const claude = getClaudeClient(event)

  const pending = await db.select().from(rawExternalData).where(eq(rawExternalData.status, 'pending')).all()

  const result = { success: 0, error: 0, skipped: 0, total: pending.length }

  for (const record of pending) {
    const existingLog = await db
      .select()
      .from(extractionLogs)
      .where(
        and(
          eq(extractionLogs.sourceId, record.id),
          eq(extractionLogs.sourceType, 'raw_external_data'),
        ),
      )
      .get()

    if (existingLog) {
      result.skipped++
      continue
    }

    try {
      const items = await extractIntermediateItems(claude, record.content)

      let firstRecordId: string | null = null

      for (const item of items) {
        const id = crypto.randomUUID()
        if (!firstRecordId) firstRecordId = id

        await db.insert(intermediateRecords).values({
          id,
          sourceId: record.id,
          sourceType: 'raw_external_data',
          date: item.date ?? null,
          polarity: item.polarity,
          tag: item.tag,
          what: item.what,
          why: item.why,
          summary: item.summary,
          intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
        })
      }

      await db.insert(extractionLogs).values({
        id: crypto.randomUUID(),
        sourceId: record.id,
        sourceType: 'raw_external_data',
        intermediateRecordId: firstRecordId,
      })

      await db.update(rawExternalData).set({ status: 'done' }).where(eq(rawExternalData.id, record.id))

      // バッチのprocessedCountとstatusを更新
      const batch = await db.select().from(importBatches).where(eq(importBatches.id, record.batchId)).get()
      if (batch) {
        const newProcessedCount = batch.processedCount + 1
        const newStatus = newProcessedCount >= batch.totalCount ? 'done' : 'processing'
        await db
          .update(importBatches)
          .set({ processedCount: newProcessedCount, status: newStatus })
          .where(eq(importBatches.id, record.batchId))
      }

      result.success++
    }
    catch {
      await db.update(rawExternalData).set({ status: 'error' }).where(eq(rawExternalData.id, record.id))
      await db
        .update(importBatches)
        .set({ status: 'error' })
        .where(eq(importBatches.id, record.batchId))
      result.error++
    }
  }

  return result
})
