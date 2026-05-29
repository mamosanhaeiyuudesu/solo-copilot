<script setup lang="ts">
const { isAuthed, logout } = useAuth()
</script>

<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="container mx-auto px-4 py-4 max-w-4xl flex items-center justify-between">
      <NuxtLink to="/" class="text-lg font-bold text-gray-900 dark:text-white">
        solo-copilot
      </NuxtLink>
      <button
        v-if="isAuthed"
        class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
        @click="logout"
      >
        ログアウト
      </button>
    </div>
  </header>
</template>
