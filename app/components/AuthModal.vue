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
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-amber-400 font-black text-3xl tracking-widest mb-2">MY AGENT</div>
        <p class="text-slate-500 text-sm">データを通じて自分を深く知るAI</p>
      </div>

      <div class="bg-[#0D1526] border border-amber-900/30 rounded-2xl p-8">
        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              パスワード
            </label>
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              autofocus
              size="lg"
              class="w-full"
            />
          </div>

          <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

          <UButton
            type="submit"
            :disabled="loading || !password"
            :loading="loading"
            color="primary"
            size="lg"
            class="w-full justify-center"
          >
            入室
          </UButton>
        </form>
      </div>
    </div>
  </div>
</template>
