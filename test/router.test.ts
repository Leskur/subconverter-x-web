import { describe, expect, it } from 'vitest'
import { getInitialRoute, navigateRoute, routeToHash } from '../src/lib/router'

describe('router', () => {
  it('maps route to hash', () => {
    expect(routeToHash({ page: 'subscription' })).toBe('#/subscription')
    expect(routeToHash({ page: 'rules' })).toBe('#/rules')
    expect(routeToHash({ page: 'settings' })).toBe('#/settings')
  })

  it('parses initial route from hash', () => {
    window.location.hash = '#/rules'
    expect(getInitialRoute()).toEqual({ page: 'rules' })
  })

  it('navigates by setting hash', () => {
    window.location.hash = '#/subscription'
    navigateRoute({ page: 'settings' })
    expect(window.location.hash).toBe('#/settings')
  })
})
