<script setup lang="ts">
definePageMeta({ layout: 'chat' })

const { isAuthed, checkAuth } = useAuth()
const { streamText } = useStream()

type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp?: string }

const SYSTEM_PROMPT_KEY = 'chat:systemPrompt'
const MESSAGES_KEY = 'chat:messages'
const DEFAULT_SYSTEM_PROMPT = `あなたは傾聴を大切にするカウンセラーです。

## 関わり方の基本姿勢
- 相手の言葉の奥にある感情や状況をしっかり受け取り、「あなたのことをちゃんと理解しています」と伝わるような言葉で返す
- 相手の言葉をそのまま繰り返す機械的なオウム返しは避け、自分の言葉で言い換えて、理解していることを示す
- 評価・アドバイス・解決策の押しつけはしない。まず「聴く・受けとめる・寄り添う」を優先する
- 相手が話しやすくなる問いかけや、次を語りたくなるような温かい反応を心がける

## トーン
- 温かく、穏やかで、押しつけがましくない
- 丁寧だが堅苦しくならない、自然な日本語

## 注意
- 一度に多くを語りすぎない。短く、でも深く受けとめる返し方を意識する
- 必要であれば一つだけ、柔らかい問いかけを添える`

const messages = ref<Message[]>([])
const input = ref('')
const streaming = ref(false)
const menuOpen = ref(false)
const settingsOpen = ref(false)
const systemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
const editingPrompt = ref('')
const extracting = ref(false)
const extractResult = ref<{ processed: number; skipped: number; total: number } | null>(null)
const messagesContainerRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function scrollToBottom(smooth = false) {
  const el = messagesContainerRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
}

onMounted(async () => {
  await checkAuth()
  const savedPrompt = localStorage.getItem(SYSTEM_PROMPT_KEY)
  if (savedPrompt) systemPrompt.value = savedPrompt
  const savedMessages = localStorage.getItem(MESSAGES_KEY)
  if (savedMessages) {
    try {
      const parsed = JSON.parse(savedMessages) as Message[]
      messages.value = parsed.map(m => ({ ...m, id: m.id || crypto.randomUUID() }))
    }
    catch { /* 壊れていたら無視 */ }
  }
})

watch(messages, (val) => {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(val))
}, { deep: true })

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openSettings() {
  menuOpen.value = false
  editingPrompt.value = systemPrompt.value
  settingsOpen.value = true
}

function saveSettings() {
  systemPrompt.value = editingPrompt.value.trim() || DEFAULT_SYSTEM_PROMPT
  localStorage.setItem(SYSTEM_PROMPT_KEY, systemPrompt.value)
  settingsOpen.value = false
}

function resetPrompt() {
  editingPrompt.value = DEFAULT_SYSTEM_PROMPT
}

async function generateIntermediateData() {
  menuOpen.value = false
  const userMessages = messages.value.filter(m => m.role === 'user')
  if (userMessages.length === 0) {
    extractResult.value = { processed: 0, skipped: 0, total: 0 }
    return
  }

  extracting.value = true
  extractResult.value = null

  try {
    const result = await $fetch<{ processed: number; skipped: number; total: number }>(
      '/api/agent/chat-extract',
      {
        method: 'POST',
        body: { messages: userMessages.map(m => ({ id: m.id, content: m.content, timestamp: m.timestamp })) },
      },
    )
    extractResult.value = result
  }
  catch {
    extractResult.value = null
    alert('中間データ生成に失敗しました')
  }
  finally {
    extracting.value = false
  }
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  messages.value.push({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date().toISOString() })
  input.value = ''
  await nextTick()
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.focus()
  }

  messages.value.push({ id: crypto.randomUUID(), role: 'assistant', content: '' })
  streaming.value = true

  await nextTick()
  scrollToBottom(true)

  const lastIdx = messages.value.length - 1

  try {
    await streamText('/api/agent/chat', {
      messages: messages.value.slice(0, -1),
      systemPrompt: systemPrompt.value,
    }, (chunk) => {
      messages.value[lastIdx]!.content += chunk
      nextTick(() => scrollToBottom())
    })
  }
  catch {
    messages.value[lastIdx]!.content = '⚠ エラーが発生しました。もう一度お試しください。'
  }
  finally {
    streaming.value = false
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.value))
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    sendMessage()
  }
}

function resizeTextarea() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <AuthModal v-if="!isAuthed" />

    <div v-else class="flex flex-col h-full">
      <!-- ヘッダー -->
      <div class="flex items-center justify-between mb-4 shrink-0">
        <h1 class="text-2xl font-black text-slate-50 tracking-tight">チャット</h1>

        <!-- 設定メニュー -->
        <div class="relative">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-slate-500 hover:text-slate-300"
            :loading="extracting"
            @click="menuOpen = !menuOpen"
          >
            ⚙
          </UButton>

          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="menuOpen"
              class="absolute right-0 top-9 z-50 w-44 rounded-xl bg-slate-900 border border-slate-700/60 shadow-xl overflow-hidden"
            >
              <button
                class="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                @click="openSettings"
              >
                システムプロンプト設定
              </button>
              <button
                class="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors border-t border-slate-800"
                :disabled="extracting"
                @click="generateIntermediateData"
              >
                中間データを生成
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- 抽出結果トースト -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="extractResult"
          class="mb-3 shrink-0 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm bg-slate-800/80 border border-slate-700/50 text-slate-300"
        >
          <span>
            中間データ生成完了 ―
            <span class="text-amber-400 font-semibold">{{ extractResult.processed }}件</span>処理、{{ extractResult.skipped }}件スキップ
          </span>
          <button class="ml-3 text-slate-500 hover:text-slate-300 transition-colors" @click="extractResult = null">✕</button>
        </div>
      </Transition>

      <!-- メッセージ一覧 -->
      <div ref="messagesContainerRef" class="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-700">
          <span class="text-4xl mb-3">◎</span>
          <p class="text-sm">話しかけてください</p>
        </div>

        <template v-for="(msg, i) in messages" :key="i">
          <div :class="['flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start']">
            <div
              :class="[
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words leading-relaxed',
                msg.role === 'user'
                  ? 'bg-amber-400/10 text-amber-50 border border-amber-900/30'
                  : 'bg-slate-800/60 text-slate-200 border border-slate-700/40',
              ]"
            >
              <span v-if="msg.role === 'assistant' && msg.content === '' && streaming" class="inline-block w-2 h-4 bg-violet-400 animate-pulse rounded-sm" />
              <template v-else>{{ msg.content }}</template>
            </div>
            <span v-if="msg.role === 'user' && msg.timestamp" class="mt-1 text-xs text-slate-600">
              {{ formatTime(msg.timestamp) }}
            </span>
          </div>
        </template>
      </div>

      <!-- 入力エリア -->
      <div class="shrink-0 pt-3">
        <div class="flex gap-2 items-center bg-slate-900/60 border border-slate-800/60 rounded-2xl px-4 py-3">
          <textarea
            ref="textareaRef"
            v-model="input"
            placeholder="話しかけてみてください… (Shift+Enter で改行)"
            class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none max-h-40 min-h-[2.5rem] leading-relaxed self-center"
            rows="1"
            :disabled="streaming"
            @keydown="handleKeydown"
            @input="resizeTextarea"
          />
          <button
            :disabled="!input.trim() || streaming"
            class="shrink-0 px-4 h-9 rounded-xl text-sm font-semibold transition-all bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="sendMessage"
          >
            {{ streaming ? '…' : '送信' }}
          </button>
        </div>
      </div>
    </div>

    <!-- メニュー外クリックで閉じる -->
    <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />

    <!-- システムプロンプト設定モーダル -->
    <UModal v-model:open="settingsOpen" title="システムプロンプト設定">
      <template #body>
        <div class="space-y-4">
          <p class="text-xs text-slate-400">AIへの指示を設定します。設定はブラウザに保存されます。</p>
          <textarea
            v-model="editingPrompt"
            class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none outline-none focus:border-amber-500/50 transition-colors"
            rows="12"
            placeholder="システムプロンプトを入力…"
          />
          <div class="flex justify-between">
            <UButton color="neutral" variant="ghost" size="sm" class="text-slate-500" @click="resetPrompt">
              デフォルトに戻す
            </UButton>
            <div class="flex gap-2">
              <UButton color="neutral" variant="ghost" size="sm" @click="settingsOpen = false">
                キャンセル
              </UButton>
              <UButton color="amber" variant="solid" size="sm" @click="saveSettings">
                保存
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
