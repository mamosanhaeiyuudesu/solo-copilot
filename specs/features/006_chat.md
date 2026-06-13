# チャット スペック

**ステータス**: Done
**スペック番号**: 006
**作成日**: 2026-06-13

## 概要

Claude とリアルタイムでストリーミング対話できるチャット機能。会話履歴を D1 に永続化し、living_profile をシステムプロンプトに注入することでAIが自分を深く理解した上で対話する。チャットのやり取りから自動的に中間記憶を抽出する。

## 背景・動機

Phase 2-b：「自分のデータを知った上でのAI対話」を実現する基盤。会話履歴は永続化され、living_profile の更新により対話の精度が継続的に向上する。

## 受入れ基準

- [x] /chat で最新の会話（または新規会話）に接続してチャットが始まる
- [x] メッセージ送信でClaude がストリーミング応答する
- [x] ユーザーメッセージ・アシスタントメッセージをDBに保存する
- [x] ページを再読み込みしても直近10件のメッセージが復元される
- [x] アシスタントメッセージ保存後、未処理メッセージが10件以上あれば自動で中間記憶を抽出する
- [x] 中間記憶が生成されるとトーストで件数を表示する
- [x] living_profile が存在する場合はシステムプロンプトの先頭に注入する
- [x] システムプロンプトを設定モーダルで変更・保存できる（localStorageに保存）
- [x] クイック送信ボタンで定型文を即送信できる
- [x] ユーザーメッセージを削除できる（対になるアシスタントメッセージも同時削除）
- [x] 認証済みユーザーのみ使用できる

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/conversations` | 要 | 新規会話セッション作成 |
| GET | `/api/conversations/current` | 要 | 最新会話IDを返す（なければ新規作成） |
| GET | `/api/conversations/[id]/messages` | 要 | メッセージ一覧取得（`?limit=N` で直近N件） |
| POST | `/api/conversations/[id]/messages` | 要 | メッセージ保存（アシスタント保存後に自動抽出判定） |
| POST | `/api/agent/chat` | 要 | Claude ストリーミング応答（living_profile を注入） |
| POST | `/api/agent/chat-extract` | 要 | チャットメッセージの中間記憶バッチ抽出（手動用） |

### GET /api/conversations/[id]/messages クエリパラメータ

- `limit`: number（省略時は全件取得、指定時は新しい順で取得後に時系列に並び替え）

### POST /api/conversations/[id]/messages リクエスト

```typescript
{ role: 'user' | 'assistant'; content: string }
```

### POST /api/conversations/[id]/messages レスポンス

```typescript
{ id: string; extracted: number }  // extracted: 自動抽出した中間記憶件数（0の場合が多い）
```

### POST /api/agent/chat リクエスト

```typescript
{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  systemPrompt?: string  // 省略時はデフォルトカウンセラープロンプト
}
```

### POST /api/agent/chat-extract リクエスト

```typescript
{
  messages: Array<{ id: string; content: string; timestamp?: string }>
}
```

## DBスキーマ変更

```typescript
// conversations: チャット会話セッション
conversations: {
  id, title, createdAt, updatedAt
}

// messages: 個々のメッセージ
messages: {
  id, conversationId(FK→conversations), role('user'|'assistant'), content, createdAt
}
```

## 自動抽出ロジック

アシスタントメッセージ保存後に以下の処理を実行する：

1. 同会話の全メッセージIDを取得
2. `extraction_logs` に `sourceType='chat_message'` で登録済みのIDを除外
3. 未処理メッセージ数が `EXTRACTION_THRESHOLD`（=10）以上なら抽出実行
4. 未処理メッセージ全件を `User: ... / Assistant: ...` 形式に結合して Claude に渡す
5. 抽出結果を `intermediate_records` に保存
6. 未処理メッセージ全件を `extraction_logs` に登録（`sourceId` は先頭メッセージのID）
7. 抽出件数をレスポンスの `extracted` に返す

抽出失敗はメッセージ保存の成否に影響させない（try/catch でサイレント処理）。

## システムプロンプト設計

```
[living_profile の aiSummary（存在する場合）]

---

[ユーザー設定のシステムプロンプト（デフォルト: カウンセラープロンプト）]
```

デフォルトプロンプトは傾聴・受け止め・寄り添いを重視するカウンセラーペルソナ。

## 実装ファイル

- `server/db/schema.ts` — conversations, messages テーブル
- `server/api/conversations/index.post.ts`
- `server/api/conversations/current.get.ts`
- `server/api/conversations/[id]/messages.get.ts`
- `server/api/conversations/[id]/messages.post.ts`
- `server/api/agent/chat.post.ts`
- `server/api/agent/chat-extract.post.ts`
- `server/utils/extraction.ts`（抽出ロジック共通）
- `app/pages/chat.vue`
- `app/layouts/chat.vue`
- `app/composables/useStream.ts`

## 関連スペック

- `specs/features/005_memory.md`
