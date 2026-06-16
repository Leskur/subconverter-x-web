import { useCallback, useEffect, useState } from 'react'
import { Layers, Link2, Pencil, RefreshCw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getAdminMeta,
  getHealth,
  getPublicApiUrl,
  getRulesSummary,
  type AdminMeta,
  type RulesSummary,
} from '@/lib/api'
import { navigateRoute } from '@/lib/router'

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [healthy, setHealthy] = useState(false)
  const [meta, setMeta] = useState<AdminMeta | null>(null)
  const [summary, setSummary] = useState<RulesSummary | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [health, adminMeta, rulesSummary] = await Promise.all([
        getHealth(),
        getAdminMeta(),
        getRulesSummary(),
      ])
      setHealthy(health.ok)
      setMeta(adminMeta)
      setSummary(rulesSummary)
    } catch {
      setHealthy(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs text-muted-foreground">
          API <code className="text-[11px]">{getPublicApiUrl()}</code>
        </p>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => load()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          刷新
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">服务状态</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className={healthy ? 'text-green-600' : 'text-destructive'}>●</span>
              {healthy ? '运行正常' : '不可用'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {meta ? `${meta.service} v${meta.version}` : '—'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">分流规则</CardDescription>
            <CardTitle className="text-2xl">{summary?.ruleCount ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">条</CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">代理组</CardDescription>
            <CardTitle className="text-2xl">{summary?.groupCount ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">个</CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">鉴权</CardDescription>
            <CardTitle className="text-base">{meta?.authEnabled ? '已启用' : '未启用'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {meta?.authEnabled ? '保存操作需验证' : '无需验证'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          <Button size="sm" onClick={() => navigateRoute({ page: 'subscription' })}>
            <Link2 />
            订阅
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigateRoute({ page: 'rules' })}>
            <ScrollText />
            规则
            {summary ? ` (${summary.ruleCount})` : ''}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigateRoute({ page: 'groups' })}>
            <Layers />
            代理组
            {summary ? ` (${summary.groupCount})` : ''}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigateRoute({ page: 'settings' })}>
            <Pencil />
            设置
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
