const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

// ─── Error ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  lastname: string
  username: string
  email: string
  role: string
}

export interface ReportEvent {
  title: string
  isPublic: boolean
  date: string
}

export interface ReportComment {
  content: string
  authorId: string
}

export interface ReportMessage {
  content?: string | null
  conversationId: string
}

export interface ReportPostImage {
  id: string
  url: string
  format: string
  size: number
  order: number
}

export interface ReportPostAuthor {
  id: string
  name: string
  lastname: string
  username: string
  avatarUrl?: string | null
}

export interface ReportPost {
  id: string
  content: string
  createdAt: string
  authorId: string
  eventId: string
  author?: ReportPostAuthor | null
  event?: { id: string; title: string } | null
  images: ReportPostImage[]
}

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED_REMOVED' | 'RESOLVED_INVALID'

export interface Report {
  id: string
  reason: string
  details?: string | null
  status: ReportStatus
  reporter?: User | null
  reviewer?: User | null
  resolutionNote?: string | null
  resolvedAt?: string | null
  createdAt: string
  eventId?: string | null
  commentId?: string | null
  messageId?: string | null
  postId?: string | null
  targetUserId?: string | null
  event?: ReportEvent | null
  comment?: ReportComment | null
  message?: ReportMessage | null
  post?: ReportPost | null
  targetUser?: User | null
}

export interface ReportListResponse {
  data: Report[]
  nextCursor?: string | null
}

export interface LoginResponse {
  token: string
}

export interface ReportFilters {
  status?: string
  reason?: string
  targetType?: string
  limit?: number
  cursor?: string
}

export interface UpdateReportBody {
  status: ReportStatus
  resolutionNote?: string
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

interface RequestOptions {
  token?: string
  method?: string
  body?: unknown
}

async function request<T>(path: string, { token, method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null as T

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'Nao foi possivel completar a requisicao.',
      response.status,
      payload,
    )
  }

  return payload as T
}

// ─── API functions ────────────────────────────────────────────────────────────

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } })
}

export function getMe(token: string): Promise<User> {
  return request<User>('/users/me', { token })
}

export function listReports(token: string, filters: ReportFilters): Promise<ReportListResponse> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, String(value))
    }
  })
  const query = params.toString()
  return request<ReportListResponse>(`/reports${query ? `?${query}` : ''}`, { token })
}

export function getReport(token: string, id: string): Promise<Report> {
  return request<Report>(`/reports/${id}`, { token })
}

export function updateReport(token: string, id: string, body: UpdateReportBody): Promise<Report> {
  return request<Report>(`/reports/${id}`, { token, method: 'PATCH', body })
}

export function removeReportTarget(token: string, id: string): Promise<Report | null> {
  return request<Report | null>(`/reports/${id}/target`, { token, method: 'DELETE' })
}

export function deleteReport(token: string, id: string): Promise<null> {
  return request<null>(`/reports/${id}`, { token, method: 'DELETE' })
}
