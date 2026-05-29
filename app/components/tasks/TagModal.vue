<script setup lang="ts">
import type { Tag } from '~/types/api'

const props = defineProps<{
  open: boolean
  tags: Tag[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  create: [data: { name: string; description: string; color: string }]
  update: [id: string, data: { name: string; description: string; color: string }]
  delete: [id: string]
}>()

const editingTag = ref<Tag | null>(null)
const name = ref('')
const description = ref('')
const color = ref('#FBBF24')
const isAdding = ref(false)

const PRESETS = ['#FBBF24', '#22D3EE', '#F87171', '#34D399', '#A78BFA', '#FB923C', '#60A5FA', '#F472B6', '#94A3B8']

function startAdd() {
  editingTag.value = null
  name.value = ''
  description.value = ''
  color.value = '#FBBF24'
  isAdding.value = true
}

function startEdit(tag: Tag) {
  editingTag.value = tag
  name.value = tag.name
  description.value = tag.description ?? ''
  color.value = tag.color ?? '#FBBF24'
  isAdding.value = false
}

function cancelEdit() {
  editingTag.value = null
  isAdding.value = false
}

function save() {
  if (!name.value.trim()) return
  const data = { name: name.value.trim(), description: description.value, color: color.value }
  if (editingTag.value) emit('update', editingTag.value.id, data)
  else emit('create', data)
  cancelEdit()
}

function close() {
  cancelEdit()
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="close" />
        <div class="relative bg-[#0D1526] border border-amber-900/30 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 class="font-bold text-slate-100">タグ管理</h2>
            <UButton size="xs" color="neutral" variant="ghost" @click="close">✕</UButton>
          </div>

          <div class="px-6 py-4 max-h-56 overflow-y-auto">
            <div v-if="!tags.length && !isAdding" class="text-center py-6 text-slate-600 text-sm">
              タグがありません
            </div>
            <div
              v-for="tag in tags"
              :key="tag.id"
              class="flex items-center gap-3 py-2.5 border-b border-slate-800/60 last:border-0"
            >
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: tag.color ?? '#94A3B8' }" />
              <span class="flex-1 text-sm text-slate-300 font-medium">{{ tag.name }}</span>
              <span v-if="tag.description" class="text-xs text-slate-600 truncate max-w-28">{{ tag.description }}</span>
              <UButton size="xs" color="neutral" variant="ghost" class="text-slate-600 hover:text-amber-400" @click="startEdit(tag)">編集</UButton>
              <UButton size="xs" color="neutral" variant="ghost" class="text-slate-600 hover:text-red-400" @click="emit('delete', tag.id)">削除</UButton>
            </div>
          </div>

          <div v-if="isAdding || editingTag" class="px-6 py-4 border-t border-slate-800 space-y-3">
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {{ editingTag ? 'タグを編集' : '新しいタグ' }}
            </div>
            <UInput v-model="name" placeholder="タグ名" class="w-full" />
            <UInput v-model="description" placeholder="AIが解釈に使う説明文（任意）" class="w-full" />
            <div>
              <p class="text-xs text-slate-500 mb-2">カラー</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in PRESETS"
                  :key="c"
                  :style="{ backgroundColor: c }"
                  :class="['w-6 h-6 rounded-full transition-transform', color === c ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#0D1526] scale-110' : 'hover:scale-110']"
                  @click="color = c"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" size="sm" @click="cancelEdit">キャンセル</UButton>
              <UButton color="primary" size="sm" :disabled="!name.trim()" @click="save">保存</UButton>
            </div>
          </div>

          <div v-if="!isAdding && !editingTag" class="px-6 py-3 border-t border-slate-800">
            <UButton color="neutral" variant="ghost" class="w-full justify-center text-amber-500/80 hover:text-amber-400" @click="startAdd">
              ＋ タグを追加
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
