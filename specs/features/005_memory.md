# 記憶ビューア スペック

**ステータス**: Done
**スペック番号**: 005
**作成日**: 2026-05-30

## 概要

中間記憶（intermediate_records）と長期記憶（memory_snapshots）の生成・閲覧を実装する。インポートデータからAIが中間記憶を抽出し、週次→月次→年次→living_profileと段階的に集約する。

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
- [x] バッチ実行で週次→月次→年次→living_profileのスナップショットを生成する
- [x] living_profileをチャットのシステムプロンプトに注入する

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/memory/intermediate` | 要 | 中間記憶一覧取得 |
| GET | `/api/memory/snapshots` | 要 | スナップショット一覧取得 |
| GET | `/api/memory/snapshots/[id]` | 要 | スナップショット詳細取得 |
| POST | `/api/memory/batch` | 要 | スナップショット一括生成 |

### GET /api/memory/intermediate クエリパラメータ

- `polarity`: `positive` | `negative` | `neutral`（省略可）
- `tag`: string（省略可）
- `sourceType`: `chatgpt` | `claude` | `diary` | `other` | `task`（省略可）
- `dateFrom`: string（省略可、YYYY-MM-DD）
- `dateTo`: string（省略可、YYYY-MM-DD）

### GET /api/memory/snapshots クエリパラメータ

- `periodType`: `weekly` | `monthly` | `yearly` | `manual` | `past`（省略可）

## DBスキーマ変更

```typescript
// intermediate_records: 中間記憶（Phase 2で生成）
intermediateRecords: {
  id, sourceId, sourceType('raw_external_data'|'task'|'chat_message'), date,
  polarity('positive'|'negative'|'neutral'), tag, what, intensity, createdAt
}

// extraction_logs: 中間記憶生成ログ（UNIQUE(sourceId, sourceType)で重複防止）
extractionLogs: {
  id, sourceId, sourceType, intermediateRecordId(FK→intermediateRecords nullable), createdAt
}

// memory_snapshots: 長期記憶（Phase 2で生成）
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

- `server/db/schema.ts` — intermediateRecords, extractionLogs, memorySnapshots テーブル追加
- `server/api/memory/intermediate.get.ts`
- `server/api/memory/snapshots.get.ts`
- `server/api/memory/snapshots/[id].get.ts`
- `app/pages/memory.vue`

## ビューアの方針

- 閲覧専用（編集・削除はしない）
- pastタイプのスナップショットは時系列の最古に表示（ORDER BY: past > 他は createdAt DESC）
- Phase 1ではデータがないため空表示でOK

## 中間記憶の抽出方針（対話データの扱い）

### raw_external_dataの保存単位

Phase 1でファイル全体をそのまま `content` に保存している（ユーザー発言・AI回答を分けない）。
Phase 2の抽出プロンプトで制御する方針とする。

### 対話データ（chatgpt / claude）の分析方針

- **分析対象**：ユーザー発言・AI回答の両方を含む会話全体
  - AIからの問いかけに対してユーザーが答える形式では、AIの文脈がないとユーザー発言の意味が取れないため
- **抽出の主体**：あくまでユーザー自身の思考・感情・関心・行動を読み取ることを目的とする
  - AIの回答内容を「ユーザーの考え」として誤抽出しないよう、プロンプトで明示的に指示する
  - 具体的には「これはユーザーとAIの対話ログである。AIの発言は文脈理解のために参照するが、抽出する情報はユーザー発言に由来するものに限る」という方針をプロンプトに含める
- **日記・other**：一人称テキストのためこの制約は不要。ソース種別に応じてプロンプトを分岐する

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
    ↓ 毎チャット・毎ツール呼び出し時
システムプロンプトに注入
```

### バッチ処理の基本ルール

- **対象は「完了したperiod」のみ**。periodEnd < 今日 の週・月・年のみ処理する
- **未処理期間を遡って全て埋める**。最後のスナップショットのperiodEnd以降の全完了期間を順番に生成する
- ボタンを押し忘れた週があっても、次回バッチ実行時にすべて補完される
- intermediate_records が存在しない期間はスナップショット生成をスキップする（空スナップショットは作らない）

### 各バッチの入出力

**週次バッチ**
- 入力：対象週の `intermediate_records`
- 処理：tag別件数・polarity分布を集計（定量）→ AI が achievements/struggles/interests/aiSummary を生成
- 出力：`memory_snapshots`（weekly）

**月次バッチ**
- 入力：対象月の `memory_snapshots`（weekly）
- 出力：`memory_snapshots`（monthly）

**年次バッチ**
- 入力：対象年の `memory_snapshots`（monthly）
- 出力：`memory_snapshots`（yearly）

### living_profile の更新方式

**週次ローリング更新（B方式）**
- 入力：前回の `living_profile` + 直近の新しい `weekly` スナップショット
- 前回プロファイル（=過去全体の蒸留済み）に最新週の変化を上乗せする
- 軽量・高頻度向き

**月次フルリビルド（A方式）**
- 入力：`yearly` 全件 + `monthly` 直近3件 + `weekly` 直近4件
- 全履歴（yearly）を参照するため1年以上前のデータも反映される
- 誤りの蓄積をリセットする正確性確保のために月1回実施

→ **月またぎのバッチ実行時はA方式、同月内の週次更新はB方式を使う**

### トリガー

- **手動**：memoryページの「記憶を更新」ボタン（`POST /api/memory/batch`）
- **将来**：Cloudflare Cron（週次 `0 6 * * 1`、月次 `0 6 1 * *`）
- チャット開始時の自動実行はしない（プロファイルは週次更新の静的データとして扱う）

### チャット・ツールへの注入

```typescript
// chat.post.ts（イメージ）
const profile = await db.select()
  .from(memorySnapshots)
  .where(eq(memorySnapshots.periodType, 'living_profile'))
  .get()

const systemPrompt = profile
  ? `${profile.aiSummary}\n\n---\n\n...`
  : `...（フォールバック）`
```

- `living_profile` が存在しない場合はデフォルトのシステムプロンプトにフォールバック
- ツールへの注入は `recommendedFocus` のみで十分なケースもある

## 関連スペック

- `specs/features/004_import.md`
