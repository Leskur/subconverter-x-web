import { normalizeSubscriptionUrl } from '@/lib/api'

/** 保持旧 key，避免用户最近记录丢失 */
export const RECENT_SUBSCRIPTION_KEY = 'subconverter_upstream_recent'
export const RECENT_SUBSCRIPTION_MAX = 8

export function loadRecentSubscriptions(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SUBSCRIPTION_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveRecentSubscriptions(recent: string[]) {
  localStorage.setItem(RECENT_SUBSCRIPTION_KEY, JSON.stringify(recent.slice(0, RECENT_SUBSCRIPTION_MAX)))
}

export function pushRecentSubscription(url: string): string[] {
  const normalized = normalizeSubscriptionUrl(url)
  if (!normalized) return loadRecentSubscriptions()

  const recent = loadRecentSubscriptions().filter((item) => item !== normalized)
  recent.unshift(normalized)
  saveRecentSubscriptions(recent)
  return recent.slice(0, RECENT_SUBSCRIPTION_MAX)
}

export function removeRecentSubscription(url: string): string[] {
  const recent = loadRecentSubscriptions().filter((item) => item !== url)
  saveRecentSubscriptions(recent)
  return recent
}

export function clearRecentSubscriptions(): string[] {
  localStorage.removeItem(RECENT_SUBSCRIPTION_KEY)
  return []
}
