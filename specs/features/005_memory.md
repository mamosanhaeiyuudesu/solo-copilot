# 記憶ビューア スペック

**ステータス**: Done
**スペック番号**: 005
**作成日**: 2026-05-30
**最終更新**: 2026-06-18（タイムライン可視化・タグ活用バッチへリニューアル）

## 概要

中間記憶（intermediate_records）と長期記憶（memory_snapshots）の生成・閲覧を実装する。インポートデータまたはチャットメッセージからAIが中間記憶を抽出し、週次→月次→年次→living_profileと段階的に集約する。

長期記憶は**タイムライングラフ**で可視化する。左（過去）→右（現在）に時間が進み、週/月/年の3ズームで自分の変化をたどれる。各セルには主要イベントの見出し・テーマタグ・感情の方向（polarity）を端的に表示し、クリックで詳細を見る。

## 背景・動機

AIが生成した自己理解データを可視化し、自分の行動・感情・成長の傾向を把握できるようにする。蓄積された中間記憶をバッチ処理でスナップショットに集約し、チャットのシステムプロンプトに注入することでAIが文脈を持てるようにする。

2026-06 のスコープ絞り込みで、長期記憶を「リスト表示」から「タイムライングラフ」へリニューアルした。あわせて、中間記憶のタグ（themeTags / emotionTags）を活用して長期記憶の生成を洗練させた（テーマ別整理＋継続テーマ重視）。

## 受入れ基準

- [x] 「タイムライン」と「中間記憶」のタブ切り替えができる
- [x] タイムラインタブ：週/月/年の3ズームを切り替えられる（週=直近3か月・月=直近1年・年=全期間）
- [x] タイムラインは左（過去）→右（現在）に並び、初期表示は最右端（現在）にスクロールされる
- [x] 各セルに期間ラベル・polarityバー・上位テーマタグ・headline（主要イベント見出し）が表示される
- [x] セルをクリックすると詳細パネル（headline・テーマ/感情タグ・できていること・苦しんでいること・関心・AIサマリー）が開く
- [x] `past` タイプのスナップショットは年ビューの最左（最古）に表示する
- [x] データがない期間のセルは「記録なし」と表示する
- [x] 中間記憶タブ：polarity・タグ（感情/テーマ）・期間・ソース種別でフィルタリングできる
- [x] 中間記憶タブ：日付・ソース・polarity・タグ・what・intensityが一覧表示される
- [x] 中間記憶タブ：データがない場合は空状態を表示する
- [x] 閲覧専用（タイムライン・スナップショットは編集・削除UIなし。中間記憶は一括削除のみ可）
- [x] 認証済みユーザーのみ表示される
- [x] インポートデータからAIが中間記憶を自動抽出する
- [x] チャット中に未処理メッセージが10件以上になると自動で中間記憶を抽出する
- [x] バッチ実行で週次→月次→年次→living_profileのスナップショットを生成する
- [x] バッチで各スナップショットに headline・top_themes・emotion_summary・polarity_summary を生成・保存する
- [x] 既存スナップショット（新カラムNULL）はバッチ再実行で自動バックフィルされる
- [x] living_profileをチャットのシステムプロンプトに注入する

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/memory/intermediate` | 要 | 中間記憶一覧取得 |
| DELETE | `/api/memory/intermediate` | 要 | 中間記憶一括削除（`{ ids: string[] }` を body で受け取る） |
| GET | `/api/memory/snapshots` | 要 | スナップショット一覧取得（全カラム返す） |
| GET | `/api/memory/snapshots/[id]` | 要 | スナップショット詳細取得（全カラム返す） |
| POST | `/api/memory/batch` | 要 | スナップショット一括生成＋バックフィル |
| GET | `/api/memory/profile` | 要 | living_profile レコードを1件取得 |

### GET /api/memory/intermediate クエリパラメータ

- `polarity`: `positive` | `negative` | `neutral`（省略可）
- `tag`: string（省略可）
- `sourceType`: `imported_file` | `chat_message`（省略可）
- `dateFrom`: string（省略可、YYYY-MM-DD）
- `dateTo`: string（省略可、YYYY-MM-DD）

### GET /api/memory/snapshots

- タイムラインは全 periodType を取得してクライアント側でズームに振り分けるため、UIからはクエリ無しで呼ぶ
- `periodType`: `weekly` | `monthly` | `yearly` | `manual` | `past`（省略可。指定時はその種別のみ）
- living_profile は一覧に含めない（専用パネルで表示）
- レスポンスには新カラム `headline` / `topThemes` / `emotionSummary` / `polaritySummary` が含まれる（`select()` で全カラム返すため API 側の追加実装は不要）

### POST /api/memory/batch レスポンス

```typescript
{ weekly: number; monthly: number; yearly: number; livingProfile: boolean }
```

※ バックフィルで既存スナップショットを更新した場合もカウントに含まれる。

## DBスキーマ

```typescript
// intermediate_records: 中間記憶（タグは2系統 + 理由を保持）
intermediateRecords: {
  id, sourceId, sourceType('imported_file'|'chat_message'), date,
  polarity('positive'|'negative'|'neutral'),
  emotionTags,  // JSON配列文字列 例: '["不安","自己不信"]'
  themeTags,    // JSON配列文字列 例: '["仕事","副業"]'
  what, why, intensity(1-5), createdAt
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
  aiSummary, recommendedFocus, integratedAdvice, financeSummary, healthTrend,
  // ↓ タイムライン可視化用（migration 0012 で追加）
  headline,          // 主要イベント見出し（10〜15文字）
  topThemes,         // JSON: [{theme, count}]（themeTags集計）
  emotionSummary,    // JSON: [{emotion, count}]（emotionTags集計）
  polaritySummary,   // JSON: {positive, negative, neutral}
  createdAt
}
```

### living_profile レコードのフィールド利用方針

| フィールド | 用途 |
| --- | --- |
| `aiSummary` | プロファイル本文（~500トークンのプレーンテキスト）。チャット・ツールのシステムプロンプトに注入する |
| `recommendedFocus` | 現在の優先事項（1〜3行）。ツールの quick reference 用 |
| `periodEnd` | プロファイルの鮮度確認用（最後に処理した週の periodEnd） |
| その他フィールド | null |

## 実装ファイル

- `server/db/schema.ts` — intermediateRecords, extractionLogs, memorySnapshots テーブル
- `server/migrations/0012_snapshot_timeline_columns.sql` — headline / top_themes / emotion_summary / polarity_summary 追加
- `server/api/memory/intermediate.get.ts` / `intermediate.delete.ts`
- `server/api/memory/snapshots.get.ts` / `snapshots/[id].get.ts`
- `server/api/memory/batch.post.ts`
- `server/api/memory/profile.get.ts`
- `server/utils/snapshot.ts` — スナップショット生成ロジック（週次・月次・年次・living_profile＋タグ集計・継続性スコアリング）
- `app/pages/memory.vue` — タブUI（タイムライン / 中間記憶）・詳細パネル
- `app/components/memory/TimelineView.vue` — 横スクロールタイムライン＋ズーム切り替え
- `app/components/memory/TimelineCell.vue` — 1セル（期間・polarityバー・テーマタグ・headline）

## タイムラインUIの方針

### 3つのビュー

| ビュー | 表示範囲 | 1セル | データソース | セル幅 |
|---|---|---|---|---|
| 週ビュー | 今日から過去3か月 | 1週間 | `memory_snapshots`（weekly） | w-32 |
| 月ビュー | 今日から過去12か月 | 1か月 | `memory_snapshots`（monthly） | w-40 |
| 年ビュー | 全期間 | 1年 | `memory_snapshots`（yearly + past） | w-48 |

### セルの表示内容

- 期間ラベル（週: `M/D〜` / 月: `YYYY年M月` / 年: `YYYY年` / past: `過去`）
- polarityバー: `polaritySummary` を正(緑)/負(赤)/中立(グレー)の幅で表示
- テーマタグ: `topThemes` の上位3件（`#テーマ`）
- headline: 無い場合は `aiSummary` 冒頭でフォールバック。両方無ければ「記録なし」

### 挙動

- 左（過去）→右（現在）。`past` は常に最左に固定
- 初期スクロール位置は最右端（現在）
- セルクリックで詳細パネルをタイムライン直下に表示（`GET /api/memory/snapshots/[id]`）
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
intermediate_records（原子的観察・themeTags/emotionTags付き）
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
- **バックフィル**：既存スナップショットで新カラム（`top_themes`）が NULL のものは、スキップせず UPDATE で埋める。「記憶を更新」ボタン1回で既存データも更新される

### タグ活用による洗練（2026-06 追加）

長期記憶を「強度2以上のレコードをフラットに丸投げ」から、**テーマ別整理＋継続テーマ重視**へ変更した。

**① テーマ別グルーピング**
週次バッチで `themeTags` ごとにレコードを束ねてからAIに渡す（テーマが混ざらない整理された要約）。

**② 継続性スコアリング（累積頻度）= 主要イベント選別**
- 週次スナップショットは独立しており「継続」を捉えられないため、**累積登場回数**（途切れても通算でカウント）を継続性の指標とする
- `cumulativeThemeCounts(db, periodEnd)`：periodEnd までの全 intermediate_records を themeTags で集計
- 主要イベント = `intensity × そのレコードのテーマの累積登場回数（最大）` で上位N件（週次=6件）
- 継続しているテーマに属する強い出来事ほど上位に来る

**③ 感情の軌跡**
`emotionTags` を集計して `emotion_summary` に保存。期間を追った感情の変化をタイムラインで追える。

### 各バッチの入出力

**週次バッチ**
- 入力：対象週の `intermediate_records`（intensity ≥ 2 のみ）＋ periodEnd までの累積テーマ集計
- 処理：テーマ別グルーピング → 主要イベント選別 → AI が headline/achievements/struggles/interests/aiSummary を生成（claude-haiku-4-5-20251001）。あわせて top_themes/emotion_summary/polarity_summary を集計
- 出力：`memory_snapshots`（weekly）

**月次バッチ**
- 入力：対象月の `memory_snapshots`（weekly）
- 処理：子スナップショットの top_themes/emotion_summary/polarity_summary を合算。AI が headline 等を生成
- 出力：`memory_snapshots`（monthly）

**年次バッチ**
- 入力：対象年の `memory_snapshots`（monthly）
- 出力：`memory_snapshots`（yearly）

### living_profile の更新方式

**週次ローリング更新（rolling）**
- 入力：前回の `living_profile` + 直近2件の `weekly` スナップショット
- 同月内の週次のみ新規生成された場合に使用

**月次フルリビルド（full）**
- 入力：`yearly` 全件 + `monthly` 直近3件 + `weekly` 直近4件 + **継続テーマ上位8件**（累積登場回数）
- 月またぎ（monthly or yearly が新規生成された場合）に使用
- 「継続して向き合っているテーマ」を人物像の中核に据えるようプロンプトで指示する

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
