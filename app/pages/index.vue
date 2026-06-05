<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()
const NuxtLink = resolveComponent('NuxtLink')

onMounted(checkAuth)

const row1 = [
  {
    label: 'タスク管理',
    description: '日々のタスクをカンバンで管理し、行動傾向を可視化する',
    to: '/tasks',
    icon: '◈',
    available: true,
    accent: 'from-amber-500/20 to-amber-900/5',
    border: 'border-amber-700/50 hover:border-amber-500/70',
    iconColor: 'text-amber-400',
  },
  {
    label: 'チャット',
    description: '自分のデータを知ったAIと対話し、思考を整理する',
    to: '/chat',
    icon: '◎',
    available: true,
    accent: 'from-violet-500/20 to-violet-900/5',
    border: 'border-violet-700/50 hover:border-violet-500/70',
    iconColor: 'text-violet-400',
  },
  // {
  //   label: '音声入力',
  //   description: '話したことを文字起こしして記録し、中間データとして蓄積する',
  //   to: '/voice',
  //   icon: '◉',
  //   available: true,
  //   accent: 'from-rose-500/20 to-rose-900/5',
  //   border: 'border-rose-700/50 hover:border-rose-500/70',
  //   iconColor: 'text-rose-400',
  // },
]

const row2 = [
  {
    label: 'データ取込',
    description: 'ChatGPT・Claude・日記などのログをインポートし、AIの素材にする',
    to: '/import',
    icon: '⊕',
    available: true,
    accent: 'from-sky-500/20 to-sky-900/5',
    border: 'border-sky-700/50 hover:border-sky-500/70',
    iconColor: 'text-sky-400',
  },
  {
    label: '健康管理',
    description: 'Fitbitと食事ログで体調と行動の相関を把握する',
    to: null,
    icon: '◉',
    available: false,
    accent: 'from-slate-700/10 to-slate-900/5',
    border: 'border-slate-800/50',
    iconColor: 'text-slate-600',
  },
  {
    label: '財務管理',
    description: '収支と独立シミュレーションで夢への距離を数値化する',
    to: null,
    icon: '◆',
    available: false,
    accent: 'from-slate-700/10 to-slate-900/5',
    border: 'border-slate-800/50',
    iconColor: 'text-slate-600',
  },
]
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else class="py-4">
      <div class="mb-10 flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-50 tracking-tight">
            ダッシュボード
          </h1>
          <p class="mt-2 text-slate-500">データを通じて自分を深く知り、夢の実現までを伴走するAI</p>
        </div>
        <component
          :is="NuxtLink"
          to="/memory"
          class="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium mt-1"
        >
          <span class="text-base">◑</span>
          <span>長期記憶ビューア</span>
          <span class="text-violet-600 text-xs">→</span>
        </component>
      </div>

      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-3 gap-4">
          <component
            :is="tool.available ? NuxtLink : 'div'"
            v-for="tool in row1"
            :key="tool.label"
            :to="tool.available ? tool.to : undefined"
            :class="[
              'group relative block rounded-2xl p-6 border bg-gradient-to-br transition-all duration-200',
              tool.accent,
              tool.border,
              tool.available ? 'cursor-pointer hover:shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5' : 'cursor-default opacity-50',
            ]"
          >
            <div :class="['text-2xl mb-4 font-bold', tool.iconColor]">{{ tool.icon }}</div>
            <div class="font-bold text-slate-200 mb-1">{{ tool.label }}</div>
            <div class="text-xs text-slate-500 leading-relaxed">{{ tool.description }}</div>
            <div v-if="!tool.available" class="mt-3">
              <span class="text-xs text-slate-600 font-medium tracking-wider uppercase">Coming Soon</span>
            </div>
            <div
              v-if="tool.available"
              class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400/60 text-sm"
            >
              →
            </div>
          </component>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <component
            :is="tool.available ? NuxtLink : 'div'"
            v-for="tool in row2"
            :key="tool.label"
            :to="tool.available ? tool.to : undefined"
            :class="[
              'group relative block rounded-2xl p-6 border bg-gradient-to-br transition-all duration-200',
              tool.accent,
              tool.border,
              tool.available ? 'cursor-pointer hover:shadow-lg hover:shadow-sky-900/20 hover:-translate-y-0.5' : 'cursor-default opacity-50',
            ]"
          >
            <div :class="['text-2xl mb-4 font-bold', tool.iconColor]">{{ tool.icon }}</div>
            <div class="font-bold text-slate-200 mb-1">{{ tool.label }}</div>
            <div class="text-xs text-slate-500 leading-relaxed">{{ tool.description }}</div>
            <div v-if="!tool.available" class="mt-3">
              <span class="text-xs text-slate-600 font-medium tracking-wider uppercase">Coming Soon</span>
            </div>
            <div
              v-if="tool.available"
              class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400/60 text-sm"
            >
              →
            </div>
          </component>
        </div>
      </div>
    </div>
  </div>
</template>
