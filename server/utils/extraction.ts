import Anthropic from '@anthropic-ai/sdk'

export interface ExtractedItem {
  date: string | null
  polarity: 'positive' | 'negative'
  theme_tags: string[]
  what: string
  why: string | null
  intensity: number
}

// 記憶のテーマタグ（固定）。当てはまらない出来事はタグ0個で記録する。
export const THEME_TAG_LIST = [
  '本業', '転職', '副業', 'AI', '心理', '家族', '剣道', '信仰',
] as const

// タグの説明（AIプロンプト用）
export const THEME_TAG_DESCRIPTIONS: Record<string, string> = {
  本業: 'LINEヤフーでの仕事・業務・職場の人間関係・社内の出来事',
  転職: '転職活動・キャリア変更の検討・求人・面接など',
  副業: 'AOGUでの副業開発・プライベートでのアプリ開発・副業マーケティング活動',
  AI: 'AIを活用した施策・AIツール・LLM関連の取り組み',
  心理: '心理学・セラピー・セッション・人間の内面・感情・メンタル',
  家族: '妻・親・子供に関すること・家庭内の出来事',
  剣道: '自分の剣道・子供の剣道・稽古・試合・道場',
  信仰: '神・祈り・宗教・スピリチュアル・信仰に関すること',
}

const TURNS_PER_CHUNK = 20
const CHAR_LIMIT = 2500

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

function splitConversationText(body: string): string[] {
  const turns = body.split(/(?=(?:Human|User|Assistant|ChatGPT|Claude|あなた|ユーザー)[:：])/i).filter(t => t.trim())
  const chunks: string[] = []
  for (let i = 0; i < turns.length; i += TURNS_PER_CHUNK) {
    chunks.push(turns.slice(i, i + TURNS_PER_CHUNK).join(''))
  }
  return chunks
}

function splitPlainText(body: string): string[] {
  const paragraphs = body.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''
  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > CHAR_LIMIT) {
      chunks.push(current.trim())
      current = para
    }
    else {
      current = current ? `${current}\n\n${para}` : para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function splitIntoChunks(content: string): string[] {
  const headerMatch = content.match(/^(\[参考期間:[^\]]*\]\n---\n)([\s\S]*)$/)
  const header = headerMatch?.[1] ?? ''
  const body = headerMatch?.[2] ?? content

  const isConversation = detectIsConversation(content)
  const chunks = isConversation ? splitConversationText(body) : splitPlainText(body)

  if (chunks.length <= 1) return [content]
  return chunks.map(chunk => header + chunk)
}

const THEME_TAGS = THEME_TAG_LIST
  .map(tag => `・${tag}：${THEME_TAG_DESCRIPTIONS[tag]}`)
  .join('\n')

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
[{
  "date": "YYYY-MM-DD または null",
  "polarity": "positive|negative",
  "theme_tags": ["テーマタグを下記リストから0〜2個。当てはまるものが無ければ空配列 []"],
  "what": "何が起きたか・何を考えたか（1〜2文）",
  "why": "なぜそう感じたか・背景（1文）。推測できない場合は null",
  "intensity": 重要度（1〜5の整数）
}]

polarity のルール:
- positive: 前進・達成・喜び・良い気づきなど肯定的な観察
- negative: 不安・停滞・摩擦・疲労など否定的な観察
- 中立的な観察（淡々とした決断・振り返り等）は、より近い方を選ぶ

テーマタグ（theme_tags）リスト（この中からのみ選ぶ。無理に当てはめない。0〜2個）:
${THEME_TAGS}

intensity の基準:
1: 些細・日常の雑談レベル（記録はするが長期記憶には使わない）
2: 軽度の気づき・感情
3: 明確な感情・関心・悩み
4: 重要な意思決定・転換点・深い気づき
5: 人生に影響する出来事・強い感情

date フィールドのルール:
- テキスト冒頭に [参考期間: ...] がある場合、それを時期の手がかりとして必ず参照すること
- 正確な日付（例: 2024年3月5日）がわかれば YYYY-MM-DD 形式で記録
- 月・日が不明で年のみわかる場合は YYYY-01-01 形式（例: 2016年頃 → "2016-01-01"）
- 期間が範囲で示されている場合（例: 1980〜2000年、2010年代）は、テキストの内容・文脈・言及されている出来事から最も可能性が高い年を推測し YYYY-01-01 形式で記録
- 時期が全く推測できない場合のみ null

---
${content}`

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

  const block = response.content[0]
  const text = block?.type === 'text' ? block.text.trim() : '[]'

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedItem[]
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          ['positive', 'negative'].includes(item.polarity) &&
          typeof item.what === 'string' &&
          Array.isArray(item.theme_tags),
      )
      // 固定リスト外のテーマタグは除外する
      .map(item => ({
        ...item,
        theme_tags: item.theme_tags.filter(t => (THEME_TAG_LIST as readonly string[]).includes(t)),
      }))
  }
  catch {
    return []
  }
}
