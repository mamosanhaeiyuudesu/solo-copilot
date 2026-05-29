<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()

onMounted(checkAuth)

const tools = [
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
    to: null,
    icon: '◎',
    available: false,
    accent: 'from-slate-700/10 to-slate-900/5',
    border: 'border-slate-800/50',
    iconColor: 'text-slate-600',
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
      <div class="mb-10">
        <h1 class="text-3xl font-black text-slate-50 tracking-tight">
          ダッシュボード
        </h1>
        <p class="mt-2 text-slate-500">データを通じて自分を深く知り、夢の実現までを伴走するAI</p>
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <component
          :is="tool.available ? resolveComponent('NuxtLink') : 'div'"
          v-for="tool in tools"
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
    </div>
  </div>
</template>
