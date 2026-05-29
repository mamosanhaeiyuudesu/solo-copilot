export interface User {
  id: string
  username: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}

export interface Tag {
  id: string
  name: string
  description?: string
  color?: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'doing' | 'done'
  priority: 1 | 2 | 3 | 4 | 5
  dueDate?: string
  completedAt?: string
  estimatedHours?: number
  actualHours?: number
  tags: Tag[]
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: 'todo' | 'doing' | 'done'
  priority?: number
  dueDate?: string
  estimatedHours?: number | null
  tagIds?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  priority?: number
  dueDate?: string
  estimatedHours?: number | null
  tagIds?: string[]
}

export interface ChangeStatusRequest {
  status: 'todo' | 'doing' | 'done'
  actualHours?: number
  completedAt?: string
}

export interface CreateTagRequest {
  name: string
  description?: string
  color?: string
}

export interface UpdateTagRequest {
  name?: string
  description?: string
  color?: string
}
