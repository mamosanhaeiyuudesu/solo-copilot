<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()
const NuxtLink = resolveComponent('NuxtLink')

onMounted(checkAuth)

const row1 = [
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
    label: '記憶ビューア',
    description: '中間記憶を時系列グラフで可視化し、自分の変化をたどる',
    to: '/memory',
    icon: '◑',
    available: true,
    accent: 'from-emerald-500/20 to-emerald-900/5',
    border: 'border-emerald-700/50 hover:border-emerald-500/70',
    iconColor: 'text-emerald-400',
  },
]
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else class="py-4">
      <div class="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">
            ダッシュボード
          </h1>
          <p class="mt-2 text-slate-500 text-sm sm:text-base">データを通じて自分を深く知り、夢の実現までを伴走するAI</p>
        </div>
        <component
          :is="NuxtLink"
          to="/memory"
          class="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium sm:mt-1"
        >
          <span class="text-base">◑</span>
          <span>記憶ビューア</span>
          <span class="text-violet-600 text-xs">→</span>
        </component>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <component
          :is="NuxtLink"
          v-for="tool in row1"
          :key="tool.label"
          :to="tool.to"
          :class="[
            'group relative block rounded-2xl p-5 sm:p-6 border bg-gradient-to-br transition-all duration-200',
            tool.accent,
            tool.border,
            'cursor-pointer hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-0.5',
          ]"
        >
          <div :class="['text-2xl mb-4 font-bold', tool.iconColor]">{{ tool.icon }}</div>
          <div class="font-bold text-slate-200 mb-1">{{ tool.label }}</div>
          <div class="text-xs text-slate-500 leading-relaxed">{{ tool.description }}</div>
          <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400/60 text-sm">
            →
          </div>
        </component>
      </div>
    </div>
  </div>
</template>
