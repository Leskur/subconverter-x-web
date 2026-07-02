import { parse as parseYaml } from 'yaml'
import { getApiBase, getActiveToken } from './backends'

export type SubTarget = '' | 'clash' | 'surge' | 'surfboard' | 'loon' | 'quanx'

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
    return `${base}/sub?url=<订阅链接>${targetPart}`
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
  groupCount?: number
  ruleCount?: number
  format?: 'clash' | 'surge' | 'unknown'
  contentType?: string
  error?: string
}

export function getPublicApiUrl(): string {
  return getApiBase()
}

function apiUrl(path: string): string {
  return `${getApiBase()}${path}`
}

function authHeaders(): HeadersInit {
  const token = getActiveToken() ?? localStorage.getItem('admin_token')
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

export interface CustomRuleset {
  id: string
  name: string
  rules: { type: string; content: string; policy: string }[]
  createdAt: number
}

export async function getCustomRulesets(): Promise<CustomRuleset[]> {
  return handleResponse<CustomRuleset[]>(
    await fetch(apiUrl('/api/rulesets'), { headers: authHeaders() }),
  )
}

export async function saveCustomRulesets(rulesets: CustomRuleset[]): Promise<CustomRuleset[]> {
  return handleResponse<CustomRuleset[]>(
    await fetch(apiUrl('/api/rulesets'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(rulesets),
    }),
  )
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

export async function getRulesDefault(): Promise<RulesConfig> {
  return handleResponse<RulesConfig>(
    await fetch(apiUrl('/api/rules/default'), { headers: authHeaders() }),
  )
}

export async function resetRules(): Promise<RulesConfig> {
  return handleResponse<RulesConfig>(
    await fetch(apiUrl('/api/rules/reset'), {
      method: 'POST',
      headers: authHeaders(),
    }),
  )
}

export type UpdateIntervalMode = 'auto' | number

export interface SubscriptionConfig {
  updateInterval: UpdateIntervalMode
}

export async function getSubscriptionConfig(): Promise<SubscriptionConfig> {
  return handleResponse<SubscriptionConfig>(await fetch(apiUrl('/api/subscription')))
}

export async function saveSubscriptionConfig(updateInterval: UpdateIntervalMode): Promise<SubscriptionConfig> {
  return handleResponse<SubscriptionConfig>(
    await fetch(apiUrl('/api/subscription'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ updateInterval }),
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
  if (url.includes('<订阅链接>')) {
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
    const isSurge = !isYaml && body.includes('[Proxy]')

    let format: SubPreviewResult['format'] = 'unknown'
    let nodeCount: number | undefined
    let groupCount: number | undefined
    let ruleCount: number | undefined

    if (isYaml) {
      format = 'clash'
      try {
        const doc = parseYaml(body) as Record<string, unknown>
        nodeCount = Array.isArray(doc['proxies']) ? (doc['proxies'] as unknown[]).length : undefined
        groupCount = Array.isArray(doc['proxy-groups']) ? (doc['proxy-groups'] as unknown[]).length : undefined
        ruleCount = Array.isArray(doc['rules']) ? (doc['rules'] as unknown[]).length : undefined
      } catch { /* ignore */ }
    } else if (isSurge) {
      format = 'surge'
      nodeCount = body.match(/^\[Proxy\]\n([\s\S]*?)(?=^\[|\Z)/m)?.[0].split('\n').filter(l => l.trim() && !l.startsWith('[') && !l.startsWith('#')).length
    }

    return {
      ok: true,
      body,
      contentType,
      format,
      nodeCount,
      groupCount,
      ruleCount,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '请求失败' }
  }
}
