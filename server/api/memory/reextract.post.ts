import { asc, eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { getClaudeClient } from '../../utils/claude'
import {
  importedFiles,
  intermediateRecords,
  extractionLogs,
  memorySnapshots,
  messages,
  memos,
} from '../../db/schema'
import { extractIntermediateItems, splitIntoChunks } from '../../utils/extraction'

// 全記憶を作り直す：既存の中間記憶・スナップショット・抽出ログを破棄し、
// インポートファイル・チャットメッセージ・メモから再抽出する。
export default defineEventHandler(async (event) => {
  const db = getDb(event)
  const claude = getClaudeClient(event)

  // 1. 既存の派生データを全削除
  await db.delete(memorySnapshots).run()
  await db.delete(extractionLogs).run()
  await db.delete(intermediateRecords).run()

  const result = { files: 0, memos: 0, fileRecords: 0, chatRecords: 0, memoRecords: 0 }

  // 2. インポートファイルを再抽出
  const files = await db.select().from(importedFiles)
  for (const file of files) {
    try {
      const chunks = splitIntoChunks(file.content)
      const items = (await Promise.all(chunks.map(c => extractIntermediateItems(claude, c)))).flat()

      let firstRecordId: string | null = null
      for (const item of items) {
        const id = crypto.randomUUID()
        if (!firstRecordId) firstRecordId = id
        await db.insert(intermediateRecords).values({
          id,
          sourceId: file.id,
          sourceType: 'imported_file',
          date: item.date ?? null,
          polarity: item.polarity,
          themeTags: JSON.stringify(item.theme_tags),
          what: item.what,
          why: item.why ?? null,
          intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
        })
      }
      await db.insert(extractionLogs).values({
        id: crypto.randomUUID(),
        sourceId: file.id,
        sourceType: 'imported_file',
        intermediateRecordId: firstRecordId,
      })
      await db.update(importedFiles).set({ status: 'done' }).where(eq(importedFiles.id, file.id))
      result.files++
      result.fileRecords += items.length
    }
    catch {
      await db.update(importedFiles).set({ status: 'error' }).where(eq(importedFiles.id, file.id))
    }
  }

  // 3. チャットメッセージを再抽出（会話順に結合 → チャンク分割）
  const allMessages = await db.select().from(messages).orderBy(asc(messages.createdAt))
  if (allMessages.length > 0) {
    const combined = allMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')
    const chunks = splitIntoChunks(combined)
    const items = (await Promise.all(chunks.map(c => extractIntermediateItems(claude, c)))).flat()

    let firstRecordId: string | null = null
    for (const item of items) {
      const id = crypto.randomUUID()
      if (!firstRecordId) firstRecordId = id
      await db.insert(intermediateRecords).values({
        id,
        sourceId: allMessages[0]!.id,
        sourceType: 'chat_message',
        date: item.date ?? null,
        polarity: item.polarity,
        themeTags: JSON.stringify(item.theme_tags),
        what: item.what,
        why: item.why ?? null,
        intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
      })
    }
    // 全メッセージを処理済みとして記録（自動抽出の二重処理を防ぐ）
    for (const m of allMessages) {
      await db.insert(extractionLogs).values({
        id: crypto.randomUUID(),
        sourceId: m.id,
        sourceType: 'chat_message',
        intermediateRecordId: firstRecordId,
      })
    }
    result.chatRecords = items.length
  }

  // 4. メモを再抽出（1件ずつ処理）
  const allMemos = await db.select().from(memos).orderBy(asc(memos.createdAt))
  for (const memo of allMemos) {
    try {
      const contextualContent = memo.memoDate
        ? `[参考期間: ${memo.memoDate}]\n---\n${memo.content}`
        : memo.content
      const chunks = splitIntoChunks(contextualContent)
      const items = (await Promise.all(chunks.map(c => extractIntermediateItems(claude, c)))).flat()

      let firstRecordId: string | null = null
      for (const item of items) {
        const id = crypto.randomUUID()
        if (!firstRecordId) firstRecordId = id
        await db.insert(intermediateRecords).values({
          id,
          sourceId: memo.id,
          sourceType: 'memo',
          date: item.date ?? memo.memoDate ?? null,
          polarity: item.polarity,
          themeTags: JSON.stringify(item.theme_tags),
          what: item.what,
          why: item.why ?? null,
          intensity: Math.min(5, Math.max(1, Math.round(item.intensity))),
        })
      }
      await db.insert(extractionLogs).values({
        id: crypto.randomUUID(),
        sourceId: memo.id,
        sourceType: 'memo',
        intermediateRecordId: firstRecordId,
      }).onConflictDoNothing()
      await db.update(memos).set({ status: 'done' }).where(eq(memos.id, memo.id))
      result.memos++
      result.memoRecords += items.length
    }
    catch {
      await db.update(memos).set({ status: 'error' }).where(eq(memos.id, memo.id))
    }
  }

  return result
})
