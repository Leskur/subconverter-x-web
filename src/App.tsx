import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { RulesPage } from '@/pages/RulesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { getInitialRoute, subscribeRoute, type AdminRoute } from '@/lib/router'

type ThemeMode = 'light' | 'dark' | 'system'

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  const [route, setRoute] = useState<AdminRoute>(getInitialRoute)
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) ?? 'system',
  )

  useEffect(() => subscribeRoute(setRoute), [])

  useEffect(() => {
    applyTheme(theme)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  function handleThemeChange(mode: ThemeMode) {
    localStorage.setItem('theme', mode)
    setTheme(mode)
  }

  function renderPage() {
    switch (route.page) {
      case 'subscription':
        return <SubscriptionPage />
      case 'rules':
        return <RulesPage />
      case 'settings':
        return <SettingsPage theme={theme} onThemeChange={handleThemeChange} />
      default:
        return <SubscriptionPage />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AdminLayout route={route}>
        {renderPage()}
      </AdminLayout>
    </QueryClientProvider>
  )
}
