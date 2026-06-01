import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { intermediateRecords } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const query = getQuery(event)

  const conditions = []

  if (query.polarity && ['positive', 'negative', 'neutral'].includes(query.polarity as string)) {
    conditions.push(eq(intermediateRecords.polarity, query.polarity as 'positive' | 'negative' | 'neutral'))
  }
  if (query.tag) {
    conditions.push(eq(intermediateRecords.tag, query.tag as string))
  }
  if (query.sourceType && ['imported_file', 'task'].includes(query.sourceType as string)) {
    conditions.push(eq(intermediateRecords.sourceType, query.sourceType as 'imported_file' | 'task'))
  }
  if (query.dateFrom) {
    conditions.push(gte(intermediateRecords.date, query.dateFrom as string))
  }
  if (query.dateTo) {
    conditions.push(lte(intermediateRecords.date, query.dateTo as string))
  }

  const records = await db
    .select()
    .from(intermediateRecords)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(intermediateRecords.createdAt))
    .all()

  return { records }
})
