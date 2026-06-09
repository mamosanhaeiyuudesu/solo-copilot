import { asc, desc, eq } from 'drizzle-orm'
import { getClaudeClient } from '../../utils/claude'
import { getDb } from '../../utils/db'
import { intermediateRecords, memorySnapshots } from '../../db/schema'
import {
  getMondayOf,
  generateWeeklySnapshot,
  generateMonthlySnapshot,
  generateYearlySnapshot,
  updateLivingProfile,
} from '../../utils/snapshot'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const claude = getClaudeClient(event)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = { weekly: 0, monthly: 0, yearly: 0, livingProfile: false }

  // 1. バッチ開始日を決定（最後の週次スナップショットの翌日 or 最古の中間記憶の日付）
  const lastWeekly = await db.select({ periodEnd: memorySnapshots.periodEnd })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'weekly'))
    .orderBy(desc(memorySnapshots.periodEnd))
    .get()

  let startDate: Date

  if (lastWeekly?.periodEnd) {
    startDate = addDays(new Date(lastWeekly.periodEnd), 1)
  }
  else {
    const earliest = await db.select({ date: intermediateRecords.date })
      .from(intermediateRecords)
      .orderBy(asc(intermediateRecords.date))
      .get()
    if (!earliest?.date) return result
    startDate = new Date(earliest.date)
  }

  // 2. 完了済み週のスナップショットを順番に生成（未処理週を遡って全て補完）
  let monday = getMondayOf(startDate)
  while (true) {
    const sunday = addDays(monday, 6)
    if (sunday >= today) break
    const created = await generateWeeklySnapshot(db, claude, toDateStr(monday), toDateStr(sunday))
    if (created) result.weekly++
    monday = addDays(monday, 7)
  }

  // 3. 週次スナップショットが存在する完了済み月の月次スナップショットを生成
  const allWeeklies = await db.select({ periodStart: memorySnapshots.periodStart })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'weekly'))
    .all()

  const monthsWithWeeklies = new Set<string>()
  for (const w of allWeeklies) {
    if (!w.periodStart) continue
    const d = new Date(w.periodStart)
    // 月をまたぐ週は月曜の月に属する
    monthsWithWeeklies.add(`${d.getFullYear()}-${d.getMonth() + 1}`)
  }

  let newHigherOrder = false
  for (const key of monthsWithWeeklies) {
    const [y, m] = key.split('-').map(Number) as [number, number]
    if (new Date(y, m, 0) >= today) continue // 月が未完了
    const created = await generateMonthlySnapshot(db, claude, y, m)
    if (created) { result.monthly++; newHigherOrder = true }
  }

  // 4. 月次スナップショットが存在する完了済み年の年次スナップショットを生成
  const allMonthlies = await db.select({ periodStart: memorySnapshots.periodStart })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'monthly'))
    .all()

  const yearsWithMonthlies = new Set<number>()
  for (const m of allMonthlies) {
    if (m.periodStart) yearsWithMonthlies.add(Number(m.periodStart.slice(0, 4)))
  }

  for (const year of yearsWithMonthlies) {
    if (new Date(year, 11, 31) >= today) continue // 年が未完了
    const created = await generateYearlySnapshot(db, claude, year)
    if (created) { result.yearly++; newHigherOrder = true }
  }

  // 5. living_profile を更新（月次以上が新規生成された場合はフルリビルド、それ以外はローリング）
  if (result.weekly > 0 || result.monthly > 0 || result.yearly > 0) {
    const latestWeekly = await db.select({ periodEnd: memorySnapshots.periodEnd })
      .from(memorySnapshots)
      .where(eq(memorySnapshots.periodType, 'weekly'))
      .orderBy(desc(memorySnapshots.periodEnd))
      .get()

    if (latestWeekly?.periodEnd) {
      await updateLivingProfile(db, claude, newHigherOrder ? 'full' : 'rolling', latestWeekly.periodEnd)
      result.livingProfile = true
    }
  }

  return result
})
