import { eq, and } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { importedFiles, intermediateRecords, extractionLogs } from '../../db/schema'
import { getClaudeClient } from '../../utils/claude'
import { extractIntermediateItems } from '../../utils/extraction'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const claude = getClaudeClient(event)

  const pending = await db.select().from(importedFiles).where(eq(importedFiles.status, 'pending')).all()

  const result = { success: 0, error: 0, skipped: 0, total: pending.length }

  for (const file of pending) {
    const existingLog = await db
      .select()
      .from(extractionLogs)
      .where(
        and(
          eq(extractionLogs.sourceId, file.id),
          eq(extractionLogs.sourceType, 'imported_file'),
        ),
      )
      .get()

    if (existingLog) {
      result.skipped++
      continue
    }

    try {
      const items = await extractIntermediateItems(claude, file.content)

      let firstRecordId: string | null = null

      for (const item of items) {
        const id = crypto.randomUUID()
        if (!firstRecordId) firstRecordId = id

        await db.insert(intermediateRecords).values({
          id,
          sourceId: file.id,
          sourceType: 'imported_file',
          date: item.date ?? null,
          polarity: item.polarity,
          tag: item.tag,
          what: item.what,
          intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
        })
      }

      await db.insert(extractionLogs).values({
        id: crypto.randomUUID(),
        sourceId: file.id,
        sourceType: 'imported_file',
        intermediateRecordId: firstRecordId,
      })

      await db.update(importedFiles).set({ status: 'done' }).where(eq(importedFiles.id, file.id))

      result.success++
    }
    catch {
      await db.update(importedFiles).set({ status: 'error' }).where(eq(importedFiles.id, file.id))
      result.error++
    }
  }

  return result
})
