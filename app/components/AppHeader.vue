<script setup lang="ts">
const { isAuthed, logout } = useAuth()
const route = useRoute()

const navItems = [
  { label: 'タスク', to: '/tasks', icon: '◈' },
  { label: 'インポート', to: '/import', icon: '⇩' },
  { label: 'メモリ', to: '/memory', icon: '◉' },
]
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#080E1C]/95 backdrop-blur border-b border-amber-900/30">
    <div class="container mx-auto px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-8">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <span class="text-amber-400 font-black text-lg tracking-widest group-hover:text-amber-300 transition-colors">MY AGENT</span>
        </NuxtLink>

        <nav v-if="isAuthed" class="flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              route.path === item.to
                ? 'bg-amber-400/10 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
            ]"
          >
            <span class="text-xs">{{ item.icon }}</span>
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <UButton
        v-if="isAuthed"
        variant="ghost"
        color="neutral"
        size="sm"
        class="text-slate-500 hover:text-slate-300"
        @click="logout"
      >
        ログアウト
      </UButton>
    </div>
  </header>
</template>
