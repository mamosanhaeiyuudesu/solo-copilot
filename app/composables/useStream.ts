export function useStream() {
  async function streamText(
    url: string,
    body: Record<string, unknown>,
    onChunk: (text: string) => void,
  ): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error((data as { statusMessage?: string }).statusMessage ?? `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onChunk(decoder.decode(value, { stream: true }))
    }
  }

  return { streamText }
}
