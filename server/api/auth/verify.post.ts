export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event)

  if (!body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'password は必須です' })
  }

  const { accessPassword } = useRuntimeConfig(event)
  if (!accessPassword || body.password !== accessPassword) {
    throw createError({ statusCode: 401, statusMessage: 'パスワードが正しくありません' })
  }

  await setAuthCookie(event, body.password)
  return { ok: true }
})
