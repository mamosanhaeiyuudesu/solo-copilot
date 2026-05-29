/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import type { H3Event } from 'h3'

export function getDb(event: H3Event) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (event.context.cloudflare as any)?.env
  if (!env?.DB) {
    throw createError({
      statusCode: 503,
      statusMessage: 'DB 接続不可。npm run dev（wrangler dev --remote）で起動してください。',
    })
  }
  return drizzle(env.DB as D1Database, { schema })
}
