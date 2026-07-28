import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/backends', () => ({
  getApiBase: () => 'https://api.example.com',
  getActiveToken: () => null,
}))

import { buildSubscriptionUrl, normalizeUpstreamUrl } from '../src/lib/api'

describe('normalizeUpstreamUrl', () => {
  it('keeps plain https URL', () => {
    expect(normalizeUpstreamUrl('https://a.example.com/sub?id=1')).toBe('https://a.example.com/sub?id=1')
  })

  it('decodes encoded URL once', () => {
    expect(normalizeUpstreamUrl('https%3A%2F%2Fa.example.com%2Fsub%3Fid%3D1')).toBe(
      'https://a.example.com/sub?id=1',
    )
  })
})

describe('buildSubscriptionUrl', () => {
  it('builds placeholder URL when upstream is empty', () => {
    expect(buildSubscriptionUrl({ target: 'clash' })).toBe(
      'https://api.example.com/sub?url=<订阅链接>&target=clash',
    )
  })

  it('builds encoded query URL for upstream and target', () => {
    expect(buildSubscriptionUrl({ upstream: 'https://a.example.com/sub?id=1&x=2', target: 'surge' })).toBe(
      'https://api.example.com/sub?url=https%3A%2F%2Fa.example.com%2Fsub%3Fid%3D1%26x%3D2&target=surge',
    )
  })
})
