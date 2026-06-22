import type Anthropic from '@anthropic-ai/sdk'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { intermediateRecords, memorySnapshots } from '../db/schema'
import type { getDb } from './db'

type DB = ReturnType<typeof getDb>
type IntermediateRecord = typeof intermediateRecords.$inferSelect
type Polarity = 'positive' | 'negative'

function parseJsonArray(v: string | null): string[] {
  if (!v) return []
  try { return JSON.parse(v) as string[] }
  catch { return [] }
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// テーマタグ別サマリ（スナップショットの本体）
interface TagSummary {
  tag: string
  posCount: number
  negCount: number
  positive: string // そのテーマで良かったこと（文）
  negative: string // そのテーマで苦労したこと（文）
  shortLabel: string // タイムラインテーブルのセル表示用（10文字以内）
}

function parseTagSummaries(json: string | null): TagSummary[] {
  if (!json) return []
  try { return JSON.parse(json) as TagSummary[] }
  catch { return [] }
}

// レコード群をテーマタグ別に分類し、ポジ/ネガ件数を集計する
function groupByTag(records: IntermediateRecord[]): Map<string, { pos: IntermediateRecord[]; neg: IntermediateRecord[] }> {
  const map = new Map<string, { pos: IntermediateRecord[]; neg: IntermediateRecord[] }>()
  for (const r of records) {
    const polarity = (r.polarity ?? 'positive') as Polarity
    for (const tag of parseJsonArray(r.themeTags)) {
      if (!map.has(tag)) map.set(tag, { pos: [], neg: [] })
      const bucket = map.get(tag)!
      if (polarity === 'negative') bucket.neg.push(r)
      else bucket.pos.push(r)
    }
  }
  return map
}

// AIにテーマ別ポジ/ネガ要約を生成させる。
// 入力はテーマごとに整理済みの観察リスト。出力は { tag: { positive, negative } } の対応。
async function generateTagTexts(
  claude: Anthropic,
  periodLabel: string,
  blocks: { tag: string; posLines: string[]; negLines: string[] }[],
): Promise<Record<string, { positive: string; negative: string; shortLabel: string }>> {
  if (blocks.length === 0) return {}

  const dataText = blocks.map((b) => {
    const pos = b.posLines.length ? b.posLines.map(l => `  + ${l}`).join('\n') : '  （なし）'
    const neg = b.negLines.length ? b.negLines.map(l => `  - ${l}`).join('\n') : '  （なし）'
    return `## ${b.tag}\nポジティブ:\n${pos}\nネガティブ:\n${neg}`
  }).join('\n\n')

  const prompt = `${periodLabel}の個人データをテーマ別に整理しました。
各テーマについて以下を返してください。
- positive: 良かったことの要約（1〜2文。観察がない場合は空文字 ""）
- negative: 苦労したことの要約（1〜2文。観察がない場合は空文字 ""）
- shortLabel: タイムライン表示用の超短縮ラベル（10文字以内・日本語で内容を端的に表す）
JSONのみ返答（マークダウン不可）。

${dataText}

出力形式（テーマ名をキーにする）:
{
  "テーマ名": { "positive": "良かったことの要約", "negative": "苦労したことの要約", "shortLabel": "10文字以内" }
}`

  const res = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '{}'
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try {
    return JSON.parse(match[0]) as Record<string, { positive: string; negative: string; shortLabel: string }>
  }
  catch {
    return {}
  }
}

// ===== スナップショット生成 =====

export async function generateWeeklySnapshot(
  db: DB,
  claude: Anthropic,
  periodStart: string,
  periodEnd: string,
): Promise<boolean> {
  const existing = await db.select({ id: memorySnapshots.id, tagSummaries: memorySnapshots.tagSummaries })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'weekly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  // すでに tag_summaries が埋まっていればスキップ。NULL ならバックフィル対象として再生成する。
  if (existing?.tagSummaries) return false

  const records = await db.select()
    .from(intermediateRecords)
    .where(and(
      gte(intermediateRecords.date, periodStart),
      lte(intermediateRecords.date, periodEnd),
      gte(intermediateRecords.intensity, 2),
    ))
    .orderBy(asc(intermediateRecords.date))
  if (records.length === 0) return false

  const grouped = groupByTag(records)
  if (grouped.size === 0) return false

  const blocks = [...grouped.entries()].map(([tag, b]) => ({
    tag,
    posLines: b.pos.map(r => r.what ?? '').filter(Boolean),
    negLines: b.neg.map(r => r.what ?? '').filter(Boolean),
  }))

  const texts = await generateTagTexts(claude, `${periodStart}〜${periodEnd}`, blocks)

  const tagSummaries: TagSummary[] = [...grouped.entries()]
    .map(([tag, b]) => ({
      tag,
      posCount: b.pos.length,
      negCount: b.neg.length,
      positive: texts[tag]?.positive ?? '',
      negative: texts[tag]?.negative ?? '',
      shortLabel: texts[tag]?.shortLabel ?? '',
    }))
    .sort((a, b) => (b.posCount + b.negCount) - (a.posCount + a.negCount))

  const values = { tagSummaries: JSON.stringify(tagSummaries) }

  if (existing) {
    await db.update(memorySnapshots).set(values).where(eq(memorySnapshots.id, existing.id))
  }
  else {
    await db.insert(memorySnapshots).values({
      id: crypto.randomUUID(),
      periodType: 'weekly',
      periodStart,
      periodEnd,
      ...values,
    })
  }
  return true
}

// 子スナップショット（週次/月次）の tag_summaries を合算する
function mergeChildTagSummaries(children: { tagSummaries: string | null }[]): Map<string, { posCount: number; negCount: number; posTexts: string[]; negTexts: string[] }> {
  const map = new Map<string, { posCount: number; negCount: number; posTexts: string[]; negTexts: string[] }>()
  for (const child of children) {
    for (const s of parseTagSummaries(child.tagSummaries)) {
      if (!map.has(s.tag)) map.set(s.tag, { posCount: 0, negCount: 0, posTexts: [], negTexts: [] })
      const m = map.get(s.tag)!
      m.posCount += s.posCount
      m.negCount += s.negCount
      if (s.positive) m.posTexts.push(s.positive)
      if (s.negative) m.negTexts.push(s.negative)
    }
  }
  return map
}

async function generateAggregatedSnapshot(
  db: DB,
  claude: Anthropic,
  periodType: 'monthly' | 'yearly',
  periodStart: string,
  periodEnd: string,
  childType: 'weekly' | 'monthly',
  periodLabel: string,
): Promise<boolean> {
  const existing = await db.select({ id: memorySnapshots.id, tagSummaries: memorySnapshots.tagSummaries })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, periodType), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  if (existing?.tagSummaries) return false

  const children = await db.select({ tagSummaries: memorySnapshots.tagSummaries })
    .from(memorySnapshots)
    .where(and(
      eq(memorySnapshots.periodType, childType),
      gte(memorySnapshots.periodStart, periodStart),
      lte(memorySnapshots.periodStart, periodEnd),
    ))
  if (children.length === 0) return false

  const merged = mergeChildTagSummaries(children)
  if (merged.size === 0) return false

  const blocks = [...merged.entries()].map(([tag, m]) => ({
    tag,
    posLines: m.posTexts,
    negLines: m.negTexts,
  }))

  const texts = await generateTagTexts(claude, periodLabel, blocks)

  const tagSummaries: TagSummary[] = [...merged.entries()]
    .map(([tag, m]) => ({
      tag,
      posCount: m.posCount,
      negCount: m.negCount,
      positive: texts[tag]?.positive ?? '',
      negative: texts[tag]?.negative ?? '',
      shortLabel: texts[tag]?.shortLabel ?? '',
    }))
    .sort((a, b) => (b.posCount + b.negCount) - (a.posCount + a.negCount))

  const values = { tagSummaries: JSON.stringify(tagSummaries) }

  if (existing) {
    await db.update(memorySnapshots).set(values).where(eq(memorySnapshots.id, existing.id))
  }
  else {
    await db.insert(memorySnapshots).values({
      id: crypto.randomUUID(),
      periodType,
      periodStart,
      periodEnd,
      ...values,
    })
  }
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
  return generateAggregatedSnapshot(db, claude, 'monthly', periodStart, periodEnd, 'weekly', `${year}年${month}月`)
}

export async function generateYearlySnapshot(
  db: DB,
  claude: Anthropic,
  year: number,
): Promise<boolean> {
  const periodStart = `${year}-01-01`
  const periodEnd = `${year}-12-31`
  return generateAggregatedSnapshot(db, claude, 'yearly', periodStart, periodEnd, 'monthly', `${year}年`)
}
