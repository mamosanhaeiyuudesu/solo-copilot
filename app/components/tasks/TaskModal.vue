<script setup lang="ts">
import type { Task, Tag } from '~/types/api'

const props = defineProps<{
  open: boolean
  task?: Task | null
  tags: Tag[]
  defaultStatus?: 'todo' | 'doing' | 'done'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: {
    title: string
    description: string
    priority: number
    dueDate: string
    estimatedHours: number | null
    tagIds: string[]
    status: 'todo' | 'doing' | 'done'
  }]
}>()

const title = ref('')
const description = ref('')
const priority = ref(3)
const dueDate = ref('')
const estimatedHours = ref<number | null>(null)
const selectedTagIds = ref<string[]>([])
const status = ref<'todo' | 'doing' | 'done'>('todo')

const priorityOptions = [
  { label: '1 — 緊急・最優先', value: 1 },
  { label: '2 — 高優先', value: 2 },
  { label: '3 — 通常', value: 3 },
  { label: '4 — 低優先', value: 4 },
  { label: '5 — いつかやる', value: 5 },
]

const statusOptions = [
  { label: 'To Do', value: 'todo' },
  { label: 'Doing', value: 'doing' },
  { label: 'Done', value: 'done' },
]

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  if (props.task) {
    title.value = props.task.title
    description.value = props.task.description ?? ''
    priority.value = props.task.priority
    dueDate.value = props.task.dueDate ?? ''
    estimatedHours.value = props.task.estimatedHours ?? null
    selectedTagIds.value = props.task.tags.map((t) => t.id)
    status.value = props.task.status
  } else {
    title.value = ''
    description.value = ''
    priority.value = 3
    dueDate.value = ''
    estimatedHours.value = null
    selectedTagIds.value = []
    status.value = props.defaultStatus ?? 'todo'
  }
})

function close() { emit('update:open', false) }

function save() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value.trim(),
    description: description.value,
    priority: priority.value,
    dueDate: dueDate.value,
    estimatedHours: estimatedHours.value,
    tagIds: selectedTagIds.value,
    status: status.value,
  })
}

function toggleTag(id: string) {
  const idx = selectedTagIds.value.indexOf(id)
  if (idx === -1) selectedTagIds.value.push(id)
  else selectedTagIds.value.splice(idx, 1)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="close" />
        <div class="relative bg-[#0D1526] border border-amber-900/30 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 class="font-bold text-slate-100">
              {{ task ? 'タスクを編集' : 'タスクを追加' }}
            </h2>
            <UButton size="xs" color="neutral" variant="ghost" @click="close">✕</UButton>
          </div>

          <div class="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">タイトル <span class="text-red-500">*</span></label>
              <UInput
                v-model="title"
                placeholder="タスクのタイトル"
                maxlength="200"
                size="md"
                class="w-full"
                @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) save() }"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">概要</label>
              <UTextarea
                v-model="description"
                placeholder="詳細（任意）"
                :rows="3"
                class="w-full"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">優先度</label>
                <USelect
                  v-model="priority"
                  :items="priorityOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">ステータス</label>
                <USelect
                  v-model="status"
                  :items="statusOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">期日</label>
                <UInput v-model="dueDate" type="date" class="w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">見積工数 (h)</label>
                <UInput v-model.number="estimatedHours" type="number" min="0" step="0.5" placeholder="例: 2.5" class="w-full" />
              </div>
            </div>

            <div v-if="tags.length">
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">タグ</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="tag in tags"
                  :key="tag.id"
                  type="button"
                  :class="[
                    'text-xs px-2.5 py-1 rounded-full border transition-all',
                    selectedTagIds.includes(tag.id)
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300',
                  ]"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 px-6 py-4 border-t border-slate-800">
            <UButton color="neutral" variant="ghost" @click="close">キャンセル</UButton>
            <UButton
              color="primary"
              :disabled="!title.trim()"
              @click="save"
            >
              保存
            </UButton>
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
