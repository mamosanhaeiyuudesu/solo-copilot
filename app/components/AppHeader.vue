<script setup lang="ts">
const { isAuthed, logout } = useAuth()
const route = useRoute()

const navItems = [
  { label: 'チャット', to: '/chat', icon: '◎' },
  { label: 'メモ', to: '/memo', icon: '✏' },
  { label: 'データ取込', to: '/import', icon: '⊕' },
  { label: '記憶ビューア', to: '/memory', icon: '◑' },
]

const menuOpen = ref(false)

watch(() => route.path, () => { menuOpen.value = false })
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#080E1C]/95 backdrop-blur border-b border-amber-900/30">
    <div class="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-8">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <span class="text-amber-400 font-black text-lg tracking-widest group-hover:text-amber-300 transition-colors">MY AGENT</span>
        </NuxtLink>

        <nav v-if="isAuthed" class="hidden lg:flex items-center gap-1">
          <template v-for="item in navItems" :key="item.label">
            <NuxtLink
              v-if="item.to"
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
            <span
              v-else
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 cursor-default"
            >
              <span class="text-xs">{{ item.icon }}</span>
              {{ item.label }}
            </span>
          </template>
        </nav>
      </div>

      <UButton
        v-if="isAuthed"
        variant="ghost"
        color="neutral"
        size="sm"
        class="hidden lg:inline-flex text-slate-500 hover:text-slate-300"
        @click="logout"
      >
        ログアウト
      </UButton>

      <button
        v-if="isAuthed"
        type="button"
        class="lg:hidden flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
        :aria-expanded="menuOpen"
        aria-label="メニュー"
        @click="menuOpen = !menuOpen"
      >
        <span class="text-lg leading-none">{{ menuOpen ? '✕' : '☰' }}</span>
      </button>
    </div>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <nav
        v-if="isAuthed && menuOpen"
        class="lg:hidden border-t border-amber-900/30 bg-[#080E1C] px-4 py-2"
      >
        <template v-for="item in navItems" :key="item.label">
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-2.5 px-2 py-2.5 rounded-md text-sm font-medium transition-colors',
              route.path === item.to
                ? 'bg-amber-400/10 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
            ]"
          >
            <span class="text-sm">{{ item.icon }}</span>
            {{ item.label }}
          </NuxtLink>
          <span
            v-else
            class="flex items-center gap-2.5 px-2 py-2.5 rounded-md text-sm font-medium text-slate-700 cursor-default"
          >
            <span class="text-sm">{{ item.icon }}</span>
            {{ item.label }}
          </span>
        </template>
        <button
          class="w-full flex items-center gap-2.5 px-2 py-2.5 mt-1 rounded-md text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 border-t border-slate-800/60 transition-colors"
          @click="logout"
        >
          <span class="text-sm">⏻</span>
          ログアウト
        </button>
      </nav>
    </Transition>
  </header>
</template>
