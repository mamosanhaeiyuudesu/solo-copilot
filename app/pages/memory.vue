<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()

type Polarity = 'positive' | 'negative'
type SourceType = 'imported_file' | 'chat_message'
type PeriodType = 'weekly' | 'monthly' | 'yearly' | 'manual' | 'past'

interface IntermediateRecord {
  id: string
  sourceId: string | null
  sourceType: SourceType | null
  date: string | null
  polarity: Polarity | null
  themeTags: string | null
  what: string | null
  why: string | null
  intensity: number | null
  createdAt: string
}

interface TagSummary {
  tag: string
  posCount: number
  negCount: number
  positive: string
  negative: string
}

interface MemorySnapshot {
  id: string
  periodType: PeriodType
  periodStart: string | null
  periodEnd: string | null
  tagSummaries: string | null
  createdAt: string
}

// テーマタグ（固定12）
const THEME_TAGS = [
  '発明', '心理', '子育て', '剣道', '夫婦', '会社',
  'AI', 'マーケティング', '転職', '親との関係', '節約', '地方創生',
]

function parseTags(json: string | null): string[] {
  if (!json) return []
  try { return JSON.parse(json) as string[] }
  catch { return [] }
}

function parseTagSummaries(json: string | null): TagSummary[] {
  if (!json) return []
  try { return JSON.parse(json) as TagSummary[] }
  catch { return [] }
}

const activeTab = ref<'timeline' | 'intermediate'>('timeline')
const timelineZoom = ref<'weekly' | 'monthly' | 'yearly'>('weekly')

// ===== 中間記憶 =====
const filterPolarity = ref('')
const filterSourceType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const intermediateRecords = ref<IntermediateRecord[]>([])
const loadingIntermediate = ref(false)
const sortOrder = ref<'desc' | 'asc'>('desc')

const selectedThemeTags = ref<Set<string>>(new Set(THEME_TAGS))
const allTagsSelected = computed(() => selectedThemeTags.value.size === THEME_TAGS.length)

function toggleThemeTag(tag: string) {
  const next = new Set(selectedThemeTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  selectedThemeTags.value = next
}
function selectAllTags() { selectedThemeTags.value = new Set(THEME_TAGS) }
function clearAllTags() { selectedThemeTags.value = new Set() }

const filteredRecords = computed(() => {
  const base = allTagsSelected.value
    ? intermediateRecords.value
    : intermediateRecords.value.filter((r) => {
        const tt = parseTags(r.themeTags)
        if (tt.length === 0) return true
        return tt.some(t => selectedThemeTags.value.has(t))
      })

  return [...base].sort((a, b) => {
    if (a.date === null && b.date === null) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return sortOrder.value === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  })
})

// 中間記憶 選択・削除
const selectedIds = ref<Set<string>>(new Set())
const deleting = ref(false)
const allSelected = computed(() =>
  filteredRecords.value.length > 0 && filteredRecords.value.every(r => selectedIds.value.has(r.id)),
)
function toggleAll() {
  selectedIds.value = allSelected.value ? new Set() : new Set(filteredRecords.value.map(r => r.id))
}
function toggleOne(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
async function deleteSelected() {
  if (selectedIds.value.size === 0) return
  if (!confirm(`${selectedIds.value.size}件の中間データを削除しますか？`)) return
  deleting.value = true
  try {
    await $fetch('/api/memory/intermediate', { method: 'DELETE', body: { ids: [...selectedIds.value] } })
    intermediateRecords.value = intermediateRecords.value.filter(r => !selectedIds.value.has(r.id))
    selectedIds.value = new Set()
  }
  catch { alert('削除に失敗しました') }
  finally { deleting.value = false }
}

// ===== バッチ / 再抽出 =====
const batching = ref(false)
const batchResult = ref<{ weekly: number; monthly: number; yearly: number } | null>(null)
const reextracting = ref(false)

async function runBatch() {
  batching.value = true
  batchResult.value = null
  try {
    batchResult.value = await $fetch('/api/memory/batch', { method: 'POST' })
    await fetchSnapshots()
  }
  catch { alert('バッチ処理に失敗しました') }
  finally { batching.value = false }
}

async function runReextract() {
  if (!confirm('既存の中間記憶・長期記憶を全て破棄し、インポートデータとチャットから再抽出します。よろしいですか？')) return
  reextracting.value = true
  batchResult.value = null
  try {
    const res = await $fetch<{ files: number; fileRecords: number; chatRecords: number }>(
      '/api/memory/reextract', { method: 'POST' },
    )
    alert(`再抽出完了：ファイル${res.files}件・中間記憶${res.fileRecords + res.chatRecords}件。続けて「記憶を更新」を押してください。`)
    await fetchIntermediate()
    await fetchSnapshots()
    selectedSnapshot.value = null
  }
  catch { alert('再抽出に失敗しました') }
  finally { reextracting.value = false }
}

// ===== スナップショット =====
const snapshots = ref<MemorySnapshot[]>([])
const loadingSnapshots = ref(false)
const selectedSnapshot = ref<MemorySnapshot | null>(null)
const loadingDetail = ref(false)

const polarityColor: Record<Polarity, string> = {
  positive: 'text-emerald-400 bg-emerald-900/30',
  negative: 'text-red-400 bg-red-900/30',
}
const polarityLabel: Record<Polarity, string> = { positive: 'ポジティブ', negative: 'ネガティブ' }
const periodLabel: Record<PeriodType, string> = {
  weekly: '週次', monthly: '月次', yearly: '年次', manual: '手動', past: '過去',
}

async function fetchIntermediate() {
  loadingIntermediate.value = true
  try {
    const params: Record<string, string> = {}
    if (filterPolarity.value) params.polarity = filterPolarity.value
    if (filterSourceType.value) params.sourceType = filterSourceType.value
    if (filterDateFrom.value) params.dateFrom = filterDateFrom.value
    if (filterDateTo.value) params.dateTo = filterDateTo.value
    const res = await $fetch<{ records: IntermediateRecord[] }>('/api/memory/intermediate', { params })
    intermediateRecords.value = res.records
  }
  catch { /* D1なし環境では無視 */ }
  finally { loadingIntermediate.value = false }
}

async function fetchSnapshots() {
  loadingSnapshots.value = true
  try {
    const res = await $fetch<{ snapshots: MemorySnapshot[] }>('/api/memory/snapshots')
    snapshots.value = res.snapshots
  }
  catch { /* D1なし環境では無視 */ }
  finally { loadingSnapshots.value = false }
}

async function selectSnapshot(snap: MemorySnapshot) {
  if (selectedSnapshot.value?.id === snap.id) { selectedSnapshot.value = null; return }
  loadingDetail.value = true
  try {
    selectedSnapshot.value = await $fetch<MemorySnapshot>(`/api/memory/snapshots/${snap.id}`)
  }
  catch { selectedSnapshot.value = snap }
  finally { loadingDetail.value = false }
}

const detailTagSummaries = computed(() => parseTagSummaries(selectedSnapshot.value?.tagSummaries ?? null))

watch(activeTab, (tab) => {
  if (tab === 'intermediate' && intermediateRecords.value.length === 0) fetchIntermediate()
  if (tab === 'timeline' && snapshots.value.length === 0) fetchSnapshots()
})

onMounted(async () => {
  await checkAuth()
  if (isAuthed.value) fetchSnapshots()
})
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else class="py-4">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">記憶ビューア</h1>
          <p class="mt-2 text-slate-500 text-sm sm:text-base">自分の過去をテーマ別タイムラインで振り返る</p>
        </div>
        <div class="flex gap-2 shrink-0 sm:mt-1">
          <button
            type="button"
            :disabled="reextracting || batching"
            class="px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 border border-slate-700 transition-colors"
            @click="runReextract"
          >
            {{ reextracting ? '再抽出中…' : '全データ再抽出' }}
          </button>
          <button
            type="button"
            :disabled="batching || reextracting"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            @click="runBatch"
          >
            {{ batching ? '処理中…' : '記憶を更新' }}
          </button>
        </div>
      </div>

      <div v-if="batchResult" class="mb-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-500">
        週次{{ batchResult.weekly }}件・月次{{ batchResult.monthly }}件・年次{{ batchResult.yearly }}件を処理しました
      </div>

      <!-- タブ -->
      <div class="flex gap-1 mb-6 border-b border-slate-800">
        <button
          v-for="tab in [{ key: 'timeline', label: 'タイムライン' }, { key: 'intermediate', label: '中間記憶' }] as const"
          :key="tab.key"
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.key ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-500 hover:text-slate-300',
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- タイムラインタブ -->
      <div v-if="activeTab === 'timeline'">
        <div v-if="loadingSnapshots" class="text-slate-600 text-sm py-10 text-center">読み込み中…</div>

        <template v-else>
          <MemoryTimelineView
            v-model:zoom="timelineZoom"
            :snapshots="snapshots"
            :selected-id="selectedSnapshot?.id ?? null"
            @select="selectSnapshot"
          />

          <!-- 詳細パネル -->
          <div v-if="selectedSnapshot" class="mt-4 rounded-xl border border-violet-600/30 bg-slate-900/80 p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium text-violet-300 bg-violet-900/30">
                  {{ periodLabel[selectedSnapshot.periodType] }}
                </span>
                <span class="text-sm text-slate-300">
                  {{ selectedSnapshot.periodStart ?? selectedSnapshot.createdAt.slice(0, 10) }}
                  <span v-if="selectedSnapshot.periodEnd"> 〜 {{ selectedSnapshot.periodEnd }}</span>
                </span>
              </div>
              <button type="button" class="text-slate-500 hover:text-slate-300 text-sm" @click="selectedSnapshot = null">✕</button>
            </div>

            <div v-if="loadingDetail" class="text-slate-600 text-sm text-center py-4">読み込み中…</div>
            <template v-else-if="detailTagSummaries.length">
              <div v-for="ts in detailTagSummaries" :key="ts.tag" class="rounded-lg border border-slate-800 p-3 space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-200">#{{ ts.tag }}</span>
                  <span v-if="ts.posCount" class="text-xs text-emerald-400">+{{ ts.posCount }}</span>
                  <span v-if="ts.negCount" class="text-xs text-red-400">-{{ ts.negCount }}</span>
                </div>
                <div v-if="ts.positive" class="flex gap-2">
                  <span class="text-emerald-500 text-xs mt-0.5 shrink-0">良</span>
                  <p class="text-sm text-slate-300">{{ ts.positive }}</p>
                </div>
                <div v-if="ts.negative" class="flex gap-2">
                  <span class="text-red-500 text-xs mt-0.5 shrink-0">難</span>
                  <p class="text-sm text-slate-300">{{ ts.negative }}</p>
                </div>
              </div>
            </template>
            <p v-else class="text-slate-600 text-sm text-center py-2">詳細データがありません</p>
          </div>
        </template>
      </div>

      <!-- 中間記憶タブ -->
      <div v-else-if="activeTab === 'intermediate'">
        <div class="flex flex-wrap gap-3 mb-5">
          <select
            v-model="filterPolarity"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchIntermediate"
          >
            <option value="">polarity: すべて</option>
            <option value="positive">ポジティブ</option>
            <option value="negative">ネガティブ</option>
          </select>
          <select
            v-model="filterSourceType"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchIntermediate"
          >
            <option value="">ソース: すべて</option>
            <option value="imported_file">外部データ</option>
            <option value="chat_message">チャット</option>
          </select>
          <input v-model="filterDateFrom" type="date" class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5" @change="fetchIntermediate">
          <span class="text-slate-600 self-center text-xs">〜</span>
          <input v-model="filterDateTo" type="date" class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5" @change="fetchIntermediate">
          <button
            type="button"
            class="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 hover:border-slate-600 transition-colors"
            @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
          >
            日付 {{ sortOrder === 'desc' ? '↓' : '↑' }}
          </button>
        </div>

        <!-- テーマタグ絞り込み -->
        <div class="flex flex-wrap items-center gap-1.5 mb-5">
          <button
            v-for="tag in THEME_TAGS"
            :key="tag"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-full text-xs transition-colors',
              selectedThemeTags.has(tag) ? 'bg-violet-900/40 text-violet-300 border border-violet-700/60' : 'bg-slate-800/60 text-slate-600 border border-slate-800',
            ]"
            @click="toggleThemeTag(tag)"
          >#{{ tag }}</button>
          <button type="button" class="text-xs text-violet-400 hover:text-violet-300 ml-1" @click="selectAllTags">全選択</button>
          <button type="button" class="text-xs text-slate-500 hover:text-slate-400" @click="clearAllTags">全解除</button>
        </div>

        <div v-if="loadingIntermediate" class="text-slate-600 text-sm py-10 text-center">読み込み中…</div>

        <div v-else-if="intermediateRecords.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p class="text-slate-600 text-sm mb-1">中間記憶はまだありません</p>
          <p class="text-slate-700 text-xs">外部データをインポートしてAI処理が完了すると表示されます</p>
        </div>

        <div v-else-if="filteredRecords.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p class="text-slate-600 text-sm">選択中のタグに一致するデータがありません</p>
        </div>

        <div v-else>
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-400 select-none">
                <input type="checkbox" :checked="allSelected" class="accent-violet-500 w-4 h-4 cursor-pointer" @change="toggleAll">
                全選択
              </label>
              <button
                v-if="selectedIds.size > 0"
                type="button"
                :disabled="deleting"
                class="px-3 py-1 rounded-lg text-xs font-medium bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-800/50 disabled:opacity-50 transition-colors"
                @click="deleteSelected"
              >
                {{ deleting ? '削除中…' : `${selectedIds.size}件を削除` }}
              </button>
            </div>
            <span class="text-xs text-slate-600">
              {{ filteredRecords.length }}件
              <span v-if="!allTagsSelected && intermediateRecords.length !== filteredRecords.length" class="text-slate-700">/ 全{{ intermediateRecords.length }}件</span>
            </span>
          </div>

          <div class="space-y-2">
            <div
              v-for="record in filteredRecords"
              :key="record.id"
              :class="[
                'rounded-xl border p-4 transition-colors cursor-pointer',
                selectedIds.has(record.id) ? 'border-violet-600/50 bg-violet-900/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
              ]"
              @click="toggleOne(record.id)"
            >
              <div class="flex items-start gap-3">
                <input type="checkbox" :checked="selectedIds.has(record.id)" class="accent-violet-500 w-4 h-4 mt-0.5 shrink-0 cursor-pointer" @click.stop @change="toggleOne(record.id)">
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3 mb-1.5">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span v-if="record.polarity" :class="['px-2 py-0.5 rounded-full text-xs font-medium', polarityColor[record.polarity]]">
                        {{ polarityLabel[record.polarity] }}
                      </span>
                      <span v-for="tag in parseTags(record.themeTags)" :key="tag" class="px-2 py-0.5 rounded-full text-xs text-slate-400 bg-slate-800/60">
                        #{{ tag }}
                      </span>
                      <span v-if="record.intensity !== null" class="text-xs text-slate-500">強度: {{ record.intensity }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                      <span>{{ record.date ?? record.createdAt.slice(0, 10) }}</span>
                      <span v-if="record.sourceType" class="text-slate-700">
                        {{ record.sourceType === 'chat_message' ? 'チャット' : '外部データ' }}
                      </span>
                    </div>
                  </div>
                  <p v-if="record.what" class="text-sm text-slate-200">{{ record.what }}</p>
                  <p v-if="record.why" class="mt-1 text-xs text-slate-500">{{ record.why }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
