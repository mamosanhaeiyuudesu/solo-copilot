export function useAuth() {
  const isAuthed = useState<boolean>('auth.isAuthed', () => false)

  // cookieが有効か確認（ローカルdevではmiddlewareがスキップするため常にtrue）
  async function checkAuth(): Promise<void> {
    try {
      await $fetch('/api/auth/check')
      isAuthed.value = true
    } catch {
      isAuthed.value = false
    }
  }

  async function login(password: string): Promise<void> {
    await $fetch('/api/auth/verify', { method: 'POST', body: { password } })
    isAuthed.value = true
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    isAuthed.value = false
  }

  return { isAuthed: readonly(isAuthed), checkAuth, login, logout }
}
