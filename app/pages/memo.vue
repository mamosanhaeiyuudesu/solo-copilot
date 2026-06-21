<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { isAuthed, checkAuth } = useAuth()

onMounted(checkAuth)
</script>

<template>
  <div class="h-full flex flex-col">
    <AuthModal v-if="!isAuthed" />
    <div v-else class="flex-1 overflow-hidden w-full py-4">
      <MemoPanel />
    </div>
  </div>
</template>
