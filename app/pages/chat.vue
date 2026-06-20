<script setup lang="ts">
definePageMeta({ layout: 'chat' })

const { isAuthed, checkAuth } = useAuth()
const { streamText } = useStream()

type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp?: string }

const SYSTEM_PROMPT_KEY = 'chat:systemPrompt'
const RECENT_MESSAGES = 10
const DEFAULT_SYSTEM_PROMPT = `あなたは傾聴を大切にするカウンセラーであり、同時に相手を深く理解したうえで励ます存在でもあります。

## 関わり方の基本姿勢
- 相手の言葉の奥にある感情や状況をしっかり受け取り、「あなたのことをちゃんと理解しています」と伝わるような言葉で返す
- 相手の言葉をそのまま繰り返す機械的なオウム返しは避け、自分の言葉で言い換えて、理解していることを示す
- 評価・アドバイス・解決策の押しつけはしない。まず「聴く・受けとめる・寄り添う」を優先する
- 相手が話しやすくなる問いかけや、次を語りたくなるような温かい反応を心がける

## 励ますときの振る舞い
傾聴だけでは物足りない場面（前進や変化、努力、成果が垣間見えたとき）では、的を絞った一言で励ましてください。励ます際は以下の観点を踏まえること。

- 具体的・事実ベース：話の内容から具体的な事実を拾い、抽象的な激励に終わらせない
- 論理的根拠あり：なぜそれが強みや前進なのか、筋道を立てて示す
- 意外性・新しい切り口：本人がまだ気づいていない視点や解釈を提示する
- 深い文脈理解：その人の状況・背景を理解していることが伝わる言葉を選ぶ
- 量を絞る：あれもこれも言わず、最も刺さる一点に集中する
- 自己一致感：薄々感じていたことを言語化し「そうそう、それだ」と思わせる
- 差分・成長の可視化：以前と比べてどう変わったか、何が積み上がっているかを示す

## トーン
- 温かく、穏やかで、押しつけがましくない
- 丁寧だが堅苦しくならない、自然な日本語

## 注意
- 一度に多くを語りすぎない。短く、でも深く受けとめる返し方を意識する
- 必要であれば一つだけ、柔らかい問いかけを添える
- 励ますときも長々と語らず、的を絞った一言に留める`

const conversationId = ref<string | null>(null)
const messages = ref<Message[]>([])
const input = ref('')
const streaming = ref(false)
const settingsOpen = ref(false)
const systemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
const editingPrompt = ref('')
const extractedCount = ref<number | null>(null)
const messagesContainerRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const deletingIndex = ref<number | null>(null)

function scrollToBottom(smooth = false) {
  const el = messagesContainerRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
}

async function initConversation() {
  const { id } = await $fetch<{ id: string }>('/api/conversations/current')
  conversationId.value = id
  messages.value = await $fetch<Message[]>(`/api/conversations/${id}/messages`, {
    params: { limit: RECENT_MESSAGES },
  })
  await nextTick()
  scrollToBottom()
}

onMounted(async () => {
  await checkAuth()
  const savedPrompt = localStorage.getItem(SYSTEM_PROMPT_KEY)
  if (savedPrompt) systemPrompt.value = savedPrompt
  await initConversation()
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function isNewDay(index: number): boolean {
  const msg = messages.value[index]
  if (!msg?.timestamp) return false
  const prev = messages.value.slice(0, index).reverse().find(m => m.timestamp)
  if (!prev) return index === 0
  return new Date(msg.timestamp).toDateString() !== new Date(prev.timestamp!).toDateString()
}

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
  if (!text || streaming.value || !conversationId.value) return

  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
  }
  messages.value.push(userMsg)
  input.value = ''
  await nextTick()
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.focus()
  }

  // ユーザーメッセージをDBに保存
  $fetch(`/api/conversations/${conversationId.value}/messages`, {
    method: 'POST',
    body: { role: 'user', content: text },
  }).catch(() => {})

  messages.value.push({ id: crypto.randomUUID(), role: 'assistant', content: '' })
  streaming.value = true

  await nextTick()
  scrollToBottom(true)

  const lastIdx = messages.value.length - 1
  let assistantContent = ''

  try {
    await streamText('/api/agent/chat', {
      messages: messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      systemPrompt: systemPrompt.value,
    }, (chunk) => {
      assistantContent += chunk
      messages.value[lastIdx]!.content += chunk
      nextTick(() => scrollToBottom())
    })

    // アシスタントメッセージをDBに保存（10件以上で自動抽出がサーバー側で走る）
    const result = await $fetch<{ id: string; extracted: number }>(
      `/api/conversations/${conversationId.value}/messages`,
      { method: 'POST', body: { role: 'assistant', content: assistantContent } },
    ).catch(() => ({ id: '', extracted: 0 }))

    if (result.extracted > 0) {
      extractedCount.value = result.extracted
      setTimeout(() => { extractedCount.value = null }, 5000)
    }
  }
  catch {
    messages.value[lastIdx]!.content = '⚠ エラーが発生しました。もう一度お試しください。'
  }
  finally {
    streaming.value = false
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

async function deleteMessage(index: number) {
  const msg = messages.value[index]
  if (!msg || msg.role !== 'user' || deletingIndex.value !== null) return
  const next = messages.value[index + 1]

  const ids = [msg.id]
  if (next?.role === 'assistant') ids.push(next.id)

  deletingIndex.value = index
  try {
    await $fetch(`/api/conversations/${conversationId.value}/messages`, {
      method: 'DELETE',
      body: { ids },
    })
    messages.value.splice(index, next?.role === 'assistant' ? 2 : 1)
  }
  catch {
    // 削除失敗は無視（UIはそのまま）
  }
  finally {
    deletingIndex.value = null
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <AuthModal v-if="!isAuthed" />

    <div v-else class="flex gap-4 h-full">
      <!-- チャットエリア -->
      <div class="flex flex-col flex-1 min-w-0 h-full">
      <!-- ヘッダー -->
      <div class="flex items-center justify-between mb-4 shrink-0">
        <h1 class="text-2xl font-black text-slate-50 tracking-tight">チャット</h1>

        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-slate-500 hover:text-slate-300"
          @click="openSettings"
        >
          ⚙
        </UButton>
      </div>

      <!-- 自動抽出トースト -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="extractedCount !== null"
          class="mb-3 shrink-0 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm bg-slate-800/80 border border-slate-700/50 text-slate-300"
        >
          <span>
            中間データを自動生成しました ―
            <span class="text-amber-400 font-semibold">{{ extractedCount }}件</span>
          </span>
          <button class="ml-3 text-slate-500 hover:text-slate-300 transition-colors" @click="extractedCount = null">✕</button>
        </div>
      </Transition>

      <!-- メッセージ一覧 -->
      <div ref="messagesContainerRef" class="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-700">
          <span class="text-4xl mb-3">◎</span>
          <p class="text-sm">話しかけてください</p>
        </div>

        <template v-for="(msg, i) in messages" :key="i">
          <div v-if="isNewDay(i) && msg.timestamp" class="flex items-center gap-3 py-1">
            <div class="flex-1 h-px bg-slate-800" />
            <span class="text-xs text-slate-500 font-medium shrink-0 px-1">{{ formatDateLabel(msg.timestamp) }}</span>
            <div class="flex-1 h-px bg-slate-800" />
          </div>
          <div :class="['flex flex-col group', msg.role === 'user' ? 'items-end' : 'items-start']">
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
            <div v-if="msg.role === 'user'" class="flex items-center gap-2 mt-1">
              <button
                class="opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-red-400 transition-all disabled:cursor-not-allowed"
                :disabled="streaming || deletingIndex !== null"
                @click="deleteMessage(i)"
              >
                {{ deletingIndex === i ? '…' : '削除' }}
              </button>
              <span v-if="msg.timestamp" class="text-xs text-slate-600">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- クイック送信ボタン -->
      <div class="shrink-0 flex flex-wrap gap-2 pb-2">
        <button
          v-for="label in ['褒めてください', '未来に向かってアドバイスを下さい', '優しく苦労をねぎらってください']"
          :key="label"
          :disabled="streaming"
          class="px-3 py-1.5 rounded-full text-xs text-slate-400 border border-slate-700/60 hover:border-amber-500/50 hover:text-amber-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          @click="input = label; sendMessage()"
        >
          {{ label }}
        </button>
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

      <!-- メモパネル（右サイドバー） -->
      <div class="w-72 shrink-0 h-full overflow-hidden border-l border-slate-800/40 pl-4">
        <MemoPanel />
      </div>
    </div>

    <!-- メニュー外クリックで閉じる -->

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
