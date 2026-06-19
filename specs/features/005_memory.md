# 記憶ビューア スペック

**ステータス**: Done
**スペック番号**: 005
**作成日**: 2026-05-30
**最終更新**: 2026-06-19（12固定テーマタグ・tagSummaries構造・living_profile廃止）

## 概要

中間記憶（intermediate_records）と長期記憶（memory_snapshots）の生成・閲覧を実装する。インポートデータまたはチャットメッセージからAIが中間記憶を抽出し、週次→月次→年次と段階的に集約する。

長期記憶は**タイムライングラフ**で可視化する。左（過去）→右（現在）に時間が進み、週/月/年の3ズームで自分の変化をたどれる。各セルにはテーマタグ（ネット感情で色付け）とpolarityバーを表示し、クリックで詳細を見る。

## 背景・動機

AIが生成した自己理解データを可視化し、自分の行動・感情・成長の傾向を把握できるようにする。蓄積された中間記憶をバッチ処理でスナップショットに集約する。

2026-06 リニューアルで以下の設計変更を行った：
- 中間記憶のタグを **12固定テーマタグ** に絞り込み（フリーテキスト廃止）
- `emotion_tags` 廃止。polarity は `positive | negative` の2値のみ
- `memory_snapshots` のカラムを `tag_summaries` 1本に集約（headline・aiSummary・achievements・struggles等を廃止）
- `living_profile` 廃止（チャットへのプロファイル注入なし）
- 全データ再抽出ボタン（`POST /api/memory/reextract`）を追加

## 12固定テーマタグ

```
発明, 心理, 子育て, 剣道, 夫婦, 会社, AI, マーケティング, 転職, 親との関係, 節約, 地方創生
```

中間記憶の抽出時、各レコードにこのリストから0〜2個のタグを付与する。リスト外のタグは保存しない。

## 受入れ基準

- [x] 「タイムライン」と「中間記憶」のタブ切り替えができる
- [x] タイムラインタブ：週/月/年の3ズームを切り替えられる（週=直近3か月・月=直近1年・年=全期間）
- [x] タイムラインは左（過去）→右（現在）に並び、初期表示は最右端（現在）にスクロールされる
- [x] 各セルに期間ラベル・polarityバー・上位3テーマタグ（ネット感情で色付け）が表示される
- [x] セルをクリックすると詳細パネル（tagSummariesのテーマ別pos/neg件数・pos/negサマリー文）が開く
- [x] `past` タイプのスナップショットは年ビューの最左（最古）に表示する
- [x] データがない期間のセルは「記録なし」と表示する
- [x] 中間記憶タブ：polarity・テーマタグ・期間・ソース種別でフィルタリングできる
- [x] 中間記憶タブ：日付・ソース・polarity・タグ・what・intensityが一覧表示される
- [x] 中間記憶タブ：データがない場合は空状態を表示する
- [x] 閲覧専用（タイムライン・スナップショットは編集・削除UIなし。中間記憶は一括削除のみ可）
- [x] 認証済みユーザーのみ表示される
- [x] インポートデータからAIが中間記憶を自動抽出する
- [x] チャット中に未処理メッセージが10件以上になると自動で中間記憶を抽出する
- [x] バッチ実行で週次→月次→年次のスナップショットを生成する（living_profile は廃止）
- [x] 既存スナップショット（tagSummaries が NULL）はバッチ再実行で自動バックフィルされる
- [x] 「全データ再抽出」ボタンで既存の中間記憶・スナップショットを破棄し新タグ体系で再抽出できる

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/memory/intermediate` | 要 | 中間記憶一覧取得 |
| DELETE | `/api/memory/intermediate` | 要 | 中間記憶一括削除（`{ ids: string[] }` を body で受け取る） |
| GET | `/api/memory/snapshots` | 要 | スナップショット一覧取得（全カラム返す） |
| GET | `/api/memory/snapshots/[id]` | 要 | スナップショット詳細取得（全カラム返す） |
| POST | `/api/memory/batch` | 要 | スナップショット一括生成＋バックフィル |
| POST | `/api/memory/reextract` | 要 | 全データ再抽出（既存の中間記憶・スナップショット・ログを削除して再生成） |

### GET /api/memory/intermediate クエリパラメータ

- `polarity`: `positive` | `negative`（省略可）
- `tag`: string（省略可）
- `sourceType`: `imported_file` | `chat_message`（省略可）
- `dateFrom`: string（省略可、YYYY-MM-DD）
- `dateTo`: string（省略可、YYYY-MM-DD）

### GET /api/memory/snapshots

- タイムラインは全 periodType を取得してクライアント側でズームに振り分けるため、UIからはクエリ無しで呼ぶ
- `periodType`: `weekly` | `monthly` | `yearly` | `manual` | `past`（省略可。指定時はその種別のみ）
- レスポンスには `tagSummaries` カラムが含まれる（`select()` で全カラム返すため API 側の追加実装は不要）

### POST /api/memory/batch レスポンス

```typescript
{ weekly: number; monthly: number; yearly: number }
```

### POST /api/memory/reextract レスポンス

```typescript
{ files: number; fileRecords: number; chatRecords: number }
```

## DBスキーマ

```typescript
// intermediate_records: 中間記憶（12固定テーマタグ・pos/negのみ）
intermediateRecords: {
  id, sourceId, sourceType('imported_file'|'chat_message'), date,
  polarity('positive'|'negative'),   // neutral は廃止
  themeTags,   // JSON配列文字列 例: '["AI","転職"]'（12固定リストから0〜2個）
  what, why, intensity(1-5), createdAt
  // emotionTags は廃止（migration 0014）
}

// extraction_logs: 中間記憶生成ログ（UNIQUE(sourceId, sourceType)で重複防止）
extractionLogs: {
  id, sourceId, sourceType, intermediateRecordId(FK→intermediateRecords nullable), createdAt
}

// memory_snapshots: 長期記憶（tagSummaries 1本に集約）
memorySnapshots: {
  id, periodType('weekly'|'monthly'|'yearly'|'manual'|'past'),
  periodStart, periodEnd,
  tagSummaries,   // JSON: [{tag, posCount, negCount, positive, negative}]
  createdAt
  // living_profile periodType は廃止（migration 0014）
  // achievements/struggles/interests/aiSummary/headline 等は廃止（migration 0014）
}
```

### tagSummaries の構造

```typescript
interface TagSummary {
  tag: string       // 12固定テーマタグのいずれか
  posCount: number  // ポジティブな記録の件数
  negCount: number  // ネガティブな記録の件数
  positive: string  // AI生成：ポジティブ面の要約文
  negative: string  // AI生成：ネガティブ面の要約文
}
```

## 実装ファイル

- `server/db/schema.ts` — intermediateRecords, extractionLogs, memorySnapshots テーブル
- `server/migrations/0014_tag_summaries_simplify.sql` — tagSummaries追加・旧カラム削除・living_profile行削除
- `server/utils/extraction.ts` — 中間記憶抽出ロジック（12固定タグ・pos/neg only）
- `server/api/memory/intermediate.get.ts` / `intermediate.delete.ts`
- `server/api/memory/snapshots.get.ts` / `snapshots/[id].get.ts`
- `server/api/memory/batch.post.ts`
- `server/api/memory/reextract.post.ts`
- `server/utils/snapshot.ts` — スナップショット生成ロジック（週次・月次・年次・テーマ別AI要約）
- `app/pages/memory.vue` — タブUI（タイムライン / 中間記憶）・詳細パネル・再抽出ボタン
- `app/components/memory/TimelineView.vue` — 横スクロールタイムライン＋ズーム切り替え
- `app/components/memory/TimelineCell.vue` — 1セル（期間・polarityバー・テーマタグ色付け）

## タイムラインUIの方針

### 3つのビュー

| ビュー | 表示範囲 | 1セル | データソース | セル幅 |
|---|---|---|---|---|
| 週ビュー | 今日から過去3か月 | 1週間 | `memory_snapshots`（weekly） | w-32 |
| 月ビュー | 今日から過去12か月 | 1か月 | `memory_snapshots`（monthly） | w-40 |
| 年ビュー | 全期間 | 1年 | `memory_snapshots`（yearly + past） | w-48 |

### セルの表示内容

- 期間ラベル（週: `M/D〜` / 月: `YYYY年M月` / 年: `YYYY年` / past: `過去`）
- polarityバー: `tagSummaries` 全体の posCount/negCount 合計を緑(ポジ)/赤(ネガ)の幅で表示
- テーマタグ: 件数降順で上位3件。`posCount > negCount` → emerald（緑）、`negCount > posCount` → red（赤）、同数 → slate（グレー）

### 挙動

- 左（過去）→右（現在）。`past` は常に最左に固定
- 初期スクロール位置は最右端（現在）
- セルクリックで詳細パネルをタイムライン直下に表示
- 横スクロール（モバイルはタッチスクロール対応）

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
intermediate_records（原子的観察・themeTags付き・pos/neg）
    ↓ 週次バッチ
memory_snapshots（weekly）
    ↓ 月次バッチ
memory_snapshots（monthly）
    ↓ 年次バッチ
memory_snapshots（yearly）
```

チャットへのプロファイル注入は廃止。

### バッチ処理の基本ルール

- **対象は「完了したperiod」のみ**。periodEnd < 今日 の週・月・年のみ処理する
- **未処理期間を遡って全て埋める**。最後のスナップショットのperiodEnd以降の全完了期間を順番に生成する
- intermediate_records が存在しない期間はスナップショット生成をスキップする（空スナップショットは作らない）
- **バックフィル**：既存スナップショットで `tagSummaries` が NULL のものは UPDATE で埋める。「記憶を更新」ボタン1回で既存データも更新される

### テーマ別AI要約（週次バッチ）

1. 対象期間の intermediate_records をテーマタグごとにグルーピング
2. タグごとに pos/neg レコードを Claude haiku に渡し `{positive, negative}` の要約文を生成
3. `tagSummaries` に `[{tag, posCount, negCount, positive, negative}]` として保存

月次・年次は子スナップショットの `tagSummaries` を集約（mergeChildTagSummaries）し、再度AI要約を生成する。

### トリガー

- **手動**：memoryページの「記憶を更新」ボタン（`POST /api/memory/batch`）
- **将来**：Cloudflare Cron（週次 `0 6 * * 1`、月次 `0 6 1 * *`）
- チャット開始時の自動実行はしない

## 関連スペック

- `specs/features/004_import.md`
- `specs/features/006_chat.md`
