import { eq, and } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { importedFiles, intermediateRecords, extractionLogs } from '../../db/schema'
import { getClaudeClient } from '../../utils/claude'
import { extractIntermediateItems, splitIntoChunks } from '../../utils/extraction'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const claude = getClaudeClient(event)

  const pending = await db.select().from(importedFiles).where(eq(importedFiles.status, 'pending'))

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
      const chunks = splitIntoChunks(file.content)
      const allItems = (
        await Promise.all(chunks.map(chunk => extractIntermediateItems(claude, chunk)))
      ).flat()

      let firstRecordId: string | null = null

      for (const item of allItems) {
        const id = crypto.randomUUID()
        if (!firstRecordId) firstRecordId = id

        await db.insert(intermediateRecords).values({
          id,
          sourceId: file.id,
          sourceType: 'imported_file',
          date: item.date ?? null,
          polarity: item.polarity,
          themeTags: JSON.stringify(item.theme_tags),
          what: item.what,
          why: item.why ?? null,
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
