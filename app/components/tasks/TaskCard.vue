<script setup lang="ts">
import type { Task } from '~/types/api'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  moveForward: [task: Task]
  moveBackward: [task: Task]
}>()

const PRIORITY: Record<number, { label: string; color: string; border: string }> = {
  1: { label: '緊急', color: 'text-red-400', border: 'border-l-red-500' },
  2: { label: '高', color: 'text-orange-400', border: 'border-l-orange-500' },
  3: { label: '通常', color: 'text-slate-400', border: 'border-l-slate-600' },
  4: { label: '低', color: 'text-blue-400', border: 'border-l-blue-700' },
  5: { label: 'いつか', color: 'text-slate-600', border: 'border-l-slate-800' },
}

const p = computed(() => PRIORITY[props.task.priority] ?? PRIORITY[3]!)

const canBack = computed(() => props.task.status !== 'todo')
const canForward = computed(() => props.task.status !== 'done')
</script>

<template>
  <div
    :class="[
      'group bg-[#0D1526] rounded-xl p-3.5 border border-l-4 transition-all duration-150',
      p.border,
      task.isOverdue
        ? 'border-red-800/60 hover:border-red-700/80'
        : 'border-slate-700/40 hover:border-slate-600/60',
    ]"
  >
    <div class="flex items-start justify-between gap-2 mb-2">
      <button
        class="text-sm font-semibold text-slate-200 text-left flex-1 hover:text-amber-300 transition-colors leading-snug"
        @click="emit('edit', task)"
      >
        {{ task.title }}
      </button>
      <button
        class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs shrink-0 mt-0.5"
        @click="emit('delete', task.id)"
      >
        ✕
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 mb-2.5">
      <span :class="['text-xs font-medium', p.color]">{{ p.label }}</span>

      <span
        v-if="task.dueDate"
        :class="[
          'text-xs',
          task.isOverdue ? 'text-red-400 font-semibold' : 'text-slate-500',
        ]"
      >
        {{ task.isOverdue ? '⚠ ' : '📅 ' }}{{ task.dueDate }}
      </span>

      <span v-if="task.estimatedHours" class="text-xs text-slate-600">
        {{ task.estimatedHours }}h
      </span>
    </div>

    <div v-if="task.tags.length" class="flex flex-wrap gap-1 mb-2.5">
      <span
        v-for="tag in task.tags"
        :key="tag.id"
        class="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/50"
        :style="tag.color ? { color: tag.color, borderColor: tag.color + '44', backgroundColor: tag.color + '18' } : {}"
      >
        {{ tag.name }}
      </span>
    </div>

    <div class="flex justify-end gap-1">
      <UButton
        v-if="canBack"
        size="xs"
        color="neutral"
        variant="ghost"
        class="text-slate-500 hover:text-slate-300 px-2"
        @click="emit('moveBackward', task)"
      >
        ←
      </UButton>
      <UButton
        v-if="canForward"
        size="xs"
        color="neutral"
        variant="ghost"
        class="text-slate-500 hover:text-amber-400 px-2"
        @click="emit('moveForward', task)"
      >
        →
      </UButton>
    </div>
  </div>
</template>
