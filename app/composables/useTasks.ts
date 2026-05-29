import type { Task, Tag, CreateTaskRequest, UpdateTaskRequest, ChangeStatusRequest, CreateTagRequest, UpdateTagRequest } from '~/types/api'
import { useLocalTaskStore } from '~/composables/useLocalTaskStore'

// D1なし（dev:ui）のとき503になるので、その時点でlocalStorageモードに切り替える
const localMode = ref(false)

function isD1Unavailable(err: unknown) {
  const e = err as { statusCode?: number; data?: { message?: string } }
  if (e?.statusCode === 503) return true
  if (e?.statusCode === 500 && e?.data?.message?.includes('D1_ERROR')) return true
  return false
}

export function useTasks() {
  const tasks = ref<Task[]>([])
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const local = useLocalTaskStore()

  async function fetchTasks() {
    loading.value = true
    try {
      if (localMode.value) {
        tasks.value = local.getTasks()
        return
      }
      tasks.value = await $fetch<Task[]>('/api/tasks')
    } catch (err) {
      if (isD1Unavailable(err)) {
        localMode.value = true
        tasks.value = local.getTasks()
      } else { throw err }
    } finally {
      loading.value = false
    }
  }

  async function fetchTags() {
    try {
      if (localMode.value) { tags.value = local.getTags(); return }
      tags.value = await $fetch<Tag[]>('/api/tags')
    } catch (err) {
      if (isD1Unavailable(err)) {
        localMode.value = true
        tags.value = local.getTags()
      } else { throw err }
    }
  }

  async function createTask(data: CreateTaskRequest) {
    if (localMode.value) {
      const task = local.createTask(data)
      tasks.value.push(task)
      return task
    }
    try {
      const task = await $fetch<Task>('/api/tasks', { method: 'POST', body: data })
      tasks.value.push(task)
      return task
    } catch (err) {
      if (isD1Unavailable(err)) {
        localMode.value = true
        const task = local.createTask(data)
        tasks.value.push(task)
        return task
      }
      throw err
    }
  }

  async function updateTask(id: string, data: UpdateTaskRequest) {
    if (localMode.value) {
      const updated = local.updateTask(id, data)
      const idx = tasks.value.findIndex((t) => t.id === id)
      if (idx !== -1) tasks.value[idx] = updated
      return updated
    }
    const updated = await $fetch<Task>(`/api/tasks/${id}`, { method: 'PUT', body: data })
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
    return updated
  }

  async function deleteTask(id: string) {
    if (localMode.value) {
      local.deleteTask(id)
      tasks.value = tasks.value.filter((t) => t.id !== id)
      return
    }
    await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  async function changeStatus(id: string, data: ChangeStatusRequest) {
    if (localMode.value) {
      const updated = local.changeStatus(id, data)
      const idx = tasks.value.findIndex((t) => t.id === id)
      if (idx !== -1) tasks.value[idx] = updated
      return updated
    }
    const updated = await $fetch<Task>(`/api/tasks/${id}/status`, { method: 'PATCH', body: data })
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
    return updated
  }

  async function createTag(data: CreateTagRequest) {
    if (localMode.value) {
      const tag = local.createTag(data)
      tags.value.push(tag)
      return tag
    }
    const tag = await $fetch<Tag>('/api/tags', { method: 'POST', body: data })
    tags.value.push(tag)
    return tag
  }

  async function updateTag(id: string, data: UpdateTagRequest) {
    if (localMode.value) {
      const updated = local.updateTag(id, data)
      const idx = tags.value.findIndex((t) => t.id === id)
      if (idx !== -1) tags.value[idx] = updated
      return updated
    }
    const updated = await $fetch<Tag>(`/api/tags/${id}`, { method: 'PUT', body: data })
    const idx = tags.value.findIndex((t) => t.id === id)
    if (idx !== -1) tags.value[idx] = updated
    return updated
  }

  async function deleteTag(id: string) {
    if (localMode.value) {
      local.deleteTag(id)
      tags.value = tags.value.filter((t) => t.id !== id)
      tasks.value = tasks.value.map((task) => ({
        ...task,
        tags: task.tags.filter((tag) => tag.id !== id),
      }))
      return
    }
    await $fetch(`/api/tags/${id}`, { method: 'DELETE' })
    tags.value = tags.value.filter((t) => t.id !== id)
    tasks.value = tasks.value.map((task) => ({
      ...task,
      tags: task.tags.filter((tag) => tag.id !== id),
    }))
  }

  return {
    tasks,
    tags,
    loading,
    localMode,
    fetchTasks,
    fetchTags,
    createTask,
    updateTask,
    deleteTask,
    changeStatus,
    createTag,
    updateTag,
    deleteTag,
  }
}
