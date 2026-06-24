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

  const result = { weekly: 0, monthly: 0, yearly: 0, errors: [] as string[] }

  // 1. intensity >= 2 のレコード日付を収集し、データが存在する週だけを対象にする
  //    （全週スキャンするとタイムアウトするため）
  const recordDates = await db
    .select({ date: intermediateRecords.date })
    .from(intermediateRecords)
    .where(gte(intermediateRecords.intensity, 2))

  const weekSet = new Set<string>()
  for (const { date } of recordDates) {
    if (!date || date === 'null') continue
    const d = new Date(date)
    if (isNaN(d.getTime())) continue
    const mon = getMondayOf(d)
    if (mon <= today) weekSet.add(toDateStr(mon))
  }

  // 2. 時系列順に週次スナップショットを生成（generateWeeklySnapshot が冪等性を保証）
  for (const mondayStr of [...weekSet].sort()) {
    const sunday = toDateStr(addDays(new Date(mondayStr), 6))
    try {
      const created = await generateWeeklySnapshot(db, claude, mondayStr, sunday)
      if (created) result.weekly++
    }
    catch (e) {
      const msg = `週次 ${mondayStr}: ${e instanceof Error ? e.message : String(e)}`
      console.error('[batch] ' + msg)
      result.errors.push(msg)
    }
  }

  // 3. 週次スナップショットが存在する完了済み月の月次スナップショットを生成
  const allWeeklies = await db.select({ periodStart: memorySnapshots.periodStart })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'weekly'))

  const monthsWithWeeklies = new Set<string>()
  for (const w of allWeeklies) {
    if (!w.periodStart) continue
    const d = new Date(w.periodStart)
    monthsWithWeeklies.add(`${d.getFullYear()}-${d.getMonth() + 1}`)
  }

  for (const key of monthsWithWeeklies) {
    const [y, m] = key.split('-').map(Number) as [number, number]
    if (new Date(y, m - 1, 1) > today) continue // 月がまだ始まっていない
    try {
      const created = await generateMonthlySnapshot(db, claude, y, m)
      if (created) result.monthly++
    }
    catch (e) {
      const msg = `月次 ${key}: ${e instanceof Error ? e.message : String(e)}`
      console.error('[batch] ' + msg)
      result.errors.push(msg)
    }
  }

  // 4. 月次スナップショットが存在する完了済み年の年次スナップショットを生成
  const allMonthlies = await db.select({ periodStart: memorySnapshots.periodStart })
    .from(memorySnapshots)
    .where(eq(memorySnapshots.periodType, 'monthly'))

  const yearsWithMonthlies = new Set<number>()
  for (const m of allMonthlies) {
    if (m.periodStart) yearsWithMonthlies.add(Number(m.periodStart.slice(0, 4)))
  }

  for (const year of yearsWithMonthlies) {
    if (new Date(year, 0, 1) > today) continue // 年がまだ始まっていない
    try {
      const created = await generateYearlySnapshot(db, claude, year)
      if (created) result.yearly++
    }
    catch (e) {
      const msg = `年次 ${year}: ${e instanceof Error ? e.message : String(e)}`
      console.error('[batch] ' + msg)
      result.errors.push(msg)
    }
  }

  return result
})
