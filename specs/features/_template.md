# [機能名] スペック

**ステータス**: Draft | Ready | In Progress | Done  
**スペック番号**: NNN  
**作成日**: YYYY-MM-DD

## 概要（1〜2文）

この機能が何をするかを端的に説明する。

## 背景・動機

なぜこの機能が必要か。どのユーザーストーリーを解決するか。

## 受入れ基準

- [ ] ユーザーは〜できる
- [ ] 〜の場合、エラーメッセージが表示される
- [ ] 〜のデータが D1 に保存される

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/xxx/yyy` | 要 | ... |

### リクエスト

```typescript
{
  field: string
}
```

### レスポンス

```typescript
{
  id: string
  field: string
}
```

## DBスキーマ変更

（既存スキーマへの追加・変更がある場合に記述）

```typescript
// server/db/schema.ts に追加するテーブル or カラム
```

## 実装ファイル

- `server/api/xxx/yyy.post.ts`
- `server/utils/xxx.ts`（必要に応じて）
- `app/composables/useXxx.ts`
- `app/pages/xxx.vue` or `app/components/Xxx.vue`

## 実装メモ

（実装時に気づいたことをここに書く）

## 関連スペック

- `specs/features/NNN_xxx.md`
