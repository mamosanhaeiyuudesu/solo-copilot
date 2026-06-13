import { getDb } from '../../utils/db'
import { conversations } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const id = crypto.randomUUID()

  await db.insert(conversations).values({ id, title: '' })

  return { id }
})
