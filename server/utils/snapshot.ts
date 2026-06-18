import type Anthropic from '@anthropic-ai/sdk'
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { intermediateRecords, memorySnapshots } from '../db/schema'
import type { getDb } from './db'

type DB = ReturnType<typeof getDb>

function parseJsonArray(v: string | null): string[] {
  if (!v) return []
  try { return JSON.parse(v) as string[] }
  catch { return [] }
}

// Claude が focus を文字列ではなく配列で返すことがあるため文字列に正規化する
function normalizeFocus(focus: unknown): string {
  if (Array.isArray(focus)) return focus.join('\n')
  if (typeof focus === 'string') return focus
  return ''
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

// ===== タグ集計ユーティリティ =====

type IntermediateRecord = typeof intermediateRecords.$inferSelect
type Polarity = 'positive' | 'negative' | 'neutral'

interface Counted { count: number }
interface ThemeCount extends Counted { theme: string }
interface EmotionCount extends Counted { emotion: string }
interface PolaritySummary { positive: number; negative: number; neutral: number }

// レコード群を themeTags で集計し、件数降順で返す
function countThemes(records: IntermediateRecord[]): ThemeCount[] {
  const map: Record<string, number> = {}
  for (const r of records) {
    for (const t of parseJsonArray(r.themeTags)) map[t] = (map[t] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
}

// レコード群を emotionTags で集計し、件数降順で返す
function countEmotions(records: IntermediateRecord[]): EmotionCount[] {
  const map: Record<string, number> = {}
  for (const r of records) {
    for (const e of parseJsonArray(r.emotionTags)) map[e] = (map[e] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
}

function countPolarity(records: IntermediateRecord[]): PolaritySummary {
  const s: PolaritySummary = { positive: 0, negative: 0, neutral: 0 }
  for (const r of records) s[(r.polarity ?? 'neutral') as Polarity]++
  return s
}

// 指定日まで（含む）の全中間記憶を themeTags で累積集計する。
// 「累積登場回数」= テーマの継続性スコアの基礎（途切れても通算でカウント）。
async function cumulativeThemeCounts(db: DB, untilDate: string): Promise<Record<string, number>> {
  const rows = await db.select({ themeTags: intermediateRecords.themeTags })
    .from(intermediateRecords)
    .where(lte(intermediateRecords.date, untilDate))
    .all()
  const map: Record<string, number> = {}
  for (const r of rows) {
    for (const t of parseJsonArray(r.themeTags)) map[t] = (map[t] ?? 0) + 1
  }
  return map
}

// 主要イベント抽出：score = intensity × そのレコードのテーマの累積登場回数（最大）。
// 継続しているテーマに属する強い出来事ほど上位になる。
function selectMajorEvents(
  records: IntermediateRecord[],
  cumulative: Record<string, number>,
  limit: number,
): IntermediateRecord[] {
  return [...records]
    .map((r) => {
      const themes = parseJsonArray(r.themeTags)
      const continuity = themes.length > 0 ? Math.max(...themes.map(t => cumulative[t] ?? 1)) : 1
      return { r, score: (r.intensity ?? 1) * continuity }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.r)
}

// 子スナップショット（週次/月次）の JSON 集計列を合算する
function mergeThemeCounts(snapshots: { topThemes: string | null }[]): ThemeCount[] {
  const map: Record<string, number> = {}
  for (const s of snapshots) {
    if (!s.topThemes) continue
    try {
      for (const { theme, count } of JSON.parse(s.topThemes) as ThemeCount[]) {
        map[theme] = (map[theme] ?? 0) + count
      }
    }
    catch { /* skip */ }
  }
  return Object.entries(map).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count)
}

function mergeEmotionCounts(snapshots: { emotionSummary: string | null }[]): EmotionCount[] {
  const map: Record<string, number> = {}
  for (const s of snapshots) {
    if (!s.emotionSummary) continue
    try {
      for (const { emotion, count } of JSON.parse(s.emotionSummary) as EmotionCount[]) {
        map[emotion] = (map[emotion] ?? 0) + count
      }
    }
    catch { /* skip */ }
  }
  return Object.entries(map).map(([emotion, count]) => ({ emotion, count })).sort((a, b) => b.count - a.count)
}

function mergePolarity(snapshots: { polaritySummary: string | null }[]): PolaritySummary {
  const s: PolaritySummary = { positive: 0, negative: 0, neutral: 0 }
  for (const snap of snapshots) {
    if (!snap.polaritySummary) continue
    try {
      const p = JSON.parse(snap.polaritySummary) as Partial<PolaritySummary>
      s.positive += p.positive ?? 0
      s.negative += p.negative ?? 0
      s.neutral += p.neutral ?? 0
    }
    catch { /* skip */ }
  }
  return s
}

// ===== AI 生成 =====

interface SnapshotContent {
  headline: string
  achievements: string
  struggles: string
  interests: string
  aiSummary: string
}

async function generateContent(claude: Anthropic, prompt: string): Promise<SnapshotContent> {
  const empty: SnapshotContent = { headline: '', achievements: '', struggles: '', interests: '', aiSummary: '' }
  const res = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '{}'
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return empty
  try {
    return { ...empty, ...(JSON.parse(match[0]) as Partial<SnapshotContent>) }
  }
  catch {
    return empty
  }
}

// ===== スナップショット生成 =====

export async function generateWeeklySnapshot(
  db: DB,
  claude: Anthropic,
  periodStart: string,
  periodEnd: string,
): Promise<boolean> {
  const existing = await db.select({ id: memorySnapshots.id, topThemes: memorySnapshots.topThemes })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'weekly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  // すでに新カラムが埋まっていればスキップ。NULL ならバックフィル対象として再生成する。
  if (existing?.topThemes) return false

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

  const themes = countThemes(records)
  const emotions = countEmotions(records)
  const polarity = countPolarity(records)

  const cumulative = await cumulativeThemeCounts(db, periodEnd)
  const majorEvents = selectMajorEvents(records, cumulative, 6)

  // テーマ別にレコードをグルーピングしてプロンプトに渡す（雑多さの解消）
  const themeGrouped = themes.slice(0, 8).map(({ theme, count }) => {
    const cum = cumulative[theme] ?? count
    const lines = records
      .filter(r => parseJsonArray(r.themeTags).includes(theme))
      .map(r => `  - [${r.polarity}] ${r.what}${r.why ? ` → ${r.why}` : ''}`)
      .join('\n')
    return `## ${theme}（今週${count}件 / 通算${cum}回）\n${lines}`
  }).join('\n\n')

  const majorLines = majorEvents
    .map(r => `- [強度${r.intensity}][${r.polarity}] ${r.what}`)
    .join('\n')

  const content = await generateContent(claude, `${periodStart}〜${periodEnd}の個人データを分析してください。JSONのみ返答。

「通算回数」が多いテーマほどユーザーが継続的に向き合っているテーマです。重視してください。

テーマ別の記録:
${themeGrouped}

スコア上位の主要な出来事:
${majorLines}

JSON形式:
{"headline":"この週を象徴する主要な出来事を新聞見出し風に10〜15文字で","achievements":"できていたこと(2〜3文)","struggles":"苦労していたこと(1〜2文)","interests":"関心テーマ(1文)","aiSummary":"この週の概要(2〜3文)"}`)

  const values = {
    achievements: content.achievements,
    struggles: content.struggles,
    interests: content.interests,
    aiSummary: content.aiSummary,
    headline: content.headline,
    topThemes: JSON.stringify(themes.slice(0, 8)),
    emotionSummary: JSON.stringify(emotions.slice(0, 8)),
    polaritySummary: JSON.stringify(polarity),
  }

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

export async function generateMonthlySnapshot(
  db: DB,
  claude: Anthropic,
  year: number,
  month: number,
): Promise<boolean> {
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = toDateStr(new Date(year, month, 0))

  const existing = await db.select({ id: memorySnapshots.id, topThemes: memorySnapshots.topThemes })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'monthly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  if (existing?.topThemes) return false

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

  const themes = mergeThemeCounts(weeklies)
  const emotions = mergeEmotionCounts(weeklies)
  const polarity = mergePolarity(weeklies)

  const weeklyLines = weeklies
    .map(w => `## ${w.periodStart}〜${w.periodEnd}\n達成:${w.achievements}\n苦労:${w.struggles}\n概要:${w.aiSummary}`)
    .join('\n\n')
  const themeLine = themes.slice(0, 6).map(t => `${t.theme}(${t.count})`).join('、')

  const content = await generateContent(claude, `${year}年${month}月の週次サマリーをもとに月次サマリーを生成してください。JSONのみ返答。

この月の主要テーマ（登場回数）: ${themeLine}

${weeklyLines}

JSON形式:
{"headline":"この月を象徴する出来事を新聞見出し風に10〜15文字で","achievements":"この月できていたこと(2〜4文)","struggles":"苦労していたこと(1〜2文)","interests":"関心テーマ(1文)","aiSummary":"この月の概要(2〜3文)"}`)

  const values = {
    achievements: content.achievements,
    struggles: content.struggles,
    interests: content.interests,
    aiSummary: content.aiSummary,
    headline: content.headline,
    topThemes: JSON.stringify(themes.slice(0, 10)),
    emotionSummary: JSON.stringify(emotions.slice(0, 10)),
    polaritySummary: JSON.stringify(polarity),
  }

  if (existing) {
    await db.update(memorySnapshots).set(values).where(eq(memorySnapshots.id, existing.id))
  }
  else {
    await db.insert(memorySnapshots).values({
      id: crypto.randomUUID(),
      periodType: 'monthly',
      periodStart,
      periodEnd,
      ...values,
    })
  }
  return true
}

export async function generateYearlySnapshot(
  db: DB,
  claude: Anthropic,
  year: number,
): Promise<boolean> {
  const periodStart = `${year}-01-01`
  const periodEnd = `${year}-12-31`

  const existing = await db.select({ id: memorySnapshots.id, topThemes: memorySnapshots.topThemes })
    .from(memorySnapshots)
    .where(and(eq(memorySnapshots.periodType, 'yearly'), eq(memorySnapshots.periodStart, periodStart)))
    .get()
  if (existing?.topThemes) return false

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

  const themes = mergeThemeCounts(monthlies)
  const emotions = mergeEmotionCounts(monthlies)
  const polarity = mergePolarity(monthlies)

  const monthlyLines = monthlies
    .map(m => `## ${m.periodStart!.slice(0, 7)}\n達成:${m.achievements}\n苦労:${m.struggles}\n概要:${m.aiSummary}`)
    .join('\n\n')
  const themeLine = themes.slice(0, 8).map(t => `${t.theme}(${t.count})`).join('、')

  const content = await generateContent(claude, `${year}年の月次サマリーをもとに年次サマリーを生成してください。JSONのみ返答。

この年の主要テーマ（登場回数）: ${themeLine}

${monthlyLines}

JSON形式:
{"headline":"この年を象徴する出来事を新聞見出し風に10〜15文字で","achievements":"この年できていたこと(3〜5文)","struggles":"課題(2〜3文)","interests":"主要テーマ(1〜2文)","aiSummary":"この年の全体像(3〜5文)"}`)

  const values = {
    achievements: content.achievements,
    struggles: content.struggles,
    interests: content.interests,
    aiSummary: content.aiSummary,
    headline: content.headline,
    topThemes: JSON.stringify(themes.slice(0, 12)),
    emotionSummary: JSON.stringify(emotions.slice(0, 12)),
    polaritySummary: JSON.stringify(polarity),
  }

  if (existing) {
    await db.update(memorySnapshots).set(values).where(eq(memorySnapshots.id, existing.id))
  }
  else {
    await db.insert(memorySnapshots).values({
      id: crypto.randomUUID(),
      periodType: 'yearly',
      periodStart,
      periodEnd,
      ...values,
    })
  }
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

    // 累積で登場回数が多い＝継続テーマ。人物像の中核として明示的に渡す。
    const cumulative = await cumulativeThemeCounts(db, latestPeriodEnd)
    const continuityThemes = Object.entries(cumulative)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([theme, count]) => `${theme}(${count}回)`)
      .join('、')

    const sections = [
      continuityThemes
        ? `## 継続して向き合っているテーマ（登場回数）\n${continuityThemes}`
        : '',
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
「継続して向き合っているテーマ」はこの人の本質を表すため、人物像の中核に据えてください。

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
      const parsed = JSON.parse(match[0]) as { profile: string; focus: unknown }
      profileText = parsed.profile
      focusText = normalizeFocus(parsed.focus)
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
      const parsed = JSON.parse(match[0]) as { profile: string; focus: unknown }
      profileText = parsed.profile
      focusText = normalizeFocus(parsed.focus) || prev.recommendedFocus || ''
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
