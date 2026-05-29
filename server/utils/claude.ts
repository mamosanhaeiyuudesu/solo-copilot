import Anthropic from '@anthropic-ai/sdk'
import type { H3Event } from 'h3'

export function getClaudeClient(event: H3Event): Anthropic {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_ANTHROPIC_API_KEY が設定されていません' })
  }
  return new Anthropic({ apiKey: anthropicApiKey as string })
}

export function setupStreamHeaders(event: H3Event): void {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'X-Accel-Buffering', 'no')
}

export function createClaudeStream(
  anthropicStream: AsyncIterable<Anthropic.MessageStreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const ev of anthropicStream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(ev.delta.text))
        }
      }
      controller.close()
    },
  })
}
