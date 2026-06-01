import Anthropic from '@anthropic-ai/sdk'

export interface ExtractedItem {
  date: string | null
  polarity: 'positive' | 'negative' | 'neutral'
  tag: string
  what: string
  intensity: number
}

function detectIsConversation(content: string): boolean {
  const trimmed = content.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(content)
      if (parsed?.mapping || (Array.isArray(parsed) && parsed[0]?.mapping)) return true
      if (parsed?.messages && Array.isArray(parsed.messages)) return true
    }
    catch {}
  }
  return /^(Human|User|Assistant|ChatGPT|Claude|あなた|ユーザー)[:：]/im.test(content)
}

function buildPrompt(content: string): { system: string; user: string } {
  const isConversation = detectIsConversation(content)

  const system = isConversation
    ? `あなたはユーザーの自己理解を助けるAIです。
これはユーザーとAIの対話ログです。
AIの発言は文脈理解のために参照しますが、抽出する情報はユーザー発言に由来するものに限ります。
ユーザーが何を考え、何に悩み、何に関心を持っているかを読み取ってください。`
    : `あなたはユーザーの自己理解を助けるAIです。
以下は筆者（ユーザー）自身が書いたテキストです。
筆者の思考・感情・関心・悩みを読み取ってください。`

  const user = `以下のデータを分析し、ユーザーの思考・感情・関心・悩みを表す重要な洞察を抽出してください。
JSONのみを返してください（マークダウンコードブロック不可）。抽出できなければ空配列 [] を返す。

形式:
[{"date":"YYYY-MM-DD または null","polarity":"positive|negative|neutral","tag":"カテゴリ（例: キャリア・健康・仕事・学習・人間関係・お金・創作）","what":"何が起きたか・何を考えたか（1〜2文）","intensity":1から5の整数}]

---
${content.slice(0, 50000)}`

  return { system, user }
}

export async function extractIntermediateItems(
  client: Anthropic,
  content: string,
): Promise<ExtractedItem[]> {
  const { system, user } = buildPrompt(content)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedItem[]
    return parsed.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        ['positive', 'negative', 'neutral'].includes(item.polarity) &&
        typeof item.what === 'string',
    )
  }
  catch {
    return []
  }
}
