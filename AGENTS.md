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

## ファイルルーティングテーブル

| やりたいこと | ファイル |
|---|---|
| AIチャットAPI（Claude、ストリーミング） | `server/api/agent/chat.post.ts` |
| チャットメッセージからの中間記憶バッチ抽出 | `server/api/agent/chat-extract.post.ts` |
| Claude設定・ストリーミングラッパー | `server/utils/claude.ts` |
| OpenAI設定・ストリーミングラッパー | `server/utils/openai.ts` |
| Gemini設定・ストリーミングラッパー | `server/utils/gemini.ts` |
| DBスキーマ変更 | `server/db/schema.ts` → `db:generate` → `db:migrate` |
| 認証ミドルウェア（全API保護） | `server/middleware/auth.ts` |
| 認証ユーティリティ（Cookie操作） | `server/utils/auth.ts` |
| DBアクセスヘルパー | `server/utils/db.ts` |
| フロントエンド認証状態 | `app/composables/useAuth.ts` |
| AIストリーミング読み取り | `app/composables/useStream.ts` |
| 会話セッション作成 | `server/api/conversations/index.post.ts` |
| 最新会話または新規作成 | `server/api/conversations/current.get.ts` |
| 会話のメッセージ一覧取得 | `server/api/conversations/[id]/messages.get.ts` |
| メッセージ保存（自動抽出付き） | `server/api/conversations/[id]/messages.post.ts` |
| タスクAPI（一覧・作成） | `server/api/tasks/index.get.ts` / `index.post.ts` |
| タスクAPI（詳細・更新・削除） | `server/api/tasks/[id].get.ts` / `[id].put.ts` / `[id].delete.ts` |
| タスクAPI（ステータス変更） | `server/api/tasks/[id]/status.patch.ts` |
| タグAPI（一覧・作成・更新・削除） | `server/api/tags/index.get.ts` 等 |
| タスク↔タグ付与・解除 | `server/api/tasks/[id]/tags/index.post.ts` / `[tag_id].delete.ts` |
| タスクAPI composable | `app/composables/useTasks.ts` |
| ダッシュボード | `app/pages/index.vue` |
| チャットページ | `app/pages/chat.vue` |
| カンバンボード | `app/pages/tasks.vue` |
| 外部データ取り込みページ | `app/pages/import.vue` |
| 記憶ビューアページ | `app/pages/memory.vue` |
| タスクカード | `app/components/tasks/TaskCard.vue` |
| タスク作成・編集モーダル | `app/components/tasks/TaskModal.vue` |
| 完了モーダル | `app/components/tasks/CompletionModal.vue` |
| タグ管理モーダル | `app/components/tasks/TagModal.vue` |
| 幅広レイアウト（カンバン用） | `app/layouts/wide.vue` |
| インポートAPI（ファイルアップロード・チャンク分割） | `server/api/import/upload.post.ts` |
| インポートAPI（ファイル一覧） | `server/api/import/files.get.ts` |
| インポートAPI（未処理ファイル→中間記憶） | `server/api/import/process.post.ts` |
| Claude抽出ロジック（中間記憶生成） | `server/utils/extraction.ts` |
| 中間記憶API（一覧・フィルタ） | `server/api/memory/intermediate.get.ts` |
| 中間記憶API（一括削除） | `server/api/memory/intermediate.delete.ts` |
| スナップショットAPI（一覧） | `server/api/memory/snapshots.get.ts` |
| スナップショットAPI（詳細） | `server/api/memory/snapshots/[id].get.ts` |
| スナップショット一括生成バッチ | `server/api/memory/batch.post.ts` |
| living_profileプロファイル取得 | `server/api/memory/profile.get.ts` |
| スナップショット生成ロジック | `server/utils/snapshot.ts` |
| 新機能スペック作成 | `specs/features/_template.md` をコピー |
| 技術決定の背景（ADR） | `specs/architecture.md` |

## 開発コマンド

```bash
yarn dev:ui      # UIのみ（HMR、D1なし）→ http://localhost:3010
yarn dev         # ビルド→wrangler dev --remote（D1あり）→ http://localhost:8787
yarn build       # Cloudflare Workers向けビルド
yarn deploy      # ビルド＋Cloudflare デプロイ
yarn db:generate # スキーマ変更後に必ず実行
yarn db:migrate  # リモートD1にマイグレーション適用

# wrangler を直接叩く場合（グローバルは使わない）
yarn wrangler d1 execute solo-copilot-db --remote --command "SELECT ..."
```

## 環境変数

`.env` に設定（コミット禁止）。本番は `wrangler secret put` で設定。

```
NUXT_ANTHROPIC_API_KEY=
NUXT_OPENAI_API_KEY=
NUXT_GEMINI_API_KEY=
NUXT_ENCRYPTION_KEY=
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
`nuxt dev`（dev:ui）では D1 は利用不可。D1 が必要な API は `yarn dev` で確認。

## AIストリーミングパターン（Claude）

```typescript
// server/api/agent/chat.post.ts
import { getClaudeClient } from '~/server/utils/claude'

export default defineEventHandler(async (event) => {
  const client = getClaudeClient(event)
  setupStreamHeaders(event)

  const stream = await client.messages.create({ model: 'claude-sonnet-4-6', stream: true, ... })

  return sendStream(event, createClaudeStream(stream))
})
```

## スキーマ変更フロー

1. `server/db/schema.ts` を編集
2. `yarn db:generate`（`server/migrations/` にSQL生成）
3. `yarn db:migrate`（リモートD1に適用）
4. 対応する `specs/features/NNN.md` を更新

## 認証パターン

認証は `server/middleware/auth.ts` が全APIルートを一括保護している。各APIルートで個別チェックは不要。
手動チェックが必要な場合は `isAuthenticated` を使う。

```typescript
import { isAuthenticated } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  if (!await isAuthenticated(event)) {
    throw createError({ statusCode: 401, statusMessage: '認証が必要です' })
  }
})
```

## スペック駆動開発

**新機能追加の手順:**
1. `specs/features/_template.md` をコピーして連番ファイルを作成
2. 受入れ基準・APIルート・DBスキーマ変更を記述
3. 型定義→DBスキーマ→API→フロントの順で実装
4. `yarn dev` で受入れ基準を手動確認
5. スペックのステータスを `Done` に更新
6. `AGENTS.md` のファイルルーティングテーブルを更新
