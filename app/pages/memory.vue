<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()

type Polarity = 'positive' | 'negative' | 'neutral'
type SourceType = 'imported_file' | 'task' | 'chat_message'
type PeriodType = 'weekly' | 'monthly' | 'yearly' | 'manual' | 'past'

interface IntermediateRecord {
  id: string
  sourceId: string | null
  sourceType: SourceType | null
  date: string | null
  polarity: Polarity | null
  emotionTags: string | null
  themeTags: string | null
  what: string | null
  why: string | null
  intensity: number | null
  createdAt: string
}

interface MemorySnapshot {
  id: string
  periodType: PeriodType
  periodStart: string | null
  periodEnd: string | null
  achievements: string | null
  struggles: string | null
  interests: string | null
  aiSummary: string | null
  recommendedFocus: string | null
  integratedAdvice: string | null
  financeSummary: string | null
  healthTrend: string | null
  createdAt: string
}

interface LivingProfile {
  aiSummary: string | null
  recommendedFocus: string | null
  periodEnd: string | null
}

// タグ定義
const EMOTION_TAGS = {
  positive: ['達成', '前進', 'スキル獲得', '気づき', '承認', '喜び', '熱中', '感謝', 'つながり'],
  negative: ['不安', '自己不信', '停滞', '抱えすぎ', '摩擦', '疲労', 'もどかしさ'],
  neutral: ['振り返り', '決断', '価値観', 'ビジョン'],
} as const

const THEME_TAGS = {
  human: { label: '人間関係', tags: ['夫婦', '親子', '家族', '友人', '仕事仲間', 'クライアント'] },
  career: { label: 'キャリア・仕事', tags: ['本業', '副業', '独立', '営業', '教育', 'インタビュー'] },
  skill: { label: '専門領域', tags: ['AI', 'データ可視化', 'プロトタイピング', '開発'] },
  health: { label: 'お金・健康', tags: ['お金', '健康', 'メンタル'] },
  value: { label: '価値観・内面', tags: ['地方創生', '社会貢献', '学び', '創造'] },
  hobby: { label: '趣味・習慣', tags: ['剣道', '子育て'] },
} as const

const ALL_EMOTION_TAGS = [
  ...EMOTION_TAGS.positive,
  ...EMOTION_TAGS.negative,
  ...EMOTION_TAGS.neutral,
]
const ALL_THEME_TAGS = Object.values(THEME_TAGS).flatMap(g => g.tags)

function parseTags(json: string | null): string[] {
  if (!json) return []
  try { return JSON.parse(json) as string[] }
  catch { return [] }
}

const activeTab = ref<'intermediate' | 'snapshots'>('intermediate')

// 中間記憶フィルター
const filterPolarity = ref('')
const filterSourceType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const intermediateRecords = ref<IntermediateRecord[]>([])
const loadingIntermediate = ref(false)

// タグピッカー
const tagPickerOpen = ref(false)
const selectedEmotionTags = ref<Set<string>>(new Set(ALL_EMOTION_TAGS))
const selectedThemeTags = ref<Set<string>>(new Set(ALL_THEME_TAGS))

const allTagsSelected = computed(
  () => selectedEmotionTags.value.size === ALL_EMOTION_TAGS.length
    && selectedThemeTags.value.size === ALL_THEME_TAGS.length,
)

const deselectedCount = computed(
  () => (ALL_EMOTION_TAGS.length - selectedEmotionTags.value.size)
    + (ALL_THEME_TAGS.length - selectedThemeTags.value.size),
)

function toggleEmotionTag(tag: string) {
  const next = new Set(selectedEmotionTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  selectedEmotionTags.value = next
}

function toggleThemeTag(tag: string) {
  const next = new Set(selectedThemeTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  selectedThemeTags.value = next
}

function selectAllTags() {
  selectedEmotionTags.value = new Set(ALL_EMOTION_TAGS)
  selectedThemeTags.value = new Set(ALL_THEME_TAGS)
}

function clearAllTags() {
  selectedEmotionTags.value = new Set()
  selectedThemeTags.value = new Set()
}

// クライアント側タグフィルター
const filteredRecords = computed(() => {
  if (allTagsSelected.value) return intermediateRecords.value
  return intermediateRecords.value.filter((r) => {
    const et = parseTags(r.emotionTags)
    const tt = parseTags(r.themeTags)
    if (et.length === 0 && tt.length === 0) return true
    return et.some(t => selectedEmotionTags.value.has(t))
      || tt.some(t => selectedThemeTags.value.has(t))
  })
})

// 中間記憶選択・削除
const selectedIds = ref<Set<string>>(new Set())
const deleting = ref(false)

const allSelected = computed(() =>
  filteredRecords.value.length > 0
  && filteredRecords.value.every(r => selectedIds.value.has(r.id)),
)

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  }
  else {
    selectedIds.value = new Set(filteredRecords.value.map(r => r.id))
  }
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
    await $fetch('/api/memory/intermediate', {
      method: 'DELETE',
      body: { ids: [...selectedIds.value] },
    })
    intermediateRecords.value = intermediateRecords.value.filter(r => !selectedIds.value.has(r.id))
    selectedIds.value = new Set()
  }
  catch {
    alert('削除に失敗しました')
  }
  finally {
    deleting.value = false
  }
}

// 記憶フィルター
const batching = ref(false)
const batchResult = ref<{ weekly: number; monthly: number; yearly: number; livingProfile: boolean } | null>(null)
const livingProfile = ref<LivingProfile | null>(null)
const showProfile = ref(false)

async function fetchLivingProfile() {
  try {
    const res = await $fetch<{ profile: LivingProfile | null }>('/api/memory/profile')
    livingProfile.value = res.profile
  }
  catch {}
}

async function runBatch() {
  batching.value = true
  batchResult.value = null
  try {
    const res = await $fetch<{ weekly: number; monthly: number; yearly: number; livingProfile: boolean }>(
      '/api/memory/batch',
      { method: 'POST' },
    )
    batchResult.value = res
    await fetchLivingProfile()
  }
  catch {
    alert('バッチ処理に失敗しました')
  }
  finally {
    batching.value = false
  }
}

const filterPeriodType = ref('')
const snapshots = ref<MemorySnapshot[]>([])
const loadingSnapshots = ref(false)
const selectedSnapshot = ref<MemorySnapshot | null>(null)
const loadingDetail = ref(false)

const polarityLabel: Record<Polarity, string> = {
  positive: 'ポジティブ',
  negative: 'ネガティブ',
  neutral: 'ニュートラル',
}
const polarityColor: Record<Polarity, string> = {
  positive: 'text-emerald-400 bg-emerald-900/30',
  negative: 'text-red-400 bg-red-900/30',
  neutral: 'text-slate-400 bg-slate-800/50',
}
const periodLabel: Record<PeriodType, string> = {
  weekly: '週次',
  monthly: '月次',
  yearly: '年次',
  manual: '手動',
  past: '過去',
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
  catch {
    // D1なし環境では無視
  }
  finally {
    loadingIntermediate.value = false
  }
}

async function fetchSnapshots() {
  loadingSnapshots.value = true
  try {
    const params: Record<string, string> = {}
    if (filterPeriodType.value) params.periodType = filterPeriodType.value

    const res = await $fetch<{ snapshots: MemorySnapshot[] }>('/api/memory/snapshots', { params })
    snapshots.value = res.snapshots
  }
  catch {
    // D1なし環境では無視
  }
  finally {
    loadingSnapshots.value = false
  }
}

async function selectSnapshot(snapshot: MemorySnapshot) {
  if (selectedSnapshot.value?.id === snapshot.id) {
    selectedSnapshot.value = null
    return
  }
  loadingDetail.value = true
  try {
    const detail = await $fetch<MemorySnapshot>(`/api/memory/snapshots/${snapshot.id}`)
    selectedSnapshot.value = detail
  }
  catch {
    selectedSnapshot.value = snapshot
  }
  finally {
    loadingDetail.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'intermediate' && intermediateRecords.value.length === 0) fetchIntermediate()
  if (tab === 'snapshots' && snapshots.value.length === 0) fetchSnapshots()
})

onMounted(async () => {
  await checkAuth()
  if (isAuthed.value) {
    fetchIntermediate()
    fetchLivingProfile()
  }
})
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else class="py-4">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-50 tracking-tight">記憶ビューア</h1>
          <p class="mt-2 text-slate-500">中間記憶と長期記憶を閲覧する</p>
        </div>
        <button
          type="button"
          :disabled="batching"
          class="shrink-0 mt-1 px-4 py-2 rounded-lg text-sm font-medium bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          @click="runBatch"
        >
          {{ batching ? '処理中…' : '記憶を更新' }}
        </button>
      </div>

      <!-- バッチ結果 / プロファイルパネル -->
      <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
        <div class="flex items-center justify-between gap-4">
          <div class="text-sm">
            <span v-if="livingProfile?.periodEnd" class="text-slate-400">
              プロファイル最終更新: <span class="text-slate-300">{{ livingProfile.periodEnd }}</span>
            </span>
            <span v-else class="text-slate-600">プロファイル未生成</span>
            <span v-if="batchResult" class="ml-4 text-xs text-slate-500">
              週次{{ batchResult.weekly }}件・月次{{ batchResult.monthly }}件・年次{{ batchResult.yearly }}件を処理
              <span v-if="batchResult.livingProfile" class="text-violet-400">・プロファイル更新済み</span>
            </span>
          </div>
          <button
            v-if="livingProfile?.aiSummary"
            type="button"
            class="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            @click="showProfile = !showProfile"
          >
            {{ showProfile ? 'プロファイルを隠す' : 'プロファイルを表示' }}
          </button>
        </div>
        <div v-if="showProfile && livingProfile?.aiSummary" class="mt-4 pt-4 border-t border-slate-800">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">現在のプロファイル（AI参照用）</p>
          <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ livingProfile.aiSummary }}</p>
          <div v-if="livingProfile.recommendedFocus" class="mt-3 pt-3 border-t border-slate-800/50">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">現在の優先事項</p>
            <p class="text-sm text-slate-400 whitespace-pre-wrap">{{ livingProfile.recommendedFocus }}</p>
          </div>
        </div>
      </div>

      <!-- タブ -->
      <div class="flex gap-1 mb-6 border-b border-slate-800">
        <button
          v-for="tab in [{ key: 'intermediate', label: '中間記憶' }, { key: 'snapshots', label: '長期記憶' }] as const"
          :key="tab.key"
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.key
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-slate-500 hover:text-slate-300',
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 中間記憶タブ -->
      <div v-if="activeTab === 'intermediate'">
        <!-- フィルター -->
        <div class="flex flex-wrap gap-3 mb-5">
          <select
            v-model="filterPolarity"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchIntermediate"
          >
            <option value="">polarity: すべて</option>
            <option value="positive">ポジティブ</option>
            <option value="negative">ネガティブ</option>
            <option value="neutral">ニュートラル</option>
          </select>

          <!-- タグピッカー -->
          <div class="relative">
            <!-- バックドロップ -->
            <div
              v-if="tagPickerOpen"
              class="fixed inset-0 z-40"
              @click="tagPickerOpen = false"
            />

            <button
              type="button"
              :class="[
                'flex items-center gap-2 border text-sm rounded-lg px-3 py-1.5 transition-colors',
                allTagsSelected
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  : 'bg-violet-900/30 border-violet-700/60 text-violet-300',
              ]"
              @click="tagPickerOpen = !tagPickerOpen"
            >
              <span>タグ</span>
              <span v-if="!allTagsSelected" class="px-1.5 py-0.5 bg-violet-600 text-white text-xs rounded-full leading-none">
                -{{ deselectedCount }}
              </span>
              <span class="text-slate-500 text-xs">{{ tagPickerOpen ? '▲' : '▼' }}</span>
            </button>

            <!-- ポップアップ -->
            <div
              v-if="tagPickerOpen"
              class="absolute z-50 top-full left-0 mt-1 w-80 max-h-[480px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
              <!-- ヘッダー -->
              <div class="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">タグで絞り込み</span>
                <div class="flex gap-3 text-xs">
                  <button type="button" class="text-violet-400 hover:text-violet-300 transition-colors" @click="selectAllTags">全選択</button>
                  <button type="button" class="text-slate-500 hover:text-slate-400 transition-colors" @click="clearAllTags">全解除</button>
                </div>
              </div>

              <div class="p-4 space-y-5">
                <!-- 感情タグ -->
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">感情タグ</p>

                  <div class="space-y-3">
                    <!-- ポジティブ -->
                    <div>
                      <p class="text-xs text-emerald-600 mb-1.5">ポジティブ</p>
                      <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                        <label
                          v-for="tag in EMOTION_TAGS.positive"
                          :key="tag"
                          class="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            :checked="selectedEmotionTags.has(tag)"
                            class="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            @change="toggleEmotionTag(tag)"
                          >
                          <span :class="['text-xs', selectedEmotionTags.has(tag) ? 'text-slate-300' : 'text-slate-600 line-through']">{{ tag }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- ネガティブ -->
                    <div>
                      <p class="text-xs text-red-600 mb-1.5">ネガティブ</p>
                      <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                        <label
                          v-for="tag in EMOTION_TAGS.negative"
                          :key="tag"
                          class="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            :checked="selectedEmotionTags.has(tag)"
                            class="accent-red-500 w-3.5 h-3.5 cursor-pointer"
                            @change="toggleEmotionTag(tag)"
                          >
                          <span :class="['text-xs', selectedEmotionTags.has(tag) ? 'text-slate-300' : 'text-slate-600 line-through']">{{ tag }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- ニュートラル -->
                    <div>
                      <p class="text-xs text-slate-500 mb-1.5">ニュートラル</p>
                      <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                        <label
                          v-for="tag in EMOTION_TAGS.neutral"
                          :key="tag"
                          class="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            :checked="selectedEmotionTags.has(tag)"
                            class="accent-slate-400 w-3.5 h-3.5 cursor-pointer"
                            @change="toggleEmotionTag(tag)"
                          >
                          <span :class="['text-xs', selectedEmotionTags.has(tag) ? 'text-slate-300' : 'text-slate-600 line-through']">{{ tag }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-800" />

                <!-- テーマタグ -->
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">テーマタグ</p>
                  <div class="space-y-3">
                    <div
                      v-for="(group, key) in THEME_TAGS"
                      :key="key"
                    >
                      <p class="text-xs text-slate-500 mb-1.5">{{ group.label }}</p>
                      <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                        <label
                          v-for="tag in group.tags"
                          :key="tag"
                          class="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            :checked="selectedThemeTags.has(tag)"
                            class="accent-violet-500 w-3.5 h-3.5 cursor-pointer"
                            @change="toggleThemeTag(tag)"
                          >
                          <span :class="['text-xs', selectedThemeTags.has(tag) ? 'text-slate-300' : 'text-slate-600 line-through']">{{ tag }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <select
            v-model="filterSourceType"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchIntermediate"
          >
            <option value="">ソース: すべて</option>
            <option value="imported_file">外部データ</option>
            <option value="task">タスク</option>
            <option value="chat_message">チャット</option>
          </select>
          <input
            v-model="filterDateFrom"
            type="date"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchIntermediate"
          >
          <span class="text-slate-600 self-center text-xs">〜</span>
          <input
            v-model="filterDateTo"
            type="date"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchIntermediate"
          >
        </div>

        <div v-if="loadingIntermediate" class="text-slate-600 text-sm py-10 text-center">読み込み中…</div>

        <div v-else-if="filteredRecords.length === 0 && intermediateRecords.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p class="text-slate-600 text-sm mb-1">中間記憶はまだありません</p>
          <p class="text-slate-700 text-xs">外部データをインポートしてAI処理が完了すると表示されます</p>
        </div>

        <div v-else-if="filteredRecords.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p class="text-slate-600 text-sm">選択中のタグに一致するデータがありません</p>
        </div>

        <div v-else>
          <!-- 件数 + 一括操作バー -->
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-400 select-none">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  class="accent-violet-500 w-4 h-4 cursor-pointer"
                  @change="toggleAll"
                >
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
                selectedIds.has(record.id)
                  ? 'border-violet-600/50 bg-violet-900/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
              ]"
              @click="toggleOne(record.id)"
            >
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(record.id)"
                  class="accent-violet-500 w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                  @click.stop
                  @change="toggleOne(record.id)"
                >
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3 mb-1.5">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span v-if="record.polarity" :class="['px-2 py-0.5 rounded-full text-xs font-medium', polarityColor[record.polarity]]">
                        {{ polarityLabel[record.polarity] }}
                      </span>
                      <span
                        v-for="tag in parseTags(record.emotionTags)"
                        :key="tag"
                        class="px-2 py-0.5 rounded-full text-xs text-violet-300 bg-violet-900/30"
                      >
                        {{ tag }}
                      </span>
                      <span
                        v-for="tag in parseTags(record.themeTags)"
                        :key="tag"
                        class="px-2 py-0.5 rounded-full text-xs text-slate-400 bg-slate-800/60"
                      >
                        {{ tag }}
                      </span>
                      <span v-if="record.intensity !== null" class="text-xs text-slate-500">
                        強度: {{ record.intensity }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                      <span>{{ record.date ?? record.createdAt.slice(0, 10) }}</span>
                      <span v-if="record.sourceType" class="text-slate-700">
                        {{ record.sourceType === 'task' ? 'タスク' : record.sourceType === 'chat_message' ? 'チャット' : '外部データ' }}
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

      <!-- 記憶タブ -->
      <div v-else-if="activeTab === 'snapshots'">
        <!-- フィルター -->
        <div class="flex gap-3 mb-5">
          <select
            v-model="filterPeriodType"
            class="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
            @change="fetchSnapshots"
          >
            <option value="">period: すべて</option>
            <option value="weekly">週次</option>
            <option value="monthly">月次</option>
            <option value="yearly">年次</option>
            <option value="manual">手動</option>
            <option value="past">過去</option>
          </select>
        </div>

        <div v-if="loadingSnapshots" class="text-slate-600 text-sm py-10 text-center">読み込み中…</div>

        <div v-else-if="snapshots.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p class="text-slate-600 text-sm mb-1">長期記憶はまだありません</p>
          <p class="text-slate-700 text-xs">Phase 2でAIが自動生成します</p>
        </div>

        <div v-else class="space-y-2">
          <div v-for="snap in snapshots" :key="snap.id">
            <button
              type="button"
              :class="[
                'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                selectedSnapshot?.id === snap.id
                  ? 'border-violet-600/60 bg-violet-900/20'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
              ]"
              @click="selectSnapshot(snap)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium text-violet-300 bg-violet-900/30">
                    {{ periodLabel[snap.periodType] }}
                  </span>
                  <span class="text-sm text-slate-300">
                    {{ snap.periodStart ?? snap.createdAt.slice(0, 10) }}
                    <span v-if="snap.periodEnd"> 〜 {{ snap.periodEnd }}</span>
                  </span>
                </div>
                <span class="text-slate-600 text-xs">{{ selectedSnapshot?.id === snap.id ? '▲' : '▼' }}</span>
              </div>
            </button>

            <!-- 詳細 -->
            <div
              v-if="selectedSnapshot?.id === snap.id"
              class="rounded-b-xl border border-t-0 border-violet-600/30 bg-slate-900/80 p-5 space-y-4"
            >
              <div v-if="loadingDetail" class="text-slate-600 text-sm text-center py-4">読み込み中…</div>
              <template v-else>
                <div v-if="selectedSnapshot.achievements" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">できていること</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.achievements }}</p>
                </div>
                <div v-if="selectedSnapshot.struggles" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">苦しんでいること</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.struggles }}</p>
                </div>
                <div v-if="selectedSnapshot.interests" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">好きなこと・関心</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.interests }}</p>
                </div>
                <div v-if="selectedSnapshot.aiSummary" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">AIサマリー</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.aiSummary }}</p>
                </div>
                <div v-if="selectedSnapshot.recommendedFocus" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">推奨フォーカス領域</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.recommendedFocus }}</p>
                </div>
                <div v-if="selectedSnapshot.integratedAdvice" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">統合アドバイス</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.integratedAdvice }}</p>
                </div>
                <div v-if="selectedSnapshot.financeSummary" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">財務サマリー</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.financeSummary }}</p>
                </div>
                <div v-if="selectedSnapshot.healthTrend" class="space-y-1">
                  <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">健康トレンド</h3>
                  <p class="text-sm text-slate-300 whitespace-pre-wrap">{{ selectedSnapshot.healthTrend }}</p>
                </div>
                <p
                  v-if="!selectedSnapshot.achievements && !selectedSnapshot.struggles && !selectedSnapshot.aiSummary"
                  class="text-slate-600 text-sm text-center py-2"
                >
                  詳細データがありません
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
