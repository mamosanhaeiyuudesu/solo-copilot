import { getDb } from '../../utils/db'
import { importedFiles } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'フォームデータがありません' })

  const files = formData.filter((f) => f.name === 'files' && f.filename)
  if (files.length === 0) throw createError({ statusCode: 400, statusMessage: 'ファイルがありません' })

  const createdIds: string[] = []

  for (const file of files) {
    const id = crypto.randomUUID()
    await db.insert(importedFiles).values({
      id,
      fileName: file.filename!,
      content: file.data.toString('utf-8'),
      status: 'pending',
    })
    createdIds.push(id)
  }

  return { ids: createdIds }
})
