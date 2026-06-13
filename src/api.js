const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = {
    Accept: 'application/json',
  }

  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'Nao foi possivel completar a requisicao.',
      response.status,
      payload,
    )
  }

  return payload
}

export function login(email, password) {
  return request('/auth/login', { method: 'POST', body: { email, password } })
}

export function getMe(token) {
  return request('/users/me', { token })
}

export function listReports(token, filters) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return request(`/reports${query ? `?${query}` : ''}`, { token })
}

export function getReport(token, id) {
  return request(`/reports/${id}`, { token })
}

export function updateReport(token, id, body) {
  return request(`/reports/${id}`, { token, method: 'PATCH', body })
}

export function removeReportTarget(token, id) {
  return request(`/reports/${id}/target`, { token, method: 'DELETE' })
}

export function deleteReport(token, id) {
  return request(`/reports/${id}`, { token, method: 'DELETE' })
}

