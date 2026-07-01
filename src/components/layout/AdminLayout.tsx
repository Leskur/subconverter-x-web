import { Github, Link2, ScrollText, Settings, Server, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { navigateRoute, type AdminPage, type AdminRoute } from '@/lib/router'
import { getAdminMeta, type AdminMeta } from '@/lib/api'
import { BackendDialog } from '@/components/BackendDialog'
import { Button } from '@/components/ui/button'
import { getActiveBackend } from '@/lib/backends'

interface NavItem {
  page: AdminPage
  label: string
  icon: typeof Link2
}

const NAV_ITEMS: NavItem[] = [
  { page: 'subscription', label: '订阅', icon: Link2 },
  { page: 'rules', label: '规则', icon: ScrollText },
  { page: 'settings', label: '设置', icon: Settings },
]

interface AdminLayoutProps {
  route: AdminRoute
  children: ReactNode
}

export function AdminLayout({ route, children }: AdminLayoutProps) {
  const [meta, setMeta] = useState<AdminMeta | null>(null)
  const [backendDialogOpen, setBackendDialogOpen] = useState(false)
  const [autoOpenAdd, setAutoOpenAdd] = useState(false)
  const [hasBackend, setHasBackend] = useState(() => !!getActiveBackend())

  useEffect(() => {
    getAdminMeta().then(setMeta).catch(() => {})
  }, [])

  useEffect(() => {
    if (!backendDialogOpen) {
      setHasBackend(!!getActiveBackend())
    }
  }, [backendDialogOpen])

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

      <BackendDialog open={backendDialogOpen} onOpenChange={(v) => { setBackendDialogOpen(v); if (!v) setAutoOpenAdd(false) }} autoOpenAdd={autoOpenAdd} />

      <main className="flex-1 p-4 md:p-5">
        {hasBackend ? (
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        ) : (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
            <Server className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">尚未配置后端</h2>
              <p className="text-sm text-muted-foreground">请先添加一个后端服务地址才能使用</p>
            </div>
            <Button onClick={() => { setAutoOpenAdd(true); setBackendDialogOpen(true) }} className="gap-1.5">
              <Plus className="h-4 w-4" />
              添加后端
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t bg-card py-3">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-start px-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <a
              href="https://github.com/Leskur/subconverter-x-server"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground flex items-center gap-1"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <span>·</span>
            Panel v{__APP_VERSION__}
            <span>·</span>
            Server {meta ? `v${meta.version}` : '—'}
          </span>
        </div>
      </footer>
    </div>
  )
}
