<script setup lang="ts">
const { isAuthed, checkAuth } = useAuth()

interface VoiceRecord {
  id: string
  transcript: string
  duration: number | null
  extractionStatus: 'pending' | 'done' | 'error'
  createdAt: string
}

const records = ref<VoiceRecord[]>([])
const isRecording = ref(false)
const transcript = ref('')
const interimTranscript = ref('')
const duration = ref(0)
const saving = ref(false)
const extracting = ref(false)
const supported = ref(true)

let recognition: SpeechRecognition | null = null
let startTime = 0
let durationTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await checkAuth()
  if (!isAuthed.value) return

  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    supported.value = false
    return
  }

  await fetchRecords()
})

async function fetchRecords() {
  records.value = await $fetch<VoiceRecord[]>('/api/voice')
}

function startRecording() {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  recognition = new SpeechRecognitionClass()
  recognition!.lang = 'ja-JP'
  recognition!.continuous = true
  recognition!.interimResults = true

  recognition!.onresult = (e: SpeechRecognitionEvent) => {
    let final = ''
    let interim = ''
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        final += e.results[i][0].transcript
      }
      else {
        interim += e.results[i][0].transcript
      }
    }
    if (final) transcript.value += final
    interimTranscript.value = interim
  }

  recognition!.onend = () => {
    if (isRecording.value) {
      recognition!.start()
    }
  }

  startTime = Date.now()
  duration.value = 0
  durationTimer = setInterval(() => {
    duration.value = Math.floor((Date.now() - startTime) / 1000)
  }, 1000)

  recognition!.start()
  isRecording.value = true
}

function stopRecording() {
  isRecording.value = false
  interimTranscript.value = ''
  if (durationTimer) clearInterval(durationTimer)
  recognition?.stop()
  recognition = null
}

async function save() {
  const text = (transcript.value + interimTranscript.value).trim()
  if (!text) return

  saving.value = true
  try {
    await $fetch('/api/voice', {
      method: 'POST',
      body: { transcript: text, duration: duration.value || null },
    })
    transcript.value = ''
    interimTranscript.value = ''
    duration.value = 0
    await fetchRecords()
  }
  finally {
    saving.value = false
  }
}

function discard() {
  transcript.value = ''
  interimTranscript.value = ''
  duration.value = 0
}

async function runExtraction() {
  extracting.value = true
  try {
    const result = await $fetch<{ success: number; error: number; skipped: number; total: number }>(
      '/api/voice/extract',
      { method: 'POST' },
    )
    await fetchRecords()
    return result
  }
  finally {
    extracting.value = false
  }
}

function formatDuration(sec: number | null) {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

function formatDate(iso: string) {
  const d = new Date(iso.includes('T') ? iso : iso + 'Z')
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const hasContent = computed(() => (transcript.value + interimTranscript.value).trim().length > 0)

const pendingCount = computed(() => records.value.filter(r => r.extractionStatus === 'pending').length)
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-slate-50 tracking-tight">音声入力</h1>
          <p class="text-xs text-slate-500 mt-0.5">話したことを記録し、中間データとして蓄積する</p>
        </div>
        <UButton
          v-if="pendingCount > 0"
          color="primary"
          variant="soft"
          size="sm"
          :loading="extracting"
          @click="runExtraction"
        >
          中間データに変換 ({{ pendingCount }}件)
        </UButton>
      </div>

      <div v-if="!supported" class="rounded-2xl border border-red-800/50 bg-red-900/10 p-6 text-red-400 text-sm">
        このブラウザは音声入力に対応していません。Chrome での利用を推奨します。
      </div>

      <div v-else>
        <div class="rounded-2xl border border-slate-800 bg-[#0C1018] p-6 mb-6">
          <div class="flex items-center gap-4 mb-4">
            <button
              :class="[
                'w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all',
                isRecording
                  ? 'bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse'
                  : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-500',
              ]"
              @click="isRecording ? stopRecording() : startRecording()"
            >
              {{ isRecording ? '⏹' : '🎤' }}
            </button>

            <div class="flex-1">
              <div v-if="isRecording" class="text-red-400 text-sm font-medium flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                録音中 {{ formatDuration(duration) }}
              </div>
              <div v-else class="text-slate-500 text-sm">
                ボタンを押して話し始めてください
              </div>
            </div>
          </div>

          <div
            v-if="hasContent || isRecording"
            class="min-h-24 rounded-xl bg-slate-900 border border-slate-800 p-4 text-sm text-slate-200 leading-relaxed"
          >
            <span>{{ transcript }}</span>
            <span v-if="interimTranscript" class="text-slate-500">{{ interimTranscript }}</span>
            <span v-if="!hasContent && isRecording" class="text-slate-600 italic">聞き取り中...</span>
          </div>

          <div v-if="hasContent && !isRecording" class="flex gap-2 mt-4">
            <UButton
              color="primary"
              size="sm"
              :loading="saving"
              @click="save"
            >
              保存する
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              class="text-slate-500 hover:text-slate-300"
              @click="discard"
            >
              破棄
            </UButton>
          </div>
        </div>

        <div v-if="records.length > 0">
          <h2 class="text-sm font-bold text-slate-400 mb-3">履歴</h2>
          <div class="flex flex-col gap-2">
            <div
              v-for="rec in records"
              :key="rec.id"
              class="rounded-xl border border-slate-800 bg-[#0C1018] p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm text-slate-300 leading-relaxed flex-1">{{ rec.transcript }}</p>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      rec.extractionStatus === 'done' ? 'bg-emerald-900/30 text-emerald-500' :
                      rec.extractionStatus === 'error' ? 'bg-red-900/30 text-red-500' :
                      'bg-slate-800 text-slate-500',
                    ]"
                  >
                    {{ rec.extractionStatus === 'done' ? '変換済' : rec.extractionStatus === 'error' ? 'エラー' : '未変換' }}
                  </span>
                </div>
              </div>
              <div class="mt-2 flex items-center gap-3 text-xs text-slate-600">
                <span>{{ formatDate(rec.createdAt) }}</span>
                <span v-if="rec.duration">{{ formatDuration(rec.duration) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-16 text-slate-600 text-sm">
          まだ記録がありません
        </div>
      </div>
    </div>
  </div>
</template>
