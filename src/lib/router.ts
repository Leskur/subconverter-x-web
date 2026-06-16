export type AdminPage = 'subscription' | 'rules' | 'groups' | 'settings'

export interface AdminRoute {
  page: AdminPage
}

function parseHash(): AdminRoute {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  const page = hash.split('/').filter(Boolean)[0]

  if (page === 'subscription') return { page: 'subscription' }
  if (page === 'rules') return { page: 'rules' }
  if (page === 'groups') return { page: 'groups' }
  if (page === 'settings') return { page: 'settings' }
  return { page: 'subscription' }
}

export function routeToHash(route: AdminRoute): string {
  if (route.page === 'subscription') return '#/subscription'
  if (route.page === 'rules') return '#/rules'
  if (route.page === 'groups') return '#/groups'
  return '#/settings'
}

export function getInitialRoute(): AdminRoute {
  if (typeof window === 'undefined') return { page: 'subscription' }
  return parseHash()
}

export function subscribeRoute(listener: (route: AdminRoute) => void): () => void {
  const onChange = () => listener(parseHash())
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function navigateRoute(route: AdminRoute): void {
  const hash = routeToHash(route)
  if (window.location.hash === hash) return
  window.location.hash = hash
}
