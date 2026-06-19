# アーキテクチャ決定記録（ADR）

## スタック

| レイヤー | 技術 | バージョン | 理由 |
|---|---|---|---|
| フロントエンド | Nuxt + @nuxt/ui | 3.21 + 3.3 | 型安全・SSR・Cloudflare 対応 |
| バックエンド | Nitro (cloudflare_module) | — | Cloudflare Workers 向け最適化 |
| DB | Cloudflare D1 (SQLite) | — | サーバーレス・低コスト・Workers ネイティブ |
| ORM | Drizzle ORM | 0.42 | 型安全・Edge 対応・軽量 |
| AI (主) | @anthropic-ai/sdk (Claude) | 0.51 | ストリーミング対応・型安全 |
| AI (副) | openai / @google/generative-ai | — | プロバイダー選択の柔軟性（未使用） |
| パッケージ管理 | Yarn | 4.9 | 参照プロジェクト(creation)と統一 |

## DBスキーマ（現状）

個人利用のためユーザー管理なし。

```
conversations       id, title, created_at, updated_at
messages            id, conversation_id(FK→conversations), role(user|assistant),
                    content, created_at

imported_files      id, file_name, content, status(pending|processing|done|error),
                    created_at, updated_at
                    ※ 8000文字を超えるファイルはチャンク分割して複数レコード保存

intermediate_records  id, source_id, source_type(imported_file|chat_message),
                      date, polarity(positive|negative),
                      theme_tags(JSON配列 ※12固定タグから0〜2個),
                      what, why, intensity(1-5), created_at
                      ※ emotion_tags は廃止（migration 0014）
                      ※ neutral polarity は廃止（migration 0014）

extraction_logs     id, source_id, source_type, intermediate_record_id(FK nullable),
                    created_at
                    ※ UNIQUE(source_id, source_type) で二重処理を防ぐ

memory_snapshots    id, period_type(weekly|monthly|yearly|manual|past),
                    period_start, period_end,
                    tag_summaries(JSON: [{tag,posCount,negCount,positive,negative}]),
                    created_at
                    ※ living_profile period_type は廃止（migration 0014）
                    ※ achievements/struggles/interests/ai_summary/headline 等は廃止（migration 0014）
                    ※ tagSummaries 構造の詳細は spec 005 参照
```

※ tasks / tags / task_tags は 2026-06 のスコープ絞り込みで削除済み（migration 0013、spec 003）。  
※ 12固定テーマタグ: 発明, 心理, 子育て, 剣道, 夫婦, 会社, AI, マーケティング, 転職, 親との関係, 節約, 地方創生

マイグレーションファイル: `server/migrations/`（手書き運用。drizzle-kit のスナップショットは未同期のため `db:generate` は使わず手書きする）  
wrangler.toml に `migrations_dir = "server/migrations"` が必要（デフォルトの `migrations/` と異なる）

## ADR-001: Nuxt 4 の app/ srcDir

**決定**: `future: { compatibilityVersion: 4 }` + `srcDir: app/`  
**Why**: Nuxt 4 の慣例に従い、フロントエンドとサーバーを明確に分離する  
**ディレクトリ**: フロントエンド → `app/`、サーバー → `server/`（rootDir直下）  
**インポートパスの注意**: `~/` は `app/` に解決される。`server/` 内のファイルはサーバー間で**相対パス**を使う（例: `../../db/schema`）。`server/utils/` の関数は Nitro が**自動インポート**するため明示的インポート不要

## ADR-002: Cloudflare D1 のみ（ローカルSQLite不使用）

**決定**: 開発時もリモートD1を使用（`wrangler dev --remote`）  
**Why**: ローカルSQLiteとの差異によるバグを防ぐ  
**トレードオフ**: ネットワーク遅延が発生するが、精度の高い動作確認が可能  
**UIのみ開発**: `yarn dev:ui` でD1不要のUI開発は可能

## ADR-003: Drizzle ORM（Prismaではない）

**決定**: Drizzle ORM を採用  
**Why**: Prisma の `@prisma/adapter-d1` は experimental。Prisma のクエリエンジンは Cloudflare Workers のバイナリ制限と相性が悪い。Drizzle は Edge 環境向けに設計されており D1 との相性が最良  
**マイグレーション手順**:
1. `server/db/schema.ts` を変更
2. `server/migrations/NNNN_name.sql` を**手書き**で作成（`yarn db:generate` は drizzle-kit との差分があるため使わない）
3. `yarn db:migrate` → リモートD1に適用

## ADR-004: プロバイダー別 AI ユーティリティ

**決定**: `server/utils/claude.ts`, `openai.ts`, `gemini.ts` を個別に作成  
**Why**: 各 SDK の型を最大限活用。統一インターフェースは過度な抽象化であり、SDK ごとの機能差（ビジョン、ツールコールなど）を隠蔽してしまう  
**Cloudflare Workers 対応**: 各 SDK は内部で `fetch` を使用し Workers 環境で動作する  
**現在の利用**: チャットは Claude (`claude-sonnet-4-5`) のみ。OpenAI・Gemini はユーティリティのみ用意済み

## ADR-005: ストリーミングに ReadableStream を使用

**決定**: `event.node.res.write()` ではなく `ReadableStream` + `sendStream()` を使用  
**Why**: Cloudflare Workers のネイティブ Web Standard API を使用する。`event.node.res` は互換シムであり、`ReadableStream` がより信頼性が高い

## ADR-006: スペック駆動開発

**決定**: `specs/features/` に機能スペックを先に書き、実装はスペックに従う  
**Why**: AIアシスタントが文脈を失わないよう、仕様を永続化する。受入れ基準が明確になりバグを防ぐ  
**運用**: 新機能 → スペック作成 → 受入れ基準確認 → 実装 → 完了確認

## ADR-007: パスワード認証のみ（ユーザー管理なし）

**決定**: ユーザー登録・ログインなし。パスワード1つで保護するシンプルな認証  
**Why**: 個人利用のみ。ユーザー管理の複雑さは不要  
**実装**:
- パスワードは `NUXT_ACCESS_PASSWORD`（Cloudflare Secret）で管理
- Cookie 値 = `SHA-256(password)` のハッシュ（ステートレス、DBなし）
- `server/middleware/auth.ts` が全 `/api/**` ルートを保護
- `/api/auth/verify` と `/api/auth/logout` は認証不要
**ローカル開発**: `import.meta.dev` が true の場合、middleware が認証をスキップ → パスワード不要で安全（localhost のみアクセス可）

## ADR-008: 手動デプロイ（CI/CDなし）

**決定**: git push とデプロイを分離する。`yarn deploy` を手動実行  
**Why**: 個人ツールのため、作業中のコミットを自由に push しつつ、準備できたときだけ本番反映したい。GitHub Actions は `CLOUDFLARE_API_TOKEN` の管理コストが増える割にメリットが薄い  
**デプロイ手順**:
1. `yarn deploy`（= `nuxt build && wrangler deploy`）
2. Cloudflare Dashboard で動作確認

## ADR-009: Yarn（npmではない）

**決定**: パッケージマネージャーを Yarn 4 に統一  
**Why**: グローバルの wrangler が darwin-64 バイナリ（アーキテクチャ不一致）だったため。ローカルの wrangler を `yarn wrangler` で使う。参照プロジェクト(creation)も Yarn 4  
**設定**: `.yarnrc.yml` に `nodeLinker: node-modules`（Nuxt との PnP 互換性のため）  
**wrangler の実行**: グローバルではなく `yarn wrangler ...` を使う

## runtimeConfig キー一覧

| キー | 環境変数 | 用途 |
|---|---|---|
| `accessPassword` | `NUXT_ACCESS_PASSWORD` | アクセスパスワード |
| `anthropicApiKey` | `NUXT_ANTHROPIC_API_KEY` | Claude API |
| `openaiApiKey` | `NUXT_OPENAI_API_KEY` | OpenAI API（未使用） |
| `geminiApiKey` | `NUXT_GEMINI_API_KEY` | Gemini API（未使用） |
| `encryptionKey` | `NUXT_ENCRYPTION_KEY` | 暗号化キー（未使用、将来用） |

ローカルは `.env`、本番は `yarn wrangler secret put` で設定。

## コーディング規則

- TypeScript strict mode
- インデント: 2 スペース
- Vue SFC: `<script setup lang="ts">`
- APIルート: HTTPメソッド命名（`*.post.ts`, `*.get.ts`）
- エラーメッセージ・コメント: 日本語
- `createError()` で適切な HTTP ステータスを設定する
- DB アクセスは必ず `getDb(event)` 経由（直接 D1 バインディングを触らない）
- 認証チェックは middleware に任せる（API ルート内で個別チェック不要）
- パッケージ管理: `yarn` を使う（`npm run` は使わない）
