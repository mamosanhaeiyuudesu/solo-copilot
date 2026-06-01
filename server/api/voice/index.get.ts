import { desc } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { voiceRecords } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  return db.select().from(voiceRecords).orderBy(desc(voiceRecords.createdAt)).all()
})
