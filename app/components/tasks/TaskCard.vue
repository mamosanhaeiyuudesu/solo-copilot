<script setup lang="ts">
import type { Task } from '~/types/api'

const props = defineProps<{
  task: Task
  isDragOver?: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  'drag-start': [task: Task]
  'drag-end': []
  'drag-over': [taskId: string]
}>()

const PRIORITY: Record<number, { label: string; color: string; border: string }> = {
  1: { label: '緊急', color: 'text-red-400', border: 'border-l-red-500' },
  2: { label: '高', color: 'text-orange-400', border: 'border-l-orange-500' },
  3: { label: '通常', color: 'text-slate-500', border: 'border-l-slate-600' },
  4: { label: '低', color: 'text-blue-500', border: 'border-l-blue-700' },
  5: { label: 'いつか', color: 'text-slate-600', border: 'border-l-slate-800' },
}

const p = computed(() => PRIORITY[props.task.priority] ?? PRIORITY[3]!)

const dueDateShort = computed(() => {
  if (!props.task.dueDate) return null
  return props.task.dueDate.slice(5).replace('-', '/')
})
</script>

<template>
  <div
    draggable="true"
    :class="[
      'group flex items-center gap-2 rounded-lg px-3 py-2 border border-l-4 transition-all duration-150 cursor-grab active:cursor-grabbing select-none',
      isDragOver ? 'bg-[#111D33] scale-[0.98]' : 'bg-[#0D1526]',
      p.border,
      task.isOverdue
        ? 'border-red-800/60 hover:border-red-700/80'
        : 'border-slate-700/40 hover:border-slate-600/60',
    ]"
    @click="emit('edit', task)"
    @dragstart.stop="emit('drag-start', task)"
    @dragend.stop="emit('drag-end')"
    @dragover.prevent.stop="emit('drag-over', task.id)"
  >
    <span class="text-sm font-medium text-slate-200 flex-1 truncate min-w-0 leading-tight">
      {{ task.title }}
    </span>

    <div class="flex items-center gap-1.5 shrink-0 text-xs">
      <span :class="p.color">{{ p.label }}</span>

      <span
        v-if="dueDateShort"
        :class="task.isOverdue ? 'text-red-400 font-semibold' : 'text-slate-500'"
      >
        {{ task.isOverdue ? '⚠ ' : '' }}{{ dueDateShort }}
      </span>

      <span v-if="task.estimatedHours" class="text-slate-600">{{ task.estimatedHours }}h</span>

      <div v-if="task.tags.length" class="flex gap-0.5 items-center">
        <span
          v-for="tag in task.tags.slice(0, 3)"
          :key="tag.id"
          :title="tag.name"
          class="w-2 h-2 rounded-full bg-slate-600"
          :style="tag.color ? { backgroundColor: tag.color } : {}"
        />
      </div>

      <button
        class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
        @click.stop="emit('delete', task.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>
