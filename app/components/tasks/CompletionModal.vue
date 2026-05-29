<script setup lang="ts">
const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: { actualHours: number | null; completedAt: string }]
  skip: []
}>()

const actualHours = ref<number | null>(null)
const completedAt = ref('')

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  actualHours.value = null
  completedAt.value = new Date().toISOString().slice(0, 16)
})

function close() { emit('update:open', false) }
function save() {
  emit('save', {
    actualHours: actualHours.value,
    completedAt: completedAt.value ? new Date(completedAt.value).toISOString() : new Date().toISOString(),
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="close" />
        <div class="relative bg-[#0D1526] border border-amber-900/30 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm">
          <div class="px-6 py-5 border-b border-slate-800">
            <div class="text-2xl mb-1">🎉</div>
            <h2 class="font-bold text-slate-100">タスク完了！</h2>
            <p class="text-xs text-slate-500 mt-1">工数と完了日時を記録しましょう（スキップも可）</p>
          </div>

          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">実績工数 (h)</label>
              <UInput
                v-model.number="actualHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="例: 2.5（任意）"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">完了日時</label>
              <UInput v-model="completedAt" type="datetime-local" class="w-full" />
            </div>
          </div>

          <div class="flex justify-end gap-2 px-6 py-4 border-t border-slate-800">
            <UButton color="neutral" variant="ghost" @click="emit('skip')">スキップ</UButton>
            <UButton color="primary" @click="save">保存</UButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
