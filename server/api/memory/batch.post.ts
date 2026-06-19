import { eq, gte } from 'drizzle-orm'
import { getClaudeClient } from '../../utils/claude'
import { getDb } from '../../utils/db'
import { intermediateRecords, memorySnapshots } from '../../db/schema'
import {
  getMondayOf,
  generateWeeklySnapshot,
  generateMonthlySnapshot,
  generateYearlySnapshot,
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

  const result = { weekly: 0, monthly: 0, yearly: 0 }

  // 1. intensity >= 2 のレコード日付を収集し、データが存在する週だけを対象にする
  //    （全週スキャンするとタイムアウトするため）
  const recordDates = await db
    .select({ date: intermediateRecords.date })
    .from(intermediateRecords)
    .where(gte(intermediateRecords.intensity, 2))
    .all()

  const weekSet = new Set<string>()
  for (const { date } of recordDates) {
    if (!date || date === 'null') continue
    const d = new Date(date)
    if (isNaN(d.getTime())) continue
    const mon = getMondayOf(d)
    const sun = addDays(mon, 6)
    if (sun < today) weekSet.add(toDateStr(mon))
  }

  // 2. 時系列順に週次スナップショットを生成（generateWeeklySnapshot が冪等性を保証）
  for (const mondayStr of [...weekSet].sort()) {
    const sunday = toDateStr(addDays(new Date(mondayStr), 6))
    const created = await generateWeeklySnapshot(db, claude, mondayStr, sunday)
    if (created) result.weekly++
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
    monthsWithWeeklies.add(`${d.getFullYear()}-${d.getMonth() + 1}`)
  }

  for (const key of monthsWithWeeklies) {
    const [y, m] = key.split('-').map(Number) as [number, number]
    if (new Date(y, m, 0) >= today) continue // 月が未完了
    const created = await generateMonthlySnapshot(db, claude, y, m)
    if (created) result.monthly++
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
    if (created) result.yearly++
  }

  return result
})
