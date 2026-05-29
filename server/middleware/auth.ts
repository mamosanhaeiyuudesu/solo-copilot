export default defineEventHandler(async (event) => {
  // nuxt dev（dev:ui）では import.meta.dev = true
  // wrangler dev --remote では accessPassword 未設定でスキップ
  const { accessPassword } = useRuntimeConfig(event)
  if (import.meta.dev || !accessPassword) return

  const path = getRequestURL(event).pathname

  // APIルート以外（フロントエンドページ）はスキップ
  if (!path.startsWith('/api/')) return

  // 認証エンドポイント自体はスキップ
  if (path === '/api/auth/verify' || path === '/api/auth/logout') return

  const authed = await isAuthenticated(event)
  if (!authed) {
    throw createError({ statusCode: 401, statusMessage: '認証が必要です' })
  }
})
