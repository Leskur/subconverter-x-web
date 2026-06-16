import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getRules, saveRules, type ProxyGroup, type ProxyGroupsMergeMode } from '@/lib/api'

const GROUP_TYPES = ['select', 'url-test', 'fallback', 'load-balance', 'relay']

const PROXY_GROUPS_MERGE_OPTIONS: { value: ProxyGroupsMergeMode; label: string; hint: string }[] = [
  {
    value: 'replace',
    label: '仅自定义',
    hint: '只使用下方代理组，忽略订阅中自带的代理组',
  },
  {
    value: 'merge',
    label: '与订阅合并',
    hint: '保留订阅自带的代理组，同名组由自定义配置覆盖；自定义新增组追加到末尾',
  },
]

function emptyGroup(): ProxyGroup {
  return { name: 'PROXY', type: 'select', proxies: [] }
}

function normalizeGroups(groups: ProxyGroup[]): ProxyGroup[] {
  if (groups.length === 0) return [emptyGroup()]
  return groups.map((g) => ({
    name: g.name,
    type: g.type,
    proxies: Array.isArray(g.proxies) ? [...g.proxies] : [],
  }))
}

export function ProxyGroupsPage() {
  const [proxyGroups, setProxyGroups] = useState<ProxyGroup[]>([emptyGroup()])
  const [proxyGroupsMerge, setProxyGroupsMerge] = useState<ProxyGroupsMergeMode>('replace')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedMerge =
    PROXY_GROUPS_MERGE_OPTIONS.find((opt) => opt.value === proxyGroupsMerge) ??
    PROXY_GROUPS_MERGE_OPTIONS[0]

  const fetchGroups = useCallback(async () => {
    const config = await getRules()
    setProxyGroups(normalizeGroups(config.proxyGroups ?? []))
    setProxyGroupsMerge(config.proxyGroupsMerge ?? 'replace')
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchGroups()
      .catch((error) => toast.error(error instanceof Error ? error.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [fetchGroups])

  async function handleRefresh() {
    setLoading(true)
    try {
      await fetchGroups()
      toast.success('已刷新')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const current = await getRules()
      await saveRules({
        rules: current.rules,
        proxyGroups,
        rulesMerge: current.rulesMerge,
        proxyGroupsMerge,
      })
      toast.success('代理组已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function updateGroup(index: number, patch: Partial<ProxyGroup>) {
    setProxyGroups((groups) => groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  function addGroup() {
    setProxyGroups((groups) => [...groups, { name: `GROUP-${groups.length + 1}`, type: 'select', proxies: [] }])
  }

  function removeGroup(index: number) {
    setProxyGroups((groups) => groups.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">代理组</CardTitle>
            <CardDescription className="text-xs">
              规则中的策略名称需与此处一致；节点列表留空则自动包含订阅中的全部节点
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleRefresh()} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              刷新
            </Button>
            <Button size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              保存
            </Button>
            <Button variant="outline" size="sm" onClick={addGroup}>
              <Plus />
              添加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="space-y-2 sm:max-w-lg">
            <Label htmlFor="groups-merge">订阅自带代理组的处理方式</Label>
            <Select
              value={proxyGroupsMerge}
              onValueChange={(value) => setProxyGroupsMerge(value as ProxyGroupsMergeMode)}
            >
              <SelectTrigger id="groups-merge">
                <SelectValue>{selectedMerge.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROXY_GROUPS_MERGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="py-2">
                    <div className="flex flex-col gap-0.5">
                      <span>{opt.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">{opt.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">{selectedMerge.hint}</p>
          </div>

          {proxyGroups.map((group, index) => (
            <div key={index} className="space-y-2.5 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs">
                  #{index + 1}
                </Badge>
                {proxyGroups.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeGroup(index)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">名称</Label>
                  <Input
                    value={group.name}
                    onChange={(e) => updateGroup(index, { name: e.target.value })}
                    placeholder="PROXY"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">类型</Label>
                  <Select value={group.type} onValueChange={(type) => updateGroup(index, { type })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">节点列表（逗号分隔，留空自动包含全部）</Label>
                <Input
                  value={group.proxies.join(', ')}
                  onChange={(e) =>
                    updateGroup(index, {
                      proxies: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="留空自动填入节点"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">保存后立即生效，无需重启服务</p>
    </div>
  )
}
