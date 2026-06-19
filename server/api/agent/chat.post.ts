type ChatMessage = { role: 'user' | 'assistant'; content: string }

const BASE_PROMPT = 'あなたは優秀なAIアシスタントです。日本語で回答してください。'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: ChatMessage[]; systemPrompt?: string }>(event)
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'messages は必須です' })
  }

  const client = getClaudeClient(event)
  setupStreamHeaders(event)

  const systemPrompt = body.systemPrompt?.trim() || BASE_PROMPT

  const stream = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: body.messages,
    stream: true,
  })

  return sendStream(event, createClaudeStream(stream))
})
