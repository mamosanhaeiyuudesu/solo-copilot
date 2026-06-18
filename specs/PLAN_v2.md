# 計画書 v2 — スコープ絞り込み × タイムライン記憶ビューア

**作成日**: 2026-06-18  
**ステータス**: Draft

---

## 1. 方針転換のサマリー

「色々なデータを統合するオールインワンツール」から、**「自分の過去を蓄積・可視化する記憶ツール」** に軸足を移す。

| 変更 | 内容 |
|---|---|
| 削除 | タスク管理・健康管理・財務管理（機能・Coming Soonカードを含む）|
| 残す | チャット・データ取込・記憶ビューア |
| リニューアル | 記憶ビューアをリスト表示 → タイムライングラフへ |

---

## 2. 削除する機能

### 2-a. タスク管理（spec 003）
- DBテーブル: `tasks`, `tags`, `task_tags`
- APIルート: `/api/tasks/**`, `/api/tags/**`
- ページ: `app/pages/tasks.vue` および関連コンポーネント

> **注意**: `intermediate_records.source_type` に `task` という値があるが、今後は `imported_file` と `chat_message` のみを使用する。既存の `task` ソースの中間記憶は残しても問題ない（可視化はできる）。

### 2-b. ダッシュボード（spec 002）の簡略化
- タスク管理へのリンクカードを削除
- 健康管理・財務管理の Coming Soon カードを削除
- チャット・データ取込・記憶ビューアの3枚カードのみにする

### 2-c. 削除しないもの
- DBスキーマの `tasks` テーブルはマイグレーションの整合性のため物理削除しない（Drizzleのスキーマ定義からは削除してよい）

---

## 3. 記憶ビューアのリニューアル — タイムライン可視化

### 3-a. コンセプト

```
過去 ←─────────────────────────────────→ 現在

[年単位ビュー]  2023  |  2024  |  2025  |  2026
[月単位ビュー]  1月 | 2月| 3月 | 4月 | 5月 | 6月
[週単位ビュー]  w1 | w2 | w3 | w4 | ...
```

- 左が過去、右が現在・未来（時間は左→右に進む）
- 3種類のズームレベルを上部タブで切り替える
- 各セルに「主要な出来事の要約」が小さく表示される
- セルをクリックすると詳細パネルが開く

### 3-b. 3つのビュー定義

| ビュー名 | 表示範囲 | 1セル = | データソース |
|---|---|---|---|
| **週ビュー**（直近3か月） | 今日から過去3か月 | 1週間 | `memory_snapshots`（weekly） |
| **月ビュー**（直近1年） | 今日から過去12か月 | 1か月 | `memory_snapshots`（monthly） |
| **年ビュー**（全期間） | 最古データから現在 | 1年 | `memory_snapshots`（yearly） |

### 3-c. タイムラインセルの表示内容

各セルには以下を表示する：

```
┌─────────────────────────┐
│ 2026年5月               │
│ ████░░ +7 / -2 / ○3    │  ← polarity バー（正/負/中立の件数）
│ #仕事 #副業 #気持ち      │  ← 上位タグ（最大3つ）
│ 転職を本格検討し始めた   │  ← headline（10〜15文字）
└─────────────────────────┘
```

- polarityバー: `intermediate_records` の集計（正緑/負赤/中立グレー）
- タグ: その期間の上位テーマタグ（new: `memory_snapshots.top_themes` フィールドに保存）
- 見出し: `memory_snapshots.headline`（new）— AIが新聞見出し風に生成した10〜15文字の1フレーズ。`ai_summary` の冒頭切り出しではなく、バッチ時に専用指示で生成する

データが存在しない期間のセルは薄いグレーで「記録なし」と表示。

### 3-d. 詳細パネル（クリック時）

セルをクリックすると右側または下にスライドインするパネルを表示：

```
┌──────────────────────────────────────┐
│ 2026年5月（monthly）                  │
├──────────────────────────────────────┤
│ できていたこと                        │
│  · 副業案件に初めて声がかかった       │
│  · 毎週ジャーナリングを継続           │
├──────────────────────────────────────┤
│ 苦しんでいたこと                      │
│  · 本業との両立に疲れを感じた         │
├──────────────────────────────────────┤
│ 関心・気づき                          │
│  · AIコーチングへの関心が高まった     │
├──────────────────────────────────────┤
│ AIサマリー                            │
│  「この月は挑戦と疲弊が…」            │
├──────────────────────────────────────┤
│ 中間記憶 12件                         │
│  [#仕事: 5] [#副業: 4] [#気持ち: 3]  │
│  → 個別の中間記憶を一覧で確認         │
└──────────────────────────────────────┘
```

### 3-e. 過去データ（`past` タイプ）の扱い

- `past` タイプのスナップショット（幼少期・学生時代など）は、年ビューの左端に特別カード「過去の記録」として並べる
- 年代不明の場合は「過去」ラベルで最古に固定

---

## 4. タグの実態（修正）と長期記憶への活用

### 4-a. 中間記憶のタグ構造（コード確認済み）

計画初版では `tag` 単一フィールドと記載していたが、実際の `intermediate_records` は以下の構造（[server/db/schema.ts:69](server/db/schema.ts#L69)）：

| フィールド | 内容 | 例 |
|---|---|---|
| `polarity` | 感情の方向 | positive / negative / neutral |
| `emotionTags` | 感情タグ（JSON配列） | `["不安","自己不信"]` |
| `themeTags` | テーマタグ（JSON配列） | `["仕事","副業"]` |
| `what` | 何を考えていたか | — |
| `why` | その理由 | — |
| `intensity` | 重要度（1〜5） | — |

→ **中間記憶はすでに2系統でタグ付け済み**。これを長期記憶の組み立てに活かす。

### 4-b. 現状の長期記憶生成の問題

[snapshot.ts:99-115](server/utils/snapshot.ts#L99-L115) が **強度2以上のレコードをフラットなリストにしてAIに丸投げ** している。テーマ別の整理も、期間をまたぐ継続性の判定もない。結果として長期記憶が雑多になる。

### 4-c. タグで洗練する3レバー

**① テーマ別グルーピング（雑多さの解消）**
`themeTags` でレコードを束ねてからAIに渡す。テーマが混ざらず整理された要約になる。

**② 期間をまたぐ継続性で主要テーマを判定（選別の核心 = §4-d B案）**
週次スナップショットは現状それぞれ独立しており「先週も悩んでいた」継続を捉えられない。
- 何週も登場するテーマ = 人生の本筋（重要）
- 1回だけ = ノイズ
→ `intensity × 累積登場回数` でスコアリングし主要イベントを機械選別する。

**継続性の定義：累積頻度（採用）**
途切れても通算でカウントする「累積登場回数」を採用する（連続週数ではない）。一度途切れても再浮上するテーマ＝その人の根深いテーマを捉えやすいため。
- スコア = `intensity × そのテーマの累積登場回数`
- 累積は過去の全期間（または直近Nか月）の `intermediate_records` をテーマ別に集計して算出

**③ emotionTags で感情の軌跡を追う（グラフの主役）**
「不安」タグが月を追って減る＝回復の物語。emotionTags推移をスナップショットに保存し、タイムラインを「変化の物語」にする。

### 4-d. B案：主要イベント選別を統合した新・週次バッチ

```
1. 強度2以上のレコードを取得（既存）
2. themeTags でグルーピング                          ← 新規
3. テーマごとに集計（件数・polarity分布・peak intensity）
4. 主要イベント抽出：intensity高 かつ 主要テーマ所属の
   レコードを上位N件（intensity × テーマ継続性でスコア） ← B案
5. AIに渡す：
   - テーマ別に整理したデータ
   - 「主要イベントを選び、各々10〜15文字の headline を付けよ」
6. スナップショットに保存（§5-a の新カラム）
```

月次・年次は「継続テーマ」を引き継ぎ再集計。living_profile では継続テーマを人物像の中核に据える。

### 4-e. スナップショットに保存するタグ系データ

```typescript
topThemes:      '[{"theme":"仕事","count":5},{"theme":"副業","count":3}]'  // themeTags集計
emotionSummary: '[{"emotion":"不安","count":4},{"emotion":"前向き","count":2}]'  // emotionTags集計
polaritySummary:'{"positive":7,"negative":2,"neutral":3}'
headline:       '転職を本格検討し始めた'  // 主要イベント見出し（複数の場合はJSON配列も検討）
```

### 4-f. 既存スナップショットへの対応

既存の `memory_snapshots`（weekly）は新カラムが NULL。  
次回バッチで対象週が「未処理」として再処理されないため、バックフィル用APIまたは手動バッチを1回実行する。

---

## 5. DBスキーマ変更

### 5-a. 追加

```sql
-- memory_snapshots にカラム追加
ALTER TABLE memory_snapshots ADD COLUMN top_themes TEXT;       -- JSON: [{theme, count}]（themeTags集計）
ALTER TABLE memory_snapshots ADD COLUMN emotion_summary TEXT;  -- JSON: [{emotion, count}]（emotionTags集計）
ALTER TABLE memory_snapshots ADD COLUMN polarity_summary TEXT; -- JSON: {positive, negative, neutral}
ALTER TABLE memory_snapshots ADD COLUMN headline TEXT;         -- 主要イベント見出し（10〜15文字）
```

### 5-b. 削除（Drizzleスキーマから除くがDDLは残す）

- `tasks` テーブル
- `tags` テーブル
- `task_tags` テーブル

### 5-c. `intermediate_records.source_type` の変更

将来的に `task` は使わなくなるが、既存データとの互換性のため enum には残す。

---

## 6. 新しいページ構成

| URL | ページ | 変更 |
|---|---|---|
| `/` | ダッシュボード | チャット・取込・記憶ビューアの3カードのみ |
| `/chat` | チャット | 変更なし |
| `/import` | データ取込 | 変更なし |
| `/memory` | 記憶ビューア | タイムライン表示にリニューアル |
| `/tasks` | タスク管理 | **削除** |

---

## 7. 記憶ビューア UIの技術方針

### 水平スクロールタイムライン

```vue
<!-- 横スクロールコンテナ -->
<div class="overflow-x-auto flex gap-2 py-4">
  <TimelineCell
    v-for="period in periods"
    :key="period.id"
    :snapshot="period.snapshot"
    @click="openDetail(period)"
  />
</div>
```

- セルの幅は固定（週: 120px、月: 160px、年: 200px）
- 最右端が「現在」になるよう初期スクロール位置を設定
- スクロールバーは常時表示（横スクロールであることを示す）

### データ取得方針

- タイムライン表示に必要なデータは `GET /api/memory/snapshots` を既存のまま使用
- `top_themes`・`emotion_summary`・`polarity_summary`・`headline` を同エンドポイントのレスポンスに含める
- 詳細パネルは `GET /api/memory/snapshots/[id]` で取得（既存）

### polarity集計の追加取得

タイムラインセルのpolarity件数は、現在のAPIに含まれていない。  
オプションA: `memory_snapshots` に `polarity_summary` カラム追加（JSON: `{positive:N, negative:N, neutral:N}`）  
オプションB: タイムライン描画時に `/api/memory/intermediate` をperiod別に取得（リクエスト数が増える）

→ **オプションAを採用**（`top_themes`・`emotion_summary` と同時にカラム追加）

---

## 8. 実装タスク一覧（優先順）

### Phase A: スコープ整理（削除）

- [ ] `app/pages/tasks.vue` および関連コンポーネントの削除
- [ ] `server/api/tasks/**` および `server/api/tags/**` の削除
- [ ] `server/db/schema.ts` からtasks/tags/task_tags定義を削除
- [ ] ダッシュボード（`app/pages/index.vue`）からタスクカード・Coming Soonカードを削除

### Phase B: DBスキーマ変更

- [ ] `memory_snapshots` に `top_themes`・`emotion_summary`・`polarity_summary`・`headline`（すべてTEXT）カラムを追加
- [ ] Drizzleスキーマ更新 → マイグレーションSQL生成 → D1適用

### Phase C: バッチ処理の更新（B案 + タグ活用）

- [ ] 週次バッチ（[snapshot.ts](server/utils/snapshot.ts)）を改修：
  - `themeTags` でグルーピングしてからAIに渡す（テーマ別整理）
  - 主要イベント抽出ロジック（intensity × テーマ継続性でスコアリング → 上位N件）
  - AIへの追加指示「主要イベントを選び、各々10〜15文字の見出し（headline）を付けよ」
  - `top_themes`・`emotion_summary`・`polarity_summary`・`headline` を生成・保存
- [ ] 月次・年次バッチ：継続テーマを引き継いで再集計、`headline` は各レベルで独自生成
- [ ] living_profile：継続テーマを人物像の中核に反映
- [ ] 既存weekly スナップショットへのバックフィル用エンドポイント（1回限り）

### Phase D: APIの更新

- [ ] `GET /api/memory/snapshots` レスポンスに `topThemes`・`emotionSummary`・`polaritySummary`・`headline` を追加
- [ ] `GET /api/memory/snapshots/[id]` も同様

### Phase E: タイムラインUI実装（spec 007として別途作成）

- [ ] `app/pages/memory.vue` を全面リニューアル
- [ ] `app/components/memory/TimelineView.vue` — 横スクロールタイムライン
- [ ] `app/components/memory/TimelineCell.vue` — 1セル（期間・polarity・タグ・要約）
- [ ] `app/components/memory/DetailPanel.vue` — 詳細パネル（スライドイン）
- [ ] 3ズームレベルのタブ切り替えロジック

---

## 9. 残す中間記憶ビューア

タイムラインとは別に、現在の「中間記憶タブ（フィルタ付き一覧）」も残す。  
タイムラインは「期間単位の全体像」、中間記憶一覧は「個別レコードの検索・確認」として併存させる。

UIとしては：

```
[タイムライン] [中間記憶一覧]   ← 上部タブ

タイムラインタブ: 横スクロールタイムライン
中間記憶一覧タブ: 既存のフィルタ付きリスト（変更なし）
```

---

## 10. 未解決事項・TODO

| 項目 | 現状 | 方針案 |
|---|---|---|
| `past` タイプの年代情報 | period_start/end はあるが、幼少期だと不正確 | ビューア上で「過去の記録」として別枠で表示 |
| タイムラインの空きセル | スナップショットが存在しない週・月はセルなし or グレーアウト | グレーアウトで「記録なし」表示 |
| タイムラインのスクロール初期位置 | 未定 | 最右端（現在）にスクロール |
| モバイル対応 | 横スクロールはモバイルで使いにくい | タッチスクロール対応。スワイプで移動 |
| バックフィルの実行タイミング | 既存スナップショットに top_themes/emotion_summary/polarity_summary/headline がない | デプロイ後に「記憶を更新」ボタン1回押すだけで対応（バッチに含める） |

---

## 11. 変更しないもの

- チャット機能（006）— 変更なし
- データ取込機能（004）— 変更なし
- 中間記憶の抽出ロジック（`server/utils/extraction.ts`）— 変更なし
- living_profile とチャットへの注入 — 変更なし
- 認証（ADR-007）— 変更なし
