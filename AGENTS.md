# AGENTS.md — AI コーディングアシスタント向け技術規約

日本語で回答すること。

## プロジェクト構成

```
solo-copilot/
├── app/          # Nuxt 4 フロントエンド (srcDir)
│   ├── app.vue
│   ├── pages/
│   ├── components/
│   ├── composables/
│   └── types/
├── server/       # Nitro サーバー (serverDir, rootDir 直下)
│   ├── api/      # APIルート (*.post.ts, *.get.ts)
│   ├── db/       # Drizzle スキーマ
│   ├── migrations/  # drizzle-kit 生成SQL
│   └── utils/    # サーバーユーティリティ
├── specs/        # スペック駆動開発ドキュメント
├── nuxt.config.ts
└── wrangler.toml
```

## 開発コマンド

```bash
yarn dev:ui      # UIのみ（D1なし、HMR）
yarn dev         # ビルド後 wrangler dev --remote（D1あり）
yarn deploy      # ビルド＋Cloudflare デプロイ
yarn db:generate # スキーマ変更後に必ず実行
yarn db:migrate  # リモートD1にマイグレーション適用
yarn wrangler d1 execute solo-copilot-db --remote --command "SELECT ..."  # DB直接操作
```

## コーディングスタイル

- TypeScript strict mode
- Vue SFC: `<script setup lang="ts">`, インデント 2 スペース
- `camelCase` for JS/TS、`kebab-case` for CSS クラス
- APIルート命名: `*.post.ts`, `*.get.ts`, `*.patch.ts`, `*.delete.ts`
- コメント・エラーメッセージ: 日本語
- コミットメッセージ: 日本語 1 行

## D1 アクセスパターン

```typescript
// server/api/xxx/yyy.get.ts
import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { users } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb(event)  // D1がない場合 503 を返す
  const result = await db.select().from(users).where(eq(users.id, id)).get()
  return result
})
```

`getDb()` は `event.context.cloudflare.env.DB` が存在しない場合 503 を返す。
`nuxt dev`（dev:ui）では D1 は利用不可。D1 が必要な API は `npm run dev` で確認。

## AIストリーミングパターン（Claude）

```typescript
// server/api/agent/chat.post.ts
import { getClaudeClient } from '~/server/utils/claude'

export default defineEventHandler(async (event) => {
  const client = getClaudeClient(event)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  const stream = await client.messages.create({ model: 'claude-sonnet-4-5', stream: true, ... })

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta')
          controller.enqueue(enc.encode(ev.delta.text))
      }
      controller.close()
    },
  })
  return sendStream(event, readable)
})
```

## スキーマ変更フロー

1. `server/db/schema.ts` を編集
2. `npm run db:generate`（`server/migrations/` にSQL生成）
3. `npm run db:migrate`（リモートD1に適用）
4. 対応する `specs/features/NNN.md` を更新

## 認証パターン

```typescript
import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '認証が必要です' })
  // user.id, user.username が使える
})
```

## スペック駆動開発

新機能を追加する前に必ず `specs/features/_template.md` をコピーしてスペックを作成すること。
受入れ基準に基づいて実装し、完了後にスペックのステータスを `Done` に更新する。
