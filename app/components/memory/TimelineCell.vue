<script setup lang="ts">
interface ThemeCount { theme: string; count: number }
interface PolaritySummary { positive: number; negative: number; neutral: number }

interface CellSnapshot {
  id: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'manual' | 'past'
  periodStart: string | null
  periodEnd: string | null
  headline: string | null
  aiSummary: string | null
  topThemes: string | null
  polaritySummary: string | null
}

const props = defineProps<{
  snapshot: CellSnapshot
  selected: boolean
}>()

defineEmits<{ select: [] }>()

function parseJson<T>(v: string | null, fallback: T): T {
  if (!v) return fallback
  try { return JSON.parse(v) as T }
  catch { return fallback }
}

// 期間ラベル（週: M/D週 / 月: YYYY年M月 / 年: YYYY年 / 過去: 過去）
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

const themes = computed(() => parseJson<ThemeCount[]>(props.snapshot.topThemes, []).slice(0, 3))

const polarity = computed(() => parseJson<PolaritySummary>(
  props.snapshot.polaritySummary,
  { positive: 0, negative: 0, neutral: 0 },
))

const polarityTotal = computed(() => {
  const p = polarity.value
  return p.positive + p.negative + p.neutral
})

function pct(n: number): string {
  return polarityTotal.value > 0 ? `${(n / polarityTotal.value) * 100}%` : '0%'
}

// headline が無い場合は aiSummary 冒頭でフォールバック
const headlineText = computed(() => {
  const h = props.snapshot.headline?.trim()
  if (h) return h
  const sum = props.snapshot.aiSummary?.trim()
  return sum ? `${sum.slice(0, 24)}…` : ''
})
</script>

<template>
  <button
    type="button"
    :class="[
      'shrink-0 flex flex-col text-left rounded-xl border p-3 transition-colors',
      selected
        ? 'border-violet-500 bg-violet-900/20'
        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
    ]"
    @click="$emit('select')"
  >
    <div class="text-xs font-bold text-slate-300 mb-2">{{ label }}</div>

    <!-- polarity バー -->
    <div v-if="polarityTotal > 0" class="flex h-1.5 rounded-full overflow-hidden mb-2 bg-slate-800">
      <div class="bg-emerald-500" :style="{ width: pct(polarity.positive) }" />
      <div class="bg-red-500" :style="{ width: pct(polarity.negative) }" />
      <div class="bg-slate-600" :style="{ width: pct(polarity.neutral) }" />
    </div>
    <div v-else class="h-1.5 rounded-full mb-2 bg-slate-800/50" />

    <!-- テーマタグ -->
    <div v-if="themes.length" class="flex flex-wrap gap-1 mb-2">
      <span
        v-for="t in themes"
        :key="t.theme"
        class="px-1.5 py-0.5 rounded text-[10px] leading-none text-slate-400 bg-slate-800/70"
      >#{{ t.theme }}</span>
    </div>

    <!-- headline -->
    <p v-if="headlineText" class="text-xs text-slate-200 leading-snug line-clamp-2">{{ headlineText }}</p>
    <p v-else class="text-xs text-slate-600">記録なし</p>
  </button>
</template>
