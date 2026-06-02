import { getDb } from '../../utils/db'
import { importedFiles } from '../../db/schema'

const CHUNK_SIZE = 8000

const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
                 '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳']

function circledNumber(n: number): string {
  return CIRCLED[n - 1] ?? `(${n})`
}

function splitContent(content: string): string[] {
  const chunks: string[] = []
  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE))
  }
  return chunks
}

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'フォームデータがありません' })

  const files = formData.filter((f) => f.name === 'files' && f.filename)
  if (files.length === 0) throw createError({ statusCode: 400, statusMessage: 'ファイルがありません' })

  const createdIds: string[] = []

  for (const file of files) {
    const content = file.data.toString('utf-8')
    const chunks = splitContent(content)

    for (let i = 0; i < chunks.length; i++) {
      const id = crypto.randomUUID()
      const fileName = chunks.length > 1
        ? `${file.filename!}${circledNumber(i + 1)}`
        : file.filename!
      await db.insert(importedFiles).values({
        id,
        fileName,
        content: chunks[i],
        status: 'pending',
      })
      createdIds.push(id)
    }
  }

  return { ids: createdIds }
})
