import { getDb } from '../../utils/db'
import { tags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  return db.select().from(tags).all()
})
