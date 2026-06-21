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
  <div class="flex flex-col h-full gap-4">
    <!-- ヘッダー -->
    <div class="mb-6 shrink-0">
      <h1 class="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">メモ</h1>
      <p class="mt-2 text-slate-500 text-sm sm:text-base">日々の出来事・気づき・感情を記録してAIの素材として蓄積する</p>
    </div>

    <!-- 入力フォーム -->
    <div class="shrink-0 space-y-3 bg-slate-900/50 border border-slate-800/60 rounded-2xl p-4">
      <div>
        <label class="block text-xs text-slate-400 mb-1">記録日</label>
        <input
          v-model="memoDate"
          type="date"
          class="w-full bg-transparent text-sm text-slate-300 border border-slate-700/50 rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 transition-colors"
        >
      </div>
      <textarea
        v-model="content"
        placeholder="今日の出来事、気づき、感情…"
        rows="4"
        class="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 border border-slate-700/50 rounded-xl px-3 py-2.5 resize-none outline-none focus:border-amber-500/50 transition-colors leading-relaxed"
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
          class="px-4 py-1.5 rounded-xl text-sm font-semibold transition-all bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
          @click="save"
        >
          {{ saving ? '…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- メモ一覧 -->
    <section class="flex-1 overflow-y-auto min-h-0">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">記録一覧</h2>
      <div v-if="memos.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center">
        <p class="text-sm text-slate-600">まだメモがありません</p>
      </div>
      <div v-else class="space-y-2 pr-0.5">
        <div
          v-for="memo in memos"
          :key="memo.id"
          class="group bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 space-y-1.5"
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
          <p class="text-sm text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">{{ memo.content }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
