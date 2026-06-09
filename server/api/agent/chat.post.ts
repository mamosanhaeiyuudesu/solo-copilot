import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { memorySnapshots } from '../../db/schema'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const BASE_PROMPT = 'あなたは優秀なAIアシスタントです。日本語で回答してください。'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: ChatMessage[]; systemPrompt?: string }>(event)
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'messages は必須です' })
  }

  const db = getDb(event)
  const client = getClaudeClient(event)
  setupStreamHeaders(event)

  const profile = await db.select({ aiSummary: memorySnapshots.aiSummary })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'living_profile'))
    .get()

  const base = body.systemPrompt?.trim() || BASE_PROMPT
  const systemPrompt = profile?.aiSummary
    ? `${profile.aiSummary}\n\n---\n\n${base}`
    : base

  const stream = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    system: systemPrompt,
    messages: body.messages,
    stream: true,
  })

  return sendStream(event, createClaudeStream(stream))
})
