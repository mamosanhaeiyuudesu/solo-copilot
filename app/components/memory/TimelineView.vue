<script setup lang="ts">
interface TimelineSnapshot {
  id: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'manual' | 'past'
  periodStart: string | null
  periodEnd: string | null
  headline: string | null
  aiSummary: string | null
  topThemes: string | null
  polaritySummary: string | null
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
    // 年ビューには past（過去の記録）も含める
    if (props.zoom === 'yearly') return s.periodType === 'yearly' || s.periodType === 'past'
    if (s.periodType !== props.zoom) return false
    if (!from || !s.periodStart) return true
    return new Date(s.periodStart) >= from
  })

  return [...inRange].sort((a, b) => {
    // past は常に最左（最古）
    if (a.periodType === 'past' && b.periodType !== 'past') return -1
    if (a.periodType !== 'past' && b.periodType === 'past') return 1
    const da = a.periodStart ?? a.createdAt.slice(0, 10)
    const db = b.periodStart ?? b.createdAt.slice(0, 10)
    return da.localeCompare(db)
  })
})

const cellWidth = computed(() => (props.zoom === 'weekly' ? 'w-32' : props.zoom === 'monthly' ? 'w-40' : 'w-48'))

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

      <div
        ref="scroller"
        class="flex gap-2 overflow-x-auto pb-3"
        style="scrollbar-width: thin;"
      >
        <MemoryTimelineCell
          v-for="cell in cells"
          :key="cell.id"
          :class="cellWidth"
          :snapshot="cell"
          :selected="selectedId === cell.id"
          @select="emit('select', cell)"
        />
      </div>
    </div>
  </div>
</template>
