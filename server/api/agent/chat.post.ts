type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: ChatMessage[] }>(event)
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'messages は必須です' })
  }

  const client = getClaudeClient(event)
  setupStreamHeaders(event)

  const stream = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    system: 'あなたは優秀なAIアシスタントです。日本語で回答してください。',
    messages: body.messages,
    stream: true,
  })

  return sendStream(event, createClaudeStream(stream))
})
