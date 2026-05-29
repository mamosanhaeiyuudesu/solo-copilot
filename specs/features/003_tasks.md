# タスク管理 スペック

**ステータス**: Done
**スペック番号**: 003
**作成日**: 2026-05-29

## 概要

todo / doing / done の3カラムカンバン形式でタスクを管理する。タグ付け・優先度・工数管理・期限管理に対応。

## 背景・動機

日々の行動を可視化し、AI がタスク進捗・パターンを把握するための基盤データを蓄積する（Phase 1-b/1-c）。

## 受入れ基準

- [x] /tasks でカンバン（todo / doing / done の3カラム）が表示される
- [x] タスクを新規作成できる（タイトル・概要・優先度・期日・見積工数・タグ）
- [x] タスクを編集・削除できる
- [x] ← → ボタンでステータスを前後に変更できる
- [x] done に変更したとき完了モーダルが表示される（実績工数・完了日時の入力 or スキップ）
- [x] done から戻したとき完了日時・実績工数がリセットされる
- [x] 期限切れタスク（期日 < 今日 かつ done でない）が赤表示される
- [x] 画面右上の設定ボタンからタグ管理モーダルが開く
- [x] タグの作成・編集・削除ができる

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/tasks` | 要 | 一覧取得（status・priority・tag_id で絞り込み可） |
| POST | `/api/tasks` | 要 | 新規作成 |
| GET | `/api/tasks/{id}` | 要 | 詳細取得 |
| PUT | `/api/tasks/{id}` | 要 | 更新 |
| DELETE | `/api/tasks/{id}` | 要 | 削除 |
| PATCH | `/api/tasks/{id}/status` | 要 | ステータス変更（done のとき actual_hours・completed_at も受け取る） |
| GET | `/api/tags` | 要 | タグ一覧 |
| POST | `/api/tags` | 要 | タグ新規作成 |
| PUT | `/api/tags/{id}` | 要 | タグ更新 |
| DELETE | `/api/tags/{id}` | 要 | タグ削除（task_tags も削除） |
| POST | `/api/tasks/{id}/tags` | 要 | タスクにタグ付与 |
| DELETE | `/api/tasks/{id}/tags/{tag_id}` | 要 | タスクからタグを外す |

## DBスキーマ変更

```typescript
// tasks テーブル
tasks: id, title, description, status, priority, due_date,
       completed_at, estimated_hours, actual_hours, created_at, updated_at

// tags テーブル
tags: id, name, description, color, created_at

// task_tags テーブル（中間テーブル）
task_tags: task_id(FK), tag_id(FK)  ※複合主キー
```

## ビジネスルール

- overdue = due_date < 今日 かつ status ≠ done（DBには持たずサーバー側で算出）
- done に変更 → completed_at を自動セット（リクエスト値 or 現在日時）
- done から戻す → completed_at・actual_hours を NULL にリセット

## 実装ファイル

- `server/db/schema.ts`（tasks, tags, task_tags テーブル追加）
- `server/api/tasks/index.get.ts`
- `server/api/tasks/index.post.ts`
- `server/api/tasks/[id].get.ts`
- `server/api/tasks/[id].put.ts`
- `server/api/tasks/[id].delete.ts`
- `server/api/tasks/[id]/status.patch.ts`
- `server/api/tags/index.get.ts`
- `server/api/tags/index.post.ts`
- `server/api/tags/[id].put.ts`
- `server/api/tags/[id].delete.ts`
- `server/api/tasks/[id]/tags/index.post.ts`
- `server/api/tasks/[id]/tags/[tag_id].delete.ts`
- `app/types/api.ts`（Task, Tag 型追加）
- `app/composables/useTasks.ts`
- `app/layouts/wide.vue`
- `app/pages/tasks.vue`
- `app/components/tasks/TaskCard.vue`
- `app/components/tasks/TaskModal.vue`
- `app/components/tasks/CompletionModal.vue`
- `app/components/tasks/TagModal.vue`
