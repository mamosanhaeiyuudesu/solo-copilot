import { GoogleGenerativeAI } from '@google/generative-ai'
import type { H3Event } from 'h3'

export function getGeminiClient(event: H3Event): GoogleGenerativeAI {
  const { geminiApiKey } = useRuntimeConfig(event)
  if (!geminiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_GEMINI_API_KEY が設定されていません' })
  }
  return new GoogleGenerativeAI(geminiApiKey as string)
}

export function createGeminiStream(
  geminiStream: AsyncIterable<{ text: () => string }>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of geminiStream) {
        const text = chunk.text()
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })
}
