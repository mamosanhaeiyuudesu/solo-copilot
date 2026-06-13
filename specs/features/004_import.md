# 外部データ取り込み スペック

**ステータス**: Done
**スペック番号**: 004
**作成日**: 2026-05-30

## 概要

ChatGPT・Claude・日記などの外部テキストをアップロードし、`imported_files` として保存する。
アップロード後に自動で中間記憶（`intermediate_records`）を抽出する。

## 背景・動機

過去の行動・思考ログを取り込み、AIが自分を深く理解するための素材とする。
ファイルのアップロード → 保存 → AI抽出 をワンフローで完結させる。

## 受入れ基準

- [x] テキストを貼り付けてインポートできる（ファイル名・内容の日時・テキスト本文を入力）
- [x] ファイルは `.txt` として `POST /api/import/upload` に送信される
- [x] アップロード後、自動で `POST /api/import/process` が実行され中間記憶が生成される
- [x] インポートファイル一覧（ファイル名・サイズ・ステータス・日時）が表示される
- [x] ステータスはアップロード中→処理中→完了（またはエラー）と遷移する
- [x] 認証済みユーザーのみ操作できる

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/import/upload` | 要 | ファイルアップロード。8000文字を超える場合はチャンク分割して保存 |
| GET | `/api/import/files` | 要 | インポートファイル一覧取得 |
| POST | `/api/import/process` | 要 | pending ファイルを Claude で分析し中間記憶を生成 |

### POST /api/import/upload リクエスト

multipart/form-data:
- `files`: File[] (複数可)

### POST /api/import/upload レスポンス

```typescript
{ ids: string[] }  // 作成した importedFiles の ID 配列
```

### GET /api/import/files レスポンス

```typescript
{
  files: Array<{
    id: string
    fileName: string
    content: string
    status: 'pending' | 'processing' | 'done' | 'error'
    createdAt: string
    updatedAt: string
  }>
}
```

### POST /api/import/process レスポンス

```typescript
{ success: number; error: number; skipped: number; total: number }
```

## DBスキーマ変更

```typescript
// imported_files: 1ファイル（またはチャンク）= 1レコード
importedFiles: {
  id, fileName, content, status('pending'|'processing'|'done'|'error'),
  createdAt, updatedAt
}
```

## ビジネスルール

- ファイル内容が 8000 文字を超える場合は自動チャンク分割し、ファイル名に①②…を付与して複数レコード保存
- アップロード後にフロント側から `POST /api/import/process` を呼び出し、中間記憶生成まで完結させる
- `extraction_logs` の `UNIQUE(sourceId, 'imported_file')` により同じファイルの二重処理を防ぐ
- 処理済みファイルのステータスは `done`、失敗時は `error` に更新する

## 実装ファイル

- `server/db/schema.ts` — importedFiles テーブル
- `server/api/import/upload.post.ts`
- `server/api/import/files.get.ts`
- `server/api/import/process.post.ts`
- `server/utils/extraction.ts` — Claude抽出ロジック
- `app/pages/import.vue`

## 関連スペック

- `specs/features/005_memory.md`
