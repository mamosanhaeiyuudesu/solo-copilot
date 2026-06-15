import type Anthropic from '@anthropic-ai/sdk'
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'

function parseJsonArray(v: string | null): string[] {
  if (!v) return []
  try { return JSON.parse(v) as string[] }
  catch { return [] }
}
import { intermediateRecords, memorySnapshots } from '../db/schema'
import type { getDb } from './db'

type DB = ReturnType<typeof getDb>

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

interface SnapshotContent {
  achievements: string
  struggles: string
  interests: string
  aiSummary: string
}

async function generateContent(claude: Anthropic, prompt: string): Promise<SnapshotContent> {
  const res = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '{}'
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { achievements: '', struggles: '', interests: '', aiSummary: '' }
  try {
    return JSON.parse(match[0]) as SnapshotContent
  }
  catch {
    return { achievements: '', struggles: '', interests: '', aiSummary: '' }
  }
}

export async function generateWeeklySnapshot(
  db: DB,
  claude: Anthropic,
  periodStart: string,
  periodEnd: string,
): Promise<boolean> {
  const existing = await db.select({ id: memorySnapshots.id })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'weekly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  if (existing) return false

  const records = await db.select()
    .from(intermediateRecords)
    .where(and(
      gte(intermediateRecords.date, periodStart),
      lte(intermediateRecords.date, periodEnd),
      gte(intermediateRecords.intensity, 2),
    ))
    .orderBy(asc(intermediateRecords.date))
    .all()
  if (records.length === 0) return false

  const tagMap: Record<string, { positive: number; negative: number; neutral: number }> = {}
  for (const r of records) {
    const allTags = [...parseJsonArray(r.emotionTags), ...parseJsonArray(r.themeTags)]
    const p = (r.polarity ?? 'neutral') as 'positive' | 'negative' | 'neutral'
    for (const tag of allTags) {
      tagMap[tag] ??= { positive: 0, negative: 0, neutral: 0 }
      tagMap[tag]![p]++
    }
  }

  const tagLines = Object.entries(tagMap)
    .map(([t, c]) => `- ${t}: ${c.positive + c.negative + c.neutral}件(+${c.positive}/-${c.negative}/0${c.neutral})`)
    .join('\n')
  const recordLines = records.map((r) => {
    const etags = parseJsonArray(r.emotionTags).join(',')
    const ttags = parseJsonArray(r.themeTags).join(',')
    const why = r.why ? ` → ${r.why}` : ''
    return `- ${r.date ?? '?'} [${r.polarity}] [感情:${etags}] [テーマ:${ttags}] ${r.what}${why}`
  }).join('\n')

  const content = await generateContent(claude, `${periodStart}〜${periodEnd}の個人データを分析してください。JSONのみ返答。

データ:
${recordLines}

タグ分布:
${tagLines}

JSON形式:
{"achievements":"できていたこと(2〜3文)","struggles":"苦労していたこと(1〜2文)","interests":"関心テーマ(1文)","aiSummary":"この週の概要(2〜3文)"}`)

  await db.insert(memorySnapshots).values({
    id: crypto.randomUUID(),
    periodType: 'weekly',
    periodStart,
    periodEnd,
    achievements: content.achievements,
    struggles: content.struggles,
    interests: content.interests,
    aiSummary: content.aiSummary,
  })
  return true
}

export async function generateMonthlySnapshot(
  db: DB,
  claude: Anthropic,
  year: number,
  month: number,
): Promise<boolean> {
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = toDateStr(new Date(year, month, 0))

  const existing = await db.select({ id: memorySnapshots.id })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'monthly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  if (existing) return false

  // periodStart で月を判定（週をまたぐ場合は月曜の月に属する）
  const weeklies = await db.select()
    .from(memorySnapshots)
    .where(and(
      eq(memorySnapshots.periodType, 'weekly'),
      gte(memorySnapshots.periodStart, periodStart),
      lte(memorySnapshots.periodStart, periodEnd),
    ))
    .orderBy(asc(memorySnapshots.periodStart))
    .all()
  if (weeklies.length === 0) return false

  const weeklyLines = weeklies
    .map(w => `## ${w.periodStart}〜${w.periodEnd}\n達成:${w.achievements}\n苦労:${w.struggles}\n概要:${w.aiSummary}`)
    .join('\n\n')

  const content = await generateContent(claude, `${year}年${month}月の週次サマリーをもとに月次サマリーを生成してください。JSONのみ返答。

${weeklyLines}

JSON形式:
{"achievements":"この月できていたこと(2〜4文)","struggles":"苦労していたこと(1〜2文)","interests":"関心テーマ(1文)","aiSummary":"この月の概要(2〜3文)"}`)

  await db.insert(memorySnapshots).values({
    id: crypto.randomUUID(),
    periodType: 'monthly',
    periodStart,
    periodEnd,
    achievements: content.achievements,
    struggles: content.struggles,
    interests: content.interests,
    aiSummary: content.aiSummary,
  })
  return true
}

export async function generateYearlySnapshot(
  db: DB,
  claude: Anthropic,
  year: number,
): Promise<boolean> {
  const periodStart = `${year}-01-01`
  const periodEnd = `${year}-12-31`

  const existing = await db.select({ id: memorySnapshots.id })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'yearly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  if (existing) return false

  const monthlies = await db.select()
    .from(memorySnapshots)
    .where(and(
      eq(memorySnapshots.periodType, 'monthly'),
      gte(memorySnapshots.periodStart, periodStart),
      lte(memorySnapshots.periodEnd, periodEnd),
    ))
    .orderBy(asc(memorySnapshots.periodStart))
    .all()
  if (monthlies.length === 0) return false

  const monthlyLines = monthlies
    .map(m => `## ${m.periodStart!.slice(0, 7)}\n達成:${m.achievements}\n苦労:${m.struggles}\n概要:${m.aiSummary}`)
    .join('\n\n')

  const content = await generateContent(claude, `${year}年の月次サマリーをもとに年次サマリーを生成してください。JSONのみ返答。

${monthlyLines}

JSON形式:
{"achievements":"この年できていたこと(3〜5文)","struggles":"課題(2〜3文)","interests":"主要テーマ(1〜2文)","aiSummary":"この年の全体像(3〜5文)"}`)

  await db.insert(memorySnapshots).values({
    id: crypto.randomUUID(),
    periodType: 'yearly',
    periodStart,
    periodEnd,
    achievements: content.achievements,
    struggles: content.struggles,
    interests: content.interests,
    aiSummary: content.aiSummary,
  })
  return true
}

export async function updateLivingProfile(
  db: DB,
  claude: Anthropic,
  method: 'full' | 'rolling',
  latestPeriodEnd: string,
): Promise<void> {
  let profileText: string
  let focusText = ''

  if (method === 'full') {
    const yearlies = await db.select()
      .from(memorySnapshots)
      .where(eq(memorySnapshots.periodType, 'yearly'))
      .orderBy(asc(memorySnapshots.periodStart))
      .all()

    const monthlies = await db.select()
      .from(memorySnapshots)
      .where(eq(memorySnapshots.periodType, 'monthly'))
      .orderBy(desc(memorySnapshots.periodStart))
      .limit(3)
      .all()

    const weeklies = await db.select()
      .from(memorySnapshots)
      .where(eq(memorySnapshots.periodType, 'weekly'))
      .orderBy(desc(memorySnapshots.periodStart))
      .limit(4)
      .all()

    const sections = [
      yearlies.length > 0
        ? `## 年次記録\n${yearlies.map(y => `${y.periodStart!.slice(0, 4)}年: ${y.aiSummary}`).join('\n')}`
        : '',
      monthlies.length > 0
        ? `## 直近の月次記録\n${[...monthlies].reverse().map(m => `${m.periodStart!.slice(0, 7)}: ${m.aiSummary}\n達成:${m.achievements} / 苦労:${m.struggles}`).join('\n\n')}`
        : '',
      weeklies.length > 0
        ? `## 直近の週次記録\n${[...weeklies].reverse().map(w => `${w.periodStart}〜${w.periodEnd}: ${w.aiSummary}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n')

    const res = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user', content: `以下のデータからユーザーの記憶プロファイルを生成してください。
AIアシスタントがこのユーザーを深く理解し最適なサポートをするための参照情報として使います。

${sections}

以下のJSON形式で返答してください:
{
  "profile": "マークダウン形式のプロファイル（500〜700文字）。構成: ## ユーザープロファイル / ### 人物像・価値観 / ### 行動パターン / ### 現在の状況 / ### AIへの指示",
  "focus": "現在の優先事項を箇条書き3件以内（1行1件）"
}` }],
    })

    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return
    try {
      const parsed = JSON.parse(match[0]) as { profile: string; focus: string }
      profileText = parsed.profile
      focusText = parsed.focus ?? ''
    }
    catch {
      return
    }
  }
  else {
    const prev = await db.select()
      .from(memorySnapshots)
      .where(eq(memorySnapshots.periodType, 'living_profile'))
      .get()

    if (!prev?.aiSummary) {
      return updateLivingProfile(db, claude, 'full', latestPeriodEnd)
    }

    const newWeeklies = await db.select()
      .from(memorySnapshots)
      .where(eq(memorySnapshots.periodType, 'weekly'))
      .orderBy(desc(memorySnapshots.periodStart))
      .limit(2)
      .all()

    const newInfo = [...newWeeklies].reverse()
      .map(w => `${w.periodStart}〜${w.periodEnd}: ${w.aiSummary}\n達成:${w.achievements} / 苦労:${w.struggles}`)
      .join('\n\n')

    const res = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user', content: `現在のプロファイルを最新情報で更新してください。
安定した特性・価値観・パターンは保持し、「現在の状況」のみ最新情報に更新してください。

現在のプロファイル:
${prev.aiSummary}

最新の記録:
${newInfo}

JSON形式で返答:
{
  "profile": "更新後のプロファイル（構造・文字数は現在のものを維持）",
  "focus": "現在の優先事項を箇条書き3件以内"
}` }],
    })

    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return
    try {
      const parsed = JSON.parse(match[0]) as { profile: string; focus: string }
      profileText = parsed.profile
      focusText = parsed.focus ?? prev.recommendedFocus ?? ''
    }
    catch {
      return
    }
  }

  if (!profileText!) return

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const existing = await db.select({ id: memorySnapshots.id })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'living_profile'))
    .get()

  if (existing) {
    await db.update(memorySnapshots)
      .set({ aiSummary: profileText, recommendedFocus: focusText, periodEnd: latestPeriodEnd, createdAt: now })
      .where(eq(memorySnapshots.id, existing.id))
  }
  else {
    await db.insert(memorySnapshots).values({
      id: crypto.randomUUID(),
      periodType: 'living_profile',
      periodEnd: latestPeriodEnd,
      aiSummary: profileText,
      recommendedFocus: focusText,
    })
  }
}
