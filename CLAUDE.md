# CLAUDE.md — solo-copilot

**会話は日本語で行う。**

個人用AIエージェントアプリ（Nuxt 4 + Nitro + Cloudflare D1 + Claude/OpenAI/Gemini）

## 詳細を読む

| 知りたいこと | ファイル |
|---|---|
| プロジェクトのビジョン・目標 | `specs/VISION.md` |
| 技術決定の背景（なぜ？） | `specs/architecture.md` |
| 機能ごとの仕様・受入れ基準 | `specs/features/NNN_xxx.md` |
| コーディング規則・パターン集 | `AGENTS.md` |

## 開発コマンド

```bash
yarn dev:ui      # UIのみ（HMR、D1なし）→ http://localhost:3000
yarn dev         # ビルド→wrangler dev --remote（D1あり）→ http://localhost:8787
yarn build       # Cloudflare Workers向けビルド
yarn deploy      # ビルド＋デプロイ
yarn db:generate # スキーマ変更後にSQL生成（server/migrations/ に出力）
yarn db:migrate  # リモートD1にマイグレーション適用

# wrangler を直接叩く場合（グローバルは使わない）
yarn wrangler d1 execute solo-copilot-db --remote --command "SELECT ..."
```

## ファイルルーティングテーブル

| やりたいこと | ファイル |
|---|---|
| AIチャットAPI（Claude） | `server/api/agent/chat.post.ts` |
| Claude設定・ストリーミングラッパー | `server/utils/claude.ts` |
| OpenAI設定・ストリーミングラッパー | `server/utils/openai.ts` |
| Gemini設定・ストリーミングラッパー | `server/utils/gemini.ts` |
| DBスキーマ変更 | `server/db/schema.ts` → `db:generate` → `db:migrate` |
| 認証ミドルウェア（全API保護） | `server/middleware/auth.ts` |
| 認証ユーティリティ（Cookie操作） | `server/utils/auth.ts` |
| DBアクセスヘルパー | `server/utils/db.ts` |
| フロントエンド認証状態 | `app/composables/useAuth.ts` |
| AIストリーミング読み取り | `app/composables/useStream.ts` |
| 新機能スペック作成 | `specs/features/_template.md` をコピー |
| 技術決定の背景（ADR） | `specs/architecture.md` |

## 環境変数

`.env` に設定（コミット禁止）。本番は `wrangler secret put` で設定。

```
NUXT_ANTHROPIC_API_KEY=
NUXT_OPENAI_API_KEY=
NUXT_GEMINI_API_KEY=
NUXT_ENCRYPTION_KEY=
```

## スペック駆動開発ルール

**新機能追加の手順:**
1. `specs/features/_template.md` をコピーして連番ファイルを作成
2. 受入れ基準・APIルート・DBスキーマ変更を記述
3. 型定義→DBスキーマ→API→フロントの順で実装
4. `npm run dev` で受入れ基準を手動確認
5. スペックのステータスを `Done` に更新
6. このファイルのルーティングテーブルを更新
