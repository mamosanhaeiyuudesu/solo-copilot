# 認証システム スペック

**ステータス**: Done  
**スペック番号**: 001  
**作成日**: 2026-05-29

## 概要

パスワード1つによるシンプルな認証。ユーザー管理・アカウント登録なし。
パスワードは Cloudflare Secret で管理し、SHA-256 ハッシュを HttpOnly Cookie に保存するステートレス設計。

## 設計判断

- **ユーザー管理なし**: 個人利用のため不要
- **ステートレス**: DB にセッション情報を持たない（Cookie の値 = SHA-256(password)）
- **ローカル開発**: `import.meta.dev` が true の場合、middleware が認証をスキップ → パスワード不要
- **セキュリティ**: ローカルは localhost のみアクセス可 + `.env` は git 非管理 → 安全

## 受入れ基準

- [x] ローカル開発時（`yarn dev`）は認証スキップで直接アクセスできる
- [x] 本番では `NUXT_ACCESS_PASSWORD` と一致するパスワードで認証できる
- [x] 認証成功で HttpOnly Cookie が 30 日間有効で設定される
- [x] Cookie が有効な間は再認証不要
- [x] ログアウトで Cookie が削除される
- [x] 不正なパスワードは 401 エラーになる
- [x] 認証なしで `/api/agent/**` 等に直接アクセスすると 401 になる

## APIルート

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/auth/verify` | 不要 | パスワード認証・Cookie 設定 |
| GET | `/api/auth/check` | 要 | 認証状態確認（200 = 認証済み） |
| POST | `/api/auth/logout` | 不要 | Cookie 削除 |

## 実装ファイル

- `server/middleware/auth.ts` — 全 API に認証チェック適用
- `server/utils/auth.ts` — Cookie の設定・確認・削除
- `server/api/auth/verify.post.ts`
- `server/api/auth/check.get.ts`
- `server/api/auth/logout.post.ts`
- `app/composables/useAuth.ts`
- `app/components/AuthModal.vue`

## 本番セットアップ

```bash
wrangler secret put NUXT_ACCESS_PASSWORD
```
