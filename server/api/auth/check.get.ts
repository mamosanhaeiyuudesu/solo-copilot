// 認証チェック用エンドポイント（middleware が 401 を返す、成功なら認証済み）
export default defineEventHandler(() => {
  return { ok: true }
})
