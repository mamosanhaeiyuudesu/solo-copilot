import OpenAI from 'openai'
import type { H3Event } from 'h3'

export function getOpenAIClient(event: H3Event): OpenAI {
  const { openaiApiKey } = useRuntimeConfig(event)
  if (!openaiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_OPENAI_API_KEY が設定されていません' })
  }
  return new OpenAI({ apiKey: openaiApiKey as string })
}

export function createOpenAIStream(
  openaiStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiStream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })
}
