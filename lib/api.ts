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
  targetUserId?: string | null
  event?: ReportEvent | null
  comment?: ReportComment | null
  message?: ReportMessage | null
  targetUser?: User | null
}

export interface ReportListResponse {
  data: Report[]
  nextCursor?: string | null
}

// O login pode resultar em três estados — a decisão de exigir MFA vem do
// backend; o front só reage ao que ele responde.
export interface LoginTokenResponse {
  token: string
}
export interface MfaRequiredResponse {
  mfaRequired: true
}
export interface MfaSetupRequiredResponse {
  mfaSetupRequired: true
  enrollmentToken: string
}
export type LoginResponse =
  | LoginTokenResponse
  | MfaRequiredResponse
  | MfaSetupRequiredResponse

export interface MfaSetupResponse {
  otpauthUrl: string
  qrCode: string
  secret: string
}
export interface MfaEnableResponse {
  recoveryCodes: string[]
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

export function login(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
  const body = mfaCode ? { email, password, mfaCode } : { email, password }
  return request<LoginResponse>('/auth/login', { method: 'POST', body })
}

// Matrícula de MFA (admin sem segundo fator): o enrollmentToken vem do login e
// só autoriza setup/enable. setup devolve o QR + secret pra escanear no app.
export function mfaSetup(enrollmentToken: string): Promise<MfaSetupResponse> {
  return request<MfaSetupResponse>('/auth/mfa/setup', { token: enrollmentToken, method: 'POST' })
}

// enable confirma o código do app, ativa o MFA e devolve os códigos de
// recuperação (exibidos uma única vez).
export function mfaEnable(enrollmentToken: string, code: string): Promise<MfaEnableResponse> {
  return request<MfaEnableResponse>('/auth/mfa/enable', {
    token: enrollmentToken,
    method: 'POST',
    body: { code },
  })
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

// ─── Consent Audit ────────────────────────────────────────────────────────────

export type ConsentAction = 'GRANTED' | 'REVOKED' | 'UPDATED' | 'EXPORTED'

export interface ConsentAuditEntry {
  id: string
  userId: string
  userName: string
  action: ConsentAction
  timestamp: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export interface ConsentAuditResponse {
  data: ConsentAuditEntry[]
  nextCursor?: string
}

export interface ConsentStats {
  totalUsersWithActiveConsent: number
  totalRevocations: number
  totalExports: number
  actionDistribution: Record<ConsentAction, number>
}

export interface ConsentAuditFilters {
  userId?: string
  action?: ConsentAction
  startDate?: string
  endDate?: string
  cursor?: string
  limit?: number
}

export function listConsentAudit(token: string, params?: ConsentAuditFilters): Promise<ConsentAuditResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        searchParams.set(key, String(value))
      }
    })
  }
  const query = searchParams.toString()
  return request<ConsentAuditResponse>(`/admin/consent/audit${query ? `?${query}` : ''}`, { token })
}

export function getConsentAuditByUser(token: string, userId: string): Promise<ConsentAuditResponse> {
  return request<ConsentAuditResponse>(`/admin/consent/audit/${userId}`, { token })
}

export function getConsentStats(token: string): Promise<ConsentStats> {
  return request<ConsentStats>('/admin/consent/stats', { token })
}
