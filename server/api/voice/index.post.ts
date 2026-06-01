import { getDb } from '../../utils/db'
import { voiceRecords } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ transcript: string; duration?: number }>(event)
  if (!body.transcript?.trim()) {
    throw createError({ statusCode: 400, message: 'transcript is required' })
  }

  const db = getDb(event)
  const id = crypto.randomUUID()

  await db.insert(voiceRecords).values({
    id,
    transcript: body.transcript.trim(),
    duration: body.duration ?? null,
    extractionStatus: 'pending',
  })

  return { id }
})
