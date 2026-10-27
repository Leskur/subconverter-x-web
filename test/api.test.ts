import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/backends', () => ({
  getApiBase: () => 'https://api.example.com',
  getActiveToken: () => '',
}))

import { buildSubscriptionUrl, normalizeSubscriptionUrl } from '../src/lib/api'

describe('normalizeSubscriptionUrl', () => {
  it('keeps plain https URL', () => {
    expect(normalizeSubscriptionUrl('https://a.example.com/sub?id=1')).toBe('https://a.example.com/sub?id=1')
  })

  it('decodes once when already percent-encoded', () => {
    expect(normalizeSubscriptionUrl('https%3A%2F%2Fa.example.com%2Fsub%3Fid%3D1')).toBe(
      'https://a.example.com/sub?id=1',
    )
  })
})

describe('buildSubscriptionUrl', () => {
  it('builds placeholder URL when subscription is empty', () => {
    expect(buildSubscriptionUrl({ target: 'clash' })).toBe(
      'https://api.example.com/sub?url=<订阅链接>&target=clash',
    )
  })

  it('builds encoded query URL for subscription and target', () => {
    expect(
      buildSubscriptionUrl({ subscriptionUrl: 'https://a.example.com/sub?id=1&x=2', target: 'surge' }),
    ).toBe(
      'https://api.example.com/sub?url=https%3A%2F%2Fa.example.com%2Fsub%3Fid%3D1%26x%3D2&target=surge',
    )
  })

  it('includes ua when provided', () => {
    expect(
      buildSubscriptionUrl({
        subscriptionUrl: 'https://a.example.com/sub',
        target: 'clash',
        ua: 'clash-verge/v2.5.1',
      }),
    ).toBe(
      'https://api.example.com/sub?url=https%3A%2F%2Fa.example.com%2Fsub&target=clash&ua=clash-verge%2Fv2.5.1',
    )
  })
})
