import { normalizeUpstreamUrl } from '@/lib/api'

export const RECENT_UPSTREAM_KEY = 'subconverter_upstream_recent'
export const RECENT_UPSTREAM_MAX = 8

export function loadRecentUpstream(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_UPSTREAM_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveRecentUpstream(recent: string[]) {
  localStorage.setItem(RECENT_UPSTREAM_KEY, JSON.stringify(recent.slice(0, RECENT_UPSTREAM_MAX)))
}

export function pushRecentUpstream(url: string): string[] {
  const normalized = normalizeUpstreamUrl(url)
  if (!normalized) return loadRecentUpstream()

  const recent = loadRecentUpstream().filter((item) => item !== normalized)
  recent.unshift(normalized)
  saveRecentUpstream(recent)
  return recent.slice(0, RECENT_UPSTREAM_MAX)
}

export function removeRecentUpstream(url: string): string[] {
  const recent = loadRecentUpstream().filter((item) => item !== url)
  saveRecentUpstream(recent)
  return recent
}

export function clearRecentUpstream(): string[] {
  localStorage.removeItem(RECENT_UPSTREAM_KEY)
  return []
}

export function shortUpstreamLabel(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname + parsed.search
    if (path === '/' || path === '') return parsed.host
    const compact = path.length > 28 ? `${path.slice(0, 28)}…` : path
    return `${parsed.host}${compact}`
  } catch {
    return url.length > 40 ? `${url.slice(0, 40)}…` : url
  }
}
