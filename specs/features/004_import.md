# 外部データ取り込み スペック

**ステータス**: In Progress
**スペック番号**: 004
**作成日**: 2026-05-30

## 概要

ChatGPT・Claude・日記などの外部ファイルをアップロードし、raw_external_dataとして保存する。処理状況をバッチ単位で確認できる。

## 背景・動機

過去の行動・思考ログを取り込み、Phase 2のAI処理（中間情報生成）の入力データとする。Phase 1ではファイルの保存とバッチ管理のみ。AIによる解析はPhase 2で行う。

## 受入れ基準

- [x] ソース種別（ChatGPT / Claude / 日記 / その他）を選択できる
- [x] 複数ファイルを同時にアップロードできる
- [x] アップロードしたファイルがraw_external_dataとimport_batchesに保存される
- [x] インポートバッチ一覧（ファイル名・ソース・総件数・処理済み件数・ステータス）が表示される
- [x] 認証済みユーザーのみ操作できる
- [x] ファイルアップロード後、自動で中間データ生成まで実行される
- [x] ステータスはアップロード中→処理中→完了（またはエラー）と遷移する

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/import/upload` | 要 | ファイルアップロード・バッチ作成 |
| GET | `/api/import/batches` | 要 | バッチ一覧取得 |

### POST /api/import/upload リクエスト

multipart/form-data:
- `sourceType`: `chatgpt` | `claude` | `diary` | `other`
- `files`: File[] (複数可)

### POST /api/import/upload レスポンス

```typescript
{
  batches: Array<{
    id: string
    fileName: string
    sourceType: string
    status: string
  }>
}
```

### GET /api/import/batches レスポンス

```typescript
{
  batches: Array<{
    id: string
    fileName: string
    sourceType: string
    status: string
    createdAt: string
  }>
}
```

## DBスキーマ変更

```typescript
// import_batches: インポートバッチ管理（1ファイル = 1バッチ）
importBatches: {
  id, fileName, status, createdAt, updatedAt
}

// raw_external_data: 外部データ生データ
rawExternalData: {
  id, batchId(FK→importBatches), sourceType, fileName, content, status, createdAt
}
```

## 実装ファイル

- `server/db/schema.ts` — importBatches, rawExternalData テーブル追加
- `server/api/import/upload.post.ts`
- `server/api/import/batches.get.ts`
- `server/api/import/process.post.ts`（Phase 2: raw_external_data → intermediate_records）
- `server/api/import/process-tasks.post.ts`（Phase 2: tasks → intermediate_records）
- `server/utils/extraction.ts`（Phase 2: Claude抽出ロジック）
- `app/pages/import.vue`

## ビジネスルール

- 1ファイル = 1バッチ。複数ファイルアップロード時は複数バッチが作成される
- アップロード後、即座に中間データ生成（/api/import/process）まで自動実行する
- ファイル内容はテキストとしてD1に保存

## 関連スペック

- `specs/features/005_memory.md`
