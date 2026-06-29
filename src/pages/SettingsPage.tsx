import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun, Plus, Trash2, Check, Server, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  type BackendConfig,
  getBackends,
  addBackend,
  updateBackend,
  removeBackend,
  getActiveBackendId,
  setActiveBackendId,
  backendUrl,
} from '@/lib/backends'
import { getSubscriptionConfig, saveSubscriptionConfig, type UpdateIntervalMode } from '@/lib/api'

type ThemeMode = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
]

interface SettingsPageProps {
  theme: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
  autoOpenAdd?: boolean
}

const emptyForm = { protocol: 'http' as 'http' | 'https', host: '', port: '', token: '' }

export function SettingsPage({ theme, onThemeChange, autoOpenAdd }: SettingsPageProps) {
  const [backends, setBackends] = useState<BackendConfig[]>(() => getBackends())
  const [activeId, setActiveId] = useState<string | null>(() => getActiveBackendId())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [updateInterval, setUpdateInterval] = useState<UpdateIntervalMode>('auto')
  const [savingInterval, setSavingInterval] = useState(false)

  useEffect(() => {
    getSubscriptionConfig().then((c) => setUpdateInterval(c.updateInterval)).catch(() => {})
  }, [])

  useEffect(() => {
    if (autoOpenAdd) {
      setEditingId(null)
      setForm(emptyForm)
      setDialogOpen(true)
    }
  }, [autoOpenAdd])

  function refresh() {
    setBackends(getBackends())
    setActiveId(getActiveBackendId())
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(backend: BackendConfig) {
    setEditingId(backend.id)
    setForm({
      protocol: backend.protocol,
      host: backend.host,
      port: String(backend.port),
      token: backend.token,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.host.trim()) {
      toast.error('请填写后端地址')
      return
    }
    const data = {
      name: `${form.protocol}://${form.host.trim()}:${form.port}`,
      protocol: form.protocol,
      host: form.host.trim(),
      port: Number(form.port) || 15500,
      token: form.token.trim(),
    }
    if (editingId) {
      updateBackend(editingId, data)
      toast.success('后端已更新')
    } else {
      addBackend(data)
      toast.success('后端已添加')
    }
    setDialogOpen(false)
    setForm(emptyForm)
    setEditingId(null)
    refresh()
  }

  function handleRemove(id: string) {
    removeBackend(id)
    refresh()
    toast.success('后端已删除')
  }

  function handleSwitch(id: string) {
    setActiveBackendId(id)
    refresh()
    toast.success('后端已切换')
  }

  async function handleIntervalSave(value: UpdateIntervalMode) {
    setUpdateInterval(value)
    setSavingInterval(true)
    try {
      await saveSubscriptionConfig(value)
      toast.success('订阅设置已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingInterval(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-base">主题</CardTitle>
          <CardDescription className="text-xs">界面亮暗模式</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => onThemeChange(value)}
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            后端管理
            <Badge variant="secondary" className="text-xs">{backends.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">添加、切换、删除后端服务地址</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          {backends.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">当前后端</Label>
              <Select
                value={activeId ?? ''}
                onValueChange={(v) => handleSwitch(v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择后端" />
                </SelectTrigger>
                <SelectContent>
                  {backends.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {backendUrl(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {backends.length === 0 && (
            <p className="text-muted-foreground text-xs">尚未添加后端，点击下方按钮添加</p>
          )}

          {backends.map((backend) => (
            <div
              key={backend.id}
              className="flex items-center gap-2 rounded-lg border p-2"
              data-active={activeId === backend.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {backendUrl(backend)}
                  </span>
                  {activeId === backend.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => openEdit(backend)}
              >
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive"
                onClick={() => handleRemove(backend.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" />
            添加后端
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptyForm) } }}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑后端' : '添加后端'}</DialogTitle>
            <DialogDescription>配置后端服务地址和鉴权信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-24 shrink-0 space-y-1.5">
                <Label className="text-xs">协议</Label>
                <select
                  value={form.protocol}
                  onChange={(e) => setForm({ ...form, protocol: e.target.value as 'http' | 'https' })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label className="text-xs">地址</Label>
                <Input
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="127.0.0.1"
                />
              </div>
              <div className="w-20 shrink-0 space-y-1.5">
                <Label className="text-xs">端口</Label>
                <Input
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  placeholder="15500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">授权 Token（可选）</Label>
              <Input
                type="password"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
                placeholder="留空表示无鉴权"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingId(null); setForm(emptyForm) }}>
                取消
              </Button>
              <Button size="sm" onClick={handleSave}>
                {editingId ? '保存' : '添加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            订阅设置
          </CardTitle>
          <CardDescription className="text-xs">客户端自动更新订阅的间隔时间</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="space-y-2">
            <Label className="text-xs">自动更新间隔</Label>
            <Select
              value={String(updateInterval)}
              disabled={savingInterval}
              onValueChange={(v) => {
                const value = v === 'auto' ? 'auto' : Number(v)
                setUpdateInterval(value)
                handleIntervalSave(value)
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">跟随订阅源</SelectItem>
                <SelectItem value="900">15 分钟</SelectItem>
                <SelectItem value="1800">30 分钟</SelectItem>
                <SelectItem value="3600">1 小时</SelectItem>
                <SelectItem value="21600">6 小时</SelectItem>
                <SelectItem value="43200">12 小时</SelectItem>
                <SelectItem value="86400">24 小时</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              对 Clash、Surfboard、Loon 生效，QuanX 和 Sing-box 由客户端自行管理
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
