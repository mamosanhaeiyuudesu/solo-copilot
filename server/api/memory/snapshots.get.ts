import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { memorySnapshots } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const query = getQuery(event)

  const validTypes = ['weekly', 'monthly', 'yearly', 'manual', 'past'] as const
  type PeriodType = typeof validTypes[number]

  let dbQuery = db.select().from(memorySnapshots)

  if (query.periodType && validTypes.includes(query.periodType as PeriodType)) {
    dbQuery = dbQuery.where(eq(memorySnapshots.periodType, query.periodType as PeriodType)) as typeof dbQuery
  }

  const rows = await dbQuery.orderBy(desc(memorySnapshots.createdAt)).all()

  const snapshots = rows.sort((a, b) => {
    if (a.periodType === 'past' && b.periodType !== 'past') return 1
    if (a.periodType !== 'past' && b.periodType === 'past') return -1
    return a.createdAt < b.createdAt ? 1 : -1
  })

  return { snapshots }
})
