/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import type { H3Event } from 'h3'

// ローカル開発用DB（server/plugins/local-db.ts で初期化される）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _localDb: any = null

export function setLocalDb(db: unknown) {
  _localDb = db
}

export function getDb(event: H3Event) {
  if (_localDb) return _localDb as ReturnType<typeof drizzle>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (event.context.cloudflare as any)?.env
  if (!env?.DB) {
    throw createError({
      statusCode: 503,
      statusMessage: 'DB 接続不可。本番環境（Cloudflare）または yarn dev で起動してください。',
    })
  }
  return drizzle(env.DB as D1Database, { schema })
}
