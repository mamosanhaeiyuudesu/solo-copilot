<script setup lang="ts">
interface TagSummary {
  tag: string
  posCount: number
  negCount: number
  positive: string
  negative: string
  shortLabel: string
}

interface TimelineSnapshot {
  id: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'manual' | 'past'
  periodStart: string | null
  periodEnd: string | null
  tagSummaries: string | null
  createdAt: string
}

type Zoom = 'weekly' | 'monthly' | 'yearly'

const props = defineProps<{
  snapshots: TimelineSnapshot[]
  zoom: Zoom
  selectedId: string | null
}>()

const emit = defineEmits<{
  'update:zoom': [Zoom]
  'select': [TimelineSnapshot]
}>()

const zoomTabs: { key: Zoom; label: string; hint: string }[] = [
  { key: 'weekly', label: '週', hint: '直近3か月' },
  { key: 'monthly', label: '月', hint: '直近1年' },
  { key: 'yearly', label: '年', hint: '全期間' },
]

function parseTagSummaries(json: string | null): TagSummary[] {
  if (!json) return []
  try { return JSON.parse(json) as TagSummary[] }
  catch { return [] }
}

// ズームごとの表示範囲でフィルタし、左（過去）→右（現在）に並べる
const cells = computed(() => {
  const now = new Date()
  let from: Date | null = null
  if (props.zoom === 'weekly') {
    from = new Date(now)
    from.setMonth(from.getMonth() - 3)
  }
  else if (props.zoom === 'monthly') {
    from = new Date(now)
    from.setFullYear(from.getFullYear() - 1)
  }

  const inRange = props.snapshots.filter((s) => {
    if (props.zoom === 'yearly') return s.periodType === 'yearly' || s.periodType === 'past'
    if (s.periodType !== props.zoom) return false
    if (!from || !s.periodStart) return true
    return new Date(s.periodStart) >= from
  })

  return [...inRange].sort((a, b) => {
    if (a.periodType === 'past' && b.periodType !== 'past') return -1
    if (a.periodType !== 'past' && b.periodType === 'past') return 1
    const da = a.periodStart ?? a.createdAt.slice(0, 10)
    const db = b.periodStart ?? b.createdAt.slice(0, 10)
    return da.localeCompare(db)
  })
})

function snapLabel(s: TimelineSnapshot): string {
  if (s.periodType === 'past') return '過去'
  const start = s.periodStart
  if (!start) return '—'
  const [y, m, d] = start.split('-')
  if (s.periodType === 'weekly') return `${Number(m)}/${Number(d)}`
  if (s.periodType === 'monthly') return `${y}年${Number(m)}月`
  if (s.periodType === 'yearly') return `${y}年`
  return start
}

// 表示中のスナップショット全体から全タグを収集（出現回数の多い順）
const allTags = computed(() => {
  const count = new Map<string, number>()
  for (const snap of cells.value) {
    for (const s of parseTagSummaries(snap.tagSummaries)) {
      count.set(s.tag, (count.get(s.tag) ?? 0) + s.posCount + s.negCount)
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
})

// snapId → tag → TagSummary のルックアップ
const snapTagMap = computed(() => {
  const map = new Map<string, Map<string, TagSummary>>()
  for (const snap of cells.value) {
    const tagMap = new Map<string, TagSummary>()
    for (const s of parseTagSummaries(snap.tagSummaries)) {
      tagMap.set(s.tag, s)
    }
    map.set(snap.id, tagMap)
  }
  return map
})

function cellClass(s: TagSummary | undefined): string {
  if (!s || (!s.posCount && !s.negCount)) return 'text-slate-600'
  if (s.posCount > s.negCount) return 'text-emerald-300 bg-emerald-900/30'
  if (s.negCount > s.posCount) return 'text-red-300 bg-red-900/30'
  return 'text-slate-400 bg-slate-800/50'
}

const scroller = ref<HTMLElement | null>(null)

// 描画後に最右端（現在）へスクロール
watch(cells, async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
}, { immediate: true })
</script>

<template>
  <div>
    <!-- ズーム切り替え -->
    <div class="flex gap-1 mb-4">
      <button
        v-for="t in zoomTabs"
        :key="t.key"
        type="button"
        :class="[
          'flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          zoom === t.key
            ? 'bg-violet-700 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-slate-200',
        ]"
        @click="emit('update:zoom', t.key)"
      >
        {{ t.label }}
        <span class="text-[10px] opacity-70">{{ t.hint }}</span>
      </button>
    </div>

    <div v-if="cells.length === 0" class="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
      <p class="text-slate-600 text-sm mb-1">この期間の記憶はまだありません</p>
      <p class="text-slate-700 text-xs">中間記憶が蓄積されたら「記憶を更新」ボタンで生成できます</p>
    </div>

    <div v-else class="relative">
      <!-- 過去 → 現在 のラベル -->
      <div class="flex justify-between text-[10px] text-slate-600 mb-1.5 px-1">
        <span>← 過去</span>
        <span>現在 →</span>
      </div>

      <div ref="scroller" class="overflow-x-auto" style="scrollbar-width: thin;">
        <table class="border-collapse text-xs w-max">
          <thead>
            <tr>
              <!-- タグラベル列のヘッダ -->
              <th class="sticky left-0 z-20 bg-slate-950 min-w-[88px] px-2 py-1.5 border-b border-r border-slate-800" />
              <!-- 期間列ヘッダ -->
              <th
                v-for="snap in cells"
                :key="snap.id"
                :class="[
                  'min-w-[76px] px-2 py-1.5 text-center font-medium border-b border-slate-800 cursor-pointer transition-colors whitespace-nowrap',
                  selectedId === snap.id
                    ? 'text-violet-300 bg-violet-900/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40',
                ]"
                @click="emit('select', snap)"
              >
                {{ snapLabel(snap) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tag in allTags" :key="tag" class="group">
              <!-- タグ名（固定左列） -->
              <td
                class="sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900/80 px-2 py-1.5 text-slate-400 border-r border-slate-800 whitespace-nowrap font-medium transition-colors"
              >
                #{{ tag }}
              </td>
              <!-- 各スナップショットのセル -->
              <td
                v-for="snap in cells"
                :key="snap.id"
                :class="[
                  'px-1.5 py-1.5 text-center border-b border-slate-800/40 cursor-pointer transition-colors',
                  selectedId === snap.id ? 'bg-violet-900/10' : 'hover:bg-slate-800/30',
                ]"
                @click="emit('select', snap)"
              >
                <span
                  v-if="snapTagMap.get(snap.id)?.get(tag)?.shortLabel"
                  :class="['inline-block px-1.5 py-0.5 rounded text-[10px] leading-tight whitespace-nowrap', cellClass(snapTagMap.get(snap.id)?.get(tag))]"
                >
                  {{ snapTagMap.get(snap.id)?.get(tag)?.shortLabel }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
