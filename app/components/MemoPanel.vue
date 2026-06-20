<script setup lang="ts">
type Memo = {
  id: string
  memoDate: string | null
  content: string
  status: 'pending' | 'done' | 'error'
  createdAt: string
  intermediateCount: number
}

const memos = ref<Memo[]>([])
const memoDate = ref(new Date().toISOString().slice(0, 10))
const content = ref('')
const saving = ref(false)
const deletingId = ref<string | null>(null)
const lastExtracted = ref<number | null>(null)

async function load() {
  memos.value = await $fetch<Memo[]>('/api/memos')
}

onMounted(load)

async function save() {
  if (!content.value.trim() || saving.value) return
  saving.value = true
  lastExtracted.value = null
  try {
    const result = await $fetch<{ id: string; extracted: number }>('/api/memos', {
      method: 'POST',
      body: { memoDate: memoDate.value || undefined, content: content.value.trim() },
    })
    content.value = ''
    lastExtracted.value = result.extracted
    await load()
    setTimeout(() => { lastExtracted.value = null }, 5000)
  }
  finally {
    saving.value = false
  }
}

async function remove(id: string) {
  if (deletingId.value) return
  deletingId.value = id
  try {
    await $fetch(`/api/memos/${id}`, { method: 'DELETE' })
    memos.value = memos.value.filter(m => m.id !== id)
  }
  finally {
    deletingId.value = null
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col h-full gap-3">
    <!-- ヘッダー -->
    <h2 class="text-base font-bold text-slate-300 tracking-tight shrink-0">メモ</h2>

    <!-- 入力フォーム -->
    <div class="shrink-0 space-y-2 bg-slate-900/50 border border-slate-800/60 rounded-xl p-3">
      <input
        v-model="memoDate"
        type="date"
        class="w-full bg-transparent text-xs text-slate-400 border border-slate-700/50 rounded-lg px-2 py-1.5 outline-none focus:border-amber-500/50 transition-colors"
      >
      <textarea
        v-model="content"
        placeholder="今日の出来事、気づき、感情…"
        rows="4"
        class="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 border border-slate-700/50 rounded-lg px-3 py-2 resize-none outline-none focus:border-amber-500/50 transition-colors leading-relaxed"
        :disabled="saving"
      />
      <div class="flex items-center justify-between">
        <span v-if="lastExtracted !== null" class="text-xs text-amber-400">
          中間データ {{ lastExtracted }}件 生成
        </span>
        <span v-else-if="saving" class="text-xs text-slate-500">
          AIが分析中…
        </span>
        <span v-else class="text-xs text-slate-600">Shift+Enter で改行</span>
        <button
          :disabled="!content.trim() || saving"
          class="px-3 py-1 rounded-lg text-xs font-semibold transition-all bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
          @click="save"
        >
          {{ saving ? '…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- メモ一覧 -->
    <div class="flex-1 overflow-y-auto space-y-2 pr-0.5">
      <p v-if="memos.length === 0" class="text-xs text-slate-600 text-center pt-4">まだメモがありません</p>
      <div
        v-for="memo in memos"
        :key="memo.id"
        class="group bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 space-y-1.5"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500">
            {{ memo.memoDate ? formatDate(memo.memoDate) : formatCreatedAt(memo.createdAt) }}
          </span>
          <div class="flex items-center gap-2">
            <span v-if="memo.status === 'done' && memo.intermediateCount > 0" class="text-xs text-amber-500/70">
              {{ memo.intermediateCount }}件
            </span>
            <span v-else-if="memo.status === 'error'" class="text-xs text-red-500/70">エラー</span>
            <button
              class="opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-red-400 transition-all"
              :disabled="deletingId !== null"
              @click="remove(memo.id)"
            >
              {{ deletingId === memo.id ? '…' : '削除' }}
            </button>
          </div>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">{{ memo.content }}</p>
      </div>
    </div>
  </div>
</template>
