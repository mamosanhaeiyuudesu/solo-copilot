import type { H3Event } from 'h3'

const AUTH_COOKIE = 'sc-auth'
const AUTH_DAYS = 30

// パスワードを SHA-256 でハッシュしてクッキー値として使う（ステートレス）
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

export async function setAuthCookie(event: H3Event, password: string): Promise<void> {
  const token = await hashPassword(password)
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: AUTH_DAYS * 86_400,
    path: '/',
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
}

// クッキーが有効なパスワードハッシュと一致するか確認
export async function isAuthenticated(event: H3Event): Promise<boolean> {
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) return false

  const { accessPassword } = useRuntimeConfig(event)
  if (!accessPassword) return false

  const expected = await hashPassword(accessPassword as string)
  return token === expected
}
