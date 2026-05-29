import type { Task, Tag, CreateTaskRequest, UpdateTaskRequest, ChangeStatusRequest, CreateTagRequest, UpdateTagRequest } from '~/types/api'

const TASKS_KEY = 'solo_copilot_tasks'
const TAGS_KEY = 'solo_copilot_tags'

function uuid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]') } catch { return [] }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

function loadTags(): Tag[] {
  try { return JSON.parse(localStorage.getItem(TAGS_KEY) ?? '[]') } catch { return [] }
}

function saveTags(tags: Tag[]) {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
}

function computeIsOverdue(task: Pick<Task, 'dueDate' | 'status'>): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return new Date(task.dueDate) < new Date()
}

export function useLocalTaskStore() {
  function getTasks(): Task[] {
    const tags = loadTags()
    return loadTasks().map((t) => ({
      ...t,
      isOverdue: computeIsOverdue(t),
      tags: (t.tags ?? []).map((ref) => tags.find((tag) => tag.id === ref.id) ?? ref),
    }))
  }

  function createTask(data: CreateTaskRequest): Task {
    const tags = loadTags()
    const task: Task = {
      id: uuid(),
      title: data.title,
      description: data.description,
      status: data.status ?? 'todo',
      priority: (data.priority ?? 3) as Task['priority'],
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours ?? undefined,
      tags: (data.tagIds ?? []).map((id) => tags.find((t) => t.id === id)!).filter(Boolean),
      isOverdue: false,
      createdAt: now(),
      updatedAt: now(),
    }
    task.isOverdue = computeIsOverdue(task)
    const tasks = loadTasks()
    tasks.push(task)
    saveTasks(tasks)
    return task
  }

  function updateTask(id: string, data: UpdateTaskRequest): Task {
    const tags = loadTags()
    const tasks = loadTasks()
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('タスクが見つかりません')
    const task = tasks[idx]
    const updated: Task = {
      ...task,
      title: data.title ?? task.title,
      description: data.description ?? task.description,
      priority: (data.priority ?? task.priority) as Task['priority'],
      dueDate: data.dueDate ?? task.dueDate,
      estimatedHours: data.estimatedHours !== undefined ? (data.estimatedHours ?? undefined) : task.estimatedHours,
      tags: data.tagIds ? data.tagIds.map((tid) => tags.find((t) => t.id === tid)!).filter(Boolean) : task.tags,
      updatedAt: now(),
      isOverdue: false,
    }
    updated.isOverdue = computeIsOverdue(updated)
    tasks[idx] = updated
    saveTasks(tasks)
    return updated
  }

  function deleteTask(id: string) {
    saveTasks(loadTasks().filter((t) => t.id !== id))
  }

  function changeStatus(id: string, data: ChangeStatusRequest): Task {
    const tasks = loadTasks()
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('タスクが見つかりません')
    const task = tasks[idx]
    const updated: Task = {
      ...task,
      status: data.status,
      completedAt: data.status === 'done' ? (data.completedAt ?? now()) : undefined,
      actualHours: data.actualHours ?? task.actualHours,
      updatedAt: now(),
      isOverdue: false,
    }
    updated.isOverdue = computeIsOverdue(updated)
    tasks[idx] = updated
    saveTasks(tasks)
    return updated
  }

  function getTags(): Tag[] {
    return loadTags()
  }

  function createTag(data: CreateTagRequest): Tag {
    const tag: Tag = { id: uuid(), name: data.name, description: data.description, color: data.color, createdAt: now() }
    const tags = loadTags()
    tags.push(tag)
    saveTags(tags)
    return tag
  }

  function updateTag(id: string, data: UpdateTagRequest): Tag {
    const tags = loadTags()
    const idx = tags.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('タグが見つかりません')
    const updated = { ...tags[idx], ...data }
    tags[idx] = updated
    saveTags(tags)
    // タスク内のタグも更新
    saveTasks(loadTasks().map((task) => ({
      ...task,
      tags: task.tags.map((t) => (t.id === id ? updated : t)),
    })))
    return updated
  }

  function deleteTag(id: string) {
    saveTags(loadTags().filter((t) => t.id !== id))
    saveTasks(loadTasks().map((task) => ({
      ...task,
      tags: task.tags.filter((t) => t.id !== id),
    })))
  }

  return { getTasks, createTask, updateTask, deleteTask, changeStatus, getTags, createTag, updateTag, deleteTag }
}
