<script setup lang="ts">
import type { Task } from '~/types/api'

definePageMeta({ layout: 'wide' })

const { isAuthed, checkAuth } = useAuth()
const { tasks, tags, loading, fetchTasks, fetchTags, createTask, updateTask, deleteTask, changeStatus, createTag, updateTag, deleteTag } = useTasks()

const taskModalOpen = ref(false)
const completionModalOpen = ref(false)
const tagModalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const pendingStatusTask = ref<Task | null>(null)
const defaultStatus = ref<'todo' | 'doing' | 'done'>('todo')

// DnD state
const draggingTask = ref<Task | null>(null)
const dragOverColumn = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)

const COLUMNS: {
  status: 'todo' | 'doing' | 'done'
  label: string
  color: string
  headerBg: string
  countBg: string
  addHover: string
}[] = [
  {
    status: 'todo',
    label: 'To Do',
    color: 'text-slate-300',
    headerBg: 'bg-[#0D1526]',
    countBg: 'bg-slate-800 text-slate-500',
    addHover: 'hover:text-slate-200',
  },
  {
    status: 'doing',
    label: 'Doing',
    color: 'text-amber-300',
    headerBg: 'bg-[#12100A]',
    countBg: 'bg-amber-900/30 text-amber-600',
    addHover: 'hover:text-amber-400',
  },
  {
    status: 'done',
    label: 'Done',
    color: 'text-emerald-400',
    headerBg: 'bg-[#091210]',
    countBg: 'bg-emerald-900/30 text-emerald-600',
    addHover: 'hover:text-emerald-400',
  },
]

// Tag filter — all checked by default; syncs when tags are loaded
const selectedTagIds = ref<Set<string>>(new Set())

watch(tags, (newTags) => {
  for (const tag of newTags) {
    if (!selectedTagIds.value.has(tag.id)) selectedTagIds.value.add(tag.id)
  }
}, { immediate: true })

function toggleTag(tagId: string) {
  const next = new Set(selectedTagIds.value)
  if (next.has(tagId)) next.delete(tagId)
  else next.add(tagId)
  selectedTagIds.value = next
}

const tasksByStatus = computed(() => {
  const result: Record<string, Task[]> = { todo: [], doing: [], done: [] }
  for (const t of tasks.value) {
    const visible = t.tags.length === 0 || t.tags.some((tag) => selectedTagIds.value.has(tag.id))
    if (visible) result[t.status]!.push(t)
  }
  return result
})

const overdueCount = computed(() => tasks.value.filter((t) => t.isOverdue).length)

onMounted(async () => {
  await checkAuth()
  if (isAuthed.value) {
    await Promise.all([fetchTasks(), fetchTags()])
  }
})

function openAdd(status: 'todo' | 'doing' | 'done') {
  editingTask.value = null
  defaultStatus.value = status
  taskModalOpen.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  taskModalOpen.value = true
}

async function handleSaveTask(data: Parameters<typeof createTask>[0] & { status: 'todo' | 'doing' | 'done' }) {
  taskModalOpen.value = false
  if (editingTask.value) {
    await updateTask(editingTask.value.id, data)
  } else {
    await createTask(data)
  }
}

async function handleDeleteTask(id: string) {
  if (!confirm('このタスクを削除しますか？')) return
  await deleteTask(id)
}

async function handleCompletion(data: { actualHours: number | null; completedAt: string }) {
  completionModalOpen.value = false
  if (!pendingStatusTask.value) return
  await changeStatus(pendingStatusTask.value.id, {
    status: 'done',
    actualHours: data.actualHours ?? undefined,
    completedAt: data.completedAt,
  })
  pendingStatusTask.value = null
}

async function handleSkipCompletion() {
  completionModalOpen.value = false
  if (!pendingStatusTask.value) return
  await changeStatus(pendingStatusTask.value.id, { status: 'done' })
  pendingStatusTask.value = null
}

// --- Drag and Drop ---

function onDragStart(task: Task) {
  draggingTask.value = task
}

function onDragEnd() {
  draggingTask.value = null
  dragOverColumn.value = null
  dragOverTaskId.value = null
}

function onDragOverColumn(status: string) {
  dragOverColumn.value = status
}

function onDragOverTask(taskId: string) {
  dragOverTaskId.value = taskId
  // keep column in sync
  const task = tasks.value.find(t => t.id === taskId)
  if (task) dragOverColumn.value = task.status
}

async function onDrop(targetStatus: 'todo' | 'doing' | 'done') {
  const task = draggingTask.value
  if (!task) return

  const isSameColumn = task.status === targetStatus

  if (!isSameColumn) {
    // doing→done triggers completion modal
    if (targetStatus === 'done' && task.status === 'doing') {
      pendingStatusTask.value = task
      completionModalOpen.value = true
      onDragEnd()
      return
    }
    await changeStatus(task.id, { status: targetStatus })
  }

  // Reorder within the target column
  const movedTask = tasks.value.find(t => t.id === task.id)
  if (!movedTask) { onDragEnd(); return }

  const colTasks = tasks.value.filter(t => t.status === targetStatus && t.id !== task.id)
  const otherTasks = tasks.value.filter(t => t.status !== targetStatus)

  let insertIdx = colTasks.length
  if (dragOverTaskId.value && dragOverTaskId.value !== task.id) {
    const hoverIdx = colTasks.findIndex(t => t.id === dragOverTaskId.value)
    if (hoverIdx !== -1) insertIdx = hoverIdx
  }

  colTasks.splice(insertIdx, 0, movedTask)
  tasks.value = [...otherTasks, ...colTasks]

  onDragEnd()
}
</script>

<template>
  <div>
    <AuthModal v-if="!isAuthed" />

    <div v-else>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-slate-50 tracking-tight">タスク管理</h1>
          <p v-if="overdueCount > 0" class="text-xs text-red-400 mt-0.5">
            ⚠ {{ overdueCount }}件が期限切れです
          </p>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-slate-500 hover:text-slate-300"
          title="タグ管理"
          @click="tagModalOpen = true"
        >
          ⚙
        </UButton>
      </div>

      <!-- Tag filter -->
      <div v-if="tags.length" class="flex flex-wrap gap-1.5 mb-4">
        <button
          v-for="tag in tags"
          :key="tag.id"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
            selectedTagIds.has(tag.id)
              ? 'border-transparent text-white opacity-100'
              : 'border-slate-700 bg-transparent text-slate-500 opacity-50',
          ]"
          :style="selectedTagIds.has(tag.id) && tag.color ? { backgroundColor: tag.color + '33', borderColor: tag.color + '80', color: tag.color } : {}"
          @click="toggleTag(tag.id)"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :style="tag.color ? { backgroundColor: tag.color } : {}"
            :class="!tag.color ? 'bg-slate-500' : ''"
          />
          {{ tag.name }}
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20 text-slate-600">
        <span class="text-sm">読み込み中...</span>
      </div>

      <div v-else class="grid grid-cols-3 gap-4">
        <div
          v-for="col in COLUMNS"
          :key="col.status"
          :class="[
            'rounded-2xl border border-slate-800/60 flex flex-col min-h-[70vh] overflow-hidden transition-all duration-150',
            col.headerBg,
            draggingTask && dragOverColumn === col.status ? 'border-slate-600/80 shadow-lg shadow-black/20' : '',
          ]"
          @dragover.prevent="onDragOverColumn(col.status)"
          @drop.prevent="onDrop(col.status)"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
            <div class="flex items-center gap-2">
              <span :class="['text-sm font-bold', col.color]">{{ col.label }}</span>
              <span :class="['text-xs px-1.5 py-0.5 rounded-full font-medium', col.countBg]">
                {{ tasksByStatus[col.status]?.length ?? 0 }}
              </span>
            </div>
            <button
              :class="[
                'w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition-all',
                'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-200 active:scale-95',
              ]"
              @click="openAdd(col.status)"
            >
              +
            </button>
          </div>

          <div class="flex flex-col gap-1.5 p-3 flex-1">
            <TasksTaskCard
              v-for="task in tasksByStatus[col.status]"
              :key="task.id"
              :task="task"
              :is-drag-over="dragOverTaskId === task.id && draggingTask?.id !== task.id"
              @edit="openEdit"
              @delete="handleDeleteTask"
              @drag-start="onDragStart"
              @drag-end="onDragEnd"
              @drag-over="onDragOverTask"
            />

            <!-- Drop zone indicator when column is empty or dragging over -->
            <div
              v-if="draggingTask && dragOverColumn === col.status && !dragOverTaskId"
              class="flex-1 rounded-lg border-2 border-dashed border-slate-600/50 min-h-12 transition-all"
            />

          </div>
        </div>
      </div>
    </div>

    <TasksTaskModal
      v-model:open="taskModalOpen"
      :task="editingTask"
      :tags="tags"
      :default-status="defaultStatus"
      @save="handleSaveTask"
    />

    <TasksCompletionModal
      v-model:open="completionModalOpen"
      @save="handleCompletion"
      @skip="handleSkipCompletion"
    />

    <TasksTagModal
      v-model:open="tagModalOpen"
      :tags="tags"
      @create="(d) => createTag(d)"
      @update="(id, d) => updateTag(id, d)"
      @delete="deleteTag"
    />
  </div>
</template>
