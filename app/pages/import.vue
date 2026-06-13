<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()

type BatchStatus = 'pending' | 'processing' | 'done' | 'error'
type DisplayStatus = BatchStatus | 'local-uploading' | 'local-processing' | 'local-error'

interface ImportedFile {
  id: string
  fileName: string
  content: string
  status: BatchStatus
  createdAt: string
  updatedAt: string
}

interface ProcessingFile {
  fileName: string
  startedAt: string
  status: 'local-uploading' | 'local-processing' | 'local-error'
  errorMessage?: string
}

interface DisplayItem {
  id: string
  fileName: string
  size?: number
  status: DisplayStatus
  createdAt: string
  errorMessage?: string
}

const processingFiles = ref(new Map<string, ProcessingFile>())
const batches = ref<ImportedFile[]>([])
const loadingBatches = ref(false)

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const showPasteModal = ref(false)
const pasteText = ref('')
const pasteName = ref('')
const pasteDate = ref('')

const statusLabel: Record<DisplayStatus, string> = {
  'local-uploading': 'アップロード中',
  'local-processing': '処理中',
  'local-error': 'エラー',
  pending: '未処理',
  processing: '処理中',
  done: '完了',
  error: 'エラー',
}
const statusColor: Record<DisplayStatus, string> = {
  'local-uploading': 'text-amber-400 bg-amber-900/30',
  'local-processing': 'text-sky-400 bg-sky-900/30',
  'local-error': 'text-red-400 bg-red-900/30',
  pending: 'text-slate-400 bg-slate-800/50',
  processing: 'text-amber-400 bg-amber-900/30',
  done: 'text-emerald-400 bg-emerald-900/30',
  error: 'text-red-400 bg-red-900/30',
}

const displayItems = computed<DisplayItem[]>(() => {
  const local: DisplayItem[] = Array.from(processingFiles.value.entries()).map(([id, f]) => ({
    id,
    fileName: f.fileName,
    status: f.status,
    createdAt: f.startedAt,
    errorMessage: f.errorMessage,
  }))
  const db: DisplayItem[] = batches.value.map(f => ({
    id: f.id,
    fileName: f.fileName,
    size: new TextEncoder().encode(f.content).length,
    status: f.status,
    createdAt: f.createdAt,
  }))
  return [...local, ...db]
})

async function processFile(file: File) {
  const tempId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  processingFiles.value = new Map(processingFiles.value.set(tempId, {
    fileName: file.name,
    startedAt,
    status: 'local-uploading',
  }))

  try {
    const formData = new FormData()
    formData.append('files', file)
    await $fetch('/api/import/upload', { method: 'POST', body: formData })

    processingFiles.value.set(tempId, { fileName: file.name, startedAt, status: 'local-processing' })
    processingFiles.value = new Map(processingFiles.value)

    await $fetch('/api/import/process', { method: 'POST' })

    processingFiles.value.delete(tempId)
    processingFiles.value = new Map(processingFiles.value)
    await fetchBatches()
  }
  catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message ?? 'インポートに失敗しました'
    processingFiles.value.set(tempId, { fileName: file.name, startedAt, status: 'local-error', errorMessage: msg })
    processingFiles.value = new Map(processingFiles.value)
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  for (const file of files) processFile(file)
}

function addPastedText() {
  const text = pasteText.value.trim()
  const name = pasteName.value.trim()
  const date = pasteDate.value.trim()
  if (!text || !name || !date) return
  const content = `[参考期間: ${date}]\n---\n${text}`
  const file = new File([content], `${name}.txt`, { type: 'text/plain' })
  pasteText.value = ''
  pasteName.value = ''
  pasteDate.value = ''
  showPasteModal.value = false
  processFile(file)
}

async function fetchBatches() {
  loadingBatches.value = true
  try {
    const res = await $fetch<{ files: ImportedFile[] }>('/api/import/files')
    batches.value = res.files
  }
  catch {
    // D1なし環境では無視
  }
  finally {
    loadingBatches.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (isAuthed.value) await fetchBatches()
})
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else class="py-4 max-w-3xl">
      <div class="mb-8">
        <h1 class="text-3xl font-black text-slate-50 tracking-tight">外部データ取り込み</h1>
        <p class="mt-2 text-slate-500">過去のログをインポートして、AIの素材として蓄積する</p>
      </div>

      <!-- インポートセクション -->
      <section class="mb-10">
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">インポート</h2>
        <div class="flex gap-2">
          <!-- <label class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 hover:border-sky-700 bg-slate-900/50 p-5 cursor-pointer transition-colors text-slate-400 hover:text-slate-200 text-sm">
            <span class="text-sky-400">⊕</span> ファイルを選択
            <input
              id="file-input"
              type="file"
              multiple
              class="hidden"
              @change="onFileChange"
            >
          </label> -->
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200 text-sm transition-colors p-5"
            @click="showPasteModal = true"
          >
            <span>📋</span> 文字を貼り付け
          </button>
        </div>
      </section>

      <!-- ファイル一覧 -->
      <section>
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">ファイル一覧</h2>

        <div v-if="loadingBatches" class="text-slate-600 text-sm py-6 text-center">読み込み中…</div>

        <div v-else-if="displayItems.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center">
          <p class="text-slate-600 text-sm">インポート履歴はありません</p>
        </div>

        <div v-else class="rounded-2xl border border-slate-800 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-800 text-left">
                <th class="px-4 py-3 text-xs text-slate-500 font-medium">ファイル名</th>
                <th class="px-4 py-3 text-xs text-slate-500 font-medium">ステータス</th>
                <th class="px-4 py-3 text-xs text-slate-500 font-medium">日時</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in displayItems"
                :key="item.id"
                class="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20"
              >
                <td class="px-4 py-3 text-slate-300 font-mono text-xs max-w-[260px] truncate" :title="item.errorMessage">
                  {{ item.fileName }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span v-if="item.size != null" class="text-slate-500 text-xs tabular-nums">{{ formatBytes(item.size) }}</span>
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusColor[item.status]]">
                      {{ statusLabel[item.status] }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-600 text-xs">{{ item.createdAt.slice(0, 16).replace('T', ' ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- テキスト貼り付けモーダル -->
    <div v-if="showPasteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showPasteModal = false; pasteText = ''; pasteName = ''; pasteDate = ''">
      <div class="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-lg mx-4 space-y-4">
        <h3 class="text-slate-100 font-semibold">テキストを貼り付け</h3>
        <p class="text-slate-500 text-xs">テキストをそのまま貼り付けてください。.txt ファイルとしてインポートされます。</p>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block text-xs text-slate-400 mb-1">ファイル名 <span class="text-red-400">*</span></label>
            <input
              v-model="pasteName"
              type="text"
              class="w-full rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-sm px-3 py-2 focus:outline-none focus:border-sky-600 placeholder:text-slate-600"
              placeholder="例: ChatGPT会話ログ_2024"
            >
          </div>
          <div class="w-40">
            <label class="block text-xs text-slate-400 mb-1">内容の日時 <span class="text-red-400">*</span></label>
            <input
              v-model="pasteDate"
              type="text"
              class="w-full rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-sm px-3 py-2 focus:outline-none focus:border-sky-600 placeholder:text-slate-600"
              placeholder="例: 2016年1月あたり"
            >
          </div>
        </div>
        <textarea
          v-model="pasteText"
          class="w-full h-48 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-sm p-3 resize-none focus:outline-none focus:border-sky-600 placeholder:text-slate-600"
          placeholder="ここにテキストを貼り付けてください…"
        />
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-700 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            @click="showPasteModal = false; pasteText = ''; pasteName = ''; pasteDate = ''"
          >
            キャンセル
          </button>
          <button
            type="button"
            :disabled="!pasteText.trim() || !pasteName.trim() || !pasteDate.trim()"
            :class="[
              'flex-1 rounded-xl py-2 text-sm font-medium transition-colors',
              pasteText.trim() && pasteName.trim() && pasteDate.trim() ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed',
            ]"
            @click="addPastedText"
          >
            インポート
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
