import { getDb } from '../../utils/db'
import { importBatches, rawExternalData } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'フォームデータがありません' })

  const files = formData.filter((f) => f.name === 'files' && f.filename)
  if (files.length === 0) throw createError({ statusCode: 400, statusMessage: 'ファイルがありません' })

  const createdBatchIds: string[] = []

  for (const file of files) {
    const batchId = crypto.randomUUID()
    const fileName = file.filename!
    const content = file.data.toString('utf-8')

    await db.insert(importBatches).values({
      id: batchId,
      fileName,
      totalCount: 1,
      processedCount: 0,
      status: 'pending',
    })

    await db.insert(rawExternalData).values({
      id: crypto.randomUUID(),
      batchId,
      fileName,
      content,
      status: 'pending',
    })

    createdBatchIds.push(batchId)
  }

  return { batchIds: createdBatchIds }
})
