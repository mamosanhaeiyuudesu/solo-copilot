<script setup lang="ts">
import type { ChatMessage } from '~/types/api'

const { isAuthed, checkAuth } = useAuth()
const { streamText } = useStream()

const messages = ref<ChatMessage[]>([])
const input = ref('')
const streaming = ref(false)
const streamingText = ref('')

onMounted(checkAuth)

async function sendMessage() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  streaming.value = true
  streamingText.value = ''

  try {
    await streamText('/api/agent/chat', { messages: messages.value }, (chunk) => {
      streamingText.value += chunk
    })
    messages.value.push({ role: 'assistant', content: streamingText.value })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'エラーが発生しました'
    messages.value.push({ role: 'assistant', content: `エラー: ${msg}` })
  } finally {
    streaming.value = false
    streamingText.value = ''
  }
}
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else class="flex flex-col gap-4">
      <div class="space-y-4 min-h-64">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="[
            'rounded-lg px-4 py-3 max-w-2xl',
            msg.role === 'user'
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
          ]"
        >
          <p class="whitespace-pre-wrap">{{ msg.content }}</p>
        </div>

        <div
          v-if="streaming && streamingText"
          class="rounded-lg px-4 py-3 max-w-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <p class="whitespace-pre-wrap">{{ streamingText }}</p>
        </div>
      </div>

      <form class="flex gap-2" @submit.prevent="sendMessage">
        <input
          v-model="input"
          type="text"
          placeholder="メッセージを入力..."
          :disabled="streaming"
          class="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          :disabled="streaming || !input.trim()"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md transition-colors"
        >
          送信
        </button>
      </form>
    </div>
  </div>
</template>
