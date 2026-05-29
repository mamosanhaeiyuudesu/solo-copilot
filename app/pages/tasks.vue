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

const tasksByStatus = computed(() => {
  const result: Record<string, Task[]> = { todo: [], doing: [], done: [] }
  for (const t of tasks.value) result[t.status]!.push(t)
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

async function moveForward(task: Task) {
  if (task.status === 'doing') {
    pendingStatusTask.value = task
    completionModalOpen.value = true
  } else {
    await changeStatus(task.id, { status: 'doing' })
  }
}

async function moveBackward(task: Task) {
  const prev = task.status === 'done' ? 'doing' : 'todo'
  await changeStatus(task.id, { status: prev })
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
        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            variant="solid"
            size="sm"
            @click="openAdd('todo')"
          >
            ＋ タスク追加
          </UButton>
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
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20 text-slate-600">
        <span class="text-sm">読み込み中...</span>
      </div>

      <div v-else class="grid grid-cols-3 gap-4">
        <div
          v-for="col in COLUMNS"
          :key="col.status"
          :class="['rounded-2xl border border-slate-800/60 flex flex-col min-h-[70vh] overflow-hidden', col.headerBg]"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
            <div class="flex items-center gap-2">
              <span :class="['text-sm font-bold', col.color]">{{ col.label }}</span>
              <span :class="['text-xs px-1.5 py-0.5 rounded-full font-medium', col.countBg]">
                {{ tasksByStatus[col.status]?.length ?? 0 }}
              </span>
            </div>
            <button
              :class="['text-slate-600 text-xl leading-none transition-colors', col.addHover]"
              @click="openAdd(col.status)"
            >
              +
            </button>
          </div>

          <div class="flex flex-col gap-2 p-3 flex-1">
            <TasksTaskCard
              v-for="task in tasksByStatus[col.status]"
              :key="task.id"
              :task="task"
              @edit="openEdit"
              @delete="handleDeleteTask"
              @move-forward="moveForward"
              @move-backward="moveBackward"
            />

            <button
              v-if="!(tasksByStatus[col.status]?.length)"
              :class="['mt-2 py-6 rounded-xl border border-dashed border-slate-800 text-slate-700 text-sm transition-colors', col.addHover]"
              @click="openAdd(col.status)"
            >
              ＋ タスクを追加
            </button>
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
