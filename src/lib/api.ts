export type SubTarget = '' | 'clash' | 'singbox' | 'surge'

export interface SubscriptionUrlOptions {
  upstream?: string
  target?: SubTarget
}

const EXAMPLE_UPSTREAM = 'https://example.com/sub'

/** 规范为原始 http(s) URL，避免重复编码 */
export function normalizeUpstreamUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''

  if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
    try {
      const decoded = decodeURIComponent(trimmed)
      if (/^https?:\/\//i.test(decoded)) return decoded
    } catch {
      // 使用原值
    }
  }

  return trimmed
}

export function buildSubscriptionUrl(options: SubscriptionUrlOptions = {}): string {
  const base = getPublicApiUrl()
  const upstream = options.upstream?.trim()

  if (!upstream) {
    const targetPart = options.target ? `&target=${encodeURIComponent(options.target)}` : ''
    return `${base}/sub?url=<upstream>${targetPart}`
  }

  const params = new URLSearchParams()
  params.set('url', normalizeUpstreamUrl(upstream))
  if (options.target) {
    params.set('target', options.target)
  }

  return `${base}/sub?${params.toString()}`
}

export function buildExampleSubscriptionUrl(): string {
  return buildSubscriptionUrl({ upstream: EXAMPLE_UPSTREAM })
}

export type RulesMergeMode = 'replace' | 'prepend' | 'append'

export interface RulesConfig {
  rules: string[]
  rulesMerge: RulesMergeMode
}

export interface RulesInput {
  rules?: string[]
  rulesMerge?: RulesMergeMode
}

export interface HealthStatus {
  ok: boolean
  service: string
}

export interface AdminMeta {
  service: string
  version: string
  authEnabled: boolean
}

export interface RulesSummary {
  ruleCount: number
}

export interface SubPreviewResult {
  ok: boolean
  body?: string
  nodeCount?: number
  hasRules?: boolean
  contentType?: string
  error?: string
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export function getPublicApiUrl(): string {
  if (API_BASE) return API_BASE
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function getHealth(): Promise<HealthStatus> {
  return handleResponse<HealthStatus>(await fetch(apiUrl('/health')))
}

export async function getAdminMeta(): Promise<AdminMeta> {
  return handleResponse<AdminMeta>(await fetch(apiUrl('/api/admin/meta')))
}

export async function getRules(): Promise<RulesConfig> {
  return handleResponse<RulesConfig>(await fetch(apiUrl('/api/rules')))
}

export async function getRulesSummary(): Promise<RulesSummary> {
  const rules = await getRules()
  return {
    ruleCount: rules.rules?.length ?? 0,
  }
}

export async function saveRules(input: RulesInput): Promise<RulesConfig> {
  return handleResponse<RulesConfig>(
    await fetch(apiUrl('/api/rules'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    }),
  )
}

export type TemplateType = 'clash' | 'singbox'

async function handleTextResponse(res: Response): Promise<string> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Request failed (${res.status})`)
  }
  return res.text()
}

export async function getTemplate(type: TemplateType): Promise<string> {
  return handleTextResponse(await fetch(apiUrl(`/api/templates/${type}`)))
}

export async function saveTemplate(type: TemplateType, content: string): Promise<void> {
  await handleTextResponse(
    await fetch(apiUrl(`/api/templates/${type}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...authHeaders() },
      body: content,
    }),
  )
}

export async function previewSubscription(
  upstream: string,
  target: SubTarget = '',
): Promise<SubPreviewResult> {
  if (!upstream.trim()) {
    return { ok: false, error: '请填写机场订阅链接' }
  }

  const url = buildSubscriptionUrl({ upstream, target })
  if (url.includes('<upstream>')) {
    return { ok: false, error: '请填写机场订阅链接' }
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'clash.meta' },
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: err.error ?? `HTTP ${res.status}` }
    }

    const body = await res.text()
    const contentType = res.headers.get('content-type') ?? ''
    const isYaml = contentType.includes('yaml') || body.includes('proxies:')
    const nodeCount = isYaml ? (body.match(/^\s+-\s+name:/gm)?.length ?? 0) : undefined

    return {
      ok: true,
      body,
      contentType,
      nodeCount,
      hasRules: body.includes('rules:'),
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '请求失败' }
  }
}
