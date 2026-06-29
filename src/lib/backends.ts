export interface BackendConfig {
  id: string
  name: string
  protocol: 'http' | 'https'
  host: string
  port: number
  token: string
}

export function backendUrl(b: Pick<BackendConfig, 'protocol' | 'host' | 'port'>): string {
  const isDefaultPort = (b.protocol === 'http' && b.port === 80) || (b.protocol === 'https' && b.port === 443)
  return `${b.protocol}://${b.host}${isDefaultPort ? '' : `:${b.port}`}`
}

const STORAGE_KEY = 'backends'
const ACTIVE_KEY = 'active_backend'

export function getBackends(): BackendConfig[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as BackendConfig[]
  } catch {
    return []
  }
}

export function saveBackends(backends: BackendConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backends))
}

export function getActiveBackendId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveBackendId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function getActiveBackend(): BackendConfig | null {
  const id = getActiveBackendId()
  if (!id) return null
  return getBackends().find((b) => b.id === id) ?? null
}

export function getApiBase(): string {
  const backend = getActiveBackend()
  if (backend) {
    return backendUrl(backend).replace(/\/$/, '')
  }
  return ''
}

export function getActiveToken(): string | null {
  const backend = getActiveBackend()
  return backend?.token || null
}

export function addBackend(backend: Omit<BackendConfig, 'id'>): BackendConfig {
  const backends = getBackends()
  const id = generateId()
  const newBackend = { ...backend, id }
  saveBackends([...backends, newBackend])
  if (backends.length === 0) {
    setActiveBackendId(id)
  }
  return newBackend
}

export function updateBackend(id: string, updates: Partial<Omit<BackendConfig, 'id'>>): void {
  const backends = getBackends().map((b) => (b.id === id ? { ...b, ...updates } : b))
  saveBackends(backends)
}

export function removeBackend(id: string): void {
  const backends = getBackends().filter((b) => b.id !== id)
  saveBackends(backends)
  if (getActiveBackendId() === id) {
    localStorage.removeItem(ACTIVE_KEY)
    if (backends.length > 0) {
      setActiveBackendId(backends[0].id)
    }
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
