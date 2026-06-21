<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { isAuthed, checkAuth } = useAuth()

onMounted(checkAuth)
</script>

<template>
  <div class="h-full flex flex-col">
    <AuthModal v-if="!isAuthed" />
    <div v-else class="flex-1 overflow-hidden max-w-xl w-full">
      <MemoPanel />
    </div>
  </div>
</template>
