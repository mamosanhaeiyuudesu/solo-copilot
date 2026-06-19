<script setup lang="ts">
interface TagSummary {
  tag: string
  posCount: number
  negCount: number
  positive: string
  negative: string
  shortLabel: string
}

interface CellSnapshot {
  id: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'manual' | 'past'
  periodStart: string | null
  periodEnd: string | null
  tagSummaries: string | null
}

const props = defineProps<{
  snapshot: CellSnapshot
  selected: boolean
}>()

defineEmits<{ select: [] }>()

function parseTagSummaries(json: string | null): TagSummary[] {
  if (!json) return []
  try { return JSON.parse(json) as TagSummary[] }
  catch { return [] }
}

// 期間ラベル（週: M/D〜 / 月: YYYY年M月 / 年: YYYY年 / 過去: 過去）
const label = computed(() => {
  const s = props.snapshot
  if (s.periodType === 'past') return '過去'
  const start = s.periodStart
  if (!start) return '—'
  const [y, m, d] = start.split('-')
  if (s.periodType === 'weekly') return `${Number(m)}/${Number(d)}〜`
  if (s.periodType === 'monthly') return `${y}年${Number(m)}月`
  if (s.periodType === 'yearly') return `${y}年`
  return start
})

const summaries = computed(() => parseTagSummaries(props.snapshot.tagSummaries))

// 上位3テーマ（件数降順、順序はバッチ生成時点で降順だが念のため）
const topTags = computed(() =>
  [...summaries.value]
    .sort((a, b) => (b.posCount + b.negCount) - (a.posCount + a.negCount))
    .slice(0, 3),
)

// テーマごとのネット感情で色を決める
function tagClass(t: TagSummary): string {
  if (t.posCount > t.negCount) return 'text-emerald-300 bg-emerald-900/30'
  if (t.negCount > t.posCount) return 'text-red-300 bg-red-900/30'
  return 'text-slate-400 bg-slate-800/70'
}

const totals = computed(() => {
  let pos = 0
  let neg = 0
  for (const s of summaries.value) { pos += s.posCount; neg += s.negCount }
  return { pos, neg, total: pos + neg }
})

function pct(n: number): string {
  return totals.value.total > 0 ? `${(n / totals.value.total) * 100}%` : '0%'
}
</script>

<template>
  <button
    type="button"
    :class="[
      'shrink-0 flex flex-col text-left rounded-xl border p-3 transition-colors',
      selected ? 'border-violet-500 bg-violet-900/20' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
    ]"
    @click="$emit('select')"
  >
    <div class="text-xs font-bold text-slate-300 mb-2">{{ label }}</div>

    <!-- polarity バー（ポジ/ネガのみ） -->
    <div v-if="totals.total > 0" class="flex h-1.5 rounded-full overflow-hidden mb-2 bg-slate-800">
      <div class="bg-emerald-500" :style="{ width: pct(totals.pos) }" />
      <div class="bg-red-500" :style="{ width: pct(totals.neg) }" />
    </div>
    <div v-else class="h-1.5 rounded-full mb-2 bg-slate-800/50" />

    <!-- テーマタグ（ネット感情で色付け） -->
    <div v-if="topTags.length" class="flex flex-wrap gap-1">
      <span
        v-for="t in topTags"
        :key="t.tag"
        :class="['px-1.5 py-0.5 rounded text-[10px] leading-none', tagClass(t)]"
      >#{{ t.tag }}</span>
    </div>
    <p v-else class="text-xs text-slate-600">記録なし</p>
  </button>
</template>
