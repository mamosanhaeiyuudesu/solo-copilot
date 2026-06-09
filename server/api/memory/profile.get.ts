import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { memorySnapshots } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const profile = await db.select()
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'living_profile'))
    .get()

  return { profile: profile ?? null }
})
