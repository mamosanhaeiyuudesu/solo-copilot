<script setup lang="ts">
definePageMeta({ layout: 'chat' })

const { isAuthed, checkAuth } = useAuth()
const { streamText } = useStream()

type Message = { role: 'user' | 'assistant'; content: string }

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
const settingsOpen = ref(false)
const systemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
const editingPrompt = ref('')
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
    try { messages.value = JSON.parse(savedMessages) } catch { /* 壊れていたら無視 */ }
  }
})

watch(messages, (val) => {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(val))
}, { deep: true })

function openSettings() {
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

async function sendMessage() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  await nextTick()
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.focus()
  }

  messages.value.push({ role: 'assistant', content: '' })
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
  } catch {
    messages.value[lastIdx]!.content = '⚠ エラーが発生しました。もう一度お試しください。'
  } finally {
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
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-slate-500 hover:text-slate-300"
          title="システムプロンプト設定"
          @click="openSettings"
        >
          ⚙
        </UButton>
      </div>

      <!-- メッセージ一覧 -->
      <div ref="messagesContainerRef" class="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-700">
          <span class="text-4xl mb-3">◎</span>
          <p class="text-sm">話しかけてください</p>
        </div>

        <template v-for="(msg, i) in messages" :key="i">
          <div :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
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
