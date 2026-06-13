# 記憶ビューア スペック

**ステータス**: Done
**スペック番号**: 005
**作成日**: 2026-05-30

## 概要

中間記憶（intermediate_records）と長期記憶（memory_snapshots）の生成・閲覧を実装する。インポートデータまたはチャットメッセージからAIが中間記憶を抽出し、週次→月次→年次→living_profileと段階的に集約する。

## 背景・動機

AIが生成した自己理解データを可視化し、自分の行動・感情・成長の傾向を把握できるようにする。蓄積された中間記憶をバッチ処理でスナップショットに集約し、チャットのシステムプロンプトに注入することでAIが文脈を持てるようにする。

## 受入れ基準

- [x] 「中間記憶」と「記憶」のタブ切り替えができる
- [x] 中間記憶タブ：polarity・tag・期間・ソース種別でフィルタリングできる
- [x] 中間記憶タブ：日付・ソース・polarity・tag・what・intensityが一覧表示される
- [x] 中間記憶タブ：データがない場合は空状態を表示する
- [x] 記憶タブ：period_typeでフィルタリングできる
- [x] 記憶タブ：スナップショット一覧（日付・period_type）が表示される
- [x] 記憶タブ：スナップショットをクリックで詳細（できていること・苦しんでいること等）を表示する
- [x] 記憶タブ：データがない場合は空状態を表示する
- [x] 閲覧専用（編集・削除UIなし）
- [x] 認証済みユーザーのみ表示される
- [x] インポートデータからAIが中間記憶を自動抽出する
- [x] チャット中に未処理メッセージが10件以上になると自動で中間記憶を抽出する
- [x] バッチ実行で週次→月次→年次→living_profileのスナップショットを生成する
- [x] living_profileをチャットのシステムプロンプトに注入する

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/memory/intermediate` | 要 | 中間記憶一覧取得 |
| DELETE | `/api/memory/intermediate` | 要 | 中間記憶一括削除（`{ ids: string[] }` を body で受け取る） |
| GET | `/api/memory/snapshots` | 要 | スナップショット一覧取得 |
| GET | `/api/memory/snapshots/[id]` | 要 | スナップショット詳細取得 |
| POST | `/api/memory/batch` | 要 | スナップショット一括生成 |
| GET | `/api/memory/profile` | 要 | living_profile レコードを1件取得 |

### GET /api/memory/intermediate クエリパラメータ

- `polarity`: `positive` | `negative` | `neutral`（省略可）
- `tag`: string（省略可）
- `sourceType`: `imported_file` | `task` | `chat_message`（省略可）
- `dateFrom`: string（省略可、YYYY-MM-DD）
- `dateTo`: string（省略可、YYYY-MM-DD）

### GET /api/memory/snapshots クエリパラメータ

- `periodType`: `weekly` | `monthly` | `yearly` | `manual` | `past`（省略可）

### POST /api/memory/batch レスポンス

```typescript
{ weekly: number; monthly: number; yearly: number; livingProfile: boolean }
```

## DBスキーマ変更

```typescript
// intermediate_records: 中間記憶
intermediateRecords: {
  id, sourceId, sourceType('imported_file'|'task'|'chat_message'), date,
  polarity('positive'|'negative'|'neutral'), tag, what, intensity(1-5), createdAt
}

// extraction_logs: 中間記憶生成ログ（UNIQUE(sourceId, sourceType)で重複防止）
extractionLogs: {
  id, sourceId, sourceType, intermediateRecordId(FK→intermediateRecords nullable), createdAt
}

// memory_snapshots: 長期記憶
// periodType='living_profile' は常に1レコードのみ存在し、更新時に上書きする
memorySnapshots: {
  id, periodType('weekly'|'monthly'|'yearly'|'manual'|'past'|'living_profile'),
  periodStart, periodEnd, achievements, struggles, interests,
  aiSummary, recommendedFocus, integratedAdvice, financeSummary, healthTrend, createdAt
}
```

### living_profile レコードのフィールド利用方針

| フィールド | 用途 |
|---|---|
| `aiSummary` | プロファイル本文（~500トークンのプレーンテキスト）。チャット・ツールのシステムプロンプトに注入する |
| `recommendedFocus` | 現在の優先事項（1〜3行）。ツールの quick reference 用 |
| `periodEnd` | プロファイルの鮮度確認用（最後に処理した週の periodEnd） |
| その他フィールド | null |

## 実装ファイル

- `server/db/schema.ts` — intermediateRecords, extractionLogs, memorySnapshots テーブル
- `server/api/memory/intermediate.get.ts`
- `server/api/memory/intermediate.delete.ts`
- `server/api/memory/snapshots.get.ts`
- `server/api/memory/snapshots/[id].get.ts`
- `server/api/memory/batch.post.ts`
- `server/api/memory/profile.get.ts`
- `server/utils/snapshot.ts` — スナップショット生成ロジック（週次・月次・年次・living_profile）
- `app/pages/memory.vue`

## ビューアの方針

- 閲覧専用（編集・削除はしない）
- pastタイプのスナップショットは時系列の最古に表示（ORDER BY: past > 他は createdAt DESC）

## 中間記憶の抽出方針

### ソース種別と抽出タイミング

| ソース | 抽出タイミング | ロジック |
|---|---|---|
| `imported_file` | `POST /api/import/process` 実行時 | ファイル全体をClaude分析 |
| `chat_message` | アシスタントメッセージ保存後（自動） | 未処理メッセージが10件以上でトリガー |

### 対話データ（chat_message）の分析方針

- **分析対象**：ユーザー発言・AI回答の両方を含む会話全体（AIの文脈がないとユーザー発言の意味が取れないため）
- **抽出の主体**：あくまでユーザー自身の思考・感情・関心・行動を読み取ることを目的とする
  - AIの回答内容を「ユーザーの考え」として誤抽出しないよう、プロンプトで明示的に指示する

## 集約ロジック設計

### 全体パイプライン

```
intermediate_records（原子的観察）
    ↓ 週次バッチ
memory_snapshots（weekly）
    ↓ 月次バッチ
memory_snapshots（monthly）
    ↓ 年次バッチ
memory_snapshots（yearly）
    ↓ living_profile 更新バッチ
memory_snapshots（living_profile）× 1レコード
    ↓ 毎チャット呼び出し時
システムプロンプトに注入
```

### バッチ処理の基本ルール

- **対象は「完了したperiod」のみ**。periodEnd < 今日 の週・月・年のみ処理する
- **未処理期間を遡って全て埋める**。最後のスナップショットのperiodEnd以降の全完了期間を順番に生成する
- intermediate_records が存在しない期間はスナップショット生成をスキップする（空スナップショットは作らない）

### 各バッチの入出力

**週次バッチ**
- 入力：対象週の `intermediate_records`（intensity ≥ 2 のみ）
- 処理：tag別件数・polarity分布を集計 → AI が achievements/struggles/interests/aiSummary を生成（claude-haiku-4-5-20251001）
- 出力：`memory_snapshots`（weekly）

**月次バッチ**
- 入力：対象月の `memory_snapshots`（weekly）
- 出力：`memory_snapshots`（monthly）

**年次バッチ**
- 入力：対象年の `memory_snapshots`（monthly）
- 出力：`memory_snapshots`（yearly）

### living_profile の更新方式

**週次ローリング更新（rolling）**
- 入力：前回の `living_profile` + 直近2件の `weekly` スナップショット
- 同月内の週次のみ新規生成された場合に使用

**月次フルリビルド（full）**
- 入力：`yearly` 全件 + `monthly` 直近3件 + `weekly` 直近4件
- 月またぎ（monthly or yearly が新規生成された場合）に使用

### トリガー

- **手動**：memoryページの「記憶を更新」ボタン（`POST /api/memory/batch`）
- **将来**：Cloudflare Cron（週次 `0 6 * * 1`、月次 `0 6 1 * *`）
- チャット開始時の自動実行はしない（プロファイルは週次更新の静的データとして扱う）

### チャットへの注入

```typescript
// chat.post.ts
const profile = await db.select()
  .from(memorySnapshots)
  .where(eq(memorySnapshots.periodType, 'living_profile'))
  .get()

const systemPrompt = profile?.aiSummary
  ? `${profile.aiSummary}\n\n---\n\n${base}`
  : base
```

- `living_profile` が存在しない場合はデフォルトのシステムプロンプトにフォールバック

## 関連スペック

- `specs/features/004_import.md`
- `specs/features/006_chat.md`
