<script setup lang="ts">
const { login } = useAuth()

const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    await login(password.value)
  } catch {
    error.value = 'パスワードが正しくありません'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-xs mx-auto mt-24 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <h2 class="text-xl font-bold mb-6 text-gray-900 dark:text-white text-center">
      solo-copilot
    </h2>

    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          パスワード
        </label>
        <input
          v-model="password"
          type="password"
          required
          autofocus
          class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading || !password"
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md py-2 transition-colors"
      >
        {{ loading ? '確認中...' : '入室' }}
      </button>
    </form>
  </div>
</template>
