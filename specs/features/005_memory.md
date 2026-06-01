# 長期記憶ビューア スペック

**ステータス**: In Progress
**スペック番号**: 005
**作成日**: 2026-05-30

## 概要

中間情報（intermediate_records）と長期記憶スナップショット（memory_snapshots）を閲覧専用で表示する。Phase 1ではUI骨格のみで、データがない場合は空表示。

## 背景・動機

AIが生成した自己理解データを可視化し、自分の行動・感情・成長の傾向を把握できるようにする。Phase 2でデータが生成されてから活用できるよう、Phase 1でビューアのUI骨格を整備する。

## 受入れ基準

- [x] 「中間情報」と「長期記憶」のタブ切り替えができる
- [x] 中間情報タブ：polarity・tag・期間・ソース種別でフィルタリングできる
- [x] 中間情報タブ：日付・ソース・polarity・tag・what・intensityが一覧表示される
- [x] 中間情報タブ：データがない場合は空状態を表示する
- [x] 長期記憶タブ：period_typeでフィルタリングできる
- [x] 長期記憶タブ：スナップショット一覧（日付・period_type）が表示される
- [x] 長期記憶タブ：スナップショットをクリックで詳細（できていること・苦しんでいること等）を表示する
- [x] 長期記憶タブ：データがない場合は空状態を表示する
- [x] 閲覧専用（編集・削除UIなし）
- [x] 認証済みユーザーのみ表示される

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/memory/intermediate` | 要 | 中間情報一覧取得 |
| GET | `/api/memory/snapshots` | 要 | スナップショット一覧取得 |
| GET | `/api/memory/snapshots/[id]` | 要 | スナップショット詳細取得 |

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
// intermediate_records: 中間情報（Phase 2で生成）
intermediateRecords: {
  id, sourceId, sourceType('raw_external_data'|'task'), date,
  polarity('positive'|'negative'|'neutral'), tag, what, intensity, createdAt
}

// extraction_logs: 中間情報生成ログ（UNIQUE(sourceId, sourceType)で重複防止）
extractionLogs: {
  id, sourceId, sourceType, intermediateRecordId(FK→intermediateRecords nullable), createdAt
}

// memory_snapshots: 長期記憶スナップショット（Phase 2で生成）
memorySnapshots: {
  id, periodType('weekly'|'monthly'|'yearly'|'manual'|'past'),
  periodStart, periodEnd, achievements, struggles, interests,
  aiSummary, recommendedFocus, integratedAdvice, financeSummary, healthTrend, createdAt
}
```

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

## Phase 2：中間情報の抽出方針（対話データの扱い）

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

## 関連スペック

- `specs/features/004_import.md`
