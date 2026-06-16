import { Link2, Layers, ScrollText, Settings } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { navigateRoute, type AdminPage, type AdminRoute } from '@/lib/router'

interface NavItem {
  page: AdminPage
  label: string
  icon: typeof Link2
}

const NAV_ITEMS: NavItem[] = [
  { page: 'subscription', label: '订阅', icon: Link2 },
  { page: 'rules', label: '规则', icon: ScrollText },
  { page: 'groups', label: '代理组', icon: Layers },
  { page: 'settings', label: '设置', icon: Settings },
]

interface AdminLayoutProps {
  route: AdminRoute
  children: ReactNode
}

export function AdminLayout({ route, children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4 py-1">
          <span className="mr-3 text-sm font-bold tracking-tight text-foreground">Subconverter X</span>
          <nav className="flex items-center">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = route.page === item.page
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => navigateRoute({ page: item.page })}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-4 text-sm transition-colors',
                    active
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-5">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
